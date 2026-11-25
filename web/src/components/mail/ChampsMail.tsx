"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Champ } from "@/components/ui";
import { jeton, type CleVariable, type Replis } from "@/lib/modeles";

/** Sujet + corps modifiables, avec l'alerte des variables vides et leur texte de repli. */
export function ChampsMail({ sujet, corps, onSujet, onCorps, vides, replis, onRepli, modifie, onReset, lignes = 12 }: {
  sujet: string;
  corps: string;
  onSujet: (v: string) => void;
  onCorps: (v: string) => void;
  vides: CleVariable[];
  replis: Replis;
  onRepli: (cle: CleVariable, v: string) => void;
  modifie?: boolean;
  onReset?: () => void;
  lignes?: number;
}) {
  return (
    <div className="grid gap-3">
      {vides.length > 0 && (
        <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] p-3 text-[13px]">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 flex-none text-warn" />{vides.length === 1 ? "Une variable est vide" : `${vides.length} variables sont vides`} : le texte correspondant est omis.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {vides.map((cle) => (
              <label key={cle} className="flex min-w-0 flex-col gap-1">
                <span className="micro"><code>{jeton(cle)}</code>, texte de repli</span>
                <input className="champ !py-1.5" value={replis[cle] ?? ""} onChange={(e) => onRepli(cle, e.target.value)} placeholder="Facultatif" />
              </label>
            ))}
          </div>
        </div>
      )}
      <Champ label="Sujet"><input className="champ" value={sujet} onChange={(e) => onSujet(e.target.value)} /></Champ>
      <Champ label="Message"><textarea className="champ !min-h-0 font-[inherit] leading-relaxed" rows={lignes} value={corps} onChange={(e) => onCorps(e.target.value)} /></Champ>
      {modifie && onReset && <button type="button" className="bouton bouton-petit bouton-texte justify-self-start" onClick={onReset}><RotateCcw />Revenir au modèle</button>}
    </div>
  );
}
