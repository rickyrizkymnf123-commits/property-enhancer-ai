import type { AppRole, EntitlementStatus } from './database.types';

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at?: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  user: User;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Entitlement {
  id: string;
  user_id: string;
  product_code: string;
  status: EntitlementStatus;
  monthly_quota: number;
  used_quota: number;
  cycle_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  entitlement: Entitlement | null;
  isLoading: boolean;
  isAdmin: boolean;
  isEntitled: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    isAdmin?: boolean;
    isEntitled?: boolean;
    roles?: AppRole[];
    entitlement?: Entitlement | null;
  }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updateUserPassword: (password: string) => Promise<{ error: Error | null }>;
  refreshUserAccess: () => Promise<void>;
  refreshEntitlement: () => Promise<void>;
}
