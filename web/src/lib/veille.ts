import type { Offre, Production } from "@shared/types";
import type { Metier } from "@shared/metiers";
import { METIERS, metiersOffre, metiersProduction } from "@shared/metiers";
import type { Collecte } from "./store";
import type { Donnees, Reglages } from "./types";
import { FILTRES_VIDES, filtresPersistants, offrePasse, productionPasse } from "./filtres";
import { lieuDansZones, zonesActives } from "./zones";

/** `metiers` : ids de shared/metiers.ts, classés côté site (titre, extrait, studio) à chaque affichage. */
export type OffreVue = Offre & { manuelle: boolean; corrigee: boolean; masquee: boolean; nouveau: boolean; metiers: string[] };
export type ProductionVue = Production & { manuelle: boolean; corrigee: boolean; masquee: boolean; nouveau: boolean; metiers: string[] };

const idManuel = (id: string) => `m:${id}`;

function estNouveau(premiereVue: string, ref: string | null): boolean {
  if (!ref) return false; // première visite : tout serait « nouveau », donc rien ne l’est
  return premiereVue > ref;
}

export function offresVues(c: Collecte, d: Donnees, ref: string | null, catalogue: Metier[] = METIERS): OffreVue[] {
  const masques = new Set(d.masquages.filter((m) => m.kind === "offre").map((m) => m.ref_id));
  const corr = new Map(d.corrections.filter((x) => x.kind === "offre").map((x) => [x.ref_id, x.champs]));
  const collectees = c.offres.offres.map((o) => ({ o, manuelle: false }));
  const manuelles = d.offres_manuelles.map((m) => ({ o: { ...m.data, id: idManuel(m.id) }, manuelle: true }));
  return [...collectees, ...manuelles].map(({ o, manuelle }) => {
    const champs = corr.get(o.id);
    const f = champs ? ({ ...o, ...champs } as Offre) : o;
    return { ...f, manuelle, corrigee: !!champs, masquee: masques.has(o.id), nouveau: estNouveau(f.premiereVue, ref), metiers: metiersOffre(f, catalogue) };
  });
}

export function productionsVues(c: Collecte, d: Donnees, ref: string | null, catalogue: Metier[] = METIERS): ProductionVue[] {
  const masques = new Set(d.masquages.filter((m) => m.kind === "production").map((m) => m.ref_id));
  const corr = new Map(d.corrections.filter((x) => x.kind === "production").map((x) => [x.ref_id, x.champs]));
  const collectees = c.productions.productions.map((o) => ({ o, manuelle: false }));
  const manuelles = d.productions_manuelles.map((m) => ({ o: { ...m.data, id: idManuel(m.id) }, manuelle: true }));
  return [...collectees, ...manuelles].map(({ o, manuelle }) => {
    const champs = corr.get(o.id);
    const f = champs ? ({ ...o, ...champs } as Production) : o;
    return { ...f, manuelle, corrigee: !!champs, masquee: masques.has(o.id), nouveau: estNouveau(f.premiereVue, ref), metiers: metiersProduction(f, catalogue) };
  });
}

/**
 * Périmètre enregistré dans les réglages (zones, modes de travail, langues, techniques), sans le métier ni les filtres de l'URL.
 * Mode inconnu : visible (badge « À vérifier »). Offres expirées et masquées : écartées. Sert au KPI et au compteur de navigation.
 */
export function offreDansPerimetre(o: OffreVue, reg: Reglages): boolean {
  return offrePasse(o, { ...FILTRES_VIDES, ...filtresPersistants(reg.perimetre) }, "metier");
}

export function productionDansPerimetre(p: ProductionVue, reg: Reglages): boolean {
  return productionPasse(p, { ...FILTRES_VIDES, ...filtresPersistants(reg.perimetre) }, "metier");
}

/** Fabrication dans une des zones choisies (badge « Dans ta zone »). */
export function productionDansZone(p: Production, reg: Reglages): boolean {
  return lieuDansZones([p.villeFabrication], zonesActives(reg.perimetre));
}

/** Pour les productions, « Décor » = celles où un décorateur a une prise : bon moment ou fabrication parisienne / télétravail. */
export function productionCategorie(p: Production): "decor" | "autre" {
  return p.bonMomentDecor || p.misEnAvant ? "decor" : "autre";
}

export const LABEL_MODE: Record<string, string> = {
  "paris-sur-place": "Sur place à Paris",
  "teletravail-complet": "Télétravail complet",
  hybride: "Hybride",
  "sur-place-ailleurs": "Sur place ailleurs",
  inconnu: "Mode inconnu",
};
export const LABEL_STATUT_PROD: Record<string, string> = {
  developpement: "Développement",
  financement: "Financement",
  preproduction: "Préproduction",
  production: "Production",
  postproduction: "Postproduction",
  inconnu: "Statut inconnu",
};
export const LABEL_FORMAT: Record<string, string> = {
  "long-metrage": "Long métrage",
  serie: "Série",
  court: "Court",
  "special-tv": "Spécial TV",
  inconnu: "Format inconnu",
};
export const LABEL_CONTRAT: Record<string, string> = { CDDU: "CDDU", CDD: "CDD", CDI: "CDI", freelance: "Freelance", stage: "Stage", inconnu: "Contrat inconnu" };
export const LABEL_NIVEAU: Record<string, string> = { junior: "Junior", confirme: "Confirmé", senior: "Senior", lead: "Lead", inconnu: "" };
