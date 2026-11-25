import type { SourceStatut } from "@shared/types";
import { diffDays, today } from "./dates";

export type Sante = "vert" | "orange" | "rouge" | "gris";
export const COULEUR: Record<Sante, string> = { vert: "#2f7d3a", orange: "#e08a00", rouge: "#d9482a", gris: "#b9b09d" };
export const LIBELLE: Record<Sante, string> = { vert: "En bonne santé", orange: "À surveiller", rouge: "Ne renvoie plus rien", gris: "Inactive ou manuelle" };

export function santeSource(src: SourceStatut): Sante {
  if (!src.actif || src.methode === "manuel") return "gris";
  const age = src.dernierSucces ? diffDays(today(), src.dernierSucces.slice(0, 10)) : null;
  if (age === null || age > 7) return "rouge";
  if (src.derniereErreur || src.nbResultats === 0 || age > 2) return "orange";
  return "vert";
}

