import type { Perimetre } from "./types";

export type GroupeZone = "Île-de-France" | "Autres pôles d’animation en France" | "France entière" | "International (sur place)";
export const GROUPES_ZONES: GroupeZone[] = ["Île-de-France", "Autres pôles d’animation en France", "France entière", "International (sur place)"];

export interface Zone {
  id: string;
  label: string;
  groupe: GroupeZone;
  /** Villes, codes de département, région, pays. Comparés sans accents ni casse, par mots entiers. */
  motsCles: string[];
  /** « Tout pays » : accepte n’importe quel lieu renseigné. */
  tout?: boolean;
}

const PETITE_COURONNE = [
  "92", "93", "94", "hauts de seine", "seine saint denis", "val de marne",
  "montreuil", "saint denis", "issy les moulineaux", "boulogne billancourt", "clichy", "levallois", "levallois perret", "arcueil", "vincennes",
  "pantin", "ivry", "ivry sur seine", "montrouge", "bagnolet", "saint ouen", "aubervilliers", "vanves", "malakoff", "gentilly", "kremlin bicetre",
  "villejuif", "vitry sur seine", "charenton", "charenton le pont", "saint mande", "fontenay sous bois", "nogent sur marne", "creteil", "maisons alfort",
  "romainville", "les lilas", "le pre saint gervais", "bobigny", "noisy le sec", "bondy", "saint cloud", "suresnes", "nanterre", "courbevoie",
  "puteaux", "neuilly sur seine", "asnieres", "colombes", "gennevilliers", "villeneuve la garenne", "meudon", "sevres", "chatillon", "fontenay aux roses",
  "bagneux", "clamart", "malakoff", "la plaine saint denis", "epinay sur seine", "stains", "la courneuve", "drancy", "le bourget", "rosny sous bois",
];
const RESTE_IDF = [
  "77", "78", "91", "95", "ile de france", "idf", "seine et marne", "yvelines", "essonne", "val d oise",
  "versailles", "cergy", "pontoise", "evry", "massy", "palaiseau", "saclay", "melun", "fontainebleau", "marne la vallee", "noisiel", "chessy", "torcy",
  "saint germain en laye", "poissy", "velizy", "rambouillet", "saint quentin en yvelines", "argenteuil", "sarcelles", "roissy", "orly", "champs sur marne",
];

export const ZONES: Zone[] = [
  { id: "paris", label: "Paris", groupe: "Île-de-France", motsCles: ["paris", "75"] },
  { id: "petite-couronne", label: "Petite couronne (92, 93, 94)", groupe: "Île-de-France", motsCles: PETITE_COURONNE },
  { id: "reste-idf", label: "Reste de l’Île-de-France (77, 78, 91, 95)", groupe: "Île-de-France", motsCles: RESTE_IDF },

  { id: "angouleme", label: "Angoulême", groupe: "Autres pôles d’animation en France", motsCles: ["angouleme", "charente", "16"] },
  { id: "lyon", label: "Lyon / Villeurbanne", groupe: "Autres pôles d’animation en France", motsCles: ["lyon", "villeurbanne", "rhone", "69"] },
  { id: "annecy", label: "Annecy", groupe: "Autres pôles d’animation en France", motsCles: ["annecy", "haute savoie", "74"] },
  { id: "valence", label: "Valence / Drôme", groupe: "Autres pôles d’animation en France", motsCles: ["valence", "bourg les valence", "romans sur isere", "drome", "26"] },
  { id: "montpellier", label: "Montpellier", groupe: "Autres pôles d’animation en France", motsCles: ["montpellier", "herault", "34"] },
  { id: "toulouse", label: "Toulouse", groupe: "Autres pôles d’animation en France", motsCles: ["toulouse", "haute garonne", "31"] },
  { id: "bordeaux", label: "Bordeaux", groupe: "Autres pôles d’animation en France", motsCles: ["bordeaux", "gironde", "33"] },
  { id: "nantes", label: "Nantes", groupe: "Autres pôles d’animation en France", motsCles: ["nantes", "loire atlantique", "44"] },
  { id: "rennes", label: "Rennes", groupe: "Autres pôles d’animation en France", motsCles: ["rennes", "ille et vilaine", "35", "bretagne"] },
  { id: "lille", label: "Lille / Roubaix / Tourcoing", groupe: "Autres pôles d’animation en France", motsCles: ["lille", "roubaix", "tourcoing", "villeneuve d ascq", "59"] },
  { id: "marseille", label: "Marseille / Aix", groupe: "Autres pôles d’animation en France", motsCles: ["marseille", "aix en provence", "aix", "bouches du rhone", "13"] },
  { id: "strasbourg", label: "Strasbourg", groupe: "Autres pôles d’animation en France", motsCles: ["strasbourg", "bas rhin", "67", "alsace"] },

  { id: "france", label: "Toute la France", groupe: "France entière", motsCles: ["france", "fr"] },

  { id: "belgique", label: "Belgique", groupe: "International (sur place)", motsCles: ["belgique", "belgium", "be", "bruxelles", "brussels", "liege", "namur", "charleroi", "mons", "gand", "anvers", "wallonie"] },
  { id: "irlande", label: "Irlande", groupe: "International (sur place)", motsCles: ["irlande", "ireland", "ie", "dublin", "kilkenny", "cork", "galway"] },
  { id: "royaume-uni", label: "Royaume-Uni", groupe: "International (sur place)", motsCles: ["royaume uni", "united kingdom", "uk", "gb", "angleterre", "england", "ecosse", "scotland", "londres", "london", "bristol", "manchester", "glasgow", "edimbourg", "edinburgh"] },
  { id: "canada", label: "Canada (Montréal)", groupe: "International (sur place)", motsCles: ["canada", "montreal", "quebec", "toronto", "vancouver"] },
  { id: "espagne", label: "Espagne", groupe: "International (sur place)", motsCles: ["espagne", "spain", "madrid", "barcelone", "barcelona"] },
  { id: "luxembourg", label: "Luxembourg", groupe: "International (sur place)", motsCles: ["luxembourg", "lu", "contern", "esch sur alzette"] },
  { id: "tout-pays", label: "Tout pays", groupe: "International (sur place)", motsCles: [], tout: true },
];

export const ZONES_PAR_DEFAUT = ["paris", "petite-couronne"];
const ZONES_IDF = ["paris", "petite-couronne", "reste-idf"];

/** Zones françaises (hors « Toute la France ») : leurs mots-clés comptent aussi pour « Toute la France ». */
const ZONES_FRANCE = ZONES.filter((z) => z.groupe === "Île-de-France" || z.groupe === "Autres pôles d’animation en France");

export const zoneParId = (id: string) => ZONES.find((z) => z.id === id);

/** Minuscules, sans accents, ponctuation → espaces : « Saint-Ouen (93) » → « saint ouen 93 ». */
export function normaliser(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Zones choisies, y compris pour les anciens réglages (champ `zone` seul). */
export function zonesActives(p: Pick<Perimetre, "zones" | "zone">): string[] {
  const brut = Array.isArray(p.zones)
    ? p.zones
    : p.zone === "paris" ? ["paris"] : p.zone === "idf" ? ZONES_IDF : p.zone === "petite-couronne" ? ["paris", "petite-couronne"] : ZONES_PAR_DEFAUT;
  return brut.filter((id) => zoneParId(id));
}

function contient(texte: string, mot: string): boolean {
  return ` ${texte} `.includes(` ${mot} `);
}

/** Un code de département (2 chiffres) correspond aussi à un code postal (92100). */
function correspond(texte: string, mots: string[]): boolean {
  const jetons = texte.split(" ");
  return mots.some((m) => (/^\d{2}$/.test(m) ? jetons.some((j) => j === m || (/^\d{5}$/.test(j) && j.startsWith(m))) : contient(texte, m)));
}

/** Les lieux d’une offre (lieu + pays) ou d’une production (ville de fabrication) correspondent-ils à une des zones ? */
export function lieuDansZones(lieux: (string | null | undefined)[], ids: string[]): boolean {
  const texte = normaliser(lieux.filter(Boolean).join(" "));
  if (!texte) return false;
  return ids.some((id) => {
    const z = zoneParId(id);
    if (!z) return false;
    if (z.tout) return true;
    if (z.id === "france") return correspond(texte, z.motsCles) || ZONES_FRANCE.some((f) => correspond(texte, f.motsCles.filter((m) => !/^\d{2}$/.test(m))));
    return correspond(texte, z.motsCles);
  });
}
