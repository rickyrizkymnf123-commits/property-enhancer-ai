import type { AppRole, AdminActionType, NotificationSeverity, EntitlementStatus } from './database.types';

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  entitlement_status: EntitlementStatus | 'none';
  monthly_quota: number;
  consumed_quota: number;
  used_quota?: number;
  cycle_reset_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ApiProviderConfig {
  id: string;
  provider_name: 'lovable' | 'openai' | 'gemini' | 'replicate' | string;
  model_name: string;
  is_default: boolean;
  is_active: boolean;
  is_enabled?: boolean;
  config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SystemApiKeyInfo {
  id: string;
  name: string;
  provider: string;
  masked_key: string;
  is_configured: boolean;
  status: 'healthy' | 'warning' | 'error' | 'not_configured';
  last_checked_at: string;
  description: string;
  error_details?: string | null;
}

export interface AdminUsageLogItem {
  id: string;
  user_id: string | null;
  user_email?: string | null;
  image_id: string | null;
  provider: string;
  model: string;
  latency_ms: number;
  duration_ms?: number;
  tokens_used: number;
  cost_estimate_usd: number;
  status: 'success' | 'failed' | string;
  error_code?: string | null;
  error_details?: string | null;
  created_at: string;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action_type: AdminActionType;
  action?: AdminActionType;
  target_user_id: string | null;
  target_email?: string | null;
  target_resource?: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface PricingPackageItem {
  id: string;
  package_name: string;
  plan_name?: string;
  price_idr: number;
  original_price_idr: number | null;
  monthly_quota: number;
  features: string[];
  is_active: boolean;
  updated_at?: string;
}

export interface TestimonialItem {
  id: string;
  author_name: string;
  name?: string;
  author_role: string | null;
  role?: string;
  author_company: string | null;
  company?: string | null;
  author_avatar_url: string | null;
  avatar_url?: string | null;
  quote: string;
  content?: string;
  rating: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface BrandingSettings {
  app_name: string;
  tagline: string;
  support_whatsapp: string;
  support_email: string;
  maintenance_mode: boolean;
  announcement_banner: string | null;
}
