import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabase as mockSupabase, createClient as createMockClient, mockDb } from './mockSupabase';
import type { Database } from '../types/database.types';

// Detect environment credentials
const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : undefined;
const envKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY : undefined;

export { mockDb };

export const supabase = (envUrl && envKey)
  ? createSupabaseClient<Database>(envUrl, envKey)
  : mockSupabase;

export const createClient = () => {
  if (envUrl && envKey) {
    return createSupabaseClient<Database>(envUrl, envKey);
  }
  return createMockClient();
};

export default supabase;
