"use client";

import { AlertTriangle, Braces, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { ItemMenu, Popover } from "@/components/crm/Popover";
import { Champ, Sheet } from "@/components/ui";
import { CATEGORIES_MODELE, VARIABLES, jeton, segmenter, valeursExemple, type CleVariable, type Segment } from "@/lib/modeles";
import { useStore } from "@/lib/store";
import type { ModeleMail } from "@/lib/types";
import { useMail } from "./useMail";

const labelCategorie = (id: string) => CATEGORIES_MODELE.find((c) => c.id === id)?.label ?? id;

/** Liste des modèles de mail : créer, éditer, dupliquer, supprimer. */
export function ModelesMail() {
  const s = useStore();
  const { modeles } = useMail();
  const [edition, setEdition] = useState<ModeleMail | "nouveau" | null>(null);

  function dupliquer(m: ModeleMail) {
    s.add("modeles_mail", { nom: `${m.nom} (copie)`, sujet: m.sujet, corps: m.corps, categorie: m.categorie });
  }
  return (
    <div>
      {modeles.length === 0 ? (
        <p className="micro">Aucun modèle. Les cinq modèles par défaut se créent au premier usage ; tu peux aussi en écrire un.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label="Modèles de mail">
          {modeles.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line p-3">
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-48">
                <p className="truncate text-[13.5px] font-semibold">{m.nom}</p>
                <p className="micro truncate">{m.sujet}</p>
              </div>
              <span className="badge c-mute">{labelCategorie(m.categorie)}</span>
              <div className="flex gap-1">
                <button className="bouton bouton-petit" onClick={() => setEdition(m)}><Pencil />Éditer</button>
                <button className="bouton bouton-petit bouton-icone" aria-label={`Dupliquer ${m.nom}`} title="Dupliquer" onClick={() => dupliquer(m)}><Copy /></button>
                <button className="bouton bouton-petit bouton-icone bouton-danger" aria-label={`Supprimer ${m.nom}`} title="Supprimer" onClick={() => confirm(`Supprimer le modèle « ${m.nom} » ?`) && s.remove("modeles_mail", m.id)}><Trash2 /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="bouton mt-3" onClick={() => setEdition("nouveau")}><Plus />Nouveau modèle</button>
      {edition && <EditeurModele key={edition === "nouveau" ? "nouveau" : edition.id} modele={edition === "nouveau" ? null : edition} onClose={() => setEdition(null)} />}
    </div>
  );
}

function Apercu({ segments }: { segments: Segment[] }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
      {segments.map((g, i) =>
        g.vide ? <mark key={i} className="rounded bg-[color-mix(in_srgb,var(--warn)_25%,transparent)] px-1 text-fg" title="Variable vide">{`${jeton(g.vide)} ?`}</mark>
        : g.repli ? <em key={i}>{g.texte}</em>
        : <span key={i}>{g.texte}</span>,
      )}
    </p>
  );
}

function EditeurModele({ modele, onClose }: { modele: ModeleMail | null; onClose: () => void }) {
  const s = useStore();
  const [nom, setNom] = useState(modele?.nom ?? "");
  const [categorie, setCategorie] = useState(modele?.categorie ?? "candidature");
  const [sujet, setSujet] = useState(modele?.sujet ?? "");
  const [corps, setCorps] = useState(modele?.corps ?? "");
  const [menu, setMenu] = useState(false);
  const ancre = useRef<HTMLButtonElement>(null);
  const refSujet = useRef<HTMLInputElement>(null);
  const refCorps = useRef<HTMLTextAreaElement>(null);
  const dernier = useRef<"sujet" | "corps">("corps");

  const exemple = valeursExemple(s.reglages.profil_mail, s.profil);
  const sSujet = segmenter(sujet, exemple);
  const sCorps = segmenter(corps, exemple);
  const vides = Array.from(new Set([...sSujet, ...sCorps].flatMap((g) => (g.vide ? [g.vide] : []))));

  function inserer(cle: CleVariable) {
    const tok = jeton(cle);
    const cible = dernier.current;
    const el = cible === "sujet" ? refSujet.current : refCorps.current;
    const val = cible === "sujet" ? sujet : corps;
    const debut = el?.selectionStart ?? val.length;
    const fin = el?.selectionEnd ?? val.length;
    const suivant = val.slice(0, debut) + tok + val.slice(fin);
    (cible === "sujet" ? setSujet : setCorps)(suivant);
    setMenu(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(debut + tok.length, debut + tok.length);
    });
  }

  function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const champs = { nom: nom.trim(), categorie, sujet, corps };
    if (modele) s.patch("modeles_mail", modele.id, champs);
    else s.add("modeles_mail", champs);
    onClose();
  }

  return (
    <Sheet titre={modele ? "Modifier le modèle" : "Nouveau modèle"} sousTitre="Le menu insère une variable à l’endroit du curseur." onClose={onClose} large>
      <form className="grid gap-3" onSubmit={enregistrer}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
          <Champ label="Nom"><input className="champ" required value={nom} onChange={(e) => setNom(e.target.value)} autoFocus={!modele} /></Champ>
          <Champ label="Catégorie">
            <select className="champ" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES_MODELE.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Champ>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="micro">Variables : <code>{"{{studio}}"}</code>, ou avec repli <code>{"{{studio|ton studio}}"}</code></span>
          <button ref={ancre} type="button" aria-haspopup="menu" className="bouton bouton-petit" onClick={() => setMenu(!menu)}><Braces />Insérer une variable</button>
        </div>
        {menu && (
          <Popover ancre={ancre.current} onClose={() => setMenu(false)} largeur={250} label="Variables">
            <div className="max-h-72 overflow-y-auto">
              {VARIABLES.map((v) => <ItemMenu key={v.cle} onClick={() => inserer(v.cle)}><span className="flex w-full items-baseline justify-between gap-3"><span>{v.label}</span><code className="micro">{jeton(v.cle)}</code></span></ItemMenu>)}
            </div>
          </Popover>
        )}
        <Champ label="Sujet"><input ref={refSujet} className="champ" required value={sujet} onChange={(e) => setSujet(e.target.value)} onFocus={() => (dernier.current = "sujet")} /></Champ>
        <Champ label="Message"><textarea ref={refCorps} className="champ !min-h-0 leading-relaxed" rows={12} required value={corps} onChange={(e) => setCorps(e.target.value)} onFocus={() => (dernier.current = "corps")} /></Champ>

        <div className="rounded-xl bg-surface-2 p-3">
          <p className="meta mb-1.5">Aperçu avec un exemple</p>
          <p className="mb-2 text-[13px] font-semibold"><Apercu segments={sSujet} /></p>
          <Apercu segments={sCorps} />
          {vides.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12.5px] text-warn"><AlertTriangle className="h-3.5 w-3.5" />Vides dans ton profil : {vides.map((v) => jeton(v)).join(", ")}. Renseigne-les dans Compte, ou ajoute un repli.</p>}
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="bouton" onClick={onClose}>Annuler</button><button className="bouton bouton-plein">Enregistrer</button></div>
      </form>
    </Sheet>
  );
}
