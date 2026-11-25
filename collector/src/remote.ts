// Lecture de la table `sources` de Supabase (REST, clé publique) ; repli sur config/sources.json.
import { readFileSync } from "node:fs";
import type { Frequence, Methode, SourceConfig, TypeSource } from "./types.ts";

// Valeurs publiques (déjà dans le workflow de déploiement) : la table `sources` est en lecture publique.
export const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://httsunqkptropfewozwm.supabase.co";
export const SUPABASE_CLE_PUBLIQUE = process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_vUO5jHIyxAeX6SfVPwgn-g_AYPDjcbl";

export interface LigneSource {
  id: string; nom: string; url: string; type: TypeSource; methode: Methode; frequence: Frequence | null; actif: boolean;
  config: Record<string, unknown> | null; notes: string | null; ajoutee_par_utilisatrice: boolean | null;
}

/** Ligne de la table -> configuration de collecte. `config` porte sélecteurs, filtre, studio, technique, lieu par défaut. */
export function ligneEnSource(l: LigneSource): SourceConfig {
  const c = (l.config ?? {}) as Record<string, any>;
  return {
    id: l.id, nom: l.nom, url: l.url, type: l.type, methode: l.methode, actif: l.actif,
    frequence: l.frequence ?? "quotidien",
    selecteurs: c.selecteurs, filtre: c.filtre, studio: c.studio, technique: c.technique, lieuDefaut: c.lieuDefaut,
    note: l.notes ?? undefined,
    ajouteeParUtilisatrice: l.ajoutee_par_utilisatrice ?? false,
  };
}

/** Configuration d'une source -> colonnes de la table (sert à générer la migration). */
export function sourceEnLigne(s: SourceConfig): Omit<LigneSource, "ajoutee_par_utilisatrice"> {
  const config: Record<string, unknown> = {};
  for (const k of ["selecteurs", "filtre", "studio", "technique", "lieuDefaut"] as const) if (s[k] !== undefined) config[k] = s[k];
  return {
    id: s.id, nom: s.nom, url: s.url, type: s.type, methode: s.methode, frequence: s.frequence ?? "quotidien", actif: s.actif,
    config, notes: s.note ?? null,
  };
}

export function lireSourcesLocales(): SourceConfig[] {
  return JSON.parse(readFileSync(new URL("../config/sources.json", import.meta.url), "utf8")).sources;
}

/** null = injoignable ou table absente/vide : l'appelant se rabat sur le fichier local. */
export async function lireSourcesDistantes(fetchImpl: typeof fetch = fetch): Promise<SourceConfig[] | null> {
  try {
    const res = await fetchImpl(`${SUPABASE_URL}/rest/v1/sources?select=*&order=created_at.asc,id.asc`, {
      headers: { apikey: SUPABASE_CLE_PUBLIQUE, accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const lignes = (await res.json()) as LigneSource[];
    if (!Array.isArray(lignes) || lignes.length === 0) return null;
    return lignes.map(ligneEnSource);
  } catch {
    return null;
  }
}

export async function chargerSources(): Promise<{ configs: SourceConfig[]; origine: "supabase" | "fichier" }> {
  const distantes = await lireSourcesDistantes();
  if (distantes) return { configs: distantes, origine: "supabase" };
  return { configs: lireSourcesLocales(), origine: "fichier" };
}
