// Contrat de données partagé entre la collecte (collector/) et le site (web/).
// La collecte écrit web/public/data/*.json ; le site les lit tels quels.

export type Categorie = "decor" | "autre";
export type Technique = "2D" | "3D" | "stop-motion" | "hybride" | "inconnue";
export type ModeTravail =
  | "paris-sur-place"
  | "teletravail-complet"
  | "hybride"
  | "sur-place-ailleurs"
  | "inconnu";
export type Contrat = "CDDU" | "CDD" | "CDI" | "freelance" | "stage" | "inconnu";
export type Niveau = "junior" | "confirme" | "senior" | "lead" | "inconnu";
export type Langue = "fr" | "en" | "autre" | "inconnue";

export interface SourceRef {
  sourceId: string;
  url: string;
  vuLe: string; // ISO
}

export interface Offre {
  id: string; // hash stable (studio + titre normalisés) pour le dédoublonnage
  titre: string;
  studio: string | null;
  production: string | null;
  lieu: string | null;
  pays: string | null;
  technique: Technique;
  modeTravail: ModeTravail;
  residenceExigee: string | null; // ex. "Irlande", "Royaume-Uni"
  contrat: Contrat;
  niveau: Niveau;
  langue: Langue;
  dateDebut: string | null;
  dateLimite: string | null;
  datePublication: string | null;
  premiereVue: string; // ISO, sert au badge « Nouveau »
  extrait: string;
  image: string | null; // URL https absolue : visuel de l'offre, à défaut logo du studio
  logo?: string | null; // logo du studio, si trouvé séparément
  categorie: Categorie;
  dansPerimetre: boolean; // 2D (ou inconnue) ET (Paris sur place OU télétravail complet accessible depuis la France, en FR/EN)
  aVerifier: boolean; // technique ou mode de travail non déterminé
  probablementExpiree: boolean;
  sources: SourceRef[];
}

export type FormatProd = "long-metrage" | "serie" | "court" | "special-tv" | "inconnu";
export type StatutProd =
  | "developpement"
  | "financement"
  | "preproduction"
  | "production"
  | "postproduction"
  | "inconnu";

export interface Production {
  id: string; // hash stable du titre normalisé
  titre: string;
  format: FormatProd;
  technique: Technique;
  producteurs: string[];
  studiosFabrication: string[];
  paysCoproducteurs: string[];
  paysDecors: string | null;
  diffuseur: string | null;
  realisateur: string | null;
  statut: StatutProd;
  dateDemarrage: string | null;
  villeFabrication: string | null;
  contactRecrutement: string | null;
  extrait: string;
  image: string | null; // URL https absolue (og:image de l'article, enclosure RSS…)
  logo?: string | null;
  premiereVue: string;
  misEnAvant: boolean; // fabrication à Paris ou studio connu pour le télétravail
  bonMomentDecor: boolean; // dev avancé, financement bouclé, préprod, début de prod
  sources: SourceRef[];
}

export type TypeSource = "emploi" | "carriere-studio" | "actualite" | "base-projets";
export type Methode = "rss" | "html" | "playwright" | "manuel";

export interface SourceStatut {
  id: string;
  nom: string;
  url: string;
  type: TypeSource;
  methode: Methode;
  actif: boolean;
  dernierSucces: string | null;
  derniereErreur: string | null;
  nbResultats: number; // lors de la dernière collecte
}

// Fichiers produits par la collecte, dans web/public/data/
export interface FichierOffres { genereLe: string; offres: Offre[] }
export interface FichierProductions { genereLe: string; productions: Production[] }
export interface FichierSources { genereLe: string; sources: SourceStatut[] }
