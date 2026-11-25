"use client";

import { Archive, BellRing, Database, Download, ExternalLink, LogOut, RotateCcw, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SourcesReglages } from "@/components/SourcesReglages";
import { Avatar, EnTete } from "@/components/ui";
import { estChampContact, texteDe, triees } from "@/lib/crm";
import { csv, stamp, telecharger } from "@/lib/export";
import { useStore } from "@/lib/store";
import { labelCanal, labelEchange, labelStatut } from "@/lib/types";
import { ModelesMail } from "@/components/mail/ModelesMail";
import { ProfilMail } from "@/components/mail/ProfilMail";
import { Mail } from "lucide-react";
import { LABEL_MODE, offresVues, productionsVues } from "@/lib/veille";

function Section({ icone: Icone, titre, description, children, pleine }: { icone: LucideIcon; titre: string; description?: ReactNode; children: ReactNode; pleine?: boolean }) {
  return (
    <section className={`carte grid grid-cols-1 gap-5 p-5 ${pleine ? "" : "lg:grid-cols-[230px_1fr] lg:gap-8"}`}>
      <div>
        <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Icone className="h-[18px] w-[18px]" /></span>
        <h2 className="titre-section">{titre}</h2>
        {description && <p className="micro mt-1">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function Reglages() {
  const s = useStore();
  const r = s.reglages;
  const repo = process.env.NEXT_PUBLIC_REPO_URL;
  const lienConfig = repo ? `${repo}/tree/main/collector/config` : null;
  const num = (v: string, min: number, max: number, def: number) => Math.min(max, Math.max(min, parseInt(v, 10) || def));

  function exportVeille() {
    const o = offresVues(s.collecte!, s.data, s.visitePrecedente).filter((x) => !x.masquee);
    const pr = productionsVues(s.collecte!, s.data, s.visitePrecedente).filter((x) => !x.masquee);
    const lignes = [
      ...o.map((x) => ({ type: "Offre", titre: x.titre, studio: x.studio, lieu: x.lieu, categorie: x.categorie, technique: x.technique, detail: `${LABEL_MODE[x.modeTravail]}${x.residenceExigee ? " (résidence : " + x.residenceExigee + ")" : ""}`, date: x.datePublication ?? x.premiereVue.slice(0, 10), liens: x.sources.map((y) => y.url) })),
      ...pr.map((x) => ({ type: "Production", titre: x.titre, studio: x.studiosFabrication.join(", "), lieu: x.villeFabrication, categorie: "", technique: x.technique, detail: x.statut, date: x.dateDemarrage ?? x.premiereVue.slice(0, 10), liens: x.sources.map((y) => y.url) })),
    ];
    telecharger(`veille-${stamp()}.csv`, csv([
      { cle: "type", titre: "Type" }, { cle: "titre", titre: "Titre" }, { cle: "studio", titre: "Studio" }, { cle: "lieu", titre: "Lieu" },
      { cle: "categorie", titre: "Catégorie" }, { cle: "technique", titre: "Technique" }, { cle: "detail", titre: "Détail" }, { cle: "date", titre: "Date" }, { cle: "liens", titre: "Liens" },
    ], lignes), "text/csv;charset=utf-8");
  }
  function exportCandidatures() {
    const lignes = s.data.candidatures.map((c) => ({ ...c, statut: labelStatut(c.statut), canal: labelCanal(c.canal), relances: s.data.relances.filter((x) => x.candidature_id === c.id).map((x) => x.date) }));
    telecharger(`candidatures-${stamp()}.csv`, csv([
      { cle: "studio", titre: "Studio" }, { cle: "poste", titre: "Poste" }, { cle: "type", titre: "Type" }, { cle: "categorie", titre: "Catégorie" },
      { cle: "date_envoi", titre: "Date d’envoi" }, { cle: "canal", titre: "Canal" }, { cle: "statut", titre: "Statut" }, { cle: "version_cv", titre: "Version CV" },
      { cle: "relances", titre: "Relances" }, { cle: "notes", titre: "Notes" }, { cle: "liens", titre: "Liens" },
    ], lignes), "text/csv;charset=utf-8");
  }
  function exportContacts() {
    // Colonnes du CRM qui ne sont pas déjà des champs de la fiche (statut, dates, notes, colonnes ajoutées…).
    const colsPerso = triees(s.data.crm_colonnes).filter((k) => !estChampContact(k) && k.type !== "dernier_echange");
    const lignes = s.data.contacts.map((c) => {
      const ex = s.data.echanges.filter((e) => e.contact_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
      const perso = Object.fromEntries(colsPerso.map((k) => [`crm_${k.id}`, texteDe(c, k, s.data.echanges)]));
      return { ...c, groupe: s.data.crm_groupes.find((g) => g.id === c.groupe_id)?.titre ?? "", ...perso, dernier: ex[0]?.date ?? "", nb: ex.length, journal: ex.map((e) => `${e.date} ${labelEchange(e.type)} : ${e.sujets ?? ""}`) };
    });
    telecharger(`contacts-${stamp()}.csv`, csv([
      { cle: "prenom", titre: "Prénom" }, { cle: "nom", titre: "Nom" }, { cle: "structure", titre: "Structure" }, { cle: "fonction", titre: "Fonction" },
      { cle: "ville", titre: "Ville" }, { cle: "email", titre: "E-mail" }, { cle: "telephone", titre: "Téléphone" }, { cle: "linkedin", titre: "LinkedIn" },
      { cle: "etiquettes", titre: "Étiquettes" }, { cle: "groupe", titre: "Groupe" },
      ...colsPerso.map((k) => ({ cle: `crm_${k.id}`, titre: k.titre })), { cle: "dernier", titre: "Dernier échange" }, { cle: "nb", titre: "Nb d’échanges" }, { cle: "journal", titre: "Journal" },
    ], lignes), "text/csv;charset=utf-8");
  }
  function sauvegarde() {
    telecharger(`sauvegarde-veille-animation-${stamp()}.json`, JSON.stringify({ exporteLe: new Date().toISOString(), version: 1, ...s.data }, null, 2), "application/json");
  }

  return (
    <>
      <EnTete titre="Réglages" description="Ton compte, tes relances, tes sources et tes données." />

      <div className="grid grid-cols-1 gap-4">
        <Section icone={UserRound} titre="Compte" description="Connexion Google.">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar nom={s.profil?.nom ?? s.profil?.email ?? "Moi"} url={s.profil?.avatar} taille={52} rond />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">{s.profil?.nom ?? "Utilisatrice"}</p>
              <p className="micro">{s.profil?.email ?? (s.demo ? "Mode démo : aucune connexion Supabase configurée" : "")}</p>
            </div>
            {!s.demo && <button className="bouton" onClick={s.deconnexion}><LogOut />Se déconnecter</button>}
          </div>
          {s.demo && <p className="mt-4 rounded-xl bg-surface-2 p-3 text-[13px] text-muted">Les données du mode démo restent dans ce navigateur. Elles disparaissent si tu effaces les données du site.</p>}
          <ProfilMail />
        </Section>

        <Section
          icone={BellRing}
          titre="Rappels"
          description="Quand l’app te rappelle de relancer une candidature ou de reprendre contact avec quelqu’un. Ces rappels apparaissent dans « À faire » du tableau de bord et dans Candidatures."
        >
          <div className="grid grid-cols-1 gap-3 text-[13.5px]">
            <label className="flex flex-wrap items-center gap-2">
              Proposer une 1re relance
              <input className="champ !w-20 text-center" type="number" min={1} max={90} value={r.delai_relance_1} onChange={(e) => s.saveReglages({ delai_relance_1: num(e.target.value, 1, 90, 10) })} />
              jours ouvrés après l’envoi d’une candidature sans réponse.
            </label>
            <label className="flex flex-wrap items-center gap-2">
              Puis une 2e relance
              <input className="champ !w-20 text-center" type="number" min={1} max={90} value={r.delai_relance_2} onChange={(e) => s.saveReglages({ delai_relance_2: num(e.target.value, 1, 90, 15) })} />
              jours ouvrés plus tard. Sans réponse ensuite, la candidature passe en « Sans réponse » (annulable).
            </label>
            <label className="flex flex-wrap items-center gap-2">
              Me rappeler de recontacter quelqu’un après
              <input className="champ !w-20 text-center" type="number" min={1} max={36} value={r.delai_contact_mois} onChange={(e) => s.saveReglages({ delai_contact_mois: num(e.target.value, 1, 36, 3) })} />
              mois sans échange (seulement les personnes avec qui tu as déjà échangé).
            </label>
            <p className="micro">Jours ouvrés : du lundi au vendredi.</p>
          </div>
        </Section>

        <Section icone={Database} titre="Sources" description="Où la collecte cherche les offres et les productions. Fréquence et activation se règlent ici, sans passer par GitHub." pleine>
          <SourcesReglages />
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-[13px]">
            Les mots-clés et le détail des sélecteurs se modifient dans les fichiers de <code className="rounded bg-[color-mix(in_srgb,var(--fg)_8%,transparent)] px-1">collector/config/</code> du dépôt.{" "}
            {lienConfig ? <a className="inline-flex items-center gap-1 font-semibold text-accent underline" href={lienConfig} target="_blank" rel="noopener noreferrer">Ouvrir sur GitHub <ExternalLink className="h-3 w-3" /></a> : <span className="micro">(lien disponible une fois le site déployé par GitHub Actions)</span>}
          </div>
        </Section>

        <Section icone={Mail} titre="Modèles de mail" description="Textes réutilisables pour les candidatures et les envois groupés, avec des variables comme {{studio}} ou {{contact_prenom}}.">
          <ModelesMail />
        </Section>

        <Section icone={Archive} titre="Export et sauvegarde" description="CSV lisibles dans Excel ou Numbers ; sauvegarde complète en JSON.">
          <div className="flex flex-wrap gap-2">
            <button className="bouton" onClick={exportVeille}><Download />Veille (CSV)</button>
            <button className="bouton" onClick={exportCandidatures}><Download />Candidatures (CSV)</button>
            <button className="bouton" onClick={exportContacts}><Download />Contacts (CSV)</button>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="micro mb-3">Toutes tes données (candidatures, contacts, échanges, ajouts, corrections, réglages) dans un seul fichier JSON.</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="bouton bouton-plein" onClick={sauvegarde}><Download />Télécharger la sauvegarde</button>
              {s.demo && <button className="bouton bouton-texte bouton-danger" onClick={() => confirm("Effacer les données du mode démo et repartir de l’exemple ?") && s.effacerDemo()}><RotateCcw />Réinitialiser la démo</button>}
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}
