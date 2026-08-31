-- ============================================================================
-- Migration 00001: Initial Schema
-- Enums, 15 Tables, Indexes, and Realtime Publication
-- ============================================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TYPE public.admin_action_type AS ENUM (
    'approve_user',
    'reject_user',
    'reset_password',
    'delete_user',
    'resend_credential',
    'update_settings',
    'toggle_feature',
    'update_quota',
    'switch_provider',
    'adjust_quota',
    'system_bootstrap',
    'other'
);

CREATE TYPE public.notification_severity AS ENUM ('info', 'warning', 'critical');

CREATE TYPE public.image_status AS ENUM ('queued', 'processing', 'done', 'failed');

CREATE TYPE public.entitlement_status AS ENUM ('active', 'inactive', 'expired', 'suspended');

CREATE TYPE public.provision_status AS ENUM ('success', 'rejected_duplicate', 'failed', 'failed_wa');

-- 2. TABLES

-- 1. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. User Roles Table (Role-based access control)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user'::public.app_role,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

-- 3. Entitlements Table (Monthly Quota & Billing Cycle Management)
CREATE TABLE IF NOT EXISTS public.entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_code TEXT NOT NULL DEFAULT 'PEA',
    monthly_quota INTEGER NOT NULL DEFAULT 100 CHECK (monthly_quota >= 0),
    used_quota INTEGER NOT NULL DEFAULT 0 CHECK (used_quota >= 0),
    cycle_reset_date TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '1 month'),
    status public.entitlement_status NOT NULL DEFAULT 'active'::public.entitlement_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT entitlements_user_product_unique UNIQUE (user_id, product_code)
);

-- 4. Projects Table (Grouping enhanced photos)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Images Table (Core enhancement pipeline records, Realtime enabled)
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    batch_id UUID, -- Nullable for single photo or batch group ID
    original_url TEXT NOT NULL,
    enhanced_url TEXT,
    preset TEXT NOT NULL DEFAULT 'HDR_BALANCED',
    status public.image_status NOT NULL DEFAULT 'queued'::public.image_status,
    error_message TEXT,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Supabase Realtime for images table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.images;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 6. User API Keys Table (Encrypted personal BYOK keys)
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'gemini', 'openai', 'replicate'
    key_name TEXT NOT NULL DEFAULT 'Primary Key',
    encrypted_api_key TEXT NOT NULL, -- AES-256-GCM / PGP encrypted
    masked_key TEXT NOT NULL, -- e.g. "sk-...ab12"
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. API Provider Settings Table (Admin configurable AI providers)
CREATE TABLE IF NOT EXISTS public.api_provider_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL UNIQUE, -- 'lovable', 'gemini', 'openai', 'replicate'
    model_name TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. API Usage Logs Table
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, -- 'success', 'failed', 'timeout'
    error_code TEXT,
    cost_estimate_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Admin Settings Table (Global system configuration)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Admin Notifications Table (Alerts for provisioning & AI failures)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity public.notification_severity NOT NULL DEFAULT 'info'::public.notification_severity,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Pricing Settings Table (CMS for Landing Page Pricing)
CREATE TABLE IF NOT EXISTS public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT NOT NULL DEFAULT 'Paket Lifetime Access',
    price_idr NUMERIC(15, 2) NOT NULL DEFAULT 499000.00,
    original_price_idr NUMERIC(15, 2) DEFAULT 999000.00,
    monthly_quota INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    features JSONB NOT NULL DEFAULT '["100 Foto Enhancements / Bulan", "Reset Kuota Otomatis Setiap 30 Hari", "Akses Semua Preset Eksterior & Interior", "Resolusi HD & Tanpa Watermark", "Penyimpanan Galeri Cloud"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Testimonials Table (CMS for Landing Page Social Proof)
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT NOT NULL,
    author_role TEXT,
    author_company TEXT,
    author_avatar_url TEXT,
    quote TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. FAQs Table (CMS for Landing Page FAQ Accordion)
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Provision Logs Table (Webhook Audit Trail)
CREATE TABLE IF NOT EXISTS public.provision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    phone TEXT,
    full_name TEXT,
    order_id TEXT,
    amount NUMERIC(15, 2),
    payload JSONB,
    status public.provision_status NOT NULL,
    error_message TEXT,
    whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
    whatsapp_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. Admin Audit Logs Table (Tamper-evident log of administrative actions)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action_type public.admin_action_type NOT NULL,
    target_user_id UUID,
    target_resource TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_product ON public.entitlements(user_id, product_code);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON public.images(user_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON public.images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_batch_id ON public.images(batch_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON public.images(status);
CREATE INDEX IF NOT EXISTS idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity_unread ON public.admin_notifications(severity, is_read);
CREATE INDEX IF NOT EXISTS idx_provision_logs_email ON public.provision_logs(email);
CREATE INDEX IF NOT EXISTS idx_provision_logs_order_id ON public.provision_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
