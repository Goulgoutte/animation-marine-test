"use client";

import { Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Champ } from "@/components/ui";
import { decouperNom, rangSuivant, triees } from "@/lib/crm";
import { useStore } from "@/lib/store";
import { ROLES, normStudio } from "@/lib/studios";
import type { Contact, RoleStudio, Studio } from "@/lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Lier un contact existant (ou en créer un) à un studio, en tant que contact ou ami. */
export function AjoutPersonne({ studio, role, titre, onFini }: { studio: Studio; role: RoleStudio; titre: string; onFini: () => void }) {
  const s = useStore();
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState("");
  const [roleAjout, setRoleAjout] = useState<RoleStudio>(role);

  const candidats = useMemo(() => {
    const t = norm(q.trim());
    const deja = new Set(s.data.contact_studios.filter((l) => l.studio_id === studio.id && l.role === roleAjout).map((l) => l.contact_id));
    return s.data.contacts.filter((c) => !deja.has(c.id) && (!t || norm(`${c.prenom} ${c.nom} ${c.structure ?? ""}`).includes(t))).slice(0, 6);
  }, [q, s.data.contacts, s.data.contact_studios, studio.id, roleAjout]);

  function lier(c: Contact) {
    s.add("contact_studios", { contact_id: c.id, studio_id: studio.id, role: roleAjout, detail: detail.trim() || null });
    setQ(""); setDetail(""); onFini();
  }
  function creer() {
    const { prenom, nom } = decouperNom(q);
    if (!nom) return;
    const g = triees(s.data.crm_groupes)[0]?.id ?? null;
    const dans = s.data.contacts.filter((c) => c.groupe_id === g);
    const c = s.add("contacts", {
      nom, prenom, structure: roleAjout === "contact" ? studio.nom : null, fonction: null, ville: null, email: null, telephone: null, linkedin: null,
      rencontre: null, etiquettes: [], groupe_id: g, champs: {}, ordre: rangSuivant(dans),
    });
    lier(c);
  }

  return (
    <div className="mb-3 grid gap-2 rounded-xl bg-surface-2 p-3" role="group" aria-label={`Ajouter dans ${titre}`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem]">
        <Champ label="Chercher un contact ou saisir un nom"><input className="champ" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prénom Nom" /></Champ>
        <Champ label="Rôle">
          <select className="champ" value={roleAjout} onChange={(e) => setRoleAjout(e.target.value as RoleStudio)}>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Champ>
      </div>
      <Champ label="Détail"><input className="champ" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Régulière en décor depuis 2023" /></Champ>
      <ul className="space-y-1">
        {candidats.map((c) => (
          <li key={c.id}>
            <button type="button" className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent-soft" onClick={() => lier(c)}>
              <Avatar nom={`${c.prenom} ${c.nom}`} taille={24} rond />
              <span className="min-w-0 flex-1 truncate"><strong>{`${c.prenom} ${c.nom}`.trim()}</strong>{c.structure ? <span className="text-muted"> · {c.structure}</span> : null}</span>
              <Plus className="h-3.5 w-3.5 flex-none text-muted" />
            </button>
          </li>
        ))}
      </ul>
      {q.trim() && normStudio(q) && (
        <button type="button" className="bouton bouton-petit justify-start" onClick={creer}><UserPlus />Créer le contact « {q.trim()} » en tant que {roleAjout === "ami" ? "ami" : "contact"}</button>
      )}
    </div>
  );
}
