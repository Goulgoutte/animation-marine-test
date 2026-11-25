import { STATUTS, labelStatut, type Statut } from "@/lib/types";

export const couleurStatut = (s: Statut) => STATUTS.find((x) => x.id === s)?.couleur ?? "#888";

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <span className="badge" style={{ ["--c" as string]: couleurStatut(statut) }}>
      <span className="pastille !h-1.5 !w-1.5" style={{ background: couleurStatut(statut) }} />{labelStatut(statut)}
    </span>
  );
}
