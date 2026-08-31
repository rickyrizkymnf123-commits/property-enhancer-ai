import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-webhook-secret, x-webhook-signature",
};

// HMAC-SHA256 Signature Verification Helper
export async function verifyHmacSignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const cleanHex = signatureHex.trim().replace(/^sha256=/, "");
    const matches = cleanHex.match(/.{1,2}/g);
    if (!matches) return false;

    const sigBytes = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(rawBody));
  } catch (_) {
    return false;
  }
}

// Generate Secure Random Password
export function generateSecurePassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ!@#$%*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}

// WhatsApp Notification via WAHA API Helper
export async function sendWhatsAppCredentials(
  phone: string,
  email: string,
  tempPass: string,
  fullName: string,
  wahaBaseUrl?: string,
  wahaApiKey?: string,
  appLoginUrl?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const baseUrl = wahaBaseUrl || "http://localhost:3000";
  const loginUrl = appLoginUrl || "https://propertyenhancer.ai/login";

  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("62")) {
    cleanPhone = "62" + cleanPhone;
  }

  const message = `🎉 *Selamat Datang di Property Enhancer AI!*

Halo *${fullName || "Pelanggan Terhormat"}*,
Akses akun Lifetime Property Enhancer AI Anda telah aktif!

Berikut adalah detail login Anda:
🌐 *Login URL:* ${loginUrl}
📧 *Email:* ${email}
🔑 *Password Sementara:* ${tempPass}
⚡ *Kuota Foto:* 100 Foto / Bulan (Auto-reset setiap 30 hari)

*Petunjuk Keamanan:*
1. Silakan login ke aplikasi dan ubah password Anda di menu *Pengaturan*.
2. Simpan pesan ini untuk catatan Anda.

Butuh bantuan? Balas pesan ini atau hubungi tim support kami.
Selamat meningkatkan kualitas foto properti Anda! 🚀`;

  try {
    const response = await fetch(`${baseUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(wahaApiKey ? { "X-Api-Key": wahaApiKey } : {}),
      },
      body: JSON.stringify({
        chatId: `${cleanPhone}@c.us`,
        text: message,
        session: "default",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `WAHA Error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function handleProvision(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
  const provisionSecret = getEnv("PROVISION_SECRET") || "property_enhancer_secret_key_2026";
  const wahaBaseUrl = getEnv("WAHA_BASE_URL") || "http://localhost:3000";
  const wahaApiKey = getEnv("WAHA_API_KEY") || "";
  const appLoginUrl = getEnv("APP_LOGIN_URL") || "https://propertyenhancer.ai/login";

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const rawBody = await req.text();
  let payload: any = {};

  try {
    payload = JSON.parse(rawBody);
  } catch (_) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const signatureHeader =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("x-webhook-secret") ||
    "";

  // 1. Verify HMAC Signature
  let isSignatureValid = false;
  if (signatureHeader === provisionSecret) {
    isSignatureValid = true;
  } else if (signatureHeader) {
    isSignatureValid = await verifyHmacSignature(rawBody, signatureHeader, provisionSecret);
  }

  if (!isSignatureValid) {
    try {
      await supabaseAdmin.from("provision_logs").insert({
        email: payload.email || "unknown",
        phone: payload.phone || payload.phone_number || null,
        full_name: payload.full_name || payload.name || null,
        order_id: payload.order_id || payload.transaction_id || null,
        amount: payload.amount || 0,
        payload,
        status: "failed",
        error_message: "Invalid HMAC signature or webhook secret",
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: "INVALID_SIGNATURE", message: "Unauthorized: Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = (payload.email || "").trim().toLowerCase();
  const phone = payload.phone || payload.phone_number || "";
  const fullName = payload.full_name || payload.name || "";
  const orderId = payload.order_id || payload.transaction_id || null;
  const amount = payload.amount || 499000;
  const productCode = payload.product_code || "PEA";

  if (!email) {
    return new Response(JSON.stringify({ error: "Email is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Duplicate Email Check
  const { data: existingProfiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("email", email);

  if (existingProfiles && existingProfiles.length > 0) {
    await supabaseAdmin.from("provision_logs").insert({
      email,
      phone,
      full_name: fullName,
      order_id: orderId,
      amount,
      payload,
      status: "rejected_duplicate",
      error_message: `User with email ${email} already exists.`,
    });

    return new Response(
      JSON.stringify({
        error: "rejected_duplicate",
        message: `Email ${email} sudah terdaftar di sistem.`,
      }),
      {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 3. Create Auth User & Entitlement
  const tempPassword = generateSecurePassword(12);
  const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone,
    },
  });

  if (createAuthError || !authData.user) {
    await supabaseAdmin.from("provision_logs").insert({
      email,
      phone,
      full_name: fullName,
      order_id: orderId,
      amount,
      payload,
      status: "failed",
      error_message: createAuthError?.message || "Failed to create auth user",
    });

    return new Response(
      JSON.stringify({ error: "USER_CREATION_FAILED", message: createAuthError?.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const userId = authData.user.id;
  const cycleResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create/Upsert Profile
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    full_name: fullName,
    phone,
    updated_at: new Date().toISOString(),
  });

  // Assign user role
  await supabaseAdmin.from("user_roles").upsert({
    user_id: userId,
    role: "user",
  });

  // Create Entitlement Record (100 monthly quota, 1-month reset date)
  await supabaseAdmin.from("entitlements").upsert({
    user_id: userId,
    product_code: productCode,
    monthly_quota: 100,
    used_quota: 0,
    cycle_reset_date: cycleResetDate,
    status: "active",
    updated_at: new Date().toISOString(),
  });

  // 4. Send WhatsApp Notification via WAHA API
  let waResult: { success: boolean; data?: any; error?: string } = { success: false, error: "No phone provided" };
  if (phone) {
    waResult = await sendWhatsAppCredentials(phone, email, tempPassword, fullName, wahaBaseUrl, wahaApiKey, appLoginUrl);
  }

  // 5. Alert admin if WhatsApp delivery failed
  if (!waResult.success) {
    await supabaseAdmin.from("admin_notifications").insert({
      title: "WhatsApp Provisioning Delivery Failed",
      message: `Gagal mengirim WhatsApp kredensial untuk ${email} (${phone || "no phone"}). Order ID: ${orderId || "-"}. Error: ${waResult.error}`,
      severity: "critical",
      metadata: { userId, email, phone, order_id: orderId, error: waResult.error },
    });
  } else {
    await supabaseAdmin.from("admin_notifications").insert({
      title: "User Baru Terdaftar",
      message: `Akun baru berhasil dibuat untuk ${email} (${fullName}). Kredensial terkirim via WhatsApp.`,
      severity: "info",
      metadata: { userId, email, phone, order_id: orderId },
    });
  }

  // 6. Log Provision Transaction
  const provisionStatus = waResult.success ? "success" : "failed_wa";
  await supabaseAdmin.from("provision_logs").insert({
    email,
    phone,
    full_name: fullName,
    order_id: orderId,
    amount,
    payload,
    status: provisionStatus,
    whatsapp_sent: waResult.success,
    whatsapp_response: waResult,
  });

  return new Response(
    JSON.stringify({
      success: true,
      user_id: userId,
      userId,
      status: "provisioned",
      message: "Account created and WhatsApp credential processed.",
      email,
      order_id: orderId,
      whatsapp_sent: waResult.success,
      wa_status: waResult.success ? "sent" : "failed",
      cycle_reset_date: cycleResetDate,
      cycleResetDate,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// Serve default if in Deno runtime
// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleProvision);
}

export default handleProvision;
