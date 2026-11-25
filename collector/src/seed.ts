import { readFileSync } from "node:fs";
import { classerOffre } from "./classify.ts";
import { DATA_DIR, ecrire, enProduction, lire } from "./collect.ts";
import { idOffre } from "./merge.ts";
import type { FichierOffres, FichierProductions, FichierSources, Offre, SourceConfig, SourceStatut, Technique } from "./types.ts";

// Données d'exemple : sourceId "exemple", remplacées dès la première vraie collecte.
const maintenant = new Date();
const iso = maintenant.toISOString();
const ilYa = (j: number) => new Date(maintenant.getTime() - j * 86_400_000).toISOString();

interface ExOffre {
  titre: string; studio: string; lieu: string | null; extrait: string; jours: number;
  production?: string; technique?: Technique; dateLimite?: string; contrat?: string;
}

const EXEMPLES: ExOffre[] = [
  { titre: "Décorateur / Décoratrice 2D - série", studio: "Folivari", lieu: "Paris", jours: 1, production: "Série jeunesse 52 x 11'", technique: "2D",
    extrait: "Nous recherchons un décorateur confirmé pour une série en 2D sur Toon Boom Harmony et Photoshop. CDDU de 8 mois dans notre studio à Paris." },
  { titre: "Background Painter (2D)", studio: "Caribara", lieu: "Montreuil", jours: 2, technique: "2D",
    extrait: "We are looking for a background painter for a hand-drawn feature film. On site in Montreuil, CDD, Photoshop required. Join our team in Paris area." },
  { titre: "Layout BG artist - télétravail", studio: "Malil Art", lieu: "Angoulême", jours: 3, technique: "2D",
    extrait: "Poste en télétravail complet, ouvert aux résidents en France. Layout décor et BG couleur pour une série d'animation 2D. Freelance, expérience demandée." },
  { titre: "Colour Artist (Remote)", studio: "Cartoon Saloon", lieu: null, jours: 5, technique: "2D",
    extrait: "Fully remote position. Candidates must be based in Ireland. You will colour backgrounds for our new 2D series in Toon Boom Harmony." },
  { titre: "Background Artist", studio: "Jam Media", lieu: null, jours: 4, technique: "2D",
    extrait: "Remote role, UK residents only. Paint 2D backgrounds in Photoshop for an animated children series. Freelance contract." },
  { titre: "Storyboarder 2D", studio: "ZAG", lieu: "Paris", jours: 2, technique: "2D",
    extrait: "Nous recherchons un storyboarder confirmé pour une série d'animation 2D, sur Storyboard Pro. Poste à Paris, CDDU." },
  { titre: "Animateur 2D junior", studio: "Xilam", lieu: "Paris", jours: 6, technique: "2D",
    extrait: "Studio d'animation 2D à Paris, animation traditionnelle et Toon Boom Harmony. Poste junior en CDD, début en janvier." },
  { titre: "Environment Artist", studio: "Studio 3D Exemple", lieu: "Paris", jours: 3, technique: "3D",
    extrait: "Environment artist for a CG feature film. Maya, Houdini and Unreal Engine required. On site in Paris." },
  { titre: "Décorateur couleur", studio: "OOOLALA", lieu: "Angoulême", jours: 7, technique: "2D",
    extrait: "Poste en présentiel à Angoulême pour une série 2D. Décor couleur sur Photoshop, CDD de 6 mois." },
  { titre: "Assistant de production animation", studio: "Studio Exemple", lieu: null, jours: 1, extrait: "Studio d'animation recherche un assistant de production pour soutenir l'équipe sur une série en cours.", },
  { titre: "Background Artist (2D, German-speaking)", studio: "Studio Beispiel", lieu: null, jours: 8, technique: "2D",
    extrait: "Wir suchen einen Background Artist für unser Team, remote, mit Erfahrung in 2D und der Bereitschaft für ein neues Projekt mit der Zusammenarbeit im Team." },
  { titre: "Décorateur 2D (offre ancienne)", studio: "Studio Passé", lieu: "Paris", jours: 30, technique: "2D", dateLimite: ilYa(10),
    extrait: "Poste de décorateur 2D à Paris pour une série d'animation, Toon Boom et Photoshop. CDDU. Candidatures avant la date limite." },
];

const PRODUCTIONS = [
  { titre: "« Les Vacances de Zoé » entre en préproduction chez Folivari", extrait: "La série d'animation 2D de 52 x 11 minutes, réalisée par Camille Martin, sera fabriquée à Paris avec le soutien du CNC.", jours: 2 },
  { titre: "« La Rivière aux oiseaux » : le long-métrage d'animation en financement", extrait: "Film d'animation 2D dessiné à la main, tour de table bouclé avec France Télévisions. Fabrication prévue à Angoulême.", jours: 4 },
  { titre: "Cartoon Movie : « Petit Loup des neiges » en développement", extrait: "Un long-métrage animé en 2D, présenté en pitch à Cartoon Movie. Coproduction France-Belgique.", jours: 5 },
  { titre: "Animated series « Night Garden Club » now in production", extrait: "The hand-drawn animated series enters production at a Dublin studio, with 26 episodes. Backgrounds will be done remotely.", jours: 3 },
  { titre: "« Mini Monstres » en production : lancement de la fabrication de la série 3D", extrait: "La série d'animation en images de synthèse (Maya, Houdini) démarre sa fabrication à Lyon.", jours: 6 },
  { titre: "Le court-métrage d'animation « Sable » entre en postproduction", extrait: "Court animé en 2D traditionnelle, réalisé par Inès Lambert, en post-production à Paris.", jours: 9 },
  { titre: "Anime series « Kitsune Tales » greenlit with French partner", extrait: "The 2D animated series was greenlit after financing closed, with a French co-production and pre-production starting in Paris.", jours: 1 },
  { titre: "Spécial TV de Noël « Le Renne et la Lune » : pitch à Cartoon Forum", extrait: "Un téléfilm d'animation 2D présenté au Cartoon Forum, encore en développement.", jours: 12 },
];

const configs: SourceConfig[] = JSON.parse(readFileSync(new URL("../config/sources.json", import.meta.url), "utf8")).sources;
const exSrc = { id: "exemple", nom: "Exemple", url: "https://exemple.invalid/", type: "emploi" as const, methode: "manuel" as const, actif: false };

function main() {
  const force = process.argv.includes("--force");
  const existant = lire<FichierOffres>("offres.json")?.offres ?? [];
  const reel = existant.some((o) => o.sources.some((s) => s.sourceId !== "exemple"));
  if (reel && !force) {
    console.log("Des données réelles existent déjà : rien écrit (utiliser --force pour écraser).");
    return;
  }

  const offres: Offre[] = EXEMPLES.map((e, i) => {
    const c = classerOffre({ titre: e.titre, studio: e.studio, lieu: e.lieu, extrait: e.extrait, techniqueDefaut: e.technique });
    const { pays, ...reste } = c;
    return {
      id: idOffre(e.studio, e.titre), titre: e.titre, studio: e.studio, production: e.production ?? null,
      lieu: e.lieu, pays, ...reste, dateDebut: null, dateLimite: e.dateLimite ?? null, datePublication: ilYa(e.jours),
      premiereVue: ilYa(e.jours), extrait: e.extrait,
      probablementExpiree: e.dateLimite ? Date.parse(e.dateLimite) < maintenant.getTime() : false,
      sources: [{ sourceId: "exemple", url: `https://exemple.invalid/offre/${i + 1}`, vuLe: iso }],
    };
  });
  const productions = PRODUCTIONS.flatMap((p, i) => {
    const prod = enProduction(exSrc, { titre: p.titre, extrait: p.extrait, url: `https://exemple.invalid/prod/${i + 1}`, date: null, lieu: null }, ilYa(p.jours));
    return prod ? [prod] : [];
  });
  const statuts: SourceStatut[] = configs.map((s) => ({
    id: s.id, nom: s.nom, url: s.url, type: s.type, methode: s.methode, actif: s.actif,
    dernierSucces: null, derniereErreur: null, nbResultats: 0,
  }));
  ecrire("offres.json", { genereLe: iso, offres } satisfies FichierOffres);
  ecrire("productions.json", { genereLe: iso, productions } satisfies FichierProductions);
  ecrire("sources.json", { genereLe: iso, sources: statuts } satisfies FichierSources);
  const dansP = offres.filter((o) => o.dansPerimetre).length;
  console.log(`Exemples écrits dans ${DATA_DIR} : ${offres.length} offres (${dansP} dans le périmètre), ${productions.length} productions.`);
}
main();
