import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LIMITES_DEFAUT, ajouterHistorique, chargeParDomaine, collecteTropRecente, compteurDuJour, domaineDe, limitesDepuis, niveauDe,
  domainesCharges, passagesParJour, plafondAtteint, plafondDe, type SourceCharge,
} from "../../shared/charge.ts";
import { attendreTour, installerGarde, remettreCompteurs, requetesDeLaSession, totalRequetesSession } from "../src/http.ts";
import { lireLimites } from "../src/collect.ts";

const src = (id: string, url: string, frequence: string, actif = true, methode = "html"): SourceCharge => ({ id, url, frequence, actif, methode });
const T0 = new Date("2026-11-25T12:00:00Z");

test("limites : défaut 200 par domaine et 10 min, fichier de config lu, valeurs absurdes écartées", () => {
  assert.equal(LIMITES_DEFAUT.plafondRequetesParDomaineParJour, 200);
  assert.equal(LIMITES_DEFAUT.delaiMinCollecteMinutes, 10);
  const f = lireLimites();
  assert.equal(f.plafondRequetesParDomaineParJour, 200);
  assert.equal(f.delaiMinCollecteMinutes, 10);
  assert.deepEqual(JSON.parse(readFileSync(new URL("../config/limites.json", import.meta.url), "utf8")).plafondRequetesParDomaineParJour, 200);
  const l = limitesDepuis({ plafondRequetesParDomaineParJour: -3, delaiMinCollecteMinutes: 0, plafondsParDomaine: { "WWW.Gros.fr": 100, "x.fr": -1 } });
  assert.equal(l.plafondRequetesParDomaineParJour, 200);
  assert.equal(l.delaiMinCollecteMinutes, 10);
  assert.equal(plafondDe("gros.fr", l), 100);
  assert.equal(plafondDe("autre.fr", l), 200);
  assert.equal(plafondDe("x.fr", l), 200);
});

test("domaine : sans www, minuscules, null si invalide", () => {
  assert.equal(domaineDe("https://www.Exemple.fr/jobs?x=1"), "exemple.fr");
  assert.equal(domaineDe("pas une url"), null);
});

test("compteur journalier : conservé le même jour (UTC), remis à zéro le lendemain", () => {
  const c = { jour: "2026-11-25", parDomaine: { "a.fr": 7 } };
  assert.deepEqual(compteurDuJour(c, new Date("2026-11-25T23:59:59Z")), c);
  assert.deepEqual(compteurDuJour(c, new Date("2026-11-26T00:00:00Z")), { jour: "2026-11-26", parDomaine: {} });
  assert.deepEqual(compteurDuJour(undefined, T0), { jour: "2026-11-25", parDomaine: {} });
  const copie = compteurDuJour(c, T0);
  copie.parDomaine["a.fr"] = 99;
  assert.equal(c.parDomaine["a.fr"], 7, "le compteur d'origine n'est pas modifié");
});

test("plafond : atteint à la 200e requête, pas avant ; plafond propre au domaine", () => {
  assert.equal(plafondAtteint({ "a.fr": 199 }, "a.fr", LIMITES_DEFAUT), false);
  assert.equal(plafondAtteint({ "a.fr": 200 }, "a.fr", LIMITES_DEFAUT), true);
  assert.equal(plafondAtteint({}, "a.fr", LIMITES_DEFAUT), false);
  const l = limitesDepuis({ plafondsParDomaine: { "a.fr": 5 } });
  assert.equal(plafondAtteint({ "a.fr": 5 }, "a.fr", l), true);
  assert.equal(plafondAtteint({ "b.fr": 5 }, "b.fr", l), false);
});

test("délai minimal : 10 min entre deux collectes complètes, contourné par forcer", () => {
  const il = (min: number) => new Date(T0.getTime() - min * 60_000).toISOString();
  assert.deepEqual(collecteTropRecente(il(4), T0, LIMITES_DEFAUT, false), { refuse: true, attendreMinutes: 6 });
  assert.equal(collecteTropRecente(il(9), T0, LIMITES_DEFAUT, false).refuse, true);
  assert.equal(collecteTropRecente(il(10), T0, LIMITES_DEFAUT, false).refuse, false);
  assert.equal(collecteTropRecente(il(180), T0, LIMITES_DEFAUT, false).refuse, false);
  assert.equal(collecteTropRecente(il(1), T0, LIMITES_DEFAUT, true).refuse, false);
  assert.equal(collecteTropRecente(null, T0, LIMITES_DEFAUT, false).refuse, false);
  assert.equal(collecteTropRecente("n'importe quoi", T0, LIMITES_DEFAUT, false).refuse, false);
});

test("charge estimée : passages par jour, robots.txt compté, sources inactives ignorées", () => {
  assert.equal(passagesParJour("3h"), 8);
  assert.equal(passagesParJour("6h"), 4);
  assert.equal(passagesParJour("quotidien"), 1);
  assert.ok(Math.abs(passagesParJour("hebdo") - 1 / 7) < 1e-9);
  const c = chargeParDomaine([
    src("a", "https://www.studio.fr/jobs", "3h"),
    src("b", "https://studio.fr/news", "6h"),
    src("c", "https://autre.fr/", "quotidien"),
    src("d", "https://off.fr/", "3h", false),
    src("e", "https://manuel.fr/", "3h", true, "manuel"),
  ], LIMITES_DEFAUT);
  assert.deepEqual(c.map((x) => x.domaine), ["studio.fr", "autre.fr"]);
  assert.equal(c[0].requetes, 20); // 8 + 4 passages, plus 8 robots.txt (une par collecte)
  assert.equal(c[0].plafond, 200);
  assert.deepEqual(c[0].sources, ["a", "b"]);
  assert.equal(c[1].requetes, 2);
});

test("niveaux de la jauge : vert sous 50 %, orange jusqu'à 85 %, rouge au-delà", () => {
  assert.equal(niveauDe(0), "vert");
  assert.equal(niveauDe(0.49), "vert");
  assert.equal(niveauDe(0.5), "orange");
  assert.equal(niveauDe(0.85), "orange");
  assert.equal(niveauDe(0.86), "rouge");
  assert.equal(niveauDe(1.4), "rouge");
});

test("note discrète : seuls les domaines au-dessus de 50 % du plafond sont signalés", () => {
  const l = limitesDepuis({ plafondRequetesParDomaineParJour: 24 });
  const c = chargeParDomaine([src("a", "https://studio.fr/jobs", "3h"), src("b", "https://studio.fr/news", "6h"), src("c", "https://calme.fr/", "quotidien")], l);
  assert.deepEqual(domainesCharges(c).map((x) => x.domaine), ["studio.fr"]); // 8 + 4 + 8 robots.txt = 20 sur 24
  assert.deepEqual(domainesCharges(chargeParDomaine([src("a", "https://studio.fr/jobs", "3h")], LIMITES_DEFAUT)), []);
});

test("historique : les 10 dernières collectes", () => {
  let h = undefined as ReturnType<typeof ajouterHistorique> | undefined;
  for (let i = 0; i < 12; i++) h = ajouterHistorique(h, { date: `2026-11-${10 + i}T00:00:00Z`, requetes: i, sources: 1, sautees: [] });
  assert.equal(h!.length, 10);
  assert.equal(h![0].requetes, 11);
});

test("http : chaque requête est comptée par domaine, et refusée au plafond (avant toute attente)", async () => {
  remettreCompteurs();
  const l = limitesDepuis({ plafondRequetesParDomaineParJour: 1 });
  installerGarde((d) => !plafondAtteint(requetesDeLaSession(), d, l));
  try {
    await attendreTour("https://www.plafond-test.example/robots.txt");
    assert.deepEqual(requetesDeLaSession(), { "plafond-test.example": 1 });
    await assert.rejects(attendreTour("https://plafond-test.example/jobs"), /plafond quotidien/);
    assert.equal(totalRequetesSession(), 1, "la requête refusée n'est pas comptée");
    await attendreTour("https://autre-domaine.example/"); // un autre domaine n'est pas touché
    assert.equal(totalRequetesSession(), 2);
  } finally {
    installerGarde(null);
    remettreCompteurs();
  }
});
