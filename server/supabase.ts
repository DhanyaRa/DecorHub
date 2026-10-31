/**
 * Supabase Client Initialization for Express Backend
 * Safe initialization supporting configured & unconfigured (guest/offline) states.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseAnonKey.includes('your-anon-public-key')
  );
};

let serverSupabaseClient: SupabaseClient | null = null;
let serviceSupabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured() && supabaseUrl && supabaseAnonKey) {
  serverSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  if (supabaseServiceKey && !supabaseServiceKey.includes('your-service-role-private-key')) {
    serviceSupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
}

export const getSupabaseClient = (): SupabaseClient | null => {
  return serviceSupabaseClient || serverSupabaseClient;
};

export const getAnonSupabaseClient = (): SupabaseClient | null => {
  return serverSupabaseClient;
};
