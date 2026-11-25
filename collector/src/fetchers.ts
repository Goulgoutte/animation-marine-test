import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { recupererTexte, robotsAutorise, attendreTour, USER_AGENT } from "./http.ts";
import { imageDepuisItemRss, urlImage } from "./images.ts";
import type { ItemBrut, SourceConfig } from "./types.ts";

const nettoyer = (s: string) => s.replace(/\s+/g, " ").trim();
const coupe = (s: string, n = 400) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export const creerParserRss = () =>
  new Parser({
    timeout: 20000,
    headers: { "user-agent": USER_AGENT },
    customFields: {
      item: [
        ["media:content", "mediaContent", { keepArray: true }],
        ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
        ["content:encoded", "contentEncoded"],
      ],
    },
  });

export async function fetchRss(src: SourceConfig): Promise<ItemBrut[]> {
  const xml = await recupererTexte(src.url);
  if (!/^\s*(<\?xml|<rss|<feed|<rdf)/i.test(xml)) throw new Error("réponse non RSS (page HTML ou blocage anti-robot)");
  const parser = creerParserRss();
  const flux = await parser.parseString(xml);
  return flux.items
    .filter((i) => i.title && i.link)
    .map((i) => {
      const resume = cheerio.load(`<div>${i.contentSnippet ?? i.content ?? i.summary ?? ""}</div>`)("div").text();
      return {
        titre: nettoyer(i.title!),
        url: i.link!,
        extrait: coupe(nettoyer(resume)),
        date: i.isoDate ?? (i.pubDate ? new Date(i.pubDate).toISOString() : null),
        lieu: null,
        image: imageDepuisItemRss(i, i.link!),
      };
    });
}

export function extraireHtml(html: string, src: SourceConfig): ItemBrut[] {
  const $ = cheerio.load(html);
  const sel = src.selecteurs ?? { item: "a" };
  const vus = new Set<string>();
  const items: ItemBrut[] = [];
  $(sel.item).each((_, el) => {
    const $el = $(el);
    const cible = sel.titre ? $el.find(sel.titre).first() : $el;
    const titre = nettoyer(cible.text());
    const a = sel.lien ? $el.find(sel.lien).first() : $el.is("a") ? $el : $el.find("a").first();
    let href = a.attr("href");
    // cartes sans lien (ex. Jobotropo) : ancre sur la page source, avec l'identifiant de la carte si présent
    if (!href && !$el.is("a") && sel.item !== "a") href = `#${$el.attr("data-job-id") ?? encodeURIComponent(titre.slice(0, 60))}`;
    if (!titre || !href || (href.startsWith("#") && $el.is("a")) || href.startsWith("mailto:") || href.startsWith("javascript:")) return;
    let url: string;
    try { url = new URL(href, src.url).toString(); } catch { return; }
    if (vus.has(url)) return;
    vus.add(url);
    const img = $el.is("img") ? $el : $el.find("img").first();
    items.push({
      image: img.length ? urlImage(img.attr("src") ?? img.attr("data-src") ?? img.attr("data-lazy-src") ?? img.attr("srcset") ?? img.attr("data-srcset"), src.url) : null,
      titre: coupe(titre, 200),
      url,
      extrait: sel.extrait ? coupe(nettoyer($el.find(sel.extrait).first().text())) : $el.is("a") ? "" : coupe(nettoyer($el.text()), 600),
      date: sel.date ? nettoyer($el.find(sel.date).first().text()) || null : null,
      lieu: sel.lieu ? nettoyer($el.find(sel.lieu).map((_, e) => $(e).text()).get().join(" / ")) || null : null,
      studio: sel.studio ? nettoyer($el.find(sel.studio).first().text()) || null : null,
    });
  });
  return items;
}

export async function fetchHtml(src: SourceConfig): Promise<ItemBrut[]> {
  return extraireHtml(await recupererTexte(src.url), src);
}

// Playwright : navigateur partagé, fermé en fin de collecte.
let navigateur: import("playwright").Browser | null = null;

export async function fetchPlaywright(src: SourceConfig): Promise<ItemBrut[]> {
  if (!(await robotsAutorise(src.url))) throw new Error("interdit par robots.txt");
  if (!navigateur) {
    const { chromium } = await import("playwright");
    navigateur = await chromium.launch({ headless: true });
  }
  await attendreTour(src.url);
  const ctx = await navigateur.newContext({ userAgent: USER_AGENT, locale: "fr-FR" });
  try {
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    return extraireHtml(await page.content(), src);
  } finally {
    await ctx.close();
  }
}

export async function fermerNavigateur(): Promise<void> {
  if (navigateur) await navigateur.close().catch(() => {});
  navigateur = null;
}

export async function recuperer(src: SourceConfig): Promise<ItemBrut[]> {
  if (src.methode === "rss") return fetchRss(src);
  if (src.methode === "html") return fetchHtml(src);
  if (src.methode === "playwright") return fetchPlaywright(src);
  return [];
}
