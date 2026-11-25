// Dates « jour » au format AAAA-MM-JJ, en heure locale du navigateur.
const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today(): string {
  return toISO(new Date());
}
export function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** Ajoute n jours ouvrés (hors samedi/dimanche ; les jours fériés ne sont pas pris en compte). */
export function addBusinessDays(iso: string, n: number): string {
  const d = parse(iso);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) left--;
  }
  return toISO(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
}
export function addMonths(iso: string, n: number): string {
  const d = parse(iso);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parse(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtCourt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parse(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]}`;
}
export function ilYa(n: number): string {
  if (n <= 0) return "aujourd’hui";
  if (n === 1) return "hier";
  return `il y a ${n} jours`;
}
export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
