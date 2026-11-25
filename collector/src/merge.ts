import { createHash } from "node:crypto";
import { normaliser } from "./classify.ts";
import type { Offre, Production, SourceRef } from "./types.ts";

const JOUR = 86_400_000;
export const JOURS_EXPIREE = 14;
const JOURS_PURGE_OFFRE = 60;
const JOURS_PURGE_PROD = 180;

const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const cle = (s: string | null | undefined) =>
  normaliser(s ?? "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export const idOffre = (studio: string | null, titre: string) => hash(`${cle(studio)}|${cle(titre)}`);
export const idProduction = (titre: string) => hash(cle(titre));

function fusionnerSources(a: SourceRef[], b: SourceRef[]): SourceRef[] {
  const m = new Map<string, SourceRef>();
  for (const s of [...a, ...b]) {
    const k = `${s.sourceId}|${s.url}`;
    const existant = m.get(k);
    if (!existant || existant.vuLe < s.vuLe) m.set(k, s);
  }
  return [...m.values()];
}

const plusRecent = (sources: SourceRef[]) => sources.reduce((max, s) => (s.vuLe > max ? s.vuLe : max), "");

/** Dédoublonne les offres d'une même collecte (même id = même offre relayée). */
export function dedoublonnerOffres(offres: Offre[]): Offre[] {
  const m = new Map<string, Offre>();
  for (const o of offres) {
    const e = m.get(o.id);
    if (!e) { m.set(o.id, o); continue; }
    m.set(o.id, {
      ...e,
      extrait: e.extrait.length >= o.extrait.length ? e.extrait : o.extrait,
      image: e.image ?? o.image ?? null,
      sources: fusionnerSources(e.sources, o.sources),
    });
  }
  return [...m.values()];
}

export function dedoublonnerProductions(prods: Production[]): Production[] {
  const m = new Map<string, Production>();
  for (const p of prods) {
    const e = m.get(p.id);
    if (!e) { m.set(p.id, p); continue; }
    m.set(p.id, {
      ...e,
      extrait: e.extrait.length >= p.extrait.length ? e.extrait : p.extrait,
      image: e.image ?? p.image ?? null,
      sources: fusionnerSources(e.sources, p.sources),
    });
  }
  return [...m.values()];
}

/** Fusionne la collecte du jour avec le fichier précédent : conserve premiereVue, recalcule l'expiration. */
export function fusionnerOffres(nouvelles: Offre[], precedentes: Offre[], maintenant: Date): Offre[] {
  const now = maintenant.getTime();
  const prev = new Map(precedentes.map((o) => [o.id, o]));
  const res = new Map<string, Offre>();
  for (const n of dedoublonnerOffres(nouvelles)) {
    const p = prev.get(n.id);
    res.set(n.id, p ? { ...n, image: n.image ?? p.image ?? null, premiereVue: p.premiereVue, sources: fusionnerSources(p.sources, n.sources) } : n);
  }
  // absentes aujourd'hui : on les garde (une source en panne ne doit rien effacer), sauf si trop vieilles
  for (const p of precedentes) {
    if (!res.has(p.id)) res.set(p.id, p);
  }
  const sortie: Offre[] = [];
  for (const o of res.values()) {
    const vu = Date.parse(plusRecent(o.sources)) || Date.parse(o.premiereVue);
    const age = (now - vu) / JOUR;
    if (age > JOURS_PURGE_OFFRE) continue;
    const limite = o.dateLimite ? Date.parse(o.dateLimite) : NaN;
    o.probablementExpiree = (!Number.isNaN(limite) && limite < now) || age > JOURS_EXPIREE;
    sortie.push(o);
  }
  return sortie.sort((a, b) => b.premiereVue.localeCompare(a.premiereVue));
}

export function fusionnerProductions(nouvelles: Production[], precedentes: Production[], maintenant: Date): Production[] {
  const now = maintenant.getTime();
  const prev = new Map(precedentes.map((p) => [p.id, p]));
  const res = new Map<string, Production>();
  for (const n of dedoublonnerProductions(nouvelles)) {
    const p = prev.get(n.id);
    res.set(n.id, p ? { ...n, image: n.image ?? p.image ?? null, premiereVue: p.premiereVue, sources: fusionnerSources(p.sources, n.sources) } : n);
  }
  for (const p of precedentes) if (!res.has(p.id)) res.set(p.id, p);
  return [...res.values()]
    .filter((p) => (now - (Date.parse(plusRecent(p.sources)) || Date.parse(p.premiereVue))) / JOUR <= JOURS_PURGE_PROD)
    .sort((a, b) => b.premiereVue.localeCompare(a.premiereVue));
}
