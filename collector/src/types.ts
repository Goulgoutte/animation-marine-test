export type * from "../../shared/types.ts";
import type { Frequence, FormatProd, Methode, Technique, TypeSource } from "../../shared/types.ts";

export interface Selecteurs {
  item: string;
  titre?: string;
  lien?: string;
  extrait?: string;
  lieu?: string;
  studio?: string;
  date?: string;
  /** les cartes n'ont pas de lien propre : ancre sur la page source (une par titre) */
  sansLien?: boolean;
}

export interface SourceConfig {
  id: string;
  nom: string;
  url: string;
  type: TypeSource;
  methode: Methode;
  actif: boolean;
  selecteurs?: Selecteurs;
  /** regex (insensible à la casse) appliquée au titre ; défaut : métiers de l'animation pour emploi/carrière */
  filtre?: string;
  studio?: string;
  technique?: Technique;
  lieuDefaut?: string;
  note?: string;
  /** fréquence de collecte ; défaut : quotidien */
  frequence?: Frequence;
  ajouteeParUtilisatrice?: boolean;
}

/** Élément brut renvoyé par un fetcher, avant classification. */
export interface ItemBrut {
  titre: string;
  url: string;
  extrait: string;
  date: string | null;
  lieu: string | null;
  studio?: string | null;
  /** URL https absolue d'une image trouvée dans la source elle-même */
  image?: string | null;
  /** renseignés par les sources qui structurent leurs productions (pages du CNC) */
  format?: FormatProd;
  producteurs?: string[];
}
