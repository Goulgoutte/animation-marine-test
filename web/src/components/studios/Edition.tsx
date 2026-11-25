"use client";

import { useState } from "react";

/** Champ éditable en place : la valeur est enregistrée à la sortie du champ (ou sur Entrée). */
export function ChampTexte({ valeur, onSave, long, ...rest }: { valeur: string | null; onSave: (v: string | null) => void; long?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onBlur">) {
  const [v, setV] = useState(valeur ?? "");
  const fin = () => {
    const n = v.trim() || null;
    if (n !== (valeur ?? null)) onSave(n);
  };
  if (long) {
    return <textarea className="champ" value={v} onChange={(e) => setV(e.target.value)} onBlur={fin} placeholder={rest.placeholder} aria-label={rest["aria-label"]} />;
  }
  return <input className="champ" {...rest} value={v} onChange={(e) => setV(e.target.value)} onBlur={fin} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />;
}
