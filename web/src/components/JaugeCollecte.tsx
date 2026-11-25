"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COULEUR_NIVEAU, useJauge } from "@/lib/jauge";
import { useStore } from "@/lib/store";

const heure = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const pct = (r: number) => `${Math.round(r * 100)} %`;
const LIBELLE_NIVEAU = { vert: "Tout va bien, large marge", orange: "À surveiller", rouge: "Plafond dépassé en estimation" } as const;

/**
 * Jauge flottante de la charge de collecte (comme des crédits d’utilisation) : estimation par jour d’après les sources
 * actives et leurs fréquences, comparée aux plafonds par domaine. Purement informative : rien ne lance de collecte.
 */
export function JaugeCollecte() {
  const j = useJauge();
  const { collecte } = useStore();
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

  if (!collecte) return null;
  const couleur = COULEUR_NIVEAU[j.niveau];
  const noms = new Map(collecte.sources.sources.map((x) => [x.id, x.nom]));

  return (
    <div ref={ref} className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-3 z-40 md:bottom-4 md:right-4">
      {ouvert && (
        <div role="dialog" aria-label="Charge de collecte" className="feuille absolute bottom-full right-0 mb-2 max-h-[min(70dvh,560px)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-4 shadow-[var(--ombre-forte)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="titre-section">Charge de collecte</h2>
              <p className="micro mt-0.5">Estimation par jour, d’après tes sources actives et leurs fréquences.</p>
            </div>
            <button type="button" className="bouton bouton-texte bouton-icone bouton-petit flex-none" aria-label="Fermer" onClick={() => setOuvert(false)}><X /></button>
          </div>

          <div className="mt-3 rounded-xl bg-surface-2 p-3">
            <p className="flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold leading-none" style={{ color: couleur }}>{pct(j.ratio)}</span>
              <span className="text-[12.5px] font-semibold" style={{ color: couleur }}>{LIBELLE_NIVEAU[j.niveau]}</span>
            </p>
            <p className="micro mt-1">
              {j.pire ? <>Domaine le plus sollicité : <b className="text-fg">{j.pire.domaine}</b>, {j.pire.requetes} requêtes prévues par jour pour un plafond de {j.pire.plafond}.</> : "Aucune source active."}
            </p>
          </div>

          <p className="meta mb-1.5 mt-4">Domaines les plus sollicités</p>
          <ul className="grid gap-2">
            {j.charge.slice(0, 4).map((c) => (
              <li key={c.domaine}>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 truncate font-semibold">{c.domaine}</span>
                  <span className="micro flex-none">{c.requetes} / {c.plafond} par jour{j.aujourdhui ? ` · ${j.aujourdhui[c.domaine] ?? 0} aujourd’hui` : ""}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_10%,transparent)]" role="presentation">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(c.ratio, 1) * 100}%`, background: COULEUR_NIVEAU[c.ratio < 0.5 ? "vert" : c.ratio <= 0.85 ? "orange" : "rouge"] }} />
                </div>
              </li>
            ))}
            {j.charge.length === 0 && <li className="micro">Rien n’est collecté pour l’instant.</li>}
          </ul>

          <p className="meta mb-1 mt-4">Prochaine collecte prévue</p>
          <p className="text-[13px] font-semibold">{heure(j.prochaine)}</p>
          <p className="micro">{j.nbDues} source{j.nbDues > 1 ? "s" : ""} à relire à ce passage ; les autres attendent que leur fréquence soit échue.</p>

          <p className="meta mb-1.5 mt-4">Dernières collectes</p>
          {j.historique.length === 0 ? (
            <p className="micro">Pas encore d’historique : il se remplit à partir de la prochaine collecte.</p>
          ) : (
            <ul className="grid gap-1.5">
              {j.historique.slice(0, 5).map((h) => (
                <li key={h.date} className="flex flex-wrap items-baseline justify-between gap-x-2 text-[12.5px]">
                  <span className="font-semibold">{heure(h.date)}{h.partielle ? " (partielle)" : ""}</span>
                  <span className="micro">{h.requetes} requête{h.requetes > 1 ? "s" : ""} · {h.sources} source{h.sources > 1 ? "s" : ""}{h.sautees.length ? ` · ${h.sautees.length} sautée${h.sautees.length > 1 ? "s" : ""} (${h.sautees.map((id) => noms.get(id) ?? id).join(", ")})` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          {j.sourcesSautees.length > 0 && <p className="mt-2 rounded-lg bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] p-2 text-[12.5px] text-warn">Sautée au dernier passage (plafond atteint) : {j.sourcesSautees.map((x) => x.nom).join(", ")}.</p>}

          <p className="mt-4 rounded-xl border border-line p-3 text-[12.5px] leading-snug">
            <b>Changer tes métiers, zones ou filtres ne relance aucune collecte.</b> Seul le workflow GitHub collecte, toutes les 3 h, et une source n’est relue que si sa fréquence est échue. Le robots.txt est respecté, avec une requête toutes les 3 s par domaine.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        aria-label={`Charge de collecte : ${pct(j.ratio)} du plafond du domaine le plus sollicité`}
        className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2 text-[11px] font-bold shadow-[var(--ombre)] backdrop-blur transition-colors hover:bg-surface-2"
      >
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: couleur }} aria-hidden />
        <span style={{ color: couleur }}>{pct(j.ratio)}</span>
      </button>
    </div>
  );
}
