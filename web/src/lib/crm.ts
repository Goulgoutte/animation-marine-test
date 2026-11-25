import { dernierEchange } from "./contacts";
import { fmt } from "./dates";
import type { Contact, CrmColonne, CrmGroupe, Echange, Libelle, TypeColonne } from "./types";

export const PALETTE = ["#00b875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ffcb00", "#ff158a", "#66ccff", "#9cd326", "#7f5347", "#037f4c", "#8d93a5"];

const TEINTES_ETIQUETTES = ["#579bfc", "#a25ddc", "#00b875", "#fdab3d", "#66ccff", "#9cd326"];

export const TYPES_COLONNE: { id: TypeColonne; label: string }[] = [
  { id: "texte", label: "Texte" },
  { id: "texte_long", label: "Texte long (notes)" },
  { id: "statut", label: "Statut" },
  { id: "etiquettes", label: "Étiquettes" },
  { id: "date", label: "Date" },
  { id: "nombre", label: "Nombre" },
  { id: "lien", label: "Lien" },
  { id: "email", label: "E-mail" },
  { id: "telephone", label: "Téléphone" },
  { id: "case", label: "Case à cocher" },
  { id: "note", label: "Note sur 5" },
];

/** Texte lisible sur un fond de couleur de libellé. */
export function encre(couleur: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(couleur);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.68 ? "#1d1f2b" : "#fff";
}

const lib = (id: string, label: string, couleur: string): Libelle => ({ id, label, couleur });
export const LIBELLES_RELATION: Libelle[] = [
  lib("a_contacter", "À contacter", "#8d93a5"),
  lib("contacte", "Contacté·e", "#579bfc"),
  lib("en_discussion", "En discussion", "#a25ddc"),
  lib("relance", "Relance prévue", "#fdab3d"),
  lib("bon_contact", "Bon contact", "#00b875"),
  lib("pas_de_suite", "Pas de suite", "#e2445c"),
];
export const LIBELLES_NOUVEAU_STATUT: Libelle[] = [
  lib("a_faire", "À faire", "#8d93a5"),
  lib("en_cours", "En cours", "#fdab3d"),
  lib("termine", "Terminé", "#00b875"),
];

type Defaut = Omit<CrmColonne, "id" | "created_at" | "ordre">;
const col = (cle: string, titre: string, type: TypeColonne, largeur: number, systeme: boolean, libelles?: Libelle[]): Defaut => ({
  cle, titre, type, largeur, systeme, masquee: false, options: libelles ? { libelles } : {},
});

/** Colonnes créées au premier chargement. `id` fabrique l’identifiant à partir de la clé (identifiants fixes en démo). */
export function colonnesParDefaut(id: (cle: string) => string): CrmColonne[] {
  const l: Defaut[] = [
    col("structure", "Structure / studio", "texte", 190, true),
    col("fonction", "Fonction", "texte", 170, true),
    col("relation", "Statut de la relation", "statut", 200, false, LIBELLES_RELATION),
    col("dernier_echange", "Dernier échange", "dernier_echange", 185, true),
    col("prochaine_action", "Prochaine action", "date", 160, false),
    col("ville", "Ville", "texte", 130, true),
    col("email", "E-mail", "email", 200, true),
    col("telephone", "Téléphone", "telephone", 140, true),
    col("linkedin", "LinkedIn", "lien", 170, true),
    col("etiquettes", "Étiquettes", "etiquettes", 200, true),
    col("notes", "Notes", "texte_long", 240, false),
  ];
  return l.map((c, i) => ({ ...c, id: id(c.cle), ordre: i }));
}

export const GROUPES_PAR_DEFAUT: { titre: string; couleur: string }[] = [
  { titre: "Studios & productions", couleur: "#5b5bd6" },
  { titre: "Réseau & rencontres", couleur: "#00b875" },
  { titre: "Recruteurs & RH", couleur: "#fdab3d" },
];
export const groupesParDefaut = (id: (i: number) => string): CrmGroupe[] =>
  GROUPES_PAR_DEFAUT.map((g, i) => ({ ...g, id: id(i), ordre: i, replie: false }));

const CHAMPS_SYSTEME = ["structure", "fonction", "ville", "email", "telephone", "linkedin", "etiquettes"];
export const estChampContact = (c: CrmColonne) => c.systeme && CHAMPS_SYSTEME.includes(c.cle);

export function valeur(c: Contact, col: CrmColonne): unknown {
  if (estChampContact(col)) return (c as unknown as Record<string, unknown>)[col.cle] ?? (col.type === "etiquettes" ? [] : null);
  return c.champs?.[col.id] ?? (col.type === "etiquettes" ? [] : null);
}

/** Patch de contact à appliquer pour écrire la valeur d’une colonne. */
export function ecrire(c: Contact, col: CrmColonne, v: unknown): Partial<Contact> {
  if (estChampContact(col)) return { [col.cle]: v } as Partial<Contact>;
  return { champs: { ...(c.champs ?? {}), [col.id]: v } };
}

export const libellesDe = (col: CrmColonne): Libelle[] => col.options.libelles ?? [];

/** Couleur d’une étiquette : celle du libellé s’il existe, sinon une teinte stable dérivée du texte. */
export function couleurEtiquette(col: CrmColonne, texte: string): string {
  const l = libellesDe(col).find((x) => x.label === texte);
  if (l) return l.couleur;
  let h = 0;
  for (const ch of texte) h = (h * 31 + ch.charCodeAt(0)) % TEINTES_ETIQUETTES.length;
  return TEINTES_ETIQUETTES[h];
}

export const nomComplet = (c: Contact) => `${c.prenom} ${c.nom}`.trim();
export function decouperNom(s: string): { prenom: string; nom: string } {
  const m = s.trim().split(/\s+/).filter(Boolean);
  if (m.length <= 1) return { prenom: "", nom: m[0] ?? "" };
  return { prenom: m[0], nom: m.slice(1).join(" ") };
}

/** Valeur lisible (export CSV, recherche, tri). */
export function texteDe(c: Contact, col: CrmColonne, echanges: Echange[]): string {
  if (col.type === "dernier_echange") return dernierEchange(c.id, echanges) ?? "";
  const v = valeur(c, col);
  if (v === null || v === undefined || v === "") return "";
  switch (col.type) {
    case "statut": return libellesDe(col).find((l) => l.id === v)?.label ?? "";
    case "etiquettes": return Array.isArray(v) ? v.join(" | ") : "";
    case "case": return v ? "Oui" : "Non";
    case "date": return typeof v === "string" ? fmt(v) : "";
    default: return String(v);
  }
}

export const triees = <T extends { ordre: number }>(l: T[]) => [...l].sort((a, b) => a.ordre - b.ordre);

/** Prochain rang (ordre) pour une liste. */
export const rangSuivant = (l: { ordre?: number | null }[]) => l.reduce((m, x) => Math.max(m, x.ordre ?? -1), -1) + 1;
