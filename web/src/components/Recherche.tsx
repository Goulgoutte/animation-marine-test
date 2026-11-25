"use client";

import { Briefcase, CornerDownLeft, Film, Radar, Search, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useIndicateurs } from "@/lib/indicateurs";
import { useStore, type Focus } from "@/lib/store";
import { labelStatut } from "@/lib/types";

interface Res { cle: string; groupe: string; icone: LucideIcon; titre: string; sous: string; focus: Focus }

const CHEMIN: Record<Focus["kind"], string> = { offre: "/veille/", production: "/veille/", candidature: "/candidatures/", contact: "/contacts/" };
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function Recherche({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const { offres, prods } = useIndicateurs();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const liste = useRef<HTMLUListElement>(null);

  const resultats = useMemo<Res[]>(() => {
    const t = norm(q.trim());
    if (!t) return [];
    const ok = (...c: (string | null | undefined)[]) => norm(c.filter(Boolean).join(" ")).includes(t);
    const out: Res[] = [];
    offres.filter((o) => !o.masquee && ok(o.titre, o.studio, o.production, o.lieu)).slice(0, 5).forEach((o) =>
      out.push({ cle: `o${o.id}`, groupe: "Offres", icone: Radar, titre: o.titre, sous: [o.studio, o.lieu].filter(Boolean).join(" · "), focus: { kind: "offre", id: o.id } }));
    prods.filter((p) => !p.masquee && ok(p.titre, p.producteurs.join(" "), p.studiosFabrication.join(" "), p.realisateur)).slice(0, 5).forEach((p) =>
      out.push({ cle: `p${p.id}`, groupe: "Productions", icone: Film, titre: p.titre, sous: [p.producteurs[0], p.statut !== "inconnu" ? p.statut : null].filter(Boolean).join(" · "), focus: { kind: "production", id: p.id } }));
    s.data.candidatures.filter((c) => ok(c.studio, c.poste, c.notes)).slice(0, 5).forEach((c) =>
      out.push({ cle: `c${c.id}`, groupe: "Candidatures", icone: Briefcase, titre: c.studio || "Sans studio", sous: `${c.poste} · ${labelStatut(c.statut)}`, focus: { kind: "candidature", id: c.id } }));
    s.data.contacts.filter((c) => ok(c.prenom, c.nom, c.structure, c.fonction, c.etiquettes.join(" "))).slice(0, 5).forEach((c) =>
      out.push({ cle: `k${c.id}`, groupe: "Contacts", icone: Users, titre: `${c.prenom} ${c.nom}`.trim(), sous: [c.fonction, c.structure].filter(Boolean).join(" · "), focus: { kind: "contact", id: c.id } }));
    return out;
  }, [q, offres, prods, s.data.candidatures, s.data.contacts]);

  useEffect(() => setCur(0), [q]);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cur]);

  function aller(r: Res) {
    s.setFocus(r.focus);
    router.push(CHEMIN[r.focus.kind]);
    onClose();
  }
  function touche(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(resultats.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter" && resultats[cur]) aller(resultats[cur]);
  }

  let groupePrec = "";
  return createPortal(
    <div className="voile fixed inset-0 z-[60] flex items-start justify-center bg-[#0b0c12]/50 p-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-[2px] md:pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Recherche" onKeyDown={touche} className="feuille flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--ombre-forte)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 flex-none text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Offres, productions, candidatures, contacts…" aria-label="Recherche globale" className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" />
          <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted sm:block">Échap</kbd>
        </div>
        <ul ref={liste} className="min-h-0 flex-1 overflow-y-auto p-2">
          {!q.trim() && <li className="px-3 py-8 text-center text-[13px] text-muted">Tape un studio, un titre, un nom… Résultats dans tes offres, productions, candidatures et contacts.</li>}
          {q.trim() && resultats.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted">Rien ne correspond à « {q} ».</li>}
          {resultats.map((r, i) => {
            const entete = r.groupe !== groupePrec;
            groupePrec = r.groupe;
            return (
              <li key={r.cle}>
                {entete && <p className="meta px-3 pb-1 pt-3">{r.groupe}</p>}
                <button data-i={i} onClick={() => aller(r)} onMouseMove={() => setCur(i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === cur ? "bg-accent-soft" : ""}`}>
                  <r.icone className="h-4 w-4 flex-none text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{r.titre}</span>
                    {r.sous && <span className="micro block truncate">{r.sous}</span>}
                  </span>
                  {i === cur && <CornerDownLeft className="h-3.5 w-3.5 flex-none text-muted" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
