import { addDays, diffDays, today } from "./dates";
import { prochaineRelance, relancesDe } from "./relances";
import type { Candidature, Relance, Reglages, Statut } from "./types";

export const CLOTUREES: Statut[] = ["acceptee", "refus", "sans_reponse"];
/** « Peut-être » : retour tiède (« pas besoin sur mon projet, mais je transmets »). On relance dans trois semaines. */
export const DELAI_PEUT_ETRE_JOURS = 21;
export const TEXTE_PEUT_ETRE = "Relancer dans 3 semaines";

export const estCloturee = (c: Candidature) => CLOTUREES.includes(c.statut);

export type Section = "faire" | "attente" | "cours" | "cloturee";

export interface Action {
  texte: string;
  date: string | null;
  /** true = proposée par l’app (rien de saisi), false = saisie à la main. */
  deduite: boolean;
  echue: boolean;
}

/** Prochaine action : celle saisie à la main, sinon une action déduite du statut et des relances. */
export function prochaineAction(c: Candidature, rs: Relance[], reg: Reglages): Action | null {
  if (estCloturee(c)) return null;
  const t = today();
  const texte = c.prochaine_action?.trim();
  if (texte) {
    const date = c.prochaine_action_date ?? null;
    return { texte, date, deduite: false, echue: !!date && date <= t };
  }
  if (c.statut === "a_preparer") return { texte: "Préparer et envoyer", date: null, deduite: true, echue: true };
  if (c.statut === "peut_etre") {
    // Filet de sécurité : `changementStatut` pose déjà cette action, mais elle peut avoir été effacée.
    const date = addDays(c.date_statut ?? t, DELAI_PEUT_ETRE_JOURS);
    return { texte: TEXTE_PEUT_ETRE, date, deduite: true, echue: date <= t };
  }
  if (c.statut === "entretien") return { texte: "Attendre le retour après l’entretien", date: null, deduite: true, echue: false };
  const n = relancesDe(c, rs).length;
  const p = prochaineRelance(c, rs, reg);
  if (!p) return { texte: "Attendre la réponse", date: null, deduite: true, echue: false };
  if (n >= 2) return { texte: "Clôture automatique si pas de réponse", date: p, deduite: true, echue: false };
  return { texte: n === 0 ? "Relancer (1re relance)" : "Relancer (2e relance)", date: p, deduite: true, echue: p <= t };
}

export function sectionDe(c: Candidature, rs: Relance[], reg: Reglages): Section {
  if (estCloturee(c)) return "cloturee";
  if (c.statut === "a_preparer") return "faire";
  if (prochaineAction(c, rs, reg)?.echue) return "faire";
  return c.statut === "entretien" || c.statut === "peut_etre" ? "cours" : "attente";
}

/** Date de la dernière activité connue (envoi, relance, changement de statut), ou null. */
export function derniereActivite(c: Candidature, rs: Relance[]): string | null {
  const dates = [c.date_envoi, c.date_statut, ...relancesDe(c, rs).map((r) => r.date)].filter((d): d is string => !!d);
  if (c.statut === "a_preparer" && c.created_at) dates.push(c.created_at.slice(0, 10));
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

export const SEUIL_STAGNE = 14;
/** Candidature en cours (envoyée, relancée, entretien) sans activité depuis `jours` jours ou plus. */
export function stagne(c: Candidature, rs: Relance[], jours = SEUIL_STAGNE): boolean {
  if (c.statut === "a_preparer" || estCloturee(c)) return false;
  const d = derniereActivite(c, rs);
  return !!d && diffDays(today(), d) >= jours;
}

/** Index de l’étape courante dans la frise Préparée, Envoyée, Relancée, Entretien, Réponse. « Peut-être » occupe l’étape du retour en cours. */
export const ETAPES = ["Préparée", "Envoyée", "Relancée", "Entretien", "Réponse"] as const;
export function etapeCourante(c: Candidature, rs: Relance[]): number {
  switch (c.statut) {
    case "a_preparer": return 0;
    case "envoyee": return 1;
    case "relancee": return 2;
    case "peut_etre":
    case "entretien": return 3;
    case "acceptee":
    case "refus": return 4;
    case "sans_reponse": return relancesDe(c, rs).length > 0 ? 2 : 1;
  }
}

/** Champs à écrire quand on change de statut (statut, dates, nettoyage de l’action et du motif). */
export function changementStatut(c: Candidature, statut: Statut, extra: Partial<Candidature> = {}): Partial<Candidature> {
  const p: Partial<Candidature> = { statut, cloture_auto: false, date_statut: today() };
  if ((statut === "envoyee" || statut === "relancee") && !c.date_envoi) p.date_envoi = today();
  if (statut === "envoyee" && c.statut === "a_preparer") p.date_envoi = today();
  if (!CLOTUREES.includes(statut)) p.motif_cloture = null;
  if (CLOTUREES.includes(statut) || statut === "a_preparer") {
    p.prochaine_action = null;
    p.prochaine_action_date = null;
  }
  if (statut === "peut_etre") {
    p.prochaine_action = TEXTE_PEUT_ETRE;
    p.prochaine_action_date = addDays(today(), DELAI_PEUT_ETRE_JOURS);
  }
  return { ...p, ...extra };
}

