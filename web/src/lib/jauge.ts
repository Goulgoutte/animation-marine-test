"use client";

import { useMemo } from "react";
import { estEchue, creneauCron } from "@shared/sources";
import { chargeParDomaine, limitesDepuis, niveauDe, type ChargeDomaine, type Niveau } from "@shared/charge";
import type { HistoriqueCollecte, SourceStatut } from "@shared/types";
import { useStore } from "./store";

export interface Jauge {
  charge: ChargeDomaine[];
  pire: ChargeDomaine | null;
  /** Part du plafond utilisée par le domaine le plus sollicité (0 à plus de 1). */
  ratio: number;
  niveau: Niveau;
  /** Requêtes déjà faites aujourd'hui (UTC) par domaine, si la collecte les a enregistrées. */
  aujourdhui: Record<string, number> | null;
  prochaine: Date;
  nbDues: number;
  historique: HistoriqueCollecte[];
  sourcesSautees: SourceStatut[];
}

/** Charge de collecte estimée par jour, d'après les sources actives et leurs fréquences. Ne déclenche rien : calcul pur. */
export function useJauge(): Jauge {
  const { collecte } = useStore();
  const f = collecte?.sources;
  return useMemo(() => {
    const limites = limitesDepuis(f?.limites);
    const sources = f?.sources ?? [];
    const charge = chargeParDomaine(sources, limites);
    const pire = charge[0] ?? null;
    const ratio = pire?.ratio ?? 0;
    const prochaine = creneauCron(new Date());
    const nbDues = sources.filter((x) => x.actif && x.methode !== "manuel" && estEchue(x.dernierPassage ?? x.dernierSucces, x.frequence, prochaine)).length;
    const auj = f?.requetesJour;
    const jourUtc = new Date().toISOString().slice(0, 10);
    return {
      charge, pire, ratio, niveau: niveauDe(ratio),
      aujourdhui: auj && auj.jour === jourUtc ? auj.parDomaine : null,
      prochaine, nbDues,
      historique: f?.historique ?? [],
      sourcesSautees: sources.filter((x) => !!x.sautee),
    };
  }, [f]);
}

export const COULEUR_NIVEAU: Record<Niveau, string> = { vert: "var(--ok)", orange: "var(--warn)", rouge: "var(--danger)" };
