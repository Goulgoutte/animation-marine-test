"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { tonFraicheur, dernierEchange } from "@/lib/contacts";
import { encre, libellesDe, nomComplet, valeur } from "@/lib/crm";
import { diffDays, ilYa, today } from "@/lib/dates";
import type { SelectionContacts } from "./Tableau";
import type { Crm } from "./useCrm";

/** Mobile : une liste de cartes par groupe, repliable. Le tap ouvre la fiche (toutes les colonnes y sont modifiables). */
export function ListeMobile({ crm, onOuvrir, selection }: { crm: Crm; onOuvrir: (id: string) => void; selection?: SelectionContacts }) {
  const { groupes, s } = crm;
  const colStatut = crm.visibles.find((c) => c.type === "statut") ?? crm.colonnes.find((c) => c.type === "statut");
  const [ajout, setAjout] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  return (
    <div className="space-y-4">
      {groupes.map((g) => {
        const l = crm.lignes(g.id);
        return (
          <section key={g.id} aria-label={`Groupe ${g.titre}`}>
            <button type="button" aria-expanded={!g.replie} aria-label={`${g.replie ? "Déplier" : "Replier"} le groupe ${g.titre}`} onClick={() => crm.patchGroupe(g.id, { replie: !g.replie })} className="flex w-full items-center gap-2 py-1.5 text-left" style={{ color: g.couleur }}>
              <ChevronDown className={`h-4 w-4 flex-none transition-transform ${g.replie ? "-rotate-90" : ""}`} />
              <span className="text-[15px] font-semibold">{g.titre}</span>
              <span className="micro">{l.length}</span>
            </button>
            {!g.replie && (
              <ul className="space-y-2">
                {l.map((c) => {
                  const n = nomComplet(c);
                  const lib = colStatut ? libellesDe(colStatut).find((x) => x.id === valeur(c, colStatut)) : undefined;
                  const d = dernierEchange(c.id, s.data.echanges);
                  const j = d ? diffDays(today(), d) : null;
                  const ton = tonFraicheur(j, s.reglages.delai_contact_mois);
                  return (
                    <li key={c.id}>
                      <button type="button" role={selection ? "checkbox" : undefined} aria-checked={selection ? selection.ids.has(c.id) : undefined} aria-label={selection ? `Sélectionner ${n || "ce contact"}` : undefined} onClick={() => (selection ? selection.basculer(c.id) : onOuvrir(c.id))} className="carte carte-lien flex w-full items-center gap-3 overflow-hidden py-3 pl-4 pr-3 text-left" style={{ boxShadow: selection?.ids.has(c.id) ? `inset 4px 0 0 ${g.couleur}, 0 0 0 2px var(--accent)` : `inset 4px 0 0 ${g.couleur}` }}>
                        {selection && <span className={`grid h-5 w-5 flex-none place-items-center rounded-md border ${selection.ids.has(c.id) ? "border-accent bg-accent text-white" : "border-line bg-surface"}`}>{selection.ids.has(c.id) && <Check className="h-3.5 w-3.5" />}</span>}
                        <Avatar nom={n || "?"} taille={40} rond />
                        <span className="min-w-0 flex-1">
                          <strong className="block truncate text-[14.5px] font-semibold">{n || "Sans nom"}</strong>
                          <span className="block truncate text-[13px] text-muted">{c.structure || "Structure non renseignée"}</span>
                          <span className={`c-${ton} mt-0.5 block truncate text-[12px] font-medium text-[var(--c)]`}>{j === null ? "Jamais d’échange" : `Échange ${ilYa(j)}`}</span>
                        </span>
                        {lib && <span className="max-w-[40%] flex-none truncate rounded-md px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: lib.couleur, color: encre(lib.couleur) }}>{lib.label}</span>}
                      </button>
                    </li>
                  );
                })}
                <li>
                  {ajout === g.id ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (nom.trim()) crm.ajouterContact(g.id, nom.trim()); setNom(""); }}>
                      <input autoFocus className="champ" aria-label={`Nom du nouveau contact dans ${g.titre}`} placeholder="Prénom Nom" value={nom} onChange={(e) => setNom(e.target.value)} onBlur={() => { if (!nom.trim()) setAjout(null); }} />
                      <button className="bouton bouton-plein flex-none">Ajouter</button>
                    </form>
                  ) : (
                    <button type="button" className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2.5 text-[13px] font-medium text-muted hover:text-accent" onClick={() => setAjout(g.id)}><Plus className="h-4 w-4" />Ajouter un contact</button>
                  )}
                </li>
              </ul>
            )}
          </section>
        );
      })}
      <button type="button" className="bouton" onClick={() => crm.ajouterGroupe()}><Plus />Ajouter un groupe</button>
    </div>
  );
}
