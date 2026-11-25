import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const MODE_DEMO = !url || !key;

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (MODE_DEMO) return null;
  if (!client) client = createClient(url!, key!, { auth: { persistSession: true, detectSessionInUrl: true } });
  return client;
}

/** URL de retour du lien magique : racine du site, basePath compris. */
export function urlRedirection(): string {
  return `${window.location.origin}${BASE_PATH}/`;
}
