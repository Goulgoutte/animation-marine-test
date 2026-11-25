"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Avatar, Champ } from "@/components/ui";
import { labelLien, nomContact, TYPES_LIEN } from "@/lib/reseau";
import { useStore } from "@/lib/store";
import type { Contact, TypeLien } from "@/lib/types";

/** Section « Liens » de la fiche contact : personnes liées (avec le type) et ajout d'un lien. */
export function LiensDuContact({ c }: { c: Contact }) {
  const s = useStore();
  const liens = s.data.liens_contacts.filter((l) => l.contact_a === c.id || l.contact_b === c.id);
  const autres = s.data.contacts.filter((k) => k.id !== c.id).sort((a, b) => nomContact(a).localeCompare(nomContact(b), "fr"));
  const [ouvert, setOuvert] = useState(false);
  const [autre, setAutre] = useState("");
  const [type, setType] = useState<TypeLien>("ami");
  const [sens, setSens] = useState<"moi" | "lui">("lui"); // pour « présenté » : qui a présenté qui
  const [production, setProduction] = useState("");

  const cible = autres.find((k) => k.id === autre);
  const [a, b] = type === "presente_par" && sens === "moi" ? [c.id, autre] : type === "presente_par" ? [autre, c.id] : [c.id, autre];
  const doublon = !!autre && s.data.liens_contacts.some((l) => l.type === type && ((l.contact_a === a && l.contact_b === b) || (type !== "presente_par" && l.contact_a === b && l.contact_b === a)));

  function ajouter(ev: React.FormEvent) {
    ev.preventDefault();
    if (!autre || doublon) return;
    s.add("liens_contacts", { contact_a: a, contact_b: b, type, production: production.trim() || null, note: null });
    setAutre(""); setProduction(""); setOuvert(false);
  }

  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <h3 className="titre-section">Liens <span className="font-normal text-muted">({liens.length})</span></h3>
        <button type="button" className="bouton bouton-petit" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}><Plus />Ajouter</button>
      </div>
      {ouvert && (
        <form onSubmit={ajouter} className="mb-3 grid gap-2 rounded-xl bg-surface-2 p-3" aria-label="Ajouter un lien">
          {autres.length === 0 ? (
            <p className="micro">Ajoute d’abord une autre personne dans tes contacts.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Champ label="Personne">
                  <select className="champ" required value={autre} onChange={(e) => setAutre(e.target.value)}>
                    <option value="">Choisir…</option>
                    {autres.map((k) => <option key={k.id} value={k.id}>{nomContact(k)}{k.structure ? ` · ${k.structure}` : ""}</option>)}
                  </select>
                </Champ>
                <Champ label="Type de lien">
                  <select className="champ" value={type} onChange={(e) => setType(e.target.value as TypeLien)}>
                    {TYPES_LIEN.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </Champ>
              </div>
              {type === "presente_par" && (
                <Champ label="Sens">
                  <select className="champ" value={sens} onChange={(e) => setSens(e.target.value as "moi" | "lui")}>
                    <option value="lui">{cible?.prenom || "L’autre personne"} a présenté {c.prenom || "ce contact"}</option>
                    <option value="moi">{c.prenom || "Ce contact"} a présenté {cible?.prenom || "l’autre personne"}</option>
                  </select>
                </Champ>
              )}
              <Champ label="Production en commun (facultatif)"><input className="champ" value={production} onChange={(e) => setProduction(e.target.value)} placeholder="Les Vacances de Zoé" /></Champ>
              {doublon && <p className="micro text-warn">Ce lien existe déjà.</p>}
              <div><button className="bouton bouton-plein" disabled={!autre || doublon}><Plus />Ajouter le lien</button></div>
            </>
          )}
        </form>
      )}
      {liens.length === 0 ? (
        <p className="micro">Aucun lien. Note qui t’a présenté qui, ou qui a travaillé avec qui : l’onglet Réseau en tire des chemins vers les studios.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {liens.map((l) => {
            const moiEstA = l.contact_a === c.id;
            const k = s.data.contacts.find((x) => x.id === (moiEstA ? l.contact_b : l.contact_a));
            if (!k) return null;
            const nom = nomContact(k);
            const prenomK = k.prenom || nom;
            const prenomC = c.prenom || "ce contact";
            const sous = l.type === "presente_par" ? (moiEstA ? `${prenomC} a présenté ${prenomK}` : `${prenomK} a présenté ${prenomC}`) : labelLien(l.type);
            return (
              <li key={l.id} className="relative max-w-full min-w-0">
                <button type="button" title={l.production ?? undefined} onClick={() => s.setFocus({ kind: "contact", id: k.id })} className="flex min-w-0 max-w-full items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-8 text-left transition-colors hover:bg-accent-soft">
                  <Avatar nom={nom} taille={26} rond />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13px] font-semibold">{nom}</span>
                    <span className="block truncate text-[11px] text-muted">{sous}{l.production ? ` · ${l.production}` : ""}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Retirer le lien avec ${nom}`} onClick={() => s.remove("liens_contacts", l.id)} className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-[color-mix(in_srgb,var(--fg)_10%,transparent)] hover:text-fg"><X className="h-3 w-3" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
