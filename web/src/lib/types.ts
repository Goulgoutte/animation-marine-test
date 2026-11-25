import type { Categorie, Offre, Production } from "@shared/types";

export type Statut =
  | "a_preparer"
  | "envoyee"
  | "relancee"
  | "entretien"
  | "refus"
  | "acceptee"
  | "sans_reponse";

export type Canal = "mail" | "formulaire" | "linkedin" | "salon" | "recommandation" | "autre";

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
  zone: "paris" | "petite-couronne" | "idf";
  teletravail: boolean;
  langues: ("fr" | "en")[];
  afficher3d: boolean;
}

export interface Reglages extends Base {
  perimetre: Perimetre;
  delai_relance_1: number;
  delai_relance_2: number;
  delai_contact_mois: number;
  derniere_visite: string | null;
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
];

export type Donnees = { [K in TableName]: Tables[K][] };

export const REGLAGES_DEFAUT: Omit<Reglages, "id"> = {
  perimetre: { zone: "petite-couronne", teletravail: true, langues: ["fr", "en"], afficher3d: false },
  delai_relance_1: 10,
  delai_relance_2: 15,
  delai_contact_mois: 3,
  derniere_visite: null,
};

export const STATUTS: { id: Statut; label: string; couleur: string }[] = [
  { id: "a_preparer", label: "À préparer", couleur: "#7b8296" },
  { id: "envoyee", label: "Envoyée", couleur: "#2f6fdd" },
  { id: "relancee", label: "Relancée", couleur: "#c77a0a" },
  { id: "entretien", label: "Entretien ou test", couleur: "#8a52d9" },
  { id: "acceptee", label: "Acceptée", couleur: "#2c8a5a" },
  { id: "refus", label: "Refus", couleur: "#d6455d" },
  { id: "sans_reponse", label: "Sans réponse", couleur: "#8d93a5" },
];
export const CANAUX: { id: Canal; label: string }[] = [
  { id: "mail", label: "Mail" },
  { id: "formulaire", label: "Formulaire du site" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "salon", label: "Salon ou festival" },
  { id: "recommandation", label: "Recommandation" },
  { id: "autre", label: "Autre" },
];
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
export const labelCanal = (c: string) => CANAUX.find((x) => x.id === c)?.label ?? c;
export const labelEchange = (c: string) => TYPES_ECHANGE.find((x) => x.id === c)?.label ?? c;
