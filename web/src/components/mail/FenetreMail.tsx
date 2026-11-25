"use client";

import { Check, ExternalLink, FilePen, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { Champ, Sheet } from "@/components/ui";
import { ErreurGmail, LIEN_BROUILLONS, useEtatGmail } from "@/lib/gmail";
import { rendre, type CleVariable, type Replis } from "@/lib/modeles";
import { adresseValide } from "@/lib/mime";
import type { Candidature } from "@/lib/types";
import { BoutonGmail, MSG_DEMO, gmailPret } from "./BoutonGmail";
import { ChampsMail } from "./ChampsMail";
import { useMail } from "./useMail";

/** Modèle conseillé selon l'état de la candidature. */
function nomModeleConseille(c: Candidature): string {
  if (c.statut === "a_preparer") return c.type === "spontanee" ? "Candidature spontanée décor (production repérée)" : "Réponse à une offre";
  if (c.statut === "envoyee") return "1re relance";
  if (c.statut === "relancee") return "2e relance";
  if (c.statut === "entretien") return "Remerciement après entretien";
  return "";
}

type Issue = { type: "brouillon" | "envoi"; id: string; simule: boolean } | { type: "erreur"; message: string };

export function FenetreMail({ c, onClose }: { c: Candidature; onClose: () => void }) {
  const mail = useMail();
  const etat = useEtatGmail();
  const cible = useMemo(() => mail.cibleCandidature(c), [mail, c]);
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [email, setEmail] = useState(cible.email);
  const [edition, setEdition] = useState<{ sujet?: string; corps?: string }>({});
  const [replis, setReplis] = useState<Replis>({});
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [issue, setIssue] = useState<Issue | null>(null);

  const modele = mail.modeles.find((m) => m.id === modeleId) ?? mail.modeles.find((m) => m.nom === nomModeleConseille(c)) ?? mail.modeles[0];
  const rSujet = modele ? rendre(modele.sujet, cible.valeurs, replis) : { texte: "", vides: [] as CleVariable[] };
  const rCorps = modele ? rendre(modele.corps, cible.valeurs, replis) : { texte: "", vides: [] as CleVariable[] };
  const vides = Array.from(new Set([...(edition.sujet !== undefined ? [] : rSujet.vides), ...(edition.corps !== undefined ? [] : rCorps.vides)]));
  const sujet = edition.sujet ?? rSujet.texte;
  const corps = edition.corps ?? rCorps.texte;
  const adresseOk = adresseValide(email);
  const pret = adresseOk && sujet.trim().length > 0 && corps.trim().length > 0 && !!modele;
  const peut = pret && gmailPret(etat) && !occupe;

  async function lancer(mode: "brouillon" | "envoi") {
    setOccupe(true);
    setIssue(null);
    try {
      const r = await mail.livrer(cible, mode, email.trim(), sujet, corps);
      setIssue({ type: mode, id: r.id, simule: r.simule });
    } catch (e) {
      setIssue({ type: "erreur", message: e instanceof ErreurGmail || e instanceof Error ? e.message : "Échec de l’envoi." });
    }
    setConfirmer(false);
    setOccupe(false);
  }

  const termine = issue && issue.type !== "erreur";
  return (
    <Sheet
      titre="Préparer le mail"
      sousTitre={`${c.studio} · ${c.poste}`}
      onClose={onClose}
      large
      pied={
        termine ? (
          <div className="flex justify-end"><button className="bouton bouton-plein" onClick={onClose}>Terminé</button></div>
        ) : confirmer ? (
          <div className="grid gap-2.5">
            <p className="text-[13px]" role="alertdialog" aria-label="Confirmer l’envoi">Envoyer ce mail à <strong>{email}</strong> avec le sujet « <strong>{sujet}</strong> » ?{vides.length > 0 ? ` ${vides.length} variable${vides.length > 1 ? "s" : ""} vide${vides.length > 1 ? "s" : ""}.` : ""} {etat === "demo" ? MSG_DEMO + "." : "Il part tout de suite."}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button className="bouton" onClick={() => setConfirmer(false)} disabled={occupe}>Annuler</button>
              <button className="bouton bouton-plein" onClick={() => lancer("envoi")} disabled={!peut}><Send />{occupe ? "Envoi…" : "Confirmer l’envoi"}</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button className="bouton" onClick={() => setConfirmer(true)} disabled={!peut}><Send />Envoyer maintenant</button>
            <button className="bouton bouton-plein" onClick={() => lancer("brouillon")} disabled={!peut}><FilePen />{occupe ? "Création…" : "Créer le brouillon Gmail"}</button>
          </div>
        )
      }
    >
      <div className="grid gap-4">
        <BoutonGmail />

        {issue?.type === "erreur" && <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-[13px] text-danger">{issue.message}</p>}
        {termine && (
          <div role="status" className="rounded-xl border border-[color-mix(in_srgb,var(--ok)_40%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_9%,var(--surface))] p-3 text-[13px]">
            <p className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 text-ok" />{issue.type === "brouillon" ? "Brouillon Gmail prêt." : "Mail envoyé."}{issue.simule ? ` ${MSG_DEMO}.` : ""}</p>
            {issue.type === "brouillon" && !issue.simule && <a className="mt-1.5 inline-flex items-center gap-1 font-semibold text-accent underline" href={LIEN_BROUILLONS} target="_blank" rel="noopener noreferrer">Ouvrir dans Gmail <ExternalLink className="h-3 w-3" /></a>}
            {issue.type === "envoi" && <p className="micro mt-1">Statut et historique de la candidature mis à jour.</p>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Champ label="Modèle">
            <select className="champ" value={modele?.id ?? ""} onChange={(e) => { setModeleId(e.target.value); setEdition({}); setIssue(null); }} aria-label="Modèle de mail">
              {mail.modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Champ>
          <Champ label="Destinataire">
            <input className="champ" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@studio.fr" aria-invalid={!!email && !adresseOk} />
            {!adresseOk && <span className="micro text-warn">{email ? "Adresse invalide." : "Aucune adresse : saisis-la ou lie un contact qui en a une."}</span>}
          </Champ>
        </div>

        <ChampsMail
          sujet={sujet} corps={corps} vides={vides} replis={replis}
          onSujet={(v) => setEdition((e) => ({ ...e, sujet: v }))}
          onCorps={(v) => setEdition((e) => ({ ...e, corps: v }))}
          onRepli={(k, v) => setReplis((r) => ({ ...r, [k]: v }))}
          modifie={edition.sujet !== undefined || edition.corps !== undefined}
          onReset={() => setEdition({})}
        />
      </div>
    </Sheet>
  );
}
