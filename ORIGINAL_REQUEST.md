# Original User Request

## Initial Request — 2026-08-31T12:25:23+07:00

Property Enhancer AI — Full Application Build

Working directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai
Integrity mode: development

## Requirements

### R1. Authentication & Entitlement Access Control
System must enforce paid-only access where public self-registration is disabled. Login route (/login) must authenticate existing users, check user_roles (admin -> /admin), and check entitlements (product_code='PEA', status='active' -> /app). Users without active entitlements must be denied access with toast "Akses belum aktif" and signed out. Route /forgot-password and /reset-password handle password recovery. ProtectedRoute component and useAuth hook manage state and redirect unauthenticated/unentitled users.

### R2. Landing Page & Marketing Navigation
Public landing page at route / for non-logged-in users. Includes Navbar, HeroSection (with interactive before/after slider), SocialProof, Features (6 features, Batch marked "Segera Hadir"), HowItWorks (3 steps), Examples gallery, Pricing (1 lifetime package with monthly quota 100 photos/month), Testimonials (is_active=true), FAQ accordion (is_active=true), and Footer (placeholder legal links). Styled with dark mode, glassmorphism, neon purple/blue gradient, Space Grotesk + DM Sans fonts. Smart redirect for logged-in users.

### R3. User Dashboard (/app/*) & AI Image Enhancement Workflow
User portal with AppSidebar, header, and pages:
- /app: Dashboard stats (Total Foto, Total Proyek, Diproses Hari Ini, Sisa Kuota Bulan Ini X/100 + cycle reset date).
- /app/editor: Single photo upload (JPG/PNG/WEBP validation) + preset selector + Enhance button. Live real-time status updates via Supabase Realtime subscription on `images` table (queued -> processing -> done/failed). Result view with before/after slider, zoom viewer, download. Disabled enhance button when monthly quota is exhausted.
- /app/gallery: Grid of user photos, project filter, bulk download/delete.
- /app/projects: Projects CRUD for grouping photos.
- /app/settings: Profile edit, password change, personal API keys management (masked display, e.g. "sk-...ab12").
Reusable components: UserDashboardContent, BeforeAfterSlider, ImageZoomViewer, OnboardingTutorial.

### R4. Admin Management Panel (/admin)
Admin panel accessible strictly to `admin` role users:
1. Dashboard (embeds UserDashboardContent for admin testing).
2. User Management: List all users with sisa kuota & cycle info. Actions: Approve, Reject, Reset Password, Delete, Resend Credential via WhatsApp. All actions MUST be logged to admin_audit_logs.
3. API Provider Switch (lovable/openai/gemini/replicate).
4. System API Keys status view.
5. API Usage Logs table.
6. Notifications (admin_notifications with severity info/warning/critical).
7. Audit Log (admin_audit_logs view and filter).
8. Settings CMS (pricing, testimonials, faqs, branding).

### R5. Database Schema & Supabase Edge Functions
Database Enum (`app_role`, `admin_action_type`), Tables with RLS (`profiles`, `user_roles`, `entitlements` with monthly_quota=100 & cycle reset calculation, `projects`, `images` with realtime & batch_id nullable, `user_api_keys` encrypted, `api_provider_settings`, `api_usage_logs`, `admin_settings`, `admin_notifications`, `pricing_settings`, `testimonials`, `faqs`, `provision_logs`, `admin_audit_logs`).
Functions: `has_role` (SECURITY DEFINER), `update_updated_at_column`, `handle_new_user`, `check_and_consume_quota` (SECURITY DEFINER), `log_admin_action`. Storage bucket `images` (private).
Edge Functions:
1. `enhance-image`: Calls `check_and_consume_quota`, inserts `images` row (queued), updates status (processing), calls AI provider (default Lovable AI Gateway google/gemini-2.5-flash-image), uploads enhanced image to storage, updates `images` row status (done/failed). Emits critical notification on provider errors.
2. `provision`: Webhook with HMAC signature verification using PROVISION_SECRET. Rejects existing registered emails with `rejected_duplicate`. Generates random password, creates auth user, creates profile & entitlement, sends WhatsApp notification via WAHA API, creates critical notification if WA fails.
3. `admin-users`: Administrative user actions (list, approve, reject, reset_password, delete, resend_credential) with mandatory audit logging to `admin_audit_logs` and setup_secret support.

## Acceptance Criteria

### Security & Access Control
- [ ] No public self-registration form on `/login`.
- [ ] `/login` checks roles and entitlements, redirecting admins to `/admin`, entitled users to `/app`, and unentitled users to `/login` with error message.
- [ ] Every `/app/*` route enforces active `PEA` entitlement.

### User Experience & Realtime AI Processing
- [ ] Single photo upload validates file formats (JPG/PNG/WEBP).
- [ ] Enhancement workflow checks monthly quota (100 photos) and displays cycle reset date if quota is exhausted.
- [ ] Enhancement processing updates status live using Supabase Realtime subscriptions on `images` table.
- [ ] Editor presents interactive before/after slider, zoom viewer, and download button.
- [ ] API keys in user settings are always masked on client side.

### Admin Governance & Audit Logging
- [ ] Admin panel is restricted to `admin` role users.
- [ ] Every administrative action (Approve, Reject, Reset Password, Delete, Resend Credential) writes an audit record to `admin_audit_logs`.
- [ ] Admin notification list displays critical alerts for WA provisioning failures or AI provider issues.

### Infrastructure & Provisioning Webhook
- [ ] Webhook `/provision` verifies HMAC signature with `PROVISION_SECRET`.
- [ ] Webhook rejects requests for already existing user emails with `rejected_duplicate`.
- [ ] Successful provisioning creates account, sets entitlement reset date to 1 month from activation, sends WhatsApp message via WAHA API, and logs transaction.
