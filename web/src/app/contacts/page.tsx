"use client";

import { useMemo, useState } from "react";
import { FicheContact } from "@/components/FicheContact";
import { EnTete, Onglets, Sheet, Vide } from "@/components/ui";
import { addMonths, diffDays, fmtCourt, ilYa, today } from "@/lib/dates";
import { dernierEchange } from "@/lib/contacts";
import { useStore } from "@/lib/store";
import type { Contact, Echange } from "@/lib/types";

type Tri = "oublies" | "recents" | "nom";

export default function Contacts() {
  const s = useStore();
  const [tri, setTri] = useState<Tri>("oublies");
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState(false);

  const seuil = addMonths(today(), -s.reglages.delai_contact_mois);
  const lignes = useMemo(() => {
    const base = s.data.contacts
      .map((c) => ({ c, dernier: dernierEchange(c.id, s.data.echanges) }))
      .map((x) => ({ ...x, oublie: !x.dernier || x.dernier < seuil, jours: x.dernier ? diffDays(today(), x.dernier) : null }))
      .filter((x) => `${x.c.prenom} ${x.c.nom} ${x.c.structure ?? ""} ${x.c.fonction ?? ""} ${x.c.etiquettes.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
    return base.sort((a, b) => {
      if (tri === "nom") return `${a.c.nom}${a.c.prenom}`.localeCompare(`${b.c.nom}${b.c.prenom}`, "fr");
      const ja = a.jours ?? 99999;
      const jb = b.jours ?? 99999;
      return tri === "oublies" ? jb - ja : ja - jb;
    });
  }, [s.data.contacts, s.data.echanges, tri, q, seuil]);

  const aRecontacter = lignes.filter((l) => l.oublie).length;
  const courant = s.data.contacts.find((c) => c.id === ouvert) ?? null;
  const prochaines = s.data.echanges.filter((e) => e.prochaine_action && e.prochaine_date && e.prochaine_date <= today()).length;

  function creer(p: Partial<Contact>) {
    const c = s.add("contacts", { nom: "", prenom: "", structure: null, fonction: null, ville: null, email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: [], ...p });
    setNouveau(false);
    setOuvert(c.id);
  }

  return (
    <>
      <EnTete
        surtitre="Contacts"
        titre={aRecontacter > 0 ? <><span className="text-[var(--color-red)]">{aRecontacter}</span> à recontacter</> : <>Réseau</>}
        droite={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}>+ Contact</button>}
      />
      {prochaines > 0 && <p className="mb-4 rounded-lg bg-[var(--color-mustard)]/40 px-3 py-2 text-sm font-semibold">{prochaines} prochaine(s) action(s) arrivée(s) à échéance dans les journaux d’échanges.</p>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Onglets valeur={tri} onChange={setTri} options={[{ id: "oublies", label: "Pas vu depuis longtemps" }, { id: "recents", label: "Récents" }, { id: "nom", label: "Nom" }]} />
        <input className="champ max-w-xs" placeholder="Chercher" aria-label="Chercher un contact" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {s.data.contacts.length === 0 ? (
        <Vide titre="Aucun contact" action={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}>Ajouter un contact</button>}>
          Note ici les personnes rencontrées (superviseurs, chargées de production, RH…) et chaque échange : l’app te rappelle de reprendre contact au bout de {s.reglages.delai_contact_mois} mois.
        </Vide>
      ) : lignes.length === 0 ? (
        <Vide titre="Aucun résultat">Aucun contact ne correspond à « {q} ».</Vide>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {lignes.map(({ c, dernier, oublie, jours }) => (
            <li key={c.id}>
              <button onClick={() => setOuvert(c.id)} className={`carte carte-lien flex h-full w-full items-start justify-between gap-3 p-4 text-left ${oublie ? "trait-rouge" : ""}`}>
                <span className="min-w-0">
                  <strong className="titre-l block break-words">{c.prenom} {c.nom}</strong>
                  <span className="block text-sm">{[c.fonction, c.structure].filter(Boolean).join(" · ") || "Fonction et structure non renseignées"}</span>
                  <span className="mt-1 flex flex-wrap gap-1">{c.etiquettes.map((t) => <span key={t} className="etiquette">{t}</span>)}</span>
                </span>
                <span className="shrink-0 text-right">
                  {dernier ? (
                    <>
                      <span className="chiffre block !text-[2.6rem]">{jours}</span>
                      <span className="micro">jours · {fmtCourt(dernier)}</span>
                    </>
                  ) : (
                    <span className="micro">Aucun échange</span>
                  )}
                  {oublie && <span className="badge badge-plein b-nouveau mt-1 block">À recontacter</span>}
                </span>
              </button>
              <span className="sr-only">{dernier ? `Dernier échange ${ilYa(jours!)}` : ""}</span>
            </li>
          ))}
        </ul>
      )}

      {courant && <FicheContact c={courant} onClose={() => setOuvert(null)} />}
      {nouveau && (
        <Sheet titre="Nouveau contact" onClose={() => setNouveau(false)}>
          <NouveauContact onCreer={creer} />
        </Sheet>
      )}
    </>
  );
}

function NouveauContact({ onCreer }: { onCreer: (p: Partial<Contact>) => void }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [structure, setStructure] = useState("");
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onCreer({ prenom, nom, structure: structure || null }); }}>
      <label className="flex flex-col gap-1"><span className="meta">Prénom</span><input className="champ" autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><span className="meta">Nom</span><input className="champ" required value={nom} onChange={(e) => setNom(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><span className="meta">Studio ou structure</span><input className="champ" value={structure} onChange={(e) => setStructure(e.target.value)} /></label>
      <button className="bouton bouton-plein">Créer et ouvrir la fiche</button>
    </form>
  );
}
