// Pages « Résultats des commissions » du CNC (aide aux techniques d'animation) : titre, producteur, format.
import * as cheerio from "cheerio";
import { recupererTexte } from "./http.ts";
import type { FormatProd, ItemBrut, SourceConfig } from "./types.ts";

/** « LES CHIENS NE FONT PAS DES CHATS » -> « Les chiens ne font pas des chats » (le CNC écrit tout en capitales). */
export function titreCasse(s: string): string {
  const t = s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase()) return t; // déjà en casse mixte : on ne touche pas
  const bas = t.toLowerCase().replace(/\s+([!?;:])/g, " $1");
  return bas.replace(/^(\P{L}*)(\p{L})/u, (_m, a: string, b: string) => a + b.toUpperCase());
}

/** « XILAM FILMS » -> « Xilam Films » : les noms de sociétés prennent une majuscule à chaque mot. */
export function nomCasse(s: string): string {
  const t = s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase()) return t;
  const PETITS = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "au", "aux", "d'", "l'", "sur", "pour"]);
  return t.toLowerCase().replace(/(^|[\s(&'’-])(\p{L}+)/gu, (m, a: string, mot: string, i: number) => (i > 0 && PETITS.has(mot) ? m : a + mot.charAt(0).toUpperCase() + mot.slice(1)));
}

export function formatCnc(s: string): FormatProd {
  const t = s.toLowerCase();
  if (/long/.test(t)) return "long-metrage";
  if (/court|vid[eé]omusique|clip/.test(t)) return "court";
  if (/s[eé]rie/.test(t)) return "serie";
  if (/unitaire|sp[eé]cial|t[eé]l[eé]film/.test(t)) return "special-tv";
  return "inconnu";
}

export interface LigneCnc { titre: string; producteur: string; nature: string; format: FormatProd; montant: string }

export function extraireCnc(html: string): LigneCnc[] {
  const $ = cheerio.load(html);
  const lignes: LigneCnc[] = [];
  $("table tr").each((_, tr) => {
    const c = $(tr).find("td").map((_, td) => $(td).text().replace(/ /g, " ").replace(/\s+/g, " ").trim()).get();
    if (c.length < 3 || !c[0] || !c[1]) return;
    lignes.push({ titre: titreCasse(c[0]), producteur: nomCasse(c[1]), nature: c[2], format: formatCnc(c[2]), montant: c[3] ?? "" });
  });
  return lignes;
}

/** Une ligne = un projet aidé. Le producteur et l'aide vont dans l'extrait, que le classement des productions relit. */
export async function fetchCnc(src: SourceConfig): Promise<ItemBrut[]> {
  const lignes = extraireCnc(await recupererTexte(src.url));
  const vus = new Set<string>();
  const items: ItemBrut[] = [];
  for (const l of lignes) {
    const cle = `${l.titre}|${l.producteur}`.toLowerCase();
    if (vus.has(cle)) continue;
    vus.add(cle);
    items.push({
      titre: l.titre,
      url: src.url,
      extrait: `Projet aidé par le CNC (aide aux techniques d'animation) : ${l.nature.toLowerCase()}, produit par ${l.producteur}${l.montant ? `, ${l.montant} €` : ""}. Animation.`,
      date: null,
      lieu: null,
      studio: l.producteur,
      format: l.format,
      producteurs: [l.producteur],
    });
  }
  return items;
}
