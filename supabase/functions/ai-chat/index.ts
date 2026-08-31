import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface ChatMessageContentItem {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: string };
}

export interface ChatRequest {
  base_url?: string;
  api_key?: string;
  provider_name?: string;
  model?: string;
  image_url?: string;
  image_base64?: string;
  messages?: Array<{ role: string; content: string | ChatMessageContentItem[] }>;
}

export async function handleAiChat(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload: ChatRequest = await req.json();

    const baseUrl = (payload.base_url || "https://api.koboillm.com/v1")
      .trim()
      .replace(/\/$/, "");

    let apiKey = payload.api_key || "";
    const model = payload.model || "gemini/gemini-2.5-flash";
    let messages = payload.messages || [{ role: "user", content: "Halo" }];

    // If an image URL or image_base64 is passed at top level, format multimodal vision message per docs.koboillm.com/vision
    const inputVisionImg = payload.image_url || payload.image_base64;
    if (inputVisionImg) {
      let formattedImg = inputVisionImg;
      if (!formattedImg.startsWith("data:") && !formattedImg.startsWith("http")) {
        formattedImg = `data:image/jpeg;base64,${formattedImg}`;
      }
      const lastUserMsgIndex = [...messages].reverse().findIndex((m) => m.role === "user");
      if (lastUserMsgIndex !== -1) {
        const realIdx = messages.length - 1 - lastUserMsgIndex;
        const origContent = typeof messages[realIdx].content === "string" ? messages[realIdx].content : "Analisis gambar ini";
        messages[realIdx] = {
          role: "user",
          content: [
            { type: "text", text: origContent as string },
            { type: "image_url", image_url: { url: formattedImg, detail: "auto" } },
          ],
        };
      }
    }

    // Read key from DB if masked or missing
    if (!apiKey || apiKey.startsWith("••••") || apiKey.includes("...")) {
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

      const { data: dbSetting } = await supabaseAdmin
        .from("api_provider_settings")
        .select("api_key_encrypted")
        .eq("purpose", "chat")
        .eq("is_active", true)
        .maybeSingle();

      if (dbSetting?.api_key_encrypted) {
        apiKey = dbSetting.api_key_encrypted;
      }
    }

    apiKey = apiKey.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key wajib diisi untuk menguji koneksi chat." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = `${baseUrl}/chat/completions`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error?.message || errJson.message || errText;
      } catch (_) {}

      return new Response(
        JSON.stringify({
          success: false,
          error: `Koneksi API (${baseUrl}) HTTP ${res.status}: ${parsedErr}`,
          status: res.status,
          latencyMs,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const replyText = json.choices?.[0]?.message?.content || json.message || JSON.stringify(json);

    return new Response(
      JSON.stringify({
        success: true,
        reply: replyText,
        usage: json.usage || null,
        latencyMs,
        modelUsed: model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Gagal menghubungkan ke server API: ${error.message}`,
        latencyMs: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleAiChat);
}
