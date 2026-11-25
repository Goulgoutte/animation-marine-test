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

/** URL de retour après la connexion Google : racine du site, basePath compris. */
export function urlRedirection(): string {
  return `${window.location.origin}${BASE_PATH}/`;
}

export interface Profil {
  email: string | null;
  nom: string | null;
  prenom: string | null;
  avatar: string | null;
}

/** Profil affiché dans l’interface, tiré des métadonnées du compte Google. */
export function profilDe(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined): Profil | null {
  if (!user) return null;
  const m = user.user_metadata ?? {};
  const nom = (m.full_name as string) || (m.name as string) || null;
  const prenom = (m.given_name as string) || nom?.split(" ")[0] || user.email?.split("@")[0] || null;
  return { email: user.email ?? null, nom, prenom, avatar: (m.avatar_url as string) || (m.picture as string) || null };
}
