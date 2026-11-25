"use client";

import { Compass, Orbit, Waypoints } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Onglets, Vide } from "@/components/ui";
import { useStore } from "@/lib/store";
import { Presentation } from "./Presentation";
import { Proximite } from "./Proximite";

// Graphe canvas : chargé côté client seulement (compatible export statique).
const Carte = dynamic(() => import("./Carte"), {
  ssr: false,
  loading: () => <div className="grid h-[60vh] min-h-[320px] place-items-center rounded-2xl border border-line bg-surface text-[13px] text-muted">Chargement de la carte…</div>,
});

type Vue = "presenter" | "proximite" | "carte";

/** Onglet « Réseau » de la page Contacts : chemins vers un studio, proximité, carte. */
export function Reseau({ onContact, onStudio }: { onContact: (id: string) => void; onStudio: (id: string) => void }) {
  const s = useStore();
  const [vue, setVue] = useState<Vue>("presenter");
  if (s.data.contacts.length === 0) {
    return <Vide icone={Waypoints} titre="Ton réseau est vide">Ajoute des personnes dans l’onglet Personnes, puis relie-les à des studios : tu verras ici qui peut te présenter à qui.</Vide>;
  }
  return (
    <div>
      <div className="mb-4 max-sm:[&_svg]:hidden">
        <Onglets valeur={vue} onChange={setVue} options={[
          { id: "presenter", label: <><Compass className="h-3.5 w-3.5" />Qui peut me présenter ?</> },
          { id: "proximite", label: <><Orbit className="h-3.5 w-3.5" />Proximité</> },
          { id: "carte", label: <><Waypoints className="h-3.5 w-3.5" />Carte</> },
        ]} />
      </div>
      {vue === "presenter" && <Presentation onContact={onContact} onStudio={onStudio} />}
      {vue === "proximite" && <Proximite onContact={onContact} />}
      {vue === "carte" && <Carte onContact={onContact} onStudio={onStudio} />}
    </div>
  );
}
