import type { SourceStatut } from "@shared/types";
import { heuresFrequence } from "@shared/sources";
import { diffDays, today } from "./dates";

export type Sante = "vert" | "orange" | "rouge" | "gris";
export const COULEUR: Record<Sante, string> = { vert: "#2c8a5a", orange: "#d98a0b", rouge: "#d6455d", gris: "#a3a9ba" };
export const LIBELLE: Record<Sante, string> = { vert: "En bonne santé", orange: "À surveiller", rouge: "Ne renvoie plus rien", gris: "Inactive ou manuelle" };

export function santeSource(src: SourceStatut): Sante {
  if (!src.actif || src.methode === "manuel") return "gris";
  const age = src.dernierSucces ? diffDays(today(), src.dernierSucces.slice(0, 10)) : null;
  // les seuils suivent la fréquence : une source hebdomadaire n'est pas « à surveiller » au bout de 3 jours
  const jours = heuresFrequence(src.frequence) / 24;
  if (age === null || age > Math.max(7, 4 * jours)) return "rouge";
  if (src.derniereErreur || src.nbResultats === 0 || age > Math.max(2, 2 * jours)) return "orange";
  return "vert";
}

