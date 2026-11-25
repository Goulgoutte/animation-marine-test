"use client";

import { ArrowDownUp, BellRing, Check, Eye, Filter, Plus, Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ListeMobile } from "@/components/crm/ListeMobile";
import { Popover } from "@/components/crm/Popover";
import { Tableau } from "@/components/crm/Tableau";
import { useCrm } from "@/components/crm/useCrm";
import { FicheContact } from "@/components/FicheContact";
import { Champ, EnTete, Sheet, Vide } from "@/components/ui";
import { couleurEtiquette, encre, libellesDe } from "@/lib/crm";
import { useIndicateurs } from "@/lib/indicateurs";

const MOBILE = "(max-width: 767px)";
function useMobile() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(MOBILE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(MOBILE).matches,
    () => false,
  );
}

export default function Contacts() {
  const crm = useCrm();
  const { s } = crm;
  const { contactsARecontacter, actionsContacts } = useIndicateurs();
  const mobile = useMobile();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState(false);

  useEffect(() => {
    if (s.focus?.kind === "contact") {
      setOuvert(s.focus.id);
      s.setFocus(null);
    }
  }, [s.focus, s]);

  const courant = s.data.contacts.find((c) => c.id === ouvert) ?? null;
  const actifs = crm.filtre ? 1 : 0;

  return (
    <>
      <EnTete
        titre="Contacts"
        description={contactsARecontacter.length > 0 ? <><strong className="font-semibold text-warn">{contactsARecontacter.length}</strong> à recontacter (plus de {s.reglages.delai_contact_mois} mois sans échange)</> : "Ton réseau professionnel"}
      />
      {actionsContacts.length > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] px-3.5 py-2.5 text-[13px] font-medium">
          <BellRing className="h-4 w-4 flex-none text-warn" />{actionsContacts.length} prochaine{actionsContacts.length > 1 ? "s" : ""} action{actionsContacts.length > 1 ? "s" : ""} arrivée{actionsContacts.length > 1 ? "s" : ""} à échéance dans les journaux d’échanges.
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="champ !pl-9" placeholder="Chercher un nom, un studio…" aria-label="Chercher un contact" value={crm.q} onChange={(e) => crm.setQ(e.target.value)} />
        </label>
        <BoutonFiltre crm={crm} actifs={actifs} nbRappel={contactsARecontacter.length} />
        {!mobile && <BoutonTri crm={crm} />}
        {!mobile && crm.masquees.length > 0 && <BoutonMasquees crm={crm} />}
        <button className="bouton bouton-plein ml-auto" onClick={() => setNouveau(true)}><Plus />Nouveau contact</button>
      </div>

      {s.data.contacts.length === 0 && s.data.crm_groupes.length === 0 ? (
        <Vide icone={Users} titre="Aucun contact" action={<button className="bouton bouton-plein" onClick={() => setNouveau(true)}><Plus />Ajouter un contact</button>}>
          Note ici les personnes rencontrées (superviseurs, chargées de production, RH…) et chaque échange : l’app te rappelle de reprendre contact au bout de {s.reglages.delai_contact_mois} mois.
        </Vide>
      ) : mobile ? (
        <ListeMobile crm={crm} onOuvrir={setOuvert} />
      ) : (
        <Tableau crm={crm} onOuvrir={setOuvert} />
      )}

      {courant && <FicheContact c={courant} onClose={() => setOuvert(null)} />}
      {nouveau && (
        <Sheet titre="Nouveau contact" onClose={() => setNouveau(false)}>
          <NouveauContact crm={crm} onCreer={(id) => { setNouveau(false); setOuvert(id); }} />
        </Sheet>
      )}
    </>
  );
}

function BoutonFiltre({ crm, actifs, nbRappel }: { crm: ReturnType<typeof useCrm>; actifs: number; nbRappel: number }) {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLButtonElement>(null);
  const cols = crm.colonnes.filter((c) => c.type === "statut" || c.type === "etiquettes");
  const est = (col: string, val: string) => crm.filtre?.col === col && crm.filtre.val === val;
  const choisir = (col: string, val: string) => crm.setFiltre(est(col, val) ? null : { col, val });
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="dialog" className={`bouton ${actifs ? "!border-accent !bg-accent-soft !text-accent-strong" : ""}`} onClick={() => setOuvert(!ouvert)}><Filter />Filtrer{actifs ? " (1)" : ""}</button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={() => setOuvert(false)} largeur={300} label="Filtrer les contacts">
          <div className="max-h-80 space-y-2.5 overflow-y-auto p-1">
            <div>
              <p className="meta mb-1">Suivi</p>
              <button type="button" className="puce" aria-pressed={est("__rappel", "1")} onClick={() => choisir("__rappel", "1")}>À recontacter <span className="opacity-70">{nbRappel}</span></button>
            </div>
            {cols.map((col) => {
              const options = col.type === "statut" ? libellesDe(col).map((l) => ({ val: l.id, label: l.label, coul: l.couleur })) : Array.from(new Set([...libellesDe(col).map((l) => l.label), ...crm.s.data.contacts.flatMap((c) => (col.systeme ? c.etiquettes : ((c.champs?.[col.id] as string[]) ?? [])))])).map((t) => ({ val: t, label: t, coul: couleurEtiquette(col, t) }));
              return (
                <div key={col.id}>
                  <p className="meta mb-1">{col.titre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((o) => (
                      <button key={o.val} type="button" aria-pressed={est(col.id, o.val)} onClick={() => choisir(col.id, o.val)} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-semibold ring-offset-1 ring-offset-[var(--surface)]" style={{ background: o.coul, color: encre(o.coul), boxShadow: est(col.id, o.val) ? `0 0 0 2px var(--surface), 0 0 0 4px ${o.coul}` : undefined, opacity: crm.filtre && !est(col.id, o.val) ? 0.7 : 1 }}>
                        {est(col.id, o.val) && <Check className="h-3 w-3" />}{o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {crm.filtre && <button type="button" className="mt-1 flex w-full items-center gap-1.5 border-t border-line px-2.5 pb-1 pt-2 text-muted hover:text-fg" onClick={() => crm.setFiltre(null)}><X className="h-3.5 w-3.5" />Retirer le filtre</button>}
        </Popover>
      )}
    </>
  );
}

function BoutonTri({ crm }: { crm: ReturnType<typeof useCrm> }) {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLButtonElement>(null);
  const t = crm.tri;
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="dialog" className={`bouton ${t ? "!border-accent !bg-accent-soft !text-accent-strong" : ""}`} onClick={() => setOuvert(!ouvert)}><ArrowDownUp />Trier</button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={() => setOuvert(false)} largeur={250} label="Trier les contacts">
          <div className="space-y-2 p-1">
            <select className="champ" aria-label="Trier par" value={t?.col ?? ""} onChange={(e) => crm.setTri(e.target.value ? { col: e.target.value, dir: t?.dir ?? 1 } : null)}>
              <option value="">Ordre du tableau</option>
              <option value="nom">Contact (nom)</option>
              {crm.visibles.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
            {t && (
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" className={`bouton bouton-petit ${t.dir === 1 ? "!border-accent !bg-accent-soft !text-accent-strong" : ""}`} onClick={() => crm.setTri({ ...t, dir: 1 })}>A → Z</button>
                <button type="button" className={`bouton bouton-petit ${t.dir === -1 ? "!border-accent !bg-accent-soft !text-accent-strong" : ""}`} onClick={() => crm.setTri({ ...t, dir: -1 })}>Z → A</button>
              </div>
            )}
          </div>
        </Popover>
      )}
    </>
  );
}

function BoutonMasquees({ crm }: { crm: ReturnType<typeof useCrm> }) {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={ancre} type="button" aria-haspopup="dialog" className="bouton" onClick={() => setOuvert(!ouvert)}><Eye />Colonnes masquées ({crm.masquees.length})</button>
      {ouvert && (
        <Popover ancre={ancre.current} onClose={() => setOuvert(false)} largeur={250} label="Colonnes masquées">
          <ul>
            {crm.masquees.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate font-medium">{c.titre}</span>
                <button type="button" className="bouton bouton-petit" onClick={() => crm.patchColonne(c.id, { masquee: false })}>Afficher</button>
              </li>
            ))}
          </ul>
        </Popover>
      )}
    </>
  );
}

function NouveauContact({ crm, onCreer }: { crm: ReturnType<typeof useCrm>; onCreer: (id: string) => void }) {
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [structure, setStructure] = useState("");
  const [groupe, setGroupe] = useState(crm.premier ?? "");
  return (
    <form className="grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      const c = crm.ajouterContact(groupe, "");
      crm.patchContact(c.id, { prenom: prenom.trim(), nom: nom.trim(), structure: structure.trim() || null });
      onCreer(c.id);
    }}>
      <Champ label="Prénom"><input className="champ" autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} /></Champ>
      <Champ label="Nom"><input className="champ" required value={nom} onChange={(e) => setNom(e.target.value)} /></Champ>
      <Champ label="Studio ou structure"><input className="champ" value={structure} onChange={(e) => setStructure(e.target.value)} /></Champ>
      <Champ label="Groupe">
        <select className="champ" value={groupe} onChange={(e) => setGroupe(e.target.value)}>
          {crm.groupes.map((g) => <option key={g.id} value={g.id}>{g.titre}</option>)}
        </select>
      </Champ>
      <button className="bouton bouton-plein">Créer et ouvrir la fiche</button>
    </form>
  );
}
