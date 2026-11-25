// Collecteurs structurés : API ou flux publics des ATS (Lever, Recruitee, Teamtailor, Workable, SmartRecruiters, WeRecruit).
// Aucune page n'est "scrapée" : ce sont des endpoints publics faits pour être lus par des machines.
import * as cheerio from "cheerio";
import { recupererTexte } from "./http.ts";
import type { ItemBrut, SourceConfig } from "./types.ts";

const nettoyer = (s: string) => s.replace(/\s+/g, " ").trim();
const coupe = (s: string, n = 600) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const texteHtml = (h: string | null | undefined) => (h ? nettoyer(cheerio.load(`<div>${h}</div>`)("div").text()) : "");
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const t = typeof v === "number" ? v : Date.parse(String(v));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};
const lieuDe = (...p: (string | null | undefined | false)[]) => nettoyer(p.filter(Boolean).join(", ")) || null;
const spontanee = (t: string) => /spontan|candidature libre|open application/i.test(t);

/** Identifiant de société dans l'URL publique de l'ATS. */
export function slugAts(methode: string, url: string): string {
  const u = new URL(url);
  const p = u.pathname.split("/").filter(Boolean);
  switch (methode) {
    case "lever": return u.hostname === "api.lever.co" ? p[2] : p[0];
    case "recruitee":
    case "teamtailor": return u.hostname.split(".")[0];
    case "workable": return u.hostname === "apply.workable.com" ? p[0] : u.hostname.split(".")[0];
    case "smartrecruiters": return u.hostname === "api.smartrecruiters.com" ? p[2] : p[0];
    default: return p[0] ?? "";
  }
}

export function lever(json: unknown, src: SourceConfig): ItemBrut[] {
  if (!Array.isArray(json)) throw new Error("réponse Lever inattendue");
  return json.flatMap((j: any) => {
    if (!j?.text || !j?.hostedUrl) return [];
    const c = j.categories ?? {};
    return [{
      titre: nettoyer(j.text), url: j.hostedUrl, studio: src.studio ?? null,
      lieu: lieuDe(c.location, c.allLocations?.join?.(", "), j.workplaceType === "remote" && "Remote"),
      extrait: coupe(nettoyer(`${c.team ?? ""} ${c.commitment ?? ""} ${j.descriptionPlain ?? ""}`)),
      date: iso(j.createdAt),
    }];
  });
}

export function recruitee(json: any, _src: SourceConfig): ItemBrut[] {
  if (!Array.isArray(json?.offers)) throw new Error("réponse Recruitee inattendue");
  return json.offers.flatMap((o: any) => o?.title && o?.careers_url ? [{
    titre: nettoyer(o.title), url: o.careers_url, studio: o.company_name ?? null,
    lieu: lieuDe(o.city, o.country, o.remote && "Remote"),
    extrait: coupe(nettoyer(`${o.department ?? ""} ${texteHtml(o.description)}`)),
    date: iso(o.published_at ?? o.created_at),
  }] : []);
}

export function workable(json: any, _src: SourceConfig): ItemBrut[] {
  if (!Array.isArray(json?.jobs)) throw new Error("réponse Workable inattendue");
  return json.jobs.flatMap((j: any) => j?.title && j?.url ? [{
    titre: nettoyer(j.title), url: j.url, studio: json.name ?? null,
    lieu: lieuDe(j.city, j.country, j.telecommuting && "Remote"),
    extrait: coupe(nettoyer(`${j.department ?? ""} ${texteHtml(j.description)}`)),
    date: iso(j.published_on ?? j.created_at),
  }] : []);
}

export function smartrecruiters(json: any, src: SourceConfig): ItemBrut[] {
  if (!Array.isArray(json?.content)) throw new Error("réponse SmartRecruiters inattendue");
  const slug = slugAts("smartrecruiters", src.url);
  return json.content.flatMap((j: any) => j?.name && j?.id ? [{
    titre: nettoyer(j.name), url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`, studio: j.company?.name ?? null,
    lieu: lieuDe(j.location?.city, j.location?.country, j.location?.remote && "Remote"),
    extrait: coupe(nettoyer(`${j.department?.label ?? ""} ${j.function?.label ?? ""} ${j.typeOfEmployment?.label ?? ""}`)),
    date: iso(j.releasedDate),
  }] : []);
}

/** Les pages WeRecruit embarquent leurs offres dans `window.allOffers = [...]`. */
export function werecruit(html: string, src: SourceConfig): ItemBrut[] {
  const i = html.indexOf("window.allOffers");
  if (i < 0) throw new Error("liste d'offres WeRecruit introuvable");
  const debut = html.indexOf("[", i);
  let profondeur = 0, fin = -1, chaine = false;
  for (let k = debut; k < html.length; k++) {
    const ch = html[k];
    if (chaine) { if (ch === "\\") k++; else if (ch === '"') chaine = false; continue; }
    if (ch === '"') chaine = true;
    else if (ch === "[") profondeur++;
    else if (ch === "]" && --profondeur === 0) { fin = k; break; }
  }
  if (fin < 0) throw new Error("liste d'offres WeRecruit tronquée");
  const offres = JSON.parse(html.slice(debut, fin + 1)) as any[];
  return offres.flatMap((o) => {
    const titre = nettoyer(o.TitleTranslated ?? Object.values(o.Title ?? {})[0] ?? "");
    if (!titre || !o.Url || spontanee(titre)) return [];
    return [{
      titre: titre.replace(/\s+F\/[HM]$/, ""), url: o.Url,
      studio: o.Subsidiary_Name ?? o.Company_Name ?? src.studio ?? null,
      lieu: lieuDe(o.Address_City, o.Address_State),
      extrait: coupe(nettoyer(`${o.TypeTranslated ?? ""} ${o.TimeTranslated ?? ""}`)),
      date: iso(o.PublicationStartDate),
    }];
  });
}

const URL_API: Record<string, (slug: string) => string> = {
  lever: (s) => `https://api.lever.co/v0/postings/${s}?mode=json`,
  recruitee: (s) => `https://${s}.recruitee.com/api/offers/`,
  workable: (s) => `https://apply.workable.com/api/v1/widget/accounts/${s}?details=true`,
  smartrecruiters: (s) => `https://api.smartrecruiters.com/v1/companies/${s}/postings?limit=100`,
  teamtailor: (s) => `https://${s}.teamtailor.com/jobs.rss`,
};
export const urlApi = (methode: string, url: string) => URL_API[methode]?.(slugAts(methode, url)) ?? url;

export async function fetchAts(src: SourceConfig): Promise<ItemBrut[]> {
  if (src.methode === "werecruit") return werecruit(await recupererTexte(src.url), src);
  const brut = await recupererTexte(urlApi(src.methode, src.url));
  switch (src.methode) {
    case "lever": return lever(JSON.parse(brut), src);
    case "recruitee": return recruitee(JSON.parse(brut), src);
    case "workable": return workable(JSON.parse(brut), src);
    case "smartrecruiters": return smartrecruiters(JSON.parse(brut), src);
    default: throw new Error(`méthode ATS inconnue : ${src.methode}`);
  }
}
