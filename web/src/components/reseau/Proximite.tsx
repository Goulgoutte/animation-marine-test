"use client";

import { useMemo, useRef, useState } from "react";
import { Vide } from "@/components/ui";
import { initiales } from "@/components/ui";
import { ancienneteTexte, liesAuStudio, placerAnneaux, proches, type Proche } from "@/lib/reseau";
import { useStore } from "@/lib/store";
import { Orbit } from "lucide-react";

const C = 320;
const RAYONS: [number, number][] = [[46, 130], [130, 215], [215, 300]];
const R_POINT = 17;
const NOMS_ANNEAU = ["Moins d’un mois", "Moins de 3 mois", "Plus ancien ou jamais"];

type Filtre = "tous" | "amis" | "contacts";

export function Proximite({ onContact }: { onContact: (id: string) => void }) {
  const s = useStore();
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [studio, setStudio] = useState("");
  const [actif, setActif] = useState<string | null>(null);
  const tactile = useRef(false);

  const tous = useMemo(() => [...proches(s.data).values()], [s.data]);
  const visibles = useMemo(() => {
    const liesIds = studio ? new Set(liesAuStudio(s.data, { cle: studio, nom: s.data.studios.find((x) => x.id === studio)?.nom ?? "", studioId: studio, origine: "fiche" }).keys()) : null;
    return tous.filter((p) => (filtre === "tous" || (filtre === "amis" ? p.ami : !p.ami)) && (!liesIds || liesIds.has(p.contact.id)));
  }, [tous, filtre, studio, s.data]);
  const points = useMemo(() => placerAnneaux(visibles.map((p) => ({ ...p, id: p.contact.id })), RAYONS, R_POINT), [visibles]);
  const courant = points.find((p) => p.item.id === actif) ?? null;

  const choisir = (p: Proche) => onContact(p.contact.id);
  const puce = (id: Filtre, label: string) => <button type="button" className="puce" aria-pressed={filtre === id} onClick={() => setFiltre(id)}>{label}</button>;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {puce("tous", "Tous")}{puce("amis", "Amis")}{puce("contacts", "Contacts")}
        <select className="champ !w-auto max-w-full" aria-label="Filtrer par studio" value={studio} onChange={(e) => setStudio(e.target.value)}>
          <option value="">Tous les studios</option>
          {s.data.studios.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </div>

      {visibles.length === 0 ? (
        <Vide icone={Orbit} titre="Personne à afficher">Change de filtre, ou ajoute des amis et des contacts à ce studio depuis sa fiche.</Vide>
      ) : (
        <div className="mx-auto w-full max-w-[640px] rounded-2xl border border-line bg-surface p-2 shadow-[var(--ombre)]">
          <svg viewBox="0 0 640 640" className="block h-auto w-full" role="group" aria-label="Proximité : anneaux autour de toi" onPointerDown={(e) => { tactile.current = e.pointerType !== "mouse"; }}>
            {[...RAYONS].reverse().map(([, r1], i) => (
              <circle key={r1} cx={C} cy={C} r={r1} fill={`color-mix(in srgb, var(--accent) ${3 + (2 - i) * 2}%, var(--surface))`} stroke="var(--line)" strokeWidth={1} strokeDasharray={i === 0 ? undefined : "4 5"} />
            ))}
            {RAYONS.map(([, r1], i) => (
              <text key={i} x={C} y={C - r1 + 13} textAnchor="middle" fontSize={10.5} fill="var(--muted)" style={{ pointerEvents: "none" }}>{NOMS_ANNEAU[i]}</text>
            ))}
            <circle cx={C} cy={C} r={30} fill="var(--accent)" />
            <text x={C} y={C + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--accent-fg)">Toi</text>
            {points.map(({ item, x, y }) => {
              const couleur = item.ami ? "var(--danger)" : "var(--accent)";
              const nom = item.nom;
              return (
                <g key={item.id} transform={`translate(${C + x} ${C + y})`} role="button" tabIndex={0} aria-label={`${nom}${item.ami ? ", ami" : ""} : ${ancienneteTexte(item.jours)}`} style={{ cursor: "pointer", outline: "none" }}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActif(item.id)} onPointerLeave={(e) => e.pointerType === "mouse" && setActif(null)}
                  onFocus={() => setActif(item.id)} onBlur={() => setActif(null)}
                  onClick={() => { if (tactile.current && actif !== item.id) setActif(item.id); else choisir(item); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choisir(item); } }}>
                  <circle r={R_POINT + 6} fill="transparent" />
                  <circle r={R_POINT} fill={`color-mix(in srgb, ${couleur} 22%, var(--surface))`} stroke={couleur} strokeWidth={actif === item.id ? 3 : 2} />
                  <text y={4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={couleur} style={{ pointerEvents: "none" }}>{initiales(nom)}</text>
                </g>
              );
            })}
            {courant && (() => {
              const w = Math.max(courant.item.nom.length * 7 + 18, 90);
              const cx = Math.min(Math.max(C + courant.x, w / 2 + 4), 640 - w / 2 - 4);
              const cy = C + courant.y - R_POINT - 30 < 4 ? C + courant.y + R_POINT + 6 : C + courant.y - R_POINT - 34;
              return (
                <g style={{ pointerEvents: "none" }} transform={`translate(${cx} ${cy})`}>
                  <rect x={-w / 2} width={w} height={28} rx={8} fill="var(--fg)" />
                  <text y={12} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--surface)">{courant.item.nom}</text>
                  <text y={23} textAnchor="middle" fontSize={9.5} fill="var(--surface)" opacity={0.75}>{ancienneteTexte(courant.item.jours)}</text>
                </g>
              );
            })()}
          </svg>
        </div>
      )}
      <p className="micro flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" />Ami</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Contact</span>
        <span>Plus loin = pas vu depuis longtemps</span>
      </p>
    </div>
  );
}
