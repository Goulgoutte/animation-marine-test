import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classerOffre, classerProduction, motsParDefaut, normaliser } from "./classify.ts";
import { connuesEnProductions, lireConnues } from "./connues.ts";
import { fermerNavigateur, recuperer } from "./fetchers.ts";
import { installerGarde, requetesDeLaSession, totalRequetesSession } from "./http.ts";
import { estEchue } from "../../shared/sources.ts";
import {
  ajouterHistorique, collecteTropRecente, compteurDuJour, domaineDe, limitesDepuis, plafondAtteint, plafondDe, type Limites,
} from "../../shared/charge.ts";
import { chargerSources } from "./remote.ts";
import { enrichirImages } from "./images.ts";
import { fusionnerOffres, fusionnerProductions, idOffre, idProduction } from "./merge.ts";
import type {
  FichierOffres, FichierProductions, FichierSources, ItemBrut, Offre, Production, SourceConfig, SourceStatut,
} from "./types.ts";

export const DATA_DIR = fileURLToPath(new URL("../../web/public/data/", import.meta.url));

export function lire<T>(nom: string): T | null {
  const f = DATA_DIR + nom;
  if (!existsSync(f)) return null;
  try { return JSON.parse(readFileSync(f, "utf8")) as T; } catch { return null; }
}

export function ecrire(nom: string, contenu: unknown): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_DIR + nom, JSON.stringify(contenu, null, 2) + "\n");
}

/** Garde-fous : collector/config/limites.json (plafond par domaine et par jour, délai minimal entre deux collectes). */
export function lireLimites(): Limites {
  try { return limitesDepuis(JSON.parse(readFileSync(new URL("../config/limites.json", import.meta.url), "utf8"))); } catch { return limitesDepuis(null); }
}

const dateIso = (s: string | null): string | null => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

export function filtreTitre(src: SourceConfig): ((titre: string) => boolean) | null {
  if (src.filtre) { const re = new RegExp(src.filtre, "i"); return (t) => re.test(t); }
  // pages HTML d'emploi ou de carrière : ne garder que ce qui ressemble à un intitulé de poste
  // (les API d'ATS ne renvoient que des offres : pas de filtre)
  if ((src.methode === "html" || src.methode === "playwright") && (src.type === "emploi" || src.type === "carriere-studio")) {
    const re = new RegExp(motsParDefaut.titresMetiers.map((m) => normaliser(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
    return (t) => t.length >= 10 && re.test(normaliser(t));
  }
  return null;
}

export function enOffre(src: SourceConfig, it: ItemBrut, maintenant: string): Offre {
  const studio = it.studio ?? src.studio ?? null;
  const lieu = it.lieu ?? src.lieuDefaut ?? null;
  const c = classerOffre({ titre: it.titre, studio, lieu, extrait: it.extrait, techniqueDefaut: src.technique });
  const { pays, ...reste } = c;
  return {
    id: idOffre(studio, it.titre),
    titre: it.titre,
    studio,
    production: null,
    lieu,
    pays,
    ...reste,
    dateDebut: null,
    dateLimite: null,
    datePublication: dateIso(it.date),
    premiereVue: maintenant,
    extrait: it.extrait,
    image: it.image ?? null,
    probablementExpiree: false,
    sources: [{ sourceId: src.id, url: it.url, vuLe: maintenant }],
  };
}

export function enProduction(src: SourceConfig, it: ItemBrut, maintenant: string): Production | null {
  let c = classerProduction({ titre: it.titre, extrait: it.extrait, techniqueDefaut: src.technique });
  if (src.methode === "cnc") {
    // page de résultats d'une commission : chaque ligne est un projet aidé, donc financé
    c = { ...c, estProduction: true, titre: it.titre, statut: "financement", bonMomentDecor: true, format: it.format ?? c.format };
  } else if (!c.estProduction || (src.type === "actualite" && !c.precis)) return null;
  const producteurs = it.producteurs ?? c.studios;
  return {
    id: idProduction(c.titre),
    titre: c.titre,
    format: it.format && it.format !== "inconnu" ? it.format : c.format,
    technique: c.technique,
    producteurs,
    studiosFabrication: [],
    paysCoproducteurs: [],
    paysDecors: null,
    diffuseur: c.diffuseur,
    realisateur: c.realisateur,
    statut: c.statut,
    dateDemarrage: null,
    villeFabrication: null,
    contactRecrutement: null,
    extrait: it.extrait || it.titre,
    image: it.image ?? null,
    premiereVue: maintenant,
    misEnAvant: c.misEnAvant,
    bonMomentDecor: c.bonMomentDecor,
    sources: [{ sourceId: src.id, url: it.url, vuLe: maintenant }],
  };
}

async function main() {
  const seulement = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const forcer = process.argv.includes("--force") || process.env.FORCER === "1" || process.env.FORCER === "true";
  const maintenant = new Date();
  const iso = maintenant.toISOString();
  const limites = lireLimites();
  const prevFichier = lire<FichierSources>("sources.json");
  // Délai minimal entre deux collectes complètes (sauf --force) : on sort sans rien écrire.
  if (!seulement) {
    const v = collecteTropRecente(prevFichier?.derniereCollecteComplete, maintenant, limites, forcer);
    if (v.refuse) {
      console.log(`Collecte refusée : la précédente date de moins de ${limites.delaiMinCollecteMinutes} min (reprise possible dans ${v.attendreMinutes} min). --force passe outre.`);
      return;
    }
  }
  const compteur = compteurDuJour(prevFichier?.requetesJour, maintenant);
  const sessionDe = (d: string) => requetesDeLaSession()[d] ?? 0;
  installerGarde((d) => !plafondAtteint({ [d]: (compteur.parDomaine[d] ?? 0) + sessionDe(d) }, d, limites));
  const sautees: string[] = [];
  let sourcesLues = 0;
  const { configs, origine } = await chargerSources();
  console.log(`Sources : ${configs.length} (${origine === "supabase" ? "table Supabase" : "repli sur config/sources.json"})${forcer ? ", passage forcé" : ""}`);
  const prevSources = new Map((prevFichier?.sources ?? []).map((s) => [s.id, s]));
  const offres: Offre[] = [];
  const prods: Production[] = [];
  const statuts: SourceStatut[] = [];

  for (const src of configs) {
    const prev = prevSources.get(src.id);
    const statut: SourceStatut = {
      id: src.id, nom: src.nom, url: src.url, type: src.type, methode: src.methode, actif: src.actif,
      dernierSucces: prev?.dernierSucces ?? null,
      derniereErreur: src.actif ? (prev?.derniereErreur ?? null) : null,
      nbResultats: prev?.nbResultats ?? 0,
      frequence: src.frequence ?? "quotidien",
      dernierPassage: prev?.dernierPassage ?? prev?.dernierSucces ?? null,
      derniersTitres: prev?.derniersTitres ?? [],
      ajouteeParUtilisatrice: src.ajouteeParUtilisatrice ?? false,
      notes: src.note ?? null,
      sautee: null,
    };
    statuts.push(statut);
    if (!src.actif || src.methode === "manuel") continue;
    if (seulement && !seulement.includes(src.id)) continue;
    if (!seulement && !forcer && !estEchue(statut.dernierPassage, statut.frequence, maintenant)) {
      console.log(`SKIP ${src.id}: pas encore échue (${statut.frequence}, dernier passage ${statut.dernierPassage})`);
      continue;
    }
    // Plafond de requêtes du domaine atteint aujourd'hui : on saute la source, elle reste due et repart demain.
    const domaine = domaineDe(src.url);
    if (domaine && plafondAtteint({ [domaine]: (compteur.parDomaine[domaine] ?? 0) + sessionDe(domaine) }, domaine, limites)) {
      statut.sautee = "plafond";
      sautees.push(src.id);
      console.log(`SKIP ${src.id}: plafond de ${plafondDe(domaine, limites)} requêtes par jour atteint pour ${domaine}`);
      continue;
    }
    sourcesLues++;
    statut.dernierPassage = iso;
    try {
      let items = await recuperer(src);
      const ok = filtreTitre(src);
      if (ok) items = items.filter((i) => ok(i.titre));
      const forOffres = src.type === "emploi" || src.type === "carriere-studio";
      let n = 0;
      const titres: string[] = [];
      for (const it of items) {
        if (forOffres) { offres.push(enOffre(src, it, iso)); n++; titres.push(it.titre); }
        else { const p = enProduction(src, it, iso); if (p) { prods.push(p); n++; titres.push(p.titre); } }
      }
      statut.nbResultats = n;
      statut.derniersTitres = titres.slice(0, 5);
      statut.dernierSucces = iso;
      statut.derniereErreur = null;
      console.log(`OK   ${src.id}: ${items.length} éléments, ${n} retenus`);
    } catch (e) {
      statut.derniereErreur = e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 300) : String(e);
      statut.nbResultats = 0;
      console.log(`FAIL ${src.id}: ${statut.derniereErreur}`);
    }
  }
  await fermerNavigateur();

  // productions repérées à la main : toujours intégrées, comme si elles venaient d'être vues
  // en tête : à doublon égal, le titre soigné de la main l'emporte sur celui de la source
  prods.unshift(...connuesEnProductions(lireConnues(), iso));

  // les données d'exemple (pnpm seed) disparaissent dès qu'une vraie collecte écrit les fichiers
  const reel = <T extends { sources: { sourceId: string }[] }>(l: T[]) => l.filter((x) => !x.sources.every((s) => s.sourceId === "exemple"));
  const prevOffres = reel(lire<FichierOffres>("offres.json")?.offres ?? []);
  const prevProds = reel(lire<FichierProductions>("productions.json")?.productions ?? []);
  if (!process.argv.includes("--sans-images")) {
    const st = await enrichirImages(offres, prods, prevOffres, prevProds, configs);
    console.log(`Images offres : ${st.offres.reutilisees} reprises, ${st.offres.trouvees} trouvées, ${st.offres.sans} sans.`);
    console.log(`Images productions : ${st.prods.reutilisees} reprises, ${st.prods.trouvees} trouvées, ${st.prods.sans} sans.`);
  }
  const offresFinales = fusionnerOffres(offres, prevOffres, maintenant);
  const prodsFinales = fusionnerProductions(prods, prevProds, maintenant);
  ecrire("offres.json", { genereLe: iso, offres: offresFinales } satisfies FichierOffres);
  ecrire("productions.json", { genereLe: iso, productions: prodsFinales } satisfies FichierProductions);
  const parDomaine = { ...compteur.parDomaine };
  for (const [d, n] of Object.entries(requetesDeLaSession())) parDomaine[d] = (parDomaine[d] ?? 0) + n;
  installerGarde(null);
  ecrire("sources.json", {
    genereLe: iso,
    sources: statuts,
    limites,
    requetesJour: { jour: compteur.jour, parDomaine },
    derniereCollecteComplete: seulement ? (prevFichier?.derniereCollecteComplete ?? null) : iso,
    historique: ajouterHistorique(prevFichier?.historique, {
      date: iso, requetes: totalRequetesSession(), sources: sourcesLues, sautees: sautees, ...(seulement ? { partielle: true } : {}),
    }),
  } satisfies FichierSources);
  console.log(`Écrit : ${offresFinales.length} offres, ${prodsFinales.length} productions, ${statuts.length} sources.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
