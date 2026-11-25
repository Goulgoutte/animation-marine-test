// Catalogue des métiers suivis et classement d'une offre ou d'une production à partir de son texte.
// Fonctions pures : le site classe à l'affichage, donc changer de métiers s'applique tout de suite, sans nouvelle collecte.
// Pas d'import JSON ici (le dossier shared/ est lu par Next et par Node en deux modes de modules) : la liste Décor est donc
// recopiée, et collector/test/metiers.test.ts vérifie qu'elle reste identique à collector/config/keywords.json.

export interface Metier {
  id: string;
  label: string;
  /** Mots-clés français et anglais. Un mot seul compte dans le titre ; une expression de plusieurs mots compte aussi dans l'extrait. */
  mots: string[];
  /** Un de ces mots dans le titre écarte le métier (ex. « animateur 3D » n'est pas de l'animation 2D). */
  exclure?: string[];
}

const MOTS_DECOR = ["décor", "décors", "décorateur", "décoratrice", "décor couleur", "layout décor", "layout bg", "bg", "background", "backgrounds", "background artist", "background painter", "colour artist", "color artist", "color key", "color script", "colour script", "environment artist", "environment design", "matte painting", "set design", "props et décors", "bg color", "bg layout", "peintre décor", "production designer", "production design", "chef décorateur", "chef décorateur·rice"];

export const METIERS: Metier[] = [
  // Décor : exactement la liste de la collecte (collector/config/keywords.json), pour que les deux classements restent d'accord.
  { id: "decor", label: "Décor", mots: MOTS_DECOR },
  {
    id: "concept", label: "Concept art",
    mots: [
      "concept", "concept art", "concept artist", "concept designer", "concept artiste", "artiste concept",
      "visual development", "visual developer", "visdev", "vis dev", "vis-dev", "développement visuel",
      "design de décors", "design de décor", "design décor", "design décors", "environment design", "environment designer",
      "environment concept", "prop design", "props design", "design d'environnement",
    ],
  },
  { id: "layout", label: "Layout", mots: ["layout", "layout artist", "layout 2d", "layout bg", "layout décor", "chef layout", "mise en scène 2d", "posing"] },
  {
    id: "couleur", label: "Couleur / color key",
    mots: [
      "couleur", "couleurs", "color", "colour", "color key", "colour key", "color script", "colour script", "color designer", "colour designer",
      "color artist", "colour artist", "coloriste", "chef coloriste", "color stylist", "color model", "colour model",
    ],
  },
  {
    id: "storyboard", label: "Storyboard",
    mots: ["storyboard", "storyboards", "storyboarder", "storyboardeur", "storyboardeuse", "story board", "story-board", "story artist", "storyboard artist", "animatic", "animatique"],
  },
  {
    id: "character", label: "Character design",
    mots: ["character design", "character designer", "charadesign", "chara design", "chara designer", "design de personnages", "design de personnage", "design personnage", "design personnages", "character art", "character artist 2d"],
  },
  {
    id: "anim2d", label: "Animation 2D",
    mots: [
      "animateur", "animatrice", "animator", "animators", "animation 2d", "2d animation", "2d animator", "animateur 2d", "animatrice 2d",
      "animation traditionnelle", "traditional animation", "hand-drawn animation", "character animator", "chef animateur", "lead animator", "animation director", "animation lead",
    ],
    exclure: ["3d", "cg", "cgi", "maya", "blender", "mocap", "motion capture", "stop motion", "stop-motion"],
  },
  { id: "compositing", label: "Compositing", mots: ["compositing", "compositeur", "compositrice", "compositor", "compositers", "after effects", "compositing 2d", "compositing artist"] },
  {
    id: "assistant", label: "Assistant·e réalisation / production",
    mots: [
      "assistant réalisation", "assistant de réalisation", "assistante réalisation", "assistante de réalisation", "assistant director", "assistant directeur",
      "assistant production", "assistant de production", "assistante production", "assistante de production", "production assistant", "assistant of production",
      "coordinateur de production", "coordinatrice de production", "production coordinator", "chargé de production", "chargée de production",
      "secrétaire de production", "assistant d'édition", "assistant édition", "assistant monteur", "directing assistant",
    ],
  },
  {
    id: "clean", label: "Clean / intervalle",
    mots: [
      "clean", "cleanup", "clean-up", "clean up", "nettoyage", "nettoyeur", "nettoyeuse", "intervalle", "intervalles", "intervalliste", "inbetween", "inbetweener", "in-between",
      "in-betweener", "inbetweening", "in-betweening", "assistant animateur", "assistant animation", "assistante animation", "assistante animatrice", "key clean",
    ],
  },
];

/** Réglage par défaut : ce que Marine suit tant qu'elle n'a rien choisi. */
export const METIERS_DEFAUT = ["decor", "concept"];

export const metierParId = (id: string): Metier | undefined => METIERS.find((m) => m.id === id);
export const labelMetier = (id: string): string => metierParId(id)?.label ?? id;

/** minuscules, sans accents, marques de genre retirées (« assistant·e », « compositeur.rice »), espaces normalisés */
export function normaliserTexte(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\((?:e|rice|trice|euse|se|ne)\)/g, "")
    .replace(/[·•.\/](?:e|es|rice|trice|euse|se|ne|e\.s)(?![a-z0-9])/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cacheRegex = new Map<string, RegExp>();

/** Mot ou expression présent dans un texte déjà normalisé (mots entiers). */
export function contientMot(texteNorm: string, mot: string): boolean {
  const m = normaliserTexte(mot);
  let re = cacheRegex.get(m);
  if (!re) {
    re = new RegExp(`(?<![a-z0-9])${echapper(m).replace(/\s/g, "\\s")}(?![a-z0-9])`);
    cacheRegex.set(m, re);
  }
  return re.test(texteNorm);
}

export interface TexteAClasser {
  titre: string;
  extrait?: string | null;
  studio?: string | null;
  production?: string | null;
}

/** Ids des métiers reconnus dans le titre, l'extrait et le studio (ordre du catalogue). */
export function metiersDe(e: TexteAClasser): string[] {
  const titre = normaliserTexte(e.titre ?? "");
  const autour = normaliserTexte([e.extrait, e.studio, e.production].filter(Boolean).join(" "));
  return METIERS.filter((m) => {
    if (m.exclure?.some((x) => contientMot(titre, x))) return false;
    return m.mots.some((mot) => contientMot(titre, mot) || (/\s/.test(mot) && contientMot(autour, mot)));
  }).map((m) => m.id);
}

/** Offre : le texte, plus l'ancienne catégorie « décor » (offres saisies à la main ou corrigées). */
export function metiersOffre(o: TexteAClasser & { categorie?: string }): string[] {
  const ids = metiersDe(o);
  return o.categorie === "decor" && !ids.includes("decor") ? ["decor", ...ids] : ids;
}

/** Production : le texte, plus « décor » quand la production est bien placée pour un décorateur (bon moment ou Paris/télétravail). */
export function metiersProduction(p: {
  titre: string; extrait?: string | null; producteurs?: string[]; studiosFabrication?: string[]; bonMomentDecor?: boolean; misEnAvant?: boolean;
}): string[] {
  const ids = metiersDe({ titre: p.titre, extrait: p.extrait, studio: [...(p.studiosFabrication ?? []), ...(p.producteurs ?? [])].join(" ") });
  return (p.bonMomentDecor || p.misEnAvant) && !ids.includes("decor") ? ["decor", ...ids] : ids;
}

/** Métiers suivis d'après les réglages : `metiers`, sinon l'ancien `categorie`, sinon le défaut. Les ids inconnus sont ignorés. */
export function metiersSuivis(p: { metiers?: string[]; categorie?: "decor" | "autre" }): string[] {
  const brut = p.metiers ?? (p.categorie === "decor" ? ["decor"] : METIERS_DEFAUT);
  const ids = brut.filter((id) => !!metierParId(id));
  return ids;
}

export const estDansMetiers = (ids: string[], suivis: string[]): boolean => ids.some((i) => suivis.includes(i));
