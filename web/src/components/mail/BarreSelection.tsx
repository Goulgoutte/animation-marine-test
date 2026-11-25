"use client";

import { Mail, X } from "lucide-react";

/** Barre collante du mode sélection : compte, tout/aucun, « Préparer N mails ». */
export function BarreSelection({ n, total, onTout, onAucun, onPreparer, onAnnuler }: { n: number; total: number; onTout: () => void; onAucun: () => void; onPreparer: () => void; onAnnuler: () => void }) {
  return (
    <div role="region" aria-label="Sélection pour l’envoi groupé" className="sticky bottom-[calc(68px+env(safe-area-inset-bottom))] z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 shadow-[var(--ombre-forte)] md:bottom-4">
      <p className="min-w-0 flex-1 basis-32 pl-1.5 text-[13px] font-semibold">{n} sélectionné{n > 1 ? "s" : ""}<span className="micro font-normal"> sur {total}</span></p>
      <button className="bouton bouton-petit bouton-texte" onClick={n === total ? onAucun : onTout}>{n === total ? "Aucun" : "Tout"}</button>
      <button className="bouton bouton-plein" disabled={n === 0} onClick={onPreparer}><Mail />Préparer {n} mail{n > 1 ? "s" : ""}</button>
      <button className="bouton bouton-icone bouton-texte" aria-label="Quitter la sélection" onClick={onAnnuler}><X /></button>
    </div>
  );
}
