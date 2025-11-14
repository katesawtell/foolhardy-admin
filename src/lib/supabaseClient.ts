import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase anon key present:", !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
