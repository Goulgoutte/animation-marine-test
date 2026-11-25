// Règles communes à la collecte (collector/) et aux Réglages (web/) : fréquences, ATS reconnus par domaine.
import type { Frequence, Methode, TypeSource } from "./types.ts";

export const FREQUENCES: Frequence[] = ["3h", "6h", "12h", "quotidien", "hebdo"];
export const LIBELLE_FREQUENCE: Record<Frequence, string> = {
  "3h": "Toutes les 3 h", "6h": "Toutes les 6 h", "12h": "Toutes les 12 h", quotidien: "Une fois par jour", hebdo: "Une fois par semaine",
};
const HEURES: Record<Frequence, number> = { "3h": 3, "6h": 6, "12h": 12, quotidien: 24, hebdo: 168 };
/** Le workflow tourne toutes les 3 h : un passage est dû même s'il arrive quelques minutes avant l'échéance. */
export const TOLERANCE_MS = 10 * 60_000;
export const CRON_HEURES = 3;

export const heuresFrequence = (f: Frequence | string | null | undefined): number =>
  HEURES[(f as Frequence) ?? "quotidien"] ?? HEURES.quotidien;

/** Prochain passage théorique (ISO), ou null si la source n'a jamais été collectée (= au prochain passage du workflow). */
export function prochainPassage(dernierPassage: string | null | undefined, frequence: Frequence | string | null | undefined): string | null {
  const t = dernierPassage ? Date.parse(dernierPassage) : NaN;
  if (Number.isNaN(t)) return null;
  return new Date(t + heuresFrequence(frequence) * 3_600_000).toISOString();
}

/** Une source est collectée si elle n'a jamais été vue ou si sa fréquence est échue depuis son dernier passage. */
export function estEchue(dernierPassage: string | null | undefined, frequence: Frequence | string | null | undefined, maintenant: Date): boolean {
  const t = dernierPassage ? Date.parse(dernierPassage) : NaN;
  if (Number.isNaN(t)) return true;
  return maintenant.getTime() - t >= heuresFrequence(frequence) * 3_600_000 - TOLERANCE_MS;
}

// Premier créneau du cron (toutes les 3 h, à heure pile UTC) à partir d'un instant, lui-même inclus.
export function creneauCron(depuis: Date): Date {
  const pas = CRON_HEURES * 3_600_000;
  return new Date(Math.ceil(depuis.getTime() / pas) * pas);
}

/**
 * Passage estimé : la fréquence est échue à `dernierPassage + fréquence` (moins la tolérance), mais la collecte n'a lieu
 * qu'aux créneaux du cron. Jamais collectée ou en retard : prochain créneau après `maintenant`.
 */
export function prochainPassageEstime(dernierPassage: string | null | undefined, frequence: Frequence | string | null | undefined, maintenant: Date): Date {
  const t = dernierPassage ? Date.parse(dernierPassage) : NaN;
  const echeance = Number.isNaN(t) ? maintenant.getTime() : t + heuresFrequence(frequence) * 3_600_000 - TOLERANCE_MS;
  return creneauCron(new Date(Math.max(echeance, maintenant.getTime() + 1)));
}

export interface Detection { methode: Methode; type: TypeSource; ats: string | null; nomSuggere: string }

const nomDepuisHote = (hote: string) => {
  const base = hote.replace(/^www\./, "").split(".")[0] ?? hote;
  return base.charAt(0).toUpperCase() + base.slice(1);
};

/** Devine méthode et type à partir de l'URL collée : flux RSS, ATS connu par son domaine, sinon page HTML. */
export function detecterSource(entree: string): Detection | null {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(entree.trim()) ? entree.trim() : `https://${entree.trim()}`); } catch { return null; }
  const h = u.hostname.toLowerCase();
  const premier = u.pathname.split("/").filter(Boolean);
  const nom = (slug: string | undefined, repli: string) => (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : repli);
  if (h === "jobs.lever.co" || h === "api.lever.co" || h === "jobs.eu.lever.co") {
    const slug = h === "api.lever.co" ? premier[2] : premier[0];
    return { methode: "lever", type: "carriere-studio", ats: "Lever", nomSuggere: nom(slug, "Lever") };
  }
  if (h.endsWith(".recruitee.com")) return { methode: "recruitee", type: "carriere-studio", ats: "Recruitee", nomSuggere: nom(h.split(".")[0], "Recruitee") };
  if (h.endsWith(".teamtailor.com")) return { methode: "teamtailor", type: "carriere-studio", ats: "Teamtailor", nomSuggere: nom(h.split(".")[0], "Teamtailor") };
  if (h === "apply.workable.com" || h.endsWith(".workable.com")) {
    return { methode: "workable", type: "carriere-studio", ats: "Workable", nomSuggere: nom(h === "apply.workable.com" ? premier[0] : h.split(".")[0], "Workable") };
  }
  if (h === "jobs.smartrecruiters.com" || h === "careers.smartrecruiters.com" || h === "api.smartrecruiters.com") {
    const slug = h === "api.smartrecruiters.com" ? premier[2] : premier[0];
    return { methode: "smartrecruiters", type: "carriere-studio", ats: "SmartRecruiters", nomSuggere: nom(slug, "SmartRecruiters") };
  }
  if (h === "careers.werecruit.io") return { methode: "werecruit", type: "carriere-studio", ats: "WeRecruit", nomSuggere: nom(premier[1] ?? premier[0], "WeRecruit") };
  if (h === "news.google.com" && u.pathname.startsWith("/rss")) return { methode: "rss", type: "actualite", ats: null, nomSuggere: "Google Actualités" };
  const ressembleFlux = /\/(feed|rss)(\/|$)|\.(rss|xml|atom)$|[?&]feed=|\/jobs\.rss$|\/syndication\//i.test(u.pathname + u.search);
  if (ressembleFlux) {
    const emploi = /job|emploi|career|recrut/i.test(u.pathname + u.search);
    return { methode: "rss", type: emploi ? "emploi" : "actualite", ats: null, nomSuggere: nomDepuisHote(h) };
  }
  const carriere = /career|carri[eè]re|recrut|emploi|jobs?(\/|$)|join|rejoign/i.test(u.pathname);
  return { methode: "html", type: carriere ? "carriere-studio" : "actualite", ats: null, nomSuggere: nomDepuisHote(h) };
}
