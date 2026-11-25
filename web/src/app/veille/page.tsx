"use client";

import { Archive, Briefcase, CalendarClock, Check, ExternalLink, EyeOff, Film, Globe2, MapPin, Pencil, Plus, Radar, Search, ShieldAlert, Sparkles, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Categorie } from "@shared/types";
import { FormOffre, FormProduction } from "@/components/FormsVeille";
import { Avatar, EnTete, Interrupteur, Onglets, Sheet, Vide } from "@/components/ui";
import { nouvelleCandidature } from "@/lib/candidature";
import { fmt, fmtCourt, today } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Candidature } from "@/lib/types";
import {
  LABEL_CONTRAT, LABEL_FORMAT, LABEL_MODE, LABEL_NIVEAU, LABEL_STATUT_PROD, offreDansPerimetre, offresVues,
  productionCategorie, productionDansPerimetre, productionsVues, type OffreVue, type ProductionVue,
} from "@/lib/veille";

type Onglet = "offres" | "productions";
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Veille() {
  const s = useStore();
  const [onglet, setOnglet] = useState<Onglet>("offres");
  const [cat, setCat] = useState<Categorie>("decor");
  const [q, setQ] = useState("");
  const [horsPerimetre, setHorsPerimetre] = useState(false);
  const [masques, setMasques] = useState(false);
  const [ajout, setAjout] = useState<null | "offre" | "production">(null);
  const [detail, setDetail] = useState<null | { kind: "offre" | "production"; id: string }>(null);
  const [edition, setEdition] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const offres = useMemo(() => offresVues(s.collecte!, s.data, s.visitePrecedente), [s.collecte, s.data, s.visitePrecedente]);
  const prods = useMemo(() => productionsVues(s.collecte!, s.data, s.visitePrecedente), [s.collecte, s.data, s.visitePrecedente]);

  // Ouverture depuis la recherche globale ou le tableau de bord
  useEffect(() => {
    const f = s.focus;
    if (!f || (f.kind !== "offre" && f.kind !== "production")) return;
    if (f.kind === "offre") {
      const o = offres.find((x) => x.id === f.id);
      if (o) { setOnglet("offres"); setCat(o.categorie); }
    } else {
      const p = prods.find((x) => x.id === f.id);
      if (p) { setOnglet("productions"); setCat(productionCategorie(p)); }
    }
    setDetail({ kind: f.kind, id: f.id });
    setEdition(false);
    s.setFocus(null);
  }, [s.focus, offres, prods, s]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("onglet") === "productions") setOnglet("productions");
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const t = norm(q.trim());
  const matchO = (o: OffreVue) => !t || norm([o.titre, o.studio, o.production, o.lieu, o.extrait].filter(Boolean).join(" ")).includes(t);
  const matchP = (p: ProductionVue) => !t || norm([p.titre, p.producteurs.join(" "), p.studiosFabrication.join(" "), p.realisateur, p.extrait].filter(Boolean).join(" ")).includes(t);

  const offresCat = offres.filter((o) => o.categorie === cat);
  const prodsCat = prods.filter((p) => productionCategorie(p) === cat);
  const visiblesO = offresCat.filter((o) => matchO(o) && (horsPerimetre || o.manuelle || offreDansPerimetre(o, s.reglages)) && (masques ? o.masquee : !o.masquee));
  const visiblesP = prodsCat.filter((p) => matchP(p) && (horsPerimetre || p.manuelle || productionDansPerimetre(p, s.reglages)) && (masques ? p.masquee : !p.masquee));
  const nbMasques = (onglet === "offres" ? offresCat : prodsCat).filter((x) => x.masquee).length;

  const compte = (c: Categorie) =>
    onglet === "offres"
      ? offres.filter((o) => o.categorie === c && !o.masquee && (horsPerimetre || o.manuelle || offreDansPerimetre(o, s.reglages))).length
      : prods.filter((p) => productionCategorie(p) === c && !p.masquee && (horsPerimetre || p.manuelle || productionDansPerimetre(p, s.reglages))).length;

  const nouvellesDecor = offres.filter((o) => o.categorie === "decor" && o.nouveau && !o.masquee && offreDansPerimetre(o, s.reglages)).length;
  const nbHors = (onglet === "offres" ? offresCat.filter((o) => !offreDansPerimetre(o, s.reglages)) : prodsCat.filter((p) => !productionDansPerimetre(p, s.reglages))).filter((x) => !x.masquee && !x.manuelle).length;

  const deja = (kind: "offre" | "production", id: string) =>
    s.data.candidatures.find((c) => (kind === "offre" ? c.offre_id : c.production_id) === id);

  function masquer(kind: "offre" | "production", id: string) {
    s.add("masquages", { kind, ref_id: id });
  }
  function reafficher(kind: "offre" | "production", id: string) {
    const m = s.data.masquages.find((x) => x.kind === kind && x.ref_id === id);
    if (m) s.remove("masquages", m.id);
  }
  function candidaterOffre(o: OffreVue) {
    const c = s.add("candidatures", nouvelleCandidature({
      studio: o.studio ?? "", poste: o.titre, type: "offre", categorie: o.categorie, offre_id: o.id,
      source_url: o.sources[0]?.url ?? null, canal: o.sources[0]?.sourceId === "manuel" ? "autre" : "formulaire",
    }));
    setFlash(`« ${c.poste} » ajoutée à tes candidatures (à préparer).`);
  }
  function candidaterProd(p: ProductionVue) {
    s.add("candidatures", nouvelleCandidature({
      studio: p.studiosFabrication[0] ?? p.producteurs[0] ?? p.titre, poste: `Candidature spontanée : ${p.titre}`, type: "spontanee",
      categorie: "decor", production_id: p.id, source_url: p.sources[0]?.url ?? null, canal: "mail",
    }));
    setFlash(`Candidature spontanée pour « ${p.titre} » préparée (à préparer).`);
  }
  function enregistrerCorrection(kind: "offre" | "production", id: string, manuelle: boolean, complet: Record<string, unknown>) {
    if (manuelle) {
      const rowId = id.slice(2);
      s.patch(kind === "offre" ? "offres_manuelles" : "productions_manuelles", rowId, { data: { ...complet, id: rowId } } as never);
    } else {
      const { id: _i, sources: _s, premiereVue: _p, ...champs } = complet;
      const ex = s.data.corrections.find((x) => x.kind === kind && x.ref_id === id);
      if (ex) s.patch("corrections", ex.id, { champs });
      else s.add("corrections", { kind, ref_id: id, champs });
    }
    setEdition(false);
  }
  function retirerCorrection(kind: "offre" | "production", id: string) {
    const ex = s.data.corrections.find((x) => x.kind === kind && x.ref_id === id);
    if (ex) s.remove("corrections", ex.id);
    setEdition(false);
  }

  const dateGen = s.collecte?.offres.genereLe;
  const detailO = detail?.kind === "offre" ? offres.find((o) => o.id === detail.id) : undefined;
  const detailP = detail?.kind === "production" ? prods.find((p) => p.id === detail.id) : undefined;
  const fermer = () => { setDetail(null); setEdition(false); };

  return (
    <>
      <EnTete
        titre="Veille"
        description={<><strong className="font-semibold text-accent">{nouvellesDecor}</strong> {nouvellesDecor > 1 ? "nouvelles offres" : "nouvelle offre"} décor dans ton périmètre{dateGen ? <> · collecte du {fmt(dateGen)}</> : null}</>}
        droite={
          <>
            <button className="bouton" onClick={() => setAjout("production")}><Plus />Production</button>
            <button className="bouton bouton-plein" onClick={() => setAjout("offre")}><Plus />Offre</button>
          </>
        }
      />
      {s.collecte?.fictives && (
        <p className="mb-4 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-muted">
          Aucun fichier de collecte trouvé dans <code>public/data</code> : données d’exemple affichées.
        </p>
      )}

      <div className="carte mb-5 flex flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "offres", label: <><Briefcase className="h-3.5 w-3.5" />Offres d’emploi</> }, { id: "productions", label: <><Film className="h-3.5 w-3.5" />Productions</> }]} />
          <div className="flex gap-1.5" role="group" aria-label="Catégorie">
            <button className="puce" aria-pressed={cat === "decor"} onClick={() => setCat("decor")}>Décor <span className="opacity-70">{compte("decor")}</span></button>
            <button className="puce" aria-pressed={cat === "autre"} onClick={() => setCat("autre")}>Autres métiers <span className="opacity-70">{compte("autre")}</span></button>
          </div>
          <label className="relative ml-auto w-full min-w-0 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="champ !pl-9" placeholder="Filtrer par titre, studio, lieu…" aria-label="Filtrer la veille" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
          <Interrupteur label={`Afficher les résultats hors périmètre${nbHors ? ` (${nbHors})` : ""}`} checked={horsPerimetre} onChange={setHorsPerimetre} />
          {nbMasques > 0 && <Interrupteur label={`Voir les masqués (${nbMasques})`} checked={masques} onChange={setMasques} />}
        </div>
      </div>

      {onglet === "offres" ? (
        visiblesO.length === 0 ? (
          <Vide icone={Radar} titre="Rien à afficher ici" action={<button className="bouton bouton-plein" onClick={() => setAjout("offre")}><Plus />Ajouter une offre</button>}>
            {t ? <>Aucune offre ne correspond à « {q} ».</> : <>Aucune offre {cat === "decor" ? "décor" : "dans les autres métiers"} dans ton périmètre pour l’instant. La collecte passe deux fois par jour.
            Active « Afficher les résultats hors périmètre » pour vérifier le filtre, ou ajoute à la main une annonce vue sur LinkedIn ou Instagram.</>}
          </Vide>
        ) : (
          <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visiblesO.map((o) => (
              <li key={o.id}><CarteOffre o={o} cand={deja("offre", o.id)} onOuvrir={() => { setDetail({ kind: "offre", id: o.id }); setEdition(false); }} onMasquer={() => (o.masquee ? reafficher("offre", o.id) : masquer("offre", o.id))} onCandidater={() => candidaterOffre(o)} /></li>
            ))}
          </ul>
        )
      ) : visiblesP.length === 0 ? (
        <Vide icone={Film} titre="Aucune production à afficher" action={<button className="bouton bouton-plein" onClick={() => setAjout("production")}><Plus />Ajouter une production</button>}>
          {t ? <>Aucune production ne correspond à « {q} ».</> : <>Les productions repérées dans l’actualité apparaîtront ici (2D en priorité). Tu peux aussi en ajouter une à la main quand tu en entends parler.</>}
        </Vide>
      ) : (
        <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visiblesP.map((p) => (
            <li key={p.id}><CarteProd p={p} cand={deja("production", p.id)} onOuvrir={() => { setDetail({ kind: "production", id: p.id }); setEdition(false); }} onMasquer={() => (p.masquee ? reafficher("production", p.id) : masquer("production", p.id))} onCandidater={() => candidaterProd(p)} /></li>
          ))}
        </ul>
      )}

      {flash && (
        <div role="status" className="feuille fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-[55] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-fg px-4 py-3 text-[13px] text-bg shadow-[var(--ombre-forte)] md:bottom-6">
          <span className="flex min-w-0 items-center gap-2"><Check className="h-4 w-4 flex-none text-ok" /><span>{flash}</span></span>
          <Link href="/candidatures/" className="flex-none font-bold underline">Voir</Link>
        </div>
      )}

      {ajout === "offre" && (
        <Sheet titre="Ajouter une offre à la main" onClose={() => setAjout(null)} large>
          <p className="mb-3 text-sm text-muted">Pour une annonce vue sur LinkedIn, Instagram ou ailleurs : colle le lien et remplis l’essentiel.</p>
          <FormOffre avecUrl onCancel={() => setAjout(null)} onSave={(o) => { s.add("offres_manuelles", { data: o }); setAjout(null); setCat(o.categorie); setOnglet("offres"); }} />
        </Sheet>
      )}
      {ajout === "production" && (
        <Sheet titre="Ajouter une production à la main" onClose={() => setAjout(null)} large>
          <FormProduction avecUrl onCancel={() => setAjout(null)} onSave={(p) => { s.add("productions_manuelles", { data: p }); setAjout(null); setOnglet("productions"); }} />
        </Sheet>
      )}

      {detailO && !edition && (
        <Sheet titre={detailO.titre} sousTitre={[detailO.studio, detailO.production].filter(Boolean).join(" · ") || "Studio non précisé"} onClose={fermer} large
          pied={<ActionsDetail masquee={detailO.masquee} cand={deja("offre", detailO.id)} labelCandidater="Ajouter à mes candidatures" onCandidater={() => candidaterOffre(detailO)} onCorriger={() => setEdition(true)} onMasquer={() => { detailO.masquee ? reafficher("offre", detailO.id) : masquer("offre", detailO.id); fermer(); }} />}>
          <DetailOffre o={detailO} />
        </Sheet>
      )}
      {detailO && edition && (
        <Sheet titre="Corriger l’offre" onClose={fermer} large>
          <FormOffre initial={detailO} onCancel={() => setEdition(false)} onSave={(o) => enregistrerCorrection("offre", detailO.id, detailO.manuelle, o as never)} />
          {detailO.corrigee && <button className="bouton bouton-texte mt-3" onClick={() => retirerCorrection("offre", detailO.id)}><Undo2 />Revenir à la version collectée</button>}
        </Sheet>
      )}
      {detailP && !edition && (
        <Sheet titre={detailP.titre} sousTitre={[LABEL_FORMAT[detailP.format], detailP.technique !== "inconnue" ? detailP.technique : null, LABEL_STATUT_PROD[detailP.statut]].filter(Boolean).join(" · ")} onClose={fermer} large
          pied={<ActionsDetail masquee={detailP.masquee} cand={deja("production", detailP.id)} labelCandidater="Préparer une candidature spontanée" onCandidater={() => candidaterProd(detailP)} onCorriger={() => setEdition(true)} onMasquer={() => { detailP.masquee ? reafficher("production", detailP.id) : masquer("production", detailP.id); fermer(); }} />}>
          <DetailProd p={detailP} />
        </Sheet>
      )}
      {detailP && edition && (
        <Sheet titre="Corriger la production" onClose={fermer} large>
          <FormProduction initial={detailP} onCancel={() => setEdition(false)} onSave={(p) => enregistrerCorrection("production", detailP.id, detailP.manuelle, p as never)} />
          {detailP.corrigee && <button className="bouton bouton-texte mt-3" onClick={() => retirerCorrection("production", detailP.id)}><Undo2 />Revenir à la version collectée</button>}
        </Sheet>
      )}
    </>
  );
}

/* ---------- Pièces communes ---------- */

function ActionsDetail({ masquee, cand, labelCandidater, onMasquer, onCandidater, onCorriger }: { masquee: boolean; cand?: Candidature; labelCandidater: string; onMasquer: () => void; onCandidater: () => void; onCorriger: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cand ? (
        <Link href="/candidatures/" className="bouton"><Check />Déjà dans tes candidatures</Link>
      ) : (
        <button className="bouton bouton-plein" onClick={onCandidater}><Briefcase />{labelCandidater}</button>
      )}
      <button className="bouton" onClick={onCorriger}><Pencil />Corriger</button>
      <button className="bouton bouton-texte ml-auto" onClick={onMasquer}>{masquee ? <><Undo2 />Réafficher</> : <><EyeOff />Masquer</>}</button>
    </div>
  );
}

function Fait({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 px-3 py-2">
      <dt className="meta">{label}</dt>
      <dd className="mt-0.5 break-words text-[13.5px] font-medium">{children}</dd>
    </div>
  );
}

function ListeSources({ sources }: { sources: { sourceId: string; url: string; vuLe?: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <section className="mt-5">
      <h3 className="meta mb-2">Sources ({sources.length})</h3>
      <ul className="space-y-1.5">
        {sources.map((x) => (
          <li key={x.url}>
            <a href={x.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] transition-colors hover:bg-surface-2">
              <ExternalLink className="h-3.5 w-3.5 flex-none text-muted" />
              <span className="font-semibold">{x.sourceId}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{x.url.replace(/^https?:\/\//, "")}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function BadgesOffre({ o }: { o: OffreVue }) {
  const expiree = o.probablementExpiree || (!!o.dateLimite && o.dateLimite < today());
  return (
    <>
      {o.nouveau && <span className="badge badge-plein c-accent">Nouveau</span>}
      {o.residenceExigee && <span className="badge badge-plein c-danger"><ShieldAlert />Résidence exigée : {o.residenceExigee}</span>}
      {o.aVerifier && <span className="badge c-warn">À vérifier</span>}
      {expiree && <span className="badge c-mute"><Archive />Probablement expirée</span>}
      {o.manuelle && <span className="badge c-info">Ajoutée à la main</span>}
      {o.corrigee && <span className="badge c-info">Corrigée</span>}
    </>
  );
}

function DetailOffre({ o }: { o: OffreVue }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5"><BadgesOffre o={o} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Fait label="Lieu">{[o.lieu, o.pays && o.pays !== "France" ? o.pays : null].filter(Boolean).join(", ") || null}</Fait>
        <Fait label="Mode de travail">{LABEL_MODE[o.modeTravail]}</Fait>
        <Fait label="Technique">{o.technique === "inconnue" ? "Inconnue" : o.technique}</Fait>
        <Fait label="Contrat">{LABEL_CONTRAT[o.contrat]}</Fait>
        <Fait label="Niveau">{LABEL_NIVEAU[o.niveau]}</Fait>
        <Fait label="Langue">{{ fr: "Français", en: "Anglais", autre: "Autre", inconnue: "" }[o.langue]}</Fait>
        <Fait label="Publiée le">{o.datePublication ? fmt(o.datePublication) : null}</Fait>
        <Fait label="Début">{o.dateDebut ? fmt(o.dateDebut) : null}</Fait>
        <Fait label="Date limite">{o.dateLimite ? fmt(o.dateLimite) : null}</Fait>
        <Fait label="Vue pour la 1re fois">{fmt(o.premiereVue)}</Fait>
      </dl>
      {o.extrait && (
        <section className="mt-5">
          <h3 className="meta mb-2">Extrait de l’annonce</h3>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{o.extrait}</p>
        </section>
      )}
      <ListeSources sources={o.sources} />
    </>
  );
}

function DetailProd({ p }: { p: ProductionVue }) {
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {p.nouveau && <span className="badge badge-plein c-accent">Nouveau</span>}
        {p.bonMomentDecor && <span className="badge c-ok"><Sparkles />Bon moment pour candidater en décor</span>}
        {p.misEnAvant && <span className="badge c-info"><MapPin />Fabrication à Paris ou télétravail</span>}
        {p.manuelle && <span className="badge c-info">Ajoutée à la main</span>}
        {p.corrigee && <span className="badge c-info">Corrigée</span>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Fait label="Production">{p.producteurs.join(", ")}</Fait>
        <Fait label="Fabrication">{p.studiosFabrication.length ? `${p.studiosFabrication.join(", ")}${p.villeFabrication ? ` (${p.villeFabrication})` : ""}` : p.villeFabrication}</Fait>
        <Fait label="Coproduction">{p.paysCoproducteurs.join(", ")}</Fait>
        <Fait label="Pays des décors">{p.paysDecors}</Fait>
        <Fait label="Diffuseur">{p.diffuseur}</Fait>
        <Fait label="Réalisation">{p.realisateur}</Fait>
        <Fait label="Démarrage annoncé">{p.dateDemarrage ? fmt(p.dateDemarrage) : null}</Fait>
        <Fait label="Contact de recrutement">{p.contactRecrutement}</Fait>
      </dl>
      {p.extrait && (
        <section className="mt-5">
          <h3 className="meta mb-2">Notes</h3>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{p.extrait}</p>
        </section>
      )}
      <ListeSources sources={p.sources} />
    </>
  );
}

const actionsSurvol = "mt-3 flex flex-wrap items-center gap-1.5 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100";

function Actions({ masquee, cand, labelCandidater, onMasquer, onCandidater }: { masquee: boolean; cand?: Candidature; labelCandidater: string; onMasquer: () => void; onCandidater: () => void }) {
  return (
    <div className={`relative z-10 ${actionsSurvol}`}>
      {cand ? (
        <span className="badge c-ok"><Check />Dans tes candidatures</span>
      ) : (
        <button className="bouton bouton-plein bouton-petit" onClick={onCandidater}><Briefcase />{labelCandidater}</button>
      )}
      <button className="bouton bouton-petit bouton-texte" onClick={onMasquer}>{masquee ? <><Undo2 />Réafficher</> : <><EyeOff />Masquer</>}</button>
    </div>
  );
}

function CarteOffre({ o, cand, onOuvrir, onMasquer, onCandidater }: { o: OffreVue; cand?: Candidature; onOuvrir: () => void; onMasquer: () => void; onCandidater: () => void }) {
  const nomStudio = o.studio ?? o.titre;
  return (
    <article className={`group carte carte-lien relative h-full p-4 ${o.masquee ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar nom={nomStudio} taille={40} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[14.5px] font-semibold leading-snug">
            <button onClick={onOuvrir} className="text-left after:absolute after:inset-0 after:content-[''] after:rounded-[14px]">{o.titre}</button>
          </h3>
          <p className="truncate text-[13px] text-muted">{[o.studio, o.production].filter(Boolean).join(" · ") || "Studio non précisé"}</p>
        </div>
        {o.datePublication && <span className="micro flex-none whitespace-nowrap">{fmtCourt(o.datePublication)}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <BadgesOffre o={o} />
        <span className="badge c-mute"><MapPin />{LABEL_MODE[o.modeTravail]}</span>
        {o.technique !== "inconnue" && <span className="badge c-accent">{o.technique}</span>}
        {o.contrat !== "inconnu" && <span className="badge c-mute">{LABEL_CONTRAT[o.contrat]}</span>}
      </div>
      <p className="micro mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        {o.lieu && <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />{[o.lieu, o.pays && o.pays !== "France" ? o.pays : null].filter(Boolean).join(", ")}</span>}
        {o.dateLimite && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Limite le {fmtCourt(o.dateLimite)}</span>}
        {o.sources.length > 0 && <span>{o.sources.length} source{o.sources.length > 1 ? "s" : ""}</span>}
      </p>
      <Actions masquee={o.masquee} cand={cand} labelCandidater="Ajouter à mes candidatures" onMasquer={onMasquer} onCandidater={onCandidater} />
    </article>
  );
}

function CarteProd({ p, cand, onOuvrir, onMasquer, onCandidater }: { p: ProductionVue; cand?: Candidature; onOuvrir: () => void; onMasquer: () => void; onCandidater: () => void }) {
  const nomStudio = p.studiosFabrication[0] ?? p.producteurs[0] ?? p.titre;
  return (
    <article className={`group carte carte-lien relative h-full p-4 ${p.masquee ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar nom={nomStudio} taille={40} />
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[14.5px] font-semibold leading-snug">
            <button onClick={onOuvrir} className="text-left after:absolute after:inset-0 after:content-[''] after:rounded-[14px]">{p.titre}</button>
          </h3>
          <p className="truncate text-[13px] text-muted">{[p.producteurs[0], p.studiosFabrication[0]].filter(Boolean).join(" · ") || LABEL_FORMAT[p.format]}</p>
        </div>
        {p.dateDemarrage && <span className="micro flex-none whitespace-nowrap">dès {fmtCourt(p.dateDemarrage)}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.nouveau && <span className="badge badge-plein c-accent">Nouveau</span>}
        {p.bonMomentDecor && <span className="badge c-ok"><Sparkles />Bon moment pour candidater en décor</span>}
        {p.misEnAvant && <span className="badge c-info"><MapPin />Paris ou télétravail</span>}
        <span className="badge c-mute">{LABEL_FORMAT[p.format]}</span>
        {p.technique !== "inconnue" && <span className="badge c-accent">{p.technique}</span>}
        <span className="badge c-mute">{LABEL_STATUT_PROD[p.statut]}</span>
        {p.manuelle && <span className="badge c-info">Ajoutée à la main</span>}
      </div>
      {(p.paysCoproducteurs.length > 0 || p.diffuseur) && (
        <p className="micro mt-2.5 truncate">
          {[p.paysCoproducteurs.length ? `Coprod. ${p.paysCoproducteurs.join(", ")}${p.paysDecors ? ` (décors : ${p.paysDecors})` : ""}` : null, p.diffuseur].filter(Boolean).join(" · ")}
        </p>
      )}
      <Actions masquee={p.masquee} cand={cand} labelCandidater="Préparer une candidature spontanée" onMasquer={onMasquer} onCandidater={onCandidater} />
    </article>
  );
}
