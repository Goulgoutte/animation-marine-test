import { parse, today } from "./dates";
import type { Profil } from "./supabase";
import type { Candidature, Contact, ModeleMail, ProfilMail } from "./types";

export const VARIABLES = [
  { cle: "studio", label: "Studio" },
  { cle: "poste", label: "Poste" },
  { cle: "production", label: "Production" },
  { cle: "contact_prenom", label: "Prénom du contact" },
  { cle: "contact_nom", label: "Nom du contact" },
  { cle: "contact_fonction", label: "Fonction du contact" },
  { cle: "ma_signature", label: "Ma signature" },
  { cle: "mon_prenom", label: "Mon prénom" },
  { cle: "mon_nom", label: "Mon nom" },
  { cle: "portfolio", label: "Lien du portfolio" },
  { cle: "cv", label: "Lien du CV" },
  { cle: "date_envoi", label: "Date d’envoi" },
] as const;

export type CleVariable = (typeof VARIABLES)[number]["cle"];
export type Valeurs = Record<CleVariable, string>;
export type Replis = Partial<Record<CleVariable, string>>;

const CLES = new Set<string>(VARIABLES.map((v) => v.cle));
/** {{variable}} ou {{variable|texte de repli}} */
const MOTIF = /\{\{\s*([a-z_]+)\s*(?:\|([^}]*))?\}\}/g;

export const jeton = (cle: CleVariable) => `{{${cle}}}`;

export interface Segment {
  texte: string;
  /** Variable vide sans repli : à signaler. */
  vide?: CleVariable;
  /** Texte venu d'un repli (ligne ou saisie). */
  repli?: boolean;
}

/** Découpe un modèle en segments, variables résolues ; `vide` marque ce qui reste sans valeur. */
export function segmenter(modele: string, v: Valeurs, replis: Replis = {}): Segment[] {
  const out: Segment[] = [];
  let dernier = 0;
  for (const m of modele.matchAll(MOTIF)) {
    if (m.index > dernier) out.push({ texte: modele.slice(dernier, m.index) });
    dernier = m.index + m[0].length;
    const cle = m[1];
    if (!CLES.has(cle)) {
      out.push({ texte: m[0] }); // variable inconnue : laissée telle quelle, visible
      continue;
    }
    const k = cle as CleVariable;
    const valeur = v[k]?.trim();
    const repli = replis[k]?.trim() || m[2]?.trim();
    if (valeur) out.push({ texte: v[k] });
    else if (repli) out.push({ texte: repli, repli: true });
    else out.push({ texte: "", vide: k });
  }
  if (dernier < modele.length) out.push({ texte: modele.slice(dernier) });
  return out;
}

/** « Bonjour {{contact_prenom}}, » sans prénom donne « Bonjour, » : on referme l'espace avant la virgule. */
const nettoyer = (t: string) => t.replace(/[ \t]+,/g, ",").replace(/[ \t]{2,}/g, " ");

export function rendre(modele: string, v: Valeurs, replis: Replis = {}): { texte: string; vides: CleVariable[] } {
  const seg = segmenter(modele, v, replis);
  const vides = Array.from(new Set(seg.flatMap((s) => (s.vide ? [s.vide] : []))));
  return { texte: nettoyer(seg.map((s) => s.texte).join("")), vides };
}

/** Variables vides dans plusieurs modèles, sans doublon. */
export const videsDe = (modeles: string[], v: Valeurs, replis: Replis = {}) =>
  Array.from(new Set(modeles.flatMap((m) => rendre(m, v, replis).vides)));

const VIDE: Valeurs = {
  studio: "", poste: "", production: "", contact_prenom: "", contact_nom: "", contact_fonction: "",
  ma_signature: "", mon_prenom: "", mon_nom: "", portfolio: "", cv: "", date_envoi: "",
};

function valeursMoi(p: ProfilMail | undefined, compte: Profil | null): Pick<Valeurs, "ma_signature" | "mon_prenom" | "mon_nom" | "portfolio" | "cv" | "date_envoi"> {
  const mots = compte?.nom?.trim().split(/\s+/) ?? [];
  const prenom = p?.prenom?.trim() || compte?.prenom || "";
  const nom = p?.nom?.trim() || (mots.length > 1 ? mots.slice(1).join(" ") : "");
  return {
    mon_prenom: prenom,
    mon_nom: nom,
    ma_signature: p?.signature?.trim() || [prenom, nom].filter(Boolean).join(" "),
    portfolio: p?.portfolio?.trim() ?? "",
    cv: p?.cv?.trim() ?? "",
    date_envoi: parse(today()).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
  };
}

export function valeursCandidature(a: { c: Candidature; contact?: Contact | null; production?: string | null; profil?: ProfilMail; compte: Profil | null }): Valeurs {
  const { c, contact } = a;
  return {
    ...VIDE,
    studio: c.studio ?? "",
    poste: c.poste ?? "",
    production: a.production ?? "",
    contact_prenom: contact?.prenom ?? "",
    contact_nom: contact?.nom ?? "",
    contact_fonction: contact?.fonction ?? "",
    ...valeursMoi(a.profil, a.compte),
  };
}

export function valeursContact(a: { k: Contact; profil?: ProfilMail; compte: Profil | null }): Valeurs {
  return {
    ...VIDE,
    studio: a.k.structure ?? "",
    contact_prenom: a.k.prenom ?? "",
    contact_nom: a.k.nom ?? "",
    contact_fonction: a.k.fonction ?? "",
    ...valeursMoi(a.profil, a.compte),
  };
}

/** Valeurs d'exemple pour l'aperçu de l'éditeur de modèles. */
export function valeursExemple(profil: ProfilMail | undefined, compte: Profil | null): Valeurs {
  return {
    ...VIDE,
    studio: "Studio Exemple", poste: "Décoratrice", production: "La série du moment",
    contact_prenom: "Élise", contact_nom: "Marchand", contact_fonction: "Chargée de production",
    ...valeursMoi(profil, compte),
  };
}

export const CATEGORIES_MODELE = [
  { id: "candidature", label: "Candidature" },
  { id: "relance", label: "Relance" },
  { id: "remerciement", label: "Remerciement" },
  { id: "autre", label: "Autre" },
];

const SIGN = "Bien cordialement,\n{{ma_signature}}";

export const MODELES_PAR_DEFAUT: Omit<ModeleMail, "id" | "created_at">[] = [
  {
    nom: "Candidature spontanée décor (production repérée)",
    categorie: "candidature",
    sujet: "Candidature spontanée, décors : {{production}}",
    corps: `Bonjour {{contact_prenom}},

Je suis décoratrice en animation 2D. J’ai repéré {{production}}, chez {{studio}}, et le travail de décor de ce projet m’intéresse beaucoup : je serais heureuse de rejoindre l’équipe décor, à la préparation comme en fabrication.

Mon portfolio : {{portfolio}}
Mon CV : {{cv}}

Je reste disponible pour en discuter, par mail ou lors d’un échange à votre convenance.

${SIGN}`,
  },
  {
    nom: "Réponse à une offre",
    categorie: "candidature",
    sujet: "Candidature : {{poste}}",
    corps: `Bonjour {{contact_prenom}},

Je vous écris en réponse à votre offre « {{poste}} » chez {{studio}}. Mon parcours de décoratrice en animation 2D correspond à ce que vous recherchez, et je serais ravie de mettre mon travail au service de vos productions.

Mon portfolio : {{portfolio}}
Mon CV : {{cv}}

Je me tiens à votre disposition pour un échange ou un test, quand vous le souhaitez.

${SIGN}`,
  },
  {
    nom: "1re relance",
    categorie: "relance",
    sujet: "Re : ma candidature chez {{studio}}",
    corps: `Bonjour {{contact_prenom}},

Je me permets de revenir vers vous au sujet de ma candidature chez {{studio}}, envoyée le {{date_envoi}}. Je souhaitais savoir si elle avait bien été reçue et si vous aviez des questions sur mon parcours.

Mon portfolio, au cas où : {{portfolio}}

Merci pour votre temps,
{{ma_signature}}`,
  },
  {
    nom: "2e relance",
    categorie: "relance",
    sujet: "Re : ma candidature chez {{studio}}, dernier message",
    corps: `Bonjour {{contact_prenom}},

Sans nouvelle de votre part au sujet de ma candidature chez {{studio}}, je vous écris une dernière fois pour confirmer mon intérêt pour votre studio.

Si le poste est pourvu ou si le moment n’est pas le bon, je serais heureuse que vous gardiez mon profil pour de futurs projets : {{portfolio}}

Je vous remercie de votre attention.

${SIGN}`,
  },
  {
    nom: "Remerciement après entretien",
    categorie: "remerciement",
    sujet: "Merci pour notre échange, {{studio}}",
    corps: `Bonjour {{contact_prenom}},

Merci d’avoir pris le temps d’échanger avec moi chez {{studio}}. Notre discussion a renforcé mon envie de participer à vos projets.

Je reste à votre disposition pour tout complément, notamment des exemples de décors supplémentaires : {{portfolio}}

${SIGN}`,
  },
];
