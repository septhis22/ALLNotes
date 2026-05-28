import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from "dotenv";
dotenv.config();

let _supabase: SupabaseClient | null = null;

/**
 * Lazy-load Supabase client to ensure environment variables 
 * (like process.env or import.meta.env) are populated before initialization.
 */
export const getSupabase = (): SupabaseClient => {
  if (_supabase) return _supabase;

  const supabaseUrl = (typeof import.meta !== 'undefined' && process.env?.supabaseurl) 
    || (typeof process !== 'undefined' && process.env?.VITE_supabaseurl);

  const supabaseAnonKey = (typeof import.meta !== 'undefined' && process.env?.secret)
    || (typeof process !== 'undefined' && process.env?.VITE_annonkey);

  if (!supabaseUrl || !supabaseAnonKey) {}

  _supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
  return _supabase;
};
