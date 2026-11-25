"use client";

import { Briefcase, Heart, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui";
import { TON_MODE, labelMode } from "@/lib/studios";
import type { ModeStudio, RoleStudio } from "@/lib/types";

export function PastilleMode({ mode }: { mode: ModeStudio }) {
  return <span className={`c-${TON_MODE[mode]} inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--c)]`}><span className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />{labelMode(mode)}</span>;
}

/** Couleur des liens : ami = rose (cœur), contact = indigo (mallette). */
export const STYLE_ROLE: Record<RoleStudio, { couleur: string; icone: typeof Heart }> = {
  ami: { couleur: "var(--danger)", icone: Heart },
  contact: { couleur: "var(--accent)", icone: Briefcase },
};

/**
 * Pastille de personne (ou de studio) : avatar, nom, mention discrète.
 * Survol, focus ou premier toucher : bulle de détail. Clic (ou second toucher) : ouvre la fiche.
 */
export function Pastille({ role, nom, sous, detail, avatar, onOuvrir, onRetirer }: {
  role: RoleStudio; nom: string; sous?: string | null; detail?: string | null; avatar: ReactNode; onOuvrir: () => void; onRetirer?: () => void;
}) {
  const { couleur, icone: Icone } = STYLE_ROLE[role];
  const ref = useRef<HTMLDivElement>(null);
  const [bulle, setBulle] = useState<{ x: number; y: number } | null>(null);
  const tactile = useRef(false);

  const montrer = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r && detail) setBulle({ x: Math.min(Math.max(r.left + r.width / 2, 124), window.innerWidth - 124), y: r.bottom + 8 });
  };
  useEffect(() => {
    if (!bulle) return;
    const fermer = () => setBulle(null);
    window.addEventListener("scroll", fermer, true);
    window.addEventListener("resize", fermer);
    const dehors = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setBulle(null); };
    document.addEventListener("pointerdown", dehors);
    return () => { window.removeEventListener("scroll", fermer, true); window.removeEventListener("resize", fermer); document.removeEventListener("pointerdown", dehors); };
  }, [bulle]);

  return (
    <div ref={ref} className="c-pastille relative inline-flex max-w-full min-w-0 items-center" style={{ "--c": couleur } as React.CSSProperties}
      onPointerEnter={(e) => e.pointerType === "mouse" && montrer()} onPointerLeave={(e) => e.pointerType === "mouse" && setBulle(null)} onPointerDown={(e) => { tactile.current = e.pointerType !== "mouse"; }}>
      <button type="button" aria-label={`Ouvrir ${nom}${detail ? ` : ${detail}` : ""}`} onFocus={(e) => e.currentTarget.matches(":focus-visible") && montrer()} onBlur={() => setBulle(null)}
        onClick={() => { if (tactile.current && detail && !bulle) montrer(); else onOuvrir(); }}
        className={`flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--c)_28%,var(--line))] bg-[color-mix(in_srgb,var(--c)_9%,var(--surface))] py-1 pl-1 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--c)_16%,var(--surface))] ${onRetirer ? "pr-7" : "pr-3"}`}>
        {avatar}
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold">{nom}</span>
          {sous && <span className="block truncate text-[11px] text-muted">{sous}</span>}
        </span>
        <Icone className={`h-3.5 w-3.5 flex-none text-[var(--c)] ${role === "ami" ? "fill-current" : ""}`} aria-hidden />
      </button>
      {onRetirer && (
        <button type="button" aria-label={`Retirer ${nom}`} onClick={onRetirer} className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-[color-mix(in_srgb,var(--fg)_10%,transparent)] hover:text-fg"><X className="h-3 w-3" /></button>
      )}
      {bulle && detail && typeof document !== "undefined" && createPortal(
        <div role="tooltip" className="pointer-events-none fixed z-[70] w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-[12px] font-medium leading-snug text-[var(--surface)] shadow-[var(--ombre-forte)]" style={{ left: bulle.x, top: bulle.y }}>{detail}</div>,
        document.body,
      )}
    </div>
  );
}

/** Pastille « + » en pointillés avec une incitation courte. */
export function PastillePlus({ texte, ouvert, onClick }: { texte: string; ouvert?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-expanded={ouvert} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[color-mix(in_srgb,var(--muted)_50%,var(--line))] px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:border-accent hover:text-accent">
      <Plus className="h-3.5 w-3.5" />{texte}
    </button>
  );
}

/** Petits avatars empilés + compteur, pour les cartes (ex. « 3 amis »). */
export function PileAvatars({ role, noms, total, mot }: { role: RoleStudio; noms: string[]; total: number; mot: string }) {
  const { couleur, icone: Icone } = STYLE_ROLE[role];
  if (total === 0) return null;
  return (
    <span className="inline-flex items-center gap-2" style={{ "--c": couleur } as React.CSSProperties}>
      <span className="flex items-center -space-x-1.5">
        {noms.slice(0, 3).map((n) => <span key={n} className="flex flex-none rounded-full ring-2 ring-[var(--surface)]"><Avatar nom={n} taille={24} rond /></span>)}
      </span>
      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--c)]"><Icone className={`h-3 w-3 ${role === "ami" ? "fill-current" : ""}`} aria-hidden />{total} {mot}{total > 1 ? "s" : ""}</span>
    </span>
  );
}
