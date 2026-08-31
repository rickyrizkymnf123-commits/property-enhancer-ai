-- ============================================================================
-- Migration 00003: Database Functions and Triggers
-- Security Definer Functions, Quota Management, Audit Logging, Triggers
-- ============================================================================

-- 1. Helper function: has_role (SECURITY DEFINER)
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

-- 2. Trigger function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_entitlements_updated_at ON public.entitlements;
CREATE TRIGGER trg_entitlements_updated_at
    BEFORE UPDATE ON public.entitlements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_images_updated_at ON public.images;
CREATE TRIGGER trg_images_updated_at
    BEFORE UPDATE ON public.images
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_api_keys_updated_at ON public.user_api_keys;
CREATE TRIGGER trg_user_api_keys_updated_at
    BEFORE UPDATE ON public.user_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_api_provider_settings_updated_at ON public.api_provider_settings;
CREATE TRIGGER trg_api_provider_settings_updated_at
    BEFORE UPDATE ON public.api_provider_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER trg_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pricing_settings_updated_at ON public.pricing_settings;
CREATE TRIGGER trg_pricing_settings_updated_at
    BEFORE UPDATE ON public.pricing_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_testimonials_updated_at ON public.testimonials;
CREATE TRIGGER trg_testimonials_updated_at
    BEFORE UPDATE ON public.testimonials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_faqs_updated_at ON public.faqs;
CREATE TRIGGER trg_faqs_updated_at
    BEFORE UPDATE ON public.faqs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Trigger function: handle_new_user (auth.users trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        updated_at = timezone('utc'::text, now());

    -- Assign default 'user' role if none exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 4. Atomic Quota Validation & Consumption Function
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(
    p_user_id UUID,
    p_product_code TEXT DEFAULT 'PEA',
    p_amount INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entitlement public.entitlements%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_new_used INTEGER;
    v_new_cycle_reset TIMESTAMPTZ;
BEGIN
    -- Lock row for update to prevent race conditions during concurrent enhancement calls
    SELECT * INTO v_entitlement
    FROM public.entitlements
    WHERE user_id = p_user_id
      AND product_code = p_product_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'no_entitlement',
            'message', 'Tidak ada paket aktif untuk produk ini.'
        );
    END IF;

    IF v_entitlement.status <> 'active'::public.entitlement_status THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'entitlement_inactive',
            'status', v_entitlement.status,
            'message', 'Akses paket Anda sedang nonaktif atau disuspend.'
        );
    END IF;

    -- Check if monthly billing cycle has expired. If so, reset used_quota and bump cycle_reset_date
    IF v_now >= v_entitlement.cycle_reset_date THEN
        v_new_cycle_reset := v_now + INTERVAL '1 month';
        v_new_used := p_amount;

        -- Verify amount doesn't exceed monthly quota immediately
        IF v_new_used > v_entitlement.monthly_quota THEN
            UPDATE public.entitlements
            SET used_quota = 0,
                cycle_reset_date = v_new_cycle_reset,
                updated_at = v_now
            WHERE id = v_entitlement.id;

            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'quota_exhausted',
                'monthly_quota', v_entitlement.monthly_quota,
                'used_quota', 0,
                'remaining_quota', v_entitlement.monthly_quota,
                'cycle_reset_date', v_new_cycle_reset,
                'message', 'Permintaan melebihi kuota bulanan yang tersedia.'
            );
        END IF;

        UPDATE public.entitlements
        SET used_quota = v_new_used,
            cycle_reset_date = v_new_cycle_reset,
            updated_at = v_now
        WHERE id = v_entitlement.id;

        RETURN jsonb_build_object(
            'allowed', true,
            'cycle_reset', true,
            'monthly_quota', v_entitlement.monthly_quota,
            'used_quota', v_new_used,
            'remaining_quota', (v_entitlement.monthly_quota - v_new_used),
            'cycle_reset_date', v_new_cycle_reset
        );
    ELSE
        -- Within active cycle, check remaining quota
        IF (v_entitlement.used_quota + p_amount) > v_entitlement.monthly_quota THEN
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'quota_exhausted',
                'monthly_quota', v_entitlement.monthly_quota,
                'used_quota', v_entitlement.used_quota,
                'remaining_quota', (v_entitlement.monthly_quota - v_entitlement.used_quota),
                'cycle_reset_date', v_entitlement.cycle_reset_date,
                'message', 'Kuota bulanan Anda telah habis. Kuota akan direset pada ' || to_char(v_entitlement.cycle_reset_date, 'YYYY-MM-DD HH24:MI:SS UTC')
            );
        END IF;

        v_new_used := v_entitlement.used_quota + p_amount;

        UPDATE public.entitlements
        SET used_quota = v_new_used,
            updated_at = v_now
        WHERE id = v_entitlement.id;

        RETURN jsonb_build_object(
            'allowed', true,
            'cycle_reset', false,
            'monthly_quota', v_entitlement.monthly_quota,
            'used_quota', v_new_used,
            'remaining_quota', (v_entitlement.monthly_quota - v_new_used),
            'cycle_reset_date', v_entitlement.cycle_reset_date
        );
    END IF;
END;
$$;

-- 5. Admin Action Logger Function
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_action_type public.admin_action_type,
    p_target_user_id UUID DEFAULT NULL,
    p_target_resource TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_admin_email TEXT;
    v_log_id UUID;
BEGIN
    IF v_admin_id IS NOT NULL THEN
        SELECT email INTO v_admin_email FROM auth.users WHERE id = v_admin_id;
    ELSE
        v_admin_email := 'system_edge_function';
    END IF;

    INSERT INTO public.admin_audit_logs (
        admin_id,
        admin_email,
        action_type,
        target_user_id,
        target_resource,
        details,
        ip_address,
        user_agent
    )
    VALUES (
        v_admin_id,
        COALESCE(v_admin_email, 'system'),
        p_action_type,
        p_target_user_id,
        p_target_resource,
        p_details,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;
