"use client";

import { useEffect } from "react";
import { imageLiee } from "@/lib/candidature";
import { useStore } from "@/lib/store";

/** Copie sur la candidature l'image de l'offre ou de la production liée : l'URL reste si l'offre quitte la collecte. */
export function AutoImage() {
  const { data, collecte, patch } = useStore();
  useEffect(() => {
    if (!collecte) return;
    for (const c of data.candidatures) {
      if (c.image || (!c.offre_id && !c.production_id)) continue;
      const image = imageLiee(c, collecte, data);
      if (image) patch("candidatures", c.id, { image });
    }
  }, [data, collecte, patch]);
  return null;
}
