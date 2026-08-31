# Frontend Architecture & Technical Implementation Specification
**Property Enhancer AI (PEA)**
**Document Version:** 1.0.0
**Author:** Frontend Architecture Explorer 2
**Date:** 2026-08-31

---

## 1. System Overview & Technology Stack

### 1.1 Core Technologies
- **Runtime / Framework:** React 18.3+ with TypeScript 5.5+
- **Build Tool:** Vite 5.4+ with `@vitejs/plugin-react`, path aliasing (`@/*` -> `src/*`)
- **Styling:** Tailwind CSS 3.4+ with `@tailwindcss/forms`, `@tailwindcss/typography`, custom Tailwind plugin for neon glow and dark glassmorphism effects.
- **Iconography:** `lucide-react` (clean, tree-shakeable SVG icons)
- **UI Primitives:** Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-toast`, `@radix-ui/react-slider`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-accordion`, `@radix-ui/react-select`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-popover`)
- **Animations:** Framer Motion / Tailwind CSS Keyframes for smooth realtime state transitions
- **Backend / Realtime Client:** `@supabase/supabase-js` v2.45+ with built-in WebSocket Realtime channels and custom mock/fallback client for standalone testing
- **Testing Framework:** Vitest 2.0+, `@testing-library/react` 16+, `@testing-library/user-event` 14+, `jsdom` 24+

---

## 2. Design System: Dark Glassmorphism & Neon Palette

### 2.1 Theme Tokens & Visual Aesthetics
The application features a sleek, high-conversion dark theme with glassmorphism overlays and vibrant neon purple/cyan accents.

```css
/* Color System Tokens */
:root {
  --bg-primary: #090d16;        /* Deep void navy/slate */
  --bg-secondary: #0f172a;      /* Slate dark background */
  --bg-surface: #1e293b;        /* Card surface */
  --bg-glass: rgba(15, 23, 42, 0.75); /* Glassmorphism background */
  --border-glass: rgba(255, 255, 255, 0.1);
  --border-glass-focus: rgba(168, 85, 247, 0.4);

  /* Brand Accents */
  --neon-purple: #a855f7;       /* Violet / Purple 500 */
  --neon-purple-glow: rgba(168, 85, 247, 0.35);
  --neon-blue: #3b82f6;         /* Blue 500 */
  --neon-cyan: #06b6d4;         /* Cyan 500 */
  --neon-gradient: linear-gradient(135deg, #a855f7 0%, #3b82f6 50%, #06b6d4 100%);

  /* Status Colors */
  --status-queued: #f59e0b;     /* Amber 500 */
  --status-processing: #3b82f6; /* Blue 500 */
  --status-done: #10b981;       /* Emerald 500 */
  --status-failed: #ef4444;     /* Red 500 */

  /* Typography */
  --font-heading: 'Space Grotesk', -apple-system, sans-serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
}
```

### 2.2 Glassmorphism Utility Classes
```css
/* Glass Card Utilities */
.glass-panel {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card-hover:hover {
  border-color: rgba(168, 85, 247, 0.4);
  box-shadow: 0 0 25px rgba(168, 85, 247, 0.2);
  transform: translateY(-2px);
}

.neon-btn-primary {
  background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%);
  box-shadow: 0 0 20px rgba(147, 51, 234, 0.4);
  transition: all 0.25s ease;
}
.neon-btn-primary:hover:not(:disabled) {
  box-shadow: 0 0 30px rgba(147, 51, 234, 0.7);
  transform: scale(1.02);
}
.neon-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
```

---

## 3. Directory Layout & Module Organization

```
property-enhancer-ai/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.ts
├── public/
│   ├── favicon.svg
│   └── placeholders/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── assets/
    ├── components/
    │   ├── admin/
    │   │   ├── AdminHeader.tsx
    │   │   ├── AdminSidebar.tsx
    │   │   ├── AdminAuditLogTable.tsx
    │   │   ├── AdminNotificationList.tsx
    │   │   ├── AdminProviderSwitch.tsx
    │   │   ├── AdminSystemKeys.tsx
    │   │   ├── AdminUsageLogsTable.tsx
    │   │   ├── AdminUserTable.tsx
    │   │   ├── AdminUserActionModal.tsx
    │   │   └── SettingsCMSForm.tsx
    │   ├── common/
    │   │   ├── AppHeader.tsx
    │   │   ├── AppSidebar.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── MaskedKeyDisplay.tsx
    │   │   ├── Navbar.tsx
    │   │   ├── Footer.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── PageHeader.tsx
    │   │   ├── QuotaBadge.tsx
    │   │   └── Toast.tsx
    │   ├── editor/
    │   │   ├── BeforeAfterSlider.tsx
    │   │   ├── ImageDropzone.tsx
    │   │   ├── ImageZoomViewer.tsx
    │   │   ├── PresetSelector.tsx
    │   │   ├── ProjectSelector.tsx
    │   │   ├── QuotaBanner.tsx
    │   │   └── RealtimeEnhanceStatus.tsx
    │   ├── landing/
    │   │   ├── HeroSection.tsx
    │   │   ├── SocialProof.tsx
    │   │   ├── FeaturesSection.tsx
    │   │   ├── HowItWorksSection.tsx
    │   │   ├── ExamplesGallery.tsx
    │   │   ├── PricingSection.tsx
    │   │   ├── TestimonialsSection.tsx
    │   │   ├── FaqAccordion.tsx
    │   │   └── CTASection.tsx
    │   ├── onboarding/
    │   │   ├── OnboardingTutorial.tsx
    │   │   └── TutorialStep.tsx
    │   └── ui/                       # Radix UI primitives & styled components
    │       ├── accordion.tsx
    │       ├── alert-dialog.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── dropdown-menu.tsx
    │       ├── input.tsx
    │       ├── progress.tsx
    │       ├── select.tsx
    │       ├── slider.tsx
    │       ├── table.tsx
    │       ├── tabs.tsx
    │       ├── toast.tsx
    │       └── tooltip.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   ├── QuotaContext.tsx
    │   └── ToastContext.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useEnhanceImage.ts
    │   ├── useGallery.ts
    │   ├── useMaskedKey.ts
    │   ├── useOnboarding.ts
    │   ├── useProjects.ts
    │   ├── useQuota.ts
    │   ├── useRealtimeImages.ts
    │   └── useToast.ts
    ├── lib/
    │   ├── api.ts
    │   ├── constants.ts
    │   ├── formatters.ts
    │   ├── mockSupabase.ts
    │   ├── supabase.ts
    │   ├── utils.ts
    │   └── validation.ts
    ├── pages/
    │   ├── LandingPage.tsx
    │   ├── LoginPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── ResetPasswordPage.tsx
    │   ├── NotFoundPage.tsx
    │   ├── app/
    │   │   ├── AppDashboardPage.tsx
    │   │   ├── EditorPage.tsx
    │   │   ├── GalleryPage.tsx
    │   │   ├── ProjectsPage.tsx
    │   │   └── SettingsPage.tsx
    │   └── admin/
    │       ├── AdminDashboardPage.tsx
    │       ├── AdminUsersPage.tsx
    │       ├── AdminProvidersPage.tsx
    │       ├── AdminKeysPage.tsx
    │       ├── AdminUsagePage.tsx
    │       ├── AdminNotificationsPage.tsx
    │       ├── AdminAuditLogsPage.tsx
    │       └── AdminSettingsPage.tsx
    ├── routes/
    │   ├── AppRoutes.tsx
    │   └── ProtectedRoute.tsx
    ├── styles/
    │   ├── globals.css
    │   └── animations.css
    ├── test/
    │   ├── setup.ts
    │   ├── mocks/
    │   │   ├── handlers.ts
    │   │   └── testData.ts
    │   └── utils.tsx
    └── types/
        ├── admin.types.ts
        ├── auth.types.ts
        ├── database.types.ts
        ├── editor.types.ts
        └── project.types.ts
```

---

## 4. Complete Routing Architecture & Access Control

### 4.1 Route Map (17 Routes)

| Route Path | Access Level | Component | Description & Access Guards |
|---|---|---|---|
| `/` | Public | `LandingPage` | Marketing landing page; logged-in users redirected to `/admin` (if admin) or `/app` (if active PEA). |
| `/login` | Public (Strict) | `LoginPage` | Auth login form (no self-registration); checks role & PEA entitlement. |
| `/forgot-password` | Public | `ForgotPasswordPage` | Sends password reset email link via Supabase Auth. |
| `/reset-password` | Public / Token | `ResetPasswordPage` | Accepts new password from recovery link. |
| `/app` | Protected (PEA) | `AppDashboardPage` | User dashboard metrics (Total photos, projects, today's count, monthly quota X/100 & reset date). |
| `/app/editor` | Protected (PEA) | `EditorPage` | Single photo upload + preset selector + Realtime enhancement + BeforeAfterSlider + Zoom. |
| `/app/gallery` | Protected (PEA) | `GalleryPage` | Photo gallery grid, filtering by project, bulk download, bulk delete. |
| `/app/projects` | Protected (PEA) | `ProjectsPage` | Project CRUD management. |
| `/app/settings` | Protected (PEA) | `SettingsPage` | User profile, password update, personal API keys (masked view). |
| `/admin` | Protected (Admin) | `AdminDashboardPage` | Overview KPI dashboard + embedded `UserDashboardContent` for live testing. |
| `/admin/users` | Protected (Admin) | `AdminUsersPage` | User list, quota cycle info, actions (Approve, Reject, Reset Pass, Delete, Resend Credential). |
| `/admin/providers` | Protected (Admin) | `AdminProvidersPage` | AI Provider Switch (lovable/openai/gemini/replicate) + status monitor. |
| `/admin/keys` | Protected (Admin) | `AdminKeysPage` | System API Keys status monitor (masked view). |
| `/admin/usage` | Protected (Admin) | `AdminUsagePage` | API usage logs table with token/cost and latency breakdown. |
| `/admin/notifications`| Protected (Admin) | `AdminNotificationsPage` | Notifications center (`info`, `warning`, `critical`). |
| `/admin/audit-logs` | Protected (Admin) | `AdminAuditLogsPage` | Audit logs of all admin actions with filters. |
| `/admin/settings` | Protected (Admin) | `AdminSettingsPage` | Settings CMS (pricing package, testimonials, FAQs, branding). |
| `*` | Public | `NotFoundPage` | 404 fallback page. |

### 4.2 ProtectedRoute & Authorization Logic
The `ProtectedRoute` wrapper enforces multi-tiered security rules:

```typescript
// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin';
  requireEntitlement?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireEntitlement = true,
}) => {
  const { user, profile, roles, entitlement, isLoading, isAdmin, isEntitled } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" text="Memverifikasi akses..." />
      </div>
    );
  }

  // 1. Unauthenticated check
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Admin role requirement
  if (requiredRole === 'admin') {
    if (!isAdmin) {
      // User is logged in but not an admin -> redirect to /app if entitled, else /login
      return <Navigate to={isEntitled ? "/app" : "/login"} replace />;
    }
    return <>{children}</>;
  }

  // 3. User app requirement (PEA Entitlement)
  if (requireEntitlement) {
    // Admin always has access to /app for testing/verification
    if (isAdmin) {
      return <>{children}</>;
    }

    if (!isEntitled) {
      // User does not have active PEA entitlement
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};
```

---

## 5. State Management & Auth Lifecycle

### 5.1 Auth State Model (`AuthContext.tsx`)
The `AuthContext` manages the global session, profile details, user roles, and active product entitlement (`PEA`).

```typescript
export interface Entitlement {
  id: string;
  user_id: string;
  product_code: 'PEA';
  status: 'active' | 'inactive' | 'expired' | 'suspended';
  monthly_quota: number;       // default: 100
  quota_used: number;          // monthly consumed count
  reset_at: string;            // ISO timestamp for next monthly cycle
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  entitlement: Entitlement | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEntitled: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updateUserPassword: (password: string) => Promise<{ error: Error | null }>;
  refreshEntitlement: () => Promise<void>;
}
```

### 5.2 Paid-Only Access Enforcement on Login
When a user attempts authentication on `/login`:
1. Submit `email` and `password` to `supabase.auth.signInWithPassword`.
2. On success, concurrently query `user_roles` and `entitlements` where `product_code = 'PEA'`.
3. **If role includes `admin`:** Grant access and redirect to `/admin`.
4. **If non-admin:**
   - Verify `entitlement` exists and `entitlement.status === 'active'`.
   - If invalid/inactive/expired:
     - Immediately invoke `supabase.auth.signOut()`.
     - Emit warning toast: **`"Akses belum aktif"`** with description: *"Akun Anda belum memiliki akses aktif Property Enhancer AI. Silakan hubungi admin via WhatsApp."*
     - Keep user on `/login`.
   - If active:
     - Grant access and navigate to `/app`.

```typescript
// Login handler flow
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { error: signInErr } = await signIn(email, password);
    if (signInErr) {
      toast.error('Gagal Masuk', { description: signInErr.message });
      return;
    }

    // Refresh state
    const { isAdmin, isEntitled } = await fetchUserAccess();

    if (isAdmin) {
      toast.success('Selamat Datang Admin', { description: 'Mengarahkan ke Admin Panel...' });
      navigate('/admin', { replace: true });
    } else if (isEntitled) {
      toast.success('Akses Berhasil', { description: 'Selamat datang di Property Enhancer AI' });
      navigate('/app', { replace: true });
    } else {
      await signOut();
      toast.error('Akses belum aktif', {
        description: 'Akun Anda belum memiliki lisensi PEA aktif. Hubungi admin untuk aktivasi.',
      });
    }
  } finally {
    setLoading(false);
  }
};
```

---

## 6. Realtime Enhancement Workflow & Editor Engine

### 6.1 Database Schema Reflection & Status Transitions
The `images` table lifecycle follows a strict state progression:
- `queued`: Enhancement job submitted to Edge Function.
- `processing`: AI Provider is actively rendering/enhancing the photo.
- `done`: Enhanced image generated, stored in Supabase Storage, and URL saved.
- `failed`: Provider error or quota failure with detailed error message.

```typescript
export type EnhancementStatus = 'queued' | 'processing' | 'done' | 'failed';

export interface ImageRecord {
  id: string;
  user_id: string;
  project_id: string | null;
  batch_id: string | null;
  original_url: string;
  enhanced_url: string | null;
  preset: 'hdr_interior' | 'blue_sky' | 'twilight_exterior' | 'declutter' | 'virtual_staging_light';
  status: EnhancementStatus;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}
```

### 6.2 Supabase Realtime Subscription Hook (`useRealtimeImages.ts`)
```typescript
export function useRealtimeImages(initialImages: ImageRecord[] = []) {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageRecord[]>(initialImages);

  useEffect(() => {
    if (!user) return;

    // Create unique channel for user images
    const channel = supabase
      .channel(`user-images-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'images',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setImages((prev) => [payload.new as ImageRecord, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setImages((prev) =>
              prev.map((img) => (img.id === payload.new.id ? (payload.new as ImageRecord) : img))
            );
          } else if (payload.eventType === 'DELETE') {
            setImages((prev) => prev.filter((img) => img.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { images, setImages };
}
```

### 6.3 Quota Management & Guard
- Standard quota: **100 photos per month**.
- Sisa Kuota calculation: `remaining = Math.max(0, entitlement.monthly_quota - entitlement.quota_used)`.
- When `remaining === 0`:
  - Enhance button is disabled with tooltip: `"Kuota bulan ini telah habis (100/100). Reset pada [Reset Date]"`.
  - Quota banner displays urgent warning + countdown to cycle reset date.

---

## 7. Interactive UX Component Specifications

### 7.1 BeforeAfterSlider Component
An interactive, high-performance slider that compares the original property photo with the AI-enhanced photo.

#### Features & Behavior:
- Supports mouse drag, touch drag, and keyboard navigation (Arrow Left / Arrow Right).
- Neon glow divider bar with `<MoveHorizontal />` icon thumb.
- Responsive container maintaining image aspect ratio (`aspect-[4/3]` or `aspect-[16/9]`).
- Visual badges: "Sebelum" (Original) on top-left, "Sesudah (AI)" on top-right.
- Performance: Uses CSS `clip-path: inset(0 0 0 calc(100% - var(--position)))` or absolute width layering for 60fps rendering without re-rendering canvases.

```typescript
// Component Interface
export interface BeforeAfterSliderProps {
  originalUrl: string;
  enhancedUrl: string;
  originalAlt?: string;
  enhancedAlt?: string;
  initialPosition?: number; // 0 to 100, default: 50
  className?: string;
  onPositionChange?: (pos: number) => void;
}
```

### 7.2 ImageZoomViewer Component
A full-featured zoom and pan inspection modal/canvas for high-resolution property photos.

#### Controls & Shortcuts:
- **Zoom In / Out:** Buttons (`+` / `-`), mouse wheel scroll over canvas with focal zoom centering.
- **Pan:** Click and drag with mouse or multi-touch dragging.
- **Reset:** `1:1` scale and center position.
- **Fit to Screen:** Dynamically fits the entire photo inside the viewport.
- **Fullscreen:** Native fullscreen API integration.
- **Download:** High-resolution direct asset download button.

```typescript
export interface ImageZoomViewerProps {
  imageUrl: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onDownload?: () => void;
}
```

### 7.3 OnboardingTutorial Component
An interactive guided tour for new users navigating `/app/editor`:
- **Step 1:** "Unggah Foto Properti" (Highlight Dropzone: JPG/PNG/WEBP up to 10MB).
- **Step 2:** "Pilih Preset AI" (Highlight preset options: HDR Interior, Sky Replacement, Twilight, etc.).
- **Step 3:** "Proses Real-time" (Highlight status indicator and monthly quota counter).
- **Step 4:** "Bandingkan & Unduh" (Highlight Before/After slider and Zoom viewer).
- Stored state in `localStorage` (`pea_onboarding_completed: true`).

### 7.4 API Key Masking Engine (`useMaskedKey` / `MaskedKeyDisplay`)
To protect sensitive credentials (OpenAI, Gemini, Replicate, WAHA) on the client side:
- Standard format: `sk-...ab12` (prefix `sk-...` followed by last 4 characters).
- If key is short (< 8 chars): `***...12`.
- `MaskedKeyDisplay` component includes:
  - Masked text container with monospace typography.
  - "Salin" (Copy to clipboard) button with checkmark animation.
  - "Lihat" (Reveal) toggle button with 5-second automatic re-mask timer for security.

```typescript
// Utility function: src/lib/formatters.ts
export function maskApiKey(key: string | null | undefined): string {
  if (!key) return '—';
  if (key.length <= 8) return '****' + key.slice(-2);
  const prefix = key.startsWith('sk-') ? 'sk-...' : key.slice(0, 3) + '...';
  const suffix = key.slice(-4);
  return `${prefix}${suffix}`;
}
```

---

## 8. Admin Governance & Management Panel

### 8.1 Admin Pages & Capabilities

```
/admin
├── Dashboard (/admin)
│   ├── KPI Cards (Total Users, Active Subscriptions, Photos Today, Active Provider)
│   └── Embedded UserDashboardContent (for direct admin testing and quality check)
├── User Management (/admin/users)
│   ├── Table columns: User, Email, Phone/WA, Status, Kuota (X/100), Cycle Reset Date, Actions
│   └── Actions: [Approve], [Reject], [Reset Password], [Delete], [Resend Credential via WA]
│       ↳ All actions route to Edge Function `admin-users` with mandatory audit logging.
├── Provider Switch (/admin/providers)
│   ├── Active AI Provider selector: [Lovable Gateway (Default)] | [OpenAI] | [Gemini Direct] | [Replicate]
│   └── Model configurations and health status indicators
├── System API Keys (/admin/keys)
│   └── Masked key statuses and expiration monitors for all backend credentials
├── Usage Logs (/admin/usage)
│   └── Real-time log table: Timestamp, User Email, Provider, Model, Latency (ms), Tokens/Cost, Status
├── Notifications (/admin/notifications)
│   └── Filterable alert center by severity: [Info], [Warning], [Critical] (e.g. WA gateway delivery failures)
├── Audit Logs (/admin/audit-logs)
│   └── Complete audit trail of all administrative actions with old/new state diffs
└── Settings CMS (/admin/settings)
    ├── Pricing package editor (Price, Quota limit, feature list)
    ├── Testimonials manager (Add, Edit, Delete, Toggle is_active)
    ├── FAQ manager (Add, Edit, Reorder, Toggle is_active)
    └── Branding & WhatsApp support link config
```

---

## 9. Mocking & Test Infrastructure

### 9.1 Supabase Client Mock Layer (`src/lib/mockSupabase.ts`)
A mock Supabase client is provided to support 100% standalone testing and deterministic Vitest unit tests without requiring active network connectivity.

```typescript
export function createMockSupabaseClient(initialState: {
  user?: User | null;
  profile?: Profile | null;
  roles?: string[];
  entitlement?: Entitlement | null;
  images?: ImageRecord[];
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: initialState.user || null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: initialState.user ? { user: initialState.user } : null }, error: null }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: initialState.user }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.storage/test.jpg' } }),
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),
  };
}
```

### 9.2 Test Suite Matrix

| Test Suite | File Path | Scope & Assertions |
|---|---|---|
| **Auth & Routing** | `test/auth.test.tsx` | - Unauthenticated redirects to `/login`<br>- Valid PEA user redirects to `/app`<br>- Admin user redirects to `/admin`<br>- Inactive entitlement triggers toast `"Akses belum aktif"` and signs out |
| **Protected Route**| `test/protected-route.test.tsx` | - Role hierarchy checks<br>- Fallback loading skeleton<br>- Preserves redirect location |
| **BeforeAfterSlider** | `test/before-after-slider.test.tsx` | - Pointer drag updates slider position<br>- Arrow keys adjust position<br>- Touch events drag properly<br>- Renders both images |
| **ImageZoomViewer** | `test/image-zoom-viewer.test.tsx` | - Zoom in / Zoom out changes scale<br>- Reset restores 1:1 ratio<br>- Wheel scroll zooms centered<br>- Download button triggers file save |
| **Editor & Realtime** | `test/editor.test.tsx` | - Image format validation (JPG/PNG/WEBP)<br>- Rejects files > 10MB<br>- Quota countdown rendering<br>- Disabled button when quota exhausted<br>- Realtime updates (queued -> processing -> done) |
| **Masking Utility** | `test/masking.test.ts` | - Formats `sk-proj-12345678` to `sk-...5678`<br>- Masks short keys safely<br>- Handles null/empty inputs |
| **Admin Governance** | `test/admin.test.tsx` | - Admin user action dispatch<br>- Provider switch updates state<br>- Audit log list rendering |

---

## 10. Frontend Implementation Roadmap (Milestones)

1. **Milestone 2 (Auth & Entitlement Control):**
   - Implement `AuthContext`, `useAuth`, `ProtectedRoute`.
   - Build `/login`, `/forgot-password`, `/reset-password`.
   - Hook up toast alerts ("Akses belum aktif") and role-based redirects.

2. **Milestone 3 (Landing Page & Design Tokens):**
   - Implement dark glassmorphism theme tokens and Tailwind config.
   - Build `Navbar`, `HeroSection` (with interactive Before/After preview), `Features`, `HowItWorks`, `Pricing`, `Testimonials`, `FAQ`, and `Footer`.

3. **Milestone 4 (User Dashboard & AI Studio):**
   - Build `/app` dashboard stats and quota cycle countdown.
   - Build `/app/editor` with `ImageDropzone`, `PresetSelector`, `BeforeAfterSlider`, `ImageZoomViewer`, and `RealtimeEnhanceStatus`.
   - Build `/app/gallery` with filtering and bulk actions, `/app/projects`, and `/app/settings` with masked API keys.
   - Integrate `OnboardingTutorial`.

4. **Milestone 5 (Admin Management Panel):**
   - Build `/admin` dashboard (embedding `UserDashboardContent`).
   - Build `/admin/users` (with Approve, Reject, Reset Pass, Delete, Resend WA actions).
   - Build `/admin/providers`, `/admin/keys`, `/admin/usage`, `/admin/notifications`, `/admin/audit-logs`, and `/admin/settings` CMS.

5. **Milestone 6 (E2E Verification & Hardening):**
   - Execute all Vitest component and route suites.
   - Verify 100% test pass rate and responsive UX.
