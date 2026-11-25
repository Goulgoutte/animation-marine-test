"use client";

import { Building2, CircleHelp, ExternalLink, Heart, House, Plus, Shuffle, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { AjoutPersonne } from "@/components/studios/AjoutPersonne";
import { ChampTexte } from "@/components/studios/Edition";
import { Avatar, Champ } from "@/components/ui";
import { useStore } from "@/lib/store";
import { MODES_STUDIO, TECHNIQUES_USUELLES, lienMaps } from "@/lib/studios";
import type { ModeStudio, RoleStudio, Studio } from "@/lib/types";

const ICONE_MODE: Record<ModeStudio, LucideIcon> = { presentiel: Building2, teletravail: House, mixte: Shuffle, inconnu: CircleHelp };
const AIDE_MODE: Record<ModeStudio, string> = { presentiel: "Sur place", teletravail: "À distance", mixte: "Les deux", inconnu: "À vérifier" };
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Formulaire « menu horizontal » d’un studio : champs, techniques, personnes liées. Enregistrement à la sortie de chaque champ. */
export function FormulaireStudio({ studio, onOuvrirContact }: { studio: Studio; onOuvrirContact: () => void }) {
  const s = useStore();
  const maj = (p: Partial<Studio>) => s.patch("studios", studio.id, { ...p, updated_at: new Date().toISOString() });
  const [tech, setTech] = useState("");
  function ajouterTech(t: string) {
    const v = t.trim();
    if (v && !studio.techniques.some((x) => norm(x) === norm(v))) maj({ techniques: [...studio.techniques, v] });
    setTech("");
  }

  return (
    <>
      <h3 className="titre-section mb-3 mt-6">Mode de travail</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Mode de travail">
        {MODES_STUDIO.map((m) => {
          const Icone = ICONE_MODE[m.id];
          const actif = studio.mode_travail === m.id;
          return (
            <button key={m.id} type="button" aria-pressed={actif} onClick={() => maj({ mode_travail: m.id })}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors ${actif ? "border-accent bg-accent-soft text-accent-strong" : "border-line hover:border-[color-mix(in_srgb,var(--muted)_45%,var(--line))]"}`}>
              <Icone className="h-5 w-5" />
              <span className="text-[13px] font-semibold">{m.label}</span>
              <span className="micro">{AIDE_MODE[m.id]}</span>
            </button>
          );
        })}
      </div>

      <h3 className="titre-section mb-3 mt-6">Adresse</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label="Adresse" className="sm:col-span-2"><ChampTexte valeur={studio.adresse} onSave={(v) => maj({ adresse: v })} placeholder="Numéro, rue, code postal" /></Champ>
        <Champ label="Ville"><ChampTexte valeur={studio.ville} onSave={(v) => maj({ ville: v })} /></Champ>
        <Champ label="Pays"><ChampTexte valeur={studio.pays} onSave={(v) => maj({ pays: v })} /></Champ>
      </div>
      {(studio.adresse || studio.ville) && (
        <a className="bouton bouton-petit mt-2" href={lienMaps(studio)} target="_blank" rel="noopener noreferrer"><ExternalLink />Ouvrir dans Maps</a>
      )}

      <h3 className="titre-section mb-3 mt-6">Le studio</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label="Nom"><ChampTexte valeur={studio.nom} onSave={(v) => v && maj({ nom: v })} /></Champ>
        <Champ label="Taille"><ChampTexte valeur={studio.taille} onSave={(v) => maj({ taille: v })} placeholder="30 à 50 personnes" /></Champ>
        <Champ label="Site"><ChampTexte valeur={studio.site} onSave={(v) => maj({ site: v })} placeholder="https://" /></Champ>
        <Champ label="Logo (adresse de l’image)"><ChampTexte valeur={studio.logo} onSave={(v) => maj({ logo: v })} placeholder="https://" /></Champ>
        <Champ label="Image de couverture (URL)"><ChampTexte valeur={studio.couverture ?? null} onSave={(v) => maj({ couverture: v })} placeholder="https://" /></Champ>
        <Champ label="Page recrutement"><ChampTexte valeur={studio.page_recrutement} onSave={(v) => maj({ page_recrutement: v })} placeholder="https://" /></Champ>
        <Champ label="E-mail recrutement"><ChampTexte type="email" valeur={studio.email_recrutement} onSave={(v) => maj({ email_recrutement: v })} /></Champ>
      </div>

      <h3 className="titre-section mb-3 mt-6">Techniques</h3>
      <div className="flex flex-wrap items-center gap-1.5">
        {studio.techniques.map((t) => (
          <span key={t} className="puce !bg-accent-soft !text-accent-strong">{t}
            <button type="button" aria-label={`Retirer ${t}`} onClick={() => maj({ techniques: studio.techniques.filter((x) => x !== t) })}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {TECHNIQUES_USUELLES.filter((t) => !studio.techniques.some((x) => norm(x) === norm(t))).map((t) => (
          <button key={t} type="button" className="puce border-dashed" onClick={() => ajouterTech(t)}><Plus className="h-3 w-3" />{t}</button>
        ))}
        <input className="champ !w-36" aria-label="Autre technique" placeholder="Autre technique" value={tech} onChange={(e) => setTech(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterTech(tech); } }} onBlur={() => ajouterTech(tech)} />
      </div>

      <h3 className="titre-section mb-3 mt-6">Description</h3>
      <ChampTexte long aria-label="Description" valeur={studio.description} onSave={(v) => maj({ description: v })} placeholder="Ce que tu sais du studio : productions, ambiance, façon de recruter…" />
      <h3 className="titre-section mb-3 mt-6">Notes</h3>
      <ChampTexte long aria-label="Notes" valeur={studio.notes} onSave={(v) => maj({ notes: v })} placeholder="Tes notes personnelles" />

      <SectionPersonnes studio={studio} role="contact" titre="Mes contacts" icone={Users} vide="Aucun contact ici pour l’instant." onOuvrir={onOuvrirContact} />
      <SectionPersonnes studio={studio} role="ami" titre="Amis" icone={Heart} vide="Aucun ami noté. Ajoute ceux qui travaillent souvent ici : c’est eux qu’on appelle pour avoir des nouvelles." onOuvrir={onOuvrirContact} />
    </>
  );
}

function SectionPersonnes({ studio, role, titre, icone: Icone, vide, onOuvrir }: { studio: Studio; role: RoleStudio; titre: string; icone: LucideIcon; vide: string; onOuvrir: () => void }) {
  const s = useStore();
  const liens = s.data.contact_studios.filter((l) => l.studio_id === studio.id && l.role === role);
  const [ouvert, setOuvert] = useState(false);
  const ouvrir = (id: string) => { s.setFocus({ kind: "contact", id }); onOuvrir(); };

  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <h3 className="titre-section flex items-center gap-2"><Icone className="h-4 w-4 text-muted" />{titre} <span className="font-normal text-muted">({liens.length})</span></h3>
        <button type="button" className="bouton bouton-petit" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}><UserPlus />Ajouter</button>
      </div>
      {ouvert && <AjoutPersonne studio={studio} role={role} titre={titre} onFini={() => setOuvert(false)} />}
      {liens.length === 0 ? (
        <p className="micro">{vide}</p>
      ) : (
        <ul className="space-y-2">
          {liens.map((l) => {
            const c = s.data.contacts.find((k) => k.id === l.contact_id);
            if (!c) return null;
            const nom = `${c.prenom} ${c.nom}`.trim() || "Contact";
            return (
              <li key={l.id} className="rounded-xl border border-line p-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar nom={nom} taille={32} rond />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => ouvrir(c.id)} aria-label={`Ouvrir la fiche de ${nom}`}>
                    <strong className="block truncate text-[13.5px] underline-offset-2 hover:underline">{nom}</strong>
                    <span className="micro block truncate">{[c.fonction, c.structure].filter(Boolean).join(" · ")}</span>
                  </button>
                  <button type="button" className="bouton bouton-petit bouton-texte flex-none" onClick={() => s.remove("contact_studios", l.id)}>Retirer</button>
                </div>
                <div className="mt-1.5 pl-[44px]"><ChampTexte aria-label={`Détail pour ${nom}`} valeur={l.detail} onSave={(v) => s.patch("contact_studios", l.id, { detail: v })} placeholder="Détail (ex. régulière en décor depuis 2023)" /></div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}