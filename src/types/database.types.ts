export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'admin' | 'user';

export type AdminActionType =
  | 'approve_user'
  | 'reject_user'
  | 'reset_password'
  | 'delete_user'
  | 'resend_credential'
  | 'update_settings'
  | 'toggle_feature'
  | 'update_quota'
  | 'switch_provider'
  | 'adjust_quota'
  | 'system_bootstrap'
  | 'other';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export type ImageStatus = 'queued' | 'processing' | 'done' | 'failed';

export type EntitlementStatus = 'active' | 'inactive' | 'expired' | 'suspended';

export type ProvisionStatus = 'success' | 'rejected_duplicate' | 'failed' | 'failed_wa';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: AppRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: AppRole;
          created_at?: string;
        };
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          product_code: string;
          monthly_quota: number;
          used_quota: number;
          cycle_reset_date: string;
          status: EntitlementStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_code?: string;
          monthly_quota?: number;
          used_quota?: number;
          cycle_reset_date?: string;
          status?: EntitlementStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_code?: string;
          monthly_quota?: number;
          used_quota?: number;
          cycle_reset_date?: string;
          status?: EntitlementStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          address: string | null;
          cover_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      images: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          batch_id: string | null;
          original_url: string;
          enhanced_url: string | null;
          preset: string;
          status: ImageStatus;
          error_message: string | null;
          file_size: number | null;
          mime_type: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          batch_id?: string | null;
          original_url: string;
          enhanced_url?: string | null;
          preset?: string;
          status?: ImageStatus;
          error_message?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          batch_id?: string | null;
          original_url?: string;
          enhanced_url?: string | null;
          preset?: string;
          status?: ImageStatus;
          error_message?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_api_keys: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          key_name: string;
          encrypted_api_key: string;
          masked_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          key_name?: string;
          encrypted_api_key: string;
          masked_key: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          key_name?: string;
          encrypted_api_key?: string;
          masked_key?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_provider_settings: {
        Row: {
          id: string;
          provider_name: string;
          model_name: string;
          purpose?: string;
          base_url?: string;
          api_key_encrypted?: string;
          is_default: boolean;
          is_active: boolean;
          config: Json;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_name: string;
          model_name?: string;
          purpose?: string;
          base_url?: string;
          api_key_encrypted?: string;
          is_default?: boolean;
          is_active?: boolean;
          config?: Json;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_name?: string;
          model_name?: string;
          purpose?: string;
          base_url?: string;
          api_key_encrypted?: string;
          is_default?: boolean;
          is_active?: boolean;
          config?: Json;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_usage_logs: {
        Row: {
          id: string;
          user_id: string | null;
          image_id: string | null;
          provider: string;
          model: string;
          tokens_used: number;
          latency_ms: number;
          status: string;
          error_code: string | null;
          cost_estimate_usd: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          image_id?: string | null;
          provider: string;
          model: string;
          tokens_used?: number;
          latency_ms?: number;
          status: string;
          error_code?: string | null;
          cost_estimate_usd?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          image_id?: string | null;
          provider?: string;
          model?: string;
          tokens_used?: number;
          latency_ms?: number;
          status?: string;
          error_code?: string | null;
          cost_estimate_usd?: number;
          created_at?: string;
        };
      };
      admin_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Json;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setting_key: string;
          setting_value: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      admin_notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          severity: NotificationSeverity;
          is_read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          severity?: NotificationSeverity;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          severity?: NotificationSeverity;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
      };
      pricing_settings: {
        Row: {
          id: string;
          package_name: string;
          price_idr: number;
          original_price_idr: number | null;
          monthly_quota: number;
          is_active: boolean;
          features: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          package_name?: string;
          price_idr?: number;
          original_price_idr?: number | null;
          monthly_quota?: number;
          is_active?: boolean;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          package_name?: string;
          price_idr?: number;
          original_price_idr?: number | null;
          monthly_quota?: number;
          is_active?: boolean;
          features?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      testimonials: {
        Row: {
          id: string;
          author_name: string;
          author_role: string | null;
          author_company: string | null;
          author_avatar_url: string | null;
          quote: string;
          rating: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_name: string;
          author_role?: string | null;
          author_company?: string | null;
          author_avatar_url?: string | null;
          quote: string;
          rating?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_name?: string;
          author_role?: string | null;
          author_company?: string | null;
          author_avatar_url?: string | null;
          quote?: string;
          rating?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          category?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          category?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      provision_logs: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          full_name: string | null;
          order_id: string | null;
          amount: number | null;
          payload: Json | null;
          status: ProvisionStatus;
          error_message: string | null;
          whatsapp_sent: boolean;
          whatsapp_response: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          phone?: string | null;
          full_name?: string | null;
          order_id?: string | null;
          amount?: number | null;
          payload?: Json | null;
          status: ProvisionStatus;
          error_message?: string | null;
          whatsapp_sent?: boolean;
          whatsapp_response?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          full_name?: string | null;
          order_id?: string | null;
          amount?: number | null;
          payload?: Json | null;
          status?: ProvisionStatus;
          error_message?: string | null;
          whatsapp_sent?: boolean;
          whatsapp_response?: Json | null;
          created_at?: string;
        };
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          admin_email: string | null;
          action_type: AdminActionType;
          action?: string;
          target_user_id: string | null;
          target_resource: string | null;
          details: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          admin_email?: string | null;
          action_type: AdminActionType;
          action?: string;
          target_user_id?: string | null;
          target_resource?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          admin_email?: string | null;
          action_type?: AdminActionType;
          target_user_id?: string | null;
          target_resource?: string | null;
          details?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      has_role: {
        Args: {
          _user_id: string;
          _role: AppRole;
        };
        Returns: boolean;
      };
      check_and_consume_quota: {
        Args: {
          p_user_id: string;
          p_product_code?: string;
          p_amount?: number;
        };
        Returns: {
          allowed: boolean;
          cycle_reset?: boolean;
          monthly_quota?: number;
          used_quota?: number;
          remaining_quota?: number;
          cycle_reset_date?: string;
          reason?: string;
          message?: string;
        };
      };
      log_admin_action: {
        Args: {
          p_action_type: AdminActionType;
          p_target_user_id?: string | null;
          p_target_resource?: string | null;
          p_details?: Json;
          p_ip_address?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
    };
  };
}

export type ImageRecord = Database['public']['Tables']['images']['Row'];
export type ProfileRecord = Database['public']['Tables']['profiles']['Row'];
export type EntitlementRecord = Database['public']['Tables']['entitlements']['Row'];

