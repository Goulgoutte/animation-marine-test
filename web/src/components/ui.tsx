"use client";

import { useEffect, type ReactNode } from "react";

export function Sheet({ titre, onClose, children, large }: { titre: string; onClose: () => void; children: ReactNode; large?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#16130e]/60 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={titre} className={`flex max-h-[94dvh] w-full flex-col rounded-t-3xl bg-[var(--color-paper)] sm:rounded-3xl ${large ? "sm:max-w-3xl" : "sm:max-w-xl"}`}>
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
          <h2 className="titre-l min-w-0 break-words">{titre}</h2>
          <button onClick={onClose} className="bouton bouton-petit" aria-label="Fermer">Fermer</button>
        </div>
        <div className="overflow-y-auto overflow-x-hidden px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

export function Vide({ titre, children, action }: { titre: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="carte border-dashed p-6 text-center sm:p-10">
      <p className="titre-l">{titre}</p>
      <p className="mx-auto mt-2 max-w-md text-[var(--color-mute)]">{children}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Champ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="meta">{label}</span>
      {children}
    </label>
  );
}

export function Interrupteur({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 rounded-full bg-[var(--color-line)] transition peer-checked:bg-[var(--color-teal)] peer-focus-visible:outline peer-focus-visible:outline-2 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function Onglets<T extends string>({ valeur, options, onChange }: { valeur: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="onglets" role="group">
      {options.map((o) => (
        <button key={o.id} aria-pressed={valeur === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EnTete({ surtitre, titre, droite }: { surtitre: string; titre: ReactNode; droite?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="meta">{surtitre}</p>
        <h1 className="titre-xxl mt-1 break-words">{titre}</h1>
      </div>
      {droite}
    </header>
  );
}
