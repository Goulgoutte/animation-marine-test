import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { METIERS, METIERS_DEFAUT, metiersDe, metiersOffre, metiersProduction, metiersSuivis, normaliserTexte } from "../../shared/metiers.ts";
import { classerOffre } from "../src/classify.ts";
import { enOffre, filtreTitre } from "../src/collect.ts";
import type { SourceConfig } from "../src/types.ts";
import type { FichierOffres } from "../src/types.ts";

const ids = (titre: string, extrait = "", studio = "") => metiersDe({ titre, extrait, studio });

test("catalogue : dix métiers, ids uniques, Décor repris de la collecte", () => {
  assert.equal(METIERS.length, 10);
  assert.equal(new Set(METIERS.map((m) => m.id)).size, 10);
  const motsCollecte = JSON.parse(readFileSync(new URL("../config/keywords.json", import.meta.url), "utf8")).decor as string[];
  assert.deepEqual(METIERS.find((m) => m.id === "decor")!.mots, motsCollecte);
  for (const m of METIERS) assert.ok(m.mots.length >= 5, m.id);
  assert.deepEqual(METIERS_DEFAUT, ["decor", "concept"]);
});

test("classement par métier, titres français et anglais", () => {
  assert.ok(ids("Décorateur·rice 2D").includes("decor"));
  assert.ok(ids("Background painter").includes("decor"));
  assert.ok(ids("Concept artist, série 2D").includes("concept"));
  assert.ok(ids("Visual Development Artist").includes("concept"));
  assert.ok(ids("Artiste visdev").includes("concept"));
  assert.ok(ids("Design de décors, saison 2").includes("concept"));
  assert.ok(ids("Environment designer").includes("concept"));
  assert.ok(ids("Layout artist").includes("layout"));
  assert.ok(ids("Color key artist").includes("couleur"));
  assert.ok(ids("Coloriste").includes("couleur"));
  assert.ok(ids("Color script").includes("couleur"));
  assert.ok(ids("Storyboardeuse").includes("storyboard"));
  assert.ok(ids("Story artist").includes("storyboard"));
  assert.ok(ids("Character designer").includes("character"));
  assert.ok(ids("Animateur 2D").includes("anim2d"));
  assert.ok(ids("Compositeur / Compositrice").includes("compositing"));
  assert.ok(ids("Assistant·e de production").includes("assistant"));
  assert.ok(ids("Assistant.e réalisation").includes("assistant"));
  assert.ok(ids("Production assistant").includes("assistant"));
  assert.ok(ids("Intervalliste").includes("clean"));
  assert.ok(ids("Clean-up artist").includes("clean"));
});

test("un titre peut relever de plusieurs métiers ; un titre sans rapport n'en a aucun", () => {
  const m = ids("Layout et color key, série 2D");
  assert.ok(m.includes("layout") && m.includes("couleur"));
  assert.deepEqual(ids("Responsable comptable"), []);
});

test("pas de faux positif sur des sous-chaînes ni sur l'animation 3D", () => {
  assert.ok(!ids("Directeur commercial").includes("decor"));
  assert.ok(!ids("Animateur 3D (Maya)").includes("anim2d"));
  assert.ok(!ids("Concerto pour piano").includes("concept"));
});

test("l'extrait ne compte que par expressions : « concept » seul y est ignoré, « concept art » non", () => {
  assert.ok(!ids("Artiste", "Le concept de la série est ambitieux").includes("concept"));
  assert.ok(ids("Artiste", "Vous ferez du concept art pour la série").includes("concept"));
  assert.ok(ids("Artiste", "", "Atelier Visual Development").includes("concept"));
});

test("anciennes données : catégorie « decor » gardée, offre sans métier = vide", () => {
  assert.deepEqual(metiersOffre({ titre: "Poste mystère", categorie: "decor" }), ["decor"]);
  assert.deepEqual(metiersOffre({ titre: "Poste mystère", categorie: "autre" }), []);
});

test("productions : bon moment ou mise en avant = décor", () => {
  assert.deepEqual(metiersProduction({ titre: "Le Voyage", bonMomentDecor: true }), ["decor"]);
  assert.deepEqual(metiersProduction({ titre: "Le Voyage" }), []);
  assert.ok(metiersProduction({ titre: "Le Voyage", extrait: "recherche concept artist et layout artist" }).includes("layout"));
});

test("réglages : metiers, ancien champ categorie, défaut, ids inconnus", () => {
  assert.deepEqual(metiersSuivis({}), ["decor", "concept"]);
  assert.deepEqual(metiersSuivis({ categorie: "decor" }), ["decor"]);
  assert.deepEqual(metiersSuivis({ metiers: ["storyboard", "inconnu"] }), ["storyboard"]);
  assert.deepEqual(metiersSuivis({ metiers: [], categorie: "decor" }), []);
  assert.equal(normaliserTexte("Assistant·e de production"), "assistant de production");
});

test("même verdict que la collecte pour le Décor, sur les offres réelles", () => {
  const f = JSON.parse(readFileSync(new URL("../../web/public/data/offres.json", import.meta.url), "utf8")) as FichierOffres;
  for (const o of f.offres) {
    if (o.categorie === "decor") assert.ok(metiersOffre(o).includes("decor"), o.titre);
  }
  assert.equal(classerOffre({ titre: "Concept artist 2D" }).categorie, "autre"); // la collecte garde l'offre, quel que soit le métier
});

const src = (p: Partial<SourceConfig>): SourceConfig => ({ id: "t", nom: "T", url: "https://exemple.fr/", type: "emploi", methode: "html", actif: true, ...p });

test("collecte : les offres concept art passent le filtre de pertinence, y compris sur afjv-emploi", () => {
  const titres = ["Concept Artist 2D", "Artiste visdev, série jeunesse", "Visual Development Artist", "Color script artist", "Character designer confirmé", "Intervalliste 2D"];
  const defaut = filtreTitre(src({}))!;
  for (const t of titres) assert.ok(defaut(t), `filtre par défaut : ${t}`);
  const afjv = JSON.parse(readFileSync(new URL("../config/sources.json", import.meta.url), "utf8")).sources.find((s: SourceConfig) => s.id === "afjv-emploi") as SourceConfig;
  const f = filtreTitre(afjv)!;
  for (const t of titres) assert.ok(f(t), `afjv-emploi : ${t}`);
  assert.ok(!f("Comptable fournisseurs"));
});

test("collecte : une offre concept art est conservée, jamais jetée comme « autre métier »", () => {
  const o = enOffre(src({}), { titre: "Concept Artist 2D", url: "https://exemple.fr/o/1", extrait: "", date: null, lieu: "Paris" }, "2026-11-25T10:00:00.000Z");
  assert.equal(o.categorie, "autre");
  assert.equal(o.titre, "Concept Artist 2D");
  assert.ok(metiersOffre(o).includes("concept"));
});
