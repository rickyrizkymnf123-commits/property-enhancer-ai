# Milestone 2 Worker Workspace

## 2026-08-31T05:41:02Z
You are Worker 2 for Milestone 2 (Auth & Entitlement Access Control - R1) of Property Enhancer AI.

Working Directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m2
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md
Project Plan & Layout: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\PROJECT.md
Frontend Architecture: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_frontend_2\frontend_arch.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Implement the complete Authentication & Entitlement Access Control module:
   - `src/hooks/useAuth.ts` (or `src/contexts/AuthContext.tsx`): Manages user session, profiles, user_roles, active entitlements (`product_code='PEA'`), login, logout, password recovery.
   - `src/components/shared/ProtectedRoute.tsx`: Route guard enforcing authentication, role check (`allowedRoles`), and active `PEA` entitlement (`requireEntitlement`).
   - `src/pages/LoginPage.tsx`: Paid-only login form (STRICTLY NO public self-registration forms or signup links). On login:
     - Check `user_roles`: If role is `admin`, navigate to `/admin`.
     - Check `entitlements`: If user has `product_code='PEA'` with `status='active'`, navigate to `/app`.
     - If user has no active entitlement: call `supabase.auth.signOut()`, show error toast `"Akses belum aktif"`, stay on `/login`.
   - `src/pages/ForgotPasswordPage.tsx`: Password recovery email flow.
   - `src/pages/ResetPasswordPage.tsx`: Update password flow.
   - `src/components/auth/`: `LoginCard.tsx`, `ForgotPasswordCard.tsx`, `ResetPasswordCard.tsx`.
   - `src/components/ui/Toast.tsx` / `src/hooks/useToast.ts` (or toast system): Support toast notifications including `"Akses belum aktif"`.
   - Styling: Dark glassmorphism, neon purple/blue accents, Space Grotesk / DM Sans typography.
2. Implement unit tests in `tests/unit/auth.test.tsx` testing:
   - Login page has no registration link.
   - Admin login redirects to `/admin`.
   - Entitled user login redirects to `/app`.
   - Unentitled user login triggers toast `"Akses belum aktif"`, calls `signOut()`, redirects to `/login`.
   - ProtectedRoute blocks unauthenticated and unentitled users.
   - Password reset triggers recovery.
3. Run `npm test` or `npx vitest run tests/unit/auth.test.tsx` to verify all tests pass.
4. Write your handoff report to `C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m2\handoff.md`.
5. Send completion message to parent.
