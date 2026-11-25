import * as cheerio from "cheerio";
import { recupererTexte } from "./http.ts";
import type { Offre, Production, SourceConfig } from "./types.ts";

/** URL absolue en https uniquement ; sinon null (data:, http:, relative invalide, pixels de suivi évidents). */
export function urlImage(brut: unknown, base: string): string | null {
  if (typeof brut !== "string") return null;
  let v = brut.trim();
  if (!v || v.startsWith("data:")) return null;
  // srcset : on prend la première URL
  if (/\s\d+(\.\d+)?[wx](,|$)/.test(v) || v.includes(", ")) v = v.split(",")[0]!.trim().split(/\s+/)[0]!;
  try {
    const u = new URL(v, base);
    if (u.protocol !== "https:") return null;
    if (/(^|[/_-])(pixel|spacer|blank|1x1|tracking)\b/i.test(u.pathname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const meta = ($: cheerio.CheerioAPI, cles: string[]): string | undefined => {
  for (const c of cles) {
    const v = $(`meta[property='${c}'], meta[name='${c}']`).first().attr("content");
    if (v?.trim()) return v;
  }
  return undefined;
};

/** og:image, à défaut twitter:image, d'une page HTML. */
export function imageDepuisHtml(html: string, base: string): string | null {
  const $ = cheerio.load(html);
  return urlImage(meta($, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]), base);
}

/** Logo d'un site : apple-touch-icon (carré), sinon og:image, sinon icône du site. */
export function logoDepuisHtml(html: string, base: string): string | null {
  const $ = cheerio.load(html);
  const touch = $("link[rel~='apple-touch-icon'], link[rel='apple-touch-icon-precomposed']").first().attr("href");
  const og = meta($, ["og:image:secure_url", "og:image", "twitter:image"]);
  const icones = $("link[rel~='icon']").toArray()
    .map((e) => ({ href: $(e).attr("href"), taille: parseInt(($(e).attr("sizes") ?? "0").split("x")[0]!, 10) || 0 }))
    .filter((i) => i.href && !/\.ico(\?|$)/i.test(i.href))
    .sort((a, b) => b.taille - a.taille);
  return urlImage(touch, base) ?? urlImage(og, base) ?? urlImage(icones[0]?.href, base);
}

/** Première image d'un fragment HTML (corps d'un item RSS ou carte HTML). */
export function premiereImageHtml(fragment: string, base: string): string | null {
  const $ = cheerio.load(`<div>${fragment}</div>`);
  const img = $("img").first();
  if (!img.length) return null;
  return urlImage(img.attr("src") ?? img.attr("data-src") ?? img.attr("data-lazy-src") ?? img.attr("srcset") ?? img.attr("data-srcset"), base);
}

// item rss-parser avec champs personnalisés
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ItemRss = any;

const EST_IMAGE = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Image d'un item RSS : enclosure, media:content, media:thumbnail, puis première <img> du contenu. */
export function imageDepuisItemRss(item: ItemRss, base: string): string | null {
  const enc = item.enclosure;
  if (enc?.url && (String(enc.type ?? "").startsWith("image/") || EST_IMAGE.test(enc.url))) {
    const u = urlImage(enc.url, base);
    if (u) return u;
  }
  for (const m of [...liste(item.mediaContent), ...liste(item.mediaThumbnail)] as ItemRss[]) {
    const a = m?.$ ?? m;
    const type = String(a?.type ?? ""), medium = String(a?.medium ?? "");
    if (type && !type.startsWith("image/") && medium !== "image" && !EST_IMAGE.test(a?.url ?? "")) continue;
    const u = urlImage(a?.url, base);
    if (u) return u;
  }
  for (const c of [item.contentEncoded, item["content:encoded"], item.content, item.summary, item.description]) {
    if (typeof c === "string" && c.includes("<img")) {
      const u = premiereImageHtml(c, base);
      if (u) return u;
    }
  }
  return null;
}

/* ---------- Enrichissement (pages d'articles, logos de studios) ---------- */

/** Une vraie page d'offre : pas une ancre de la page source, pas la page source elle-même. */
export function estPageOffre(url: string, source: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hash) return false;
    const s = new URL(source);
    if (u.origin === s.origin && u.pathname.replace(/\/$/, "") === s.pathname.replace(/\/$/, "") && u.search === s.search) return false;
    return u.pathname.replace(/\//g, "") !== "";
  } catch {
    return false;
  }
}

export async function imageDePage(url: string): Promise<string | null> {
  try { return imageDepuisHtml(await recupererTexte(url), url); } catch { return null; }
}

const logos = new Map<string, Promise<string | null>>();
/** Logo du site d'un studio : une seule fois par domaine par collecte. */
export function logoStudio(urlSite: string): Promise<string | null> {
  let origine: string;
  try { origine = new URL(urlSite).origin; } catch { return Promise.resolve(null); }
  if (!logos.has(origine)) {
    logos.set(origine, (async () => {
      try { return logoDepuisHtml(await recupererTexte(`${origine}/`), `${origine}/`); } catch { return null; }
    })());
  }
  return logos.get(origine)!;
}

async function enParallele<T>(items: T[], n: number, f: (x: T) => Promise<void>): Promise<void> {
  const file = [...items];
  await Promise.all(Array.from({ length: Math.min(n, file.length) }, async () => {
    for (let x = file.shift(); x !== undefined; x = file.shift()) await f(x);
  }));
}

export const MAX_PAGES_OFFRES = 60;
export const MAX_PAGES_PRODS = 120;

export interface StatsImages { reutilisees: number; trouvees: number; sans: number }

/**
 * Complète les images manquantes. Réutilise celles du fichier précédent ; n'ouvre de pages que pour
 * les éléments sans image (plafonné, le reste est repris à la collecte suivante).
 */
export async function enrichirImages(
  offres: Offre[], prods: Production[], prevOffres: Offre[], prevProds: Production[], configs: SourceConfig[],
): Promise<{ offres: StatsImages; prods: StatsImages }> {
  const cfg = new Map(configs.map((c) => [c.id, c]));
  const so: StatsImages = { reutilisees: 0, trouvees: 0, sans: 0 };
  const sp: StatsImages = { reutilisees: 0, trouvees: 0, sans: 0 };
  const po = new Map(prevOffres.map((o) => [o.id, o]));
  const pp = new Map(prevProds.map((p) => [p.id, p]));

  const aFaireO: Offre[] = [];
  for (const o of offres) {
    if (o.image) continue;
    const prev = po.get(o.id)?.image;
    if (prev) { o.image = prev; so.reutilisees++; } else aFaireO.push(o);
  }
  const aFaireP: Production[] = [];
  for (const p of prods) {
    if (p.image) continue;
    const prev = pp.get(p.id)?.image;
    if (prev) { p.image = prev; sp.reutilisees++; } else aFaireP.push(p);
  }

  await enParallele(aFaireP.slice(0, MAX_PAGES_PRODS), 4, async (p) => {
    for (const s of p.sources) {
      const img = await imageDePage(s.url);
      if (img) { p.image = img; sp.trouvees++; return; }
    }
  });
  await enParallele(aFaireO.slice(0, MAX_PAGES_OFFRES), 4, async (o) => {
    for (const s of o.sources) {
      const c = cfg.get(s.sourceId);
      if (c && estPageOffre(s.url, c.url)) {
        const img = await imageDePage(s.url);
        if (img) { o.image = img; so.trouvees++; return; }
      }
    }
    // repli : logo du studio, seulement quand la source est le site du studio lui-même
    const site = o.sources.map((s) => cfg.get(s.sourceId)).find((c) => c?.type === "carriere-studio");
    if (site) {
      const logo = await logoStudio(site.url);
      if (logo) { o.image = logo; so.trouvees++; }
    }
  });
  so.sans = offres.filter((o) => !o.image).length;
  sp.sans = prods.filter((p) => !p.image).length;
  return { offres: so, prods: sp };
}
