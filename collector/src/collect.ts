import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classerOffre, classerProduction, motsParDefaut, normaliser } from "./classify.ts";
import { fermerNavigateur, recuperer } from "./fetchers.ts";
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

const dateIso = (s: string | null): string | null => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

function filtreTitre(src: SourceConfig): ((titre: string) => boolean) | null {
  if (src.filtre) { const re = new RegExp(src.filtre, "i"); return (t) => re.test(t); }
  // pages HTML d'emploi ou de carrière : ne garder que ce qui ressemble à un intitulé de poste
  if (src.methode !== "rss" && (src.type === "emploi" || src.type === "carriere-studio")) {
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
  const c = classerProduction({ titre: it.titre, extrait: it.extrait, techniqueDefaut: src.technique });
  if (!c.estProduction) return null;
  return {
    id: idProduction(c.titre),
    titre: c.titre,
    format: c.format,
    technique: c.technique,
    producteurs: [],
    studiosFabrication: [],
    paysCoproducteurs: [],
    paysDecors: null,
    diffuseur: null,
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
  const maintenant = new Date();
  const iso = maintenant.toISOString();
  const configs: SourceConfig[] = JSON.parse(
    readFileSync(new URL("../config/sources.json", import.meta.url), "utf8"),
  ).sources;
  const prevSources = new Map((lire<FichierSources>("sources.json")?.sources ?? []).map((s) => [s.id, s]));
  const offres: Offre[] = [];
  const prods: Production[] = [];
  const statuts: SourceStatut[] = [];

  for (const src of configs) {
    const prev = prevSources.get(src.id);
    const statut: SourceStatut = {
      id: src.id, nom: src.nom, url: src.url, type: src.type, methode: src.methode, actif: src.actif,
      dernierSucces: prev?.dernierSucces ?? null,
      derniereErreur: src.actif ? (prev?.derniereErreur ?? null) : null,
      nbResultats: 0,
    };
    statuts.push(statut);
    if (!src.actif || src.methode === "manuel") continue;
    if (seulement && !seulement.includes(src.id)) { statut.nbResultats = prev?.nbResultats ?? 0; continue; }
    try {
      let items = await recuperer(src);
      const ok = filtreTitre(src);
      if (ok) items = items.filter((i) => ok(i.titre));
      const forOffres = src.type === "emploi" || src.type === "carriere-studio";
      let n = 0;
      for (const it of items) {
        if (forOffres) { offres.push(enOffre(src, it, iso)); n++; }
        else { const p = enProduction(src, it, iso); if (p) { prods.push(p); n++; } }
      }
      statut.nbResultats = n;
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
  ecrire("sources.json", { genereLe: iso, sources: statuts } satisfies FichierSources);
  console.log(`Écrit : ${offresFinales.length} offres, ${prodsFinales.length} productions, ${statuts.length} sources.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
