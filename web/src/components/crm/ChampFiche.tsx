"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { Champ } from "@/components/ui";
import { ecrire, libellesDe, valeur } from "@/lib/crm";
import type { Contact, CrmColonne } from "@/lib/types";

/** Champ d’une colonne du tableau dans la fiche contact (colonnes personnalisées comprises). */
export function ChampFiche({ col, c, onChange }: { col: CrmColonne; c: Contact; onChange: (p: Partial<Contact>) => void }) {
  const v = valeur(c, col);
  const set = (x: unknown) => onChange(ecrire(c, col, x));
  const [tags, setTags] = useState(Array.isArray(v) ? (v as string[]).join(", ") : "");
  const texte = (type: string) => (
    <input className="champ" type={type} value={v === null || v === undefined ? "" : String(v)} onChange={(e) => set(e.target.value === "" ? null : type === "number" ? Number(e.target.value) : e.target.value)} />
  );
  switch (col.type) {
    case "texte_long":
      return <Champ label={col.titre} className="sm:col-span-2"><textarea className="champ" value={(v as string) ?? ""} onChange={(e) => set(e.target.value || null)} /></Champ>;
    case "statut":
      return (
        <Champ label={col.titre}>
          <select className="champ" value={(v as string) ?? ""} onChange={(e) => set(e.target.value || null)}>
            <option value="">—</option>
            {libellesDe(col).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </Champ>
      );
    case "etiquettes":
      return <Champ label={`${col.titre} (séparées par des virgules)`} className="sm:col-span-2"><input className="champ" value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => set(tags.split(",").map((x) => x.trim()).filter(Boolean))} /></Champ>;
    case "case":
      return (
        <div className="flex flex-col gap-1"><span className="meta">{col.titre}</span>
          <label className="flex h-[38px] items-center gap-2 text-[13px]"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={!!v} onChange={(e) => set(e.target.checked)} />{v ? "Oui" : "Non"}</label>
        </div>
      );
    case "note": {
      const n = Number(v) || 0;
      return (
        <div className="flex flex-col gap-1"><span className="meta">{col.titre}</span>
          <div className="flex h-[38px] items-center gap-1" role="radiogroup" aria-label={col.titre}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" role="radio" aria-checked={n === i} aria-label={`${i} sur 5`} onClick={() => set(n === i ? null : i)}><Star className={`h-5 w-5 ${i <= n ? "fill-[#fdab3d] text-[#fdab3d]" : "text-muted"}`} /></button>
            ))}
          </div>
        </div>
      );
    }
    case "date": return <Champ label={col.titre}>{texte("date")}</Champ>;
    case "nombre": return <Champ label={col.titre}>{texte("number")}</Champ>;
    case "email": return <Champ label={col.titre}>{texte("email")}</Champ>;
    case "telephone": return <Champ label={col.titre}>{texte("tel")}</Champ>;
    default: return <Champ label={col.titre}>{texte("text")}</Champ>;
  }
}
