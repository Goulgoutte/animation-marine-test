"use client";

import { BellRing, Briefcase, CalendarCheck, CheckCheck, CheckSquare, Clock, Plus, Search, Send } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DialogueAction, LigneCandidature, useActionsCandidature } from "@/components/LigneCandidature";
import { FicheCandidature } from "@/components/FicheCandidature";
import { AssistantMail } from "@/components/mail/AssistantMail";
import { BarreSelection } from "@/components/mail/BarreSelection";
import { useMail } from "@/components/mail/useMail";
import { Champ, EnTete, Onglets, Sheet, Vide } from "@/components/ui";
import { SEUIL_STAGNE, derniereActivite, estCloturee, prochaineAction, sectionDe, stagne, type Section } from "@/lib/actions";
import { nouvelleCandidature } from "@/lib/candidature";
import { addDays, fmtCourt, today } from "@/lib/dates";
import { REPONDUES } from "@/lib/indicateurs";
import { useStore } from "@/lib/store";
import type { Candidature } from "@/lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const SECTIONS: { id: Exclude<Section, "cloturee">; titre: string; aide: string }[] = [
  { id: "faire", titre: "À faire maintenant", aide: "À préparer, relances dues, actions échues" },
  { id: "attente", titre: "En attente de réponse", aide: "Envoyées, rien à faire pour l’instant" },
  { id: "cours", titre: "En cours", aide: "Entretiens et tests" },
];

export default function Candidatures() {
  const s = useStore();
  const actions = useActionsCandidature();
  const [onglet, setOnglet] = useState<"actives" | "cloturees">("actives");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState(false);
  const [q, setQ] = useState("");
  const [seulementStagne, setSeulementStagne] = useState(false);
  const [selection, setSelection] = useState<Set<string> | null>(null); // mode sélection (envoi groupé)
  const [assistant, setAssistant] = useState(false);
  const mail = useMail();
  const { candidatures, relances } = s.data;

  useEffect(() => {
    if (s.focus?.kind === "candidature") {
      setOuverte(s.focus.id);
      s.setFocus(null);
    }
  }, [s.focus, s]);

  // Revue de la semaine (du lundi au dimanche)
  const revue = useMemo(() => {
    const t = today();
    const lundi = addDays(t, -((new Date().getDay() + 6) % 7));
    const cetteSemaine = (d: string | null | undefined) => !!d && d >= lundi && d <= t;
    const envoyees = candidatures.filter((c) => c.statut !== "a_preparer" && cetteSemaine(c.date_envoi)).length;
    const relancesFaites = relances.filter((r) => cetteSemaine(r.date)).length;
    const reponses = candidatures.filter((c) => REPONDUES.includes(c.statut) && cetteSemaine(c.date_statut)).length;
    const entretiens = candidatures.filter((c) => c.statut === "entretien");
    const prochainEntretien = entretiens.map((c) => c.prochaine_action_date).filter((d): d is string => !!d && d >= t).sort()[0] ?? null;
    const stagnantes = candidatures.filter((c) => stagne(c, relances)).length;
    return { envoyees, relancesFaites, reponses, entretiens: entretiens.length, prochainEntretien, stagnantes };
  }, [candidatures, relances]);

  const filtrees = useMemo(() => {
    const t = norm(q.trim());
    return candidatures.filter((c) => !t || norm(`${c.studio} ${c.poste} ${c.notes ?? ""}`).includes(t));
  }, [candidatures, q]);

  const { parSection, cloturees } = useMemo(() => {
    const date = (c: Candidature) => prochaineAction(c, relances, s.reglages)?.date ?? "9999";
    const ps: Record<string, Candidature[]> = { faire: [], attente: [], cours: [] };
    const cl: Candidature[] = [];
    for (const c of filtrees) {
      const sec = sectionDe(c, relances, s.reglages);
      if (sec === "cloturee") cl.push(c);
      else if (!seulementStagne || stagne(c, relances)) ps[sec].push(c);
    }
    for (const k of Object.keys(ps)) ps[k].sort((a, b) => date(a).localeCompare(date(b)) || a.studio.localeCompare(b.studio, "fr"));
    cl.sort((a, b) => (b.date_statut ?? derniereActivite(b, relances) ?? "").localeCompare(a.date_statut ?? derniereActivite(a, relances) ?? ""));
    return { parSection: ps, cloturees: cl };
  }, [filtrees, relances, s.reglages, seulementStagne]);

  const nbActives = candidatures.filter((c) => !estCloturee(c)).length;
  const nbCloturees = candidatures.length - nbActives;
  const nbAFaire = candidatures.filter((c) => sectionDe(c, relances, s.reglages) === "faire").length;
  const courante = candidatures.find((c) => c.id === ouverte) ?? null;

  function creer(p: Partial<Candidature>) {
    const c = s.add("candidatures", nouvelleCandidature(p));
    setNouvelle(false);
    setOuverte(c.id);
  }

  const visibles = onglet === "cloturees" ? cloturees : SECTIONS.flatMap((x) => parSection[x.id]);
  const basculer = (id: string) => setSelection((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const ligne = (c: Candidature) => (
    <LigneCandidature key={c.id} c={c} actions={actions} onOuvrir={() => setOuverte(c.id)} selection={selection ? { coche: selection.has(c.id), basculer: () => basculer(c.id) } : undefined} />
  );
  const choisies = selection ? candidatures.filter((c) => selection.has(c.id)) : [];

  const totalVisible = SECTIONS.reduce((n, x) => n + parSection[x.id].length, 0);

  return (
    <>
      <EnTete
        titre="Candidatures"
        description={nbAFaire > 0 ? <><strong className="font-semibold text-danger">{nbAFaire}</strong> à faire maintenant</> : "Rien d’urgent : tout est en attente ou à jour"}
        droite={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}><Plus />Candidature</button>}
      />

      <section aria-label="Revue de la semaine" className="carte p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="titre-section">Revue de la semaine</h2>
          <button className="puce" aria-pressed={seulementStagne} onClick={() => { setSeulementStagne((v) => !v); setOnglet("actives"); }}>
            <Clock className="h-3.5 w-3.5" />Sans nouvelles depuis {SEUIL_STAGNE} j+
            <span className={`rounded-full px-1.5 text-[11px] font-bold ${revue.stagnantes ? "bg-warn/20 text-warn" : "bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]"}`}>{revue.stagnantes}</span>
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Chiffre icone={<Send />} label="Envoyées" valeur={revue.envoyees} note="cette semaine" />
          <Chiffre icone={<BellRing />} label="Relances faites" valeur={revue.relancesFaites} note="cette semaine" />
          <Chiffre icone={<CheckCheck />} label="Réponses reçues" valeur={revue.reponses} note="cette semaine" />
          <Chiffre icone={<CalendarCheck />} label="Entretiens à venir" valeur={revue.entretiens} note={revue.prochainEntretien ? `prochain le ${fmtCourt(revue.prochainEntretien)}` : "aucune date fixée"} />
        </div>
      </section>

      <div className="mb-3 mt-5 flex flex-wrap items-center gap-2.5">
        <Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "actives", label: <>En cours<span className="text-muted">{nbActives}</span></> }, { id: "cloturees", label: <>Clôturées<span className="text-muted">{nbCloturees}</span></> }]} />
        <button className="bouton" aria-pressed={!!selection} onClick={() => setSelection(selection ? null : new Set())}><CheckSquare />{selection ? "Terminer la sélection" : "Sélectionner"}</button>
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="champ !pl-9" placeholder="Filtrer par studio ou poste…" aria-label="Filtrer les candidatures" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {candidatures.length === 0 ? (
        <Vide icone={Briefcase} titre="Aucune candidature" action={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}><Plus />Créer une candidature</button>}>
          Depuis la Veille, « Ajouter à mes candidatures » ou « Préparer une candidature spontanée » crée une fiche préremplie. Tu peux aussi en créer une ici.
        </Vide>
      ) : onglet === "cloturees" ? (
        cloturees.length === 0 ? (
          <Vide icone={CheckCheck} titre="Rien de clôturé">{q ? `Aucune candidature clôturée ne correspond à « ${q} ».` : "Les candidatures acceptées, refusées ou restées sans réponse se rangent ici, avec leur motif."}</Vide>
        ) : (
          <ul className="grid gap-2.5">{cloturees.map(ligne)}</ul>
        )
      ) : totalVisible === 0 ? (
        <Vide icone={Search} titre={seulementStagne ? "Rien ne stagne" : "Aucun résultat"}>{seulementStagne ? `Toutes tes candidatures en cours ont bougé depuis moins de ${SEUIL_STAGNE} jours.` : `Aucune candidature en cours ne correspond à « ${q} ».`}</Vide>
      ) : (
        <div className="grid gap-6">
          {SECTIONS.map((sec) => {
            const liste = parSection[sec.id];
            if (liste.length === 0 && sec.id !== "faire") return null;
            return (
              <section key={sec.id} aria-label={sec.titre}>
                <h2 className="mb-2 flex items-baseline gap-2 text-[15px] font-semibold">
                  {sec.titre}
                  <span className={`badge ${sec.id === "faire" && liste.length ? "badge-plein c-danger" : "c-mute"}`}>{liste.length}</span>
                  <span className="micro hidden font-normal sm:inline">{sec.aide}</span>
                </h2>
                {liste.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted"><CheckCheck className="h-4 w-4 flex-none text-ok" />Rien à faire maintenant. Une candidature envoyée remonte ici après {s.reglages.delai_relance_1} jours ouvrés.</p>
                ) : (
                  <ul className="grid gap-2.5">{liste.map(ligne)}</ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {selection && (
        <BarreSelection
          n={selection.size} total={visibles.length}
          onTout={() => setSelection(new Set(visibles.map((c) => c.id)))} onAucun={() => setSelection(new Set())}
          onPreparer={() => setAssistant(true)} onAnnuler={() => setSelection(null)}
        />
      )}
      {assistant && <AssistantMail cibles={choisies.map(mail.cibleCandidature)} onClose={() => { setAssistant(false); setSelection(null); }} />}
      <DialogueAction actions={actions} />
      {courante && <FicheCandidature c={courante} onClose={() => setOuverte(null)} />}
      {nouvelle && (
        <Sheet titre="Nouvelle candidature" onClose={() => setNouvelle(false)}>
          <NouvelleRapide onCreer={creer} />
        </Sheet>
      )}
    </>
  );
}

function Chiffre({ icone, label, valeur, note }: { icone: ReactNode; label: string; valeur: number; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-accent-soft text-accent [&_svg]:h-4 [&_svg]:w-4">{icone}</span>
      <div className="min-w-0">
        <p className="kpi !text-[1.6rem]">{valeur}</p>
        <p className="text-[12.5px] font-medium leading-tight">{label}</p>
        <p className="micro leading-tight">{note}</p>
      </div>
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
