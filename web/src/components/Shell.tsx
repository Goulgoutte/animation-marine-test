"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { AutoCloture } from "./AutoCloture";

const icones: Record<string, ReactNode> = {
  veille: <path d="M11 4a7 7 0 1 0 4.2 12.6l4.4 4.4 1.4-1.4-4.4-4.4A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />,
  candidatures: <path d="M4 5h16v3H4V5Zm0 5h10v3H4v-3Zm0 5h16v3H4v-3Z" />,
  contacts: <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.3 3.1-6 7-6s7 2.7 7 6H2Zm15-5c3 0 5 2 5 4.5V20h-4c0-2-.6-3.6-1.7-4.8.2-.1.5-.2.7-.2Z" />,
  reglages: <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM10.6 2h2.8l.5 2.6 1.6.7 2.2-1.5 2 2-1.5 2.2.7 1.6 2.6.5v2.8l-2.6.5-.7 1.6 1.5 2.2-2 2-2.2-1.5-1.6.7-.5 2.6h-2.8l-.5-2.6-1.6-.7-2.2 1.5-2-2 1.5-2.2-.7-1.6L2 13.4v-2.8l2.6-.5.7-1.6-1.5-2.2 2-2 2.2 1.5 1.6-.7L10.6 2Z" />,
};

const liens = [
  { href: "/", cle: "veille", label: "Veille" },
  { href: "/candidatures/", cle: "candidatures", label: "Candidatures" },
  { href: "/contacts/", cle: "contacts", label: "Contacts" },
  { href: "/reglages/", cle: "reglages", label: "Réglages" },
];

export function Shell({ children }: { children: ReactNode }) {
  const chemin = (usePathname() || "/").replace(/\/$/, "") || "/";
  const { demo, erreur, email, deconnexion } = useStore();
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin.startsWith(href.replace(/\/$/, "")));

  return (
    <>
      <AutoCloture />
      {demo && (
        <div className="bg-[var(--color-mustard)] px-4 py-1.5 text-center text-xs font-bold text-[var(--color-ink)]">
          Mode démo : les données restent dans ce navigateur (aucune connexion Supabase configurée).
        </div>
      )}
      <nav className="hidden border-b-[1.5px] border-[var(--color-ink)] md:block" aria-label="Navigation principale">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3">
          <span className="font-serif text-lg font-bold">Veille animation</span>
          <div className="flex gap-1">
            {liens.map((l) => (
              <Link key={l.cle} href={l.href} aria-current={actif(l.href) ? "page" : undefined} className="rounded-full px-3 py-1.5 text-sm font-bold aria-[current=page]:bg-[var(--color-ink)] aria-[current=page]:text-[var(--color-paper)]">
                {l.label}
              </Link>
            ))}
          </div>
          {email && (
            <button onClick={deconnexion} className="bouton bouton-texte bouton-petit ml-auto">Se déconnecter ({email})</button>
          )}
        </div>
      </nav>
      {erreur && <div role="alert" className="bg-[var(--color-red)] px-4 py-2 text-center text-sm font-semibold text-white">{erreur}</div>}
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:px-6 md:pb-16 md:pt-10">{children}</main>
      <nav className="nav-bas md:hidden" aria-label="Navigation principale">
        {liens.map((l) => (
          <Link key={l.cle} href={l.href} aria-current={actif(l.href) ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>{icones[l.cle]}</svg>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
