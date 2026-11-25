"use client";

import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ChampTexte } from "@/components/studios/Edition";
import { Champ } from "@/components/ui";
import { useStore } from "@/lib/store";
import { ROLES, normStudio, studioVide } from "@/lib/studios";
import type { Contact, RoleStudio } from "@/lib/types";

/** Section « Studios » de la fiche contact : liens (contact ou ami) et ajout. */
export function StudiosDuContact({ c, onOuvrirStudio }: { c: Contact; onOuvrirStudio: (id: string) => void }) {
  const s = useStore();
  const liens = s.data.contact_studios.filter((l) => l.contact_id === c.id);
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleStudio>("contact");
  const [detail, setDetail] = useState("");

  const cle = normStudio(q);
  const candidats = useMemo(
    () => s.data.studios.filter((x) => (!cle || normStudio(x.nom).includes(cle)) && !liens.some((l) => l.studio_id === x.id && l.role === role)).slice(0, 6),
    [s.data.studios, cle, liens, role],
  );
  const exact = s.data.studios.some((x) => normStudio(x.nom) === cle);

  function lier(studioId: string) {
    s.add("contact_studios", { contact_id: c.id, studio_id: studioId, role, detail: detail.trim() || null });
    setQ(""); setDetail(""); setOuvert(false);
  }

  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <h3 className="titre-section">Studios <span className="font-normal text-muted">({liens.length})</span></h3>
        <button type="button" className="bouton bouton-petit" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}><Plus />Ajouter</button>
      </div>
      {ouvert && (
        <div className="mb-3 grid gap-2 rounded-xl bg-surface-2 p-3" role="group" aria-label="Ajouter un studio">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem]">
            <Champ label="Studio"><input className="champ" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="La Chouette Compagnie" /></Champ>
            <Champ label="Lien">
              <select className="champ" value={role} onChange={(e) => setRole(e.target.value as RoleStudio)}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Champ>
          </div>
          <Champ label="Détail"><input className="champ" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Régulière en décor depuis 2023" /></Champ>
          <ul className="space-y-1">
            {candidats.map((x) => (
              <li key={x.id}>
                <button type="button" className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent-soft" onClick={() => lier(x.id)}>
                  <Building2 className="h-4 w-4 flex-none text-muted" />
                  <span className="min-w-0 flex-1 truncate"><strong>{x.nom}</strong>{x.ville ? <span className="text-muted"> · {x.ville}</span> : null}</span>
                  <Plus className="h-3.5 w-3.5 flex-none text-muted" />
                </button>
              </li>
            ))}
          </ul>
          {cle && !exact && (
            <button type="button" className="bouton bouton-petit justify-start" onClick={() => lier(s.add("studios", studioVide(q, c.ville)).id)}><Plus />Créer le studio « {q.trim()} »</button>
          )}
        </div>
      )}
      {liens.length === 0 ? (
        <p className="micro">Aucun studio lié. Note ici où cette personne travaille, ou de quel studio elle est une habituée.</p>
      ) : (
        <ul className="space-y-2">
          {liens.map((l) => {
            const x = s.data.studios.find((k) => k.id === l.studio_id);
            if (!x) return null;
            return (
              <li key={l.id} className="rounded-xl border border-line p-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Building2 className="h-4 w-4 flex-none text-muted" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOuvrirStudio(x.id)} aria-label={`Ouvrir la fiche de ${x.nom}`}>
                    <strong className="block truncate text-[13.5px] underline-offset-2 hover:underline">{x.nom}</strong>
                    <span className="micro block truncate">{l.role === "ami" ? "Amie ou ami" : "Contact"}{x.ville ? ` · ${x.ville}` : ""}</span>
                  </button>
                  <button type="button" className="bouton bouton-petit bouton-texte flex-none" onClick={() => s.remove("contact_studios", l.id)}>Retirer</button>
                </div>
                <div className="mt-1.5 pl-7"><ChampTexte aria-label={`Détail pour ${x.nom}`} valeur={l.detail} onSave={(v) => s.patch("contact_studios", l.id, { detail: v })} placeholder="Détail" /></div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
