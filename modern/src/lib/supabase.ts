import { createClient } from '@supabase/supabase-js';

// Fallback values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if URL exists to prevent "Uncaught Error: supabaseUrl is required"
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : (null as any); // Fallback to null; pages using it should handle the null state or error gracefully

