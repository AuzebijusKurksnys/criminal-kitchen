import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Read from Vite env vars; configure in Vercel/Dev: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error('Supabase env vars missing. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, operation: string) {
  console.error(`Supabase error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
}
