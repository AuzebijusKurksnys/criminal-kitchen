import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://ldzfsbslppmmzfydwhwg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkemZzYnNscHBtbXpmeWR3aHdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgxNjIsImV4cCI6MjA3MTcwNDE2Mn0.iLHocrhu9h0QzNzkz5gfGBKQP36DgtVu0S3Wknz6lu8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, operation: string) {
  console.error(`Supabase error during ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || 'Unknown error'}`);
}
