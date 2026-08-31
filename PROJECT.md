# Project: Property Enhancer AI

## Architecture
Property Enhancer AI is a paid-only, production-grade real estate photo enhancement web platform with AI processing, role-based access control, strict entitlement enforcement, and comprehensive administrative governance.

### Tech Stack
- **Frontend Framework**: React 18+, Vite, TypeScript, TailwindCSS
- **UI & Icons**: Radix UI primitives / Shadcn UI components, Lucide React icons
- **Styling / Theme**: Dark glassmorphism, neon purple/blue glows, Space Grotesk & DM Sans typography
- **State & Realtime**: React Query / Context API, Supabase Client (`@supabase/supabase-js`) with Supabase Realtime subscriptions
- **Backend / Database**: Supabase PostgreSQL, Row Level Security (RLS), SECURITY DEFINER functions, Storage bucket `images`
- **Serverless Edge Functions (Deno / TypeScript)**:
  - `enhance-image`: Quota validation (`check_and_consume_quota`), database status transitions (`queued` -> `processing` -> `done`/`failed`), multi-provider AI Gateway (Lovable/Gemini/OpenAI/Replicate), storage WebP upload, error notification dispatch.
  - `provision`: HMAC-SHA256 authenticated webhook, duplicate check (`rejected_duplicate`), auth user creation, profile & PEA entitlement initialization (100 photos/month, 1-month cycle reset date), WAHA WhatsApp API notification, error alerting.
  - `admin-users`: Admin action executor (list, approve, reject, reset_password, delete, resend_credential) with mandatory `admin_audit_logs` logging.
- **Testing**: Vitest, React Testing Library, jsdom, Mock Supabase Provider & Edge Function Test Runners.

---

## Code Layout
```
property-enhancer-ai/
├── src/
│   ├── components/
│   │   ├── auth/          # LoginCard, ResetPasswordCard, ForgotPasswordCard
│   │   ├── landing/       # Navbar, HeroSection, SocialProof, Features, HowItWorks, GalleryExamples, PricingSection, Testimonials, FAQAccordion, Footer
│   │   ├── studio/        # BeforeAfterSlider, ImageZoomViewer, PhotoUploader, PresetSelector, RealtimeStatusBadge
│   │   ├── dashboard/     # UserDashboardContent, StatsCard, QuotaTracker, ProjectModal, OnboardingTutorial
│   │   ├── admin/         # AdminLayout, AdminUserTable, ApiProviderSwitch, SystemApiKeysView, ApiUsageLogsTable, AdminNotificationsList, AuditLogsTable, SettingsCms
│   │   ├── shared/        # AppSidebar, Header, ProtectedRoute, MaskedKeyDisplay, GlassCard, NeonButton
│   │   └── ui/            # Button, Input, Dialog, Toast, DropdownMenu, Tabs, Accordion, Slider, Select, Badge
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useRealtimeEnhancement.ts
│   │   ├── useQuota.ts
│   │   └── useProjects.ts
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── app/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EditorPage.tsx
│   │   │   ├── GalleryPage.tsx
│   │   │   ├── ProjectsPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── admin/
│   │       ├── AdminDashboardPage.tsx
│   │       ├── AdminUsersPage.tsx
│   │       ├── AdminProvidersPage.tsx
│   │       ├── AdminKeysPage.tsx
│   │       ├── AdminUsagePage.tsx
│   │       ├── AdminNotificationsPage.tsx
│   │       ├── AdminAuditLogsPage.tsx
│   │       └── AdminSettingsPage.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── mockSupabase.ts
│   │   ├── imageUtils.ts
│   │   ├── maskUtils.ts
│   │   └── api.ts
│   ├── types/
│   │   ├── database.types.ts
│   │   ├── auth.types.ts
│   │   ├── studio.types.ts
│   │   └── admin.types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_rls_policies.sql
│   │   ├── 00003_functions_triggers.sql
│   │   ├── 00004_storage_buckets.sql
│   │   └── 00005_seed_data.sql
│   └── functions/
│       ├── enhance-image/
│       │   └── index.ts
│       ├── provision/
│       │   └── index.ts
│       └── admin-users/
│           └── index.ts
├── tests/
│   ├── e2e/
│   │   ├── tier1_features.test.ts
│   │   ├── tier2_boundaries.test.ts
│   │   ├── tier3_combinations.test.ts
│   │   └── tier4_real_world.test.ts
│   ├── unit/
│   │   ├── auth.test.tsx
│   │   ├── quota.test.ts
│   │   ├── slider.test.tsx
│   │   ├── realtime.test.ts
│   │   ├── edge_functions.test.ts
│   │   └── admin_audit.test.ts
│   └── setup.ts
├── ORIGINAL_REQUEST.md
├── PROJECT.md
├── TEST_INFRA.md
└── package.json
```

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Paid-Only No Self-Registration | No registration form on /login; rejects arbitrary registrations | M2 | R1 |
| 2 | Role-Based Redirect | /login redirects admin role to /admin, user to /app | M2 | R1 |
| 3 | Entitlement Access Gate | /login verifies PEA entitlement status='active'; if absent/inactive, denies with toast "Akses belum aktif" and signs out | M2 | R1 |
| 4 | Password Recovery Flow | /forgot-password sends recovery link; /reset-password updates credentials | M2 | R1 |
| 5 | ProtectedRoute & useAuth | Route wrapper checking session, roles, and PEA entitlement | M2 | R1 |
| 6 | Landing Page Hero with Slider | Public landing hero with interactive before/after comparison slider | M3 | R2 |
| 7 | Glassmorphism Dark Theme | Space Grotesk + DM Sans fonts, dark palette, neon purple/blue gradient accents | M3 | R2 |
| 8 | Features Showcase (6 Features) | 6 features grid with Batch Processing explicitly marked "Segera Hadir" | M3 | R2 |
| 9 | How It Works 3-Step Guide | 3 step visual walkthrough on landing page | M3 | R2 |
| 10 | Examples Gallery | Before/After gallery examples on landing page | M3 | R2 |
| 11 | Pricing 1 Lifetime Package | Lifetime access package with 100 photos/month quota | M3 | R2 |
| 12 | Testimonials & FAQ Accordion | Testimonials and FAQ components filtering `is_active=true` | M3 | R2 |
| 13 | Smart Redirect for Logged-in | Landing page automatically redirects authenticated users to /app or /admin | M3 | R2 |
| 14 | User Dashboard Stats | /app displays Total Foto, Total Proyek, Diproses Hari Ini, Sisa Kuota Bulan Ini X/100, Cycle Reset Date | M4 | R3 |
| 15 | Single Photo Upload Validation | /app/editor strictly validates JPG, PNG, WEBP file formats and size | M4 | R3 |
| 16 | Preset Selector | /app/editor lets user select enhancement presets (HDR, Twilight, Brightening, Declutter) | M4 | R3 |
| 17 | Supabase Realtime Updates | /app/editor subscribes to `images` table changes (queued -> processing -> done/failed) | M4 | R3 |
| 18 | Editor Before/After Slider | Interactive drag comparison slider with divider | M4 | R3 |
| 19 | Image Zoom & Pan Viewer | High-resolution viewer with focal zoom, pan, fit-to-screen | M4 | R3 |
| 20 | Result Download | Download enhanced high-resolution image | M4 | R3 |
| 21 | Quota Exhaustion Guard | Disabled Enhance button when monthly quota is exhausted + cycle reset date countdown banner | M4 | R3 |
| 22 | Gallery Project Filter & Bulk Actions | /app/gallery photo grid, project filtering, bulk download/delete | M4 | R3 |
| 23 | Projects CRUD | /app/projects create, read, update, delete projects | M4 | R3 |
| 24 | Settings Profile & Password | /app/settings update profile info and change password | M4 | R3 |
| 25 | Client-Side Masked API Keys | Personal API keys masked as "sk-...ab12" on client | M4 | R3 |
| 26 | Onboarding Tutorial | Interactive tour component guiding new users through workflow | M4 | R3 |
| 27 | Admin Dashboard Embed | /admin embeds UserDashboardContent for administrative testing | M5 | R4 |
| 28 | Admin User Management | List all users with sisa kuota, cycle reset date, status | M5 | R4 |
| 29 | Admin User Actions | Approve, Reject, Reset Password, Delete, Resend WhatsApp Credentials | M5 | R4 |
| 30 | Admin Action Audit Logging | Every admin action triggers `log_admin_action` to `admin_audit_logs` | M5 | R4 |
| 31 | API Provider Switch | Admin toggles active AI provider (lovable, openai, gemini, replicate) | M5 | R4 |
| 32 | System API Keys Status | Admin views status/health of system API keys | M5 | R4 |
| 33 | API Usage Logs Table | Admin views timestamped API usage and token logs | M5 | R4 |
| 34 | Admin Notifications List | Alerts table with severity (info, warning, critical) | M5 | R4 |
| 35 | Audit Logs Viewer & Filter | Admin audit log table with action type filtering | M5 | R4 |
| 36 | Settings CMS | Manage pricing, testimonials, FAQs, and branding settings | M5 | R4 |
| 37 | Database Enums | `app_role`, `admin_action_type`, `notification_severity`, `image_status`, `entitlement_status`, `provision_status` | M1 | R5 |
| 38 | Database Tables (15 Tables) | profiles, user_roles, entitlements, projects, images, user_api_keys, api_provider_settings, api_usage_logs, admin_settings, admin_notifications, pricing_settings, testimonials, faqs, provision_logs, admin_audit_logs | M1 | R5 |
| 39 | Row Level Security (RLS) | Strict zero-trust policies across all 15 tables | M1 | R5 |
| 40 | Storage Bucket `images` | Private bucket with user upload/view RLS policies | M1 | R5 |
| 41 | Function `has_role` | SECURITY DEFINER function to verify user role without recursion | M1 | R5 |
| 42 | Function `check_and_consume_quota`| SECURITY DEFINER function with row locking and 30-day cycle rollover | M1 | R5 |
| 43 | Function `log_admin_action` | SECURITY DEFINER function to append tamper-evident audit logs | M1 | R5 |
| 44 | Function `handle_new_user` | Trigger function initializing user profile on auth signup | M1 | R5 |
| 45 | Edge Function `enhance-image` | Serverless handler with quota check, AI provider dispatch, storage upload, status transitions | M1 | R5 |
| 46 | Edge Function `provision` | HMAC-SHA256 webhook, duplicate check (`rejected_duplicate`), user creation, entitlement setup, WAHA notification | M1 | R5 |
| 47 | Edge Function `admin-users` | Admin user actions with audit logging and setup secret | M1 | R5 |
| 48 | E2E Testing Suite (Tiers 1-4) | Opaque-box automated test suite validating all acceptance criteria | M6 | AC 1-14 |
| 49 | Adversarial Testing Hardening (Tier 5)| White-box edge-case stress testing and coverage hardening | M6 | AC 1-14 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Database Schema, Storage & Edge Functions | 15 PostgreSQL tables, RLS policies, 5 functions/triggers, private storage bucket, and 3 Edge Functions (`enhance-image`, `provision`, `admin-users`) | none | DONE |
| 2 | Auth & Entitlement Access Control (R1) | Paid-only login, `/login`, `/forgot-password`, `/reset-password`, `ProtectedRoute`, `useAuth`, role & PEA entitlement checks, toast notifications | M1 | DONE |
| 3 | Landing Page & Marketing Navigation (R2) | Public `/` page, dark glassmorphism styling, Space Grotesk + DM Sans typography, Hero before/after slider, 6 features, pricing, testimonials, FAQ, footer | none | DONE |
| 4 | User Dashboard & Enhancement Studio with Realtime (R3) | `/app/*` routes, stats, upload validation, presets, Supabase Realtime subscriptions, before/after slider, zoom viewer, download, quota exhaustion guard, gallery, projects, settings | M1, M2 | DONE |
| 5 | Admin Panel & Audit Logging (R4) | `/admin/*` routes, UserDashboardContent embed, user management, audit logging, provider switch, system keys, usage logs, notifications, settings CMS | M1, M2 | DONE |
| 6 | Final E2E Test Pass & Adversarial Hardening (Tiers 1-5) | 100% pass on E2E test suite (Tiers 1-4, 220 automated tests) + Tier 5 adversarial stress testing | M1, M2, M3, M4, M5, TEST_READY | DONE |

---

## Interface Contracts

### 1. Database Schema & RLS Contracts
- `profiles`: `id (uuid, PK, references auth.users)`, `full_name`, `avatar_url`, `phone_number`, `created_at`, `updated_at`.
- `user_roles`: `id (uuid, PK)`, `user_id (uuid, FK)`, `role (app_role: 'admin' | 'user')`.
- `entitlements`: `id (uuid, PK)`, `user_id (uuid, FK)`, `product_code ('PEA')`, `status ('active' | 'inactive' | 'expired')`, `monthly_quota (int, default 100)`, `used_quota (int, default 0)`, `cycle_reset_date (timestamptz)`, `created_at`, `updated_at`.
- `images`: `id (uuid, PK)`, `user_id (uuid, FK)`, `project_id (uuid, FK, nullable)`, `original_url (text)`, `enhanced_url (text, nullable)`, `preset (text)`, `status (image_status: 'queued' | 'processing' | 'done' | 'failed')`, `error_message (text, nullable)`, `created_at`, `updated_at`. Realtime publication enabled.
- `admin_audit_logs`: `id (uuid, PK)`, `admin_id (uuid, FK)`, `target_user_id (uuid, FK, nullable)`, `action (admin_action_type)`, `details (jsonb)`, `ip_address (text, nullable)`, `created_at`.

### 2. Edge Function REST Contracts
- `POST /functions/v1/enhance-image`
  - Headers: `Authorization: Bearer <jwt>`, `Content-Type: application/json`
  - Body: `{ image_id?: string, project_id?: string, original_image_base64?: string, preset: string }`
  - Response 200: `{ success: true, image_id: string, status: "processing" | "done", enhanced_url?: string }`
  - Response 402: `{ error: "QUOTA_EXHAUSTED", cycle_reset_date: string }`
- `POST /functions/v1/provision`
  - Headers: `X-Webhook-Signature: <hex_hmac_sha256>`, `Content-Type: application/json`
  - Body: `{ email: string, full_name: string, phone_number: string, product_code: "PEA", transaction_id: string }`
  - Response 200: `{ success: true, user_id: string, status: "provisioned", message: "Account created and WhatsApp credential sent." }`
  - Response 409: `{ error: "rejected_duplicate", message: "User email already registered." }`
  - Response 401: `{ error: "INVALID_SIGNATURE" }`
- `POST /functions/v1/admin-users`
  - Headers: `Authorization: Bearer <jwt>` or `X-Admin-Setup-Secret: <secret>`, `Content-Type: application/json`
  - Body: `{ action: "approve" | "reject" | "reset_password" | "delete" | "resend_credential" | "list", user_id?: string, new_password?: string }`
  - Response 200: `{ success: true, data: any }`
