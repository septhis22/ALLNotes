import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-load Supabase client to ensure environment variables 
 * (like process.env or import.meta.env) are populated before initialization.
 */
export const getSupabase = (): SupabaseClient => {
  if (_supabase) return _supabase;

  const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_supabaseurl) 
    || (typeof process !== 'undefined' && process.env?.VITE_supabaseurl);

  const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_annonkey)
    || (typeof process !== 'undefined' && process.env?.VITE_annonkey);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing. If running via CLI, ensure VITE_supabaseurl and VITE_annonkey are in your environment or .env file.');
  }

  _supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
  return _supabase;
};
