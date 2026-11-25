"use client";

import { BellRing, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FicheContact } from "@/components/FicheContact";
import { Avatar, Champ, EnTete, Onglets, Sheet, Vide } from "@/components/ui";
import { tonFraicheur } from "@/lib/contacts";
import { fmtCourt, ilYa } from "@/lib/dates";
import { useIndicateurs } from "@/lib/indicateurs";
import { useStore } from "@/lib/store";
import type { Contact } from "@/lib/types";

type Tri = "oublies" | "recents" | "nom";
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Contacts() {
  const s = useStore();
  const { suivis, contactsARecontacter, actionsContacts } = useIndicateurs();
  const [tri, setTri] = useState<Tri>("oublies");
  const [q, setQ] = useState("");
  const [etiquette, setEtiquette] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState(false);

  useEffect(() => {
    if (s.focus?.kind === "contact") {
      setOuvert(s.focus.id);
      s.setFocus(null);
    }
  }, [s.focus, s]);

  const etiquettes = useMemo(() => {
    const m = new Map<string, number>();
    s.data.contacts.forEach((c) => c.etiquettes.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"));
  }, [s.data.contacts]);

  const lignes = useMemo(() => {
    const t = norm(q.trim());
    const base = suivis
      .filter((x) => !etiquette || (etiquette === "__rappel" ? x.oublie : x.c.etiquettes.includes(etiquette)))
      .filter((x) => !t || norm(`${x.c.prenom} ${x.c.nom} ${x.c.structure ?? ""} ${x.c.fonction ?? ""} ${x.c.etiquettes.join(" ")}`).includes(t));
    return base.sort((a, b) => {
      if (tri === "nom") return `${a.c.nom}${a.c.prenom}`.localeCompare(`${b.c.nom}${b.c.prenom}`, "fr");
      const ja = a.jours ?? 99999;
      const jb = b.jours ?? 99999;
      return tri === "oublies" ? jb - ja : ja - jb;
    });
  }, [suivis, tri, q, etiquette]);

  const courant = s.data.contacts.find((c) => c.id === ouvert) ?? null;

  function creer(p: Partial<Contact>) {
    const c = s.add("contacts", { nom: "", prenom: "", structure: null, fonction: null, ville: null, email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: [], ...p });
    setNouveau(false);
    setOuvert(c.id);
  }

  return (
    <>
      <EnTete
        titre="Contacts"
        description={contactsARecontacter.length > 0 ? <><strong className="font-semibold text-warn">{contactsARecontacter.length}</strong> à recontacter (plus de {s.reglages.delai_contact_mois} mois sans échange)</> : "Ton réseau professionnel"}
        droite={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}><Plus />Contact</button>}
      />
      {actionsContacts.length > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] px-3.5 py-2.5 text-[13px] font-medium">
          <BellRing className="h-4 w-4 flex-none text-warn" />{actionsContacts.length} prochaine{actionsContacts.length > 1 ? "s" : ""} action{actionsContacts.length > 1 ? "s" : ""} arrivée{actionsContacts.length > 1 ? "s" : ""} à échéance dans les journaux d’échanges.
        </p>
      )}

      <div className="carte mb-5 flex flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Onglets valeur={tri} onChange={setTri} options={[{ id: "oublies", label: "Pas vu depuis longtemps" }, { id: "recents", label: "Récents" }, { id: "nom", label: "Nom" }]} />
          <label className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="champ !pl-9" placeholder="Chercher un nom, un studio…" aria-label="Chercher un contact" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {(etiquettes.length > 0 || contactsARecontacter.length > 0) && (
          <div className="flex flex-wrap gap-1.5 border-t border-line pt-3" role="group" aria-label="Filtrer par étiquette">
            <button className="puce" aria-pressed={etiquette === null} onClick={() => setEtiquette(null)}>Tous <span className="opacity-70">{s.data.contacts.length}</span></button>
            {contactsARecontacter.length > 0 && <button className="puce" aria-pressed={etiquette === "__rappel"} onClick={() => setEtiquette(etiquette === "__rappel" ? null : "__rappel")}>À recontacter <span className="opacity-70">{contactsARecontacter.length}</span></button>}
            {etiquettes.map(([t, n]) => (
              <button key={t} className="puce" aria-pressed={etiquette === t} onClick={() => setEtiquette(etiquette === t ? null : t)}>{t} <span className="opacity-70">{n}</span></button>
            ))}
          </div>
        )}
      </div>

      {s.data.contacts.length === 0 ? (
        <Vide icone={Users} titre="Aucun contact" action={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}><Plus />Ajouter un contact</button>}>
          Note ici les personnes rencontrées (superviseurs, chargées de production, RH…) et chaque échange : l’app te rappelle de reprendre contact au bout de {s.reglages.delai_contact_mois} mois.
        </Vide>
      ) : lignes.length === 0 ? (
        <Vide icone={Search} titre="Aucun résultat">Aucun contact ne correspond à ces filtres.</Vide>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lignes.map(({ c, dernier, oublie, jours }) => {
            const ton = tonFraicheur(jours, s.reglages.delai_contact_mois);
            const nom = `${c.prenom} ${c.nom}`.trim();
            return (
              <li key={c.id}>
                <button onClick={() => setOuvert(c.id)} className="carte carte-lien flex h-full w-full items-center gap-3.5 p-4 text-left">
                  <Avatar nom={nom || "?"} taille={44} rond />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[14.5px] font-semibold">{nom || "Sans nom"}</strong>
                    <span className="block truncate text-[13px] text-muted">{[c.fonction, c.structure].filter(Boolean).join(" · ") || "Fonction et structure non renseignées"}</span>
                    {c.etiquettes.length > 0 && <span className="mt-1.5 flex flex-wrap gap-1">{c.etiquettes.map((t) => <span key={t} className="etiquette">{t}</span>)}</span>}
                  </span>
                  <span className="flex-none text-right">
                    <span className={`badge c-${ton}`}>
                      <span className="pastille !h-1.5 !w-1.5 bg-[var(--c)]" />
                      {jours === null ? "Jamais vu" : `Vu ${ilYa(jours)}`}
                    </span>
                    {dernier && <span className="micro mt-1 block">{fmtCourt(dernier)}</span>}
                    {oublie && <span className="mt-1 block text-[11px] font-semibold text-danger">À recontacter</span>}
                  </span>
                </button>
              </li>
            );
          })}
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
      <Champ label="Prénom"><input className="champ" autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} /></Champ>
      <Champ label="Nom"><input className="champ" required value={nom} onChange={(e) => setNom(e.target.value)} /></Champ>
      <Champ label="Studio ou structure"><input className="champ" value={structure} onChange={(e) => setStructure(e.target.value)} /></Champ>
      <button className="bouton bouton-plein">Créer et ouvrir la fiche</button>
    </form>
  );
}
