"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type ChoixTheme = "light" | "dark" | "auto";
export const CLE_THEME = "veille-theme";
const COULEURS = { light: "#f4f5f8", dark: "#0e0f14" };

function lire(): ChoixTheme {
  try {
    const v = localStorage.getItem(CLE_THEME);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Pose data-theme sur <html> (absent = automatique) et aligne les balises theme-color. */
function appliquer(choix: ChoixTheme) {
  const racine = document.documentElement;
  if (choix === "auto") racine.removeAttribute("data-theme");
  else racine.setAttribute("data-theme", choix);
  const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  metas.forEach((m, i) => {
    if (m.dataset.media === undefined) m.dataset.media = m.getAttribute("media") ?? "";
    if (choix === "auto") {
      // Valeurs d’origine : une balise claire, une balise sombre, chacune avec sa media query.
      m.setAttribute("media", m.dataset.media);
      m.content = i === 0 ? COULEURS.light : COULEURS.dark;
    } else {
      // Une seule balise reste active : la première pour le clair, la dernière pour le sombre.
      const actif = choix === "light" ? i === 0 : i === metas.length - 1;
      m.setAttribute("media", actif ? "all" : "not all");
      m.content = COULEURS[choix];
    }
  });
}

export function useTheme() {
  const [choix, setChoix] = useState<ChoixTheme>("auto");
  useEffect(() => {
    const c = lire();
    setChoix(c);
    appliquer(c);
  }, []);
  const changer = useCallback((c: ChoixTheme) => {
    setChoix(c);
    appliquer(c);
    try {
      if (c === "auto") localStorage.removeItem(CLE_THEME);
      else localStorage.setItem(CLE_THEME, c);
    } catch {
      /* stockage indisponible : le choix vaut pour cette session seulement */
    }
  }, []);
  return { choix, changer };
}

const OPTIONS: { id: ChoixTheme; label: string; icone: typeof Sun }[] = [
  { id: "light", label: "Clair", icone: Sun },
  { id: "dark", label: "Sombre", icone: Moon },
  { id: "auto", label: "Auto", icone: Monitor },
];

export function SelecteurTheme() {
  const { choix, changer } = useTheme();
  return (
    <div>
      <p className="meta px-2.5 pb-1.5">Thème</p>
      <div className="segment w-full" role="group" aria-label="Thème de l’interface">
        {OPTIONS.map((o) => (
          <button key={o.id} aria-pressed={choix === o.id} onClick={() => changer(o.id)} className="!flex-1 !justify-center" title={o.id === "auto" ? "Automatique (suit le système)" : o.label}>
            <o.icone className="h-3.5 w-3.5" />
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
