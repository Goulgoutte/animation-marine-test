"use client";

import ForceGraph2D from "react-force-graph-2d";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vide } from "@/components/ui";
import { initiales } from "@/components/ui";
import { proches, TYPES_LIEN } from "@/lib/reseau";
import { useStore } from "@/lib/store";
import { Waypoints } from "lucide-react";

type Noeud = { id: string; kind: "moi" | "contact" | "studio"; nom: string; ami?: boolean; force?: number; x?: number; y?: number };
type Arete = { source: string; target: string; poids: number; ton: "lien" | "studio" | "moi" };

const EPAISSEUR_LIEN: Record<string, number> = { presente_par: 3, ami: 2.5, collegue: 2, meme_ecole: 1.5, autre: 1 };

function lireCouleurs() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim() || "#888";
  return { fg: v("--fg"), muted: v("--muted"), line: v("--line"), surface: v("--surface"), accent: v("--accent"), accentFg: v("--accent-fg"), ami: v("--danger"), surface2: v("--surface-2") };
}

/** Graphe force-dirigé personnes ↔ studios (canvas, zoom et glisser). */
export default function Carte({ onContact, onStudio }: { onContact: (id: string) => void; onStudio: (id: string) => void }) {
  const s = useStore();
  const boite = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fg = useRef<any>(undefined);
  const cadre = useRef(false);
  const [taille, setTaille] = useState({ w: 0, h: 0 });
  const [couleurs, setCouleurs] = useState<ReturnType<typeof lireCouleurs> | null>(null);

  // Couleurs du thème, relues à chaque changement de thème (clair, sombre, automatique).
  useEffect(() => {
    const maj = () => setCouleurs(lireCouleurs());
    maj();
    const mo = new MutationObserver(maj);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", maj);
    return () => { mo.disconnect(); mq.removeEventListener("change", maj); };
  }, []);

  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTaille({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setTaille({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const graphe = useMemo(() => {
    const pr = proches(s.data);
    const noeuds: Noeud[] = [{ id: "moi", kind: "moi", nom: "Toi" }];
    const aretes: Arete[] = [];
    for (const p of pr.values()) {
      noeuds.push({ id: p.contact.id, kind: "contact", nom: p.nom, ami: p.ami, force: p.force });
      aretes.push({ source: "moi", target: p.contact.id, poids: 0.6, ton: "moi" });
    }
    const studiosUtiles = new Set(s.data.contact_studios.map((l) => l.studio_id));
    for (const st of s.data.studios) if (studiosUtiles.has(st.id)) noeuds.push({ id: `s:${st.id}`, kind: "studio", nom: st.nom });
    for (const l of s.data.contact_studios) if (pr.has(l.contact_id) && studiosUtiles.has(l.studio_id) && s.data.studios.some((x) => x.id === l.studio_id)) aretes.push({ source: l.contact_id, target: `s:${l.studio_id}`, poids: l.role === "ami" ? 2 : 1.3, ton: "studio" });
    for (const l of s.data.liens_contacts) if (pr.has(l.contact_a) && pr.has(l.contact_b)) aretes.push({ source: l.contact_a, target: l.contact_b, poids: EPAISSEUR_LIEN[l.type] ?? 1, ton: "lien" });
    return { nodes: noeuds, links: aretes };
  }, [s.data]);

  if (s.data.contacts.length === 0) return <Vide icone={Waypoints} titre="Rien à cartographier">Ajoute des personnes et relie-les à des studios.</Vide>;

  const c = couleurs;
  return (
    <div className="grid gap-2">
      <div ref={boite} className="h-[60vh] min-h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--ombre)]" style={{ touchAction: "none" }} role="img" aria-label="Carte du réseau : personnes et studios reliés">
        {c && taille.w > 0 && (
          <ForceGraph2D
            ref={fg}
            width={taille.w}
            height={taille.h}
            graphData={graphe}
            backgroundColor="rgba(0,0,0,0)"
            cooldownTicks={120}
            onEngineStop={() => { if (!cadre.current) { cadre.current = true; fg.current?.zoomToFit(300, 56); } }}
            linkColor={(l) => { const t = (l as unknown as Arete).ton; return t === "lien" ? c.accent : t === "studio" ? c.muted : c.line; }}
            linkWidth={(l) => (l as unknown as Arete).poids}
            linkLineDash={(l) => ((l as unknown as Arete).ton === "studio" ? [4, 3] : null)}
            nodeRelSize={6}
            nodeLabel={(n) => (n as Noeud).nom}
            onNodeClick={(n) => { const x = n as Noeud; if (x.kind === "contact") onContact(x.id); else if (x.kind === "studio") onStudio(x.id.slice(2)); }}
            nodePointerAreaPaint={(n, col, ctx) => { const x = n as Noeud; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x.x ?? 0, x.y ?? 0, x.kind === "moi" ? 14 : 12, 0, 2 * Math.PI); ctx.fill(); }}
            nodeCanvasObject={(n, ctx, k) => {
              const x = n as Noeud;
              const px = x.x ?? 0, py = x.y ?? 0;
              ctx.textAlign = "center";
              if (x.kind === "moi") {
                ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(px, py, 11, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = c.accentFg; ctx.font = "700 8px Inter, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText("Toi", px, py + 0.5);
              } else if (x.kind === "contact") {
                const r = 5 + 6 * (x.force ?? 0);
                const col = x.ami ? c.ami : c.accent;
                ctx.fillStyle = c.surface; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
                ctx.fillStyle = col + "33"; ctx.fill();
                ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke();
                ctx.fillStyle = col; ctx.font = `700 ${Math.max(4.5, r * 0.8)}px Inter, sans-serif`; ctx.textBaseline = "middle"; ctx.fillText(initiales(x.nom), px, py + 0.5);
                if (k > 1.3) { ctx.fillStyle = c.fg; ctx.font = "500 4px Inter, sans-serif"; ctx.textBaseline = "top"; ctx.fillText(x.nom, px, py + r + 1.5); }
              } else {
                const t = 11;
                ctx.fillStyle = c.surface2; ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.rect(px - t / 2, py - t / 2, t, t); ctx.fill(); ctx.stroke();
                ctx.fillStyle = c.fg; ctx.font = "600 4.6px Inter, sans-serif"; ctx.textBaseline = "top"; ctx.fillText(x.nom, px, py + t / 2 + 1.5);
              }
            }}
          />
        )}
      </div>
      <p className="micro flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-danger" />Ami</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" />Contact</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 border border-muted bg-surface-2" />Studio</span>
        <span>Trait plein = lien entre personnes ({TYPES_LIEN.map((t) => t.label.toLowerCase()).join(", ")}) · pointillé = studio. Taille = force.</span>
      </p>
    </div>
  );
}
