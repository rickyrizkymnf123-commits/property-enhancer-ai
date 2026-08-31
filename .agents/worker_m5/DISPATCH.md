## 2026-08-31T05:50:03Z

You are Worker 5 for Milestone 5 (Admin Management Panel & Audit Logging - R4) of Property Enhancer AI.

Working Directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m5
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md
Project Plan & Layout: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\PROJECT.md
Frontend Architecture: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_frontend_2\frontend_arch.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Implement the complete Admin Management Panel (`/admin/*`) & Audit Logging system:
   - Admin Layout: `src/components/admin/AdminLayout.tsx`, `src/components/admin/AdminSidebar.tsx`.
   - Admin Dashboard (`/admin`): `src/pages/admin/AdminDashboardPage.tsx` (embeds `UserDashboardContent` for administrative testing and live metric previews).
   - User Management (`/admin/users`): `src/pages/admin/AdminUsersPage.tsx`, `src/components/admin/AdminUserTable.tsx`. Lists all users with sisa kuota, cycle reset info, and status. Actions: Approve, Reject, Reset Password, Delete, Resend WhatsApp Credential. ALL actions MUST log to `admin_audit_logs` via `log_admin_action`.
   - API Provider Switch (`/admin/providers`): `src/pages/admin/AdminProvidersPage.tsx`, `src/components/admin/ApiProviderSwitch.tsx` (lovable, openai, gemini, replicate).
   - System API Keys (`/admin/keys`): `src/pages/admin/AdminKeysPage.tsx`, `src/components/admin/SystemApiKeysView.tsx` with masked keys (`sk-...ab12`) and health status.
   - API Usage Logs (`/admin/usage`): `src/pages/admin/AdminUsagePage.tsx`, `src/components/admin/ApiUsageLogsTable.tsx`.
   - Notifications (`/admin/notifications`): `src/pages/admin/AdminNotificationsPage.tsx`, `src/components/admin/AdminNotificationsList.tsx` (severity: info, warning, critical).
   - Audit Logs (`/admin/audit-logs`): `src/pages/admin/AdminAuditLogsPage.tsx`, `src/components/admin/AuditLogsTable.tsx` (viewer with action type filters).
   - Settings CMS (`/admin/settings`): `src/pages/admin/AdminSettingsPage.tsx`, `src/components/admin/SettingsCms.tsx` (pricing, testimonials, FAQs, branding).
   - Wire all routes in `src/routes/AppRoutes.tsx` under `/admin/*` protected by `ProtectedRoute` (`allowedRoles=['admin']`).
2. Implement unit tests in `tests/unit/admin_audit.test.ts` testing:
   - Admin panel strictly restricted to `admin` role.
   - All admin user actions (Approve, Reject, Reset Password, Delete, Resend WhatsApp) write audit log entries.
   - API provider switch updates active provider.
   - Admin notifications display critical alerts.
   - CMS updates pricing, testimonials, and FAQs.
3. Run `npm test` or `npx vitest run tests/unit/admin_audit.test.ts` and ensure all tests pass.
4. Write your handoff report to `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m5\handoff.md`.
5. Send completion message to parent.
