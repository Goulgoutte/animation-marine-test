import { readFileSync } from "node:fs";
import type {
  Categorie, Contrat, FormatProd, Langue, ModeTravail, Niveau, StatutProd, Technique,
} from "./types.ts";

export interface Mots {
  decor: string[]; technique2D: string[]; technique3D: string[]; stopMotion: string[];
  teletravail: string[]; hybride: string[]; paris: string[]; signauxProduction: string[];
  statuts: Record<string, string[]>; formats: Record<string, string[]>;
  indicesAnimation: string[]; titresMetiers: string[];
  residence: { paysAcces: string[]; pays: Record<string, string[]> };
  langues: { fr: string[]; en: string[]; autre: string[] };
}

export const motsParDefaut: Mots = JSON.parse(
  readFileSync(new URL("../config/keywords.json", import.meta.url), "utf8"),
);

/** minuscules, sans accents, espaces normalisés */
export function normaliser(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cacheRegex = new Map<string, RegExp>();

/** Mot ou expression présent dans un texte déjà normalisé. Un mot-clé purement numérique = code postal (75 → 75001). */
export function contient(texteNorm: string, mot: string): boolean {
  const m = normaliser(mot);
  let re = cacheRegex.get(m);
  if (!re) {
    re = /^\d+$/.test(m)
      ? new RegExp(`(?<![a-z0-9])${m}\\d{3}(?![a-z0-9])|\\(${m}\\)`)
      : new RegExp(`(?<![a-z0-9])${echapper(m).replace(/\s/g, "\\s")}(?![a-z0-9])`);
    cacheRegex.set(m, re);
  }
  return re.test(texteNorm);
}
const un = (t: string, mots: string[]) => mots.some((m) => contient(t, m));

export interface EntreeOffre {
  titre: string;
  studio?: string | null;
  lieu?: string | null;
  extrait?: string;
  techniqueDefaut?: Technique; // connu au niveau de la source (studio 2D, studio 3D)
}

export interface ResultatOffre {
  categorie: Categorie;
  technique: Technique;
  modeTravail: ModeTravail;
  residenceExigee: string | null;
  contrat: Contrat;
  niveau: Niveau;
  langue: Langue;
  pays: string | null;
  dansPerimetre: boolean;
  aVerifier: boolean;
}

function paysDepuis(fragment: string, mots: Mots): string | null {
  const f = normaliser(fragment).replace(/^(the|le|la|les|l')\s*/, "");
  for (const [pays, alias] of Object.entries(mots.residence.pays)) {
    if (alias.some((a) => normaliser(a) === f)) return pays;
  }
  return null;
}

/** « UK residents only », « must be based in Ireland », « résidents en France uniquement »... */
export function detecterResidence(texte: string, mots: Mots = motsParDefaut): string | null {
  const t = normaliser(texte);
  const motsPays = Object.values(mots.residence.pays).flat().map((a) => echapper(normaliser(a))).sort((a, b) => b.length - a.length).join("|");
  const modeles: RegExp[] = [
    new RegExp(`(?<![a-z])(${motsPays})(?:-based)?\\s+(?:residents?|resident|citizens?|based)\\s*(?:only|required)?`),
    new RegExp(`(?:must|should|need to)\\s+(?:be\\s+)?(?:based|located|living|resident|reside|residing|live)\\s+(?:in|within|of)\\s+(?:the\\s+)?(${motsPays})`),
    new RegExp(`(?:resident|residents|residing|based|located)\\s+(?:in|of)\\s+(?:the\\s+)?(${motsPays})\\s+(?:only|required)`),
    new RegExp(`(?:right|eligib\\w+|authori[sz]ed|permit)\\s+to\\s+work\\s+(?:in|within)\\s+(?:the\\s+)?(${motsPays})`),
    new RegExp(`residents?\\s+(?:en|au|aux|de|d'|du)\\s*(?:la\\s+)?(${motsPays})\\s+(?:uniquement|exclusivement|seulement)`),
    new RegExp(`(?:resider|residant|resident|domicilie|base)\\w*\\s+(?:en|au|aux|a)\\s+(${motsPays})(?:\\s+(?:uniquement|exclusivement|obligatoire))?`),
    new RegExp(`(?:remote|teletravail|a distance)\\s*(?:,|-|\\()?\\s*(?:but\\s+)?(?:only\\s+)?(?:for|open to|limited to|restricted to)\\s+(?:candidates\\s+)?(?:in|from|based in)?\\s*(?:the\\s+)?(${motsPays})`),
  ];
  for (const re of modeles) {
    const m = re.exec(t);
    if (m) {
      const p = paysDepuis(m[1], mots);
      if (p) return p;
    }
  }
  return null;
}

export function detecterContrat(t: string): Contrat {
  if (/(?<![a-z])cddu(?![a-z])/.test(t)) return "CDDU";
  if (/(?<![a-z])cdi(?![a-z])|permanent (?:position|role|contract)/.test(t)) return "CDI";
  if (/(?<![a-z])cdd(?![a-z])|fixed[- ]term|duree determinee/.test(t)) return "CDD";
  if (/free-?lance|independant|contractor|pigiste|auto-?entrepreneur/.test(t)) return "freelance";
  if (/(?<![a-z])stage(?![a-z])|stagiaire|(?<![a-z])interns?(?![a-z])|internship|alternan/.test(t)) return "stage";
  return "inconnu";
}

export function detecterNiveau(t: string): Niveau {
  if (/(?<![a-z])(lead|head of|supervis\w*|directeur|directrice|art director|chef)(?![a-z])/.test(t)) return "lead";
  if (/(?<![a-z])(senior|confirme\w*|experimente\w*|experienced)(?![a-z])/.test(t)) return "senior";
  if (/(?<![a-z])(junior|debutant\w*|entry[- ]level|graduate)(?![a-z])/.test(t)) return "junior";
  return "inconnu";
}

export function detecterLangue(texte: string, mots: Mots = motsParDefaut): Langue {
  const jetons = normaliser(texte).split(/[^a-z0-9']+/).filter(Boolean);
  if (jetons.length < 4) return "inconnue";
  const compte = (liste: string[]) => {
    const s = new Set(liste.map(normaliser));
    return jetons.filter((j) => s.has(j)).length;
  };
  const fr = compte(mots.langues.fr), en = compte(mots.langues.en), autre = compte(mots.langues.autre);
  const max = Math.max(fr, en, autre);
  if (max < 2) return "inconnue";
  if (autre === max && autre > fr && autre > en) return "autre";
  if (fr > en) return "fr";
  if (en > fr) return "en";
  return "inconnue";
}

export function detecterTechnique(t: string, mots: Mots, defaut?: Technique): Technique {
  const d2 = un(t, mots.technique2D), d3 = un(t, mots.technique3D), sm = un(t, mots.stopMotion);
  if (d2 && d3) return "hybride";
  if (d2) return "2D";
  if (sm) return "stop-motion";
  if (d3) return "3D";
  return defaut && defaut !== "inconnue" ? defaut : "inconnue";
}

export function classerOffre(e: EntreeOffre, mots: Mots = motsParDefaut): ResultatOffre {
  const titreN = normaliser(e.titre);
  const extraitN = normaliser(e.extrait ?? "");
  const t = `${titreN} ${normaliser(e.studio ?? "")} ${normaliser(e.lieu ?? "")} ${extraitN}`;

  // Catégorie : mot décor dans le titre, ou expression composée dans l'extrait
  const decor =
    un(titreN, mots.decor) || mots.decor.filter((m) => m.includes(" ")).some((m) => contient(extraitN, m));
  const categorie: Categorie = decor ? "decor" : "autre";

  // Technique : le titre et l'extrait comptent ; défaut = celui du studio
  const technique = detecterTechnique(t, mots, e.techniqueDefaut);

  // Mode de travail
  const parisTxt = un(t, mots.paris);
  const parisLieu = un(normaliser(e.lieu ?? ""), mots.paris);
  const remote = un(t, mots.teletravail);
  const hybride = un(t, mots.hybride);
  let modeTravail: ModeTravail;
  if (hybride && (parisTxt || parisLieu)) modeTravail = "hybride";
  else if (hybride) modeTravail = "hybride";
  else if (remote) modeTravail = "teletravail-complet";
  else if (parisLieu || parisTxt) modeTravail = "paris-sur-place";
  else if (e.lieu && normaliser(e.lieu) !== "inconnu") modeTravail = "sur-place-ailleurs";
  else modeTravail = "inconnu";

  const residenceExigee = detecterResidence(`${e.titre} ${e.lieu ?? ""} ${e.extrait ?? ""}`, mots);
  const langue = detecterLangue(`${e.titre}. ${e.extrait ?? ""}`, mots);
  const residenceAccessible = !residenceExigee || mots.residence.paysAcces.map(normaliser).includes(normaliser(residenceExigee));

  let pays: string | null = residenceExigee;
  if (!pays && (parisLieu || parisTxt)) pays = "France";

  const techniqueOk = technique !== "3D";
  let modeOk: boolean;
  if (modeTravail === "paris-sur-place") modeOk = true;
  else if (modeTravail === "hybride") modeOk = parisLieu || parisTxt;
  else if (modeTravail === "teletravail-complet") modeOk = residenceAccessible && langue !== "autre";
  else if (modeTravail === "inconnu") modeOk = true; // affiché « À vérifier » plutôt que masqué
  else modeOk = false;

  return {
    categorie,
    technique,
    modeTravail,
    residenceExigee,
    contrat: detecterContrat(t),
    niveau: detecterNiveau(titreN),
    langue,
    pays,
    dansPerimetre: techniqueOk && modeOk,
    aVerifier: technique === "inconnue" || modeTravail === "inconnu",
  };
}

// ---------- Productions (articles d'actualité) ----------

export interface ResultatProduction {
  estProduction: boolean;
  statut: StatutProd;
  format: FormatProd;
  technique: Technique;
  bonMomentDecor: boolean;
  misEnAvant: boolean;
  realisateur: string | null;
  titre: string;
}

const ORDRE_STATUTS: StatutProd[] = ["postproduction", "preproduction", "production", "financement", "developpement"];

function titreProduction(titre: string): string {
  const m = /[«“"]\s*([^»”"]{2,80}?)\s*[»”"]/.exec(titre);
  return (m ? m[1] : titre).trim();
}

export function classerProduction(
  e: { titre: string; extrait?: string; techniqueDefaut?: Technique },
  mots: Mots = motsParDefaut,
): ResultatProduction {
  const t = normaliser(`${e.titre}. ${e.extrait ?? ""}`);
  const signaux = un(t, mots.signauxProduction);
  const animation = un(t, mots.indicesAnimation);

  let statut: StatutProd = "inconnu";
  for (const s of ORDRE_STATUTS) {
    if (un(t, mots.statuts[s] ?? [])) { statut = s; break; }
  }
  let format: FormatProd = "inconnu";
  for (const f of ["special-tv", "court", "long-metrage", "serie"] as const) {
    if (un(t, mots.formats[f] ?? [])) { format = f; break; }
  }
  const technique = detecterTechnique(t, mots, e.techniqueDefaut);
  const real = /(?:directed by|realise par|un film de|a film by)\s+([A-ZÀ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-Ý][\p{L}'’-]+){0,2})/u.exec(`${e.titre}. ${e.extrait ?? ""}`);
  return {
    estProduction: animation && signaux,
    statut,
    format,
    technique,
    bonMomentDecor:
      statut === "financement" || statut === "preproduction" || statut === "production" ||
      /developpement avance|advanced development/.test(t),
    misEnAvant: un(t, mots.paris),
    realisateur: real ? real[1] : null,
    titre: titreProduction(e.titre),
  };
}
