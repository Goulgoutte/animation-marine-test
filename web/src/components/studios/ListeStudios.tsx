"use client";

import { Building2, Heart, MapPin, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet, Vide, Vignette } from "@/components/ui";
import { NouveauStudio } from "@/components/studios/NouveauStudio";
import { FicheStudio } from "@/components/studios/FicheStudio";
import { useStore } from "@/lib/store";
import { MODES_STUDIO, TON_MODE, labelMode, liensDe, nbRole, normStudio } from "@/lib/studios";
import type { ModeStudio } from "@/lib/types";

export function PastilleMode({ mode }: { mode: ModeStudio }) {
  return <span className={`c-${TON_MODE[mode]} inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--c)]`}><span className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />{labelMode(mode)}</span>;
}

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
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <PastilleMode mode={x.mode_travail} />
                    <span className="micro inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{nbRole(liens, "contact")} contact{nbRole(liens, "contact") > 1 ? "s" : ""}</span>
                    <span className="micro inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{nbRole(liens, "ami")} ami{nbRole(liens, "ami") > 1 ? "s" : ""}</span>
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
