import type { FichierOffres, FichierProductions, FichierSources, Offre, Production, SourceStatut } from "@shared/types";
import { addDays, today } from "@/lib/dates";

// Données de développement, utilisées si web/public/data/*.json est absent.
const t = today();
const iso = (n: number) => `${addDays(t, n)}T07:00:00.000Z`;
const src = (sourceId: string, url: string, n = 0) => ({ sourceId, url, vuLe: iso(n) });

const o = (p: Partial<Offre> & Pick<Offre, "id" | "titre">): Offre => ({
  studio: null, production: null, lieu: null, pays: "France", technique: "2D", modeTravail: "paris-sur-place",
  residenceExigee: null, contrat: "CDDU", niveau: "confirme", langue: "fr", dateDebut: null, dateLimite: null,
  datePublication: null, premiereVue: iso(-10), extrait: "", categorie: "decor", dansPerimetre: true,
  aVerifier: false, probablementExpiree: false, sources: [], ...p,
});

export const offresFixture: FichierOffres = {
  genereLe: iso(0),
  offres: [
    o({ id: "f-o1", titre: "Décorateur·rice couleur, série 2D", studio: "Caribara", production: "Les Contes de l’Aube", lieu: "Paris 10e", modeTravail: "paris-sur-place", dateDebut: addDays(t, 40), dateLimite: addDays(t, 12), premiereVue: iso(0), extrait: "Pour la saison 2 de notre série jeunesse en 2D numérique (Toon Boom Harmony, Photoshop), nous recherchons un·e décorateur·rice couleur capable de travailler à partir de layouts…", sources: [src("jobotropo", "https://example.org/jobs/1"), src("afjv", "https://example.org/afjv/1")] }),
    o({ id: "f-o2", titre: "Background painter (remote)", studio: "Cartoon Saloon", pays: "Irlande", modeTravail: "teletravail-complet", residenceExigee: "Irlande", langue: "en", contrat: "freelance", dansPerimetre: false, premiereVue: iso(-1), extrait: "Fully remote, but must be based in Ireland for tax reasons. Hand-painted backgrounds for a feature film.", sources: [src("animationireland", "https://example.org/ci/2")] }),
    o({ id: "f-o3", titre: "Layout BG, long métrage", studio: "Folivari", lieu: "Paris 11e", datePublication: addDays(t, -6), premiereVue: iso(-6), extrait: "Layout et BG pour un long métrage en 2D traditionnelle. Début en janvier.", contrat: "CDDU", niveau: "senior", sources: [src("jobotropo", "https://example.org/jobs/3", -6)] }),
    o({ id: "f-o4", titre: "Environment artist", studio: "Studio inconnu", lieu: null, pays: null, technique: "inconnue", modeTravail: "inconnu", aVerifier: true, premiereVue: iso(-2), extrait: "Annonce relayée sans précision sur la technique ni le lieu.", sources: [src("zerply", "https://example.org/z/4", -2)] }),
    o({ id: "f-o5", titre: "Décorateur·rice, spécial TV", studio: "Mist Studio", lieu: "Montreuil", dateLimite: addDays(t, -9), probablementExpiree: true, premiereVue: iso(-30), extrait: "Spécial TV de 26 minutes, 2D cut-out.", sources: [src("afjv", "https://example.org/afjv/5", -30)] }),
    o({ id: "f-o6", titre: "Storyboardeur·se", studio: "Blue Spirit", lieu: "Paris", categorie: "autre", premiereVue: iso(-4), niveau: "senior", extrait: "Storyboard Pro, série d’action 2D.", sources: [src("jobotropo", "https://example.org/jobs/6", -4)] }),
    o({ id: "f-o7", titre: "Animateur·rice 2D", studio: "Ellipse", lieu: "Télétravail", modeTravail: "teletravail-complet", categorie: "autre", langue: "fr", premiereVue: iso(0), extrait: "100 % télétravail en France.", sources: [src("afjv", "https://example.org/afjv/7")] }),
    o({ id: "f-o8", titre: "Lighting artist", studio: "Illumination Paris", lieu: "Paris", technique: "3D", categorie: "autre", dansPerimetre: false, premiereVue: iso(-8), extrait: "Maya, Houdini.", sources: [src("jobvfx", "https://example.org/j/8", -8)] }),
    o({ id: "f-o9", titre: "Colour artist, série", studio: "Normaal", lieu: "Remote (Berlin)", pays: "Allemagne", modeTravail: "teletravail-complet", langue: "autre", dansPerimetre: false, premiereVue: iso(-12), extrait: "Sprache: Deutsch.", sources: [src("zerply", "https://example.org/z/9", -12)] }),
  ],
};

const p = (x: Partial<Production> & Pick<Production, "id" | "titre">): Production => ({
  format: "serie", technique: "2D", producteurs: [], studiosFabrication: [], paysCoproducteurs: [], paysDecors: null,
  diffuseur: null, realisateur: null, statut: "inconnu", dateDemarrage: null, villeFabrication: null,
  contactRecrutement: null, extrait: "", premiereVue: iso(-7), misEnAvant: false, bonMomentDecor: false, sources: [], ...x,
});

export const productionsFixture: FichierProductions = {
  genereLe: iso(0),
  productions: [
    p({ id: "prod-demo-1", titre: "Les Contes de l’Aube", format: "serie", producteurs: ["Caribara"], studiosFabrication: ["Caribara"], paysCoproducteurs: ["France", "Belgique"], paysDecors: "France", diffuseur: "France Télévisions", statut: "preproduction", dateDemarrage: addDays(t, 60), villeFabrication: "Paris", premiereVue: iso(0), misEnAvant: true, bonMomentDecor: true, extrait: "Série 52 × 11 min en 2D numérique. Équipes décor constituées dès la préproduction.", sources: [src("catsuka", "https://example.org/n/1"), src("scriptoclap", "https://example.org/s/1")] }),
    p({ id: "f-p2", titre: "La Nuit des lucioles", format: "long-metrage", producteurs: ["Sacrebleu Productions"], studiosFabrication: ["Sacrebleu"], paysCoproducteurs: ["France", "Luxembourg"], realisateur: "A. Renard", statut: "financement", dateDemarrage: addDays(t, 180), villeFabrication: "Paris", misEnAvant: true, bonMomentDecor: false, extrait: "Tour de table en cours, aide du CNC obtenue.", sources: [src("cnc", "https://example.org/n/2", -3)] }),
    p({ id: "f-p3", titre: "Moonrise", format: "serie", producteurs: ["Cartoon Saloon"], studiosFabrication: ["Cartoon Saloon"], paysCoproducteurs: ["Irlande", "France"], paysDecors: "Irlande", statut: "production", dateDemarrage: addDays(t, -30), villeFabrication: "Kilkenny", bonMomentDecor: true, misEnAvant: false, premiereVue: iso(-2), extrait: "Les décors sont fabriqués à Kilkenny.", sources: [src("cartoonbrew", "https://example.org/n/3", -2)] }),
    p({ id: "f-p4", titre: "Petits monstres", format: "court", producteurs: ["Folimage"], studiosFabrication: ["Folimage"], statut: "developpement", villeFabrication: "Valence", extrait: "Court métrage en développement.", sources: [src("magelis", "https://example.org/n/4", -9)] }),
    p({ id: "f-p5", titre: "Galaxy Kids", format: "serie", technique: "3D", producteurs: ["TeamTO"], statut: "production", extrait: "Série 3D.", sources: [src("kidscreen", "https://example.org/n/5", -5)] }),
    p({ id: "f-p6", titre: "Dernier hiver", format: "special-tv", technique: "hybride", producteurs: ["Miyu Productions"], studiosFabrication: ["Miyu"], statut: "preproduction", villeFabrication: "Paris", misEnAvant: true, bonMomentDecor: true, premiereVue: iso(-1), contactRecrutement: "recrutement@example.org", extrait: "Spécial TV hybride 2D / papier découpé.", sources: [src("annecy", "https://example.org/n/6", -1)] }),
  ],
};

export const sourcesFixture: FichierSources = {
  genereLe: iso(0),
  sources: [
    { id: "jobotropo", nom: "Jobotropo", url: "https://jobotropo.com/jobs", type: "emploi", methode: "playwright", actif: true, dernierSucces: iso(0), derniereErreur: null, nbResultats: 24 },
    { id: "afjv", nom: "AFJV", url: "https://emploi.afjv.com", type: "emploi", methode: "html", actif: true, dernierSucces: iso(-1), derniereErreur: null, nbResultats: 11 },
    { id: "cojob", nom: "Cojob", url: "https://cojob.fr", type: "emploi", methode: "html", actif: true, dernierSucces: iso(-2), derniereErreur: "HTTP 403 à la dernière collecte", nbResultats: 0 },
    { id: "awn", nom: "Animation World Network", url: "https://awn.com", type: "actualite", methode: "rss", actif: true, dernierSucces: iso(-12), derniereErreur: "HTTP 403", nbResultats: 0 },
    { id: "catsuka", nom: "Catsuka", url: "https://catsuka.com", type: "actualite", methode: "rss", actif: true, dernierSucces: iso(0), derniereErreur: null, nbResultats: 8 },
    { id: "linkedin", nom: "LinkedIn", url: "https://linkedin.com", type: "emploi", methode: "manuel", actif: true, dernierSucces: null, derniereErreur: null, nbResultats: 0 },
    { id: "stim", nom: "Stim Studio", url: "https://stimstudio.com/fr/recrutement", type: "carriere-studio", methode: "html", actif: false, dernierSucces: null, derniereErreur: null, nbResultats: 0 },
  ] as SourceStatut[],
};
