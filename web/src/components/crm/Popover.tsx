"use client";

import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Menu flottant ancré à un élément, hors du défilement du tableau. Se ferme au clic extérieur, sur Échap ou au défilement. */
export function Popover({ ancre, onClose, children, largeur = 240, label, surEchap }: { ancre: HTMLElement | null; onClose: () => void; surEchap?: () => void; children: ReactNode; largeur?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!ancre || !ref.current) return;
    const r = ancre.getBoundingClientRect();
    const h = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.max(8, Math.min(r.left, vw - largeur - 8));
    let top = r.bottom + 4;
    if (top + h > vh - 8) top = r.top - h - 4 >= 8 ? r.top - h - 4 : Math.max(8, vh - h - 8);
    setPos({ left, top, maxH: vh - 16 });
  }, [ancre, largeur, children]);

  useEffect(() => {
    const bas = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || ancre?.contains(t)) return;
      onClose();
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); (surEchap ?? onClose)(); }
    };
    const debut = Date.now();
    // Le défilement qui amène la cellule dans la vue juste avant l’ouverture ne doit pas refermer le menu.
    const defile = (e: Event) => { if (Date.now() - debut > 400 && !ref.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", bas);
    document.addEventListener("keydown", k, true);
    window.addEventListener("scroll", defile, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", bas);
      document.removeEventListener("keydown", k, true);
      window.removeEventListener("scroll", defile, true);
      window.removeEventListener("resize", onClose);
    };
  }, [ancre, onClose, surEchap]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="anim-entree fixed z-[70] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 text-[13px] shadow-[var(--ombre-forte)]"
      style={{ width: largeur, left: pos?.left ?? -9999, top: pos?.top ?? 0, maxHeight: pos?.maxH, visibility: pos ? "visible" : "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function ItemMenu({ icone: Icone, children, onClick, danger, desactive }: { icone?: React.ComponentType<{ className?: string }>; children: ReactNode; onClick: () => void; danger?: boolean; desactive?: boolean }) {
  return (
    <button type="button" disabled={desactive} onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)] disabled:opacity-40 disabled:hover:bg-transparent ${danger ? "text-danger" : ""}`}>
      {Icone && <Icone className="h-4 w-4 flex-none opacity-70" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
