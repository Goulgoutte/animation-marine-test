"use client";

import { ChevronDown, ChevronRight, ExternalLink, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Frequence, Methode, SourceStatut, TypeSource } from "@shared/types";
import { FREQUENCES, LIBELLE_FREQUENCE, detecterSource, prochainPassageEstime } from "@shared/sources";
import { chargeParDomaine, domainesCharges, limitesDepuis } from "@shared/charge";
import { AlertTriangle } from "lucide-react";
import { COULEUR, LIBELLE, santeSource, type Sante } from "@/lib/sante";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";

const LABEL_TYPE: Record<TypeSource, string> = { emploi: "Site d’emploi", "carriere-studio": "Carrière studio", actualite: "Actualité", "base-projets": "Base de projets" };
const LABEL_METHODE: Record<string, string> = {
  rss: "RSS", html: "HTML", playwright: "Navigateur", manuel: "Manuelle", lever: "Lever", recruitee: "Recruitee", teamtailor: "Teamtailor",
  workable: "Workable", smartrecruiters: "SmartRecruiters", werecruit: "WeRecruit", cnc: "Pages CNC",
};
const METHODES_AJOUT: Methode[] = ["rss", "html", "lever", "recruitee", "teamtailor", "workable", "smartrecruiters", "werecruit"];
const COURT_FREQ: Record<Frequence, string> = { "3h": "3 h", "6h": "6 h", "12h": "12 h", quotidien: "Quotidien", hebdo: "Hebdo" };
const INTERDITS = /(^|\.)(linkedin|indeed|glassdoor)\./i;

interface LigneTable {
  id: string; nom: string; url: string; type: TypeSource; methode: Methode; frequence: Frequence; actif: boolean;
  notes: string | null; ajoutee_par_utilisatrice: boolean; user_id: string | null;
}
interface Ligne extends LigneTable { statut: SourceStatut | null; sante: Sante }

const fmtHeure = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—";

function santeLigne(l: LigneTable, st: SourceStatut | null): Sante {
  if (!l.actif || l.methode === "manuel") return "gris";
  if (!st || (!st.dernierPassage && !st.dernierSucces && !st.derniereErreur)) return "gris"; // jamais collectée
  return santeSource({ ...st, actif: l.actif, frequence: l.frequence });
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export function SourcesReglages() {
  const s = useStore();
  const statuts = s.collecte?.sources.sources ?? [];
  const [table, setTable] = useState<LigneTable[] | null>(null);
  const [chargement, setChargement] = useState(!s.demo);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtreType, setFiltreType] = useState<TypeSource | "tous">("tous");
  const [filtreSante, setFiltreSante] = useState<Sante | "toutes">("toutes");
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [maintenant] = useState(() => new Date());
  const repo = process.env.NEXT_PUBLIC_REPO_URL;

  const sb = s.demo ? null : supabase();
  const charger = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from("sources").select("id,nom,url,type,methode,frequence,actif,notes,ajoutee_par_utilisatrice,user_id").order("created_at", { ascending: true }).order("id");
    if (error) { setErreur(`Table « sources » illisible (${error.message}). La migration 003_sources.sql est-elle appliquée ?`); setTable(null); }
    else { setErreur(null); setTable((data ?? []) as LigneTable[]); }
    setChargement(false);
  }, [sb]);
  useEffect(() => { void charger(); }, [charger]);

  // Éditable seulement avec la table ; sinon (mode démo, migration absente) : lecture seule depuis sources.json.
  const editable = !!sb && table !== null && table.length > 0;
  const lignes: Ligne[] = useMemo(() => {
    const parId = new Map(statuts.map((x) => [x.id, x]));
    const base: LigneTable[] = editable
      ? table!
      : statuts.map((x) => ({ id: x.id, nom: x.nom, url: x.url, type: x.type, methode: x.methode, frequence: x.frequence ?? "quotidien", actif: x.actif, notes: x.notes ?? null, ajoutee_par_utilisatrice: x.ajouteeParUtilisatrice ?? false, user_id: null }));
    return base.map((l) => { const st = parId.get(l.id) ?? null; return { ...l, statut: st, sante: santeLigne(l, st) }; });
  }, [statuts, table, editable]);

  const visibles = lignes.filter((l) => (filtreType === "tous" || l.type === filtreType) && (filtreSante === "toutes" || l.sante === filtreSante));
  const compte = (x: Sante) => lignes.filter((l) => l.sante === x).length;

  const limites = limitesDepuis(s.collecte?.sources.limites);
  // Note informative (jamais bloquante) : domaines au-dessus de ~50 % du plafond quotidien, d'après les réglages affichés
  const chargees = useMemo(() => domainesCharges(chargeParDomaine(lignes, limites)), [lignes, limites]);
  async function maj(id: string, patch: Partial<Pick<LigneTable, "frequence" | "actif">>) {
    if (!sb || !table) return;
    const avant = table;
    setTable(table.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const { data, error } = await sb.from("sources").update(patch).eq("id", id).select("id");
    if (error || !data?.length) { setTable(avant); setErreur(error ? `Modification refusée : ${error.message}` : "Modification refusée : tu n’es pas propriétaire de cette source."); }
    else setErreur(null);
  }
  async function supprimer(l: Ligne) {
    if (!sb || !table || !confirm(`Supprimer la source « ${l.nom} » ?`)) return;
    const { data, error } = await sb.from("sources").delete().eq("id", l.id).select("id");
    if (error || !data?.length) setErreur(error ? `Suppression refusée : ${error.message}` : "Suppression refusée : seules les sources que tu as ajoutées se suppriment.");
    else { setTable(table.filter((x) => x.id !== l.id)); setErreur(null); }
  }
  async function ajouter(l: LigneTable) {
    if (!sb) return false;
    const { data, error } = await sb.from("sources").insert({ id: l.id, nom: l.nom, url: l.url, type: l.type, methode: l.methode, frequence: l.frequence, actif: true, config: {}, ajoutee_par_utilisatrice: true }).select("id,nom,url,type,methode,frequence,actif,notes,ajoutee_par_utilisatrice,user_id").single();
    if (error) { setErreur(`Ajout refusé : ${error.message}`); return false; }
    setTable([...(table ?? []), data as LigneTable]);
    setErreur(null);
    return true;
  }
  const bascule = (id: string) => setOuvertes((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (statuts.length === 0 && !editable && !chargement) {
    return <p className="text-sm text-muted">Aucune collecte n’a encore tourné. Lance le workflow « Collecte » depuis l’onglet Actions de GitHub.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      {s.demo && <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-muted">Mode démo : les sources sont en lecture seule (données de la dernière collecte). Connecte-toi pour les gérer.</p>}
      {erreur && <p role="alert" className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3 text-[13px] text-danger">{erreur}</p>}
      {!s.demo && !chargement && !editable && !erreur && <p className="rounded-xl bg-surface-2 p-3 text-[13px] text-muted">La table des sources est vide : applique supabase/migrations/003_sources.sql. En attendant, lecture seule.</p>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[12px]"><span className="meta">Type</span>
          <select className="champ !w-auto" value={filtreType} onChange={(e) => setFiltreType(e.target.value as TypeSource | "tous")}>
            <option value="tous">Tous les types</option>
            {(Object.keys(LABEL_TYPE) as TypeSource[]).map((t) => <option key={t} value={t}>{LABEL_TYPE[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px]"><span className="meta">Santé</span>
          <select className="champ !w-auto" value={filtreSante} onChange={(e) => setFiltreSante(e.target.value as Sante | "toutes")}>
            <option value="toutes">Toutes ({lignes.length})</option>
            {(["vert", "orange", "rouge", "gris"] as Sante[]).map((x) => <option key={x} value={x}>{LIBELLE[x]} ({compte(x)})</option>)}
          </select>
        </label>
        <p className="micro mb-2 flex-1">{visibles.length} source(s) affichée(s) sur {lignes.length}{s.collecte ? ` · collecte du ${fmtHeure(s.collecte.sources.genereLe)}` : ""}</p>
        {repo ? (
          <a className="bouton" href={`${repo}/actions/workflows/collect.yml`} target="_blank" rel="noopener noreferrer"><Play />Lancer une collecte maintenant<ExternalLink className="!h-3 !w-3 opacity-60" /></a>
        ) : (
          <span className="micro mb-2">Lien « Lancer une collecte » disponible une fois le site déployé (NEXT_PUBLIC_REPO_URL).</span>
        )}
      </div>

      {chargees.length > 0 && (
        <p className="micro flex items-start gap-1.5"><AlertTriangle className="mt-px h-3.5 w-3.5 flex-none text-warn" />
          Charge élevée : {chargees.map((d) => `${d.domaine} (${d.requetes} requêtes par jour sur ${d.plafond})`).join(", ")}. Rien n’est bloqué, mais évite de multiplier les passages sur un même site.
        </p>
      )}

      <div>
        <div className="hidden border-b border-line pb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted md:grid md:grid-cols-[minmax(0,1fr)_96px_92px_112px_48px_128px_100px_100px_52px] md:gap-x-3" role="row">
          <span>Nom</span><span>Type</span><span>Méthode</span><span>Fréquence</span><span>Actif</span><span>Santé</span><span>Dernier passage</span><span>Prochain (est.)</span><span className="text-right">Trouvés</span>
        </div>
        <ul className="divide-y divide-line">
          {visibles.map((l) => {
            const ouverte = ouvertes.has(l.id);
            const st = l.statut;
            const prochain = !l.actif || l.methode === "manuel" ? null : prochainPassageEstime(st?.dernierPassage ?? st?.dernierSucces, l.frequence, maintenant);
            return (
              <li key={l.id} className="py-2.5 text-[13px]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:grid md:grid-cols-[minmax(0,1fr)_96px_92px_112px_48px_128px_100px_100px_52px]">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left font-semibold md:flex-none" aria-expanded={ouverte} onClick={() => bascule(l.id)} title="Voir les derniers titres et l’erreur éventuelle">
                    {ouverte ? <ChevronDown className="h-3.5 w-3.5 flex-none text-muted" /> : <ChevronRight className="h-3.5 w-3.5 flex-none text-muted" />}
                    <span className="truncate">{l.nom}</span>
                    {l.ajoutee_par_utilisatrice && <span className="rounded bg-accent-soft px-1.5 text-[10.5px] font-semibold text-accent">ajoutée</span>}
                  </button>
                  <span className="micro">{LABEL_TYPE[l.type]}</span>
                  <span className="micro">{LABEL_METHODE[l.methode] ?? l.methode}</span>
                  {editable ? (
                    <select className="champ !w-auto !px-2 !py-1 text-[12.5px] md:!w-full" aria-label={`Fréquence de ${l.nom}`} value={l.frequence} onChange={(e) => void maj(l.id, { frequence: e.target.value as Frequence })} disabled={l.methode === "manuel"}>
                      {FREQUENCES.map((f) => <option key={f} value={f}>{COURT_FREQ[f]}</option>)}
                    </select>
                  ) : <span className="micro">{COURT_FREQ[l.frequence]}</span>}
                  {editable ? (
                    <span className="md:justify-self-start"><SwitchCompact label={`Activer ${l.nom}`} checked={l.actif} onChange={(v) => void maj(l.id, { actif: v })} /></span>
                  ) : <span className="micro">{l.actif ? "Oui" : "Non"}</span>}
                  <span className="flex items-center gap-1.5"><span className="pastille" style={{ background: COULEUR[l.sante] }} role="img" aria-label={LIBELLE[l.sante]} /><span className="micro">{st ? LIBELLE[l.sante] : "En attente"}</span></span>
                  <span className="micro" title="Dernière tentative de collecte"><span className="md:hidden">Dernier : </span>{fmtHeure(st?.dernierPassage ?? st?.dernierSucces)}</span>
                  <span className="micro"><span className="md:hidden">Prochain : </span>{prochain ? fmtHeure(prochain.toISOString()) : "—"}</span>
                  <span className="micro md:text-right"><span className="md:hidden">Trouvés : </span><b className="text-fg">{st?.nbResultats ?? 0}</b></span>
                </div>
                {ouverte && (
                  <div className="mt-2.5 grid gap-2 rounded-xl bg-surface-2 p-3 md:ml-5">
                    <p className="micro break-all"><a className="font-semibold text-accent underline" href={l.url} target="_blank" rel="noopener noreferrer">{l.url}</a></p>
                    {st?.derniereErreur && <p className="micro break-words text-danger">Dernière erreur : {st.derniereErreur}</p>}
                    {st?.dernierSucces && <p className="micro">Dernier succès : {fmtHeure(st.dernierSucces)}</p>}
                    {st?.derniersTitres && st.derniersTitres.length > 0 ? (
                      <div><p className="meta mb-1">Derniers titres trouvés</p><ul className="list-disc pl-4 text-[12.5px]">{st.derniersTitres.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
                    ) : <p className="micro">Aucun titre retenu au dernier passage.</p>}
                    {(l.notes ?? st?.notes) && <p className="micro">{l.notes ?? st?.notes}</p>}
                    {editable && l.ajoutee_par_utilisatrice && (
                      <div><button className="bouton bouton-petit bouton-danger" onClick={() => void supprimer(l)}><Trash2 />Supprimer cette source</button></div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {visibles.length === 0 && <p className="py-4 text-sm text-muted">Aucune source ne correspond à ces filtres.</p>}
      </div>

      <FormAjout editable={editable} existantes={lignes.map((l) => l.url)} ids={new Set(lignes.map((l) => l.id))} onAjout={ajouter} maintenant={maintenant} />
    </div>
  );
}

function SwitchCompact({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center" aria-label={label}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 flex-none rounded-full bg-[color-mix(in_srgb,var(--fg)_18%,transparent)] transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4" />
    </label>
  );
}

function FormAjout({ editable, existantes, ids, onAjout, maintenant }: {
  editable: boolean; existantes: string[]; ids: Set<string>; onAjout: (l: LigneTable) => Promise<boolean>; maintenant: Date;
}) {
  const [url, setUrl] = useState("");
  const [nom, setNom] = useState("");
  const [nomModifie, setNomModifie] = useState(false);
  const [type, setType] = useState<TypeSource>("actualite");
  const [methode, setMethode] = useState<Methode>("html");
  const [frequence, setFrequence] = useState<Frequence>("quotidien");
  const [occupe, setOccupe] = useState(false);
  const [ajoute, setAjoute] = useState<string | null>(null);

  const detection = useMemo(() => (url.trim() ? detecterSource(url) : null), [url]);
  const urlComplete = detection ? new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`).toString() : "";
  const interdit = !!urlComplete && INTERDITS.test(new URL(urlComplete).hostname);
  const doublon = !!urlComplete && existantes.some((u) => u === urlComplete);
  const heures = Math.max(1, Math.ceil((prochainPassageEstime(null, frequence, maintenant).getTime() - Date.now()) / 3_600_000));

  function surUrl(v: string) {
    setUrl(v); setAjoute(null);
    const d = v.trim() ? detecterSource(v) : null;
    if (d) { setType(d.type); setMethode(d.methode); if (!nomModifie) setNom(d.nomSuggere); }
  }
  async function envoyer() {
    if (!detection || interdit || doublon || !nom.trim()) return;
    let id = `ajout-${slug(nom) || "source"}`;
    for (let i = 2; ids.has(id); i++) id = `ajout-${slug(nom)}-${i}`;
    setOccupe(true);
    const ok = await onAjout({ id, nom: nom.trim(), url: urlComplete, type, methode, frequence, actif: true, notes: null, ajoutee_par_utilisatrice: true, user_id: null });
    setOccupe(false);
    if (ok) { setAjoute(`« ${nom.trim()} » sera collectée au prochain passage (dans ~${heures} h).`); setUrl(""); setNom(""); setNomModifie(false); }
  }

  return (
    <form className="grid gap-3 rounded-xl border border-line p-4" onSubmit={(e) => { e.preventDefault(); void envoyer(); }}>
      <h3 className="text-[14px] font-semibold">Ajouter une source</h3>
      {!editable && <p className="micro">Disponible une fois connectée et la migration appliquée.</p>}
      <label className="flex flex-col gap-1"><span className="meta">Adresse (flux RSS, page recrutement, page d’ATS…)</span>
        <input className="champ" type="url" inputMode="url" placeholder="https://studio.fr/recrutement" value={url} onChange={(e) => surUrl(e.target.value)} disabled={!editable} />
      </label>
      {url.trim() && !detection && <p className="micro text-danger">Adresse non reconnue.</p>}
      {interdit && <p className="micro text-danger">Jamais LinkedIn, Indeed ni Glassdoor : ajoute plutôt l’offre à la main depuis la Veille.</p>}
      {doublon && <p className="micro text-danger">Cette adresse est déjà dans la liste.</p>}
      {detection && !interdit && (
        <p className="micro">Détecté : {detection.ats ? `ATS ${detection.ats}` : detection.methode === "rss" ? "flux RSS" : "page HTML (sélecteurs génériques)"}.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1"><span className="meta">Nom</span><input className="champ" value={nom} onChange={(e) => { setNom(e.target.value); setNomModifie(true); }} disabled={!editable} /></label>
        <label className="flex flex-col gap-1"><span className="meta">Type</span>
          <select className="champ" value={type} onChange={(e) => setType(e.target.value as TypeSource)} disabled={!editable}>
            {(Object.keys(LABEL_TYPE) as TypeSource[]).map((t) => <option key={t} value={t}>{LABEL_TYPE[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="meta">Méthode</span>
          <select className="champ" value={methode} onChange={(e) => setMethode(e.target.value as Methode)} disabled={!editable}>
            {METHODES_AJOUT.map((m) => <option key={m} value={m}>{LABEL_METHODE[m]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="meta">Fréquence</span>
          <select className="champ" value={frequence} onChange={(e) => setFrequence(e.target.value as Frequence)} disabled={!editable}>
            {FREQUENCES.map((f) => <option key={f} value={f}>{LIBELLE_FREQUENCE[f]}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="bouton bouton-plein" type="submit" disabled={!editable || !detection || interdit || doublon || !nom.trim() || occupe}><Plus />Ajouter la source</button>
        {detection && !interdit && !doublon && <p className="micro">Sera collectée au prochain passage (dans ~{heures} h), puis {LIBELLE_FREQUENCE[frequence].toLowerCase()}.</p>}
        {ajoute && <p role="status" className="micro font-semibold text-accent">{ajoute}</p>}
      </div>
    </form>
  );
}
