import type { Collecte } from "./store";
import { diffDays, today } from "./dates";
import { normStudio, nomsConnus } from "./studios";
import type { Contact, Donnees, LienContact, RoleStudio, TypeLien } from "./types";

export const TYPES_LIEN: { id: TypeLien; label: string; poids: number }[] = [
  { id: "presente_par", label: "Présenté", poids: 0.9 },
  { id: "ami", label: "Ami", poids: 0.8 },
  { id: "collegue", label: "Collègue", poids: 0.7 },
  { id: "meme_ecole", label: "Même école", poids: 0.5 },
  { id: "autre", label: "Autre", poids: 0.4 },
];
export const labelLien = (t: TypeLien) => TYPES_LIEN.find((x) => x.id === t)?.label ?? t;
const poidsLien = (t: TypeLien) => TYPES_LIEN.find((x) => x.id === t)?.poids ?? 0.4;

export const nomContact = (c: Contact) => `${c.prenom} ${c.nom}`.trim() || "Sans nom";

/**
 * Force d'une relation, de 0 à 1.
 * - récence du dernier échange : 1 le jour même, 0,5 vers 4 mois, presque rien au-delà d'un an (55 %) ;
 * - nombre d'échanges : plafonné à 6 (25 %) ;
 * - ami : bonus fixe (20 %).
 */
export function forceRelation(a: { jours: number | null; nbEchanges: number; ami: boolean }): number {
  const recence = a.jours === null ? 0 : Math.exp(-Math.max(0, a.jours) / 180);
  const volume = Math.min(1, a.nbEchanges / 6);
  const v = 0.55 * recence + 0.25 * volume + (a.ami ? 0.2 : 0);
  return Math.round(Math.min(1, Math.max(0, v)) * 100) / 100;
}

export type Anneau = 0 | 1 | 2;
/** Anneau de proximité : 0 = moins d'un mois, 1 = moins de 3 mois, 2 = plus ancien ou aucun échange. */
export const anneauDe = (jours: number | null): Anneau => (jours === null ? 2 : jours < 30 ? 0 : jours < 91 ? 1 : 2);

export interface Proche {
  contact: Contact;
  nom: string;
  dernier: string | null;
  jours: number | null;
  nbEchanges: number;
  ami: boolean;
  force: number;
  anneau: Anneau;
}

/** Une entrée par contact : ancienneté, nombre d'échanges, statut ami (ami d'au moins un studio) et force. */
export function proches(d: Donnees): Map<string, Proche> {
  const t = today();
  const out = new Map<string, Proche>();
  for (const c of d.contacts) {
    const dates = d.echanges.filter((e) => e.contact_id === c.id).map((e) => e.date.slice(0, 10)).sort();
    const dernier = dates.length ? dates[dates.length - 1] : null;
    const jours = dernier ? Math.max(0, diffDays(t, dernier)) : null;
    const ami = d.contact_studios.some((l) => l.contact_id === c.id && l.role === "ami");
    out.set(c.id, { contact: c, nom: nomContact(c), dernier, jours, nbEchanges: dates.length, ami, force: forceRelation({ jours, nbEchanges: dates.length, ami }), anneau: anneauDe(jours) });
  }
  return out;
}

/** Choix du sélecteur : une fiche studio, ou un nom vu dans la Veille (offres, productions). */
export interface CibleStudio { cle: string; nom: string; studioId: string | null; origine: "fiche" | "veille" }

export function studiosChoisissables(d: Donnees, c: Collecte | null): CibleStudio[] {
  const fiches: CibleStudio[] = d.studios.map((s) => ({ cle: `s:${s.id}`, nom: s.nom, studioId: s.id, origine: "fiche" }));
  const veille: CibleStudio[] = nomsConnus(d, c)
    .filter((n) => n.sources.some((x) => x === "offres" || x === "productions"))
    .map((n) => ({ cle: `n:${normStudio(n.nom)}`, nom: n.nom, studioId: null, origine: "veille" }));
  return [...fiches, ...veille].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export interface Maillon { p: Proche; role?: RoleStudio }

export interface Chemin {
  /** Personne liée au studio. */
  cible: Maillon;
  role: RoleStudio;
  /** Intermédiaire (chemin à 2 pas) et lien qui l'unit à la cible. */
  via?: Proche;
  lien?: LienContact;
  force: number;
  /** Première personne à contacter. */
  premier: Proche;
}

/** Personnes liées à un studio : contact_studios, et à défaut la structure inscrite sur la fiche du contact. */
export function liesAuStudio(d: Donnees, cible: CibleStudio): Map<string, RoleStudio> {
  const out = new Map<string, RoleStudio>();
  const cle = normStudio(cible.nom);
  for (const c of d.contacts) if (cle && normStudio(c.structure) === cle) out.set(c.id, "contact");
  if (cible.studioId) for (const l of d.contact_studios) if (l.studio_id === cible.studioId) if (out.get(l.contact_id) !== "ami") out.set(l.contact_id, l.role);
  return out;
}

/** Chemins vers un studio, du plus court au plus long, puis du plus fort au plus faible. */
export function cheminsVers(d: Donnees, cible: CibleStudio): Chemin[] {
  const pr = proches(d);
  const lies = liesAuStudio(d, cible);
  const chemins: Chemin[] = [];
  for (const [id, role] of lies) {
    const p = pr.get(id);
    if (!p) continue;
    chemins.push({ cible: { p, role }, role, force: p.force, premier: p });
    for (const l of d.liens_contacts) {
      if (l.contact_a !== id && l.contact_b !== id) continue;
      const via = pr.get(l.contact_a === id ? l.contact_b : l.contact_a);
      if (!via || via.contact.id === id) continue;
      // Un intermédiaire déjà lié au studio a son propre chemin direct : il n'apparaît en plus que s'il a présenté la cible.
      if (lies.has(via.contact.id) && !(l.type === "presente_par" && l.contact_a === via.contact.id)) continue;
      if (chemins.some((x) => x.via?.contact.id === via.contact.id && x.cible.p.contact.id === id && x.force >= via.force)) continue;
      // Le chemin vaut surtout par la solidité de la relation avec l'intermédiaire, pondérée par le type de lien.
      chemins.push({ cible: { p, role }, role, via, lien: l, force: Math.round(via.force * (0.4 + 0.6 * poidsLien(l.type)) * 100) / 100, premier: via });
    }
  }
  return chemins.sort((a, b) => (a.via ? 1 : 0) - (b.via ? 1 : 0) || b.force - a.force || a.premier.nom.localeCompare(b.premier.nom, "fr"));
}

/** Phrase décrivant le lien entre l'intermédiaire et la personne du studio. */
export function phraseLien(c: Chemin): string {
  if (!c.via || !c.lien) return "";
  const l = c.lien;
  const aPresente = l.type === "presente_par" ? (l.contact_a === c.via.contact.id ? `${c.via.nom} a présenté ${c.cible.p.nom}` : `${c.cible.p.nom} a présenté ${c.via.nom}`) : null;
  return aPresente ?? labelLien(l.type);
}

/** Modèle d'introduction proposé dans « Préparer le mail » (variables du modèle : {{contact_prenom}}, {{studio}}…). */
export function modeleIntro(c: Chemin, studio: string): { nom: string; sujet: string; corps: string } {
  const but = c.via ? c.cible.p.contact.prenom || c.cible.p.nom : "";
  const corps = c.via
    ? `Bonjour {{contact_prenom}},\n\nJ'espère que tu vas bien. Je cherche à travailler en décor chez {{studio}} et je crois que tu connais ${but}${c.cible.p.contact.fonction ? ` (${c.cible.p.contact.fonction})` : ""}. Accepterais-tu de nous mettre en relation ? Je peux t'envoyer mon portfolio et quelques lignes à transmettre.\n\nMerci d'avance !\n{{ma_signature}}`
    : `Bonjour {{contact_prenom}},\n\nJ'espère que tu vas bien. J'aimerais travailler en décor chez {{studio}}. Aurais-tu un conseil, ou un contact à qui m'adresser ?\n\nMerci d'avance !\n{{ma_signature}}`;
  return { nom: "Demande d’introduction", sujet: c.via ? `Une intro vers ${studio} ?` : `Un conseil pour ${studio} ?`, corps };
}

/** Ancienneté en clair : « il y a 12 jours », « il y a 4 mois », ou « jamais échangé ». */
export function ancienneteTexte(jours: number | null): string {
  if (jours === null) return "Aucun échange noté";
  if (jours === 0) return "Échange aujourd’hui";
  if (jours < 30) return `Échange il y a ${jours} jour${jours > 1 ? "s" : ""}`;
  const mois = Math.round(jours / 30.4);
  if (mois < 12) return `Échange il y a ${mois} mois`;
  const ans = Math.floor(mois / 12);
  return `Échange il y a ${ans} an${ans > 1 ? "s" : ""}`;
}

/**
 * Placement déterministe en anneaux : pour chaque anneau, les points sont répartis à angle égal,
 * sur plusieurs « voies » si l'anneau est trop plein pour qu'ils ne se chevauchent pas.
 */
export function placerAnneaux<T extends { id: string; anneau: Anneau }>(
  items: T[], rayons: [number, number][], rayonPoint: number,
): { item: T; x: number; y: number }[] {
  const out: { item: T; x: number; y: number }[] = [];
  for (const a of [0, 1, 2] as Anneau[]) {
    const groupe = items.filter((i) => i.anneau === a).sort((x, y) => x.id.localeCompare(y.id));
    const n = groupe.length;
    if (!n) continue;
    const [r0, r1] = rayons[a];
    const pas = 2 * rayonPoint + 6;
    const largeur = r1 - r0 - 2 * rayonPoint;
    const voiesMax = Math.max(1, Math.floor(largeur / pas) + 1);
    const rMoy = (r0 + r1) / 2;
    const voiesNecessaires = Math.ceil((n * pas) / (2 * Math.PI * rMoy));
    const voies = Math.min(voiesMax, Math.max(1, voiesNecessaires));
    for (let v = 0; v < voies; v++) {
      const membres = groupe.filter((_, i) => i % voies === v);
      const r = voies === 1 ? rMoy : r0 + rayonPoint + (v * largeur) / (voies - 1);
      membres.forEach((item, i) => {
        const ang = (2 * Math.PI * i) / membres.length + a * 0.9 + v * (Math.PI / Math.max(1, membres.length)) - Math.PI / 2;
        out.push({ item, x: r * Math.cos(ang), y: r * Math.sin(ang) });
      });
    }
  }
  return out;
}
