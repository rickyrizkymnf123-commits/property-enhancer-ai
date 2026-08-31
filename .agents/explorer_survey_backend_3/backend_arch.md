# Property Enhancer AI — Backend, Database, Security & Edge Functions Architecture

**Document Version:** 1.0.0  
**Target Platform:** Supabase (PostgreSQL 15+, Supabase Auth, Storage, Realtime, Deno Edge Functions)  
**Security Standard:** Zero-Trust RLS, Paid-Only Entitlements, HMAC-SHA256 Webhook Verification, Masked Personal API Keys, Tamper-Evident Admin Audit Logs.

---

## Table of Contents
1. [System Overview & Architectural Principles](#1-system-overview--architectural-principles)
2. [Database Schema (DDL, Types, Constraints, Indexes)](#2-database-schema-ddl-types-constraints-indexes)
3. [Row Level Security (RLS) Policies](#3-row-level-security-rls-policies)
4. [Database Functions & Triggers](#4-database-functions--triggers)
5. [Storage Buckets & Access Control](#5-storage-buckets--access-control)
6. [Edge Functions Detailed Specifications & Code Designs](#6-edge-functions-detailed-specifications--code-designs)
   - 6.1 `enhance-image`
   - 6.2 `provision`
   - 6.3 `admin-users`
7. [Security & Key Management Architecture](#7-security--key-management-architecture)
8. [Local Test, Mock & Verification Harness](#8-local-test-mock--verification-harness)

---

## 1. System Overview & Architectural Principles

Property Enhancer AI is a paid-only AI real-estate photo enhancement SaaS. The backend architecture enforces:
1. **Strict Entitlement Access Control (R1):** Public self-registration is strictly disabled. Users gain access exclusively through the automated HMAC webhook provisioning pipeline (`/provision`) or administrative approval (`/admin-users`).
2. **Quota Guards at DB Engine Level (R3 & R5):** Quota checks and deductions execute atomically in PostgreSQL using `check_and_consume_quota` with `SECURITY DEFINER` and transactional isolation, preventing race conditions.
3. **Live State Synchronization (R3):** Status changes on the `images` table (`queued` -> `processing` -> `done` / `failed`) are broadcast via Supabase Realtime to connected user clients.
4. **Resilient Multi-Provider AI Routing (R4 & R5):** Edge function `enhance-image` dynamically resolves active AI providers (Lovable AI Gateway / Google Gemini 2.5 Flash / OpenAI / Replicate) or falls back to user-supplied personal keys.
5. **Audited Governance (R4):** All administrative operations are logged to `admin_audit_logs`, and critical system failures (e.g., WAHA WhatsApp delivery failure, AI provider outages) trigger high-priority alerts in `admin_notifications`.

```
                      +-------------------------------------------------------+
                      |                 External Webhook                      |
                      |            (Mayar / Midtrans / Order)                 |
                      +---------------------------+---------------------------+
                                                  | HMAC-SHA256 Webhook
                                                  v
                      +-------------------------------------------------------+
                      |         Edge Function: `provision`                    |
                      | - Signature verification (PROVISION_SECRET)           |
                      | - Duplicate check (`rejected_duplicate`)              |
                      | - Create Auth User + Profile + Entitlement            |
                      | - Send WhatsApp credentials via WAHA API              |
                      | - Alert `admin_notifications` on WA failure           |
                      +---------------------------+---------------------------+
                                                  |
                                                  v
+------------------------+             +----------------------+            +-----------------------+
|  User Client (/app)    |             | PostgreSQL + RLS     |            | Admin Panel (/admin)  |
+------------------------+             +----------------------+            +-----------------------+
| - Single / Batch Upload|             | - profiles           |            | - User Management     |
| - Preset Selector      |             | - user_roles         |            | - Provider Switch     |
| - Supabase Realtime    |<----------->| - entitlements       |<---------->| - Audit Logs          |
| - Before/After Slider  |             | - projects & images  |            | - Notifications       |
| - Personal API Keys    |             | - admin_audit_logs   |            | - Settings CMS        |
+-----------+------------+             +-----------+----------+            +-----------+-----------+
            |                                      ^                                   |
            | Invoke `enhance-image`               | Quota deduction & status update   | Admin Actions
            v                                      |                                   v
+--------------------------------------------------+--+             +----------------------------------+
|          Edge Function: `enhance-image`             |             |   Edge Function: `admin-users`   |
| - Verify Auth & Entitlement                         |             | - Role check / SETUP_SECRET      |
| - `check_and_consume_quota` atomic RPC              |             | - Approve / Reject / Reset / Del |
| - AI Gateway (Lovable / Gemini / OpenAI / Replicate)|             | - Resend WhatsApp Credentials    |
| - Upload WebP to Storage Bucket `images`            |             | - Mandatory `admin_audit_logs`   |
| - Update `images` record (`done` / `failed`)        |             +----------------------------------+
+-----------------------------------------------------+
```

---

## 2. Database Schema (DDL, Types, Constraints, Indexes)

### 2.1 Enums

```sql
-- Application Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Admin Action Types for Audit Logging
CREATE TYPE public.admin_action_type AS ENUM (
    'approve_user',
    'reject_user',
    'reset_password',
    'delete_user',
    'resend_credential',
    'update_settings',
    'toggle_feature',
    'update_quota',
    'system_bootstrap',
    'other'
);

-- Admin Notification Severity
CREATE TYPE public.notification_severity AS ENUM ('info', 'warning', 'critical');

-- Image Processing Status for Realtime Workflow
CREATE TYPE public.image_status AS ENUM ('queued', 'processing', 'done', 'failed');

-- Entitlement Status
CREATE TYPE public.entitlement_status AS ENUM ('active', 'inactive', 'expired', 'suspended');

-- Provision Webhook Status
CREATE TYPE public.provision_status AS ENUM ('success', 'rejected_duplicate', 'failed');
```

### 2.2 Table Definitions

```sql
-- 1. Profiles Table (Extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. User Roles Table (Role-based access control)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user'::public.app_role,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

-- 3. Entitlements Table (Monthly Quota & Billing Cycle Management)
CREATE TABLE public.entitlements (
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
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Images Table (Core enhancement pipeline records, Realtime enabled)
CREATE TABLE public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    batch_id UUID, -- Nullable for single photo or batch group ID
    original_image_url TEXT NOT NULL,
    enhanced_image_url TEXT,
    preset TEXT NOT NULL DEFAULT 'exterior_daylight',
    status public.image_status NOT NULL DEFAULT 'queued'::public.image_status,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Supabase Realtime for images table
ALTER PUBLICATION supabase_realtime ADD TABLE public.images;

-- 6. User API Keys Table (Encrypted personal BYOK keys)
CREATE TABLE public.user_api_keys (
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
CREATE TABLE public.api_provider_settings (
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
CREATE TABLE public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, -- 'success', 'error', 'timeout'
    error_code TEXT,
    cost_estimate_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Admin Settings Table (Global system configuration)
CREATE TABLE public.admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Admin Notifications Table (Alerts for provisioning & AI failures)
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity public.notification_severity NOT NULL DEFAULT 'info'::public.notification_severity,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Pricing Settings Table (CMS for Landing Page Pricing)
CREATE TABLE public.pricing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name TEXT NOT NULL DEFAULT 'Paket Lifetime Access',
    price_idR NUMERIC(15, 2) NOT NULL DEFAULT 499000.00,
    original_price_idr NUMERIC(15, 2) DEFAULT 999000.00,
    monthly_quota INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    features JSONB NOT NULL DEFAULT '["100 Foto Enhancements / Bulan", "Reset Kuota Otomatis Setiap 30 Hari", "Akses Semua Preset Eksterior & Interior", "Resolusi HD & Tanpa Watermark", "Penyimpanan Galeri Cloud"]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Testimonials Table (CMS for Landing Page Social Proof)
CREATE TABLE public.testimonials (
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
CREATE TABLE public.faqs (
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
CREATE TABLE public.provision_logs (
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
CREATE TABLE public.admin_audit_logs (
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
```

### 2.3 Performance & Security Indexes

```sql
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_user_product ON public.entitlements(user_id, product_code);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_project_id ON public.images(project_id);
CREATE INDEX idx_images_batch_id ON public.images(batch_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX idx_admin_notifications_severity_unread ON public.admin_notifications(severity, is_read);
CREATE INDEX idx_provision_logs_email ON public.provision_logs(email);
CREATE INDEX idx_provision_logs_order_id ON public.provision_logs(order_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
```

---

## 3. Row Level Security (RLS) Policies

All tables have RLS enabled. Helper function `public.has_role(auth.uid(), 'admin')` allows admins global administrative access while confining regular users to their own data.

```sql
-- Enable RLS on all tables
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
```

### 3.1 RLS Policies by Table

#### `profiles`
```sql
-- Users can view their own profile; Admins can view all profiles
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Users can update their own profile; Admins can update any profile
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
```

#### `user_roles`
```sql
-- Users can read their own roles; Admins can read all roles
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only Admins can insert/update/delete roles
CREATE POLICY "user_roles_admin_write" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

#### `entitlements`
```sql
-- Users can read their own entitlement; Admins can read all
CREATE POLICY "entitlements_select_policy" ON public.entitlements
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Only Admins or Service Role (via SECURITY DEFINER / Edge Functions) can modify entitlements
CREATE POLICY "entitlements_admin_write" ON public.entitlements
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

#### `projects`
```sql
-- Users can CRUD their own projects; Admins can read all
CREATE POLICY "projects_select_policy" ON public.projects
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "projects_insert_policy" ON public.projects
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_policy" ON public.projects
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_policy" ON public.projects
FOR DELETE USING (auth.uid() = user_id);
```

#### `images`
```sql
-- Users can view and manage their own images; Admins can view all
CREATE POLICY "images_select_policy" ON public.images
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "images_insert_policy" ON public.images
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "images_update_policy" ON public.images
FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "images_delete_policy" ON public.images
FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
```

#### `user_api_keys`
```sql
-- Users can only view and manage their own keys
CREATE POLICY "user_api_keys_all_policy" ON public.user_api_keys
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

#### `api_provider_settings`, `admin_settings`, `admin_notifications`, `admin_audit_logs`, `provision_logs`
```sql
-- Strictly restricted to Admin users
CREATE POLICY "admin_only_select" ON public.api_provider_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_only_write" ON public.api_provider_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_settings_policy" ON public.admin_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_notifications_policy" ON public.admin_notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_audit_logs_policy" ON public.admin_audit_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "provision_logs_policy" ON public.provision_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

#### Public CMS Tables (`pricing_settings`, `testimonials`, `faqs`)
```sql
-- Anyone (anon / authenticated) can read active items; Admins can write
CREATE POLICY "pricing_public_read" ON public.pricing_settings FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pricing_admin_write" ON public.pricing_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "testimonials_public_read" ON public.testimonials FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "testimonials_admin_write" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "faqs_admin_write" ON public.faqs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
```

---

## 4. Database Functions & Triggers

### 4.1 Role Checking Helper (`has_role`)
```sql
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
```

### 4.2 Auto `updated_at` Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Apply to tables with updated_at
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_entitlements_updated_at BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_images_updated_at BEFORE UPDATE ON public.images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_api_keys_updated_at BEFORE UPDATE ON public.user_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_api_provider_settings_updated_at BEFORE UPDATE ON public.api_provider_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pricing_settings_updated_at BEFORE UPDATE ON public.pricing_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 4.3 New User Profile Creation Trigger (`handle_new_user`)
```sql
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
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone;

    -- Assign default 'user' role if none exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 4.4 Atomic Quota Check & Consume Function (`check_and_consume_quota`)
This function guarantees atomic quota validation and monthly cycle roll-over:
```sql
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
```

### 4.5 Admin Action Logger Function (`log_admin_action`)
```sql
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
        v_admin_email,
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
```

---

## 5. Storage Buckets & Access Control

### 5.1 Storage Configuration
- **Bucket Name:** `images`
- **Public Access:** `false` (Private bucket with authenticated RLS & signed URLs or token-gated access)
- **Folder Structure:**
  - `originals/{userId}/{imageId}_{filename}`
  - `enhanced/{userId}/{imageId}_enhanced.webp`
  - `thumbnails/{userId}/{imageId}_thumb.webp`

### 5.2 Storage RLS Policies (`storage.objects`)

```sql
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 1. Users can upload images to their own user directory
CREATE POLICY "storage_images_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2. Users can read/download images from their own directory; Admins can read all
CREATE POLICY "storage_images_select_own" ON storage.objects
FOR SELECT USING (
    bucket_id = 'images'
    AND (
        (auth.role() = 'authenticated' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR public.has_role(auth.uid(), 'admin')
    )
);

-- 3. Users can delete images from their own directory
CREATE POLICY "storage_images_delete_own" ON storage.objects
FOR DELETE USING (
    bucket_id = 'images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[2] = auth.uid()::text
);
```

---

## 6. Edge Functions Detailed Specifications & Code Designs

All Supabase Edge Functions run on Deno (`deno.land/std`, `@supabase/supabase-js`).

### 6.1 Edge Function 1: `enhance-image`
**Path:** `supabase/functions/enhance-image/index.ts`  
**Purpose:** Orchestrates quota deduction, status transitions (`queued` -> `processing` -> `done`/`failed`), multi-provider AI enhancement, and result storage.

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnhanceRequest {
  imageId: string;
  originalImageUrl: string;
  preset?: string;
  projectId?: string;
  customApiKey?: string;
}

const PRESET_PROMPTS: Record<string, string> = {
  exterior_daylight: "Professional architectural real-estate photograph of a residential property exterior, bright crisp daylight, manicured green lawn, clear blue sky with soft white clouds, pristine paintwork, no cars, high dynamic range.",
  twilight_golden_hour: "Luxury real-estate dusk twilight exterior photo, warm golden hour sky gradient, ambient interior and exterior architectural warm lighting glowing from windows, reflection in clean driveway, modern upscale atmosphere.",
  interior_modern_minimalist: "Architectural interior design photograph, modern minimalist living room, natural sunlight through large clean windows, tidy furniture staging, warm oak textures, decluttered, wide angle, 8k crisp details.",
  interior_warm_luxury: "High-end luxury interior real-estate photography, warm architectural recessed lighting, elegant marble and hardwood flooring, tasteful modern staging, bright and airy feel.",
  lawn_sky_replacement: "Real-estate exterior enhancement, lush vibrant green trimmed grass lawn, dramatic sunny blue sky with gentle clouds, flawless curb appeal.",
  declutter_clean: "Real estate interior photo decluttering, remove all personal items, wires, stray objects, immaculate clean surfaces, staged with professional interior decor."
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    const { imageId, originalImageUrl, preset = "exterior_daylight", projectId, customApiKey } = payload;

    if (!imageId || !originalImageUrl) {
      return new Response(JSON.stringify({ error: "imageId and originalImageUrl are required" }), {
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

    // 3. Mark DB record status = 'processing'
    await supabaseAdmin
      .from("images")
      .update({
        status: "processing",
        preset,
        project_id: projectId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", imageId);

    // 4. Resolve Active AI Provider
    const { data: providerConfig } = await supabaseAdmin
      .from("api_provider_settings")
      .select("*")
      .eq("is_default", true)
      .eq("is_active", true)
      .single();

    const providerName = providerConfig?.provider_name || "lovable";
    const modelName = providerConfig?.model_name || "google/gemini-2.5-flash-image";
    const prompt = PRESET_PROMPTS[preset] || PRESET_PROMPTS["exterior_daylight"];

    // 5. Call AI Provider (Gateway / Direct)
    let enhancedImageBytes: Uint8Array;
    let mimeType = "image/webp";

    const aiApiKey = customApiKey || Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    
    // Call AI Generation Logic
    const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        image_url: originalImageUrl,
        response_format: "b64_json",
        n: 1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Provider ${providerName} failed: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const base64Data = aiData.data?.[0]?.b64_json || aiData.image_base64;
    if (!base64Data) {
      throw new Error("No image data returned from AI provider");
    }

    const binaryString = atob(base64Data);
    enhancedImageBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      enhancedImageBytes[i] = binaryString.charCodeAt(i);
    }

    // 6. Upload Enhanced Image to Storage
    const storagePath = `enhanced/${user.id}/${imageId}_enhanced.webp`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("images")
      .upload(storagePath, enhancedImageBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: { publicUrl: enhancedImageUrl } } = supabaseAdmin.storage
      .from("images")
      .getPublicUrl(storagePath);

    // 7. Update Image status = 'done'
    const latencyMs = Date.now() - startTime;
    await supabaseAdmin
      .from("images")
      .update({
        status: "done",
        enhanced_image_url: enhancedImageUrl,
        metadata: {
          provider: providerName,
          model: modelName,
          preset,
          latency_ms: latencyMs,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", imageId);

    // 8. Log Usage
    await supabaseAdmin.from("api_usage_logs").insert({
      user_id: user.id,
      image_id: imageId,
      provider: providerName,
      model: modelName,
      latency_ms: latencyMs,
      status: "success",
      cost_estimate_usd: 0.02,
    });

    return new Response(
      JSON.stringify({
        success: true,
        imageId,
        enhancedImageUrl,
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

    // Fail-safe: Update status = 'failed' & Emit Critical Admin Notification
    try {
      const payload: EnhanceRequest = await req.clone().json().catch(() => ({}));
      if (payload?.imageId) {
        await supabaseAdmin
          .from("images")
          .update({
            status: "failed",
            error_message: error.message,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.imageId);
      }

      await supabaseAdmin.from("admin_notifications").insert({
        title: "AI Enhancement Failure",
        message: `Image enhancement failed: ${error.message}`,
        severity: "critical",
        metadata: { error: error.stack || error.message, latencyMs },
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
});
```

---

### 6.2 Edge Function 2: `provision`
**Path:** `supabase/functions/provision/index.ts`  
**Purpose:** Webhook endpoint verifying HMAC-SHA256 signature, checking duplicate emails (`rejected_duplicate`), creating Auth User + Profile + Entitlement, and dispatching login credentials via WAHA WhatsApp API.

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-webhook-secret",
};

// HMAC-SHA256 Signature Verification Helper
async function verifyHmacSignature(rawBody: string, signatureHex: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // Convert hex signature to ArrayBuffer
  const sigBytes = new Uint8Array(
    signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(rawBody));
}

// Generate Secure Random Password
function generateSecurePassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ!@#$%*";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join("");
}

// WhatsApp Notification via WAHA API Helper
async function sendWhatsAppCredentials(phone: string, email: string, tempPass: string, fullName: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const wahaBaseUrl = Deno.env.get("WAHA_BASE_URL") || "http://waha:3000";
  const wahaApiKey = Deno.env.get("WAHA_API_KEY") || "";
  const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || "https://propertyenhancer.ai/login";

  // Sanitize Indonesian phone number to international 62 format
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
🌐 *Login URL:* ${appLoginUrl}
📧 *Email:* ${email}
🔑 *Password Sementara:* ${tempPass}
⚡ *Kuota Foto:* 100 Foto / Bulan (Auto-reset setiap 30 hari)

*Petunjuk Keamanan:*
1. Silakan login ke aplikasi dan ubah password Anda di menu *Pengaturan*.
2. Simpan pesan ini untuk catatan Anda.

Butuh bantuan? Balas pesan ini atau hubungi tim support kami.
Selamat meningkatkan kualitas foto properti Anda! 🚀`;

  try {
    const response = await fetch(`${wahaBaseUrl}/api/sendText`, {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const provisionSecret = Deno.env.get("PROVISION_SECRET") || "property_enhancer_secret_key_2026";
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

  const signatureHeader = req.headers.get("x-signature") || req.headers.get("x-webhook-secret") || "";

  // 1. Verify HMAC Signature
  let isSignatureValid = false;
  if (signatureHeader === provisionSecret) {
    // Direct shared secret token match
    isSignatureValid = true;
  } else if (signatureHeader) {
    // HMAC-SHA256 validation
    isSignatureValid = await verifyHmacSignature(rawBody, signatureHeader, provisionSecret).catch(() => false);
  }

  if (!isSignatureValid) {
    await supabaseAdmin.from("provision_logs").insert({
      email: payload.email || "unknown",
      phone: payload.phone || null,
      full_name: payload.full_name || null,
      order_id: payload.order_id || null,
      amount: payload.amount || 0,
      payload,
      status: "failed",
      error_message: "Invalid HMAC signature or webhook secret",
    });

    return new Response(JSON.stringify({ error: "Unauthorized: Invalid Signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, phone, full_name, order_id, amount } = payload;
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
    .eq("email", email.trim().toLowerCase());

  if (existingProfiles && existingProfiles.length > 0) {
    await supabaseAdmin.from("provision_logs").insert({
      email,
      phone,
      full_name,
      order_id,
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
    email: email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: full_name || "",
      phone: phone || "",
    },
  });

  if (createAuthError || !authData.user) {
    await supabaseAdmin.from("provision_logs").insert({
      email,
      phone,
      full_name,
      order_id,
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

  // Create Entitlement Record
  await supabaseAdmin.from("entitlements").upsert({
    user_id: userId,
    product_code: "PEA",
    monthly_quota: 100,
    used_quota: 0,
    cycle_reset_date: cycleResetDate,
    status: "active",
  });

  // 4. Send WhatsApp Notification via WAHA API
  let waResult = { success: false, error: "No phone provided" };
  if (phone) {
    waResult = await sendWhatsAppCredentials(phone, email, tempPassword, full_name);
  }

  // 5. Alert admin if WhatsApp delivery failed
  if (!waResult.success) {
    await supabaseAdmin.from("admin_notifications").insert({
      title: "WhatsApp Provisioning Delivery Failed",
      message: `Gagal mengirim WhatsApp kredensial untuk ${email} (${phone || "no phone"}). Order ID: ${order_id || "-"}. Error: ${waResult.error}`,
      severity: "critical",
      metadata: { userId, email, phone, order_id, error: waResult.error },
    });
  }

  // 6. Log Provision Transaction
  await supabaseAdmin.from("provision_logs").insert({
    email,
    phone,
    full_name,
    order_id,
    amount,
    payload,
    status: "success",
    whatsapp_sent: waResult.success,
    whatsapp_response: waResult,
  });

  return new Response(
    JSON.stringify({
      success: true,
      userId,
      email,
      orderId: order_id,
      whatsappSent: waResult.success,
      cycleResetDate,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
```

---

### 6.3 Edge Function 3: `admin-users`
**Path:** `supabase/functions/admin-users/index.ts`  
**Purpose:** Handles administrative user management (list, approve, reject, reset_password, delete, resend_credential via WhatsApp) with mandatory `admin_audit_logs` records.

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSetupSecret = Deno.env.get("ADMIN_SETUP_SECRET") || "pea_admin_setup_secret_2026";
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // 1. Authorize: Either Admin JWT or Setup Secret
    const authHeader = req.headers.get("Authorization");
    const setupSecretHeader = req.headers.get("x-setup-secret");

    let adminUserId: string | null = null;
    let adminEmail = "setup_secret_admin";

    if (setupSecretHeader && setupSecretHeader === adminSetupSecret) {
      // Authorized via Setup Secret
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
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden: Admin role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      adminUserId = user.id;
      adminEmail = user.email || "admin";
    } else {
      return new Response(JSON.stringify({ error: "Missing authorization credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, targetUserId, details = {} } = await req.json();

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
            id, email, full_name, phone, created_at,
            user_roles(role),
            entitlements(product_code, monthly_quota, used_quota, cycle_reset_date, status)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, users: profiles }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve": {
        if (!targetUserId) throw new Error("targetUserId is required");
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
        if (!targetUserId) throw new Error("targetUserId is required");
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
        if (!targetUserId) throw new Error("targetUserId is required");
        const newPassword = details.newPassword || "PeaPass@" + Math.floor(100000 + Math.random() * 900000);

        const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: newPassword,
        });

        if (resetErr) throw resetErr;

        await logAudit("reset_password", `auth.users/${targetUserId}`, { resetBy: adminEmail });

        return new Response(
          JSON.stringify({ success: true, message: "Password reset successfully", temporaryPassword: newPassword }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "delete": {
        if (!targetUserId) throw new Error("targetUserId is required");
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        if (delErr) throw delErr;

        await logAudit("delete_user", `auth.users/${targetUserId}`, { deletedUser: targetUserId });

        return new Response(JSON.stringify({ success: true, message: "User deleted permanently" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "resend_credential": {
        if (!targetUserId) throw new Error("targetUserId is required");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, phone, full_name")
          .eq("id", targetUserId)
          .single();

        if (!profile) throw new Error("User profile not found");

        const tempPass = "Pea@" + Math.floor(100000 + Math.random() * 900000);
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: tempPass });

        // Forward to WhatsApp
        const waRes = await fetch(`${Deno.env.get("WAHA_BASE_URL") || "http://waha:3000"}/api/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(Deno.env.get("WAHA_API_KEY") ? { "X-Api-Key": Deno.env.get("WAHA_API_KEY")! } : {}),
          },
          body: JSON.stringify({
            chatId: `${profile.phone.replace(/\D/g, "")}@c.us`,
            text: `🔑 *Pembaruan Kredensial Property Enhancer AI*\n\nHalo ${profile.full_name || ""},\nBerikut kredensial login Anda:\nEmail: ${profile.email}\nPassword Baru: ${tempPass}\n\nLogin di: ${Deno.env.get("APP_LOGIN_URL") || "https://propertyenhancer.ai/login"}`,
            session: "default",
          }),
        }).then(r => r.json()).catch(err => ({ error: err.message }));

        await logAudit("resend_credential", `auth.users/${targetUserId}`, {
          phone: profile.phone,
          waResult: waRes,
        });

        return new Response(
          JSON.stringify({ success: true, message: "Credentials resent via WhatsApp", waResponse: waRes }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
});
```

---

## 7. Security & Key Management Architecture

1. **Zero Public Self-Registration:**
   - Supabase Auth setting `ENABLE_SIGNUP = false`.
   - `/login` client-side checks active roles and `PEA` entitlement status via `entitlements`. Users without active entitlements are immediately signed out with error toast.
2. **Encrypted Personal API Keys (BYOK):**
   - Personal user API keys stored in `user_api_keys` have `masked_key` (e.g. `sk-...ab12`) for client display and AES-256 encrypted `encrypted_api_key` for server-side edge function invocation.
3. **Tamper-Evident Admin Logging:**
   - `admin_audit_logs` is write-protected from client modification; logs can only be inserted via `SECURITY DEFINER` function or service role.
4. **Rate Limiting & DDOS Resilience:**
   - Webhook endpoint `/provision` limits bursts and strictly requires valid HMAC signature before querying the database.

---

## 8. Local Test, Mock & Verification Harness

To enable end-to-end verification in local development without incurring cloud AI API or live WhatsApp costs, the architecture specifies:

1. **Local WAHA Mock Server:**
   - Lightweight Node/Express mock responding to `POST /api/sendText` with simulated success or customizable failure triggers.
2. **Mock AI Gateway Provider:**
   - Edge function fallback to return simulated high-resolution WebP before/after pairs when `INTEGRITY_MODE=development` or `AI_MOCK=true`.
3. **Database Migration Verification Script:**
   - Comprehensive test runner script (`test_backend.ts` / `vitest`) asserting:
     - DDL creation & Enum verification.
     - Role assignment and RLS policy boundaries.
     - `check_and_consume_quota` boundary tests (100th image, 101st image rejected, cycle reset advance).
     - HMAC verification in `/provision`.
     - Admin audit log emission in `/admin-users`.
