"use client";

import { ArrowRight, Building2, Heart, Send, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { AssistantMail } from "@/components/mail/AssistantMail";
import { useMail } from "@/components/mail/useMail";
import { Avatar, Vide } from "@/components/ui";
import { ancienneteTexte, cheminsVers, modeleIntro, phraseLien, studiosChoisissables, type Chemin } from "@/lib/reseau";
import { useStore } from "@/lib/store";

/** Pastille de personne dans une rangée de chemin. */
function Maillon({ nom, sous, ami, onClick }: { nom: string; sous?: string | null; ami?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-left transition-colors hover:bg-accent-soft"
      style={ami ? { borderColor: "color-mix(in srgb, var(--danger) 35%, var(--line))" } : undefined}>
      <Avatar nom={nom} taille={26} rond />
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1 text-[13px] font-semibold"><span className="truncate">{nom}</span>{ami && <Heart className="h-3 w-3 flex-none fill-current text-danger" aria-label="ami" />}</span>
        {sous && <span className="block truncate text-[11px] text-muted">{sous}</span>}
      </span>
    </button>
  );
}

const Fleche = () => <ArrowRight className="h-3.5 w-3.5 flex-none text-muted" aria-hidden />;

function Force({ valeur }: { valeur: number }) {
  const pct = Math.round(valeur * 100);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" title="Force du chemin, d’après la récence et le nombre d’échanges">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_10%,transparent)]" aria-hidden><span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></span>
      Force {pct} %
    </span>
  );
}

export function Presentation({ onContact, onStudio }: { onContact: (id: string) => void; onStudio: (id: string) => void }) {
  const s = useStore();
  const mail = useMail();
  const choix = useMemo(() => studiosChoisissables(s.data, s.collecte), [s.data, s.collecte]);
  const [cle, setCle] = useState<string | null>(null);
  const [demande, setDemande] = useState<Chemin | null>(null);

  // Studio par défaut : le premier qui a au moins un chemin.
  const parDefaut = useMemo(() => choix.find((c) => cheminsVers(s.data, c).length > 0) ?? choix[0] ?? null, [choix, s.data]);
  const cible = choix.find((c) => c.cle === cle) ?? parDefaut;
  const chemins = useMemo(() => (cible ? cheminsVers(s.data, cible) : []), [cible, s.data]);

  if (!cible) return <Vide icone={Building2} titre="Aucun studio pour l’instant">Ajoute un studio dans l’onglet Studios : tu pourras chercher qui peut t’y présenter.</Vide>;

  function cibleMail(c: Chemin) {
    const base = mail.cibleContact(c.premier.contact);
    return { ...base, sousTitre: `Intro vers ${cible!.nom}`, valeurs: { ...base.valeurs, studio: cible!.nom } };
  }

  return (
    <div className="grid gap-4">
      <label className="flex min-w-0 max-w-md flex-col gap-1">
        <span className="meta">Studio visé</span>
        <select className="champ" value={cible.cle} onChange={(e) => setCle(e.target.value)} aria-label="Studio visé">
          {choix.map((c) => <option key={c.cle} value={c.cle}>{c.nom}{c.origine === "veille" ? " · Veille" : ""}</option>)}
        </select>
      </label>

      {chemins.length === 0 ? (
        <Vide icone={UserPlus} titre={`Personne ne te relie à ${cible.nom}`}
          action={cible.studioId ? <button className="bouton bouton-plein" onClick={() => onStudio(cible.studioId!)}>Ouvrir la fiche du studio</button> : undefined}>
          {cible.studioId ? "Ajoute un ami ou un contact à ce studio depuis sa fiche : il apparaîtra ici." : "Crée la fiche du studio dans l’onglet Studios, puis ajoute-y un ami ou un contact."}
        </Vide>
      ) : (
        <ol className="grid gap-2.5" aria-label={`Chemins vers ${cible.nom}`}>
          {chemins.map((c, i) => (
            <li key={`${c.via?.contact.id ?? "d"}-${c.cible.p.contact.id}-${c.lien?.id ?? i}`} className="rounded-2xl border border-line bg-surface p-3 shadow-[var(--ombre)]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <span className="rounded-full bg-accent px-2.5 py-1 text-[12px] font-bold text-accent-fg">Toi</span>
                <Fleche />
                {c.via && (
                  <>
                    <Maillon nom={c.via.nom} sous={c.via.ami ? "amie ou ami" : c.via.contact.fonction} ami={c.via.ami} onClick={() => onContact(c.via!.contact.id)} />
                    <Fleche />
                  </>
                )}
                <Maillon nom={c.cible.p.nom} sous={c.cible.p.contact.fonction} ami={c.role === "ami"} onClick={() => onContact(c.cible.p.contact.id)} />
                <Fleche />
                <button type="button" onClick={() => cible.studioId && onStudio(cible.studioId)} className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[13px] font-semibold"><Building2 className="h-3.5 w-3.5 flex-none text-muted" /><span className="truncate">{cible.nom}</span></button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="micro">{c.via ? "2 pas" : "Direct"}</span>
                <Force valeur={c.force} />
                <span className="micro">{ancienneteTexte(c.premier.jours)}{c.via ? ` · ${phraseLien(c)}${c.lien?.production ? ` (${c.lien.production})` : ""}` : ""}</span>
                <button className="bouton bouton-petit ml-auto" onClick={() => setDemande(c)}><Send />Demander une intro</button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="micro">Du plus court et du plus fort au plus faible. La force tient compte du dernier échange, du nombre d’échanges et du statut d’ami.</p>
      {demande && <AssistantMail cibles={[cibleMail(demande)]} modeleImpose={modeleIntro(demande, cible.nom)} onClose={() => setDemande(null)} />}
    </div>
  );
}
