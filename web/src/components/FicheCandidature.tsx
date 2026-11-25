"use client";

import { ExternalLink, Send, Trash2, Undo2, User } from "lucide-react";
import { useState } from "react";
import { BadgeStatut } from "@/components/BadgeStatut";
import { Avatar, Champ, Sheet } from "@/components/ui";
import { changementStatut, estCloturee, prochaineAction } from "@/lib/actions";
import { fmt, ilYa, diffDays, today } from "@/lib/dates";
import { prochaineRelance, relancesDe } from "@/lib/relances";
import { useStore } from "@/lib/store";
import { IconeCanal } from "@/components/IconeCanal";
import { CANAUX, STATUTS, canauxPour, labelCanal, labelStatut, type Candidature, type Canal, type Statut } from "@/lib/types";
import { productionsVues } from "@/lib/veille";

export function FicheCandidature({ c, onClose }: { c: Candidature; onClose: () => void }) {
  const s = useStore();
  const rs = relancesDe(c, s.data.relances);
  const prochaine = prochaineRelance(c, s.data.relances, s.reglages);
  const [rDate, setRDate] = useState(today());
  const [rCanal, setRCanal] = useState<Canal>("mail_pro");
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
    maj(changementStatut(c, statut));
  }
  function relancer(e: React.FormEvent) {
    e.preventDefault();
    s.add("relances", { candidature_id: c.id, date: rDate, canal: rCanal, note: rNote || null });
    maj(changementStatut(c, "relancee", { cloture_annulee: false }));
    setRNote("");
  }
  function annulerCloture() {
    maj(changementStatut(c, c.statut_avant ?? "relancee", { cloture_annulee: true }));
  }
  function supprimer() {
    if (confirm(`Supprimer la candidature « ${c.studio} » et ses relances ?`)) {
      s.remove("candidatures", c.id);
      onClose();
    }
  }

  const action = prochaineAction(c, s.data.relances, s.reglages);
  const cloturee = estCloturee(c);
  const reste = prochaine ? diffDays(prochaine, today()) : null;
  const peutRelancer = c.statut === "envoyee" || c.statut === "relancee";

  return (
    <Sheet
      titre={c.studio || "Candidature"}
      sousTitre={<span className="flex flex-wrap items-center gap-2"><span>{c.poste}</span><BadgeStatut statut={c.statut} /></span>}
      onClose={onClose}
      large
      pied={<div className="flex items-center justify-between"><button className="bouton bouton-texte bouton-danger" onClick={supprimer}><Trash2 />Supprimer</button><button className="bouton bouton-plein" onClick={onClose}>Terminé</button></div>}
    >
      {c.cloture_auto && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] p-3 text-[13px]">
          <span>Passée automatiquement en « sans réponse » après deux relances restées sans réponse.</span>
          <button className="bouton bouton-petit" onClick={annulerCloture}><Undo2 />Annuler</button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="meta">Statut</p>
          <select className="champ mt-1.5" value={c.statut} onChange={(e) => changerStatut(e.target.value as Statut)} aria-label="Statut">
            {STATUTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="meta">Prochaine relance</p>
          <p className={`mt-1.5 text-lg font-bold leading-tight ${reste !== null && reste <= 0 ? "text-danger" : ""}`}>{prochaine ? fmt(prochaine) : "—"}</p>
          <p className="micro">{prochaine ? (reste! <= 0 ? "à faire maintenant" : `dans ${reste} jours ouvrés`) : "Calculée dès l’envoi."}</p>
        </div>
      </div>

      {cloturee ? (
        <div className="mb-5 rounded-xl bg-surface-2 p-3">
          <p className="meta">Motif de clôture{c.date_statut ? ` · ${fmt(c.date_statut)}` : ""}</p>
          <input className="champ mt-1.5" placeholder="Poste pourvu, profil différent, pas de retour…" aria-label="Motif de clôture" value={c.motif_cloture ?? ""} onChange={(e) => maj({ motif_cloture: e.target.value || null })} />
        </div>
      ) : (
        <div className="mb-5 rounded-xl bg-surface-2 p-3">
          <p className="meta">Prochaine action</p>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input className="champ" aria-label="Prochaine action" placeholder={action ? `${action.texte} (proposée)` : "Ex. envoyer le portfolio mis à jour"} value={c.prochaine_action ?? ""} onChange={(e) => maj({ prochaine_action: e.target.value || null })} />
            <input type="date" className="champ sm:w-40" aria-label="Date de la prochaine action" value={c.prochaine_action_date ?? ""} onChange={(e) => maj({ prochaine_action_date: e.target.value || null })} />
            {(c.prochaine_action || c.prochaine_action_date) && <button className="bouton" onClick={() => maj({ prochaine_action: null, prochaine_action_date: null })}>Effacer</button>}
          </div>
          {!c.prochaine_action && action && <p className="micro mt-1.5">Sans saisie, l’app propose : « {action.texte} »{action.date ? ` le ${fmt(action.date)}` : ""}.</p>}
        </div>
      )}

      <h3 className="titre-section mb-3">Historique</h3>
      <ol className="chronologie">
        <li>
          <span className="point" style={{ ["--c" as string]: "var(--info)" }} />
          <p className="text-[13px] font-semibold">{c.date_envoi ? `Candidature envoyée · ${fmt(c.date_envoi)}` : "Candidature à préparer"}</p>
          <p className="micro">{c.date_envoi ? <><IconeCanal canal={c.canal} /> {labelCanal(c.canal)} · {ilYa(diffDays(today(), c.date_envoi))}</> : "Passe-la en « Envoyée » une fois partie."}</p>
        </li>
        {rs.map((r, i) => (
          <li key={r.id}>
            <span className="point" style={{ ["--c" as string]: "var(--warn)" }} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold">Relance {i + 1} · {fmt(r.date)}</p>
                <p className="micro"><IconeCanal canal={r.canal} /> {labelCanal(r.canal)} · {ilYa(diffDays(today(), r.date))}</p>
                {r.note && <p className="mt-0.5 text-[13px] text-muted">{r.note}</p>}
              </div>
              <button className="bouton bouton-petit bouton-texte flex-none" onClick={() => s.remove("relances", r.id)}>Retirer</button>
            </div>
          </li>
        ))}
        {c.statut === "entretien" && (
          <li>
            <span className="point" style={{ ["--c" as string]: "#8a52d9" }} />
            <p className="text-[13px] font-semibold">Entretien{c.prochaine_action_date ? ` · ${fmt(c.prochaine_action_date)}` : " fixé"}</p>
            {c.prochaine_action && <p className="micro">{c.prochaine_action}</p>}
          </li>
        )}
        {c.statut === "peut_etre" && (
          <li>
            <span className="point" style={{ ["--c" as string]: "#0e8fa3" }} />
            <p className="text-[13px] font-semibold">Peut-être{c.date_statut ? ` · ${fmt(c.date_statut)}` : ""}</p>
            {c.prochaine_action && <p className="micro">{c.prochaine_action}{c.prochaine_action_date ? ` · ${fmt(c.prochaine_action_date)}` : ""}</p>}
          </li>
        )}
        {cloturee && (
          <li>
            <span className="point" style={{ ["--c" as string]: c.statut === "acceptee" ? "var(--ok)" : c.statut === "refus" ? "var(--danger)" : "var(--muted)" }} />
            <p className="text-[13px] font-semibold">{c.cloture_auto ? "Clôturée sans réponse (automatique)" : labelStatut(c.statut)}{c.date_statut ? ` · ${fmt(c.date_statut)}` : ""}</p>
            {c.motif_cloture && <p className="micro">{c.motif_cloture}</p>}
          </li>
        )}
        {prochaine && (
          <li>
            <span className="point !border-dashed" style={{ ["--c" as string]: reste! <= 0 ? "var(--danger)" : "var(--muted)" }} />
            <p className="text-[13px] font-semibold text-muted">Prochaine relance prévue · {fmt(prochaine)}</p>
          </li>
        )}
      </ol>

      {peutRelancer && (
        <form onSubmit={relancer} className="mt-1 grid grid-cols-1 gap-2 rounded-xl bg-surface-2 p-3 sm:grid-cols-2">
          <p className="meta sm:col-span-2">Enregistrer une relance</p>
          <input type="date" className="champ" value={rDate} onChange={(e) => setRDate(e.target.value)} aria-label="Date de la relance" />
          <select className="champ" value={rCanal} onChange={(e) => setRCanal(e.target.value as Canal)} aria-label="Canal de la relance">
            {CANAUX.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
          <input className="champ sm:col-span-2" placeholder="Note (facultatif)" value={rNote} onChange={(e) => setRNote(e.target.value)} />
          <button className="bouton bouton-plein sm:col-span-2"><Send />J’ai relancé</button>
        </form>
      )}
      {!peutRelancer && rs.length === 0 && (
        <p className="micro">Après {s.reglages.delai_relance_1} jours ouvrés sans réponse, la candidature apparaît dans « À relancer aujourd’hui ».</p>
      )}

      {(contact || prod) && (
        <div className="mt-6 space-y-2">
          <h3 className="titre-section">Liens</h3>
          {contact && (
            <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
              <Avatar nom={`${contact.prenom} ${contact.nom}`} taille={32} rond />
              <div className="min-w-0 text-[13px]"><strong className="block truncate">{contact.prenom} {contact.nom}</strong><span className="micro block truncate">{[contact.fonction, contact.email].filter(Boolean).join(" · ") || "Contact lié"}</span></div>
              <User className="ml-auto h-4 w-4 flex-none text-muted" />
            </div>
          )}
          {prod && <div className="rounded-xl border border-line p-2.5 text-[13px]">Production liée : <strong>{prod.titre}</strong></div>}
        </div>
      )}

      <h3 className="titre-section mb-3 mt-6">Détails</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label="Studio"><input {...texte("studio")} /></Champ>
        <Champ label="Poste ou type de candidature"><input {...texte("poste")} /></Champ>
        <Champ label="Date d’envoi"><input type="date" className="champ" value={c.date_envoi ?? ""} onChange={(e) => maj({ date_envoi: e.target.value || null })} /></Champ>
        <Champ label="Canal">
          <select className="champ" value={c.canal} onChange={(e) => maj({ canal: e.target.value as Canal })}>
            {canauxPour(c.canal).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </Champ>
        <Champ label="Catégorie">
          <select className="champ" value={c.categorie} onChange={(e) => maj({ categorie: e.target.value as "decor" | "autre" })}>
            <option value="decor">Décor</option><option value="autre">Autre métier</option>
          </select>
        </Champ>
        <Champ label="Version du portfolio et du CV"><input {...texte("version_cv")} /></Champ>
        <Champ label="Contact lié" className="sm:col-span-2">
          <select className="champ" value={c.contact_id ?? ""} onChange={(e) => maj({ contact_id: e.target.value || null })}>
            <option value="">Aucun</option>
            {s.data.contacts.map((k) => <option key={k.id} value={k.id}>{k.prenom} {k.nom}{k.structure ? ` (${k.structure})` : ""}</option>)}
          </select>
        </Champ>
        <Champ label="Lien de l’annonce" className="sm:col-span-2">
          <div className="flex gap-2">
            <input {...texte("source_url")} placeholder="https://" />
            {c.source_url && <a className="bouton bouton-icone flex-none" href={c.source_url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien"><ExternalLink /></a>}
          </div>
        </Champ>
        <Champ label="Pièces jointes ou liens" className="sm:col-span-2"><textarea {...texte("liens")} placeholder="Un lien par ligne" /></Champ>
        <Champ label="Notes" className="sm:col-span-2"><textarea {...texte("notes")} /></Champ>
      </div>
    </Sheet>
  );
}
