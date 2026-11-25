"use client";

import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Pastille } from "@/components/studios/Pastilles";
import { Champ, Vignette } from "@/components/ui";
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
        <div className="space-y-3">
          {([["ami", "Amie ou ami de"], ["contact", "Contact chez"]] as [RoleStudio, string][]).map(([r, titre]) => {
            const liste = liens.filter((l) => l.role === r);
            if (liste.length === 0) return null;
            return (
              <div key={r}>
                <p className="meta mb-1.5">{titre}</p>
                <div className="flex flex-wrap gap-2">
                  {liste.map((l) => {
                    const x = s.data.studios.find((k) => k.id === l.studio_id);
                    if (!x) return null;
                    return <Pastille key={l.id} role={r} nom={x.nom} sous={x.ville} detail={l.detail} avatar={<Vignette image={x.logo} nom={x.nom} taille={26} />} onOuvrir={() => onOuvrirStudio(x.id)} onRetirer={() => s.remove("contact_studios", l.id)} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
