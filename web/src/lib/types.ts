import type { MetiersPerso } from "@shared/metiers";
import type { Categorie, Offre, Production } from "@shared/types";

export type Statut =
  | "a_preparer"
  | "envoyee"
  | "relancee"
  | "peut_etre"
  | "entretien"
  | "refus"
  | "acceptee"
  | "sans_reponse";

/** `mail` est l’ancien identifiant (avant « Mail pro » et « Mail perso ») : toujours lu, affiché « Mail », plus proposé. */
export type Canal =
  | "mail" | "mail_pro" | "mail_perso" | "formulaire" | "linkedin" | "instagram" | "discord" | "whatsapp" | "sms"
  | "salon" | "recommandation" | "autre";

interface Base {
  id: string;
  created_at?: string;
}

export interface Candidature extends Base {
  studio: string;
  poste: string;
  type: "offre" | "spontanee";
  categorie: Categorie;
  offre_id: string | null;
  production_id: string | null;
  contact_id: string | null;
  source_url: string | null;
  date_envoi: string | null;
  canal: Canal;
  version_cv: string | null;
  statut: Statut;
  statut_avant: Statut | null;
  cloture_auto: boolean;
  cloture_annulee: boolean;
  notes: string | null;
  liens: string | null;
  prochaine_action: string | null;
  prochaine_action_date: string | null;
  motif_cloture: string | null;
  date_statut: string | null;
  /** Vignette : URL copiée de l'offre ou de la production liée à la création (reste si l'offre disparaît de la collecte). */
  image?: string | null;
  /** Mail : destinataire (par défaut l'e-mail du contact lié) et brouillon Gmail créé. */
  email_destinataire?: string | null;
  gmail_brouillon_id?: string | null;
}

export interface Relance extends Base {
  candidature_id: string;
  date: string;
  canal: Canal;
  note: string | null;
}

export interface Contact extends Base {
  nom: string;
  prenom: string;
  structure: string | null;
  fonction: string | null;
  ville: string | null;
  email: string | null;
  telephone: string | null;
  linkedin: string | null;
  rencontre: string | null;
  etiquettes: string[];
  /** CRM : groupe du tableau, valeurs des colonnes personnalisées (clé = id de colonne), rang dans le groupe. */
  groupe_id?: string | null;
  champs?: Record<string, unknown>;
  ordre?: number | null;
}

export type TypeColonne =
  | "texte" | "texte_long" | "statut" | "etiquettes" | "date" | "nombre"
  | "lien" | "email" | "telephone" | "case" | "note" | "dernier_echange";

export interface Libelle {
  id: string;
  label: string;
  couleur: string;
}

export interface CrmColonne extends Base {
  cle: string;
  titre: string;
  type: TypeColonne;
  options: { libelles?: Libelle[] };
  ordre: number;
  largeur: number;
  masquee: boolean;
  systeme: boolean;
}

export interface CrmGroupe extends Base {
  titre: string;
  couleur: string;
  ordre: number;
  replie: boolean;
}

export type TypeEchange = "cafe" | "dejeuner" | "festival" | "visio" | "appel" | "message" | "mail";

export interface Echange extends Base {
  contact_id: string;
  date: string;
  type: TypeEchange;
  lieu: string | null;
  sujets: string | null;
  promesses: string | null;
  prochaine_action: string | null;
  prochaine_date: string | null;
}

export interface OffreManuelle extends Base {
  data: Offre;
}
export interface ProductionManuelle extends Base {
  data: Production;
}
export interface Correction extends Base {
  kind: "offre" | "production";
  ref_id: string;
  champs: Record<string, unknown>;
}
export interface Masquage extends Base {
  kind: "offre" | "production";
  ref_id: string;
}

export interface Perimetre {
  /** Zones choisies (ids de lib/zones.ts). */
  zones?: string[];
  /** Ancien réglage, lu seulement si `zones` est absent. */
  zone?: "paris" | "petite-couronne" | "idf";
  teletravail: boolean;
  langues: ("fr" | "en")[];
  afficher3d: boolean;
  /** Métiers suivis (ids de lib/metiers.ts). Absent : on retombe sur l’ancien `categorie` puis sur le défaut. */
  metiers?: string[];
  /** Ancien réglage (« decor » ou « autre »), lu seulement si `metiers` est absent. */
  categorie?: Categorie;
  /** Modes de travail gardés (« sur-place », « hybride », « teletravail »). Absent : déduit de `teletravail`. */
  modes?: string[];
  /** Techniques gardées (« 2D », « 3D », « stop-motion », « inconnue »). Absent : déduit de `afficher3d`. */
  techniques?: string[];
  /** Mots-clés des métiers modifiés, métiers créés ou masqués : classement fait à l’affichage, aucune migration. */
  metiers_perso?: MetiersPerso;
}

/** Profil d'envoi des mails (variables {{mon_prenom}}, {{ma_signature}}, {{portfolio}}…). */
export interface ProfilMail {
  prenom?: string;
  nom?: string;
  signature?: string;
  portfolio?: string;
  cv?: string;
  /** Adresse d'envoi affichée (en-tête From) : Gmail ne l'honore que pour l'adresse du compte ou un alias vérifié. */
  adresse?: string;
  /** Modèles par défaut déjà créés (ne pas les recréer si tu les supprimes). */
  modeles_init?: boolean;
}

export interface ModeleMail extends Base {
  nom: string;
  sujet: string;
  corps: string;
  categorie: string;
}

export interface Reglages extends Base {
  perimetre: Perimetre;
  profil_mail?: ProfilMail;
  delai_relance_1: number;
  delai_relance_2: number;
  delai_contact_mois: number;
  derniere_visite: string | null;
}

export type ModeStudio = "presentiel" | "teletravail" | "mixte" | "inconnu";
export type RoleStudio = "contact" | "ami";

export interface Studio extends Base {
  nom: string;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  site: string | null;
  email_recrutement: string | null;
  page_recrutement: string | null;
  description: string | null;
  mode_travail: ModeStudio;
  techniques: string[];
  taille: string | null;
  notes: string | null;
  logo: string | null;
  /** Image de couverture (URL) ; absente = illustration générée d’après le nom. */
  couverture?: string | null;
  updated_at?: string;
}

export interface ContactStudio extends Base {
  contact_id: string;
  studio_id: string;
  role: RoleStudio;
  detail: string | null;
}

export interface Tables {
  candidatures: Candidature;
  relances: Relance;
  contacts: Contact;
  echanges: Echange;
  offres_manuelles: OffreManuelle;
  productions_manuelles: ProductionManuelle;
  corrections: Correction;
  masquages: Masquage;
  reglages: Reglages;
  crm_colonnes: CrmColonne;
  crm_groupes: CrmGroupe;
  studios: Studio;
  contact_studios: ContactStudio;
  modeles_mail: ModeleMail;
}
/** Partage de vue en lecture seule (table `partages`, hors des tables de données par utilisateur). */
export interface Partage {
  id: string;
  proprietaire: string;
  invite_email: string;
  actif: boolean;
  proprietaire_nom: string | null;
  proprietaire_avatar: string | null;
  created_at?: string;
}

export type TableName = keyof Tables;
export const TABLE_NAMES: TableName[] = [
  "candidatures",
  "relances",
  "contacts",
  "echanges",
  "offres_manuelles",
  "productions_manuelles",
  "corrections",
  "masquages",
  "reglages",
  "crm_colonnes",
  "crm_groupes",
  "studios",
  "contact_studios",
  "modeles_mail",
];

export type Donnees = { [K in TableName]: Tables[K][] };

export const REGLAGES_DEFAUT: Omit<Reglages, "id"> = {
  perimetre: { zones: ["paris", "petite-couronne"], teletravail: true, langues: ["fr", "en"], afficher3d: false },
  delai_relance_1: 10,
  delai_relance_2: 15,
  delai_contact_mois: 3,
  derniere_visite: null,
  profil_mail: {},
};

export const STATUTS: { id: Statut; label: string; couleur: string }[] = [
  { id: "a_preparer", label: "À préparer", couleur: "#7b8296" },
  { id: "envoyee", label: "Envoyée", couleur: "#2f6fdd" },
  { id: "relancee", label: "Relancée", couleur: "#c77a0a" },
  { id: "peut_etre", label: "Peut-être", couleur: "#0e8fa3" },
  { id: "entretien", label: "Entretien ou test", couleur: "#8a52d9" },
  { id: "acceptee", label: "Acceptée", couleur: "#2c8a5a" },
  { id: "refus", label: "Refus", couleur: "#d6455d" },
  { id: "sans_reponse", label: "Sans réponse", couleur: "#8d93a5" },
];
export const CANAUX: { id: Canal; label: string }[] = [
  { id: "mail_pro", label: "Mail pro" },
  { id: "mail_perso", label: "Mail perso" },
  { id: "formulaire", label: "Formulaire du site" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "salon", label: "Salon ou festival" },
  { id: "recommandation", label: "Recommandation" },
  { id: "autre", label: "Autre" },
];
/** Canaux proposés dans un menu : la liste courante, plus « Mail » si la fiche porte encore l’ancien identifiant. */
export const canauxPour = (courant?: string): { id: Canal; label: string }[] =>
  courant === "mail" ? [{ id: "mail", label: "Mail" }, ...CANAUX] : CANAUX;
export const TYPES_ECHANGE: { id: TypeEchange; label: string }[] = [
  { id: "cafe", label: "Café" },
  { id: "dejeuner", label: "Déjeuner" },
  { id: "festival", label: "Festival ou salon" },
  { id: "visio", label: "Visio" },
  { id: "appel", label: "Appel" },
  { id: "message", label: "Message" },
  { id: "mail", label: "Mail" },
];
export const labelStatut = (s: Statut) => STATUTS.find((x) => x.id === s)?.label ?? s;
export const labelCanal = (c: string) => (c === "mail" ? "Mail" : (CANAUX.find((x) => x.id === c)?.label ?? c));
export const labelEchange = (c: string) => TYPES_ECHANGE.find((x) => x.id === c)?.label ?? c;
