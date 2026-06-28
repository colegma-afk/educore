import { createClient } from "@supabase/supabase-js";

// Las variables se inyectan en build (Vite). En GitHub Pages se pasan como
// secrets del workflow. La anon key es pública por diseño.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// hasSupabase = true sólo si ambas variables están configuradas.
export const hasSupabase = Boolean(url && anon);

export const supabase = hasSupabase ? createClient(url, anon) : null;
