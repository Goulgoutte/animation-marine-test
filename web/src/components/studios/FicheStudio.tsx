"use client";

import { Briefcase, ExternalLink, Film, Globe, Mail, MapPin, Pencil, Radar, Trash2, Users, X, Heart, Plus, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BadgeStatut } from "@/components/BadgeStatut";
import { AjoutPersonne } from "@/components/studios/AjoutPersonne";
import { CouvertureStudio } from "@/components/studios/CouvertureStudio";
import { FormulaireStudio } from "@/components/studios/FormulaireStudio";
import { Pastille, PastilleMode, PastillePlus } from "@/components/studios/Pastilles";
import { Avatar, Vignette } from "@/components/ui";
import { useStore } from "@/lib/store";
import { activiteDe, lienMaps, urlSure } from "@/lib/studios";
import type { RoleStudio, Studio } from "@/lib/types";

const hote = (u: string) => {
  try { return new URL(urlSure(u)).hostname.replace(/^www\./, ""); } catch { return u; }
};

/** Fiche d’un studio : consultation par défaut (bandeau, pastilles, « En bref »), formulaire via « Modifier ». */
export function FicheStudio({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const s = useStore();
  const [edition, setEdition] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  function supprimer() {
    if (confirm(`Supprimer la fiche « ${studio.nom} » ? Les contacts restent dans ton carnet.`)) {
      s.remove("studios", studio.id);
      onClose();
    }
  }
  const nom = studio.nom || "Studio";

  return createPortal(
    <div className="voile fixed inset-0 z-50 flex items-stretch justify-center bg-[#0b0c12]/50 backdrop-blur-md md:items-center md:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={nom} className="feuille relative flex h-dvh w-full max-w-[920px] flex-col overflow-hidden bg-surface shadow-[var(--ombre-forte)] md:h-auto md:max-h-[calc(100dvh-4rem)] md:rounded-3xl md:border md:border-line">
        {edition ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 md:px-8">
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-bold tracking-tight">Modifier {nom}</h2>
                <p className="micro">Chaque champ est enregistré en le quittant.</p>
              </div>
              <button type="button" onClick={() => setEdition(false)} className="bouton bouton-texte bouton-icone -mr-2" aria-label="Revenir à la fiche"><X /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6 md:px-8"><FormulaireStudio studio={studio} onOuvrirContact={onClose} /></div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-8">
              <button className="bouton bouton-texte bouton-danger" onClick={supprimer}><Trash2 />Supprimer</button>
              <button className="bouton bouton-plein" onClick={() => setEdition(false)}>Enregistrer</button>
            </div>
          </>
        ) : (
          <>
            <div className="absolute right-3 top-3 z-10 flex gap-1.5">
              {studio.site && <BoutonBandeau href={urlSure(studio.site)} label="Site du studio" icone={Globe} />}
              {studio.page_recrutement && <BoutonBandeau href={urlSure(studio.page_recrutement)} label="Page recrutement" icone={Briefcase} />}
              {studio.email_recrutement && <BoutonBandeau href={`mailto:${studio.email_recrutement}`} label="Écrire au recrutement" icone={Mail} externe={false} />}
              <BoutonBandeau onClick={() => setEdition(true)} label="Modifier" icone={Pencil} />
              <BoutonBandeau onClick={onClose} label="Fermer" icone={X} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <CouvertureStudio image={studio.couverture} nom={nom} className="h-[140px] md:h-[180px]" />
              <div className="px-5 md:px-8">
                <div className="relative -mt-9 w-fit rounded-[26px] bg-surface p-1 shadow-[var(--ombre)] md:-mt-11">
                  <span className="hidden md:block"><Vignette image={studio.logo} nom={nom} taille={80} /></span>
                  <span className="md:hidden"><Vignette image={studio.logo} nom={nom} taille={64} /></span>
                </div>
                <h1 className="mt-3 break-words text-[26px] font-extrabold leading-tight tracking-tight">{nom}</h1>
                <Meta studio={studio} />
              </div>
              <Corps studio={studio} onClose={onClose} />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function BoutonBandeau({ label, icone: Icone, href, onClick, externe = true }: { label: string; icone: LucideIcon; href?: string; onClick?: () => void; externe?: boolean }) {
  const cls = "grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60";
  return href
    ? <a className={cls} href={href} {...(externe ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={label} title={label}><Icone className="h-4 w-4" /></a>
    : <button type="button" className={cls} onClick={onClick} aria-label={label} title={label}><Icone className="h-4 w-4" /></button>;
}

function Meta({ studio }: { studio: Studio }) {
  const elements: ReactNode[] = [];
  if (studio.ville) elements.push(<span key="v" className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{studio.ville}</span>);
  if (studio.mode_travail !== "inconnu") elements.push(<PastilleMode key="m" mode={studio.mode_travail} />);
  if (studio.techniques.length > 0) elements.push(
    <span key="t" className="inline-flex flex-wrap gap-1">{studio.techniques.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-muted shadow-[inset_0_0_0_1px_var(--line)]">{t}</span>)}</span>,
  );
  if (elements.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-muted">
      {elements.map((e, i) => <span key={i} className="inline-flex items-center gap-2.5">{i > 0 && <span aria-hidden>·</span>}{e}</span>)}
    </div>
  );
}

function Corps({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const maj = (p: Partial<Studio>) => s.patch("studios", studio.id, { ...p, updated_at: new Date().toISOString() });
  const [ajout, setAjout] = useState<RoleStudio | null>(null);
  const [tout, setTout] = useState(false);
  const activite = useMemo(() => activiteDe(studio, s.data, s.collecte), [studio, s.data, s.collecte]);

  const personnes = (role: RoleStudio) => s.data.contact_studios
    .filter((l) => l.studio_id === studio.id && l.role === role)
    .map((l) => ({ l, c: s.data.contacts.find((k) => k.id === l.contact_id) }))
    .filter((x): x is { l: typeof x.l; c: NonNullable<typeof x.c> } => !!x.c);
  const amis = personnes("ami");
  const contacts = personnes("contact");
  const ouvrirContact = (id: string) => { s.setFocus({ kind: "contact", id }); onClose(); };
  const aller = (kind: "candidature" | "offre" | "production", id: string, chemin: string) => { s.setFocus({ kind, id }); router.push(chemin); onClose(); };

  const items = [
    ...activite.candidatures.map((x) => ({ cle: `c${x.id}`, icone: Briefcase, titre: x.poste || "Candidature", sous: "Candidature", badge: <BadgeStatut statut={x.statut} />, va: () => aller("candidature", x.id, "/candidatures/") })),
    ...activite.offres.map((o) => ({ cle: `o${o.id}`, icone: Radar, titre: o.titre, sous: `Offre${o.lieu ? ` · ${o.lieu}` : ""}`, badge: null, va: () => aller("offre", o.id, "/veille/") })),
    ...activite.productions.map((p) => ({ cle: `p${p.id}`, icone: Film, titre: p.titre, sous: `Production${p.statut !== "inconnu" ? ` · ${p.statut}` : ""}`, badge: null, va: () => aller("production", p.id, "/veille/") })),
  ];
  const visibles = tout ? items : items.slice(0, 3);

  const groupe = (role: RoleStudio, titre: string, icone: LucideIcon, liste: typeof amis, incitation: string) => {
    const Icone = icone;
    return (
      <section aria-label={titre}>
        <h2 className="titre-section mb-3 flex items-center gap-2"><Icone className="h-4 w-4 text-muted" />{titre}{liste.length > 0 && <span className="font-normal text-muted">{liste.length}</span>}</h2>
        <div className="flex flex-wrap gap-2">
          {liste.map(({ l, c }) => {
            const n = `${c.prenom} ${c.nom}`.trim() || "Contact";
            return <Pastille key={l.id} role={role} nom={n} sous={role === "contact" ? c.fonction : null} detail={l.detail} avatar={<Avatar nom={n} taille={26} rond />} onOuvrir={() => ouvrirContact(c.id)} />;
          })}
          <PastillePlus texte={liste.length === 0 ? incitation : "Ajouter"} ouvert={ajout === role} onClick={() => setAjout(ajout === role ? null : role)} />
        </div>
        {ajout === role && <div className="mt-3"><AjoutPersonne studio={studio} role={role} titre={titre} onFini={() => setAjout(null)} /></div>}
      </section>
    );
  };

  const adresse = [studio.adresse, [studio.ville, studio.pays].filter(Boolean).join(", ")].filter(Boolean);
  const lignes: ReactNode[] = [];
  if (adresse.length > 0) lignes.push(
    <Ligne key="a" icone={MapPin} label="Adresse">
      {adresse.map((a) => <span key={a} className="block break-words">{a}</span>)}
      <a className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline" href={lienMaps(studio)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" />Voir sur Maps</a>
    </Ligne>,
  );
  if (studio.mode_travail !== "inconnu") lignes.push(<Ligne key="m" icone={Users} label="Mode de travail"><PastilleMode mode={studio.mode_travail} /></Ligne>);
  if (studio.taille) lignes.push(<Ligne key="t" icone={Users} label="Taille">{studio.taille}</Ligne>);
  if (studio.site || studio.page_recrutement || studio.email_recrutement) lignes.push(
    <Ligne key="l" icone={Globe} label="Liens">
      {studio.site && <a className="block truncate text-accent hover:underline" href={urlSure(studio.site)} target="_blank" rel="noopener noreferrer">{hote(studio.site)}</a>}
      {studio.page_recrutement && <a className="block truncate text-accent hover:underline" href={urlSure(studio.page_recrutement)} target="_blank" rel="noopener noreferrer">Page recrutement</a>}
      {studio.email_recrutement && <a className="block truncate text-accent hover:underline" href={`mailto:${studio.email_recrutement}`}>{studio.email_recrutement}</a>}
    </Ligne>,
  );

  return (
    <div className="grid gap-8 px-5 pb-8 pt-7 md:grid-cols-[minmax(0,1fr)_280px] md:px-8">
      <div className="min-w-0 space-y-8">
        {studio.description && <APropos texte={studio.description} />}
        {groupe("ami", "Amis", Heart, amis, "Qui connais-tu ici ? Ajouter un ami")}
        {groupe("contact", "Contacts", Briefcase, contacts, "Qui recrute ? Ajouter un contact")}
        {items.length > 0 && (
          <section aria-label="Activité">
            <h2 className="titre-section mb-3">Activité</h2>
            <ul className="space-y-2">
              {visibles.map((x) => (
                <li key={x.cle}><button type="button" className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-line p-2.5 text-left text-[13px] transition-colors hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))]" onClick={x.va}>
                  <x.icone className="h-4 w-4 flex-none text-muted" />
                  <span className="min-w-0 flex-1"><strong className="block truncate">{x.titre}</strong><span className="micro block truncate">{x.sous}</span></span>
                  {x.badge}
                </button></li>
              ))}
            </ul>
            {items.length > 3 && <button type="button" className="mt-2 text-[12.5px] font-semibold text-accent hover:underline" onClick={() => setTout(!tout)}>{tout ? "Voir moins" : `Voir tout (${items.length})`}</button>}
          </section>
        )}
      </div>
      <aside className="min-w-0">
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <h2 className="titre-section mb-3">En bref</h2>
          <div className="space-y-3.5">
            {lignes}
            <NoteEnPlace valeur={studio.notes} onSave={(v) => maj({ notes: v })} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Ligne({ icone: Icone, label, children }: { icone: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2.5 text-[13px]">
      <Icone className="mt-0.5 h-4 w-4 flex-none text-muted" aria-hidden />
      <div className="min-w-0 flex-1"><p className="meta">{label}</p><div className="mt-0.5 min-w-0">{children}</div></div>
    </div>
  );
}

function APropos({ texte }: { texte: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const mesure = () => { const e = ref.current; if (e && !ouvert) setLong(e.scrollHeight > e.clientHeight + 1); };
    mesure();
    window.addEventListener("resize", mesure);
    return () => window.removeEventListener("resize", mesure);
  }, [texte, ouvert]);
  return (
    <section aria-label="À propos">
      <h2 className="titre-section mb-2">À propos</h2>
      <p ref={ref} className={`whitespace-pre-line break-words text-[14px] leading-relaxed text-[color-mix(in_srgb,var(--fg)_85%,var(--muted))] ${ouvert ? "" : "line-clamp-3"}`}>{texte}</p>
      {(long || ouvert) && <button type="button" className="mt-1 text-[12.5px] font-semibold text-accent hover:underline" onClick={() => setOuvert(!ouvert)}>{ouvert ? "Réduire" : "Lire la suite"}</button>}
    </section>
  );
}

/** Notes courtes, éditables en place : un clic ouvre le champ, la sortie enregistre. */
function NoteEnPlace({ valeur, onSave }: { valeur: string | null; onSave: (v: string | null) => void }) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState(valeur ?? "");
  const fin = () => {
    const n = v.trim() || null;
    if (n !== (valeur ?? null)) onSave(n);
    setEdition(false);
  };
  return (
    <div className="border-t border-line pt-3.5 text-[13px]">
      <p className="meta mb-1">Mes notes</p>
      {edition ? (
        <textarea className="champ" autoFocus aria-label="Mes notes" value={v} onChange={(e) => setV(e.target.value)} onBlur={fin} placeholder="Tes notes personnelles" />
      ) : valeur ? (
        <button type="button" className="group block w-full whitespace-pre-line break-words rounded-lg text-left leading-relaxed hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]" onClick={() => { setV(valeur); setEdition(true); }} aria-label="Modifier mes notes">{valeur}</button>
      ) : (
        <button type="button" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-accent" onClick={() => { setV(""); setEdition(true); }}><Plus className="h-3.5 w-3.5" />Ajouter une note</button>
      )}
    </div>
  );
}
