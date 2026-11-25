import { addBusinessDays, diffDays, today } from "./dates";
import type { Candidature, Relance, Reglages } from "./types";

const ACTIFS = ["envoyee", "relancee"];

export function relancesDe(c: Candidature, relances: Relance[]): Relance[] {
  return relances.filter((r) => r.candidature_id === c.id).sort((a, b) => a.date.localeCompare(b.date));
}

/** Date de la prochaine relance (jours ouvrés), ou null si rien à prévoir. */
export function prochaineRelance(c: Candidature, rs: Relance[], reg: Reglages): string | null {
  if (!ACTIFS.includes(c.statut)) return null;
  const liste = relancesDe(c, rs);
  if (liste.length === 0) {
    return c.date_envoi ? addBusinessDays(c.date_envoi, reg.delai_relance_1) : null;
  }
  return addBusinessDays(liste[liste.length - 1].date, reg.delai_relance_2);
}

/** À relancer : échéance atteinte et moins de deux relances déjà faites. */
export function aRelancer(c: Candidature, rs: Relance[], reg: Reglages): boolean {
  const n = relancesDe(c, rs).length;
  const p = prochaineRelance(c, rs, reg);
  return !!p && n < 2 && p <= today();
}

/** Deux relances faites, et le délai après la deuxième est écoulé sans réponse. */
export function doitEtreCloturee(c: Candidature, rs: Relance[], reg: Reglages): boolean {
  if (c.statut !== "relancee" || c.cloture_annulee) return false;
  const n = relancesDe(c, rs).length;
  const p = prochaineRelance(c, rs, reg);
  return n >= 2 && !!p && p <= today();
}

export function joursAvant(iso: string): number {
  return diffDays(iso, today());
}
