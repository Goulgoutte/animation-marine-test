"use client";

import { Check, Compass, Palette, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { METIERS, METIERS_DEFAUT, labelMetier, metiersSuivis } from "@shared/metiers";
import { Interrupteur, Sheet } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Perimetre as PerimetreReglage } from "@/lib/types";
import { GROUPES_ZONES, ZONES, normaliser, zoneParId, zonesActives } from "@/lib/zones";

/** Lit et enregistre tout de suite le périmètre dans les réglages. */
function usePerimetre() {
  const s = useStore();
  const p = s.reglages.perimetre;
  const zones = zonesActives(p);
  const maj = (x: Partial<PerimetreReglage>) => {
    const { zone: _ancien, ...reste } = p;
    s.saveReglages({ perimetre: { ...reste, zones, ...x } });
  };
  const basculer = (id: string) => maj({ zones: zones.includes(id) ? zones.filter((z) => z !== id) : [...zones, id] });
  const metiers = metiersSuivis(p);
  // Écrire `metiers` remplace l’ancien champ `categorie`
  const majMetiers = (liste: string[]) => {
    const { zone: _ancien, categorie: _cat, ...reste } = p;
    s.saveReglages({ perimetre: { ...reste, zones, metiers: liste } });
  };
  const basculerMetier = (id: string) => majMetiers(METIERS.map((m) => m.id).filter((x) => (x === id ? !metiers.includes(x) : metiers.includes(x))));
  return { p, zones, maj, basculer, metiers, basculerMetier, reinitialiserMetiers: () => majMetiers(METIERS_DEFAUT) };
}

const MOBILE = "(max-width: 767px)";
function useMobile() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MOBILE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
}

function PucesMetiers({ metiers, retirer }: { metiers: string[]; retirer: (id: string) => void }) {
  if (metiers.length === 0) return <span className="micro">Aucun métier : tout est classé dans « Autres ».</span>;
  return (
    <>
      {metiers.map((id) => (
        <span key={id} className="puce !cursor-default gap-1 pr-1" aria-pressed="true">
          {labelMetier(id)}
          <button type="button" onClick={() => retirer(id)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]" aria-label={`Retirer le métier ${labelMetier(id)}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </>
  );
}

function ListeMetiers({ metiers, basculer, reinitialiser }: { metiers: string[]; basculer: (id: string) => void; reinitialiser: () => void }) {
  return (
    <div className="flex min-h-0 flex-col gap-1">
      <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">
        {METIERS.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium hover:bg-surface-2">
            <input type="checkbox" className="h-4 w-4 flex-none accent-[var(--accent)]" checked={metiers.includes(m.id)} onChange={() => basculer(m.id)} />
            <span className="min-w-0 break-words">{m.label}</span>
          </label>
        ))}
      </div>
      <p className="micro px-2">Le classement se fait à l’affichage : aucune collecte n’est relancée.</p>
      <button type="button" className="bouton bouton-texte bouton-petit self-start" onClick={reinitialiser}>Remettre Décor et Concept art</button>
    </div>
  );
}

/** Bouton « Métiers » : cocher ou décocher les métiers suivis (popover sur ordinateur, feuille sur mobile). */
export function BoutonMetiers() {
  const { metiers, basculerMetier, reinitialiserMetiers } = usePerimetre();
  const [ouvert, setOuvert] = useState(false);
  const mobile = useMobile();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert || mobile) return;
    const clic = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOuvert(false);
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert, mobile]);
  const liste = <ListeMetiers metiers={metiers} basculer={basculerMetier} reinitialiser={reinitialiserMetiers} />;
  return (
    <div ref={ref} className="relative">
      <button type="button" className="bouton !px-2.5 !py-1" aria-expanded={ouvert} aria-haspopup="dialog" onClick={() => setOuvert((v) => !v)}>
        <Palette />Métiers
      </button>
      {ouvert && !mobile && (
        <div role="dialog" aria-label="Choisir les métiers" className="feuille absolute left-0 top-full z-40 mt-2 flex max-h-[min(420px,60dvh)] w-[min(340px,calc(100vw-2rem))] flex-col rounded-2xl border border-line bg-surface p-3 shadow-[var(--ombre-forte)]">
          {liste}
        </div>
      )}
      {ouvert && mobile && (
        <Sheet titre="Métiers suivis" sousTitre="Enregistré tout de suite, les compteurs se mettent à jour." onClose={() => setOuvert(false)}
          pied={<button className="bouton bouton-plein w-full" onClick={() => setOuvert(false)}><Check />Terminé</button>}>
          {liste}
        </Sheet>
      )}
    </div>
  );
}

function Puces({ zones, retirer }: { zones: string[]; retirer: (id: string) => void }) {
  if (zones.length === 0) return <span className="micro">Aucune zone : seul le télétravail est affiché.</span>;
  return (
    <>
      {zones.map((id) => (
        <span key={id} className="puce !cursor-default gap-1 pr-1" aria-pressed="true">
          {zoneParId(id)?.label}
          <button type="button" onClick={() => retirer(id)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]" aria-label={`Retirer la zone ${zoneParId(id)?.label}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </>
  );
}

function ListeZones({ zones, basculer }: { zones: string[]; basculer: (id: string) => void }) {
  const [q, setQ] = useState("");
  const t = normaliser(q);
  const visibles = ZONES.filter((z) => !t || normaliser(`${z.label} ${z.motsCles.join(" ")}`).includes(t));
  return (
    <div className="flex min-h-0 flex-col gap-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="champ !pl-9" placeholder="Chercher une zone ou une ville…" aria-label="Chercher une zone" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">
        {GROUPES_ZONES.map((g) => {
          const zs = visibles.filter((z) => z.groupe === g);
          if (zs.length === 0) return null;
          return (
            <fieldset key={g} className="mb-2 min-w-0">
              <legend className="meta mb-1">{g}</legend>
              {zs.map((z) => (
                <label key={z.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium hover:bg-surface-2">
                  <input type="checkbox" className="h-4 w-4 flex-none accent-[var(--accent)]" checked={zones.includes(z.id)} onChange={() => basculer(z.id)} />
                  <span className="min-w-0 break-words">{z.label}</span>
                </label>
              ))}
            </fieldset>
          );
        })}
        {visibles.length === 0 && <p className="micro px-2 py-3">Aucune zone ne correspond.</p>}
      </div>
    </div>
  );
}

function Interrupteurs({ p, maj }: { p: PerimetreReglage; maj: (x: Partial<PerimetreReglage>) => void }) {
  const langue = (l: "fr" | "en", v: boolean) => maj({ langues: v ? [...p.langues.filter((x) => x !== l), l] : p.langues.filter((x) => x !== l) });
  return (
    <>
      <Interrupteur label="Télétravail complet" checked={p.teletravail} onChange={(v) => maj({ teletravail: v })} />
      <Interrupteur label="FR" checked={p.langues.includes("fr")} onChange={(v) => langue("fr", v)} />
      <Interrupteur label="EN" checked={p.langues.includes("en")} onChange={(v) => langue("en", v)} />
      <Interrupteur label="3D" checked={p.afficher3d} onChange={(v) => maj({ afficher3d: v })} />
    </>
  );
}

function ZonePopover({ zones, basculer }: { zones: string[]; basculer: (id: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOuvert(false);
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className="bouton !px-2.5 !py-1" aria-expanded={ouvert} aria-haspopup="dialog" onClick={() => setOuvert((v) => !v)}>
        <Plus />Zone
      </button>
      {ouvert && (
        <div role="dialog" aria-label="Choisir les zones" className="feuille absolute left-0 top-full z-40 mt-2 flex max-h-[min(420px,60dvh)] w-[min(340px,calc(100vw-2rem))] flex-col rounded-2xl border border-line bg-surface p-3 shadow-[var(--ombre-forte)]">
          <ListeZones zones={zones} basculer={basculer} />
        </div>
      )}
    </div>
  );
}

/** Rangée « Périmètre » de la Veille : ordinateur en ligne, mobile derrière un bouton + feuille. */
export function BarrePerimetre() {
  const { p, zones, maj, basculer, metiers, basculerMetier, reinitialiserMetiers } = usePerimetre();
  const [feuille, setFeuille] = useState(false);
  return (
    <>
      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3 md:flex" role="group" aria-label="Périmètre">
        <span className="meta flex items-center gap-1.5"><Compass className="h-3.5 w-3.5" />Périmètre</span>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Puces zones={zones} retirer={basculer} />
          <ZonePopover zones={zones} basculer={basculer} />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Métiers suivis">
          <span className="meta flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" />Métiers</span>
          <PucesMetiers metiers={metiers} retirer={basculerMetier} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><Interrupteurs p={p} maj={maj} /></div>
      </div>

      <div className="border-t border-line pt-3 md:hidden">
        <button type="button" className="bouton w-full" onClick={() => setFeuille(true)}>
          <Compass />Périmètre · {zones.length} {zones.length > 1 ? "zones" : "zone"} · {metiers.length} {metiers.length > 1 ? "métiers" : "métier"}
        </button>
      </div>
      {feuille && (
        <Sheet titre="Périmètre" sousTitre="Enregistré tout de suite, la liste se met à jour." onClose={() => setFeuille(false)}
          pied={<button className="bouton bouton-plein w-full" onClick={() => setFeuille(false)}><Check />Terminé</button>}>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2.5"><Interrupteurs p={p} maj={maj} /></div>
            <div className="flex flex-wrap items-center gap-1.5"><Puces zones={zones} retirer={basculer} /></div>
            <ListeZones zones={zones} basculer={basculer} />
            <div>
              <p className="meta mb-1">Métiers suivis</p>
              <ListeMetiers metiers={metiers} basculer={basculerMetier} reinitialiser={reinitialiserMetiers} />
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
