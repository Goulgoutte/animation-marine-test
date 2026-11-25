import type { Echange } from "./types";

export const dernierEchange = (id: string, echanges: Echange[]): string | null =>
  echanges.filter((e) => e.contact_id === id).map((e) => e.date).sort().pop() ?? null;
