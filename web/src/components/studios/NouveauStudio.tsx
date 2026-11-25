"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Champ } from "@/components/ui";
import { useStore } from "@/lib/store";
import { nomsConnus, normStudio, structuresSansFiche, studioVide } from "@/lib/studios";

/** Création d’un studio : suggestions tirées de l’app, doublons écartés sur le nom normalisé. */
export function NouveauStudio({ onCreer }: { onCreer: (id: string) => void }) {
  const s = useStore();
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const connus = useMemo(() => nomsConnus(s.data, s.collecte), [s.data, s.collecte]);
  const cle = normStudio(nom);
  const doublon = cle ? s.data.studios.find((x) => normStudio(x.nom) === cle) : null;
  const suggestions = useMemo(() => {
    const t = cle;
    return (t ? connus.filter((k) => normStudio(k.nom).includes(t) && normStudio(k.nom) !== t) : connus).slice(0, 8);
  }, [connus, cle]);
  const sansFiche = useMemo(() => structuresSansFiche(s.data), [s.data]);

  function choisir(k: { nom: string; ville: string | null }) {
    setNom(k.nom);
    setVille(k.ville ?? "");
  }
  function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!cle) return;
    if (doublon) return onCreer(doublon.id);
    const connu = connus.find((k) => normStudio(k.nom) === cle);
    onCreer(s.add("studios", studioVide(nom, ville || connu?.ville)).id);
  }
  function toutCreer() {
    sansFiche.forEach((g) => {
      const st = s.add("studios", studioVide(g.nom, g.ville));
      g.contacts.forEach((k) => s.add("contact_studios", { contact_id: k.id, studio_id: st.id, role: "contact", detail: k.fonction }));
    });
    setInfo(`${sansFiche.length} fiche${sansFiche.length > 1 ? "s" : ""} créée${sansFiche.length > 1 ? "s" : ""}, avec leurs contacts liés.`);
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-3" onSubmit={creer}>
        <Champ label="Nom du studio"><input className="champ" autoFocus required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="La Chouette Compagnie" /></Champ>
        <Champ label="Ville"><input className="champ" value={ville} onChange={(e) => setVille(e.target.value)} /></Champ>
        {doublon && <p className="micro text-warn">« {doublon.nom} » existe déjà : le bouton ouvre sa fiche au lieu d’en créer une seconde.</p>}
        <button className="bouton bouton-plein">{doublon ? "Ouvrir la fiche existante" : "Créer la fiche"}</button>
      </form>

      {suggestions.length > 0 && !doublon && (
        <div>
          <p className="meta mb-1.5">Déjà cités dans l’app</p>
          <ul className="flex flex-wrap gap-1.5">
            {suggestions.map((k) => (
              <li key={normStudio(k.nom)}>
                <button type="button" className="puce" title={k.sources.join(", ")} onClick={() => choisir(k)}>{k.nom}{k.ville ? <span className="opacity-60"> · {k.ville}</span> : null}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sansFiche.length > 0 && (
        <button type="button" className="bouton" onClick={toutCreer}><Sparkles />Créer les fiches des studios déjà cités dans mes contacts ({sansFiche.length})</button>
      )}
      {info && <p className="micro" role="status">{info}</p>}
    </div>
  );
}
