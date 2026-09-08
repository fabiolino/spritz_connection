import { createClient } from "@supabase/supabase-js";

// Renseigne ces deux valeurs dans un fichier .env (voir .env.example)
// Elles se trouvent dans ton projet Supabase : Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
