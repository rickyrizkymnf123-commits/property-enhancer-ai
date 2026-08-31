import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface EnhanceImageRequest {
  image_base64?: string;
  file_path?: string;
  original_url?: string;
  prompt?: string;
  preset?: string;
  project_id?: string | null;
}

export async function handleEnhanceImage(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload: EnhanceImageRequest = await req.json();
    const imageBase64 = payload.image_base64 || payload.original_url || payload.file_path;
    const prompt = payload.prompt || payload.preset;

    if (!imageBase64) {
      throw new Error("image_base64 kosong — foto tidak terkirim dari frontend.");
    }
    if (!prompt) {
      throw new Error("prompt kosong — user belum mengisi instruksi.");
    }

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

    // 1. Ambil config Kobil LLM dari database untuk purpose='image_generation'
    let { data: config, error: configError } = await supabaseAdmin
      .from("api_provider_settings")
      .select("base_url, model_name, api_key_encrypted")
      .eq("purpose", "image_generation")
      .eq("provider_name", "kobil_llm")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!config) {
      const fallbackQuery = await supabaseAdmin
        .from("api_provider_settings")
        .select("base_url, model_name, api_key_encrypted")
        .eq("provider_name", "kobil_llm")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      config = fallbackQuery.data;
      configError = fallbackQuery.error;
    }

    if (configError || !config) {
      throw new Error("Config Kobil LLM tidak ditemukan di database. Cek tabel api_provider_settings.");
    }
    if (!config.base_url) throw new Error("base_url kosong di config Kobil LLM.");
    if (!config.model_name) throw new Error("model_name kosong di config Kobil LLM.");
    if (!config.api_key_encrypted) throw new Error("API key kosong di config Kobil LLM.");

    // Plaintext / Encrypted API Key resolution
    let apiKey = config.api_key_encrypted || "";
    if (apiKey.startsWith("enc_v1_")) {
      try {
        apiKey = atob(apiKey.substring(7));
      } catch (_) {}
    }
    apiKey = apiKey.replace(/^Bearer\s+/i, '').trim();

    const baseUrl = (config.base_url || "https://api.koboillm.com/v1").trim().replace("koboiillm.com", "koboillm.com").replace(/\/$/, "");
    const endpoint = `${baseUrl}/chat/completions`;

    // Ensure imageBase64 has full data:image/...;base64, Data URL header expected by LiteLLM Proxy
    let formattedImageBase64 = imageBase64 || "";
    if (formattedImageBase64 && !formattedImageBase64.startsWith("data:image/")) {
      if (/^[A-Za-z0-9+/=]+$/.test(formattedImageBase64.substring(0, 100).replace(/\s/g, ""))) {
        formattedImageBase64 = `data:image/jpeg;base64,${formattedImageBase64}`;
      } else if (formattedImageBase64.startsWith("http://") || formattedImageBase64.startsWith("https://")) {
        try {
          const imgRes = await fetch(formattedImageBase64);
          if (imgRes.ok) {
            const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            const arrayBuf = await imgRes.arrayBuffer();
            const bytes = new Uint8Array(arrayBuf);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const b64 = typeof btoa !== "undefined" ? btoa(binary) : "";
            if (b64) formattedImageBase64 = `data:${mimeType};base64,${b64}`;
          }
        } catch (e) {
          console.warn("Failed to fetch image URL in edge function:", e);
        }
      }
    }

    const pLower = (prompt || "").toLowerCase();
    let visualDirectives = "";
    if (pLower.includes("malam") || pLower.includes("night") || pLower.includes("dusk") || pLower.includes("twilight") || pLower.includes("gelap")) {
      visualDirectives += " [Visual Directive: Transform the lighting to dark night sky with dark navy blue atmosphere, warm illuminated porch lights, glowing windows, and high contrast nighttime property photography.]";
    }
    if (pLower.includes("pagar") || pLower.includes("fence")) {
      visualDirectives += " [Visual Directive: Add a modern perimeter fence in front of the house.]";
    }
    if (pLower.includes("kanopi") || pLower.includes("canopy")) {
      visualDirectives += " [Visual Directive: Add a sleek carport canopy over the driveway.]";
    }
    if (pLower.includes("siang") || pLower.includes("bright") || pLower.includes("sun")) {
      visualDirectives += " [Visual Directive: Transform lighting to bright clear sunny day with blue sky.]";
    }

    const fullPromptText = `Edit this exact photo. Keep the building structure and camera angle exactly the same. ${prompt}.${visualDirectives}`;

    // 2. Panggil Kobil LLM (format OpenAI-compatible chat completions dengan image input)
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model_name,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPromptText,
              },
              {
                type: "image_url",
                image_url: { url: formattedImageBase64 },
              },
            ],
          },
        ],
      }),
    });

    // 3. WAJIB: kalau HTTP status bukan 200, tampilkan body response ASLI
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kobil LLM HTTP ${response.status}: ${errText.substring(0, 500)}`);
    }

    const json = await response.json();

    // 4. Cari gambar hasil di beberapa kemungkinan lokasi field
    let imageResult =
      json?.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      json?.choices?.[0]?.message?.images?.[0]?.b64_json ||
      json?.choices?.[0]?.message?.images?.[0]?.url ||
      json?.choices?.[0]?.message?.images?.[0] ||
      json?.data?.[0]?.b64_json ||
      json?.data?.[0]?.url ||
      null;

    // Check message.content for markdown image ![image](data:...) or Data URL string
    if (!imageResult && json?.choices?.[0]?.message?.content) {
      const contentStr = String(json.choices[0].message.content).trim();
      const mdMatch = contentStr.match(/!\[.*?\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/);
      if (mdMatch && mdMatch[1]) {
        imageResult = mdMatch[1];
      } else if (contentStr.startsWith("data:image/") || contentStr.startsWith("http://") || contentStr.startsWith("https://")) {
        imageResult = contentStr;
      } else if (contentStr.length > 500 && /^[A-Za-z0-9+/=]+$/.test(contentStr.substring(0, 100).replace(/\s/g, ""))) {
        imageResult = `data:image/jpeg;base64,${contentStr}`;
      }
    }

    // 5. Fallback Strategy B: Panggil /images/generations jika /chat/completions tidak mengembalikan array gambar
    if (!imageResult) {
      const genEndpoint = `${baseUrl}/images/generations`;
      try {
        const genRes = await fetch(genEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.model_name || "gemini-2.5-flash-image",
            prompt: `Edit property photo: ${prompt}. Photo base64 data: ${formattedImageBase64.substring(0, 300)}`,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          }),
        });
        if (genRes.ok) {
          const genJson = await genRes.json();
          imageResult =
            genJson?.data?.[0]?.b64_json ||
            genJson?.data?.[0]?.url ||
            genJson?.images?.[0]?.url ||
            genJson?.images?.[0] ||
            null;
        }
      } catch (genErr) {
        console.warn("Fallback /images/generations failed:", genErr);
      }
    }

    if (!imageResult) {
      throw new Error(`Response Kobil LLM tidak mengandung gambar. Struktur response: ${JSON.stringify(json).substring(0, 800)}`);
    }

    let finalEnhancedUrl = imageResult;
    if (typeof finalEnhancedUrl === 'object' && finalEnhancedUrl?.url) {
      finalEnhancedUrl = finalEnhancedUrl.url;
    }
    if (typeof finalEnhancedUrl === 'string' && !finalEnhancedUrl.startsWith("data:") && !finalEnhancedUrl.startsWith("http")) {
      finalEnhancedUrl = `data:image/jpeg;base64,${finalEnhancedUrl}`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "done",
        enhanced_url: finalEnhancedUrl,
        provider: "kobil_llm",
        model: config.model_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, status: "failed", error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleEnhanceImage);
}
