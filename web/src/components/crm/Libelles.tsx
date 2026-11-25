"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PALETTE, encre } from "@/lib/crm";
import { uid } from "@/lib/dates";
import type { Libelle } from "@/lib/types";

/** Sélecteur de couleur : la palette en pastilles. */
export function Palette({ valeur, onChange }: { valeur: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 p-1" role="radiogroup" aria-label="Couleur">
      {PALETTE.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={valeur === c} aria-label={c} onClick={() => onChange(c)} className="grid h-6 w-6 place-items-center rounded-md ring-offset-2 ring-offset-[var(--surface)] transition-transform hover:scale-110" style={{ background: c, boxShadow: valeur === c ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}` : undefined, color: encre(c) }}>
          {valeur === c && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </div>
  );
}

/** Édition des libellés d’une colonne : ajouter, renommer, recolorer, supprimer. */
export function EditeurLibelles({ libelles, onSave, onCancel }: { libelles: Libelle[]; onSave: (l: Libelle[]) => void; onCancel: () => void }) {
  const [liste, setListe] = useState<Libelle[]>(libelles);
  const [couleurDe, setCouleurDe] = useState<string | null>(null);
  const maj = (id: string, p: Partial<Libelle>) => setListe((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  function ajouter() {
    const id = uid().slice(0, 8);
    setListe((l) => [...l, { id, label: "", couleur: PALETTE[l.length % PALETTE.length] }]);
  }
  return (
    <div className="p-1">
      <p className="meta mb-2 px-1">Modifier les libellés</p>
      <ul className="space-y-1.5">
        {liste.map((l) => (
          <li key={l.id}>
            <div className="flex items-center gap-1.5">
              <button type="button" aria-label={`Couleur de ${l.label || "ce libellé"}`} onClick={() => setCouleurDe(couleurDe === l.id ? null : l.id)} className="h-7 w-7 flex-none rounded-md border border-black/10" style={{ background: l.couleur }} />
              <input className="champ !h-7 !px-2 !py-0 !text-[13px]" aria-label="Nom du libellé" value={l.label} autoFocus={l.label === ""} placeholder="Nom du libellé" onChange={(e) => maj(l.id, { label: e.target.value })} />
              <button type="button" className="bouton bouton-texte bouton-icone bouton-petit flex-none !shadow-none" aria-label={`Supprimer ${l.label || "ce libellé"}`} onClick={() => setListe((x) => x.filter((y) => y.id !== l.id))}><Trash2 /></button>
            </div>
            {couleurDe === l.id && <Palette valeur={l.couleur} onChange={(c) => { maj(l.id, { couleur: c }); setCouleurDe(null); }} />}
          </li>
        ))}
      </ul>
      <button type="button" className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 font-medium text-accent hover:bg-accent-soft" onClick={ajouter}><Plus className="h-3.5 w-3.5" />Ajouter un libellé</button>
      <div className="mt-2 flex justify-end gap-1.5 border-t border-line pt-2">
        <button type="button" className="bouton bouton-petit" onClick={onCancel}>Annuler</button>
        <button type="button" className="bouton bouton-petit bouton-plein" onClick={() => onSave(liste.filter((l) => l.label.trim()).map((l) => ({ ...l, label: l.label.trim() })))}>Enregistrer</button>
      </div>
    </div>
  );
}
