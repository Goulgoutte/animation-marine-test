"use client";

import { X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Panneau latéral (ordinateur) ou feuille du bas (mobile). */
export function Sheet({ titre, sousTitre, onClose, children, large, pied, pleinMobile }: { titre: string; sousTitre?: ReactNode; onClose: () => void; children: ReactNode; large?: boolean; pied?: ReactNode; pleinMobile?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return createPortal(
    <div className="voile fixed inset-0 z-50 flex items-end justify-end bg-[#0b0c12]/45 backdrop-blur-[2px] md:items-stretch" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={`feuille md:tiroir flex w-full flex-col border border-line bg-surface shadow-[var(--ombre-forte)] md:max-h-none md:rounded-none md:border-y-0 md:border-r-0 ${pleinMobile ? "h-dvh max-h-dvh" : "max-h-[92dvh] rounded-t-3xl"} ${large ? "md:max-w-[640px]" : "md:max-w-[480px]"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h2 className="break-words text-[17px] font-bold leading-tight tracking-tight">{titre}</h2>
            {sousTitre && <div className="mt-0.5 text-[13px] text-muted">{sousTitre}</div>}
          </div>
          <button onClick={onClose} className="bouton bouton-texte bouton-icone -mr-2" aria-label="Fermer"><X /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 pt-4">{children}</div>
        {pied && <div className="border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{pied}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** État vide illustré : icône sur halo, texte, action. */
export function Vide({ titre, children, action, icone: Icone }: { titre: string; children: ReactNode; action?: ReactNode; icone?: LucideIcon }) {
  return (
    <div className="anim-entree flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {Icone && (
        <span className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-accent/25" />
          <span className="absolute -bottom-1 -left-2 h-2 w-2 rounded-full bg-accent/20" />
          <Icone className="h-6 w-6" />
        </span>
      )}
      <p className="text-[15px] font-semibold">{titre}</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">{children}</p>
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
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-medium">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 flex-none rounded-full bg-[color-mix(in_srgb,var(--fg)_18%,transparent)] transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4" />
      {label}
    </label>
  );
}

export function Onglets<T extends string>({ valeur, options, onChange }: { valeur: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segment" role="group">
      {options.map((o) => (
        <button key={o.id} aria-pressed={valeur === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EnTete({ titre, description, droite }: { titre: ReactNode; description?: ReactNode; droite?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="titre-page break-words">{titre}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted">{description}</p>}
      </div>
      {droite && <div className="flex flex-wrap items-center gap-2">{droite}</div>}
    </header>
  );
}

const hue = (s: string) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
export const initiales = (nom: string) =>
  nom.split(/[\s\-·]+/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";

export function Avatar({ nom, taille = 36, url, rond }: { nom: string; taille?: number; url?: string | null; rond?: boolean }) {
  const h = hue(nom);
  const rayon = rond ? "50%" : Math.round(taille * 0.3);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" width={taille} height={taille} className="flex-none object-cover" style={{ width: taille, height: taille, borderRadius: rayon }} />;
  }
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center font-bold"
      style={{
        width: taille, height: taille, borderRadius: rayon, fontSize: Math.round(taille * 0.38),
        background: `hsl(${h} 70% 55% / .16)`, color: `hsl(${h} 55% 42%)`,
      }}
    >
      {initiales(nom)}
    </span>
  );
}

export function Kpi({ label, valeur, icone: Icone, ton = "accent", note, href }: { label: string; valeur: ReactNode; icone: LucideIcon; ton?: "accent" | "danger" | "warn" | "ok" | "info"; note?: ReactNode; href?: string }) {
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={`c-${ton} grid h-8 w-8 flex-none place-items-center rounded-lg bg-[color-mix(in_srgb,var(--c)_14%,transparent)] text-[var(--c)]`}><Icone className="h-4 w-4" /></span>
      </div>
      <p className="kpi mt-3">{valeur}</p>
      {note && <p className="micro mt-1.5">{note}</p>}
    </>
  );
  return href ? <Link href={href} className="carte carte-lien block w-full p-4 text-left">{contenu}</Link> : <div className="carte block w-full p-4">{contenu}</div>;
}

export function Squelette({ className = "" }: { className?: string }) {
  return <div className={`squelette ${className}`} aria-hidden />;
}

/** Écran de chargement : coquille d’app et cartes fantômes. */
export function SqueletteApp() {
  return (
    <div className="min-h-dvh md:pl-60" role="status" aria-label="Chargement">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-3 border-r border-line bg-surface p-4 md:flex">
        <Squelette className="h-8 w-40" />
        <div className="mt-4 space-y-2">{[0, 1, 2, 3, 4].map((i) => <Squelette key={i} className="h-8 w-full" />)}</div>
      </aside>
      <div className="mx-auto max-w-6xl space-y-5 p-4 pt-8 md:p-8">
        <Squelette className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-28 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2"><Squelette className="h-64 rounded-2xl" /><Squelette className="h-64 rounded-2xl" /></div>
      </div>
    </div>
  );
}

/** Image distante avec repli : `null` tant qu’elle est absente ou cassée. */
function useImage(image?: string | null) {
  const [cassee, setCassee] = useState<string | null>(null);
  const [prete, setPrete] = useState<string | null>(null);
  const ok = !!image && cassee !== image;
  return { ok, prete: ok && prete === image, onError: () => setCassee(image ?? null), onLoad: () => setPrete(image ?? null) };
}

/** Vignette carrée (logo du studio ou image) ; repli : avatar à initiales. */
export function Vignette({ image, nom, taille = 36 }: { image?: string | null; nom: string; taille?: number }) {
  const im = useImage(image);
  if (!im.ok) return <Avatar nom={nom} taille={taille} />;
  return (
    <span className={`relative flex-none overflow-hidden shadow-[inset_0_0_0_1px_var(--line)] transition-colors ${im.prete ? "bg-white" : "bg-surface-2"}`} style={{ width: taille, height: taille, borderRadius: Math.round(taille * 0.3) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={taille} height={taille} onError={im.onError} onLoad={im.onLoad}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${im.prete ? "opacity-100" : "opacity-0"}`} />
    </span>
  );
}

/** Visuel 16/9 (production) ; repli : dégradé déterministe, motif de collines et initiales. */
export function Couverture({ image, nom, titre, className = "", grand }: { image?: string | null; nom: string; titre?: string; className?: string; grand?: boolean }) {
  const im = useImage(image);
  const h = 215 + (hue(nom + (titre ?? "")) % 140); // bleus, violets, roses : reste dans la palette de l’app
  const h2 = (h + 48) % 360;
  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-surface-2 ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 85% 0%, hsl(${h2} 85% 72% / .55), transparent 60%), linear-gradient(145deg, hsl(${h} 62% 52%), hsl(${h2} 58% 36%))` }}
      >
        <svg viewBox="0 0 160 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-3/5 w-full">
          <path d="M0 62 C25 40 45 48 70 56 S120 34 160 52 V90 H0Z" fill="#fff" opacity=".12" />
          <path d="M0 74 C30 58 60 70 90 66 S135 56 160 70 V90 H0Z" fill="#000" opacity=".16" />
        </svg>
        <span className={`absolute left-4 top-3 font-extrabold tracking-tight text-white/85 ${grand ? "text-5xl" : "text-3xl"}`}>{initiales(nom)}</span>
      </div>
      {im.ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={640} height={360} onError={im.onError} onLoad={im.onLoad}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${im.prete ? "opacity-100" : "opacity-0"}`} />
      )}
    </div>
  );
}
