import { addMonths, today } from "./dates";
import type { Echange } from "./types";

export const dernierEchange = (id: string, echanges: Echange[]): string | null =>
  echanges.filter((e) => e.contact_id === id).map((e) => e.date).sort().pop() ?? null;

/** Ton d’alerte selon l’ancienneté du dernier échange par rapport au délai de rappel (en mois). */
export function tonFraicheur(jours: number | null, moisRappel: number): "ok" | "warn" | "danger" | "mute" {
  if (jours === null) return "mute";
  const limite = moisRappel * 30;
  if (jours >= limite) return "danger";
  if (jours >= limite * 0.66) return "warn";
  return "ok";
}

/**
 * À recontacter : le dernier échange enregistré date de plus que le délai (en mois).
 * Un contact sans aucun échange (jamais rencontré) n’est pas « à recontacter » : il n’y a rien à reprendre.
 */
export const aRecontacter = (dernier: string | null, moisRappel: number): boolean =>
  !!dernier && dernier < addMonths(today(), -moisRappel);
