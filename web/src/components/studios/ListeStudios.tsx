"use client";

import { Building2, MapPin, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet, Vide, Vignette } from "@/components/ui";
import { NouveauStudio } from "@/components/studios/NouveauStudio";
import { FicheStudio } from "@/components/studios/FicheStudio";
import { PastilleMode, PileAvatars } from "@/components/studios/Pastilles";
import { useStore } from "@/lib/store";
import { MODES_STUDIO, liensDe, nbRole, normStudio } from "@/lib/studios";
import type { ModeStudio, RoleStudio } from "@/lib/types";

export function ListeStudios({ ouvert, setOuvert }: { ouvert: string | null; setOuvert: (id: string | null) => void }) {
  const s = useStore();
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<ModeStudio | "">("");
  const [ville, setVille] = useState("");
  const [nouveau, setNouveau] = useState(false);

  const villes = useMemo(() => Array.from(new Set(s.data.studios.map((x) => x.ville?.trim()).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, "fr")), [s.data.studios]);
  const liste = useMemo(() => {
    const t = normStudio(q);
    return s.data.studios
      .filter((x) => (!t || normStudio(`${x.nom} ${x.ville ?? ""}`).includes(t)) && (!mode || x.mode_travail === mode) && (!ville || x.ville === ville))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [s.data.studios, q, mode, ville]);
  const courant = s.data.studios.find((x) => x.id === ouvert) ?? null;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="champ !pl-9" placeholder="Chercher un studio…" aria-label="Chercher un studio" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="champ !w-auto max-w-full" aria-label="Filtrer par ville" value={ville} onChange={(e) => setVille(e.target.value)}>
          <option value="">Toutes les villes</option>
          {villes.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button className="bouton bouton-plein ml-auto" onClick={() => setNouveau(true)}><Plus />Studio</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par mode de travail">
        {MODES_STUDIO.map((m) => (
          <button key={m.id} type="button" className="puce" aria-pressed={mode === m.id} onClick={() => setMode(mode === m.id ? "" : m.id)}>{m.label}</button>
        ))}
      </div>

      {s.data.studios.length === 0 ? (
        <Vide icone={Building2} titre="Aucune fiche studio" action={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}><Plus />Créer un studio</button>}>
          Une fiche par studio : adresse, mode de travail, tes contacts sur place et les amis qui y travaillent souvent.
        </Vide>
      ) : liste.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted">Aucun studio ne correspond à ces filtres.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {liste.map((x) => {
            const liens = liensDe(s.data, x.id);
            const noms = (r: RoleStudio) => Array.from(new Set(liens.filter((l) => l.role === r).map((l) => l.contact_id)))
              .map((id) => s.data.contacts.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c).map((c) => `${c.prenom} ${c.nom}`.trim() || "Contact");
            return (
              <li key={x.id} className="min-w-0">
                <button type="button" onClick={() => setOuvert(x.id)} className="carte carte-lien flex h-full w-full min-w-0 flex-col gap-3 p-4 text-left">
                  <span className="flex min-w-0 items-center gap-3">
                    <Vignette image={x.logo} nom={x.nom} taille={44} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[14.5px]">{x.nom}</strong>
                      <span className="micro flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-none" />{x.ville || "Ville inconnue"}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    {x.mode_travail !== "inconnu" && <PastilleMode mode={x.mode_travail} />}
                    <PileAvatars role="ami" noms={noms("ami")} total={nbRole(liens, "ami")} mot="ami" />
                    <PileAvatars role="contact" noms={noms("contact")} total={nbRole(liens, "contact")} mot="contact" />
                    {nbRole(liens, "ami") + nbRole(liens, "contact") === 0 && <span className="micro">Personne de lié</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {courant && <FicheStudio key={courant.id} studio={courant} onClose={() => setOuvert(null)} />}
      {nouveau && (
        <Sheet titre="Nouveau studio" pleinMobile onClose={() => setNouveau(false)}>
          <NouveauStudio onCreer={(id) => { setNouveau(false); setOuvert(id); }} />
        </Sheet>
      )}
    </>
  );
}
