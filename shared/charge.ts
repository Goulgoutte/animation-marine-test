// Garde-fous de la collecte, communs à collector/ (qui les applique) et à web/ (jauge de charge, avertissement sur les fréquences).
// Une requête = une page ou un flux récupéré, robots.txt compris. Les jours sont comptés en UTC.
import type { Frequence, HistoriqueCollecte, SourceStatut } from "./types.ts";
import { CRON_HEURES, heuresFrequence } from "./sources.ts";

export interface Limites {
  /** Requêtes par domaine et par jour, tant qu'aucun plafond propre au domaine n'est fixé. */
  plafondRequetesParDomaineParJour: number;
  /** Plafonds propres à certains domaines (clé = domaine sans « www. »). */
  plafondsParDomaine: Record<string, number>;
  /** Délai minimal entre deux collectes complètes ; l'option « forcer » le contourne. */
  delaiMinCollecteMinutes: number;
}

export const LIMITES_DEFAUT: Limites = { plafondRequetesParDomaineParJour: 200, plafondsParDomaine: {}, delaiMinCollecteMinutes: 10 };

/** Limites lues dans un fichier de config ou dans sources.json : champs manquants ou absurdes remplacés par le défaut. */
export function limitesDepuis(brut: Partial<Limites> | null | undefined): Limites {
  const pos = (n: unknown, d: number) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : d);
  const plafonds: Record<string, number> = {};
  for (const [k, v] of Object.entries(brut?.plafondsParDomaine ?? {})) if (typeof v === "number" && v > 0) plafonds[k.toLowerCase().replace(/^www\./, "")] = v;
  return {
    plafondRequetesParDomaineParJour: pos(brut?.plafondRequetesParDomaineParJour, LIMITES_DEFAUT.plafondRequetesParDomaineParJour),
    plafondsParDomaine: plafonds,
    delaiMinCollecteMinutes: pos(brut?.delaiMinCollecteMinutes, LIMITES_DEFAUT.delaiMinCollecteMinutes),
  };
}

/** « https://www.exemple.fr/jobs » -> « exemple.fr » ; null si l'URL est invalide. */
export function domaineDe(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

export const plafondDe = (domaine: string, l: Limites): number => l.plafondsParDomaine[domaine] ?? l.plafondRequetesParDomaineParJour;

// ---------- Compteur journalier ----------

export interface CompteurJour { jour: string; parDomaine: Record<string, number> }

export const jourUtc = (d: Date): string => d.toISOString().slice(0, 10);

/** Compteur du jour : repart de zéro quand le jour (UTC) change ou que le fichier n'en a pas. */
export function compteurDuJour(prec: CompteurJour | null | undefined, maintenant: Date): CompteurJour {
  const jour = jourUtc(maintenant);
  if (prec && prec.jour === jour && prec.parDomaine && typeof prec.parDomaine === "object") return { jour, parDomaine: { ...prec.parDomaine } };
  return { jour, parDomaine: {} };
}

export const plafondAtteint = (compteur: Record<string, number>, domaine: string, l: Limites): boolean =>
  (compteur[domaine] ?? 0) >= plafondDe(domaine, l);

// ---------- Délai minimal entre deux collectes complètes ----------

export interface VerdictDelai { refuse: boolean; attendreMinutes: number }

/** Refuse une collecte complète lancée moins de `delaiMinCollecteMinutes` après la précédente, sauf si `forcer`. */
export function collecteTropRecente(derniere: string | null | undefined, maintenant: Date, l: Limites, forcer: boolean): VerdictDelai {
  const t = derniere ? Date.parse(derniere) : NaN;
  if (forcer || Number.isNaN(t)) return { refuse: false, attendreMinutes: 0 };
  const ecoule = (maintenant.getTime() - t) / 60_000;
  if (ecoule >= l.delaiMinCollecteMinutes) return { refuse: false, attendreMinutes: 0 };
  return { refuse: true, attendreMinutes: Math.ceil(l.delaiMinCollecteMinutes - ecoule) };
}

// ---------- Charge estimée (jauge du site) ----------

export const PASSAGES_MAX_PAR_JOUR = 24 / CRON_HEURES;

/** Passages par jour d'une source, d'après sa fréquence (hebdo = 1/7). Le cron ne passe que toutes les 3 h : jamais plus de 8. */
export const passagesParJour = (f: Frequence | string | null | undefined): number => Math.min(24 / heuresFrequence(f), PASSAGES_MAX_PAR_JOUR);

export interface SourceCharge { id: string; url: string; frequence?: Frequence | string | null; actif: boolean; methode: string }

export interface ChargeDomaine {
  domaine: string;
  /** Requêtes prévues par jour : une par passage de chaque source, plus robots.txt à chaque collecte qui touche le domaine. */
  requetes: number;
  plafond: number;
  /** requetes / plafond */
  ratio: number;
  sources: string[];
}

export type Niveau = "vert" | "orange" | "rouge";
/** Vert sous 50 %, orange jusqu'à 85 %, rouge au-delà. */
export const niveauDe = (ratio: number): Niveau => (ratio < 0.5 ? "vert" : ratio <= 0.85 ? "orange" : "rouge");

/** Charge estimée par domaine, du plus chargé au moins chargé. Les sources inactives ou manuelles ne comptent pas. */
export function chargeParDomaine(sources: SourceCharge[], l: Limites): ChargeDomaine[] {
  const parDomaine = new Map<string, { passages: number; ids: string[] }>();
  for (const s of sources) {
    if (!s.actif || s.methode === "manuel") continue;
    const d = domaineDe(s.url);
    if (!d) continue;
    const e = parDomaine.get(d) ?? { passages: 0, ids: [] };
    e.passages += passagesParJour(s.frequence);
    e.ids.push(s.id);
    parDomaine.set(d, e);
  }
  const arrondi = (n: number) => Math.round(n * 10) / 10;
  return [...parDomaine.entries()]
    .map(([domaine, e]) => {
      const requetes = arrondi(e.passages + Math.min(e.passages, PASSAGES_MAX_PAR_JOUR));
      const plafond = plafondDe(domaine, l);
      return { domaine, requetes, plafond, ratio: requetes / plafond, sources: e.ids };
    })
    .sort((a, b) => b.ratio - a.ratio || a.domaine.localeCompare(b.domaine));
}

/** Part du plafond à partir de laquelle Réglages > Sources affiche une note discrète. */
export const SEUIL_NOTE = 0.5;
/** Domaines au-dessus de ~50 % de leur plafond (note informative, jamais bloquante). */
export const domainesCharges = (charge: ChargeDomaine[]): ChargeDomaine[] => charge.filter((c) => c.ratio > SEUIL_NOTE);

// ---------- Historique ----------

export const HISTORIQUE_MAX = 10;

export function ajouterHistorique(prec: HistoriqueCollecte[] | undefined, e: HistoriqueCollecte): HistoriqueCollecte[] {
  return [e, ...(prec ?? [])].slice(0, HISTORIQUE_MAX);
}

/** Sources dont l'état indique qu'elles ont été sautées au dernier passage. */
export const sautees = (sources: SourceStatut[]): SourceStatut[] => sources.filter((s) => !!s.sautee);
