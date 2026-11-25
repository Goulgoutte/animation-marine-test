import { test } from "node:test";
import assert from "node:assert/strict";
import { classerProduction, detecterStudios, titreProduction } from "../src/classify.ts";
import { enProduction } from "../src/collect.ts";
import { connuesEnProductions, lireConnues } from "../src/connues.ts";
import { dedoublonnerProductions } from "../src/merge.ts";
import type { SourceConfig } from "../src/types.ts";

const SRC: SourceConfig = { id: "actu", nom: "Actu", url: "https://exemple.fr/feed", type: "actualite", methode: "rss", actif: true };

test("appel à projets, palmarès, festival, nomination, bilan : exclus", () => {
  for (const titre of [
    "Appel à projets 2026 : le CNC finance l'animation en production",
    "Palmarès du festival d'Annecy : les films d'animation récompensés, en production depuis 2023",
    "Nominations aux Annie Awards : séries d'animation en production",
    "Bilan 2025 de l'animation française : financement et production en hausse",
    "Festival de Clermont : le court-métrage d'animation en pré-production primé",
  ]) {
    const r = classerProduction({ titre, extrait: "Animation, financement du CNC." });
    assert.equal(r.exclu, true, titre);
    assert.equal(r.estProduction, false, titre);
  }
});

test("une production précise avec son studio est gardée même dans un article de festival", () => {
  const f = classerProduction({
    titre: "Festival d'Annecy : « Les Contes de l'Aube » entre en production chez Folivari",
    extrait: "La série d'animation 2D, produite par Folivari, sera fabriquée à Paris.",
  });
  assert.equal(f.exclu, true);
  assert.equal(f.estProduction, true);
  assert.equal(f.titre, "Les Contes de l'Aube");
  assert.deepEqual(f.studios, ["Folivari"]);
  // même article sans studio ni œuvre nommée : exclu
  assert.equal(classerProduction({ titre: "Festival d'Annecy : l'animation en production, un bilan", extrait: "Séries d'animation en financement." }).estProduction, false);
});

test("extraction : studio, format, technique, statut, diffuseur", () => {
  const r = classerProduction({
    titre: "Xilam lance la production de « Chickies », série d'animation 3D",
    extrait: "La série de 52 épisodes, diffusée sur France Télévisions, est en production à Paris.",
  });
  assert.equal(r.estProduction, true);
  assert.equal(r.titre, "Chickies");
  assert.deepEqual(r.studios, ["Xilam"]);
  assert.equal(r.format, "serie");
  assert.equal(r.technique, "3D");
  assert.equal(r.statut, "production");
  assert.equal(r.diffuseur, "France Télévisions");
  assert.equal(r.misEnAvant, true);
});

test("studios : liste connue, « produit par », forme longue prioritaire", () => {
  assert.deepEqual(detecterStudios("Un film produit par Lunaris Pictures et animé à Paris"), ["Lunaris Pictures"]);
  assert.deepEqual(detecterStudios("Ellipse Animation annonce une série"), ["Ellipse Animation"]);
  assert.deepEqual(detecterStudios("Produced by Moonlit Studio and distributed by Netflix"), ["Moonlit Studio"]);
  assert.deepEqual(detecterStudios("Rien de précis ici"), []);
});

test("titre : guillemets, ou « la série X », sinon titre d'article sans le média", () => {
  assert.deepEqual(titreProduction("« Le Loup » arrive"), { titre: "Le Loup", cite: true });
  assert.deepEqual(titreProduction("La série Chickies entre en production"), { titre: "Chickies", cite: true });
  assert.deepEqual(titreProduction("Folivari prépare du neuf - Le Film français"), { titre: "Folivari prépare du neuf", cite: false });
});

test("une actualité vague (sans titre ni studio) n'entre pas dans les productions", () => {
  const r = enProduction(SRC, { titre: "L'animation en plein essor : le financement progresse", extrait: "Un long métrage d'animation en développement, parmi d'autres.", url: "https://exemple.fr/a", date: null, lieu: null }, "2026-11-25T00:00:00Z");
  assert.equal(r, null);
});

test("une actualité précise donne une production complète", () => {
  const p = enProduction(SRC, {
    titre: "« Zoé et le dragon » entre en préproduction chez Caribara",
    extrait: "Série d'animation 2D, financement bouclé.", url: "https://exemple.fr/b", date: null, lieu: null,
  }, "2026-11-25T00:00:00Z");
  assert.ok(p);
  assert.equal(p.titre, "Zoé et le dragon");
  assert.deepEqual(p.producteurs, ["Caribara"]);
  assert.equal(p.statut, "preproduction");
  assert.equal(p.technique, "2D");
  assert.equal(p.bonMomentDecor, true);
});

test("ligne de commission CNC : toujours une production financée", () => {
  const src: SourceConfig = { ...SRC, type: "base-projets", methode: "cnc" };
  const p = enProduction(src, { titre: "Le Loup", extrait: "Projet aidé par le CNC : long métrage, produit par Xilam Films, 300 000 €. Animation.", url: "https://www.cnc.fr/x", date: null, lieu: null, format: "long-metrage", producteurs: ["Xilam Films"] }, "2026-11-25T00:00:00Z");
  assert.ok(p);
  assert.equal(p.titre, "Le Loup");
  assert.equal(p.format, "long-metrage");
  assert.equal(p.statut, "financement");
  assert.deepEqual(p.producteurs, ["Xilam Films"]);
});

test("productions connues : toutes présentes, avec source et URL", () => {
  const connues = lireConnues();
  const titres = connues.map((c) => c.titre);
  for (const t of ["Le Loup", "Limbo", "Oh là là !", "Chickies", "Les Aventures de Pil", "Les chiens ne font pas des chats"]) assert.ok(titres.includes(t), t);
  assert.ok(titres.some((t) => /Ellipse/.test(t)));
  for (const c of connues) {
    assert.ok(c.sources.length > 0, c.titre);
    for (const s of c.sources) assert.match(s.url, /^https:\/\//);
  }
  const prods = connuesEnProductions(connues, "2026-11-25T00:00:00Z");
  assert.equal(prods.find((p) => p.titre === "Chickies")?.technique, "3D");
  assert.equal(prods.find((p) => p.titre === "Limbo")?.misEnAvant, true);
});

test("dédoublonnage : une production vue par le CNC et à la main garde producteurs et format", () => {
  const [a] = connuesEnProductions(lireConnues().filter((c) => c.titre === "Le Loup"), "2026-11-25T00:00:00Z");
  const b = { ...a, producteurs: ["Xilam"], format: "inconnu" as const, sources: [{ sourceId: "cnc", url: "https://cnc", vuLe: "2026-11-25T00:00:00Z" }] };
  const [m] = dedoublonnerProductions([b, a]);
  assert.equal(m.format, "long-metrage");
  assert.deepEqual(m.producteurs.sort(), ["Xilam", "Xilam Films"]);
  assert.equal(m.sources.length, 2);
});
