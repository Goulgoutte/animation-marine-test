import { Clapperboard } from "lucide-react";

export function Logo({ taille = 32, texte = true }: { taille?: number; texte?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid flex-none place-items-center text-white shadow-[0_2px_8px_rgb(91_91_214/0.4)]"
        style={{ width: taille, height: taille, borderRadius: taille * 0.3, background: "linear-gradient(135deg,#7b7bf0,#4d4dc8)" }}
      >
        <Clapperboard style={{ width: taille * 0.52, height: taille * 0.52 }} />
      </span>
      {texte && <span className="text-[15px] font-bold tracking-tight">Veille animation</span>}
    </span>
  );
}
