"use client";

import { useState } from "react";
import { Champ, Sheet } from "@/components/ui";
import { diffDays, fmt, ilYa, today } from "@/lib/dates";
import { useStore } from "@/lib/store";
import { TYPES_ECHANGE, labelEchange, labelStatut, type Contact, type TypeEchange } from "@/lib/types";
import { productionsVues } from "@/lib/veille";

export function FicheContact({ c, onClose }: { c: Contact; onClose: () => void }) {
  const s = useStore();
  const echanges = s.data.echanges.filter((e) => e.contact_id === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const dernier = echanges[0]?.date ?? null;
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

  return (
    <Sheet titre={`${c.prenom} ${c.nom}`.trim() || "Contact"} onClose={onClose} large>
      <div className="carte mb-5 p-4">
        <p className="meta">Dernier échange</p>
        {dernier ? (
          <p className="mt-1"><span className="chiffre !text-[3.4rem]">{diffDays(today(), dernier)}</span> <span className="titre-l">jours</span> <span className="micro">· {ilYa(diffDays(today(), dernier))}, le {fmt(dernier)}</span></p>
        ) : (
          <p className="mt-1 text-sm text-[var(--color-mute)]">Aucun échange noté. Ajoute le premier dans le journal ci-dessous.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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

      <h3 className="titre-l mb-2 mt-7">Candidatures et productions liées</h3>
      {cands.length === 0 ? (
        <p className="micro">Aucune. Depuis une candidature, choisis ce contact dans « Contact lié ».</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {cands.map((x) => <li key={x.id}><strong>{x.studio}</strong> · {x.poste} <span className="badge b-info ml-1">{labelStatut(x.statut)}</span></li>)}
          {liees.map((p) => <li key={p.id}>Production : <strong>{p.titre}</strong></li>)}
        </ul>
      )}

      <h3 className="titre-l mb-2 mt-7">Journal des échanges ({echanges.length})</h3>
      <form onSubmit={ajouter} className="carte mb-3 grid gap-2 p-3 sm:grid-cols-2">
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
        <div className="sm:col-span-2"><button className="bouton bouton-plein">Ajouter l’échange</button></div>
      </form>
      <ol className="space-y-2">
        {echanges.map((x) => (
          <li key={x.id} className="carte p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p><strong>{labelEchange(x.type)}</strong> · {fmt(x.date)}{x.lieu ? ` · ${x.lieu}` : ""}</p>
              <button className="bouton bouton-petit bouton-texte" onClick={() => s.remove("echanges", x.id)}>Retirer</button>
            </div>
            {x.sujets && <p>{x.sujets}</p>}
            {x.promesses && <p className="text-[var(--color-mute)]">Promis : {x.promesses}</p>}
            {x.prochaine_action && (
              <p className={`mt-1 font-semibold ${x.prochaine_date && x.prochaine_date <= today() ? "text-[var(--color-red)]" : ""}`}>
                À faire : {x.prochaine_action}{x.prochaine_date ? ` (${fmt(x.prochaine_date)})` : ""}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex justify-between">
        <button className="bouton bouton-texte text-[var(--color-red)]" onClick={supprimer}>Supprimer le contact</button>
        <button className="bouton" onClick={onClose}>Fermer</button>
      </div>
    </Sheet>
  );
}
