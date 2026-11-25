import type { Collecte } from "./store";
import type { Contact, ContactStudio, Donnees, ModeStudio, RoleStudio, Studio } from "./types";
import { normaliser } from "./zones";
import { offresVues, productionsVues } from "./veille";

/** Nom normalisé pour comparer des studios : sans accents, casse, ponctuation ni mention « (Paris) ». */
export const normStudio = (nom: string | null | undefined) => normaliser((nom ?? "").replace(/\([^)]*\)/g, ""));

export const MODES_STUDIO: { id: ModeStudio; label: string; court: string }[] = [
  { id: "presentiel", label: "Présentiel", court: "Présentiel" },
  { id: "teletravail", label: "Télétravail", court: "Télétravail" },
  { id: "mixte", label: "Mixte", court: "Mixte" },
  { id: "inconnu", label: "Inconnu", court: "À vérifier" },
];
export const labelMode = (m: ModeStudio) => MODES_STUDIO.find((x) => x.id === m)?.court ?? m;
export const TON_MODE: Record<ModeStudio, "info" | "ok" | "accent" | "mute"> = { presentiel: "info", teletravail: "ok", mixte: "accent", inconnu: "mute" };
export const TECHNIQUES_USUELLES = ["2D", "3D", "stop-motion", "hybride", "VFX"];
export const ROLES: { id: RoleStudio; label: string }[] = [{ id: "contact", label: "Contact" }, { id: "ami", label: "Ami" }];

export const lienMaps = (s: Pick<Studio, "nom" | "adresse" | "ville" | "pays">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.nom, s.adresse, s.ville, s.pays].filter(Boolean).join(", "))}`;

/** Ajoute https:// à un lien saisi sans schéma. */
export const urlSure = (u: string) => (/^(https?:|mailto:)/i.test(u) ? u : `https://${u}`);

export function studioVide(nom: string, ville?: string | null): Omit<Studio, "id"> {
  return {
    nom: nom.trim(), adresse: null, ville: ville?.trim() || null, pays: null, site: null, email_recrutement: null, page_recrutement: null,
    description: null, mode_travail: "inconnu", techniques: [], taille: null, notes: null, logo: null,
  };
}

export interface NomConnu { nom: string; ville: string | null; sources: string[] }

/** Nom de studio d’une source de carrière : « Caribara (Paris) » → { nom: "Caribara", ville: "Paris" }. */
function decoupeSource(n: string): { nom: string; ville: string | null } {
  const m = n.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { nom: n.trim(), ville: null };
  const ville = m[2].split(",")[0].trim();
  return { nom: m[1].trim(), ville: /^[A-ZÉÈ][\p{L}\- ]+$/u.test(ville) && ville.split(" ").length <= 2 ? ville : null };
}

/** Studios déjà cités dans l’app (contacts, candidatures, offres, productions, sources) et absents des fiches. */
export function nomsConnus(d: Donnees, c: Collecte | null): NomConnu[] {
  const deja = new Set(d.studios.map((s) => normStudio(s.nom)));
  const out = new Map<string, NomConnu>();
  const voir = (nom: string | null | undefined, source: string, ville?: string | null) => {
    const n = (nom ?? "").trim();
    const cle = normStudio(n);
    if (!cle || deja.has(cle)) return;
    const e = out.get(cle) ?? { nom: n, ville: null, sources: [] };
    if (!e.ville && ville?.trim()) e.ville = ville.trim();
    if (!e.sources.includes(source)) e.sources.push(source);
    out.set(cle, e);
  };
  d.contacts.forEach((k) => voir(k.structure, "contacts", k.ville));
  d.candidatures.forEach((k) => voir(k.studio, "candidatures"));
  if (c) {
    offresVues(c, d, null).forEach((o) => voir(o.studio, "offres", o.lieu));
    productionsVues(c, d, null).forEach((p) => {
      p.producteurs.forEach((x) => voir(x, "productions", p.villeFabrication));
      p.studiosFabrication.forEach((x) => voir(x, "productions", p.villeFabrication));
    });
    c.sources.sources.filter((s) => s.type === "carriere-studio").forEach((s) => {
      const r = decoupeSource(s.nom);
      voir(r.nom, "sources", r.ville);
    });
  }
  return [...out.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

/** Structures des contacts sans fiche, avec les contacts concernés. */
export function structuresSansFiche(d: Donnees): { nom: string; ville: string | null; contacts: Contact[] }[] {
  const deja = new Set(d.studios.map((s) => normStudio(s.nom)));
  const m = new Map<string, { nom: string; ville: string | null; contacts: Contact[] }>();
  d.contacts.forEach((k) => {
    const cle = normStudio(k.structure);
    if (!cle || deja.has(cle)) return;
    const e = m.get(cle) ?? { nom: k.structure!.trim(), ville: null, contacts: [] };
    if (!e.ville && k.ville) e.ville = k.ville;
    e.contacts.push(k);
    m.set(cle, e);
  });
  return [...m.values()];
}

export const liensDe = (d: Donnees, studioId: string) => d.contact_studios.filter((l) => l.studio_id === studioId);
export const nbRole = (liens: ContactStudio[], r: RoleStudio) => new Set(liens.filter((l) => l.role === r).map((l) => l.contact_id)).size;

/** Candidatures, offres et productions qui parlent de ce studio. */
export function activiteDe(studio: Studio, d: Donnees, c: Collecte | null) {
  const cle = normStudio(studio.nom);
  const candidatures = d.candidatures.filter((x) => normStudio(x.studio) === cle);
  if (!c || !cle) return { candidatures, offres: [], productions: [] };
  const cite = (...t: (string | null | undefined)[]) => ` ${normaliser(t.filter(Boolean).join(" "))} `.includes(` ${cle} `);
  const offres = offresVues(c, d, null).filter((o) => !o.masquee && (normStudio(o.studio) === cle || cite(o.titre, o.production, o.extrait)));
  const productions = productionsVues(c, d, null).filter((p) => !p.masquee && (
    [...p.producteurs, ...p.studiosFabrication].some((x) => normStudio(x) === cle) || cite(p.titre, p.extrait)));
  return { candidatures, offres, productions };
}
