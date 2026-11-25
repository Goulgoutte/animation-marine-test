"use client";

import { Briefcase, ChevronsUpDown, Home, LogOut, MoreHorizontal, Radar, Search, Settings, Users, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIndicateurs } from "@/lib/indicateurs";
import { useStore } from "@/lib/store";
import { AutoCloture } from "./AutoCloture";
import { Logo } from "./Logo";
import { Recherche } from "./Recherche";
import { SelecteurTheme } from "./Theme";
import { Avatar, Sheet } from "./ui";

const liens = [
  { href: "/", cle: "accueil", label: "Tableau de bord", court: "Accueil", icone: Home },
  { href: "/veille/", cle: "veille", label: "Veille", court: "Veille", icone: Radar },
  { href: "/candidatures/", cle: "candidatures", label: "Candidatures", court: "Candidatures", icone: Briefcase },
  { href: "/contacts/", cle: "contacts", label: "Contacts", court: "Contacts", icone: Users },
  { href: "/reglages/", cle: "reglages", label: "Réglages", court: "Réglages", icone: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const chemin = (usePathname() || "/").replace(/\/$/, "") || "/";
  const { demo, erreur, profil } = useStore();
  const { compteurs } = useIndicateurs();
  const [recherche, setRecherche] = useState(false);
  const [plus, setPlus] = useState(false);
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin.startsWith(href.replace(/\/$/, "")));
  const nb = (cle: string) => (cle === "veille" ? compteurs.veille : cle === "candidatures" ? compteurs.candidatures : cle === "contacts" ? compteurs.contacts : 0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecherche((v) => !v);
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);

  const principaux = liens.filter((l) => l.cle !== "reglages");

  return (
    <>
      <AutoCloture />

      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex" aria-label="Navigation principale">
        <div className="px-4 pb-3 pt-5"><Logo /></div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-2">
          <p className="meta px-2.5 pb-1.5">Menu</p>
          {liens.map((l) => {
            const n = nb(l.cle);
            return (
              <Link key={l.cle} href={l.href} className="nav-item" aria-current={actif(l.href) ? "page" : undefined}>
                <l.icone />
                <span className="flex-1">{l.label}</span>
                {n > 0 && <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-1.5 text-[11px] font-bold leading-5 text-accent">{n}</span>}
              </Link>
            );
          })}
        </nav>
        {demo && (
          <div className="m-3 rounded-xl bg-accent-soft p-3 text-[12px] leading-snug text-accent">
            <p className="flex items-center gap-1.5 font-semibold"><FlaskConical className="h-3.5 w-3.5" /> Mode démo</p>
            <p className="mt-1 opacity-80">Les données restent dans ce navigateur.</p>
          </div>
        )}
      </aside>

      <div className="md:pl-60">
        {/* Barre du haut : ordinateur */}
        <header className="sticky top-0 z-20 hidden h-14 items-center gap-3 border-b border-line bg-bg/85 px-6 backdrop-blur md:flex">
          <button onClick={() => setRecherche(true)} className="group flex h-9 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-surface px-3 text-[13px] text-muted shadow-[var(--ombre)] transition-colors hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--line))]" aria-label="Rechercher">
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Rechercher une offre, une production, un contact…</span>
            <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold">⌘K</kbd>
          </button>
          <div className="ml-auto"><MenuProfil /></div>
        </header>

        {/* Barre d’app : mobile */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg/90 px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur md:hidden">
          <span className="min-w-0 flex-1"><Logo taille={30} /></span>
          <button onClick={() => setRecherche(true)} className="bouton bouton-texte bouton-icone" aria-label="Rechercher"><Search className="!h-5 !w-5" /></button>
          <MenuProfil />
        </header>

        {demo && <p className="mx-4 mt-3 rounded-lg bg-accent-soft px-3 py-1.5 text-center text-[12px] font-medium text-accent md:hidden">Mode démo : données gardées dans ce navigateur.</p>}
        {erreur && <div role="alert" className="mx-4 mt-3 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white md:mx-6">{erreur}</div>}

        <main className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(88px+env(safe-area-inset-bottom))] pt-5 md:px-6 md:pb-12 md:pt-7">
          <div key={chemin} className="anim-entree min-w-0">{children}</div>
        </main>
      </div>

      {/* Barre d’onglets : mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Navigation principale">
        {principaux.map((l) => {
          const n = nb(l.cle);
          return (
            <Link key={l.cle} href={l.href} className="onglet-bas" aria-current={actif(l.href) ? "page" : undefined}>
              <span className="relative">
                <l.icone />
                {n > 0 && <span className="absolute -right-2.5 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9.5px] font-bold leading-4 text-white">{n}</span>}
              </span>
              {l.court}
            </Link>
          );
        })}
        <button className="onglet-bas" onClick={() => setPlus(true)} aria-current={actif("/reglages/") ? "page" : undefined}>
          <MoreHorizontal />
          Plus
        </button>
      </nav>

      {recherche && <Recherche onClose={() => setRecherche(false)} />}
      {plus && <FeuillePlus onClose={() => setPlus(false)} onRecherche={() => { setPlus(false); setRecherche(true); }} profil={profil?.prenom ?? null} />}
    </>
  );
}

function FeuillePlus({ onClose, onRecherche, profil }: { onClose: () => void; onRecherche: () => void; profil: string | null }) {
  const { deconnexion, demo, profil: p } = useStore();
  return (
    <Sheet titre="Plus" sousTitre={profil ? `Connectée : ${p?.nom ?? profil}` : undefined} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <div className="mb-1"><SelecteurTheme /></div>
        <button onClick={onRecherche} className="nav-item w-full text-left"><Search />Rechercher</button>
        <Link href="/reglages/" onClick={onClose} className="nav-item"><Settings />Réglages</Link>
        {!demo && <button onClick={deconnexion} className="nav-item w-full text-left !text-danger"><LogOut />Déconnexion</button>}
      </div>
    </Sheet>
  );
}

function MenuProfil() {
  const { profil, deconnexion, demo } = useStore();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const f = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOuvert(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", f);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", f);
      document.removeEventListener("keydown", k);
    };
  }, [ouvert]);
  const nom = profil?.nom ?? profil?.email ?? "Moi";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOuvert((v) => !v)} className="flex items-center gap-2 rounded-xl p-1 pr-2 transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]" aria-haspopup="menu" aria-expanded={ouvert} aria-label="Menu du compte">
        <Avatar nom={nom} url={profil?.avatar} taille={30} rond />
        <span className="hidden text-[13px] font-semibold md:inline">{profil?.prenom ?? "Moi"}</span>
        <ChevronsUpDown className="hidden h-3.5 w-3.5 text-muted md:block" />
      </button>
      {ouvert && (
        <div role="menu" className="feuille absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--ombre-forte)]" style={{ animationName: "entree" }}>
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar nom={nom} url={profil?.avatar} taille={36} rond />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{profil?.nom ?? "Utilisatrice"}</p>
              <p className="micro truncate">{profil?.email ?? (demo ? "Mode démo" : "")}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line" />
          <div className="px-1 pb-1.5 pt-1"><SelecteurTheme /></div>
          <div className="my-1 h-px bg-line" />
          <Link href="/reglages/" role="menuitem" onClick={() => setOuvert(false)} className="nav-item"><Settings />Réglages</Link>
          {!demo && <button role="menuitem" onClick={deconnexion} className="nav-item w-full text-left hover:!text-danger"><LogOut />Déconnexion</button>}
        </div>
      )}
    </div>
  );
}
