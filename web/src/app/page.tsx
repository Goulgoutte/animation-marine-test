"use client";

import { useMemo, useState } from "react";
import type { Categorie } from "@shared/types";
import { FormOffre, FormProduction } from "@/components/FormsVeille";
import { EnTete, Interrupteur, Onglets, Sheet, Vide } from "@/components/ui";
import { fmt, fmtCourt, today } from "@/lib/dates";
import { nouvelleCandidature } from "@/lib/candidature";
import { useStore } from "@/lib/store";
import type { Candidature } from "@/lib/types";
import {
  LABEL_CONTRAT, LABEL_FORMAT, LABEL_MODE, LABEL_NIVEAU, LABEL_STATUT_PROD, offreDansPerimetre, offresVues,
  productionCategorie, productionDansPerimetre, productionsVues, type OffreVue, type ProductionVue,
} from "@/lib/veille";

type Onglet = "offres" | "productions";

export default function Veille() {
  const s = useStore();
  const [onglet, setOnglet] = useState<Onglet>("offres");
  const [cat, setCat] = useState<Categorie>("decor");
  const [horsPerimetre, setHorsPerimetre] = useState(false);
  const [masques, setMasques] = useState(false);
  const [ajout, setAjout] = useState<null | "offre" | "production">(null);
  const [edition, setEdition] = useState<null | OffreVue | ProductionVue>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const offres = useMemo(() => offresVues(s.collecte!, s.data, s.visitePrecedente), [s.collecte, s.data, s.visitePrecedente]);
  const prods = useMemo(() => productionsVues(s.collecte!, s.data, s.visitePrecedente), [s.collecte, s.data, s.visitePrecedente]);

  const offresCat = offres.filter((o) => o.categorie === cat);
  const prodsCat = prods.filter((p) => productionCategorie(p) === cat);
  const visiblesO = offresCat.filter((o) => (horsPerimetre || o.manuelle || offreDansPerimetre(o, s.reglages)) && (masques ? o.masquee : !o.masquee));
  const visiblesP = prodsCat.filter((p) => (horsPerimetre || p.manuelle || productionDansPerimetre(p, s.reglages)) && (masques ? p.masquee : !p.masquee));
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
    const c = s.add("candidatures", nouvelleCandidature({
      studio: p.studiosFabrication[0] ?? p.producteurs[0] ?? p.titre, poste: `Candidature spontanée : ${p.titre}`, type: "spontanee",
      categorie: "decor", production_id: p.id, source_url: p.sources[0]?.url ?? null, canal: "mail",
    }));
    setFlash(`Candidature spontanée pour « ${p.titre} » préparée (à préparer).`);
    return c;
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
    setEdition(null);
  }
  function retirerCorrection(kind: "offre" | "production", id: string) {
    const ex = s.data.corrections.find((x) => x.kind === kind && x.ref_id === id);
    if (ex) s.remove("corrections", ex.id);
    setEdition(null);
  }

  const dateGen = s.collecte?.offres.genereLe;

  return (
    <>
      <EnTete
        surtitre="Veille"
        titre={<><span className="text-[var(--color-red)]">{nouvellesDecor}</span> {nouvellesDecor > 1 ? "nouvelles offres" : "nouvelle offre"} décor</>}
        droite={
          <div className="flex gap-2">
            <button className="bouton bouton-plein" onClick={() => setAjout("offre")}>+ Offre</button>
            <button className="bouton" onClick={() => setAjout("production")}>+ Production</button>
          </div>
        }
      />
      {s.collecte?.fictives && (
        <p className="mb-4 rounded-lg border border-dashed border-[var(--color-mute)] px-3 py-2 text-xs">
          Aucun fichier de collecte trouvé dans <code>public/data</code> : données d’exemple affichées.
        </p>
      )}

      <div className="sticky top-0 z-20 -mx-4 mb-5 flex flex-col gap-3 bg-[var(--color-paper)]/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "offres", label: "Offres d’emploi" }, { id: "productions", label: "Productions" }]} />
          <Onglets valeur={cat} onChange={setCat} options={[{ id: "decor", label: `Décor (${compte("decor")})` }, { id: "autre", label: `Autres métiers (${compte("autre")})` }]} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Interrupteur label={`Afficher les résultats hors périmètre${nbHors ? ` (${nbHors})` : ""}`} checked={horsPerimetre} onChange={setHorsPerimetre} />
          {nbMasques > 0 && <Interrupteur label={`Voir les masqués (${nbMasques})`} checked={masques} onChange={setMasques} />}
          {dateGen && <span className="micro ml-auto">Collecte du {fmt(dateGen)}</span>}
        </div>
      </div>

      {flash && (
        <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[var(--color-teal)] px-4 py-3 text-sm text-white">
          <span>{flash}</span>
          <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/candidatures/`} className="font-bold underline">Voir</a>
        </div>
      )}

      {onglet === "offres" ? (
        visiblesO.length === 0 ? (
          <Vide titre="Rien à afficher ici" action={<button className="bouton bouton-plein" onClick={() => setAjout("offre")}>Ajouter une offre</button>}>
            Aucune offre {cat === "decor" ? "décor" : "dans les autres métiers"} dans ton périmètre pour l’instant. La collecte passe deux fois par jour.
            Active « Afficher les résultats hors périmètre » pour vérifier le filtre, ou ajoute à la main une annonce vue sur LinkedIn ou Instagram.
          </Vide>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visiblesO.map((o) => (
              <li key={o.id}><CarteOffre o={o} cand={deja("offre", o.id)} onMasquer={() => (o.masquee ? reafficher("offre", o.id) : masquer("offre", o.id))} onCandidater={() => candidaterOffre(o)} onCorriger={() => setEdition(o)} /></li>
            ))}
          </ul>
        )
      ) : visiblesP.length === 0 ? (
        <Vide titre="Aucune production à afficher" action={<button className="bouton bouton-plein" onClick={() => setAjout("production")}>Ajouter une production</button>}>
          Les productions repérées dans l’actualité apparaîtront ici (2D en priorité). Tu peux aussi en ajouter une à la main quand tu en entends parler.
        </Vide>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visiblesP.map((p) => (
            <li key={p.id}><CarteProd p={p} cand={deja("production", p.id)} onMasquer={() => (p.masquee ? reafficher("production", p.id) : masquer("production", p.id))} onCandidater={() => candidaterProd(p)} onCorriger={() => setEdition(p)} /></li>
          ))}
        </ul>
      )}

      {ajout === "offre" && (
        <Sheet titre="Ajouter une offre à la main" onClose={() => setAjout(null)} large>
          <p className="mb-3 text-sm text-[var(--color-mute)]">Pour une annonce vue sur LinkedIn, Instagram ou ailleurs : colle le lien et remplis l’essentiel.</p>
          <FormOffre avecUrl onCancel={() => setAjout(null)} onSave={(o) => { s.add("offres_manuelles", { data: o }); setAjout(null); setCat(o.categorie); setOnglet("offres"); }} />
        </Sheet>
      )}
      {ajout === "production" && (
        <Sheet titre="Ajouter une production à la main" onClose={() => setAjout(null)} large>
          <FormProduction avecUrl onCancel={() => setAjout(null)} onSave={(p) => { s.add("productions_manuelles", { data: p }); setAjout(null); setOnglet("productions"); }} />
        </Sheet>
      )}
      {edition && "modeTravail" in edition && (
        <Sheet titre="Corriger l’offre" onClose={() => setEdition(null)} large>
          <FormOffre initial={edition} onCancel={() => setEdition(null)} onSave={(o) => enregistrerCorrection("offre", edition.id, edition.manuelle, o as never)} />
          {edition.corrigee && <button className="bouton bouton-texte mt-3" onClick={() => retirerCorrection("offre", edition.id)}>Revenir à la version collectée</button>}
        </Sheet>
      )}
      {edition && "statut" in edition && (
        <Sheet titre="Corriger la production" onClose={() => setEdition(null)} large>
          <FormProduction initial={edition} onCancel={() => setEdition(null)} onSave={(p) => enregistrerCorrection("production", edition.id, edition.manuelle, p as never)} />
          {edition.corrigee && <button className="bouton bouton-texte mt-3" onClick={() => retirerCorrection("production", edition.id)}>Revenir à la version collectée</button>}
        </Sheet>
      )}
    </>
  );
}

function Actions({ masquee, cand, labelCandidater, onMasquer, onCandidater, onCorriger }: { masquee: boolean; cand?: Candidature; labelCandidater: string; onMasquer: () => void; onCandidater: () => void; onCorriger: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {cand ? (
        <span className="badge b-info">Déjà dans tes candidatures</span>
      ) : (
        <button className="bouton bouton-plein bouton-petit" onClick={onCandidater}>{labelCandidater}</button>
      )}
      <button className="bouton bouton-petit" onClick={onCorriger}>Corriger</button>
      <button className="bouton bouton-petit bouton-texte" onClick={onMasquer}>{masquee ? "Réafficher" : "Masquer"}</button>
    </div>
  );
}

function Sources({ sources }: { sources: { sourceId: string; url: string }[] }) {
  if (sources.length === 0) return null;
  return (
    <p className="micro mt-3 break-words">
      Sources :{" "}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ", "}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.sourceId}</a>
        </span>
      ))}
    </p>
  );
}

function CarteOffre({ o, cand, onMasquer, onCandidater, onCorriger }: { o: OffreVue; cand?: Candidature; onMasquer: () => void; onCandidater: () => void; onCorriger: () => void }) {
  const expiree = o.probablementExpiree || (!!o.dateLimite && o.dateLimite < today());
  return (
    <article className={`carte h-full p-4 ${o.masquee ? "opacity-60" : ""} ${o.residenceExigee ? "" : ""}`}>
      <div className="flex flex-wrap gap-1.5">
        {o.nouveau && <span className="badge badge-plein b-nouveau">Nouveau</span>}
        {o.residenceExigee && <span className="badge badge-plein b-residence">Résidence exigée : {o.residenceExigee}</span>}
        {o.aVerifier && <span className="badge b-verifier">À vérifier</span>}
        {expiree && <span className="badge b-expiree">Probablement expirée</span>}
        {o.manuelle && <span className="badge b-info">Ajoutée à la main</span>}
        {o.corrigee && <span className="badge b-info">Corrigée</span>}
      </div>
      <h3 className="titre-l mt-2 break-words">{o.titre}</h3>
      <p className="mt-0.5 text-[15px] font-semibold">
        {[o.studio, o.production].filter(Boolean).join(" · ") || "Studio non précisé"}
      </p>
      <p className="micro mt-1">
        {[o.lieu, o.pays && o.pays !== "France" ? o.pays : null, LABEL_MODE[o.modeTravail], o.technique !== "inconnue" ? o.technique : "Technique inconnue", LABEL_CONTRAT[o.contrat], LABEL_NIVEAU[o.niveau]].filter(Boolean).join(" · ")}
      </p>
      {o.extrait && <p className="mt-2 line-clamp-3 text-sm text-[#3a342a]">{o.extrait}</p>}
      <p className="micro mt-2">
        {[o.datePublication ? `Publiée le ${fmtCourt(o.datePublication)}` : null, o.dateDebut ? `Début le ${fmtCourt(o.dateDebut)}` : null, o.dateLimite ? `Limite le ${fmtCourt(o.dateLimite)}` : null].filter(Boolean).join(" · ")}
      </p>
      <Sources sources={o.sources} />
      <Actions masquee={o.masquee} cand={cand} labelCandidater="Ajouter à mes candidatures" onMasquer={onMasquer} onCandidater={onCandidater} onCorriger={onCorriger} />
    </article>
  );
}

function CarteProd({ p, cand, onMasquer, onCandidater, onCorriger }: { p: ProductionVue; cand?: Candidature; onMasquer: () => void; onCandidater: () => void; onCorriger: () => void }) {
  return (
    <article className={`carte h-full p-4 ${p.masquee ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap gap-1.5">
        {p.nouveau && <span className="badge badge-plein b-nouveau">Nouveau</span>}
        {p.bonMomentDecor && <span className="badge badge-plein b-moment">Bon moment pour candidater en décor</span>}
        {p.misEnAvant && <span className="badge b-info">Fabrication à Paris ou télétravail</span>}
        {p.manuelle && <span className="badge b-info">Ajoutée à la main</span>}
        {p.corrigee && <span className="badge b-info">Corrigée</span>}
      </div>
      <h3 className="titre-l mt-2 break-words">{p.titre}</h3>
      <p className="micro mt-1">
        {[LABEL_FORMAT[p.format], p.technique === "inconnue" ? "Technique inconnue" : p.technique, LABEL_STATUT_PROD[p.statut], p.dateDemarrage ? `démarrage ${fmtCourt(p.dateDemarrage)}` : null].filter(Boolean).join(" · ")}
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {p.producteurs.length > 0 && <><dt className="meta pt-0.5">Production</dt><dd>{p.producteurs.join(", ")}</dd></>}
        {p.studiosFabrication.length > 0 && <><dt className="meta pt-0.5">Fabrication</dt><dd>{p.studiosFabrication.join(", ")}{p.villeFabrication ? ` (${p.villeFabrication})` : ""}</dd></>}
        {p.paysCoproducteurs.length > 0 && <><dt className="meta pt-0.5">Coproduction</dt><dd>{p.paysCoproducteurs.join(", ")}{p.paysDecors ? ` · décors : ${p.paysDecors}` : ""}</dd></>}
        {p.diffuseur && <><dt className="meta pt-0.5">Diffuseur</dt><dd>{p.diffuseur}</dd></>}
        {p.realisateur && <><dt className="meta pt-0.5">Réalisation</dt><dd>{p.realisateur}</dd></>}
        {p.contactRecrutement && <><dt className="meta pt-0.5">Contact</dt><dd className="break-all">{p.contactRecrutement}</dd></>}
      </dl>
      {p.extrait && <p className="mt-2 line-clamp-3 text-sm text-[#3a342a]">{p.extrait}</p>}
      <Sources sources={p.sources} />
      <Actions masquee={p.masquee} cand={cand} labelCandidater="Préparer une candidature spontanée" onMasquer={onMasquer} onCandidater={onCandidater} onCorriger={onCorriger} />
    </article>
  );
}
