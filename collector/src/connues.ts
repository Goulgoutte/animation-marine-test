// Productions repérées à la main (config/productions-connues.json) : intégrées à chaque collecte.
import { readFileSync } from "node:fs";
import { classerProduction, contient, motsParDefaut, normaliser } from "./classify.ts";
import { idProduction } from "./merge.ts";
import type { FormatProd, Production, StatutProd, Technique } from "./types.ts";

export const SOURCE_CONNUES = "productions-connues";

export interface ProductionConnue {
  titre: string;
  format: FormatProd;
  technique: Technique;
  statut: StatutProd;
  producteurs: string[];
  studiosFabrication?: string[];
  diffuseur?: string | null;
  realisateur?: string | null;
  villeFabrication?: string | null;
  extrait: string;
  sources: { nom: string; url: string }[];
}

export function lireConnues(): ProductionConnue[] {
  return JSON.parse(readFileSync(new URL("../config/productions-connues.json", import.meta.url), "utf8")).productions;
}

export function connuesEnProductions(liste: ProductionConnue[], maintenant: string): Production[] {
  const paris = motsParDefaut.studiosParis;
  return liste.map((k) => {
    const c = classerProduction({ titre: k.titre, extrait: k.extrait });
    return {
      id: idProduction(k.titre),
      titre: k.titre,
      format: k.format,
      technique: k.technique,
      producteurs: k.producteurs,
      studiosFabrication: k.studiosFabrication ?? [],
      paysCoproducteurs: [],
      paysDecors: null,
      diffuseur: k.diffuseur ?? null,
      realisateur: k.realisateur ?? null,
      statut: k.statut,
      dateDemarrage: null,
      villeFabrication: k.villeFabrication ?? null,
      contactRecrutement: null,
      extrait: k.extrait,
      image: null,
      premiereVue: maintenant,
      misEnAvant: c.misEnAvant || k.producteurs.some((p) => paris.some((s) => contient(normaliser(p), s))),
      bonMomentDecor: ["financement", "preproduction", "production"].includes(k.statut),
      sources: k.sources.map((s) => ({ sourceId: SOURCE_CONNUES, url: s.url, vuLe: maintenant })),
    };
  });
}
