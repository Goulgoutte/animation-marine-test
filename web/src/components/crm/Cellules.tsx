"use client";

import { Check, ExternalLink, Pencil, Plus, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { tonFraicheur, dernierEchange } from "@/lib/contacts";
import { couleurEtiquette, ecrire, encre, libellesDe, valeur } from "@/lib/crm";
import { diffDays, fmtCourt, ilYa, today } from "@/lib/dates";
import type { Contact, CrmColonne, Echange, Libelle } from "@/lib/types";
import { EditeurLibelles } from "./Libelles";
import { Popover } from "./Popover";

export interface PropsCellule {
  col: CrmColonne;
  c: Contact;
  echanges: Echange[];
  delaiMois: number;
  onChange: (p: Partial<Contact>) => void;
  onLibelles: (col: CrmColonne, l: Libelle[]) => void;
}

const base = "flex h-full w-full min-w-0 items-center px-2.5 text-left";

/** Champ texte en place : clic pour éditer, Entrée valide, Échap annule. */
function ChampEnPlace({ v, type = "text", onCommit, afficher, placeholder, lien }: { v: string; type?: string; onCommit: (v: string) => void; afficher?: (v: string) => React.ReactNode; placeholder?: string; lien?: { href: string; label: string } }) {
  const [edit, setEdit] = useState(false);
  const [brouillon, setBrouillon] = useState(v);
  const fini = useRef(false);
  function valider(garder: boolean) {
    if (fini.current) return;
    fini.current = true;
    setEdit(false);
    if (garder && brouillon !== v) onCommit(brouillon);
  }
  if (edit) {
    return (
      <input
        autoFocus
        type={type}
        className="h-full w-full min-w-0 bg-surface px-2.5 outline-none ring-2 ring-inset ring-accent"
        value={brouillon}
        placeholder={placeholder}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={() => valider(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") valider(true);
          if (e.key === "Escape") valider(false);
        }}
      />
    );
  }
  return (
    <div className="group/c flex h-full w-full min-w-0 items-center">
      <button type="button" className={`${base} flex-1 hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]`} onClick={() => { fini.current = false; setBrouillon(v); setEdit(true); }}>
        <span className="truncate">{v ? (afficher ? afficher(v) : v) : <span className="text-transparent group-hover/c:text-muted">{placeholder ?? "—"}</span>}</span>
      </button>
      {lien && v && <a href={lien.href} target="_blank" rel="noopener noreferrer" aria-label={lien.label} className="mr-1.5 grid h-6 w-6 flex-none place-items-center rounded-md text-muted hover:bg-accent-soft hover:text-accent"><ExternalLink className="h-3.5 w-3.5" /></a>}
    </div>
  );
}

function CelluleStatut({ col, c, onChange, onLibelles }: PropsCellule) {
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState(false);
  const ancre = useRef<HTMLButtonElement>(null);
  const v = valeur(c, col) as string | null;
  const l = libellesDe(col).find((x) => x.id === v);
  const fermer = () => { setOuvert(false); setEdition(false); };
  return (
    <div className="h-full p-[3px]">
      <button ref={ancre} type="button" aria-haspopup="dialog" aria-label={`${col.titre} : ${l?.label ?? "vide"}`} onClick={() => setOuvert(!ouvert)} className="flex h-full w-full items-center justify-center rounded-[5px] px-2 text-[12.5px] font-semibold transition-[filter] hover:brightness-95" style={l ? { background: l.couleur, color: encre(l.couleur) } : { background: "color-mix(in srgb, var(--fg) 7%, transparent)", color: "var(--muted)" }}>
        <span className="truncate">{l?.label ?? ""}</span>
      </button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={fermer} largeur={edition ? 280 : 220} label={`Libellés de ${col.titre}`}>
          {edition ? (
            <EditeurLibelles libelles={libellesDe(col)} onCancel={() => setEdition(false)} onSave={(x) => { onLibelles(col, x); setEdition(false); }} />
          ) : (
            <>
              <ul className="space-y-1 p-0.5">
                {libellesDe(col).map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => { onChange(ecrire(c, col, x.id)); fermer(); }} className="flex h-8 w-full items-center justify-center rounded-md text-[12.5px] font-semibold transition-[filter] hover:brightness-95" style={{ background: x.couleur, color: encre(x.couleur) }}>
                      {x.label}
                    </button>
                  </li>
                ))}
              </ul>
              {v && <button type="button" className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]" onClick={() => { onChange(ecrire(c, col, null)); fermer(); }}><X className="h-3.5 w-3.5" />Effacer</button>}
              <button type="button" className="mt-1 flex w-full items-center gap-2 border-t border-line px-2.5 pb-1 pt-2 font-medium text-accent hover:underline" onClick={() => setEdition(true)}><Pencil className="h-3.5 w-3.5" />Modifier les libellés</button>
            </>
          )}
        </Popover>
      )}
    </div>
  );
}

function CelluleEtiquettes({ col, c, onChange, onLibelles }: PropsCellule) {
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState(false);
  const [nouveau, setNouveau] = useState("");
  const ancre = useRef<HTMLButtonElement>(null);
  const v = (valeur(c, col) as string[]) ?? [];
  const toutes = Array.from(new Set([...libellesDe(col).map((l) => l.label), ...v]));
  const bascule = (t: string) => onChange(ecrire(c, col, v.includes(t) ? v.filter((x) => x !== t) : [...v, t]));
  function creer() {
    const t = nouveau.trim();
    if (!t) return;
    if (!libellesDe(col).some((l) => l.label === t)) onLibelles(col, [...libellesDe(col), { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, label: t, couleur: couleurEtiquette(col, t) }]);
    if (!v.includes(t)) onChange(ecrire(c, col, [...v, t]));
    setNouveau("");
  }
  const fermer = () => { setOuvert(false); setEdition(false); };
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="dialog" aria-label={`${col.titre} : ${v.join(", ") || "vide"}`} onClick={() => setOuvert(!ouvert)} className={`${base} gap-1 overflow-hidden hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]`}>
        {v.map((t) => <span key={t} className="flex-none rounded-md px-1.5 py-px text-[11.5px] font-semibold" style={{ background: couleurEtiquette(col, t), color: encre(couleurEtiquette(col, t)) }}>{t}</span>)}
      </button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={fermer} largeur={edition ? 280 : 240} label={`Étiquettes de ${col.titre}`}>
          {edition ? (
            <EditeurLibelles libelles={libellesDe(col)} onCancel={() => setEdition(false)} onSave={(x) => { onLibelles(col, x); setEdition(false); }} />
          ) : (
            <>
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {toutes.map((t) => {
                  const coul = couleurEtiquette(col, t);
                  const on = v.includes(t);
                  return (
                    <li key={t}>
                      <button type="button" role="checkbox" aria-checked={on} onClick={() => bascule(t)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]">
                        <span className={`grid h-4 w-4 flex-none place-items-center rounded border ${on ? "border-accent bg-accent text-accent-fg" : "border-line"}`}>{on && <Check className="h-3 w-3" />}</span>
                        <span className="rounded-md px-1.5 py-px text-[12px] font-semibold" style={{ background: coul, color: encre(coul) }}>{t}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <form className="mt-1 flex gap-1 border-t border-line pt-2" onSubmit={(e) => { e.preventDefault(); creer(); }}>
                <input className="champ !h-7 !px-2 !py-0 !text-[13px]" aria-label="Nouvelle étiquette" placeholder="Nouvelle étiquette" value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
                <button className="bouton bouton-petit bouton-icone flex-none" aria-label="Ajouter l’étiquette"><Plus /></button>
              </form>
              <button type="button" className="mt-1 flex w-full items-center gap-2 px-2 py-1.5 font-medium text-accent hover:underline" onClick={() => setEdition(true)}><Pencil className="h-3.5 w-3.5" />Modifier les libellés</button>
            </>
          )}
        </Popover>
      )}
    </>
  );
}

function CelluleTexteLong({ col, c, onChange }: PropsCellule) {
  const [ouvert, setOuvert] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const ancre = useRef<HTMLButtonElement>(null);
  const v = (valeur(c, col) as string | null) ?? "";
  const fait = useRef(false);
  const valider = (garder: boolean) => {
    if (fait.current) return;
    fait.current = true;
    setOuvert(false);
    if (garder && brouillon !== v) onChange(ecrire(c, col, brouillon || null));
  };
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="dialog" aria-label={`${col.titre} : modifier`} onClick={() => { fait.current = false; setBrouillon(v); setOuvert(true); }} className={`${base} hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]`}>
        <span className="truncate">{v}</span>
      </button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={() => valider(true)} surEchap={() => valider(false)} largeur={320} label={col.titre}>
          <textarea autoFocus className="champ !min-h-[120px]" aria-label={col.titre} value={brouillon} onChange={(e) => setBrouillon(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) valider(true); }} />
          <p className="micro mt-1 px-0.5">Cmd/Ctrl + Entrée pour valider, Échap pour annuler.</p>
        </Popover>
      )}
    </>
  );
}

export function Cellule(p: PropsCellule) {
  const { col, c, echanges, delaiMois, onChange } = p;
  const v = valeur(c, col);
  const set = (x: unknown) => onChange(ecrire(c, col, x));
  switch (col.type) {
    case "dernier_echange": {
      const d = dernierEchange(c.id, echanges);
      if (!d) return <span className={`${base} text-muted`}>Jamais</span>;
      const j = diffDays(today(), d);
      const ton = tonFraicheur(j, delaiMois);
      return (
        <span className={`${base} gap-2 c-${ton}`} title={`Dernier échange : ${fmtCourt(d)}`}>
          <span className="flex-none rounded-md px-1.5 py-px text-[11.5px] font-semibold" style={{ background: "color-mix(in srgb, var(--c) 16%, transparent)", color: "var(--c)" }}>{j <= 1 ? ilYa(j) : `il y a ${j} j`}</span>
          <span className="micro truncate">{fmtCourt(d)}</span>
        </span>
      );
    }
    case "statut": return <CelluleStatut {...p} />;
    case "etiquettes": return <CelluleEtiquettes {...p} />;
    case "texte_long": return <CelluleTexteLong {...p} />;
    case "case":
      return (
        <button type="button" role="checkbox" aria-checked={!!v} aria-label={col.titre} onClick={() => set(!v)} className="grid h-full w-full place-items-center hover:bg-[color-mix(in_srgb,var(--fg)_4%,transparent)]">
          <span className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border-2 ${v ? "border-accent bg-accent text-accent-fg" : "border-[color-mix(in_srgb,var(--muted)_55%,transparent)]"}`}>{v ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}</span>
        </button>
      );
    case "note": {
      const n = Number(v) || 0;
      return (
        <div className={`${base} gap-0.5`} role="radiogroup" aria-label={col.titre}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={n === i} aria-label={`${i} sur 5`} onClick={() => set(n === i ? null : i)} className="grid h-6 w-5 place-items-center">
              <Star className={`h-4 w-4 ${i <= n ? "fill-[#fdab3d] text-[#fdab3d]" : "text-[color-mix(in_srgb,var(--muted)_50%,transparent)]"}`} />
            </button>
          ))}
        </div>
      );
    }
    case "date": {
      const s = (v as string | null) ?? "";
      const retard = !!s && s <= today() && col.cle === "prochaine_action";
      return <ChampEnPlace v={s} type="date" onCommit={(x) => set(x || null)} afficher={(x) => <span className={retard ? "font-semibold text-danger" : ""}>{fmtCourt(x)}</span>} />;
    }
    case "nombre": return <ChampEnPlace v={v === null || v === undefined ? "" : String(v)} type="number" onCommit={(x) => set(x === "" ? null : Number(x))} />;
    case "email": return <ChampEnPlace v={(v as string) ?? ""} type="email" onCommit={(x) => set(x || null)} lien={{ href: `mailto:${v}`, label: "Écrire un e-mail" }} />;
    case "telephone": return <ChampEnPlace v={(v as string) ?? ""} type="tel" onCommit={(x) => set(x || null)} lien={{ href: `tel:${String(v ?? "").replace(/\s/g, "")}`, label: "Appeler" }} />;
    case "lien": {
      const s = (v as string) ?? "";
      return <ChampEnPlace v={s} onCommit={(x) => set(x || null)} afficher={(x) => <span className="text-accent">{x.replace(/^https?:\/\/(www\.)?/, "")}</span>} lien={/^https?:\/\//.test(s) ? { href: s, label: "Ouvrir le lien" } : undefined} placeholder="https://" />;
    }
    default: return <ChampEnPlace v={(v as string) ?? ""} onCommit={(x) => set(x || null)} />;
  }
}
