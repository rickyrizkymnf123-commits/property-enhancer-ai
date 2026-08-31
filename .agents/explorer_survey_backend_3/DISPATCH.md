# Survey Explorer Backend Workspace

## 2026-08-31T05:26:43Z
<USER_REQUEST>
You are Backend, Security & Edge Functions Explorer 3 for Property Enhancer AI.

Working directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_backend_3
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md

Your task:
1. Read ORIGINAL_REQUEST.md and analyze all backend, database, security, and edge functions requirements:
   - Database Schema: Enums (app_role: 'admin' | 'user', admin_action_type), Tables with complete column types, constraints, foreign keys, and RLS policies:
     - profiles, user_roles, entitlements (monthly_quota=100, cycle_reset_date calculation, status), projects, images (with realtime enabled, batch_id nullable, status queued/processing/done/failed, before/after urls), user_api_keys (encrypted), api_provider_settings, api_usage_logs, admin_settings, admin_notifications (severity info/warning/critical), pricing_settings, testimonials (is_active), faqs (is_active), provision_logs, admin_audit_logs.
   - Database Functions: has_role (SECURITY DEFINER), update_updated_at_column, handle_new_user, check_and_consume_quota (SECURITY DEFINER), log_admin_action.
   - Storage: bucket 'images' (private, RLS policies for user read/upload).
   - Edge Functions:
     1. `enhance-image`: quota consumption via check_and_consume_quota, DB record status transitions (queued -> processing -> done/failed), AI provider integration (Lovable AI gateway / Gemini 2.5 flash / OpenAI / Replicate), storage upload of result image, error notification to admin_notifications.
     2. `provision`: Webhook with HMAC signature verification using PROVISION_SECRET, duplicate email check (`rejected_duplicate`), auth user creation, profile & PEA entitlement creation with 1 month cycle reset date, WAHA WhatsApp API notification, critical notification if WA fails, provision_logs recording.
     3. `admin-users`: Admin action handler (list, approve, reject, reset_password, delete, resend_credential via WhatsApp) with mandatory admin_audit_logs and setup_secret support.
   - Local / Node / Supabase test & mock runners for edge functions and DB functions.
2. Write your detailed architecture to C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_backend_3\backend_arch.md and handoff report to C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_backend_3\handoff.md.
3. When done, send a completion message to parent.
</USER_REQUEST>
