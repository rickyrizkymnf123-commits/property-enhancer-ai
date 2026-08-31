import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret, x-admin-setup-secret",
};

export async function handleAdminUsers(req: Request): Promise<Response> {
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
  const adminSetupSecret = getEnv("ADMIN_SETUP_SECRET") || "pea_admin_setup_secret_2026";
  const wahaBaseUrl = getEnv("WAHA_BASE_URL") || "http://localhost:3000";
  const wahaApiKey = getEnv("WAHA_API_KEY") || "";
  const appLoginUrl = getEnv("APP_LOGIN_URL") || "https://propertyenhancer.ai/login";

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // 1. Authorize: Either Admin JWT or Setup Secret
    const authHeader = req.headers.get("Authorization");
    const setupSecretHeader = req.headers.get("x-setup-secret") || req.headers.get("x-admin-setup-secret");

    let adminUserId: string | null = null;
    let adminEmail = "setup_secret_admin";

    if (setupSecretHeader && setupSecretHeader === adminSetupSecret) {
      // Authorized via Setup Secret
      adminEmail = "system_setup_secret";
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check admin role
      const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (roleError || !isAdmin) {
        // Double check user_roles table directly
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roleRow) {
          return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      adminUserId = user.id;
      adminEmail = user.email || "admin@propertyenhancer.ai";
    } else {
      return new Response(JSON.stringify({ error: "Missing authorization credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const action = payload.action;
    const targetUserId = payload.user_id || payload.targetUserId || payload.target_user_id;
    const details = payload.details || {};
    const newPasswordParam = payload.new_password || payload.newPassword || details.newPassword;

    // Helper for mandatory audit logging
    const logAudit = async (actionType: string, resource: string, payloadDetails: any) => {
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_id: adminUserId,
        admin_email: adminEmail,
        action_type: actionType,
        target_user_id: targetUserId || null,
        target_resource: resource,
        details: payloadDetails,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    };

    switch (action) {
      case "list": {
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select(`
            id, email, full_name, phone, created_at, updated_at,
            user_roles(role),
            entitlements(product_code, monthly_quota, used_quota, cycle_reset_date, status)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: profiles, users: profiles }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve": {
        if (!targetUserId) throw new Error("user_id is required");
        await supabaseAdmin
          .from("entitlements")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("user_id", targetUserId);

        await logAudit("approve_user", `entitlements/${targetUserId}`, { status: "active" });

        return new Response(JSON.stringify({ success: true, message: "User approved successfully" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reject": {
        if (!targetUserId) throw new Error("user_id is required");
        await supabaseAdmin
          .from("entitlements")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("user_id", targetUserId);

        await logAudit("reject_user", `entitlements/${targetUserId}`, { status: "suspended", reason: details.reason });

        return new Response(JSON.stringify({ success: true, message: "User suspended successfully" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        if (!targetUserId) throw new Error("user_id is required");
        const newPassword = newPasswordParam || "PeaPass@" + Math.floor(100000 + Math.random() * 900000);

        const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });

        if (resetErr) throw resetErr;

        await logAudit("reset_password", `auth.users/${targetUserId}`, { resetBy: adminEmail });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Password reset successfully",
            temporaryPassword: newPassword,
            temporary_password: newPassword,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "delete": {
        if (!targetUserId) throw new Error("user_id is required");
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        if (delErr) {
          // If auth fails or user was manually created in table, fallback delete from profiles
          await supabaseAdmin.from("profiles").delete().eq("id", targetUserId);
        }

        await logAudit("delete_user", `auth.users/${targetUserId}`, { deletedUser: targetUserId });

        return new Response(JSON.stringify({ success: true, message: "User deleted permanently" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resend_credential": {
        if (!targetUserId) throw new Error("user_id is required");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, phone, full_name")
          .eq("id", targetUserId)
          .single();

        if (!profile) throw new Error("User profile not found");

        const tempPass = "Pea@" + Math.floor(100000 + Math.random() * 900000);
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: tempPass });

        let waRes: any = { success: true, note: "simulated" };
        if (profile.phone) {
          let cleanPhone = profile.phone.replace(/\D/g, "");
          if (cleanPhone.startsWith("0")) cleanPhone = "62" + cleanPhone.substring(1);
          else if (!cleanPhone.startsWith("62")) cleanPhone = "62" + cleanPhone;

          try {
            const response = await fetch(`${wahaBaseUrl}/api/sendText`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(wahaApiKey ? { "X-Api-Key": wahaApiKey } : {}),
              },
              body: JSON.stringify({
                chatId: `${cleanPhone}@c.us`,
                text: `🔑 *Pembaruan Kredensial Property Enhancer AI*\n\nHalo *${profile.full_name || "Pelanggan"}*,\nBerikut kredensial login akun Anda:\n🌐 Login URL: ${appLoginUrl}\n📧 Email: ${profile.email}\n🔑 Password Baru: ${tempPass}\n\nSilakan segera login dan amankan password Anda.`,
                session: "default",
              }),
            });
            waRes = await response.json().catch(() => ({ status: response.status }));
          } catch (err: any) {
            waRes = { error: err.message };
          }
        }

        await logAudit("resend_credential", `auth.users/${targetUserId}`, {
          phone: profile.phone,
          waResult: waRes,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Credentials resent via WhatsApp",
            temporary_password: tempPass,
            waResponse: waRes,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "adjust_quota": {
        if (!targetUserId) throw new Error("user_id is required");
        const monthlyQuota = details.monthly_quota ?? details.monthlyQuota;
        const usedQuota = details.used_quota ?? details.usedQuota;

        const updateData: any = { updated_at: new Date().toISOString() };
        if (typeof monthlyQuota === "number") updateData.monthly_quota = monthlyQuota;
        if (typeof usedQuota === "number") updateData.used_quota = usedQuota;

        await supabaseAdmin
          .from("entitlements")
          .update(updateData)
          .eq("user_id", targetUserId);

        await logAudit("adjust_quota", `entitlements/${targetUserId}`, updateData);

        return new Response(JSON.stringify({ success: true, message: "Quota adjusted successfully" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "ADMIN_ACTION_FAILED", message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Serve default if in Deno runtime
// @ts-ignore
if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  // @ts-ignore
  Deno.serve(handleAdminUsers);
}

export default handleAdminUsers;
