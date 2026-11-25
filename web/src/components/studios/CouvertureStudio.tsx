"use client";

import { useEffect, useRef, useState } from "react";

const teinte = (s: string) => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

/** Bandeau de couverture : image du studio, sinon dégradé et collines déterministes d’après le nom. */
export function CouvertureStudio({ image, nom, className = "" }: { image?: string | null; nom: string; className?: string }) {
  const [cassee, setCassee] = useState<string | null>(null);
  const [prete, setPrete] = useState<string | null>(null);
  const ok = !!image && cassee !== image;
  const img = useRef<HTMLImageElement>(null);
  // L’image peut être déjà chargée avant l’hydratation : onLoad ne se déclenche alors plus.
  useEffect(() => {
    const e = img.current;
    if (e?.complete && e.naturalWidth > 0) setPrete(image ?? null);
  }, [image]);
  const h = 215 + (teinte(nom) % 140); // bleus, violets, roses : dans la palette de l’app
  const h2 = (h + 48) % 360;
  const d = teinte(`${nom}~`) % 40; // déplace les collines d’un studio à l’autre
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`} aria-hidden>
      <div className="absolute inset-0" style={{ background: `radial-gradient(110% 120% at 85% 0%, hsl(${h2} 85% 72% / .55), transparent 60%), linear-gradient(145deg, hsl(${h} 62% 52%), hsl(${h2} 58% 36%))` }}>
        <svg viewBox="0 0 900 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
          <circle cx={560 + d * 8} cy="62" r="22" fill="#fff" opacity=".22" />
          <path d={`M0 ${120 + d / 2} C160 ${70 + d} 300 ${130 - d / 2} 450 ${112 + d / 3} S740 ${70 + d / 2} 900 ${118 - d / 3} V200 H0Z`} fill="#fff" opacity=".13" />
          <path d={`M0 ${158 - d / 4} C200 ${126 + d / 2} 360 ${176 - d / 3} 540 ${152 + d / 4} S800 ${130 + d / 3} 900 ${160 - d / 5} V200 H0Z`} fill="#000" opacity=".17" />
        </svg>
      </div>
      {ok && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={img} src={image!} alt="" referrerPolicy="no-referrer" decoding="async" onError={() => setCassee(image!)} onLoad={() => setPrete(image!)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${prete === image ? "opacity-100" : "opacity-0"}`} />
      )}
    </div>
  );
}
