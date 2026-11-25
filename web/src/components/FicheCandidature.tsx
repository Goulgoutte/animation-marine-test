"use client";

import { useState } from "react";
import { Champ, Sheet } from "@/components/ui";
import { fmt, ilYa, diffDays, today } from "@/lib/dates";
import { prochaineRelance, relancesDe } from "@/lib/relances";
import { useStore } from "@/lib/store";
import { CANAUX, STATUTS, labelCanal, type Candidature, type Canal, type Statut } from "@/lib/types";
import { productionsVues } from "@/lib/veille";

export function FicheCandidature({ c, onClose }: { c: Candidature; onClose: () => void }) {
  const s = useStore();
  const rs = relancesDe(c, s.data.relances);
  const prochaine = prochaineRelance(c, s.data.relances, s.reglages);
  const [rDate, setRDate] = useState(today());
  const [rCanal, setRCanal] = useState<Canal>("mail");
  const [rNote, setRNote] = useState("");
  const contact = s.data.contacts.find((k) => k.id === c.contact_id);
  const prod = c.production_id ? productionsVues(s.collecte!, s.data, null).find((p) => p.id === c.production_id) : null;

  const maj = (p: Partial<Candidature>) => s.patch("candidatures", c.id, p);
  const texte = (k: keyof Candidature) => ({
    className: "champ",
    value: (c[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => maj({ [k]: e.target.value || null } as Partial<Candidature>),
  });

  function changerStatut(statut: Statut) {
    const p: Partial<Candidature> = { statut, cloture_auto: false };
    if ((statut === "envoyee" || statut === "relancee") && !c.date_envoi) p.date_envoi = today();
    maj(p);
  }
  function relancer(e: React.FormEvent) {
    e.preventDefault();
    s.add("relances", { candidature_id: c.id, date: rDate, canal: rCanal, note: rNote || null });
    maj({ statut: "relancee", cloture_auto: false, cloture_annulee: false });
    setRNote("");
  }
  function annulerCloture() {
    maj({ statut: c.statut_avant ?? "relancee", cloture_auto: false, cloture_annulee: true });
  }
  function supprimer() {
    if (confirm(`Supprimer la candidature « ${c.studio} » et ses relances ?`)) {
      s.remove("candidatures", c.id);
      onClose();
    }
  }

  return (
    <Sheet titre={c.studio || "Candidature"} onClose={onClose} large>
      {c.cloture_auto && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border-[1.5px] border-[var(--color-ink)] p-3 text-sm">
          <span>Passée automatiquement en « sans réponse » après deux relances restées sans réponse.</span>
          <button className="bouton bouton-petit" onClick={annulerCloture}>Annuler</button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="carte p-3">
          <p className="meta">Statut</p>
          <select className="champ mt-1" value={c.statut} onChange={(e) => changerStatut(e.target.value as Statut)} aria-label="Statut">
            {STATUTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="carte p-3">
          <p className="meta">Prochaine relance</p>
          <p className="titre-l mt-2">{prochaine ? fmt(prochaine) : "—"}</p>
          {prochaine && <p className="micro">{diffDays(prochaine, today()) <= 0 ? "à faire maintenant" : `dans ${diffDays(prochaine, today())} jours`} (jours ouvrés)</p>}
          {!prochaine && <p className="micro">Calculée dès que la candidature est envoyée.</p>}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Champ label="Studio"><input {...texte("studio")} /></Champ>
        <Champ label="Poste ou type de candidature"><input {...texte("poste")} /></Champ>
        <Champ label="Date d’envoi"><input type="date" className="champ" value={c.date_envoi ?? ""} onChange={(e) => maj({ date_envoi: e.target.value || null })} /></Champ>
        <Champ label="Canal">
          <select className="champ" value={c.canal} onChange={(e) => maj({ canal: e.target.value as Canal })}>
            {CANAUX.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Champ>
        <Champ label="Catégorie">
          <select className="champ" value={c.categorie} onChange={(e) => maj({ categorie: e.target.value as "decor" | "autre" })}>
            <option value="decor">Décor</option><option value="autre">Autre métier</option>
          </select>
        </Champ>
        <Champ label="Version du portfolio et du CV"><input {...texte("version_cv")} /></Champ>
        <Champ label="Contact lié">
          <select className="champ" value={c.contact_id ?? ""} onChange={(e) => maj({ contact_id: e.target.value || null })}>
            <option value="">Aucun</option>
            {s.data.contacts.map((k) => <option key={k.id} value={k.id}>{k.prenom} {k.nom}{k.structure ? ` (${k.structure})` : ""}</option>)}
          </select>
        </Champ>
        <Champ label="Lien de l’annonce"><input {...texte("source_url")} placeholder="https://" /></Champ>
        <Champ label="Pièces jointes ou liens" className="sm:col-span-2"><textarea {...texte("liens")} placeholder="Un lien par ligne" /></Champ>
        <Champ label="Notes" className="sm:col-span-2"><textarea {...texte("notes")} /></Champ>
      </div>

      {(contact || prod) && (
        <p className="mt-4 text-sm">
          {prod && <>Production liée : <strong>{prod.titre}</strong>. </>}
          {contact && <>Contact : <strong>{contact.prenom} {contact.nom}</strong>{contact.email ? ` · ${contact.email}` : ""}.</>}
        </p>
      )}

      <h3 className="titre-l mb-2 mt-7">Relances ({rs.length})</h3>
      {rs.length === 0 ? (
        <p className="micro">Aucune relance. Après {s.reglages.delai_relance_1} jours ouvrés sans réponse, la candidature apparaît dans « À relancer aujourd’hui ».</p>
      ) : (
        <ol className="space-y-2">
          {rs.map((r, i) => (
            <li key={r.id} className="carte flex items-start justify-between gap-3 p-3 text-sm">
              <span><strong>Relance {i + 1}</strong> · {fmt(r.date)} · {labelCanal(r.canal)}{r.note ? <span className="block text-[var(--color-mute)]">{r.note}</span> : null}<span className="micro block">{ilYa(diffDays(today(), r.date))}</span></span>
              <button className="bouton bouton-petit bouton-texte" onClick={() => s.remove("relances", r.id)}>Retirer</button>
            </li>
          ))}
        </ol>
      )}
      {(c.statut === "envoyee" || c.statut === "relancee") && (
        <form onSubmit={relancer} className="mt-3 grid gap-2 sm:grid-cols-[auto_auto_1fr_auto]">
          <input type="date" className="champ" value={rDate} onChange={(e) => setRDate(e.target.value)} aria-label="Date de la relance" />
          <select className="champ" value={rCanal} onChange={(e) => setRCanal(e.target.value as Canal)} aria-label="Canal de la relance">
            {CANAUX.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <input className="champ" placeholder="Note (facultatif)" value={rNote} onChange={(e) => setRNote(e.target.value)} />
          <button className="bouton bouton-plein">J’ai relancé</button>
        </form>
      )}

      <div className="mt-8 flex justify-between">
        <button className="bouton bouton-texte text-[var(--color-red)]" onClick={supprimer}>Supprimer la candidature</button>
        <button className="bouton" onClick={onClose}>Fermer</button>
      </div>
    </Sheet>
  );
}
