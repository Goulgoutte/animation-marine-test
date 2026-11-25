"use client";

import { Check, CalendarClock, FilePen, Mail, MessageSquareReply, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { Champ, Sheet, Vignette } from "@/components/ui";
import { ETAPES, derniereActivite, estCloturee, etapeCourante, prochaineAction, stagne, changementStatut } from "@/lib/actions";
import { addDays, diffDays, fmtCourt, today } from "@/lib/dates";
import { relancesDe } from "@/lib/relances";
import { imageLiee } from "@/lib/candidature";
import { useStore } from "@/lib/store";
import { STATUTS, labelStatut, type Candidature, type Statut } from "@/lib/types";
import { couleurStatut } from "./BadgeStatut";
import { FenetreMail } from "./mail/FenetreMail";

type Dialogue = { c: Candidature; mode: "entretien" | "reponse" | "mail" } | null;

/** Changements de statut et actions rapides : mettent à jour statut, dates et historique des relances. */
export function useActionsCandidature() {
  const s = useStore();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const maj = (c: Candidature, p: Partial<Candidature>) => s.patch("candidatures", c.id, p);
  const entretien = (c: Candidature, date: string, intitule: string) =>
    maj(c, changementStatut(c, "entretien", { prochaine_action: intitule.trim() || "Entretien", prochaine_action_date: date }));
  return {
    dialogue,
    fermer: () => setDialogue(null),
    ouvrirEntretien: (c: Candidature) => setDialogue({ c, mode: "entretien" }),
    ouvrirReponse: (c: Candidature) => setDialogue({ c, mode: "reponse" }),
    ouvrirMail: (c: Candidature) => setDialogue({ c, mode: "mail" }),
    statut(c: Candidature, statut: Statut) {
      if (c.statut !== statut) maj(c, changementStatut(c, statut));
    },
    envoye(c: Candidature) {
      maj(c, changementStatut(c, "envoyee", { prochaine_action: null, prochaine_action_date: null }));
    },
    relance(c: Candidature) {
      s.add("relances", { candidature_id: c.id, date: today(), canal: "mail", note: null });
      maj(c, changementStatut(c, "relancee", { cloture_annulee: false, prochaine_action: null, prochaine_action_date: null }));
    },
    rouvrir(c: Candidature) {
      const avant = c.statut_avant && !estCloturee({ ...c, statut: c.statut_avant }) ? c.statut_avant : c.date_envoi ? "envoyee" : "a_preparer";
      maj(c, changementStatut(c, avant, { cloture_annulee: true }));
    },
    entretien,
    reponse(c: Candidature, statut: "entretien" | "acceptee" | "refus", motif: string, date: string) {
      if (statut === "entretien") return entretien(c, date, motif);
      maj(c, changementStatut(c, statut, { motif_cloture: motif.trim() || null }));
    },
  };
}

export type Actions = ReturnType<typeof useActionsCandidature>;

/** Frise compacte : étapes franchies pleines, étape courante cerclée et nommée. */
function Frise({ c }: { c: Candidature }) {
  const { data } = useStore();
  const cour = etapeCourante(c, data.relances);
  const couleur = c.statut === "refus" ? "var(--danger)" : c.statut === "acceptee" ? "var(--ok)" : c.statut === "sans_reponse" ? "var(--muted)" : "var(--accent)";
  const nom = c.statut === "sans_reponse" ? "Sans réponse" : c.statut === "refus" ? "Refus" : c.statut === "acceptee" ? "Acceptée" : ETAPES[cour];
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Étape : ${nom}`}>
      <ol className="flex items-center">
        {ETAPES.map((e, i) => (
          <li key={e} className="flex items-center" title={e}>
            {i > 0 && <span className="h-0.5 w-3.5 rounded-full" style={{ background: i <= cour ? couleur : "var(--line)" }} />}
            <span
              className="block rounded-full"
              style={{
                width: i === cour ? 12 : 8, height: i === cour ? 12 : 8,
                background: i <= cour ? couleur : "var(--surface)",
                border: `2px solid ${i <= cour ? couleur : "var(--line)"}`,
                boxShadow: i === cour ? `0 0 0 3px color-mix(in srgb, ${couleur} 22%, transparent)` : undefined,
              }}
            />
          </li>
        ))}
      </ol>
      <span className="text-[12px] font-semibold" style={{ color: couleur }}>{nom}</span>
    </div>
  );
}

function Activite({ c }: { c: Candidature }) {
  const { data } = useStore();
  const d = derniereActivite(c, data.relances);
  if (c.statut === "a_preparer") return <span className="micro">Pas encore envoyée</span>;
  if (!d) return <span className="micro">Dernière activité inconnue</span>;
  const n = diffDays(today(), d);
  const lent = stagne(c, data.relances);
  return <span className={`micro ${lent ? "!font-semibold !text-warn" : ""}`}>Dernière activité {n <= 0 ? "aujourd’hui" : n === 1 ? "hier" : `il y a ${n} j`}</span>;
}

function Echeance({ c }: { c: Candidature }) {
  const { data, reglages } = useStore();
  if (estCloturee(c)) {
    return (
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{c.motif_cloture || <span className="font-normal text-muted">Pas de motif noté</span>}</p>
        <p className="micro">{labelStatut(c.statut)}{c.date_statut ? ` · ${fmtCourt(c.date_statut)}` : ""}{c.cloture_auto ? " · automatique" : ""}</p>
      </div>
    );
  }
  const a = prochaineAction(c, data.relances, reglages);
  if (!a) return null;
  const retard = a.date ? diffDays(today(), a.date) : 0;
  return (
    <div className="min-w-0">
      <p className={`text-[13px] font-semibold ${a.echue ? "text-danger" : ""}`}>{a.texte}</p>
      <p className={`micro ${a.echue && a.date ? "!font-semibold !text-danger" : ""}`}>
        {a.date ? `${fmtCourt(a.date)} · ${retard > 0 ? `en retard de ${retard} j` : retard === 0 ? "aujourd’hui" : `dans ${-retard} j`}` : a.deduite ? "À ton rythme" : "Sans date"}
      </p>
    </div>
  );
}

function BoutonsRapides({ c, actions }: { c: Candidature; actions: Actions }) {
  const { data } = useStore();
  const nbRelances = relancesDe(c, data.relances).length;
  const b = "bouton bouton-petit !min-h-9 max-md:!min-h-11 max-md:flex-1 max-md:!text-[13px]";
  if (estCloturee(c)) return <div className="flex"><button className={b} onClick={() => actions.rouvrir(c)}><Undo2 />Rouvrir</button></div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {c.statut === "a_preparer" && <button className={`${b} bouton-plein`} onClick={() => actions.envoye(c)}><Send />J’ai envoyé</button>}
      {(c.statut === "envoyee" || c.statut === "relancee") && nbRelances < 2 && <button className={b} onClick={() => actions.relance(c)}><Check />J’ai relancé</button>}
      {(c.statut === "envoyee" || c.statut === "relancee") && <button className={b} onClick={() => actions.ouvrirEntretien(c)}><CalendarClock />Entretien fixé</button>}
      {c.statut !== "a_preparer" && <button className={b} onClick={() => actions.ouvrirReponse(c)}><MessageSquareReply />Réponse reçue</button>}
      <button className={b} onClick={() => actions.ouvrirMail(c)}><Mail />Préparer le mail</button>
    </div>
  );
}

function MenuStatut({ c, actions }: { c: Candidature; actions: Actions }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="pastille pointer-events-none absolute left-2.5" style={{ background: couleurStatut(c.statut) }} />
      <select className="champ !w-auto !py-1 !pl-6 !text-[12.5px] font-semibold" value={c.statut} onChange={(e) => actions.statut(c, e.target.value as Statut)} aria-label={`Statut de ${c.studio || "la candidature"}`}>
        {STATUTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
    </label>
  );
}

/** Mode sélection (envoi groupé) : case à cocher en tête de ligne. */
export interface SelectionLigne {
  coche: boolean;
  basculer: () => void;
}

export function BadgeBrouillon({ c }: { c: Candidature }) {
  if (!c.gmail_brouillon_id) return null;
  return <span className="badge c-ok" title="Un brouillon Gmail est prêt à relire et envoyer"><FilePen />Brouillon Gmail prêt</span>;
}

export function LigneCandidature({ c, actions, onOuvrir, selection }: { c: Candidature; actions: Actions; onOuvrir: () => void; selection?: SelectionLigne }) {
  const { data, reglages, collecte } = useStore();
  const image = imageLiee(c, collecte, data);
  const echue = !estCloturee(c) && !!prochaineAction(c, data.relances, reglages)?.echue;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <li
      onClick={selection ? selection.basculer : onOuvrir}
      className="carte carte-lien grid cursor-pointer gap-x-4 gap-y-2.5 p-3.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)_minmax(0,1.75fr)_auto] md:items-center"
      style={{ borderLeft: echue ? "3px solid var(--danger)" : undefined, boxShadow: selection?.coche ? "0 0 0 2px var(--accent)" : undefined }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {selection && (
          <input type="checkbox" className="h-[18px] w-[18px] flex-none accent-[var(--accent)]" checked={selection.coche} onChange={selection.basculer} onClick={stop} aria-label={`Sélectionner ${c.studio || "la candidature"}`} />
        )}
        <Vignette image={image} nom={c.studio || "?"} taille={40} />
        <div className="min-w-0">
          <button onClick={(e) => { stop(e); onOuvrir(); }} className="block max-w-full truncate text-left text-[14px] font-semibold leading-tight hover:underline">{c.studio || "Sans studio"}</button>
          <p className="truncate text-[12.5px] text-muted">{c.poste || "Poste non précisé"}</p>
          <span className="mt-1 flex flex-wrap gap-1">
            <span className={`badge ${c.categorie === "decor" ? "c-accent" : "c-mute"}`}>{c.categorie === "decor" ? "Décor" : "Autre métier"}</span>
            <BadgeBrouillon c={c} />
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Frise c={c} />
        <Activite c={c} />
      </div>
      <div className="flex min-w-0 flex-col gap-2" onClick={stop}>
        <div onClick={onOuvrir} className="cursor-pointer"><Echeance c={c} /></div>
        <BoutonsRapides c={c} actions={actions} />
      </div>
      <div className="flex md:justify-end" onClick={stop}><MenuStatut c={c} actions={actions} /></div>
    </li>
  );
}

/** Petite fenêtre pour « Entretien fixé » et « Réponse reçue ». */
export function DialogueAction({ actions }: { actions: Actions }) {
  const d = actions.dialogue;
  if (!d) return null;
  if (d.mode === "mail") return <FenetreMail key={d.c.id} c={d.c} onClose={actions.fermer} />;
  return <Contenu key={`${d.c.id}-${d.mode}`} c={d.c} mode={d.mode} actions={actions} />;
}

function Contenu({ c, mode, actions }: { c: Candidature; mode: "entretien" | "reponse"; actions: Actions }) {
  const [issue, setIssue] = useState<"entretien" | "acceptee" | "refus">(mode === "entretien" ? "entretien" : "refus");
  const [date, setDate] = useState(addDays(today(), 7));
  const [texte, setTexte] = useState("");
  const entretien = issue === "entretien";
  return (
    <Sheet titre={mode === "entretien" ? "Entretien fixé" : "Réponse reçue"} sousTitre={`${c.studio} · ${c.poste}`} onClose={actions.fermer}>
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          actions.reponse(c, issue, texte, date);
          actions.fermer();
        }}
      >
        {mode === "reponse" && (
          <div className="segment w-full" role="group" aria-label="Nature de la réponse">
            {([["entretien", "Entretien"], ["acceptee", "Acceptée"], ["refus", "Refus"]] as const).map(([id, lib]) => (
              <button type="button" key={id} aria-pressed={issue === id} className="!flex-1 !justify-center" onClick={() => setIssue(id)}>{lib}</button>
            ))}
          </div>
        )}
        {entretien && <Champ label="Date de l’entretien ou du test"><input type="date" className="champ" required value={date} onChange={(e) => setDate(e.target.value)} /></Champ>}
        <Champ label={entretien ? "Intitulé (facultatif)" : "Motif (facultatif)"}>
          <input className="champ" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={entretien ? "Entretien visio, test de décor…" : issue === "refus" ? "Poste pourvu, profil différent…" : "Contrat, durée, début…"} autoFocus />
        </Champ>
        <button className="bouton bouton-plein">Enregistrer</button>
      </form>
    </Sheet>
  );
}
