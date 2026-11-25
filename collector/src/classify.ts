import { readFileSync } from "node:fs";
import type {
  Categorie, Contrat, FormatProd, Langue, ModeTravail, Niveau, StatutProd, Technique,
} from "./types.ts";

export interface Mots {
  decor: string[]; technique2D: string[]; technique3D: string[]; stopMotion: string[];
  teletravail: string[]; hybride: string[]; paris: string[]; signauxProduction: string[];
  statuts: Record<string, string[]>; formats: Record<string, string[]>;
  indicesAnimation: string[]; titresMetiers: string[];
  exclusionsProduction: string[]; studiosConnus: string[]; studiosParis: string[]; diffuseurs: string[];
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

// ---------- Productions (articles d'actualité, pages de commissions) ----------

export interface ResultatProduction {
  estProduction: boolean;
  statut: StatutProd;
  format: FormatProd;
  technique: Technique;
  bonMomentDecor: boolean;
  misEnAvant: boolean;
  realisateur: string | null;
  titre: string;
  /** studios et producteurs reconnus dans le texte */
  studios: string[];
  diffuseur: string | null;
  /** le titre de la production est entre guillemets dans le texte */
  titreCite: boolean;
  /** l'article nomme une œuvre entre guillemets ou un studio : assez précis pour être gardé tel quel */
  precis: boolean;
  /** appel à projets, palmarès, festival, nomination, bilan... */
  exclu: boolean;
}

const ORDRE_STATUTS: StatutProd[] = ["postproduction", "preproduction", "production", "financement", "developpement"];

const GUILLEMETS = /[«“"]\s*([^»”"]{2,80}?)\s*[»”"]/;
const NOM_PROPRE = "[A-ZÀ-Ý0-9][\\p{L}0-9'’&.!?-]*";

/** Titre de l'œuvre : entre guillemets, ou après « la série / le film ». Sinon le titre de l'article, sans le nom du média. */
export function titreProduction(titre: string, extrait = ""): { titre: string; cite: boolean } {
  const m = GUILLEMETS.exec(titre) ?? GUILLEMETS.exec(extrait);
  if (m) return { titre: m[1].trim(), cite: true };
  const apres = new RegExp(
    `(?:s[ée]rie|film|long[- ]m[ée]trage|court[- ]m[ée]trage|special|series|feature|movie)\\s+(?:d['’]animation\\s+|animated\\s+|intitul[ée]e?\\s+|titled\\s+|called\\s+)?(${NOM_PROPRE}(?:\\s+${NOM_PROPRE}){0,4})`, "u",
  ).exec(titre);
  if (apres && !/^(Le|La|Les|Un|Une|The|A|An|De|Du|Des|En|Et|Pour|Sur|Dans)$/.test(apres[1])) return { titre: apres[1].trim(), cite: true };
  // « Fireborn : le comics adapté en série... » : le titre de l'œuvre précède les deux-points
  const avant = /^([^:–—|«»"]{2,45}?)\s+:\s+\S/.exec(titre);
  if (avant) return { titre: avant[1].trim(), cite: false };
  return { titre: titre.replace(/\s+[-–|]\s+[^-–|]{2,40}$/, "").trim(), cite: false };
}

/** Studios et producteurs : liste connue, puis « produit par X ». Les diffuseurs ne sont pas des studios. */
export function detecterStudios(texte: string, mots: Mots = motsParDefaut): string[] {
  const tn = normaliser(texte);
  const diff = new Set(mots.diffuseurs.map(normaliser));
  const trouves = mots.studiosConnus.filter((s) => !diff.has(normaliser(s)) && contient(tn, s));
  const motif = new RegExp(
    `(?:[Pp]rodui(?:t|te|ts|tes)|[Cc]oprodui(?:t|te|ts|tes)|[Ff]abriqu[ée]e?|[Rr][ée]alis[ée]e?|[Aa]nim[ée]e?)\\s+(?:par|chez)\\s+(?:le studio\\s+|la soci[ée]t[ée]\\s+|les studios\\s+)?(${NOM_PROPRE}(?:\\s+(?:${NOM_PROPRE}|de|du|des|la|le|et|&)){0,3})|(?:[Pp]roduced|[Cc]o-produced|[Aa]nimated|[Dd]eveloped)\\s+by\\s+(?:studio\\s+)?(${NOM_PROPRE}(?:\\s+(?:${NOM_PROPRE}|of|and|&)){0,3})`, "gu",
  );
  for (const m of texte.matchAll(motif)) {
    const nom = (m[1] ?? m[2]).replace(/\s+(?:et|and|&|de|du|des|la|le|of)$/i, "").trim();
    if (nom.length >= 3 && !diff.has(normaliser(nom))) trouves.push(nom);
  }
  // sociétés dont le nom se termine par un mot de métier : « La Mola Studio », « Lunaris Pictures »
  const suffixe = new RegExp(`(${NOM_PROPRE}(?:\\s+${NOM_PROPRE}){0,2}\\s+(?:Studios?|Films|Pictures|Productions?|Animation|Entertainment|Prod))(?![\\p{L}])`, "gu");
  for (const m of texte.matchAll(suffixe)) {
    const nom = m[1].trim();
    if (nom.length >= 8 && !diff.has(normaliser(nom))) trouves.push(nom);
  }
  // « Ellipse » et « Ellipse Animation » : garder la forme la plus longue
  const uniques = [...new Set(trouves)];
  return uniques.filter((a) => !uniques.some((b) => b !== a && normaliser(b).includes(normaliser(a))));
}

export function classerProduction(
  e: { titre: string; extrait?: string; techniqueDefaut?: Technique },
  mots: Mots = motsParDefaut,
): ResultatProduction {
  const brut = `${e.titre}. ${e.extrait ?? ""}`;
  const t = normaliser(brut);
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
  const real = /(?:directed by|realise par|un film de|a film by)\s+([A-ZÀ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-Ý][\p{L}'’-]+){0,2})/u.exec(brut);
  const studios = detecterStudios(brut, mots);
  const { titre, cite } = titreProduction(e.titre, e.extrait ?? "");
  // le titre de l'article suffit à exclure : un palmarès cite ses lauréats dans le corps du texte
  const exclu = un(normaliser(e.titre), mots.exclusionsProduction) || un(normaliser((e.extrait ?? "").slice(0, 160)), mots.exclusionsProduction);
  const nomme = cite && studios.length > 0;
  const paris = new Set(mots.studiosParis.map(normaliser));
  const diffuseur = mots.diffuseurs.find((d) => contient(t, d)) ?? null;
  return {
    estProduction: animation && signaux && (!exclu || nomme),
    precis: cite || studios.length > 0,
    statut,
    format,
    technique,
    bonMomentDecor:
      statut === "financement" || statut === "preproduction" || statut === "production" ||
      /developpement avance|advanced development/.test(t),
    misEnAvant: un(t, mots.paris) || studios.some((s) => paris.has(normaliser(s))),
    realisateur: real ? real[1] : null,
    titre,
    studios,
    diffuseur,
    titreCite: cite,
    exclu,
  };
}
