"use client";

import { useState } from "react";
import type { Categorie, Contrat, FormatProd, ModeTravail, Offre, Production, StatutProd, Technique } from "@shared/types";
import { uid } from "@/lib/dates";
import { LABEL_CONTRAT, LABEL_FORMAT, LABEL_MODE, LABEL_STATUT_PROD } from "@/lib/veille";
import { Champ } from "./ui";

const liste = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const vers = (o: Record<string, string>) => Object.entries(o).map(([id, label]) => ({ id, label }));

function Sel<T extends string>({ valeur, options, onChange }: { valeur: T; options: { id: string; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select className="champ" value={valeur} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  );
}

export function FormOffre({ initial, avecUrl, onSave, onCancel }: { initial?: Offre; avecUrl?: boolean; onSave: (o: Offre, url: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(initial?.sources[0]?.url ?? "");
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [studio, setStudio] = useState(initial?.studio ?? "");
  const [production, setProduction] = useState(initial?.production ?? "");
  const [lieu, setLieu] = useState(initial?.lieu ?? "");
  const [categorie, setCategorie] = useState<Categorie>(initial?.categorie ?? "decor");
  const [technique, setTechnique] = useState<Technique>(initial?.technique ?? "2D");
  const [mode, setMode] = useState<ModeTravail>(initial?.modeTravail ?? "paris-sur-place");
  const [residence, setResidence] = useState(initial?.residenceExigee ?? "");
  const [contrat, setContrat] = useState<Contrat>(initial?.contrat ?? "inconnu");
  const [dateLimite, setDateLimite] = useState(initial?.dateLimite ?? "");
  const [extrait, setExtrait] = useState(initial?.extrait ?? "");

  function valider(e: React.FormEvent) {
    e.preventDefault();
    const maintenant = new Date().toISOString();
    const base: Offre = initial ?? {
      id: uid(), titre: "", studio: null, production: null, lieu: null, pays: null, technique: "2D", modeTravail: "inconnu",
      residenceExigee: null, contrat: "inconnu", niveau: "inconnu", langue: "inconnue", dateDebut: null, dateLimite: null,
      datePublication: null, premiereVue: maintenant, extrait: "", categorie: "decor", dansPerimetre: true, aVerifier: false,
      probablementExpiree: false, sources: [],
    };
    onSave(
      {
        ...base, titre, studio: studio || null, production: production || null, lieu: lieu || null, categorie, technique,
        modeTravail: mode, residenceExigee: residence || null, contrat, dateLimite: dateLimite || null, extrait,
        aVerifier: technique === "inconnue" || mode === "inconnu",
        dansPerimetre: !residence && technique !== "3D" && (mode === "paris-sur-place" || mode === "teletravail-complet" || mode === "hybride" || mode === "inconnu"),
        sources: url ? [{ sourceId: "manuel", url, vuLe: maintenant }] : base.sources,
      },
      url,
    );
  }

  return (
    <form onSubmit={valider} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {avecUrl && (
        <Champ label="Lien de l’annonce (LinkedIn, Instagram…)" className="sm:col-span-2">
          <input className="champ" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Champ>
      )}
      <Champ label="Intitulé du poste" className="sm:col-span-2"><input className="champ" required value={titre} onChange={(e) => setTitre(e.target.value)} /></Champ>
      <Champ label="Studio"><input className="champ" value={studio} onChange={(e) => setStudio(e.target.value)} /></Champ>
      <Champ label="Production ou série"><input className="champ" value={production} onChange={(e) => setProduction(e.target.value)} /></Champ>
      <Champ label="Lieu"><input className="champ" value={lieu} onChange={(e) => setLieu(e.target.value)} /></Champ>
      <Champ label="Date limite"><input className="champ" type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} /></Champ>
      <Champ label="Catégorie"><Sel valeur={categorie} onChange={setCategorie} options={[{ id: "decor", label: "Décor" }, { id: "autre", label: "Autre métier" }]} /></Champ>
      <Champ label="Technique"><Sel valeur={technique} onChange={setTechnique} options={vers({ "2D": "2D", "3D": "3D", "stop-motion": "Stop motion", hybride: "Hybride", inconnue: "Inconnue" })} /></Champ>
      <Champ label="Mode de travail"><Sel valeur={mode} onChange={setMode} options={vers(LABEL_MODE)} /></Champ>
      <Champ label="Contrat"><Sel valeur={contrat} onChange={setContrat} options={vers(LABEL_CONTRAT)} /></Champ>
      <Champ label="Résidence exigée (pays)" className="sm:col-span-2"><input className="champ" value={residence} onChange={(e) => setResidence(e.target.value)} placeholder="Laisser vide si aucune" /></Champ>
      <Champ label="Extrait ou notes" className="sm:col-span-2"><textarea className="champ" value={extrait} onChange={(e) => setExtrait(e.target.value)} /></Champ>
      <div className="flex gap-2 sm:col-span-2">
        <button className="bouton bouton-plein">Enregistrer</button>
        <button type="button" className="bouton" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

const MOMENT: StatutProd[] = ["preproduction", "production"];

export function FormProduction({ initial, avecUrl, onSave, onCancel }: { initial?: Production; avecUrl?: boolean; onSave: (p: Production) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(initial?.sources[0]?.url ?? "");
  const [titre, setTitre] = useState(initial?.titre ?? "");
  const [format, setFormat] = useState<FormatProd>(initial?.format ?? "serie");
  const [technique, setTechnique] = useState<Technique>(initial?.technique ?? "2D");
  const [statut, setStatut] = useState<StatutProd>(initial?.statut ?? "inconnu");
  const [producteurs, setProducteurs] = useState((initial?.producteurs ?? []).join(", "));
  const [studios, setStudios] = useState((initial?.studiosFabrication ?? []).join(", "));
  const [pays, setPays] = useState((initial?.paysCoproducteurs ?? []).join(", "));
  const [paysDecors, setPaysDecors] = useState(initial?.paysDecors ?? "");
  const [diffuseur, setDiffuseur] = useState(initial?.diffuseur ?? "");
  const [realisateur, setRealisateur] = useState(initial?.realisateur ?? "");
  const [ville, setVille] = useState(initial?.villeFabrication ?? "");
  const [demarrage, setDemarrage] = useState(initial?.dateDemarrage ?? "");
  const [contact, setContact] = useState(initial?.contactRecrutement ?? "");
  const [extrait, setExtrait] = useState(initial?.extrait ?? "");

  function valider(e: React.FormEvent) {
    e.preventDefault();
    const maintenant = new Date().toISOString();
    const base: Production = initial ?? {
      id: uid(), titre: "", format: "inconnu", technique: "2D", producteurs: [], studiosFabrication: [], paysCoproducteurs: [],
      paysDecors: null, diffuseur: null, realisateur: null, statut: "inconnu", dateDemarrage: null, villeFabrication: null,
      contactRecrutement: null, extrait: "", premiereVue: maintenant, misEnAvant: false, bonMomentDecor: false, sources: [],
    };
    onSave({
      ...base, titre, format, technique, statut, producteurs: liste(producteurs), studiosFabrication: liste(studios),
      paysCoproducteurs: liste(pays), paysDecors: paysDecors || null, diffuseur: diffuseur || null, realisateur: realisateur || null,
      villeFabrication: ville || null, dateDemarrage: demarrage || null, contactRecrutement: contact || null, extrait,
      bonMomentDecor: MOMENT.includes(statut) || (initial?.bonMomentDecor && statut === initial.statut) || false,
      misEnAvant: /paris/i.test(ville) || base.misEnAvant,
      sources: url ? [{ sourceId: "manuel", url, vuLe: maintenant }] : base.sources,
    });
  }

  return (
    <form onSubmit={valider} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {avecUrl && (
        <Champ label="Lien de l’article ou du post" className="sm:col-span-2">
          <input className="champ" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </Champ>
      )}
      <Champ label="Titre" className="sm:col-span-2"><input className="champ" required value={titre} onChange={(e) => setTitre(e.target.value)} /></Champ>
      <Champ label="Format"><Sel valeur={format} onChange={setFormat} options={vers(LABEL_FORMAT)} /></Champ>
      <Champ label="Technique"><Sel valeur={technique} onChange={setTechnique} options={vers({ "2D": "2D", "3D": "3D", "stop-motion": "Stop motion", hybride: "Hybride", inconnue: "Inconnue" })} /></Champ>
      <Champ label="Statut"><Sel valeur={statut} onChange={setStatut} options={vers(LABEL_STATUT_PROD)} /></Champ>
      <Champ label="Démarrage annoncé"><input className="champ" type="date" value={demarrage} onChange={(e) => setDemarrage(e.target.value)} /></Champ>
      <Champ label="Producteurs (séparés par des virgules)"><input className="champ" value={producteurs} onChange={(e) => setProducteurs(e.target.value)} /></Champ>
      <Champ label="Studios de fabrication"><input className="champ" value={studios} onChange={(e) => setStudios(e.target.value)} /></Champ>
      <Champ label="Pays coproducteurs"><input className="champ" value={pays} onChange={(e) => setPays(e.target.value)} /></Champ>
      <Champ label="Pays qui fabrique les décors"><input className="champ" value={paysDecors} onChange={(e) => setPaysDecors(e.target.value)} /></Champ>
      <Champ label="Diffuseur ou distributeur"><input className="champ" value={diffuseur} onChange={(e) => setDiffuseur(e.target.value)} /></Champ>
      <Champ label="Réalisateur"><input className="champ" value={realisateur} onChange={(e) => setRealisateur(e.target.value)} /></Champ>
      <Champ label="Ville de fabrication"><input className="champ" value={ville} onChange={(e) => setVille(e.target.value)} /></Champ>
      <Champ label="Contact de recrutement"><input className="champ" value={contact} onChange={(e) => setContact(e.target.value)} /></Champ>
      <Champ label="Notes" className="sm:col-span-2"><textarea className="champ" value={extrait} onChange={(e) => setExtrait(e.target.value)} /></Champ>
      <div className="flex gap-2 sm:col-span-2">
        <button className="bouton bouton-plein">Enregistrer</button>
        <button type="button" className="bouton" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
