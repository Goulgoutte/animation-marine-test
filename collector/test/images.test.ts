import { test } from "node:test";
import assert from "node:assert/strict";
import { creerParserRss, extraireHtml } from "../src/fetchers.ts";
import { estPageOffre, imageDepuisHtml, imageDepuisItemRss, logoDepuisHtml, urlImage } from "../src/images.ts";
import type { SourceConfig } from "../src/types.ts";

const rss = (item: string) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>t</title><item><title>A</title><link>https://ex.org/a</link>${item}</item></channel></rss>`;
const premier = async (xml: string) => {
  const flux = await creerParserRss().parseString(xml);
  return imageDepuisItemRss(flux.items[0], "https://ex.org/a");
};

test("RSS : enclosure image", async () => {
  assert.equal(await premier(rss(`<enclosure url="https://ex.org/e.jpg" type="image/jpeg" length="1"/>`)), "https://ex.org/e.jpg");
});

test("RSS : media:content puis media:thumbnail", async () => {
  assert.equal(await premier(rss(`<media:content url="https://ex.org/m.png" medium="image"/>`)), "https://ex.org/m.png");
  assert.equal(await premier(rss(`<media:thumbnail url="https://ex.org/t.jpg"/>`)), "https://ex.org/t.jpg");
});

test("RSS : première <img> du contenu, URL relative résolue", async () => {
  const x = rss(`<content:encoded><![CDATA[<p>x</p><img src="/img/z.webp" alt="">]]></content:encoded>`);
  assert.equal(await premier(x), "https://ex.org/img/z.webp");
});

test("RSS : aucune image, enclosure audio ignorée", async () => {
  assert.equal(await premier(rss(`<enclosure url="https://ex.org/a.mp3" type="audio/mpeg" length="1"/>`)), null);
});

test("HTML : og:image, sinon twitter:image", () => {
  const og = `<html><head><meta property="og:image" content="https://ex.org/og.jpg"><meta name="twitter:image" content="https://ex.org/tw.jpg"></head></html>`;
  assert.equal(imageDepuisHtml(og, "https://ex.org/p"), "https://ex.org/og.jpg");
  assert.equal(imageDepuisHtml(`<meta name="twitter:image" content="/tw.jpg">`, "https://ex.org/p"), "https://ex.org/tw.jpg");
  assert.equal(imageDepuisHtml("<html></html>", "https://ex.org/p"), null);
});

test("URL d'image : https absolu uniquement", () => {
  assert.equal(urlImage("http://ex.org/a.jpg", "https://ex.org/"), null);
  assert.equal(urlImage("data:image/png;base64,AAAA", "https://ex.org/"), null);
  assert.equal(urlImage("//cdn.ex.org/a.jpg", "https://ex.org/"), "https://cdn.ex.org/a.jpg");
  assert.equal(urlImage("a.jpg 1x, b.jpg 2x", "https://ex.org/d/"), "https://ex.org/d/a.jpg");
});

test("logo : apple-touch-icon prioritaire, repli og:image", () => {
  const h = `<link rel="icon" href="/f.ico"><link rel="apple-touch-icon" href="/t.png"><meta property="og:image" content="https://ex.org/og.jpg">`;
  assert.equal(logoDepuisHtml(h, "https://ex.org/"), "https://ex.org/t.png");
  assert.equal(logoDepuisHtml(`<meta property="og:image" content="https://ex.org/og.jpg">`, "https://ex.org/"), "https://ex.org/og.jpg");
});

test("carte HTML : image de la carte", () => {
  const src: SourceConfig = { id: "s", nom: "S", url: "https://ex.org/jobs", type: "emploi", methode: "html", actif: true, selecteurs: { item: "article", titre: "h3", lien: "a" } };
  const items = extraireHtml(`<article><img data-src="/logo.png"><h3>Décorateur 2D</h3><a href="/jobs/1">voir</a></article>`, src);
  assert.equal(items[0]?.image, "https://ex.org/logo.png");
});

test("page d'offre : pas d'ancre, pas la page source", () => {
  assert.equal(estPageOffre("https://ex.org/jobs#abc", "https://ex.org/jobs"), false);
  assert.equal(estPageOffre("https://ex.org/jobs", "https://ex.org/jobs/"), false);
  assert.equal(estPageOffre("https://ex.org/jobs/12", "https://ex.org/jobs"), true);
});
