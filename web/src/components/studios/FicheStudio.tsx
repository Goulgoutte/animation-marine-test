"use client";

import { Briefcase, Building2, CircleHelp, ExternalLink, Film, Heart, House, Link2, Mail, MapPin, Plus, Radar, Shuffle, Trash2, UserPlus, Users, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BadgeStatut } from "@/components/BadgeStatut";
import { ChampTexte } from "@/components/studios/Edition";
import { Avatar, Champ, Sheet, Vignette } from "@/components/ui";
import { decouperNom, rangSuivant, triees } from "@/lib/crm";
import { useStore } from "@/lib/store";
import { MODES_STUDIO, ROLES, TECHNIQUES_USUELLES, activiteDe, lienMaps, normStudio, urlSure } from "@/lib/studios";
import type { Contact, ModeStudio, RoleStudio, Studio } from "@/lib/types";

const ICONE_MODE: Record<ModeStudio, LucideIcon> = { presentiel: Building2, teletravail: House, mixte: Shuffle, inconnu: CircleHelp };
const AIDE_MODE: Record<ModeStudio, string> = { presentiel: "Sur place", teletravail: "À distance", mixte: "Les deux", inconnu: "À vérifier" };
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function FicheStudio({ studio, onClose }: { studio: Studio; onClose: () => void }) {
  const s = useStore();
  const router = useRouter();
  const maj = (p: Partial<Studio>) => s.patch("studios", studio.id, { ...p, updated_at: new Date().toISOString() });
  const [tech, setTech] = useState("");
  const activite = useMemo(() => activiteDe(studio, s.data, s.collecte), [studio, s.data, s.collecte]);

  function supprimer() {
    if (confirm(`Supprimer la fiche « ${studio.nom} » ? Les contacts restent dans ton carnet.`)) {
      s.remove("studios", studio.id);
      onClose();
    }
  }
  function ajouterTech(t: string) {
    const v = t.trim();
    if (v && !studio.techniques.some((x) => norm(x) === norm(v))) maj({ techniques: [...studio.techniques, v] });
    setTech("");
  }
  const aller = (kind: "candidature" | "offre" | "production", id: string, chemin: string) => {
    s.setFocus({ kind, id });
    router.push(chemin);
    onClose();
  };

  return (
    <Sheet
      titre={studio.nom || "Studio"}
      sousTitre={studio.ville || undefined}
      large
      pleinMobile
      onClose={onClose}
      pied={<div className="flex items-center justify-between"><button className="bouton bouton-texte bouton-danger" onClick={supprimer}><Trash2 />Supprimer</button><button className="bouton bouton-plein" onClick={onClose}>Terminé</button></div>}
    >
      <div className="flex items-center gap-4 rounded-xl bg-surface-2 p-4">
        <Vignette image={studio.logo} nom={studio.nom} taille={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{studio.nom}</p>
          <p className="micro flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-none" />{[studio.ville, studio.pays].filter(Boolean).join(", ") || "Lieu à renseigner"}</p>
        </div>
        <div className="flex flex-none gap-1.5">
          {studio.site && <a className="bouton bouton-icone" href={urlSure(studio.site)} target="_blank" rel="noopener noreferrer" aria-label="Site du studio"><Link2 /></a>}
          {studio.page_recrutement && <a className="bouton bouton-icone" href={urlSure(studio.page_recrutement)} target="_blank" rel="noopener noreferrer" aria-label="Page recrutement"><Briefcase /></a>}
          {studio.email_recrutement && <a className="bouton bouton-icone" href={`mailto:${studio.email_recrutement}`} aria-label="Écrire au recrutement"><Mail /></a>}
        </div>
      </div>

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

      <SectionPersonnes studio={studio} role="contact" titre="Mes contacts" icone={Users} vide="Aucun contact ici pour l’instant." onOuvrir={onClose} />
      <SectionPersonnes studio={studio} role="ami" titre="Amis" icone={Heart} vide="Aucun ami noté. Ajoute ceux qui travaillent souvent ici : c’est eux qu’on appelle pour avoir des nouvelles." onOuvrir={onClose} />

      <h3 className="titre-section mb-3 mt-6">Activité</h3>
      {activite.candidatures.length + activite.offres.length + activite.productions.length === 0 ? (
        <p className="micro">Aucune candidature, offre ni production ne mentionne ce studio pour l’instant.</p>
      ) : (
        <ul className="space-y-2">
          {activite.candidatures.map((x) => (
            <li key={x.id}><button type="button" className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-line p-2.5 text-left text-[13px]" onClick={() => aller("candidature", x.id, "/candidatures/")}>
              <Briefcase className="h-4 w-4 flex-none text-muted" />
              <span className="min-w-0 flex-1"><strong className="block truncate">{x.poste || "Candidature"}</strong><span className="micro block truncate">Candidature</span></span>
              <BadgeStatut statut={x.statut} />
            </button></li>
          ))}
          {activite.offres.map((o) => (
            <li key={o.id}><button type="button" className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-line p-2.5 text-left text-[13px]" onClick={() => aller("offre", o.id, "/veille/")}>
              <Radar className="h-4 w-4 flex-none text-muted" />
              <span className="min-w-0 flex-1"><strong className="block truncate">{o.titre}</strong><span className="micro block truncate">Offre{o.lieu ? ` · ${o.lieu}` : ""}</span></span>
            </button></li>
          ))}
          {activite.productions.map((p) => (
            <li key={p.id}><button type="button" className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-line p-2.5 text-left text-[13px]" onClick={() => aller("production", p.id, "/veille/")}>
              <Film className="h-4 w-4 flex-none text-muted" />
              <span className="min-w-0 flex-1"><strong className="block truncate">{p.titre}</strong><span className="micro block truncate">Production{p.statut !== "inconnu" ? ` · ${p.statut}` : ""}</span></span>
            </button></li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function SectionPersonnes({ studio, role, titre, icone: Icone, vide, onOuvrir }: { studio: Studio; role: RoleStudio; titre: string; icone: LucideIcon; vide: string; onOuvrir: () => void }) {
  const s = useStore();
  const liens = s.data.contact_studios.filter((l) => l.studio_id === studio.id && l.role === role);
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState("");
  const [roleAjout, setRoleAjout] = useState<RoleStudio>(role);

  const candidats = useMemo(() => {
    const t = norm(q.trim());
    const deja = new Set(s.data.contact_studios.filter((l) => l.studio_id === studio.id && l.role === roleAjout).map((l) => l.contact_id));
    return s.data.contacts.filter((c) => !deja.has(c.id) && (!t || norm(`${c.prenom} ${c.nom} ${c.structure ?? ""}`).includes(t))).slice(0, 6);
  }, [q, s.data.contacts, s.data.contact_studios, studio.id, roleAjout]);

  function lier(c: Contact) {
    s.add("contact_studios", { contact_id: c.id, studio_id: studio.id, role: roleAjout, detail: detail.trim() || null });
    setQ(""); setDetail(""); setOuvert(false);
  }
  function creer() {
    const { prenom, nom } = decouperNom(q);
    if (!nom) return;
    const g = triees(s.data.crm_groupes)[0]?.id ?? null;
    const dans = s.data.contacts.filter((c) => c.groupe_id === g);
    const c = s.add("contacts", {
      nom, prenom, structure: roleAjout === "contact" ? studio.nom : null, fonction: null, ville: null, email: null, telephone: null, linkedin: null,
      rencontre: null, etiquettes: [], groupe_id: g, champs: {}, ordre: rangSuivant(dans),
    });
    lier(c);
  }
  const ouvrir = (id: string) => { s.setFocus({ kind: "contact", id }); onOuvrir(); };

  return (
    <>
      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <h3 className="titre-section flex items-center gap-2"><Icone className="h-4 w-4 text-muted" />{titre} <span className="font-normal text-muted">({liens.length})</span></h3>
        <button type="button" className="bouton bouton-petit" aria-expanded={ouvert} onClick={() => { setRoleAjout(role); setOuvert(!ouvert); }}><UserPlus />Ajouter</button>
      </div>
      {ouvert && (
        <div className="mb-3 grid gap-2 rounded-xl bg-surface-2 p-3" role="group" aria-label={`Ajouter dans ${titre}`}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem]">
            <Champ label="Chercher un contact ou saisir un nom"><input className="champ" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Prénom Nom" /></Champ>
            <Champ label="Rôle">
              <select className="champ" value={roleAjout} onChange={(e) => setRoleAjout(e.target.value as RoleStudio)}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </Champ>
          </div>
          <Champ label="Détail"><input className="champ" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Régulière en décor depuis 2023" /></Champ>
          <ul className="space-y-1">
            {candidats.map((c) => (
              <li key={c.id}>
                <button type="button" className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-accent-soft" onClick={() => lier(c)}>
                  <Avatar nom={`${c.prenom} ${c.nom}`} taille={24} rond />
                  <span className="min-w-0 flex-1 truncate"><strong>{`${c.prenom} ${c.nom}`.trim()}</strong>{c.structure ? <span className="text-muted"> · {c.structure}</span> : null}</span>
                  <Plus className="h-3.5 w-3.5 flex-none text-muted" />
                </button>
              </li>
            ))}
          </ul>
          {q.trim() && normStudio(q) && (
            <button type="button" className="bouton bouton-petit justify-start" onClick={creer}><UserPlus />Créer le contact « {q.trim()} » en tant que {roleAjout === "ami" ? "ami" : "contact"}</button>
          )}
        </div>
      )}
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
