import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://tojbhwsnqewdqjnpqtbx.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvamJod3NucWV3ZHFqbnBxdGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MTI4MzksImV4cCI6MjEwNTI4ODgzOX0.-ufEq9JR-5KJtQltMvdHlz4p6hkBz53iKkOBmv6cmBQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
