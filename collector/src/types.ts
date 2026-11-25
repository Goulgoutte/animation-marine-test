export type * from "../../shared/types.ts";
import type { Methode, Technique, TypeSource } from "../../shared/types.ts";

export interface Selecteurs {
  item: string;
  titre?: string;
  lien?: string;
  extrait?: string;
  lieu?: string;
  studio?: string;
  date?: string;
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
}

/** Élément brut renvoyé par un fetcher, avant classification. */
export interface ItemBrut {
  titre: string;
  url: string;
  extrait: string;
  date: string | null;
  lieu: string | null;
  studio?: string | null;
}
