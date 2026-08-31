import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabase as mockSupabase, createClient as createMockClient } from './mockSupabase';
import type { Database } from '../types/database.types';

// Detect environment credentials
const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;

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
