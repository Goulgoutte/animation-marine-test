// Recherche à facettes de la Veille : état des filtres, prédicats, compteurs de facettes, puces actives, URL et persistance.
// Règle des compteurs (comme le faceting de TanStack) : pour une facette, on applique tous les AUTRES filtres, puis on compte
// les valeurs de cette facette. Une option à 0 reste donc visible, simplement grisée.
import type { Metier } from "@shared/metiers";
import { ID_AUTRES, labelMetier, metiersSuivis, passeMetiers } from "@shared/metiers";
import { diffDays, today } from "./dates";
import type { Perimetre } from "./types";
import type { OffreVue, ProductionVue } from "./veille";
import { LABEL_CONTRAT, LABEL_FORMAT, LABEL_NIVEAU, LABEL_STATUT_PROD } from "./veille";
import { ZONES, lieuDansZones, zoneParId, zonesActives } from "./zones";

export type ModeId = "sur-place" | "hybride" | "teletravail";
export type LangueId = "fr" | "en";
export type Fraicheur = "toutes" | "nouvelles" | "7j" | "30j";
export type Tri = "recentes" | "limite" | "bon-moment";
export type Onglet = "offres" | "productions";

export const MODES: { id: ModeId; label: string }[] = [
  { id: "sur-place", label: "Sur place" },
  { id: "hybride", label: "Hybride" },
  { id: "teletravail", label: "Télétravail complet" },
];
export const LANGUES: { id: LangueId; label: string }[] = [{ id: "fr", label: "Français" }, { id: "en", label: "Anglais" }];
export const TECHNIQUES: { id: string; label: string }[] = [
  { id: "2D", label: "2D" },
  { id: "3D", label: "3D" },
  { id: "stop-motion", label: "Stop-motion" },
  { id: "inconnue", label: "Non précisée" },
];
export const CONTRATS = ["CDDU", "CDD", "CDI", "freelance", "stage"];
export const NIVEAUX = ["junior", "confirme", "senior", "lead"];
export const STATUTS = ["developpement", "financement", "preproduction", "production", "postproduction"];
export const FORMATS = ["long-metrage", "serie", "court", "special-tv"];
export const FRAICHEURS: { id: Fraicheur; label: string }[] = [
  { id: "toutes", label: "Toutes" },
  { id: "nouvelles", label: "Nouvelles depuis ma dernière visite" },
  { id: "7j", label: "7 derniers jours" },
  { id: "30j", label: "30 derniers jours" },
];

const TOUS_MODES = MODES.map((m) => m.id);
const TOUTES_LANGUES = LANGUES.map((l) => l.id);
const TOUTES_TECHNIQUES = TECHNIQUES.map((t) => t.id);

/** Filtres enregistrés dans les réglages (reglages.perimetre). */
export interface Persistants {
  metiers: string[];
  zones: string[];
  modes: ModeId[];
  langues: LangueId[];
  techniques: string[];
}
/** Tout l'état des filtres. Le reste de l'état que Persistants vit dans l'URL ; la recherche texte n'est pas ici. */
export interface Filtres extends Persistants {
  contrat: string[];
  niveau: string[];
  fraicheur: Fraicheur;
  expirees: boolean;
  masquees: boolean;
  statut: string[];
  format: string[];
  lieuProd: string[];
  bonMoment: boolean;
  tri: Tri;
}

export const FILTRES_VIDES: Filtres = {
  metiers: [], zones: [], modes: TOUS_MODES, langues: TOUTES_LANGUES, techniques: TOUTES_TECHNIQUES,
  contrat: [], niveau: [], fraicheur: "toutes", expirees: false, masquees: false,
  statut: [], format: [], lieuProd: [], bonMoment: false, tri: "recentes",
};

const CLES_PERSISTANTES = ["metiers", "zones", "modes", "langues", "techniques"] as const;
export const estPersistant = (k: string) => (CLES_PERSISTANTES as readonly string[]).includes(k);

/* ---------- Persistance dans les réglages ---------- */

/** Lit le périmètre enregistré, y compris les anciens champs (teletravail, afficher3d, zone, categorie). */
export function filtresPersistants(p: Perimetre): Persistants {
  const modes = (p.modes ?? (p.teletravail === false ? ["sur-place", "hybride"] : TOUS_MODES)).filter((m): m is ModeId => TOUS_MODES.includes(m as ModeId));
  const techniques = (p.techniques ?? (p.afficher3d ? TOUTES_TECHNIQUES : TOUTES_TECHNIQUES.filter((t) => t !== "3D"))).filter((t) => TOUTES_TECHNIQUES.includes(t));
  const langues = (Array.isArray(p.langues) ? p.langues : TOUTES_LANGUES).filter((l): l is LangueId => TOUTES_LANGUES.includes(l));
  return {
    metiers: metiersSuivis(p),
    zones: zonesActives(p),
    modes: modes.length ? modes : TOUS_MODES,
    langues: langues.length ? langues : TOUTES_LANGUES,
    techniques: techniques.length ? techniques : TOUTES_TECHNIQUES,
  };
}

/** Périmètre à enregistrer : nouveaux champs, plus les anciens (teletravail, afficher3d) gardés en phase. */
export function perimetreDepuis(p: Perimetre, patch: Partial<Persistants>): Perimetre {
  const f = { ...filtresPersistants(p), ...patch };
  const { zone: _zone, categorie: _categorie, ...reste } = p;
  return {
    ...reste,
    metiers: f.metiers, zones: f.zones, modes: f.modes, langues: f.langues, techniques: f.techniques,
    teletravail: f.modes.includes("teletravail"),
    afficher3d: f.techniques.includes("3D"),
  };
}

/* ---------- URL : contrat, niveau, fraîcheur, affichage, tri (et facettes propres aux productions) ---------- */

const liste = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function depuisUrl(search: string): Partial<Filtres> {
  const q = new URLSearchParams(search);
  const r: Partial<Filtres> = {};
  if (q.has("contrat")) r.contrat = liste(q.get("contrat")).filter((x) => CONTRATS.includes(x));
  if (q.has("niveau")) r.niveau = liste(q.get("niveau")).filter((x) => NIVEAUX.includes(x));
  const fr = q.get("fraicheur") as Fraicheur | null;
  if (fr && FRAICHEURS.some((x) => x.id === fr)) r.fraicheur = fr;
  const aff = liste(q.get("affichage"));
  if (aff.includes("expirees")) r.expirees = true;
  if (aff.includes("masquees")) r.masquees = true;
  const tri = q.get("tri") as Tri | null;
  if (tri === "recentes" || tri === "limite" || tri === "bon-moment") r.tri = tri;
  if (q.has("statut")) r.statut = liste(q.get("statut")).filter((x) => STATUTS.includes(x));
  if (q.has("format")) r.format = liste(q.get("format")).filter((x) => FORMATS.includes(x));
  if (q.has("lieu")) r.lieuProd = liste(q.get("lieu")).filter((x) => !!zoneParId(x));
  if (q.get("bonmoment") === "1") r.bonMoment = true;
  return r;
}

/** Query string à écrire : ne garde que ce qui s'écarte du défaut, et laisse intacts les autres paramètres (onglet…). */
export function versUrl(search: string, f: Filtres): string {
  const q = new URLSearchParams(search);
  for (const k of ["contrat", "niveau", "fraicheur", "affichage", "tri", "statut", "format", "lieu", "bonmoment"]) q.delete(k);
  if (f.contrat.length) q.set("contrat", f.contrat.join(","));
  if (f.niveau.length) q.set("niveau", f.niveau.join(","));
  if (f.fraicheur !== "toutes") q.set("fraicheur", f.fraicheur);
  const aff = [f.expirees && "expirees", f.masquees && "masquees"].filter(Boolean);
  if (aff.length) q.set("affichage", aff.join(","));
  if (f.tri !== "recentes") q.set("tri", f.tri);
  if (f.statut.length) q.set("statut", f.statut.join(","));
  if (f.format.length) q.set("format", f.format.join(","));
  if (f.lieuProd.length) q.set("lieu", f.lieuProd.join(","));
  if (f.bonMoment) q.set("bonmoment", "1");
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ---------- Prédicats ---------- */

export type Facette =
  | "metier" | "zones" | "mode" | "langue" | "technique" | "contrat" | "niveau" | "fraicheur" | "affichage"
  | "statut" | "format" | "lieuProd" | "bonMoment";

/** Ensemble « tout coché » ou vide : le filtre ne filtre rien. */
const neutre = <T>(sel: T[], tous: T[]) => sel.length === 0 || tous.every((x) => sel.includes(x));

const modeDe = (o: OffreVue): ModeId | null =>
  o.modeTravail === "teletravail-complet" ? "teletravail" : o.modeTravail === "hybride" ? "hybride" : o.modeTravail === "inconnu" ? null : "sur-place";
const techniqueDe = (t: string) => (t === "hybride" ? "2D" : t);

export const estExpiree = (o: OffreVue) => o.probablementExpiree || (!!o.dateLimite && o.dateLimite < today());

/** Lieux à comparer aux zones ; null = pas de contrainte de lieu (télétravail sans résidence exigée, mode inconnu). */
function lieuxDe(o: OffreVue): string[] | null {
  if (o.modeTravail === "teletravail-complet") {
    // Télétravail réservé aux résidents d'un autre pays : il compte comme une offre de ce pays.
    const r = o.residenceExigee?.trim().toLowerCase();
    return o.residenceExigee && r !== "france" && r !== "fr" ? [o.residenceExigee] : null;
  }
  if (o.modeTravail === "inconnu") return null;
  const lieux = [o.lieu, o.pays].filter((x): x is string => !!x);
  // Offre « sur place à Paris » sans lieu renseigné : le mode vient de la collecte, on s'y fie.
  if (o.modeTravail === "paris-sur-place" && lieux.length === 0) lieux.push("Paris");
  return lieux;
}

function langueOk(l: OffreVue["langue"], langues: LangueId[]): boolean {
  if (l === "inconnue") return true;
  if (l === "autre") return false;
  return langues.length === 0 || langues.includes(l);
}

const fraisOk = (o: OffreVue, fr: Fraicheur): boolean => {
  if (fr === "toutes") return true;
  if (fr === "nouvelles") return o.nouveau;
  const ref = (o.datePublication ?? o.premiereVue).slice(0, 10);
  return diffDays(today(), ref) <= (fr === "7j" ? 7 : 30);
};

/** L'offre passe-t-elle tous les filtres, sauf ceux de la facette `ignorer` ? Les offres ajoutées à la main échappent au périmètre (lieu, mode, langue, technique). */
export function offrePasse(o: OffreVue, f: Filtres, ignorer?: Facette): boolean {
  const ig = (k: Facette) => ignorer === k;
  if (!ig("metier") && !passeMetiers(o.metiers, f.metiers)) return false;
  if (!o.manuelle) {
    if (!ig("zones") && f.zones.length) {
      const lieux = lieuxDe(o);
      if (lieux && !lieuDansZones(lieux, f.zones)) return false;
    }
    if (!ig("mode") && !neutre(f.modes, TOUS_MODES)) {
      const m = modeDe(o);
      if (m && !f.modes.includes(m)) return false;
    }
    if (!ig("langue") && o.modeTravail === "teletravail-complet" && !langueOk(o.langue, f.langues)) return false;
    if (!ig("technique") && !neutre(f.techniques, TOUTES_TECHNIQUES) && !f.techniques.includes(techniqueDe(o.technique))) return false;
  }
  if (!ig("contrat") && f.contrat.length && !f.contrat.includes(o.contrat)) return false;
  if (!ig("niveau") && f.niveau.length && !f.niveau.includes(o.niveau)) return false;
  if (!ig("fraicheur") && !fraisOk(o, f.fraicheur)) return false;
  if (!ig("affichage") && ((!f.expirees && estExpiree(o)) || (!f.masquees && o.masquee))) return false;
  return true;
}

export function productionPasse(p: ProductionVue, f: Filtres, ignorer?: Facette): boolean {
  const ig = (k: Facette) => ignorer === k;
  if (!ig("metier") && !passeMetiers(p.metiers, f.metiers)) return false;
  if (!ig("technique") && !neutre(f.techniques, TOUTES_TECHNIQUES) && !f.techniques.includes(techniqueDe(p.technique))) return false;
  if (!ig("statut") && f.statut.length && !f.statut.includes(p.statut)) return false;
  if (!ig("format") && f.format.length && !f.format.includes(p.format)) return false;
  if (!ig("lieuProd") && f.lieuProd.length && !lieuDansZones([p.villeFabrication, p.paysDecors], f.lieuProd)) return false;
  if (!ig("bonMoment") && f.bonMoment && !p.bonMomentDecor) return false;
  if (!ig("affichage") && !f.masquees && p.masquee) return false;
  return true;
}

/** Valeurs d'une offre pour une facette : sert aux compteurs. */
export function valeursOffre(o: OffreVue, k: Facette): string[] {
  switch (k) {
    case "metier": return o.metiers.length ? o.metiers : [ID_AUTRES];
    case "zones": {
      const l = lieuxDe(o);
      return l ? ZONES.filter((z) => lieuDansZones(l, [z.id])).map((z) => z.id) : [];
    }
    case "mode": return [modeDe(o)].filter((x): x is ModeId => !!x);
    case "langue": return o.modeTravail === "teletravail-complet" && (o.langue === "fr" || o.langue === "en") ? [o.langue] : [];
    case "technique": return [techniqueDe(o.technique)];
    case "contrat": return [o.contrat];
    case "niveau": return [o.niveau];
    case "fraicheur": return FRAICHEURS.filter((x) => fraisOk(o, x.id)).map((x) => x.id);
    case "affichage": return [estExpiree(o) && "expirees", o.masquee && "masquees"].filter((x): x is string => !!x);
    default: return [];
  }
}

export function valeursProduction(p: ProductionVue, k: Facette): string[] {
  switch (k) {
    case "metier": return p.metiers.length ? p.metiers : [ID_AUTRES];
    case "technique": return [techniqueDe(p.technique)];
    case "statut": return [p.statut];
    case "format": return [p.format];
    case "lieuProd": return ZONES.filter((z) => lieuDansZones([p.villeFabrication, p.paysDecors], [z.id])).map((z) => z.id);
    case "bonMoment": return p.bonMomentDecor ? ["oui"] : [];
    case "affichage": return p.masquee ? ["masquees"] : [];
    default: return [];
  }
}

/** Compteurs d'une facette : les autres filtres sont appliqués, celui de la facette est ignoré. */
export function compter<T>(items: T[], passe: (x: T, ignorer: Facette) => boolean, valeurs: (x: T, k: Facette) => string[], k: Facette): Record<string, number> {
  const r: Record<string, number> = {};
  for (const x of items) {
    if (!passe(x, k)) continue;
    for (const v of valeurs(x, k)) r[v] = (r[v] ?? 0) + 1;
  }
  return r;
}

/* ---------- Tri ---------- */

const dateOffre = (o: OffreVue) => (o.datePublication ?? o.premiereVue).slice(0, 10);

export function trierOffres(l: OffreVue[], tri: Tri): OffreVue[] {
  const recentes = (a: OffreVue, b: OffreVue) => dateOffre(b).localeCompare(dateOffre(a)) || b.premiereVue.localeCompare(a.premiereVue);
  if (tri === "limite") {
    return [...l].sort((a, b) => (a.dateLimite && b.dateLimite ? a.dateLimite.localeCompare(b.dateLimite) : a.dateLimite ? -1 : b.dateLimite ? 1 : 0) || recentes(a, b));
  }
  return [...l].sort(recentes);
}

export function trierProductions(l: ProductionVue[], tri: Tri): ProductionVue[] {
  const recentes = (a: ProductionVue, b: ProductionVue) => b.premiereVue.localeCompare(a.premiereVue);
  if (tri === "bon-moment") return [...l].sort((a, b) => Number(b.bonMomentDecor) - Number(a.bonMomentDecor) || Number(b.misEnAvant) - Number(a.misEnAvant) || recentes(a, b));
  return [...l].sort(recentes);
}

export const triValide = (tri: Tri, onglet: Onglet): Tri => (onglet === "offres" ? (tri === "bon-moment" ? "recentes" : tri) : tri === "limite" ? "recentes" : tri);

/* ---------- Puces actives ---------- */

export interface Puce {
  cle: string;
  facette: Facette;
  texte: string;
  /** Changement d'état qui retire cette puce. */
  retirer: (f: Filtres) => Partial<Filtres>;
}

const sans = <T,>(l: T[], x: T) => l.filter((y) => y !== x);

/** Ensemble « coché » (modes, techniques) : une puce par option gardée, ou une seule « Sans … » quand c'est plus court. */
function pucesInclusion<T extends string>(facette: Facette, cle: "modes" | "techniques", sel: T[], tous: { id: string; label: string }[]): Puce[] {
  if (neutre(sel, tous.map((t) => t.id) as T[])) return [];
  const exclus = tous.filter((t) => !sel.includes(t.id as T));
  if (exclus.length < sel.length) {
    return [{ cle: `${cle}-sans`, facette, texte: `Sans ${exclus.map((t) => (/^\d/.test(t.label) ? t.label : t.label.replace(" complet", "").toLowerCase())).join(", ")}`, retirer: () => ({ [cle]: tous.map((t) => t.id) }) }];
  }
  return sel.map((id) => ({
    cle: `${cle}-${id}`, facette,
    texte: cle === "modes" ? (id === "teletravail" ? "Télétravail" : tous.find((t) => t.id === id)!.label) : `Technique : ${tous.find((t) => t.id === id)!.label}`,
    retirer: (f: Filtres) => {
      const reste = sans(f[cle] as string[], id);
      return { [cle]: reste.length ? reste : tous.map((t) => t.id) };
    },
  }));
}

export function puces(f: Filtres, onglet: Onglet, catalogue: Metier[]): Puce[] {
  const r: Puce[] = [];
  f.metiers.forEach((id) => r.push({ cle: `metier-${id}`, facette: "metier", texte: `Métier : ${labelMetier(id, catalogue)}`, retirer: (x) => ({ metiers: sans(x.metiers, id) }) }));
  if (onglet === "offres") {
    f.zones.forEach((id) => r.push({ cle: `zone-${id}`, facette: "zones", texte: `Lieu : ${zoneParId(id)?.label ?? id}`, retirer: (x) => ({ zones: sans(x.zones, id) }) }));
    r.push(...pucesInclusion("mode", "modes", f.modes, MODES));
    if (f.langues.length === 1) {
      r.push({ cle: "langue", facette: "langue", texte: `Télétravail en ${LANGUES.find((l) => l.id === f.langues[0])!.label.toLowerCase()}`, retirer: () => ({ langues: TOUTES_LANGUES }) });
    }
  } else {
    f.lieuProd.forEach((id) => r.push({ cle: `lieu-${id}`, facette: "lieuProd", texte: `Lieu : ${zoneParId(id)?.label ?? id}`, retirer: (x) => ({ lieuProd: sans(x.lieuProd, id) }) }));
  }
  r.push(...pucesInclusion("technique", "techniques", f.techniques, TECHNIQUES));
  if (onglet === "offres") {
    f.contrat.forEach((id) => r.push({ cle: `contrat-${id}`, facette: "contrat", texte: `Contrat : ${LABEL_CONTRAT[id]}`, retirer: (x) => ({ contrat: sans(x.contrat, id) }) }));
    f.niveau.forEach((id) => r.push({ cle: `niveau-${id}`, facette: "niveau", texte: `Niveau : ${LABEL_NIVEAU[id]}`, retirer: (x) => ({ niveau: sans(x.niveau, id) }) }));
    if (f.fraicheur !== "toutes") r.push({ cle: "fraicheur", facette: "fraicheur", texte: `Fraîcheur : ${FRAICHEURS.find((x) => x.id === f.fraicheur)!.label}`, retirer: () => ({ fraicheur: "toutes" }) });
    if (f.expirees) r.push({ cle: "expirees", facette: "affichage", texte: "Avec les offres expirées", retirer: () => ({ expirees: false }) });
  } else {
    f.statut.forEach((id) => r.push({ cle: `statut-${id}`, facette: "statut", texte: `Statut : ${LABEL_STATUT_PROD[id]}`, retirer: (x) => ({ statut: sans(x.statut, id) }) }));
    f.format.forEach((id) => r.push({ cle: `format-${id}`, facette: "format", texte: `Format : ${LABEL_FORMAT[id]}`, retirer: (x) => ({ format: sans(x.format, id) }) }));
    if (f.bonMoment) r.push({ cle: "bonmoment", facette: "bonMoment", texte: "Bon moment pour candidater", retirer: () => ({ bonMoment: false }) });
  }
  if (f.masquees) r.push({ cle: "masquees", facette: "affichage", texte: onglet === "offres" ? "Avec les offres masquées" : "Avec les productions masquées", retirer: () => ({ masquees: false }) });
  return r;
}
