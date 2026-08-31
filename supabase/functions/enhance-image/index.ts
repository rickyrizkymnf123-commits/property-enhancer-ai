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

    const baseUrl = config.base_url.trim().replace(/\/$/, "");
    const endpoint = `${baseUrl}/images/edits`;

    // Ensure imageBase64 has full data:image/...;base64 Data URL header
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

    // 1. Decode image_base64 (Data URL) menjadi Blob untuk dikirim sebagai file
    function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } {
      const parts = dataUrl.split(",");
      const header = parts[0] || "";
      const base64Data = parts[1] || dataUrl;
      const mimeMatch = header.match(/data:(.*?);base64/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { blob: new Blob([bytes], { type: mimeType }), mimeType };
    }

    const { blob: imageBlob, mimeType } = dataUrlToBlob(formattedImageBase64);
    const ext = mimeType.includes("png") ? "png" : "jpg";

    // 2. Build multipart form-data sesuai spesifikasi resmi §5.1
    const fullPromptText = `${prompt}. Keep the building structure, architecture, and camera angle exactly the same unless explicitly asked to change them.`;

    const form = new FormData();
    form.append("model", config.model_name); // contoh: gemini/gemini-2.5-flash-image atau openai/gpt-image-1.5
    form.append("image", imageBlob, `original.${ext}`);
    form.append("prompt", fullPromptText);
    form.append("size", "1024x1024");
    form.append("quality", "high");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        // Biarkan runtime set boundary multipart otomatis
      },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kobil LLM HTTP ${response.status} (${endpoint}): ${errText.substring(0, 500)}`);
    }

    const json = await response.json();

    // 3. Struktur respons SESUAI DOKUMENTASI RESMI §6 — data[0].url atau data[0].b64_json
    const imageResult = json?.data?.[0]?.url || json?.data?.[0]?.b64_json || null;

    if (!imageResult) {
      throw new Error(`Response Kobil LLM tidak mengandung data[0].url atau data[0].b64_json. Response: ${JSON.stringify(json).substring(0, 800)}`);
    }

    let finalEnhancedUrl = imageResult;
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
