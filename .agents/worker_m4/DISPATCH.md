# Milestone 4 Worker Workspace

## 2026-08-31T12:50:03Z
You are Worker 4 for Milestone 4 (User Dashboard & AI Enhancement Studio with Realtime - R3) of Property Enhancer AI.

Working Directory: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m4
Original Request File: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\ORIGINAL_REQUEST.md
Project Plan & Layout: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\PROJECT.md
Frontend Architecture: C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\explorer_survey_frontend_2\frontend_arch.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task:
1. Implement the complete User Portal (/app/*) & AI Image Enhancement Workflow:
   - Layout & Shared: src/components/shared/AppSidebar.tsx, src/components/shared/Header.tsx, src/components/shared/MaskedKeyDisplay.tsx, src/lib/maskUtils.ts.
   - Dashboard: src/components/dashboard/UserDashboardContent.tsx (Total Foto, Total Proyek, Diproses Hari Ini, Sisa Kuota Bulan Ini X/100 + cycle reset date countdown banner), src/components/dashboard/OnboardingTutorial.tsx, src/pages/app/DashboardPage.tsx.
   - Studio Editor (/app/editor):
     - src/components/studio/PhotoUploader.tsx: Drag & drop upload strictly validating JPG/PNG/WEBP and 15MB limit.
     - src/components/studio/PresetSelector.tsx: Presets (HDR Real Estate, Twilight Sky, Interior Brightening, Declutter).
     - src/components/studio/RealtimeStatusBadge.tsx: Status indicator for queued, processing, done, failed.
     - src/hooks/useRealtimeEnhancement.ts: Supabase Realtime subscription on images table for active user enhancements.
     - src/components/studio/ImageZoomViewer.tsx: High-res viewer with pan, zoom controls, fit-to-screen.
     - src/pages/app/EditorPage.tsx: Single upload + presets + Enhance button. DISABLED Enhance button when monthly quota is exhausted with warning banner and cycle reset date. Realtime live status updates. Result view with BeforeAfterSlider, ImageZoomViewer, and download button.
   - Gallery (/app/gallery): src/pages/app/GalleryPage.tsx with photo grid, project filter, search, preview modal, and bulk download/delete.
   - Projects (/app/projects): src/pages/app/ProjectsPage.tsx with projects CRUD.
   - Settings (/app/settings): src/pages/app/SettingsPage.tsx with profile edit, password change, personal API keys masked as "sk-...ab12" with reveal/copy.
   - Wire all routes in src/routes/AppRoutes.tsx under /app/* protected by ProtectedRoute.
2. Implement unit tests in tests/unit/studio.test.tsx testing:
   - Single photo upload validation (accepts JPG/PNG/WEBP, rejects invalid formats/oversize).
   - Quota exhaustion disables Enhance button and shows cycle reset date.
   - Realtime status update reflects state changes (queued -> processing -> done/failed).
   - ImageZoomViewer & BeforeAfterSlider integration.
   - API key masking format (sk-...ab12).
3. Run npm test or npx vitest run tests/unit/studio.test.tsx and ensure all tests pass.
4. Write your handoff report to C:\Users\UC\.gemini\antigravity\scratch\property-enhancer-ai\.agents\worker_m4\handoff.md.
5. Send completion message to parent.
