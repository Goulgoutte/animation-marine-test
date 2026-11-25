"use client";

import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowDown, ArrowUp, BellRing, Briefcase, Check, Columns3, Flag, Plus, Search, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BadgeStatut } from "@/components/BadgeStatut";
import { FicheCandidature } from "@/components/FicheCandidature";
import { Avatar, Champ, EnTete, Kpi, Onglets, Sheet, Vide } from "@/components/ui";
import { nouvelleCandidature } from "@/lib/candidature";
import { diffDays, fmt, fmtCourt, today } from "@/lib/dates";
import { REPONDUES, useIndicateurs } from "@/lib/indicateurs";
import { prochaineRelance, relancesDe } from "@/lib/relances";
import { useStore } from "@/lib/store";
import { CANAUX, STATUTS, labelCanal, type Candidature, type Statut } from "@/lib/types";

type Tri = "studio" | "poste" | "statut" | "envoi" | "canal" | "relance";
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const collision: CollisionDetection = (args) => {
  const p = pointerWithin(args);
  return p.length ? p : rectIntersection(args);
};

export default function Candidatures() {
  const s = useStore();
  const { relancesDues } = useIndicateurs();
  const [vue, setVue] = useState<"tableau" | "kanban">("kanban");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState(false);
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<{ col: Tri; asc: boolean }>({ col: "envoi", asc: false });
  const [glisse, setGlisse] = useState<string | null>(null);
  const { candidatures, relances } = s.data;

  useEffect(() => {
    if (s.focus?.kind === "candidature") {
      setOuverte(s.focus.id);
      s.setFocus(null);
    }
  }, [s.focus, s]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const mois = today().slice(0, 7);
  const envoyees = candidatures.filter((c) => c.date_envoi && c.statut !== "a_preparer");
  const ceMois = envoyees.filter((c) => c.date_envoi!.startsWith(mois)).length;
  const repondues = envoyees.filter((c) => REPONDUES.includes(c.statut)).length;
  const taux = envoyees.length ? Math.round((repondues / envoyees.length) * 100) : null;
  const parCanal = CANAUX.map((c) => ({ ...c, n: envoyees.filter((x) => x.canal === c.id).length })).filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
  const nbDecor = envoyees.filter((x) => x.categorie === "decor").length;
  const nbAutre = envoyees.length - nbDecor;
  const maxCanal = Math.max(1, ...parCanal.map((c) => c.n));

  const filtrees = useMemo(() => {
    const t = norm(q.trim());
    return candidatures.filter((c) => !t || norm(`${c.studio} ${c.poste} ${c.notes ?? ""}`).includes(t));
  }, [candidatures, q]);

  const triees = useMemo(() => {
    const val = (c: Candidature): string | number => {
      switch (tri.col) {
        case "studio": return c.studio.toLowerCase();
        case "poste": return c.poste.toLowerCase();
        case "statut": return STATUTS.findIndex((x) => x.id === c.statut);
        case "envoi": return c.date_envoi ?? "";
        case "canal": return labelCanal(c.canal);
        case "relance": return prochaineRelance(c, relances, s.reglages) ?? "9999";
      }
    };
    return [...filtrees].sort((a, b) => {
      const x = val(a), y = val(b);
      const r = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y), "fr");
      return tri.asc ? r : -r;
    });
  }, [filtrees, tri, relances, s.reglages]);

  const courante = candidatures.find((c) => c.id === ouverte) ?? null;
  const enGlisse = candidatures.find((c) => c.id === glisse) ?? null;

  function creer(p: Partial<Candidature>) {
    const c = s.add("candidatures", nouvelleCandidature(p));
    setNouvelle(false);
    setOuverte(c.id);
  }
  function changerStatut(c: Candidature, statut: Statut) {
    if (c.statut === statut) return;
    const p: Partial<Candidature> = { statut, cloture_auto: false };
    if ((statut === "envoyee" || statut === "relancee") && !c.date_envoi) p.date_envoi = today();
    s.patch("candidatures", c.id, p);
  }
  function relancer(c: Candidature) {
    s.add("relances", { candidature_id: c.id, date: today(), canal: "mail", note: null });
    s.patch("candidatures", c.id, { statut: "relancee", cloture_auto: false, cloture_annulee: false });
  }
  function finGlisse(e: DragEndEvent) {
    setGlisse(null);
    const c = candidatures.find((x) => x.id === e.active.id);
    const cible = e.over?.id as Statut | undefined;
    if (c && cible && STATUTS.some((x) => x.id === cible)) changerStatut(c, cible);
  }
  const trier = (col: Tri) => setTri((t) => (t.col === col ? { col, asc: !t.asc } : { col, asc: true }));

  return (
    <>
      <EnTete
        titre="Candidatures"
        description={relancesDues.length > 0 ? <><strong className="font-semibold text-danger">{relancesDues.length}</strong> à relancer aujourd’hui</> : "Suivi de tes envois et de tes relances"}
        droite={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}><Plus />Candidature</button>}
      />

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Envoyées ce mois" valeur={ceMois} icone={Briefcase} ton="accent" note={`${envoyees.length} au total`} />
        <Kpi label="Taux de réponse" valeur={taux === null ? "—" : <>{taux}<span className="text-xl text-muted"> %</span></>} icone={Flag} ton="info" note={`${repondues} réponse${repondues > 1 ? "s" : ""} sur ${envoyees.length} envoyée${envoyees.length > 1 ? "s" : ""}`} />
        <div className="carte p-4">
          <p className="text-[13px] font-medium text-muted">Par canal</p>
          <ul className="mt-2.5 space-y-1.5">
            {parCanal.length === 0 && <li className="micro">Rien d’envoyé pour l’instant.</li>}
            {parCanal.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[12.5px]">
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span className="h-1.5 w-12 flex-none overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]"><span className="block h-full rounded-full bg-accent" style={{ width: `${(c.n / maxCanal) * 100}%` }} /></span>
                <strong className="w-4 text-right">{c.n}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="carte p-4">
          <p className="text-[13px] font-medium text-muted">Par catégorie</p>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]">
            <span className="bg-accent" style={{ width: `${envoyees.length ? (nbDecor / envoyees.length) * 100 : 0}%` }} />
            <span className="bg-info/60" style={{ width: `${envoyees.length ? (nbAutre / envoyees.length) * 100 : 0}%` }} />
          </div>
          <ul className="mt-3 space-y-1 text-[12.5px]">
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="pastille bg-accent" />Décor</span><strong>{nbDecor}</strong></li>
            <li className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="pastille bg-info/60" />Autres métiers</span><strong>{nbAutre}</strong></li>
          </ul>
        </div>
      </section>

      <section aria-label="À relancer aujourd’hui" className="mt-5">
        {relancesDues.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">
            <Check className="h-4 w-4 flex-none text-ok" />
            Rien à relancer. Une candidature envoyée apparaît ici après {s.reglages.delai_relance_1} jours ouvrés, puis {s.reglages.delai_relance_2}.
          </p>
        ) : (
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,var(--line))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface))] p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-danger"><BellRing className="h-4 w-4" />À relancer aujourd’hui <span className="badge badge-plein c-danger">{relancesDues.length}</span></h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {relancesDues.map((c) => {
                const p = prochaineRelance(c, relances, s.reglages)!;
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2.5">
                    <button onClick={() => setOuverte(c.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <Avatar nom={c.studio || "?"} taille={32} />
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px]">{c.studio || "Sans studio"}</strong>
                        <span className="micro block break-words">envoyée le {fmtCourt(c.date_envoi)} · {relancesDe(c, relances).length} relance(s) · {p < today() ? `depuis le ${fmtCourt(p)}` : "aujourd’hui"}</span>
                      </span>
                    </button>
                    <button className="bouton bouton-petit flex-none" onClick={() => relancer(c)}><Check />Relancé</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="mb-3 mt-6 flex flex-wrap items-center gap-2.5">
        <Onglets valeur={vue} onChange={setVue} options={[{ id: "kanban", label: <><Columns3 className="h-3.5 w-3.5" />Kanban</> }, { id: "tableau", label: <><Table2 className="h-3.5 w-3.5" />Tableau</> }]} />
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="champ !pl-9" placeholder="Filtrer par studio ou poste…" aria-label="Filtrer les candidatures" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {candidatures.length === 0 ? (
        <Vide icone={Briefcase} titre="Aucune candidature" action={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}><Plus />Créer une candidature</button>}>
          Depuis la Veille, « Ajouter à mes candidatures » ou « Préparer une candidature spontanée » crée une fiche préremplie. Tu peux aussi en créer une ici.
        </Vide>
      ) : filtrees.length === 0 ? (
        <Vide icone={Search} titre="Aucun résultat">Aucune candidature ne correspond à « {q} ».</Vide>
      ) : vue === "kanban" ? (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={(e: DragStartEvent) => setGlisse(String(e.active.id))} onDragEnd={finGlisse} onDragCancel={() => setGlisse(null)}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0" style={{ scrollSnapType: "x proximity" }}>
            {STATUTS.map((st) => (
              <Colonne key={st.id} id={st.id} label={st.label} couleur={st.couleur} liste={filtrees.filter((c) => c.statut === st.id)} onOuvrir={setOuverte} />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180 }}>{enGlisse ? <CarteContenu c={enGlisse} apercu /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[760px]">
            <thead>
              <tr>
                {([["studio", "Studio"], ["poste", "Poste"], ["statut", "Statut"], ["envoi", "Envoi"], ["canal", "Canal"], ["relance", "Prochaine relance"]] as [Tri, string][]).map(([col, lib]) => (
                  <th key={col} aria-sort={tri.col === col ? (tri.asc ? "ascending" : "descending") : "none"}>
                    <button onClick={() => trier(col)} className="inline-flex items-center gap-1 uppercase tracking-[.04em] hover:text-fg">
                      {lib}{tri.col === col && (tri.asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {triees.map((c) => {
                const p = prochaineRelance(c, relances, s.reglages);
                return (
                  <tr key={c.id} data-cliquable onClick={() => setOuverte(c.id)}>
                    <td><span className="flex items-center gap-2.5"><Avatar nom={c.studio || "?"} taille={28} /><strong className="font-semibold">{c.studio || "—"}</strong></span></td>
                    <td className="max-w-[260px] truncate text-muted">{c.poste}</td>
                    <td><BadgeStatut statut={c.statut} /></td>
                    <td className="whitespace-nowrap">{fmt(c.date_envoi)}</td>
                    <td className="whitespace-nowrap">{labelCanal(c.canal)}</td>
                    <td className={`whitespace-nowrap ${p && p <= today() ? "font-semibold text-danger" : ""}`}>{p ? fmt(p) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {courante && <FicheCandidature c={courante} onClose={() => setOuverte(null)} />}
      {nouvelle && (
        <Sheet titre="Nouvelle candidature" onClose={() => setNouvelle(false)}>
          <NouvelleRapide onCreer={creer} />
        </Sheet>
      )}
    </>
  );
}

function Colonne({ id, label, couleur, liste, onOuvrir }: { id: Statut; label: string; couleur: string; liste: Candidature[]; onOuvrir: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex w-[272px] flex-none flex-col rounded-2xl border p-2 transition-colors duration-150 ${isOver ? "border-accent bg-accent-soft" : "border-transparent bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]"}`} style={{ scrollSnapAlign: "start" }}>
      <div className="mb-2 flex items-center gap-2 px-1.5 pt-1">
        <span className="pastille" style={{ background: couleur }} />
        <h3 className="flex-1 text-[13px] font-semibold">{label}</h3>
        <span className="rounded-full bg-surface px-2 text-[12px] font-semibold text-muted shadow-[var(--ombre)]">{liste.length}</span>
      </div>
      <ul className="flex min-h-24 flex-1 flex-col gap-2">
        {liste.length === 0 && <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-line px-3 py-6 text-center text-[12px] text-muted">Dépose une candidature ici</li>}
        {liste.map((c) => <li key={c.id}><CarteKanban c={c} onOuvrir={() => onOuvrir(c.id)} /></li>)}
      </ul>
    </div>
  );
}

// La carte glissable. L'aperçu affiché pendant le glisser (DragOverlay) utilise CarteContenu
// seul : rappeler useDraggable avec le même id dans l'aperçu casse le glisser-déposer (dnd-kit).
function CarteKanban({ c, onOuvrir }: { c: Candidature; onOuvrir: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onOuvrir} className={`touch-manipulation ${isDragging ? "opacity-30" : ""}`}>
      <CarteContenu c={c} />
    </div>
  );
}

function CarteContenu({ c, apercu }: { c: Candidature; apercu?: boolean }) {
  const s = useStore();
  const p = prochaineRelance(c, s.data.relances, s.reglages);
  const due = !!p && p <= today();
  const jours = c.date_envoi ? diffDays(today(), c.date_envoi) : null;
  return (
    <div
      className={`carte carte-lien cursor-grab select-none p-3 active:cursor-grabbing ${apercu ? "rotate-2 cursor-grabbing shadow-[var(--ombre-forte)]" : ""}`}
      style={{ borderLeft: due ? "3px solid var(--danger)" : undefined }}
    >
      <div className="flex items-start gap-2.5">
        <Avatar nom={c.studio || "?"} taille={32} />
        <div className="min-w-0 flex-1">
          <strong className="block break-words text-[13.5px] leading-tight">{c.studio || "Sans studio"}</strong>
          <span className="micro line-clamp-2 break-words">{c.poste}</span>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="badge c-mute">{labelCanal(c.canal)}</span>
        {c.categorie === "decor" && <span className="badge c-accent">Décor</span>}
        {due && <span className="badge c-danger"><BellRing />À relancer</span>}
      </div>
      <p className="micro mt-2">{jours === null ? "Pas encore envoyée" : jours === 0 ? "Envoyée aujourd’hui" : `Envoyée il y a ${jours} j`}</p>
    </div>
  );
}

function NouvelleRapide({ onCreer }: { onCreer: (p: Partial<Candidature>) => void }) {
  const [studio, setStudio] = useState("");
  const [poste, setPoste] = useState("");
  const [spont, setSpont] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCreer({ studio, poste: poste || (spont ? "Candidature spontanée" : ""), type: spont ? "spontanee" : "offre" });
      }}
    >
      <Champ label="Studio"><input className="champ" required value={studio} onChange={(e) => setStudio(e.target.value)} autoFocus /></Champ>
      <Champ label="Poste"><input className="champ" value={poste} onChange={(e) => setPoste(e.target.value)} /></Champ>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--accent)]" checked={spont} onChange={(e) => setSpont(e.target.checked)} /> Candidature spontanée</label>
      <button className="bouton bouton-plein">Créer et ouvrir la fiche</button>
    </form>
  );
}
