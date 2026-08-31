import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface EnhanceRequest {
  imageId?: string;
  image_id?: string;
  originalImageUrl?: string;
  original_url?: string;
  file_path?: string;
  original_image_base64?: string;
  preset?: string;
  projectId?: string;
  project_id?: string;
}

export const PRESET_PROMPTS: Record<string, string> = {
  HDR_BALANCED:
    "Edit this exact photo of the property. Keep the building structure, architecture, walls, roof, doors, windows, and camera angle exactly the same. Only enhance: make the sky bright blue with soft clouds, make the lawn vibrant green, correct exposure and color balance for a professional real estate listing photo. Do not add, remove, or change any structural elements.",
  TWILIGHT:
    "Edit this exact photo of the property. Keep the building structure, architecture, walls, roof, doors, windows, and camera angle exactly the same. Only enhance: transform the atmosphere into luxury dusk twilight with golden hour sky gradient, ambient warm glowing lights from windows and porch. Do not add, remove, or change any structural elements.",
  INTERIOR_BRIGHT:
    "Edit this exact photo of the interior property. Keep the furniture layout, walls, and architectural structure exactly the same. Only enhance: brighten natural light through windows, balance interior shadows, and sharpen textures for a clean professional look. Do not alter structural elements.",
  DECLUTTER:
    "Edit this exact photo of the property. Keep the building architecture, walls, flooring, and room geometry exactly the same. Only enhance: remove temporary clutter, wires, stray items, and clean all surfaces smoothly. Do not change any structural walls or fixtures.",
  SKY_ENHANCE:
    "Edit this exact photo of the property. Keep the building architecture, walls, roof, and landscaping exactly the same. Only enhance: replace overcast cloudy sky with a pristine sunny blue sky and soft white clouds. Do not alter any building structures.",
};

export async function handleEnhanceImage(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const getEnv = (k: string) => {
    try {
      // @ts-ignore
      if (typeof Deno !== "undefined" && Deno.env) return Deno.env.get(k);
    } catch (_) {}
    try {
      if (typeof process !== "undefined" && process.env) return process.env[k];
    } catch (_) {}
    return undefined;
  };

  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "https://localhost.supabase.co";
  const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("VITE_SUPABASE_ANON_KEY") || "service-role-key";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let targetImageId: string | null = null;
  let activeProviderName = "kobil_llm";
  let activeModelName = "gemini-2.5-flash-image";

  try {
    // 1. Authenticate Caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: EnhanceRequest = await req.json();
    const rawImageId = payload.imageId || payload.image_id;
    const originalUrl = payload.originalImageUrl || payload.original_url || payload.file_path || payload.original_image_base64;
    const preset = payload.preset || "HDR_BALANCED";
    const projectId = payload.projectId || payload.project_id || null;

    if (!originalUrl && !rawImageId) {
      return new Response(JSON.stringify({ error: "originalImageUrl or imageId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Consume Quota Atomically
    const { data: quotaResult, error: quotaError } = await supabaseAdmin.rpc("check_and_consume_quota", {
      p_user_id: user.id,
      p_product_code: "PEA",
      p_amount: 1,
    });

    if (quotaError || !quotaResult?.allowed) {
      return new Response(
        JSON.stringify({
          error: "QUOTA_EXHAUSTED",
          message: quotaResult?.message || "Kuota bulanan tidak mencukupi.",
          remainingQuota: quotaResult?.remaining_quota ?? 0,
          cycleResetDate: quotaResult?.cycle_reset_date,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Upsert / Insert DB record in 'images' table with status = 'processing'
    if (rawImageId) {
      targetImageId = rawImageId;
      await supabaseAdmin
        .from("images")
        .update({
          status: "processing",
          preset,
          project_id: projectId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rawImageId);
    } else {
      const { data: newImage, error: insertError } = await supabaseAdmin
        .from("images")
        .insert({
          user_id: user.id,
          project_id: projectId,
          original_url: originalUrl!,
          preset,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create image record: ${insertError.message}`);
      }
      targetImageId = newImage.id;
    }

    // 4. Resolve Active AI Provider Configuration for purpose='image_generation'
    const { data: providerRows } = await supabaseAdmin
      .from("api_provider_settings")
      .select("*")
      .eq("purpose", "image_generation")
      .eq("is_active", true);

    const activeProvider = providerRows?.[0];

    if (!activeProvider) {
      throw new Error("Provider AI untuk image generation belum dikonfigurasi. Hubungi admin.");
    }

    // Check user API key override in user_api_keys
    const { data: userKeyRow } = await supabaseAdmin
      .from("user_api_keys")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider_name", activeProvider.provider_name)
      .eq("is_active", true)
      .maybeSingle();

    const apiKey = userKeyRow?.api_key_encrypted || activeProvider.api_key_encrypted || getEnv("GEMINI_API_KEY") || getEnv("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error(`API Key untuk provider '${activeProvider.provider_name}' belum diatur.`);
    }

    activeProviderName = activeProvider.provider_name;
    activeModelName = activeProvider.model_name || "gemini-2.5-flash-image";

    // Formulate Relative Edit Prompt Instruction
    const baseEditPrompt = PRESET_PROMPTS[preset] || PRESET_PROMPTS["HDR_BALANCED"];
    const editInstruction = preset.includes(" ") || preset.length > 30
      ? `Edit this exact photo of the property. Keep the building structure, architecture, walls, roof, doors, windows, and camera angle exactly the same. Only enhance: ${preset}. Do not add, remove, or change any structural elements.`
      : baseEditPrompt;

    // 5. Call Provider Adapter
    const enhancedBase64OrUrl = await callImageProviderAdapter(
      activeProvider,
      apiKey,
      originalUrl!,
      editInstruction
    );

    let enhancedImageUrl = "";

    if (enhancedBase64OrUrl.startsWith("http://") || enhancedBase64OrUrl.startsWith("https://") || enhancedBase64OrUrl.startsWith("data:")) {
      enhancedImageUrl = enhancedBase64OrUrl;
    } else {
      // Decode Base64 and Upload to Storage
      const binaryString = atob(enhancedBase64OrUrl);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const storagePath = `enhanced/${user.id}/${targetImageId}_enhanced.webp`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("images")
        .upload(storagePath, bytes, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage.from("images").getPublicUrl(storagePath);
      enhancedImageUrl = publicUrlData.publicUrl;
    }

    // 6. Update Image Record status = 'done'
    const latencyMs = Date.now() - startTime;
    await supabaseAdmin
      .from("images")
      .update({
        status: "done",
        enhanced_url: enhancedImageUrl,
        metadata: {
          provider: activeProviderName,
          model: activeModelName,
          preset,
          latency_ms: latencyMs,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetImageId);

    // 7. Log Usage
    await supabaseAdmin.from("api_usage_logs").insert({
      user_id: user.id,
      image_id: targetImageId,
      provider: activeProviderName,
      model: activeModelName,
      latency_ms: latencyMs,
      status: "success",
      cost_estimate_usd: 0.02,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageId: targetImageId,
        enhanced_url: enhancedImageUrl,
        remainingQuota: quotaResult.remaining_quota,
        cycleResetDate: quotaResult.cycle_reset_date,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    // Fail-safe: Update status = 'failed' & Emit Critical Notification
    try {
      if (targetImageId) {
        await supabaseAdmin
          .from("images")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetImageId);
      }

      await supabaseAdmin.from("admin_notifications").insert({
        title: `AI Enhancement Failure (${activeProviderName})`,
        message: `Image enhancement failed on ${activeProviderName} (${activeModelName}): ${error.message}`,
        severity: "critical",
        metadata: { provider: activeProviderName, model: activeModelName, error: error.stack || error.message, latencyMs, imageId: targetImageId },
      });

      await supabaseAdmin.from("api_usage_logs").insert({
        image_id: targetImageId,
        provider: activeProviderName,
        model: activeModelName,
        latency_ms: latencyMs,
        status: "failed",
        error_code: error.message,
        cost_estimate_usd: 0,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: "ENHANCE_FAILED", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Provider Adapter Implementation
async function callImageProviderAdapter(
  config: any,
  apiKey: string,
  originalImageUrl: string,
  editInstruction: string
): Promise<string> {
  const providerName = config.provider_name || "kobil_llm";

  switch (providerName) {
    case "kobil_llm":
    case "openai_compatible":
      return await callOpenAICompatibleImageEdit(config, apiKey, originalImageUrl, editInstruction);

    case "gemini_direct":
      return await callGeminiDirectImageEdit(config, apiKey, originalImageUrl, editInstruction);

    case "openai_direct":
      return await callOpenAIImageEdit(config, apiKey, originalImageUrl, editInstruction);

    default:
      throw new Error(`Provider '${providerName}' belum didukung dalam adapter.`);
  }
}

// Adapter 1: Kobil LLM Proxy / LiteLLM OpenAI-compatible
async function callOpenAICompatibleImageEdit(
  config: any,
  apiKey: string,
  originalImageUrl: string,
  editInstruction: string
): Promise<string> {
  const baseUrl = config.base_url || "https://api.koboiillm.com/v1";
  const model = config.model_name || "gemini-2.5-flash-image";

  const endpoint = baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: editInstruction },
            { type: "image_url", image_url: { url: originalImageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const rawErrorText = await res.text();
    throw new Error(`Kobil LLM API HTTP ${res.status}: ${rawErrorText.substring(0, 300)}`);
  }

  const json = await res.json();

  // Defensive Response Parsing: Check in sequence
  // 1. choices[0].message.images[0].image_url.url or b64_json
  const msgImage = json.choices?.[0]?.message?.images?.[0];
  if (msgImage?.image_url?.url || msgImage?.b64_json || msgImage?.url) {
    return msgImage.image_url?.url || msgImage.b64_json || msgImage.url;
  }

  // 2. choices[0].message.content if array with image type
  const msgContent = json.choices?.[0]?.message?.content;
  if (Array.isArray(msgContent)) {
    for (const part of msgContent) {
      if (part.type === "image_url" && part.image_url?.url) return part.image_url.url;
      if (part.image_base64 || part.b64_json) return part.image_base64 || part.b64_json;
    }
  }

  // 3. data[0].b64_json / data[0].url
  if (json.data?.[0]?.b64_json || json.data?.[0]?.url) {
    return json.data[0].b64_json || json.data[0].url;
  }

  // Throw detailed error with raw response snippet for admin notification logging
  const rawSnippet = JSON.stringify(json).substring(0, 250);
  throw new Error(`Unrecognized response format from Kobil LLM Proxy: ${rawSnippet}`);
}

// Adapter 2: Gemini Direct API (generativelanguage.googleapis.com)
async function callGeminiDirectImageEdit(
  config: any,
  apiKey: string,
  originalImageUrl: string,
  editInstruction: string
): Promise<string> {
  const model = config.model_name || "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Fetch original image base64 if needed
  let base64Data = "";
  if (originalImageUrl.startsWith("data:")) {
    base64Data = originalImageUrl.split(",")[1];
  } else {
    const imgRes = await fetch(originalImageUrl);
    const buf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64Data = btoa(binary);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: editInstruction },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Direct API HTTP ${res.status}: ${errText.substring(0, 300)}`);
  }

  const json = await res.json();
  const inlineImage = json.candidates?.[0]?.content?.parts?.find((p: any) => p.inline_data?.data)?.inline_data?.data;

  if (inlineImage) return inlineImage;

  throw new Error(`Gemini Direct API did not return inline_data image: ${JSON.stringify(json).substring(0, 250)}`);
}

// Adapter 3: OpenAI Direct API (api.openai.com)
async function callOpenAIImageEdit(
  config: any,
  apiKey: string,
  originalImageUrl: string,
  editInstruction: string
): Promise<string> {
  const model = config.model_name || "dall-e-3";
  const url = "https://api.openai.com/v1/images/generations";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: editInstruction,
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Direct API HTTP ${res.status}: ${errText.substring(0, 300)}`);
  }

  const json = await res.json();
  if (json.data?.[0]?.b64_json || json.data?.[0]?.url) {
    return json.data[0].b64_json || json.data[0].url;
  }

  throw new Error(`OpenAI Direct API response error: ${JSON.stringify(json).substring(0, 250)}`);
}

// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleEnhanceImage);
}

export default handleEnhanceImage;
