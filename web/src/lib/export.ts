export function telecharger(nom: string, contenu: string, mime: string) {
  const blob = new Blob([contenu], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join(" | ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return `"${s.replace(/"/g, '""')}"`;
};

/** CSV pour Excel français : séparateur « ; » et BOM UTF-8. */
export function csv(colonnes: { cle: string; titre: string }[], lignes: Record<string, unknown>[]): string {
  const tete = colonnes.map((c) => cell(c.titre)).join(";");
  const corps = lignes.map((l) => colonnes.map((c) => cell(l[c.cle])).join(";"));
  return "﻿" + [tete, ...corps].join("\r\n");
}

export function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}
