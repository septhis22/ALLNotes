// supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_supabaseurl;
const supabaseAnonKey = import.meta.env.VITE_annonkey;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);




