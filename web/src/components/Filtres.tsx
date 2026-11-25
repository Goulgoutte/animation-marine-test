"use client";

import { ChevronDown, Info, ListFilter, Plus, RotateCcw, Search, Settings2, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ID_AUTRES, METIERS, catalogueMetiers, normaliserTexte, type Metier, type MetierModif, type MetiersPerso } from "@shared/metiers";
import { Sheet } from "@/components/ui";
import {
  CONTRATS, FILTRES_VIDES, FORMATS, FRAICHEURS, LANGUES, MODES, NIVEAUX, STATUTS, TECHNIQUES, compter, offrePasse, productionPasse,
  valeursOffre, valeursProduction, type Facette, type Filtres, type Onglet, type Puce,
} from "@/lib/filtres";
import { useStore } from "@/lib/store";
import { LABEL_CONTRAT, LABEL_FORMAT, LABEL_NIVEAU, LABEL_STATUT_PROD, type OffreVue, type ProductionVue } from "@/lib/veille";
import { GROUPES_ZONES, ZONES, normaliser } from "@/lib/zones";

/* ---------- Rangée sous la barre : puces actives, « Tout effacer », nombre de résultats ---------- */

export function RangeeActive({ puces, nb, unite, onRetirer, onEffacer }: { puces: Puce[]; nb: number; unite: [string, string]; onRetirer: (p: Puce) => void; onEffacer: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-2" role="region" aria-label="Filtres actifs et résultats">
      <p className="mr-1 text-[13px] font-semibold" aria-live="polite" data-testid="nb-resultats">{nb} {nb > 1 ? unite[1] : unite[0]}</p>
      {puces.map((p) => (
        <span key={p.cle} className="puce !cursor-default gap-1 pr-1" aria-pressed="true" data-facette={p.facette}>
          {p.texte}
          <button type="button" onClick={() => onRetirer(p)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]" aria-label={`Retirer le filtre ${p.texte}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {puces.length > 0 && <button type="button" className="bouton bouton-texte bouton-petit" onClick={onEffacer}>Tout effacer</button>}
    </div>
  );
}

/** Bouton « Filtres » de la barre d'outils, avec la pastille du nombre de filtres actifs. */
export function BoutonFiltres({ nb, onClick, className = "" }: { nb: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" className={`bouton ${className}`} onClick={onClick} aria-haspopup="dialog">
      <ListFilter />Filtres
      {nb > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-fg" aria-label={`${nb} filtre${nb > 1 ? "s" : ""} actif${nb > 1 ? "s" : ""}`}>{nb}</span>}
    </button>
  );
}

/* ---------- Panneau de filtres ---------- */

function Section({ id, titre, ouvert, onToggle, nb, onReset, children }: { id: string; titre: string; ouvert: boolean; onToggle: () => void; nb: number; onReset: () => void; children: ReactNode }) {
  return (
    <section className="border-b border-line py-1 last:border-b-0" data-section={id}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onToggle} aria-expanded={ouvert} className="flex min-w-0 flex-1 items-center gap-2 py-2.5 text-left">
          <ChevronDown className={`h-4 w-4 flex-none text-muted transition-transform ${ouvert ? "" : "-rotate-90"}`} />
          <span className="meta">{titre}</span>
          {nb > 0 && <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-soft px-1 text-[11px] font-bold leading-none text-accent-strong">{nb}</span>}
        </button>
        {nb > 0 && <button type="button" onClick={onReset} className="bouton bouton-texte bouton-petit flex-none !text-muted" aria-label={`Réinitialiser ${titre}`}>Réinitialiser</button>}
      </div>
      {ouvert && <div className="pb-3">{children}</div>}
    </section>
  );
}

function Option({ label, compte, checked, onChange, radio, name, disabled, indent }: { label: ReactNode; compte?: number; checked: boolean; onChange: () => void; radio?: boolean; name?: string; disabled?: boolean; indent?: boolean }) {
  const vide = compte === 0 && !checked;
  return (
    <label className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] font-medium hover:bg-surface-2 ${indent ? "ml-6" : ""} ${disabled ? "cursor-default opacity-50" : "cursor-pointer"} ${vide ? "text-muted opacity-60" : ""}`}>
      <input type={radio ? "radio" : "checkbox"} name={name} className="h-4 w-4 flex-none accent-[var(--accent)]" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {compte !== undefined && <span className="flex-none tabular-nums text-xs text-muted">{compte}</span>}
    </label>
  );
}

const bascule = (l: string[], id: string) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]);

/** Ensemble « coché » jamais vide : décocher le dernier est refusé, tout recocher revient au neutre. */
function basculeInclusion(sel: string[], tous: string[], id: string): string[] {
  const actuel = sel.length === 0 ? tous : sel;
  if (actuel.includes(id)) return actuel.length === 1 ? actuel : actuel.filter((x) => x !== id);
  return [...actuel, id];
}

interface PropsPanneau {
  onglet: Onglet;
  /** Offres ou productions déjà filtrées par la recherche texte : base des compteurs. */
  offres: OffreVue[];
  prods: ProductionVue[];
  f: Filtres;
  maj: (patch: Partial<Filtres>) => void;
  puces: Puce[];
  nb: number;
  metiers: Metier[];
  onEffacer: () => void;
  onGerer: () => void;
  onClose: () => void;
}

export function PanneauFiltres({ onglet, offres, prods, f, maj, puces, nb, metiers, onEffacer, onGerer, onClose }: PropsPanneau) {
  const offresO = onglet === "offres";
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({ metier: true, zones: true, lieuProd: true, mode: true });
  const [rz, setRz] = useState("");
  const toggle = (id: string) => setOuvertes((o) => ({ ...o, [id]: !o[id] }));
  const nbActifs = (...fs: Facette[]) => puces.filter((p) => fs.includes(p.facette)).length;
  const reset = (...ks: (keyof Filtres)[]) => () => maj(Object.fromEntries(ks.map((k) => [k, FILTRES_VIDES[k]])) as Partial<Filtres>);
  const cpt = (k: Facette): Record<string, number> =>
    offresO ? compter(offres, (o, ig) => offrePasse(o, f, ig), valeursOffre, k) : compter(prods, (p, ig) => productionPasse(p, f, ig), valeursProduction, k);

  const cm = cpt("metier");
  const ct = cpt("technique");
  const sec = (id: string, titre: string, ks: (keyof Filtres)[], fs: Facette[], contenu: ReactNode) => (
    <Section id={id} titre={titre} ouvert={!!ouvertes[id]} onToggle={() => toggle(id)} nb={nbActifs(...fs)} onReset={reset(...ks)}>{contenu}</Section>
  );

  const metier = sec("metier", "Métier", ["metiers"], ["metier"], (
    <>
      {metiers.map((m) => <Option key={m.id} label={m.label} compte={cm[m.id] ?? 0} checked={f.metiers.includes(m.id)} onChange={() => maj({ metiers: bascule(f.metiers, m.id) })} />)}
      <Option label="Autres (aucun métier reconnu)" compte={cm[ID_AUTRES] ?? 0} checked={f.metiers.includes(ID_AUTRES)} onChange={() => maj({ metiers: bascule(f.metiers, ID_AUTRES) })} />
      <button type="button" className="bouton bouton-texte bouton-petit mt-1.5 !text-accent" onClick={onGerer}><Settings2 />Gérer les métiers et mots-clés</button>
    </>
  ));

  const lieu = (cle: "zones" | "lieuProd") => {
    const cz = cpt(cle);
    const t = normaliser(rz);
    const visibles = ZONES.filter((z) => !t || normaliser(`${z.label} ${z.motsCles.join(" ")}`).includes(t));
    return sec(cle, "Lieu", [cle], [cle], (
      <>
        <label className="relative mb-2 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="champ !pl-9" placeholder="Chercher une zone ou une ville…" aria-label="Chercher une zone" value={rz} onChange={(e) => setRz(e.target.value)} />
        </label>
        {offresO && <p className="micro mb-2 px-2">Ne concerne pas le télétravail complet, ouvert à toute la France.</p>}
        {!offresO && <p className="micro mb-2 px-2">Ville de fabrication ou pays des décors.</p>}
        {GROUPES_ZONES.map((g) => {
          const zs = visibles.filter((z) => z.groupe === g);
          if (zs.length === 0) return null;
          return (
            <fieldset key={g} className="mb-2 min-w-0">
              <legend className="micro mb-0.5 px-2 font-semibold">{g}</legend>
              {zs.map((z) => <Option key={z.id} label={z.label} compte={cz[z.id] ?? 0} checked={f[cle].includes(z.id)} onChange={() => maj({ [cle]: bascule(f[cle], z.id) })} />)}
            </fieldset>
          );
        })}
        {visibles.length === 0 && <p className="micro px-2 py-2">Aucune zone ne correspond.</p>}
      </>
    ));
  };

  const technique = sec("technique", "Technique", ["techniques"], ["technique"], TECHNIQUES.map((t) => {
    const coche = f.techniques.length === 0 || f.techniques.includes(t.id);
    return <Option key={t.id} label={t.label} compte={ct[t.id] ?? 0} checked={coche} onChange={() => maj({ techniques: basculeInclusion(f.techniques, TECHNIQUES.map((x) => x.id), t.id) })} />;
  }));

  if (!offresO) {
    const cs = cpt("statut"), cf = cpt("format"), cb = cpt("bonMoment");
    return (
      <Sheet titre="Filtres" sousTitre="Productions" onClose={onClose} pleinMobile pied={<PiedPanneau nb={nb} unite={["production", "productions"]} aucun={puces.length === 0} onEffacer={onEffacer} onClose={onClose} />}>
        {metier}
        {sec("statut", "Statut", ["statut"], ["statut"], STATUTS.map((s) => <Option key={s} label={LABEL_STATUT_PROD[s]} compte={cs[s] ?? 0} checked={f.statut.includes(s)} onChange={() => maj({ statut: bascule(f.statut, s) })} />))}
        {sec("format", "Format", ["format"], ["format"], FORMATS.map((x) => <Option key={x} label={LABEL_FORMAT[x]} compte={cf[x] ?? 0} checked={f.format.includes(x)} onChange={() => maj({ format: bascule(f.format, x) })} />))}
        {technique}
        {lieu("lieuProd")}
        {sec("bonMoment", "Bon moment", ["bonMoment"], ["bonMoment"], <Option label="Bon moment pour candidater seulement" compte={cb.oui ?? 0} checked={f.bonMoment} onChange={() => maj({ bonMoment: !f.bonMoment })} />)}
      </Sheet>
    );
  }

  const cmode = cpt("mode"), clangue = cpt("langue"), cc = cpt("contrat"), cn = cpt("niveau"), cfr = cpt("fraicheur"), ca = cpt("affichage");
  const tousModes = MODES.map((m) => m.id);
  const modesCoches = f.modes.length === 0 ? tousModes : f.modes;
  const teletravail = modesCoches.includes("teletravail");
  const tousLangues = LANGUES.map((l) => l.id);
  const languesCochees = f.langues.length === 0 ? tousLangues : f.langues;

  return (
    <Sheet titre="Filtres" sousTitre="Offres d’emploi" onClose={onClose} pleinMobile pied={<PiedPanneau nb={nb} unite={["offre", "offres"]} aucun={puces.length === 0} onEffacer={onEffacer} onClose={onClose} />}>
      {metier}
      {lieu("zones")}
      {sec("mode", "Mode de travail", ["modes", "langues"], ["mode", "langue"], (
        <>
          {MODES.map((m) => (
            <div key={m.id}>
              <Option label={m.label} compte={cmode[m.id] ?? 0} checked={modesCoches.includes(m.id)} onChange={() => maj({ modes: basculeInclusion(f.modes, tousModes, m.id) as Filtres["modes"] })} />
              {m.id === "teletravail" && LANGUES.map((l) => (
                <Option key={l.id} indent label={<>{l.label} <span className="micro">acceptée</span></>} compte={clangue[l.id] ?? 0} checked={languesCochees.includes(l.id)} disabled={!teletravail}
                  onChange={() => maj({ langues: basculeInclusion(f.langues, tousLangues, l.id) as Filtres["langues"] })} />
              ))}
            </div>
          ))}
        </>
      ))}
      {technique}
      {sec("contrat", "Contrat", ["contrat"], ["contrat"], CONTRATS.map((c) => <Option key={c} label={LABEL_CONTRAT[c]} compte={cc[c] ?? 0} checked={f.contrat.includes(c)} onChange={() => maj({ contrat: bascule(f.contrat, c) })} />))}
      {sec("niveau", "Niveau", ["niveau"], ["niveau"], NIVEAUX.map((n) => <Option key={n} label={LABEL_NIVEAU[n]} compte={cn[n] ?? 0} checked={f.niveau.includes(n)} onChange={() => maj({ niveau: bascule(f.niveau, n) })} />))}
      {sec("fraicheur", "Fraîcheur", ["fraicheur"], ["fraicheur"], FRAICHEURS.map((x) => <Option key={x.id} radio name="fraicheur" label={x.label} compte={cfr[x.id] ?? 0} checked={f.fraicheur === x.id} onChange={() => maj({ fraicheur: x.id })} />))}
      {sec("affichage", "Affichage", ["expirees", "masquees"], ["affichage"], (
        <>
          <Option label="Afficher les offres probablement expirées" compte={ca.expirees ?? 0} checked={f.expirees} onChange={() => maj({ expirees: !f.expirees })} />
          <Option label="Afficher les offres masquées" compte={ca.masquees ?? 0} checked={f.masquees} onChange={() => maj({ masquees: !f.masquees })} />
        </>
      ))}
    </Sheet>
  );
}

function PiedPanneau({ nb, unite, aucun, onEffacer, onClose }: { nb: number; unite: [string, string]; aucun: boolean; onEffacer: () => void; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="bouton bouton-texte" disabled={aucun} onClick={onEffacer}>Tout effacer</button>
      <button type="button" className="bouton bouton-plein ml-auto flex-1 sm:flex-none" onClick={onClose}>Voir {nb} {nb > 1 ? unite[1] : unite[0]}</button>
    </div>
  );
}

/* ---------- Gérer les métiers et mots-clés ---------- */

const dejaPresent = (l: string[], mot: string) => l.some((x) => normaliserTexte(x) === normaliserTexte(mot));
const defautDe = (id: string) => METIERS.find((m) => m.id === id);

function ListePuces({ mots, onRetirer, vide, aria }: { mots: string[]; onRetirer: (mot: string) => void; vide: string; aria: string }) {
  if (mots.length === 0) return <p className="micro">{vide}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={aria}>
      {mots.map((m) => (
        <li key={m} className="puce !cursor-default gap-1 pr-1" aria-pressed="true">
          {m}
          <button type="button" onClick={() => onRetirer(m)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-[color-mix(in_srgb,currentColor_18%,transparent)]" aria-label={`Retirer « ${m} »`}><X className="h-3 w-3" /></button>
        </li>
      ))}
    </ul>
  );
}

function AjoutMot({ label, placeholder, existants, onAjout }: { label: string; placeholder: string; existants: string[]; onAjout: (mot: string) => void }) {
  const [v, setV] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  function valider() {
    const mot = v.trim();
    if (!mot) return;
    if (dejaPresent(existants, mot)) { setMsg(`« ${mot} » est déjà dans la liste.`); return; }
    onAjout(mot);
    setV(""); setMsg(null);
  }
  return (
    <div>
      <div className="flex gap-2">
        <input className="champ" aria-label={label} placeholder={placeholder} value={v} onChange={(e) => { setV(e.target.value); setMsg(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); valider(); } }} />
        <button type="button" className="bouton flex-none" onClick={valider}><Plus />Ajouter</button>
      </div>
      {msg && <p className="micro mt-1" role="status">{msg}</p>}
    </div>
  );
}

export function GererMetiers({ offres, prods, onClose }: { offres: OffreVue[]; prods: ProductionVue[]; onClose: () => void }) {
  const s = useStore();
  const p = s.reglages.perimetre;
  const perso: MetiersPerso = useMemo(() => p.metiers_perso ?? {}, [p.metiers_perso]);
  const catalogue = useMemo(() => catalogueMetiers(perso), [perso]);
  const [ouvert, setOuvert] = useState<string | null>("decor");
  const [nom, setNom] = useState("");

  function enregistrer(suivant: MetiersPerso) {
    const vide = !Object.keys(suivant.modifs ?? {}).length && !(suivant.crees ?? []).length;
    const { metiers_perso: _ancien, ...reste } = p;
    s.saveReglages({ perimetre: vide ? reste : { ...reste, metiers_perso: suivant } });
  }
  function majMetier(id: string, patch: MetierModif) {
    if ((perso.crees ?? []).some((m) => m.id === id)) {
      enregistrer({ ...perso, crees: (perso.crees ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)) });
    } else {
      enregistrer({ ...perso, modifs: { ...(perso.modifs ?? {}), [id]: { ...(perso.modifs ?? {})[id], ...patch } } });
    }
  }
  function retablir(id: string) {
    const { [id]: _x, ...reste } = perso.modifs ?? {};
    enregistrer({ ...perso, modifs: reste });
  }
  function creer() {
    const n = nom.trim();
    if (!n) return;
    const id = `perso-${normaliser(n).replace(/\s+/g, "-").slice(0, 24)}-${Date.now().toString(36)}`;
    enregistrer({ ...perso, crees: [...(perso.crees ?? []), { id, label: n, mots: [n] }] });
    setNom(""); setOuvert(id);
  }
  const modifie = (id: string) => !!(perso.modifs ?? {})[id] && Object.keys((perso.modifs ?? {})[id]).length > 0;
  const toutDefaut = !Object.keys(perso.modifs ?? {}).length;
  const nbDe = (id: string) => offres.filter((o) => o.metiers.includes(id)).length;
  const nbProdDe = (id: string) => prods.filter((x) => x.metiers.includes(id)).length;

  return (
    <Sheet titre="Métiers et mots-clés" onClose={onClose} pleinMobile large
      pied={
        <div className="flex items-center gap-2">
          <button type="button" className="bouton bouton-texte" disabled={toutDefaut} onClick={() => enregistrer({ ...perso, modifs: {} })}><RotateCcw />Revenir aux mots-clés par défaut</button>
          <button type="button" className="bouton bouton-plein ml-auto" onClick={onClose}>Terminé</button>
        </div>
      }>
      <p className="mb-4 flex items-start gap-2.5 rounded-xl bg-accent-soft px-3 py-2.5 text-[13px] leading-snug text-accent-strong">
        <Info className="mt-0.5 h-4 w-4 flex-none" />
        <span>Les métiers trient les offres déjà collectées. Les modifier ne relance pas la collecte. La collecte récupère toutes les offres d’animation de tes sources.</span>
      </p>
      <p className="micro mb-3">Un mot seul est cherché dans le titre. Une expression de plusieurs mots l’est aussi dans l’extrait. Le changement s’applique tout de suite.</p>
      <ul className="space-y-2">
        {catalogue.map((m) => {
          const cree = (perso.crees ?? []).some((c) => c.id === m.id);
          const ouv = ouvert === m.id;
          const mots = m.mots, exclure = m.exclure ?? [];
          return (
            <li key={m.id} className={`rounded-xl border border-line ${m.masque ? "opacity-70" : ""}`} data-metier={m.id}>
              <button type="button" aria-expanded={ouv} onClick={() => setOuvert(ouv ? null : m.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                <ChevronDown className={`h-4 w-4 flex-none text-muted transition-transform ${ouv ? "" : "-rotate-90"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{m.label}</span>
                  <span className="micro" data-testid={`compte-${m.id}`}>{nbDe(m.id)} {nbDe(m.id) > 1 ? "offres" : "offre"} · {nbProdDe(m.id)} {nbProdDe(m.id) > 1 ? "productions" : "production"} · {mots.length} mot{mots.length > 1 ? "s" : ""}-clé{mots.length > 1 ? "s" : ""}</span>
                </span>
                {m.masque && <span className="badge c-mute">Masqué</span>}
                {cree && <span className="badge c-info">Créé</span>}
                {!cree && modifie(m.id) && !m.masque && <span className="badge c-accent">Modifié</span>}
              </button>
              {ouv && (
                <div className="space-y-3 border-t border-line px-3 pb-3 pt-3">
                  <label className="flex flex-col gap-1">
                    <span className="meta">Nom du métier</span>
                    <input className="champ" value={m.label} onChange={(e) => majMetier(m.id, { label: e.target.value })} aria-label={`Nom du métier ${m.label}`} />
                  </label>
                  <div className="space-y-2">
                    <p className="meta">Mots-clés</p>
                    <ListePuces mots={mots} aria={`Mots-clés de ${m.label}`} vide="Aucun mot-clé : ce métier ne reconnaît rien." onRetirer={(mot) => majMetier(m.id, { mots: mots.filter((x) => x !== mot) })} />
                    <AjoutMot label={`Ajouter un mot-clé à ${m.label}`} placeholder="Ajouter un mot-clé…" existants={mots} onAjout={(mot) => majMetier(m.id, { mots: [...mots, mot] })} />
                  </div>
                  <div className="space-y-2">
                    <p className="meta">Exclure si le titre contient</p>
                    <ListePuces mots={exclure} aria={`Exclusions de ${m.label}`} vide="Aucune exclusion." onRetirer={(mot) => majMetier(m.id, { exclure: exclure.filter((x) => x !== mot) })} />
                    <AjoutMot label={`Ajouter une exclusion à ${m.label}`} placeholder="Exclure si le titre contient…" existants={exclure} onAjout={(mot) => majMetier(m.id, { exclure: [...exclure, mot] })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!cree && modifie(m.id) && <button type="button" className="bouton bouton-petit" onClick={() => retablir(m.id)}><RotateCcw />Rétablir {defautDe(m.id)?.label}</button>}
                    {!cree && <button type="button" className="bouton bouton-petit" onClick={() => majMetier(m.id, { masque: !m.masque })}>{m.masque ? "Réafficher ce métier" : "Masquer ce métier"}</button>}
                    {cree && <button type="button" className="bouton bouton-petit bouton-danger" onClick={() => enregistrer({ ...perso, crees: (perso.crees ?? []).filter((c) => c.id !== m.id) })}><Trash2 />Supprimer ce métier</button>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 rounded-xl border border-dashed border-line p-3">
        <p className="meta mb-2">Créer un métier</p>
        <div className="flex gap-2">
          <input className="champ" aria-label="Nom du nouveau métier" placeholder="Ex. Matte painting" value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); creer(); } }} />
          <button type="button" className="bouton flex-none" onClick={creer}><Plus />Créer</button>
        </div>
      </div>
    </Sheet>
  );
}
