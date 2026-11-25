import { test } from "node:test";
import assert from "node:assert/strict";
import { creneauCron, detecterSource, estEchue, prochainPassage, prochainPassageEstime } from "../../shared/sources.ts";
import { ligneEnSource, sourceEnLigne } from "../src/remote.ts";

const h = (n: number) => n * 3_600_000;
const T0 = Date.parse("2026-11-25T12:00:00Z");

test("fréquence : jamais passée = due ; 3 h échues ; tolérance de quelques minutes", () => {
  assert.equal(estEchue(null, "6h", new Date(T0)), true);
  assert.equal(estEchue(new Date(T0 - h(2)).toISOString(), "3h", new Date(T0)), false);
  assert.equal(estEchue(new Date(T0 - h(3)).toISOString(), "3h", new Date(T0)), true);
  assert.equal(estEchue(new Date(T0 - h(3) + 5 * 60_000).toISOString(), "3h", new Date(T0)), true); // cron un peu en avance
  assert.equal(estEchue(new Date(T0 - h(5)).toISOString(), "6h", new Date(T0)), false);
  assert.equal(estEchue(new Date(T0 - h(23)).toISOString(), "quotidien", new Date(T0)), false);
  assert.equal(estEchue(new Date(T0 - h(24)).toISOString(), "quotidien", new Date(T0)), true);
  assert.equal(estEchue(new Date(T0 - h(100)).toISOString(), "hebdo", new Date(T0)), false);
  assert.equal(estEchue(new Date(T0 - h(168)).toISOString(), "hebdo", new Date(T0)), true);
  assert.equal(estEchue("n'importe quoi", "12h", new Date(T0)), true);
});

test("prochain passage = dernier passage + fréquence", () => {
  assert.equal(prochainPassage("2026-11-25T12:00:00.000Z", "12h"), "2026-11-26T00:00:00.000Z");
  assert.equal(prochainPassage(null, "12h"), null);
});

test("détection : ATS reconnus par le domaine", () => {
  assert.deepEqual(detecterSource("https://jobs.lever.co/illumination")?.methode, "lever");
  assert.equal(detecterSource("jobs.lever.co/illumination")?.nomSuggere, "Illumination");
  assert.equal(detecterSource("https://xilam.recruitee.com/")?.methode, "recruitee");
  assert.equal(detecterSource("https://fortiche.teamtailor.com/jobs")?.methode, "teamtailor");
  assert.equal(detecterSource("https://apply.workable.com/mon-studio/")?.methode, "workable");
  assert.equal(detecterSource("https://jobs.smartrecruiters.com/MonStudio")?.methode, "smartrecruiters");
  const w = detecterSource("https://careers.werecruit.io/fr/superprod");
  assert.equal(w?.methode, "werecruit");
  assert.equal(w?.type, "carriere-studio");
});

test("détection : flux RSS, sinon HTML", () => {
  assert.equal(detecterSource("https://xilam.com/feed/")?.methode, "rss");
  assert.equal(detecterSource("https://animationireland.com/?feed=job_feed")?.type, "emploi");
  assert.equal(detecterSource("https://3dvf.com/offres-emploi/feed/")?.type, "emploi");
  assert.equal(detecterSource("https://news.google.com/rss/search?q=animation")?.methode, "rss");
  const html = detecterSource("https://www.exemple-studio.fr/recrutement");
  assert.equal(html?.methode, "html");
  assert.equal(html?.type, "carriere-studio");
  assert.equal(detecterSource("https://www.exemple-studio.fr/actualites")?.type, "actualite");
  assert.equal(detecterSource("pas une url ://"), null);
});

test("table Supabase <-> configuration de collecte", () => {
  const src = ligneEnSource({
    id: "x", nom: "X", url: "https://x.fr/jobs", type: "carriere-studio", methode: "html", frequence: "12h", actif: true,
    config: { selecteurs: { item: "li" }, filtre: "d[eé]cor", studio: "X" }, notes: null, ajoutee_par_utilisatrice: true,
  });
  assert.equal(src.frequence, "12h");
  assert.deepEqual(src.selecteurs, { item: "li" });
  assert.equal(src.ajouteeParUtilisatrice, true);
  const l = sourceEnLigne({ ...src, note: "n" });
  assert.deepEqual(l.config, { selecteurs: { item: "li" }, filtre: "d[eé]cor", studio: "X" });
  assert.equal(l.notes, "n");
});

test("passage estimé : calé sur les créneaux du cron (toutes les 3 h, UTC)", () => {
  assert.equal(creneauCron(new Date("2026-11-25T12:00:00Z")).toISOString(), "2026-11-25T12:00:00.000Z");
  assert.equal(creneauCron(new Date("2026-11-25T12:01:00Z")).toISOString(), "2026-11-25T15:00:00.000Z");
  const now = new Date("2026-11-25T13:10:00Z");
  // jamais collectée : prochain créneau
  assert.equal(prochainPassageEstime(null, "6h", now).toISOString(), "2026-11-25T15:00:00.000Z");
  // dernier passage à 12:00, toutes les 12 h : échéance 00:00 le lendemain
  assert.equal(prochainPassageEstime("2026-11-25T12:00:00.000Z", "12h", now).toISOString(), "2026-11-26T00:00:00.000Z");
  // en retard : prochain créneau
  assert.equal(prochainPassageEstime("2026-11-20T12:00:00.000Z", "quotidien", now).toISOString(), "2026-11-25T15:00:00.000Z");
});
