"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Calendar, CheckSquare, ChevronDown, EyeOff, FolderInput, Hash, Link2, ListChecks, Mail, MoreHorizontal, PanelRightOpen, Pencil, Phone, Plus, Ruler, Star, Tag, Trash2, Type, AlignLeft } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { nomComplet, TYPES_COLONNE } from "@/lib/crm";
import type { Contact, CrmColonne, CrmGroupe, TypeColonne } from "@/lib/types";
import { Cellule } from "./Cellules";
import { EditeurLibelles, Palette } from "./Libelles";
import { ItemMenu, Popover } from "./Popover";
import type { Crm } from "./useCrm";

/** Mode sélection (envoi groupé) : contacts cochés. */
export interface SelectionContacts {
  ids: Set<string>;
  basculer: (id: string) => void;
}

const LARGEUR_NOM = 270;
const LARGEUR_PLUS = 52;

export const ICONES_TYPE: Record<TypeColonne, React.ComponentType<{ className?: string }>> = {
  texte: Type, texte_long: AlignLeft, statut: ListChecks, etiquettes: Tag, date: Calendar, nombre: Hash,
  lien: Link2, email: Mail, telephone: Phone, case: CheckSquare, note: Star, dernier_echange: Calendar,
};

/** Saisie d’une ligne de texte en place (groupe, ajout de contact). */
function SaisieEnPlace({ valeur, onValider, onAnnuler, placeholder, label, continu }: { valeur: string; onValider: (v: string) => void; onAnnuler: () => void; placeholder?: string; label: string; continu?: boolean }) {
  const [v, setV] = useState(valeur);
  const fini = useRef(false);
  const fin = (ok: boolean) => {
    if (fini.current) return;
    if (ok && v.trim()) onValider(v.trim());
    if (!continu || !ok || !v.trim()) { fini.current = true; onAnnuler(); } else setV("");
  };
  return (
    <input
      autoFocus
      aria-label={label}
      className="h-7 min-w-0 flex-1 rounded-md bg-surface px-2 text-[13.5px] outline-none ring-2 ring-accent"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (!continu) fin(true); else { fini.current = true; onAnnuler(); } }}
      onKeyDown={(e) => {
        if (e.key === "Enter") fin(true);
        if (e.key === "Escape") { fini.current = true; onAnnuler(); }
      }}
    />
  );
}

function NomEnPlace({ c, crm, onOuvrir, couleur, selection }: { c: Contact; crm: Crm; onOuvrir: () => void; couleur: string; selection?: SelectionContacts }) {
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState<"menu" | "deplacer">("menu");
  const ancreMenu = useRef<HTMLButtonElement>(null);
  const nom = nomComplet(c);
  return (
    <div className="flex h-full items-center gap-2 pl-3 pr-1.5" style={{ boxShadow: `inset 4px 0 0 ${couleur}` }}>
      {selection && <input type="checkbox" className="h-4 w-4 flex-none accent-[var(--accent)]" checked={selection.ids.has(c.id)} onChange={() => selection.basculer(c.id)} aria-label={`Sélectionner ${nom || "ce contact"}`} />}
      <Avatar nom={nom || "?"} taille={26} rond />
      {edit ? (
        <SaisieEnPlace label="Nom du contact" valeur={nom} onValider={(v) => { const m = v.trim().split(/\s+/); crm.patchContact(c.id, m.length > 1 ? { prenom: m[0], nom: m.slice(1).join(" ") } : { prenom: "", nom: m[0] }); }} onAnnuler={() => setEdit(false)} />
      ) : (
        <button type="button" className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left font-semibold hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]" onClick={() => setEdit(true)} title="Renommer">{nom || <span className="font-normal text-muted">Sans nom</span>}</button>
      )}
      <button type="button" className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted hover:bg-accent-soft hover:text-accent" aria-label={`Ouvrir la fiche de ${nom || "ce contact"}`} title="Ouvrir la fiche" onClick={onOuvrir}><PanelRightOpen className="h-4 w-4" /></button>
      <button ref={ancreMenu} type="button" aria-haspopup="menu" className="grid h-7 w-7 flex-none place-items-center rounded-md text-muted opacity-0 hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)] focus-visible:opacity-100 group-hover/r:opacity-100" aria-label={`Actions pour ${nom || "ce contact"}`} onClick={() => { setMode("menu"); setMenu(!menu); }}><MoreHorizontal className="h-4 w-4" /></button>
      {menu && (
        <Popover ancre={ancreMenu.current} onClose={() => setMenu(false)} largeur={220} label="Actions du contact">
          {mode === "menu" ? (
            <>
              <ItemMenu icone={PanelRightOpen} onClick={() => { setMenu(false); onOuvrir(); }}>Ouvrir la fiche</ItemMenu>
              <ItemMenu icone={FolderInput} onClick={() => setMode("deplacer")}>Déplacer vers…</ItemMenu>
              <ItemMenu icone={Trash2} danger onClick={() => { setMenu(false); if (confirm(`Supprimer ${nom || "ce contact"} et son journal d’échanges ?`)) crm.s.remove("contacts", c.id); }}>Supprimer</ItemMenu>
            </>
          ) : (
            <>
              <p className="meta px-2.5 pb-1 pt-1">Déplacer vers</p>
              {crm.groupes.map((g) => (
                <button key={g.id} type="button" disabled={g.id === crm.groupeDe(c)} onClick={() => { crm.deplacer(c.id, g.id); setMenu(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left font-medium hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)] disabled:opacity-40">
                  <span className="h-3 w-1 flex-none rounded-full" style={{ background: g.couleur }} /><span className="truncate">{g.titre}</span>
                </button>
              ))}
            </>
          )}
        </Popover>
      )}
    </div>
  );
}

function EnTeteColonne({ col, crm, premier, dernier }: { col: CrmColonne; crm: Crm; premier: boolean; dernier: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<"menu" | "renommer" | "largeur" | "libelles">("menu");
  const [titre, setTitre] = useState(col.titre);
  const ancre = useRef<HTMLButtonElement>(null);
  const Icone = ICONES_TYPE[col.type];
  const trie = crm.tri?.col === col.id ? crm.tri.dir : 0;
  const fermer = () => setOuvert(false);
  const aLibelles = col.type === "statut" || col.type === "etiquettes";
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="menu" aria-label={`Colonne ${col.titre}`} onClick={() => { setMode("menu"); setTitre(col.titre); setOuvert(!ouvert); }} className="group/h flex h-full w-full items-center gap-1.5 px-2.5 text-left hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]">
        <Icone className="h-3.5 w-3.5 flex-none text-muted" />
        <span className="min-w-0 flex-1 truncate font-semibold">{col.titre}</span>
        {trie !== 0 && (trie === 1 ? <ArrowUp className="h-3.5 w-3.5 flex-none text-accent" /> : <ArrowDown className="h-3.5 w-3.5 flex-none text-accent" />)}
        <ChevronDown className="h-3.5 w-3.5 flex-none text-muted opacity-0 group-hover/h:opacity-100" />
      </button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={fermer} largeur={mode === "libelles" ? 280 : 230} label={`Menu de la colonne ${col.titre}`}>
          {mode === "menu" && (
            <>
              <ItemMenu icone={Pencil} onClick={() => setMode("renommer")}>Renommer</ItemMenu>
              {aLibelles && <ItemMenu icone={Tag} onClick={() => setMode("libelles")}>Modifier les libellés</ItemMenu>}
              <ItemMenu icone={Ruler} onClick={() => setMode("largeur")}>Changer la largeur</ItemMenu>
              <ItemMenu icone={ArrowUp} onClick={() => { crm.setTri({ col: col.id, dir: 1 }); fermer(); }}>Trier A → Z</ItemMenu>
              <ItemMenu icone={ArrowDown} onClick={() => { crm.setTri({ col: col.id, dir: -1 }); fermer(); }}>Trier Z → A</ItemMenu>
              {trie !== 0 && <ItemMenu onClick={() => { crm.setTri(null); fermer(); }}>Retirer le tri</ItemMenu>}
              <div className="my-1 border-t border-line" />
              <ItemMenu icone={ArrowLeft} desactive={premier} onClick={() => { crm.deplacerColonne(col.id, -1); fermer(); }}>Déplacer à gauche</ItemMenu>
              <ItemMenu icone={ArrowRight} desactive={dernier} onClick={() => { crm.deplacerColonne(col.id, 1); fermer(); }}>Déplacer à droite</ItemMenu>
              <ItemMenu icone={EyeOff} onClick={() => { crm.patchColonne(col.id, { masquee: true }); fermer(); }}>Masquer</ItemMenu>
              {!col.systeme && <ItemMenu icone={Trash2} danger onClick={() => { fermer(); if (confirm(`Supprimer la colonne « ${col.titre} » et ses valeurs ?`)) crm.supprimerColonne(col.id); }}>Supprimer</ItemMenu>}
            </>
          )}
          {mode === "renommer" && (
            <form className="flex gap-1.5 p-1" onSubmit={(e) => { e.preventDefault(); if (titre.trim()) crm.patchColonne(col.id, { titre: titre.trim() }); fermer(); }}>
              <input autoFocus className="champ !h-8 !py-0" aria-label="Nom de la colonne" value={titre} onChange={(e) => setTitre(e.target.value)} />
              <button className="bouton bouton-plein bouton-petit">OK</button>
            </form>
          )}
          {mode === "largeur" && (
            <div className="p-1">
              <p className="meta mb-1.5 px-1">Largeur</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[["Étroite", 110], ["Normale", 170], ["Large", 250], ["Très large", 340]].map(([l, w]) => (
                  <button key={l} type="button" className={`bouton bouton-petit ${Math.abs(col.largeur - (w as number)) < 15 ? "!border-accent !bg-accent-soft !text-accent-strong" : ""}`} onClick={() => { crm.patchColonne(col.id, { largeur: w as number }); fermer(); }}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {mode === "libelles" && <EditeurLibelles libelles={col.options.libelles ?? []} onCancel={() => setMode("menu")} onSave={(l) => { crm.majLibelles(col, l); fermer(); }} />}
        </Popover>
      )}
    </>
  );
}

function AjoutColonne({ crm }: { crm: Crm }) {
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const ancre = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ancre} type="button" aria-label="Ajouter une colonne" title="Ajouter une colonne" onClick={() => setOuvert(!ouvert)} className="grid h-full w-full place-items-center text-muted hover:bg-accent-soft hover:text-accent"><Plus className="h-4 w-4" /></button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={() => setOuvert(false)} largeur={260} label="Nouvelle colonne">
          <p className="meta px-2 pb-1.5 pt-1">Nouvelle colonne</p>
          <input autoFocus className="champ !mb-1.5 !h-8 !py-0" aria-label="Nom de la nouvelle colonne" placeholder="Nom (facultatif)" value={titre} onChange={(e) => setTitre(e.target.value)} />
          <ul>
            {TYPES_COLONNE.map((t) => {
              const I = ICONES_TYPE[t.id];
              return <li key={t.id}><ItemMenu icone={I} onClick={() => { crm.ajouterColonne(titre, t.id); setTitre(""); setOuvert(false); setTimeout(() => { const d = document.getElementById("tableau-scroll"); d?.scrollTo({ left: d.scrollWidth }); }, 50); }}>{t.label}</ItemMenu></li>;
            })}
          </ul>
        </Popover>
      )}
    </>
  );
}

function TitreGroupe({ g, n, crm, premier, dernier }: { g: CrmGroupe; n: number; crm: Crm; premier: boolean; dernier: boolean }) {
  const [edit, setEdit] = useState(false);
  const [menu, setMenu] = useState<null | "menu" | "couleur">(null);
  const ancre = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-2">
      <button type="button" aria-expanded={!g.replie} aria-label={`${g.replie ? "Déplier" : "Replier"} le groupe ${g.titre}`} className="grid h-6 w-6 flex-none place-items-center rounded-md hover:bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]" style={{ color: g.couleur }} onClick={() => crm.patchGroupe(g.id, { replie: !g.replie })}>
        <ChevronDown className={`h-4 w-4 transition-transform ${g.replie ? "-rotate-90" : ""}`} />
      </button>
      {edit ? (
        <SaisieEnPlace label="Nom du groupe" valeur={g.titre} onValider={(v) => crm.patchGroupe(g.id, { titre: v })} onAnnuler={() => setEdit(false)} />
      ) : (
        <button type="button" className="rounded px-1.5 py-0.5 text-[15px] font-semibold hover:bg-[color-mix(in_srgb,var(--fg)_6%,transparent)]" style={{ color: g.couleur }} title="Renommer le groupe" onClick={() => setEdit(true)}>{g.titre}</button>
      )}
      <span className="micro" aria-label={`${n} contact${n > 1 ? "s" : ""}`}>{n} contact{n > 1 ? "s" : ""}</span>
      <button ref={ancre} type="button" aria-haspopup="menu" aria-label={`Options du groupe ${g.titre}`} className="grid h-6 w-6 flex-none place-items-center rounded-md text-muted hover:bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]" onClick={() => setMenu(menu ? null : "menu")}><MoreHorizontal className="h-4 w-4" /></button>
      {menu && (
        <Popover ancre={ancre.current} onClose={() => setMenu(null)} largeur={menu === "couleur" ? 200 : 220} label="Options du groupe">
          {menu === "menu" ? (
            <>
              <ItemMenu icone={Pencil} onClick={() => { setMenu(null); setEdit(true); }}>Renommer</ItemMenu>
              <ItemMenu icone={Palette_} onClick={() => setMenu("couleur")}>Couleur</ItemMenu>
              <ItemMenu icone={ArrowUp} desactive={premier} onClick={() => { crm.deplacerGroupe(g.id, -1); setMenu(null); }}>Monter</ItemMenu>
              <ItemMenu icone={ArrowDown} desactive={dernier} onClick={() => { crm.deplacerGroupe(g.id, 1); setMenu(null); }}>Descendre</ItemMenu>
              <ItemMenu icone={Trash2} danger desactive={crm.groupes.length < 2} onClick={() => { setMenu(null); if (confirm(`Supprimer le groupe « ${g.titre} » ? Ses contacts passent dans un autre groupe.`)) crm.supprimerGroupe(g.id); }}>Supprimer le groupe</ItemMenu>
            </>
          ) : (
            <Palette valeur={g.couleur} onChange={(c) => { crm.patchGroupe(g.id, { couleur: c }); setMenu(null); }} />
          )}
        </Popover>
      )}
    </div>
  );
}
const Palette_ = ({ className }: { className?: string }) => <span className={`${className} rounded-full bg-gradient-to-br from-[#e2445c] via-[#fdab3d] to-[#579bfc]`} />;

export function Tableau({ crm, onOuvrir, selection }: { crm: Crm; onOuvrir: (id: string) => void; selection?: SelectionContacts }) {
  const { visibles, groupes, s } = crm;
  const [ajout, setAjout] = useState<string | null>(null);
  const total = LARGEUR_NOM + visibles.reduce((a, c) => a + c.largeur, 0) + LARGEUR_PLUS;

  return (
    <div className="carte min-w-0 overflow-hidden">
      <div className="max-h-[calc(100dvh-250px)] min-h-[360px] overflow-auto" id="tableau-scroll">
        <div style={{ width: total, minWidth: "100%" }} role="table" aria-label="Contacts">
          <div role="row" className="sticky top-0 z-30 flex h-10 border-b border-line bg-surface-2 text-[12.5px]">
            <div role="columnheader" className="sticky left-0 z-10 flex flex-none items-center border-r border-line bg-surface-2 pl-6 font-semibold" style={{ width: LARGEUR_NOM }}>
              <button type="button" className="group/h flex h-full flex-1 items-center gap-1.5 text-left" onClick={() => crm.setTri(crm.tri?.col === "nom" && crm.tri.dir === 1 ? { col: "nom", dir: -1 } : { col: "nom", dir: 1 })} title="Trier par nom">
                Contact
                {crm.tri?.col === "nom" && (crm.tri.dir === 1 ? <ArrowUp className="h-3.5 w-3.5 text-accent" /> : <ArrowDown className="h-3.5 w-3.5 text-accent" />)}
              </button>
            </div>
            {visibles.map((col, i) => (
              <div role="columnheader" key={col.id} className="flex-none border-r border-line" style={{ width: col.largeur }}>
                <EnTeteColonne col={col} crm={crm} premier={i === 0} dernier={i === visibles.length - 1} />
              </div>
            ))}
            <div role="columnheader" className="sticky right-0 z-20 ml-auto flex-none border-l border-line bg-surface-2" style={{ width: LARGEUR_PLUS }}><AjoutColonne crm={crm} /></div>
          </div>

          {groupes.map((g, gi) => {
            const l = crm.lignes(g.id);
            return (
              <section key={g.id} aria-label={`Groupe ${g.titre}`} className="pb-3">
                <div className="sticky left-0 w-fit max-w-[100vw]"><TitreGroupe g={g} n={l.length} crm={crm} premier={gi === 0} dernier={gi === groupes.length - 1} /></div>
                {!g.replie && (
                  <>
                    {l.map((c) => (
                      <div role="row" key={c.id} className="group/r flex h-9 border-b border-line bg-surface text-[13px] hover:bg-surface-2">
                        <div role="rowheader" className="sticky left-0 z-10 flex-none border-r border-line bg-surface group-hover/r:bg-surface-2" style={{ width: LARGEUR_NOM }}>
                          <NomEnPlace c={c} crm={crm} couleur={g.couleur} selection={selection} onOuvrir={() => onOuvrir(c.id)} />
                        </div>
                        {visibles.map((col) => (
                          <div role="cell" key={col.id} className="min-w-0 flex-none overflow-hidden border-r border-line" style={{ width: col.largeur }}>
                            <Cellule col={col} c={c} echanges={s.data.echanges} delaiMois={s.reglages.delai_contact_mois} onChange={(p) => crm.patchContact(c.id, p)} onLibelles={crm.majLibelles} />
                          </div>
                        ))}
                      </div>
                    ))}
                    <div role="row" className="flex h-9 border-b border-line text-[13px]">
                      <div className="sticky left-0 z-10 flex flex-none items-center border-r border-line bg-surface pl-3 pr-2" style={{ width: LARGEUR_NOM, boxShadow: `inset 4px 0 0 color-mix(in srgb, ${g.couleur} 40%, transparent)` }}>
                        {ajout === g.id ? (
                          <SaisieEnPlace continu label={`Nom du nouveau contact dans ${g.titre}`} valeur="" placeholder="Prénom Nom, puis Entrée" onValider={(v) => crm.ajouterContact(g.id, v)} onAnnuler={() => setAjout(null)} />
                        ) : (
                          <button type="button" className="flex h-full flex-1 items-center gap-1.5 pl-1 text-left text-muted hover:text-accent" onClick={() => setAjout(g.id)}><Plus className="h-3.5 w-3.5" />Ajouter un contact</button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </section>
            );
          })}
          <button type="button" className="sticky left-0 m-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-accent hover:bg-accent-soft" onClick={() => crm.ajouterGroupe()}><Plus className="h-4 w-4" />Ajouter un groupe</button>
        </div>
      </div>
    </div>
  );
}
