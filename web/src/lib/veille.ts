import type { Offre, Production } from "@shared/types";
import type { Collecte } from "./store";
import type { Donnees, Reglages } from "./types";

export type OffreVue = Offre & { manuelle: boolean; corrigee: boolean; masquee: boolean; nouveau: boolean };
export type ProductionVue = Production & { manuelle: boolean; corrigee: boolean; masquee: boolean; nouveau: boolean };

const idManuel = (id: string) => `m:${id}`;

function estNouveau(premiereVue: string, ref: string | null): boolean {
  if (!ref) return false; // première visite : tout serait « nouveau », donc rien ne l’est
  return premiereVue > ref;
}

export function offresVues(c: Collecte, d: Donnees, ref: string | null): OffreVue[] {
  const masques = new Set(d.masquages.filter((m) => m.kind === "offre").map((m) => m.ref_id));
  const corr = new Map(d.corrections.filter((x) => x.kind === "offre").map((x) => [x.ref_id, x.champs]));
  const collectees = c.offres.offres.map((o) => ({ o, manuelle: false }));
  const manuelles = d.offres_manuelles.map((m) => ({ o: { ...m.data, id: idManuel(m.id) }, manuelle: true }));
  return [...collectees, ...manuelles].map(({ o, manuelle }) => {
    const champs = corr.get(o.id);
    const f = champs ? ({ ...o, ...champs } as Offre) : o;
    return { ...f, manuelle, corrigee: !!champs, masquee: masques.has(o.id), nouveau: estNouveau(f.premiereVue, ref) };
  });
}

export function productionsVues(c: Collecte, d: Donnees, ref: string | null): ProductionVue[] {
  const masques = new Set(d.masquages.filter((m) => m.kind === "production").map((m) => m.ref_id));
  const corr = new Map(d.corrections.filter((x) => x.kind === "production").map((x) => [x.ref_id, x.champs]));
  const collectees = c.productions.productions.map((o) => ({ o, manuelle: false }));
  const manuelles = d.productions_manuelles.map((m) => ({ o: { ...m.data, id: idManuel(m.id) }, manuelle: true }));
  return [...collectees, ...manuelles].map(({ o, manuelle }) => {
    const champs = corr.get(o.id);
    const f = champs ? ({ ...o, ...champs } as Production) : o;
    return { ...f, manuelle, corrigee: !!champs, masquee: masques.has(o.id), nouveau: estNouveau(f.premiereVue, ref) };
  });
}

/** Filtre « périmètre » côté site : s’ajoute à `dansPerimetre` calculé par la collecte. */
export function offreDansPerimetre(o: Offre, reg: Reglages): boolean {
  if (!o.dansPerimetre) return false;
  const p = reg.perimetre;
  if (!p.teletravail && o.modeTravail === "teletravail-complet") return false;
  if (!p.afficher3d && o.technique === "3D") return false;
  if (o.modeTravail === "teletravail-complet" && o.langue !== "inconnue" && o.langue !== "autre" && !p.langues.includes(o.langue)) return false;
  return true;
}

export function productionDansPerimetre(p: Production, reg: Reglages): boolean {
  if (p.technique === "3D" && !reg.perimetre.afficher3d) return false;
  if (p.technique === "stop-motion") return false;
  return true;
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
