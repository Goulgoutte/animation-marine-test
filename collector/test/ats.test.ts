import { test } from "node:test";
import assert from "node:assert/strict";
import { lever, recruitee, slugAts, smartrecruiters, urlApi, werecruit, workable } from "../src/ats.ts";
import { extraireCnc, formatCnc, titreCasse } from "../src/cnc.ts";
import type { SourceConfig } from "../src/types.ts";

const base = (o: Partial<SourceConfig>): SourceConfig => ({ id: "t", nom: "T", url: "https://x", type: "carriere-studio", methode: "lever", actif: true, ...o });

test("slugs et URL d'API", () => {
  assert.equal(slugAts("lever", "https://jobs.lever.co/illumination"), "illumination");
  assert.equal(urlApi("lever", "https://jobs.lever.co/illumination"), "https://api.lever.co/v0/postings/illumination?mode=json");
  assert.equal(urlApi("recruitee", "https://xilam.recruitee.com/"), "https://xilam.recruitee.com/api/offers/");
  assert.equal(urlApi("teamtailor", "https://fortiche.teamtailor.com/jobs"), "https://fortiche.teamtailor.com/jobs.rss");
  assert.equal(slugAts("workable", "https://apply.workable.com/mon-studio/"), "mon-studio");
  assert.equal(slugAts("smartrecruiters", "https://jobs.smartrecruiters.com/MonStudio"), "MonStudio");
});

test("Lever : titre, lieu, remote", () => {
  const r = lever([{ text: "Background Artist", hostedUrl: "https://jobs.lever.co/x/1", createdAt: 1_760_000_000_000, workplaceType: "remote", categories: { location: "Paris", commitment: "CDD" }, descriptionPlain: "Peinture 2D" }], base({ studio: "X" }));
  assert.equal(r.length, 1);
  assert.equal(r[0].titre, "Background Artist");
  assert.match(r[0].lieu ?? "", /Paris.*Remote/);
  assert.equal(r[0].studio, "X");
  assert.deepEqual(lever([], base({})), []);
  assert.throws(() => lever({ ok: false }, base({})));
});

test("Recruitee, Workable, SmartRecruiters", () => {
  assert.equal(recruitee({ offers: [{ title: "Colour artist", careers_url: "https://x.recruitee.com/o/1", city: "Lyon", remote: true }] }, base({}))[0].lieu, "Lyon, Remote");
  assert.equal(workable({ name: "S", jobs: [{ title: "BG", url: "https://apply.workable.com/s/j/1", city: "Paris", country: "France" }] }, base({}))[0].studio, "S");
  const sr = smartrecruiters({ content: [{ name: "Layout", id: "99", location: { city: "Paris" }, company: { name: "Z" } }] }, base({ url: "https://jobs.smartrecruiters.com/Z" }));
  assert.equal(sr[0].url, "https://jobs.smartrecruiters.com/Z/99");
});

test("WeRecruit : liste window.allOffers, candidatures spontanées écartées", () => {
  const offres = [
    { Title: { "en-gb": "Production Designer, Adult Animated Series" }, TitleTranslated: "Production Designer, Adult Animated Series F/M", Url: "https://careers.werecruit.io/fr/superprod/offres/pd-1", Company_Name: "Superprod", Address_City: "Paris", Address_State: "FR", TypeTranslated: "CDD - 3 mois", PublicationStartDate: "2026-09-04T08:11:52+00:00" },
    { Title: { "en-gb": "Spontaneous Application" }, TitleTranslated: "Spontaneous Application F/M", Url: "https://careers.werecruit.io/fr/superprod/offres/sp", Company_Name: "Superprod" },
  ];
  const html = `<script>var a = "]"; window.allOffers = ${JSON.stringify(offres)}; var b = [1];</script>`;
  const r = werecruit(html, base({ methode: "werecruit" }));
  assert.equal(r.length, 1);
  assert.equal(r[0].titre, "Production Designer, Adult Animated Series");
  assert.equal(r[0].lieu, "Paris, FR");
  assert.equal(r[0].studio, "Superprod");
  assert.throws(() => werecruit("<html></html>", base({})));
});

test("CNC : lignes du tableau de résultats", () => {
  const html = `<table><tbody>
    <tr><td>LE LOUP</td><td>XILAM FILMS</td><td>Long métrage</td><td>300&nbsp;000</td></tr>
    <tr><td>OH LA LA&nbsp;!</td><td>AUTOUR DE MINUIT PRODUCTIONS</td><td>Test technique série</td><td>50 000</td></tr>
    <tr><td>Titre</td><td>Producteur</td></tr></tbody></table>`;
  const l = extraireCnc(html);
  assert.equal(l.length, 2);
  assert.equal(l[0].titre, "Le loup"); // casse de phrase : le CNC écrit tout en capitales
  assert.equal(l[0].producteur, "Xilam Films");
  assert.equal(l[0].format, "long-metrage");
  assert.equal(l[1].titre, "Oh la la !");
  assert.equal(l[1].format, "serie");
  assert.equal(titreCasse("Déjà Casé"), "Déjà Casé");
  assert.equal(extraireCnc("<table><tr><td>X</td><td>AUTOUR DE MINUIT PRODUCTIONS</td><td>Série</td></tr></table>")[0].producteur, "Autour de Minuit Productions");
  assert.equal(formatCnc("Court métrage"), "court");
});
