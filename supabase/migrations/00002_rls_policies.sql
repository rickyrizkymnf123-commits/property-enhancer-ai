-- ============================================================================
-- Migration 00002: Zero-Trust Row Level Security (RLS) Policies
-- Enables RLS on all 15 tables with granular role & user isolation rules
-- ============================================================================

-- Forward-declare / ensure has_role function exists for policy evaluation
CREATE OR REPLACE FUNCTION public.has_role(
    _user_id UUID,
    _role public.app_role
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    );
$$;

-- Enable RLS on all 15 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
    WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 2. USER_ROLES
CREATE POLICY "user_roles_select_policy" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_admin_write" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. ENTITLEMENTS
CREATE POLICY "entitlements_select_policy" ON public.entitlements
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "entitlements_admin_write" ON public.entitlements
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. PROJECTS
CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "projects_insert_policy" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_policy" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
    WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "projects_delete_policy" ON public.projects
    FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 5. IMAGES
CREATE POLICY "images_select_policy" ON public.images
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "images_insert_policy" ON public.images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "images_update_policy" ON public.images
    FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
    WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "images_delete_policy" ON public.images
    FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 6. USER_API_KEYS
CREATE POLICY "user_api_keys_select_policy" ON public.user_api_keys
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_api_keys_insert_policy" ON public.user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_api_keys_update_policy" ON public.user_api_keys
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_api_keys_delete_policy" ON public.user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- 7. API_PROVIDER_SETTINGS (Admin Only)
CREATE POLICY "api_provider_settings_admin_select" ON public.api_provider_settings
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "api_provider_settings_admin_write" ON public.api_provider_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. API_USAGE_LOGS
CREATE POLICY "api_usage_logs_select_policy" ON public.api_usage_logs
    FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "api_usage_logs_admin_write" ON public.api_usage_logs
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. ADMIN_SETTINGS (Admin Only)
CREATE POLICY "admin_settings_policy" ON public.admin_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 10. ADMIN_NOTIFICATIONS (Admin Only)
CREATE POLICY "admin_notifications_policy" ON public.admin_notifications
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11. PRICING_SETTINGS (Public Read, Admin Write)
CREATE POLICY "pricing_public_read" ON public.pricing_settings
    FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "pricing_admin_write" ON public.pricing_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 12. TESTIMONIALS (Public Read, Admin Write)
CREATE POLICY "testimonials_public_read" ON public.testimonials
    FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "testimonials_admin_write" ON public.testimonials
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. FAQS (Public Read, Admin Write)
CREATE POLICY "faqs_public_read" ON public.faqs
    FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "faqs_admin_write" ON public.faqs
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 14. PROVISION_LOGS (Admin Only)
CREATE POLICY "provision_logs_policy" ON public.provision_logs
    FOR ALL USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. ADMIN_AUDIT_LOGS (Admin Only Read, Write via Function/Admin)
CREATE POLICY "admin_audit_logs_select_policy" ON public.admin_audit_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_audit_logs_insert_policy" ON public.admin_audit_logs
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL);
