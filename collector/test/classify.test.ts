import { test } from "node:test";
import assert from "node:assert/strict";
import { classerOffre, classerProduction, detecterResidence } from "../src/classify.ts";

const FR_PARIS = "Nous recherchons un décorateur confirmé pour notre série en 2D, sur Toon Boom Harmony. Poste en CDDU à Paris, dans notre studio.";

test("décor 2D à Paris : dans le périmètre", () => {
  const r = classerOffre({ titre: "Décorateur / Décoratrice 2D", studio: "Studio X", lieu: "Paris", extrait: FR_PARIS });
  assert.equal(r.categorie, "decor");
  assert.equal(r.technique, "2D");
  assert.equal(r.modeTravail, "paris-sur-place");
  assert.equal(r.contrat, "CDDU");
  assert.equal(r.langue, "fr");
  assert.equal(r.dansPerimetre, true);
  assert.equal(r.aVerifier, false);
});

test("background artist remote UK only : résidence exigée, hors périmètre", () => {
  const r = classerOffre({
    titre: "Background Artist (2D)",
    extrait: "Fully remote position, UK residents only. You will paint backgrounds in Photoshop for our team and our series.",
  });
  assert.equal(r.categorie, "decor");
  assert.equal(r.modeTravail, "teletravail-complet");
  assert.equal(r.residenceExigee, "Royaume-Uni");
  assert.equal(r.dansPerimetre, false);
});

test("remote ouvert à tous en anglais : dans le périmètre", () => {
  const r = classerOffre({
    titre: "Colour Artist",
    extrait: "We are looking for a freelance colour artist to join our team. Fully remote, worldwide. Toon Boom Harmony experience is a plus.",
  });
  assert.equal(r.residenceExigee, null);
  assert.equal(r.langue, "en");
  assert.equal(r.contrat, "freelance");
  assert.equal(r.dansPerimetre, true);
});

test("must be based in Ireland", () => {
  assert.equal(detecterResidence("Remote role, must be based in Ireland"), "Irlande");
});

test("résident en France n'est pas bloquant", () => {
  const r = classerOffre({
    titre: "Layout BG artist 2D",
    extrait: "Poste en télétravail complet, résident en France uniquement. Nous recherchons des profils avec de l'expérience dans notre équipe.",
  });
  assert.equal(r.residenceExigee, "France");
  assert.equal(r.dansPerimetre, true);
});

test("offre 3D pure à Paris : hors périmètre", () => {
  const r = classerOffre({ titre: "Lighting Artist", lieu: "Paris", extrait: "Maya, Houdini, Unreal. Studio 3D à Paris." });
  assert.equal(r.technique, "3D");
  assert.equal(r.dansPerimetre, false);
});

test("2D + 3D : hybride, reste dans le périmètre", () => {
  const r = classerOffre({ titre: "Background artist", lieu: "Paris 75011", extrait: "Décors peints en Photoshop, intégrés dans Blender." });
  assert.equal(r.technique, "hybride");
  assert.equal(r.dansPerimetre, true);
});

test("technique et mode inconnus : à vérifier, pas masquée", () => {
  const r = classerOffre({ titre: "Assistant de production", extrait: "Studio d'animation." });
  assert.equal(r.technique, "inconnue");
  assert.equal(r.modeTravail, "inconnu");
  assert.equal(r.aVerifier, true);
  assert.equal(r.dansPerimetre, true);
});

test("sur place hors Paris : hors périmètre", () => {
  const r = classerOffre({ titre: "Décorateur 2D", lieu: "Angoulême", extrait: "Poste en présentiel à Angoulême, animation 2D traditionnelle." });
  assert.equal(r.modeTravail, "sur-place-ailleurs");
  assert.equal(r.dansPerimetre, false);
});

test("télétravail dans une autre langue : hors périmètre", () => {
  const r = classerOffre({
    titre: "2D Background Artist",
    extrait: "Wir suchen einen Background Artist für unser Team. Remote mit Erfahrung und der Bereitschaft für ein Projekt, und wir bieten die Zusammenarbeit mit dem Team.",
  });
  assert.equal(r.langue, "autre");
  assert.equal(r.dansPerimetre, false);
});

test("hybride sans Paris : hors périmètre ; avec Paris : dans", () => {
  const a = classerOffre({ titre: "Animateur 2D", extrait: "Poste hybride à Lyon, Toon Boom." });
  assert.equal(a.modeTravail, "hybride");
  assert.equal(a.dansPerimetre, false);
  const b = classerOffre({ titre: "Animateur 2D", extrait: "Poste hybride à Montreuil, Toon Boom." });
  assert.equal(b.dansPerimetre, true);
});

test("niveau et contrat", () => {
  const r = classerOffre({ titre: "Senior Background Painter - CDI" });
  assert.equal(r.niveau, "senior");
  assert.equal(r.contrat, "CDI");
  assert.equal(classerOffre({ titre: "Stage décor couleur junior" }).contrat, "stage");
  assert.equal(classerOffre({ titre: "Stage décor couleur junior" }).niveau, "junior");
  assert.equal(classerOffre({ titre: "Supervisor décors" }).niveau, "lead");
});

test("code postal 75 reconnu, pas '75 %'", () => {
  assert.equal(classerOffre({ titre: "Décorateur", extrait: "Studio 75011 Paris, 2D" }).modeTravail, "paris-sur-place");
  assert.equal(classerOffre({ titre: "Décorateur 2D", extrait: "Taux 75 % de réussite" }).modeTravail, "inconnu");
});

test("catégorie autre pour un storyboarder", () => {
  assert.equal(classerOffre({ titre: "Storyboarder 2D", lieu: "Paris" }).categorie, "autre");
});

test("production : série 2D en préproduction à Paris, bon moment décor", () => {
  const r = classerProduction({
    titre: "« Les Aventures de Zoé » entre en préproduction chez Folivari",
    extrait: "La série d'animation 2D, réalisée par Marie Dupont, sera fabriquée à Paris avec un financement du CNC.",
  });
  assert.equal(r.estProduction, true);
  assert.equal(r.statut, "preproduction");
  assert.equal(r.format, "serie");
  assert.equal(r.technique, "2D");
  assert.equal(r.bonMomentDecor, true);
  assert.equal(r.misEnAvant, true);
  assert.equal(r.titre, "Les Aventures de Zoé");
});

test("production : long métrage en développement, pas encore bon moment", () => {
  const r = classerProduction({
    titre: "Cartoon Movie : un long-métrage d'animation en développement",
    extrait: "Pitch du projet animé, tourné vers la 2D dessinée à la main.",
  });
  assert.equal(r.estProduction, true);
  assert.equal(r.format, "long-metrage");
  assert.equal(r.statut, "developpement");
  assert.equal(r.bonMomentDecor, false);
});

test("article sans animation ni signal : pas une production", () => {
  const r = classerProduction({ titre: "Le festival rouvre ses portes", extrait: "Programme des projections." });
  assert.equal(r.estProduction, false);
});

test("production anglaise : in production, post-production prioritaire", () => {
  assert.equal(classerProduction({ titre: "Animated series now in production", extrait: "Cartoon with 52 episodes." }).statut, "production");
  assert.equal(classerProduction({ titre: "Animated feature enters post-production", extrait: "Hand-drawn film." }).statut, "postproduction");
});
