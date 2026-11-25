"use client";

import { Link2, Mail, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { BadgeStatut } from "@/components/BadgeStatut";
import { Avatar, Champ, Sheet } from "@/components/ui";
import { StudiosDuContact } from "@/components/studios/StudiosDuContact";
import { ChampFiche } from "@/components/crm/ChampFiche";
import { tonFraicheur } from "@/lib/contacts";
import { estChampContact, triees } from "@/lib/crm";
import { diffDays, fmt, ilYa, today } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { TYPES_ECHANGE, labelEchange, type Contact, type TypeEchange } from "@/lib/types";
import { productionsVues } from "@/lib/veille";

export function FicheContact({ c, onClose }: { c: Contact; onClose: () => void }) {
  const s = useStore();
  const echanges = s.data.echanges.filter((e) => e.contact_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const dernier = echanges[0]?.date ?? null;
  const jours = dernier ? diffDays(today(), dernier) : null;
  const ton = tonFraicheur(jours, s.reglages.delai_contact_mois);
  const cands = s.data.candidatures.filter((x) => x.contact_id === c.id);
  const prods = productionsVues(s.collecte!, s.data, null);
  const liees = cands.map((x) => prods.find((p) => p.id === x.production_id)).filter((p): p is NonNullable<typeof p> => !!p);

  const [e, setE] = useState({ date: today(), type: "cafe" as TypeEchange, lieu: "", sujets: "", promesses: "", prochaine_action: "", prochaine_date: "" });
  const [tags, setTags] = useState(c.etiquettes.join(", "));

  const maj = (p: Partial<Contact>) => s.patch("contacts", c.id, p);
  const t = (k: keyof Contact) => ({
    className: "champ",
    value: (c[k] as string | null) ?? "",
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => maj({ [k]: ev.target.value || null } as Partial<Contact>),
  });

  function ajouter(ev: React.FormEvent) {
    ev.preventDefault();
    s.add("echanges", {
      contact_id: c.id, date: e.date, type: e.type, lieu: e.lieu || null, sujets: e.sujets || null,
      promesses: e.promesses || null, prochaine_action: e.prochaine_action || null, prochaine_date: e.prochaine_date || null,
    });
    setE({ ...e, lieu: "", sujets: "", promesses: "", prochaine_action: "", prochaine_date: "" });
  }
  function supprimer() {
    if (confirm(`Supprimer ${c.prenom} ${c.nom} et son journal d’échanges ?`)) {
      s.remove("contacts", c.id);
      onClose();
    }
  }

  const nom = `${c.prenom} ${c.nom}`.trim() || "Contact";
  return (
    <Sheet
      titre={nom}
      sousTitre={[c.fonction, c.structure].filter(Boolean).join(" · ") || undefined}
      onClose={onClose}
      large
      pied={<div className="flex items-center justify-between"><button className="bouton bouton-texte bouton-danger" onClick={supprimer}><Trash2 />Supprimer</button><button className="bouton bouton-plein" onClick={onClose}>Terminé</button></div>}
    >
      <div className="flex items-center gap-4 rounded-xl bg-surface-2 p-4">
        <Avatar nom={nom} taille={52} rond />
        <div className="min-w-0 flex-1">
          <p className="meta">Dernier échange</p>
          {dernier ? (
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2"><span className={`c-${ton} text-[28px] font-bold leading-none text-[var(--c)]`}>{jours}</span><span className="text-sm font-semibold">jours</span><span className="micro">{ilYa(jours!)} · {fmt(dernier)}</span></p>
          ) : (
            <p className="mt-0.5 text-[13px] text-muted">Aucun échange noté pour l’instant.</p>
          )}
        </div>
        <div className="flex flex-none gap-1.5">
          {c.email && <a className="bouton bouton-icone" href={`mailto:${c.email}`} aria-label="Écrire un e-mail"><Mail /></a>}
          {c.telephone && <a className="bouton bouton-icone" href={`tel:${c.telephone.replace(/\s/g, "")}`} aria-label="Appeler"><Phone /></a>}
          {c.linkedin && <a className="bouton bouton-icone" href={c.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Profil LinkedIn"><Link2 /></a>}
        </div>
      </div>

      <h3 className="titre-section mb-3 mt-6">Journal des échanges <span className="font-normal text-muted">({echanges.length})</span></h3>
      <form onSubmit={ajouter} className="mb-4 grid grid-cols-1 gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-2">
        <Champ label="Date"><input type="date" className="champ" value={e.date} onChange={(ev) => setE({ ...e, date: ev.target.value })} /></Champ>
        <Champ label="Type">
          <select className="champ" value={e.type} onChange={(ev) => setE({ ...e, type: ev.target.value as TypeEchange })}>
            {TYPES_ECHANGE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Champ>
        <Champ label="Lieu"><input className="champ" value={e.lieu} onChange={(ev) => setE({ ...e, lieu: ev.target.value })} /></Champ>
        <Champ label="Sujets abordés"><input className="champ" value={e.sujets} onChange={(ev) => setE({ ...e, sujets: ev.target.value })} /></Champ>
        <Champ label="Ce qui a été promis" className="sm:col-span-2"><input className="champ" value={e.promesses} onChange={(ev) => setE({ ...e, promesses: ev.target.value })} /></Champ>
        <Champ label="Prochaine action"><input className="champ" value={e.prochaine_action} onChange={(ev) => setE({ ...e, prochaine_action: ev.target.value })} /></Champ>
        <Champ label="Pour le"><input type="date" className="champ" value={e.prochaine_date} onChange={(ev) => setE({ ...e, prochaine_date: ev.target.value })} /></Champ>
        <div className="sm:col-span-2"><button className="bouton bouton-plein"><Plus />Ajouter l’échange</button></div>
      </form>
      {echanges.length === 0 ? (
        <p className="micro">Le journal est vide. Note ici chaque café, visio ou message : l’app te rappelle de reprendre contact.</p>
      ) : (
        <ol className="chronologie">
          {echanges.map((x) => {
            const retard = !!x.prochaine_date && x.prochaine_date <= today();
            return (
              <li key={x.id}>
                <span className="point" />
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-semibold">{labelEchange(x.type)} · {fmt(x.date)}{x.lieu ? <span className="font-normal text-muted"> · {x.lieu}</span> : null}</p>
                  <button className="bouton bouton-petit bouton-texte flex-none" onClick={() => s.remove("echanges", x.id)}>Retirer</button>
                </div>
                {x.sujets && <p className="text-[13px]">{x.sujets}</p>}
                {x.promesses && <p className="text-[13px] text-muted">Promis : {x.promesses}</p>}
                {x.prochaine_action && (
                  <p className={`mt-1 inline-block rounded-lg px-2 py-0.5 text-[12.5px] font-semibold ${retard ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-danger" : "bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]"}`}>
                    À faire : {x.prochaine_action}{x.prochaine_date ? ` (${fmt(x.prochaine_date)})` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <h3 className="titre-section mb-3 mt-6">Candidatures et productions liées</h3>
      {cands.length === 0 ? (
        <p className="micro">Aucune. Depuis une candidature, choisis ce contact dans « Contact lié ».</p>
      ) : (
        <ul className="space-y-2">
          {cands.map((x) => (
            <li key={x.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5 text-[13px]">
              <Avatar nom={x.studio || "?"} taille={28} />
              <span className="min-w-0 flex-1"><strong className="block truncate">{x.studio}</strong><span className="micro block truncate">{x.poste}</span></span>
              <BadgeStatut statut={x.statut} />
            </li>
          ))}
          {liees.map((p) => <li key={p.id} className="rounded-xl border border-line p-2.5 text-[13px]">Production : <strong>{p.titre}</strong></li>)}
        </ul>
      )}

      <StudiosDuContact c={c} onOuvrirStudio={(id) => { s.setFocus({ kind: "studio", id }); onClose(); }} />

      <h3 className="titre-section mb-3 mt-6">Coordonnées</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label="Prénom"><input {...t("prenom")} /></Champ>
        <Champ label="Nom"><input {...t("nom")} /></Champ>
        <Champ label="Studio ou structure"><input {...t("structure")} /></Champ>
        <Champ label="Fonction"><input {...t("fonction")} placeholder="Superviseur décor, RH…" /></Champ>
        <Champ label="Ville"><input {...t("ville")} /></Champ>
        <Champ label="E-mail"><input type="email" {...t("email")} /></Champ>
        <Champ label="Téléphone"><input {...t("telephone")} /></Champ>
        <Champ label="LinkedIn"><input {...t("linkedin")} placeholder="https://" /></Champ>
        <Champ label="Comment on s’est rencontrés" className="sm:col-span-2"><textarea {...t("rencontre")} /></Champ>
        <Champ label="Étiquettes (séparées par des virgules)" className="sm:col-span-2">
          <input className="champ" value={tags} onChange={(ev) => setTags(ev.target.value)} onBlur={() => maj({ etiquettes: tags.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </Champ>
      </div>
      {(() => {
        const perso = triees(s.data.crm_colonnes).filter((k) => k.type !== "dernier_echange" && !estChampContact(k));
        const groupes = triees(s.data.crm_groupes);
        if (perso.length === 0 && groupes.length === 0) return null;
        return (
          <>
            <h3 className="titre-section mb-3 mt-6">Suivi</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groupes.length > 0 && (
                <Champ label="Groupe">
                  <select className="champ" value={c.groupe_id ?? groupes[0].id} onChange={(ev) => maj({ groupe_id: ev.target.value })}>
                    {groupes.map((g) => <option key={g.id} value={g.id}>{g.titre}</option>)}
                  </select>
                </Champ>
              )}
              {perso.map((k) => <ChampFiche key={k.id} col={k} c={c} onChange={maj} />)}
            </div>
          </>
        );
      })()}
      {c.ville && <p className="micro mt-3 flex items-center gap-1"><MapPin className="h-3 w-3" />{c.ville}</p>}
    </Sheet>
  );
}
