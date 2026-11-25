"use client";

import { useEffect } from "react";
import { doitEtreCloturee } from "@/lib/relances";
import { useStore } from "@/lib/store";

/** Passe en « sans réponse » les candidatures relancées deux fois sans réponse (annulable depuis la fiche). */
export function AutoCloture() {
  const { data, reglages, patch } = useStore();
  useEffect(() => {
    for (const c of data.candidatures) {
      if (doitEtreCloturee(c, data.relances, reglages)) {
        patch("candidatures", c.id, { statut: "sans_reponse", statut_avant: c.statut, cloture_auto: true });
      }
    }
  }, [data.candidatures, data.relances, reglages, patch]);
  return null;
}
