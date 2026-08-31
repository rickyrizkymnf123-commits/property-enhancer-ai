import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface ListModelsRequest {
  base_url?: string;
  api_key?: string;
  provider_name?: string;
  purpose?: string;
}

export async function handleListModels(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: ListModelsRequest = await req.json();
    const baseUrl = payload.base_url || "https://api.koboiillm.com/v1";
    let apiKey = payload.api_key || "";

    // If key is masked or empty, read active key from DB
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

      const targetPurpose = payload.purpose || "chat";
      const { data: dbSetting } = await supabaseAdmin
        .from("api_provider_settings")
        .select("api_key_encrypted")
        .eq("purpose", targetPurpose)
        .eq("is_active", true)
        .maybeSingle();

      if (dbSetting?.api_key_encrypted) {
        apiKey = dbSetting.api_key_encrypted;
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key wajib diisi untuk mengambil daftar model." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = baseUrl.endsWith("/") ? `${baseUrl}models` : `${baseUrl}/models`;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `Gagal mengambil model dari ${baseUrl} (${res.status}): ${errText.substring(0, 200)}` }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const modelIds: string[] = (json.data || json.models || [])
      .map((m: any) => (typeof m === "string" ? m : m.id || m.name))
      .filter(Boolean);

    return new Response(
      JSON.stringify({ success: true, models: modelIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Koneksi ke API provider gagal: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleListModels);
}

export default handleListModels;
