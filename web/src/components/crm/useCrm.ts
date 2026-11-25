"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colonnesParDefaut, groupesParDefaut, decouperNom, libellesDe, rangSuivant, texteDe, triees, valeur } from "@/lib/crm";
import { dernierEchange } from "@/lib/contacts";
import { uid } from "@/lib/dates";
import { useStore } from "@/lib/store";
import type { Contact, CrmColonne, CrmGroupe, Libelle, TypeColonne } from "@/lib/types";
import { LIBELLES_NOUVEAU_STATUT, PALETTE, TYPES_COLONNE } from "@/lib/crm";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export interface Tri { col: string; dir: 1 | -1 }
export type Filtre = { col: string; val: string } | null;

/** État et opérations du CRM des contacts : colonnes, groupes, lignes filtrées et triées. */
export function useCrm() {
  const s = useStore();
  const { crm_colonnes, crm_groupes, contacts, echanges } = s.data;
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<Filtre>(null);
  const [tri, setTri] = useState<Tri | null>(null);
  const initialise = useRef(false);

  const colonnes = useMemo(() => triees(crm_colonnes), [crm_colonnes]);
  const groupes = useMemo(() => triees(crm_groupes), [crm_groupes]);
  const visibles = useMemo(() => colonnes.filter((c) => !c.masquee), [colonnes]);
  const masquees = useMemo(() => colonnes.filter((c) => c.masquee), [colonnes]);

  // Premier chargement : colonnes et groupes par défaut, contacts existants rangés dans le premier groupe.
  useEffect(() => {
    if (initialise.current) return;
    initialise.current = true;
    if (s.data.crm_colonnes.length > 0) return;
    colonnesParDefaut(() => uid()).forEach((c) => s.add("crm_colonnes", c));
    if (s.data.crm_groupes.length === 0) {
      const g = groupesParDefaut(() => uid()).map((x) => s.add("crm_groupes", x));
      s.data.contacts.forEach((k, i) => { if (!k.groupe_id) s.patch("contacts", k.id, { groupe_id: g[0].id, ordre: i }); });
    }
  }, [s]);

  const premier = groupes[0]?.id ?? null;
  const groupeDe = useCallback((c: Contact) => (c.groupe_id && groupes.some((g) => g.id === c.groupe_id) ? c.groupe_id : premier), [groupes, premier]);

  const lignes = useCallback((groupeId: string): Contact[] => {
    const t = norm(q.trim());
    const colFiltre = filtre && filtre.col !== "__rappel" ? colonnes.find((c) => c.id === filtre.col) : null;
    let l = contacts.filter((c) => groupeDe(c) === groupeId);
    if (filtre?.col === "__rappel") {
      const seuil = s.reglages.delai_contact_mois * 30;
      l = l.filter((c) => { const d = dernierEchange(c.id, echanges); return !d || (Date.now() - new Date(d).getTime()) / 864e5 >= seuil; });
    }
    if (colFiltre && filtre) {
      l = l.filter((c) => { const v = valeur(c, colFiltre); return Array.isArray(v) ? v.includes(filtre.val) : v === filtre.val; });
    }
    if (t) l = l.filter((c) => norm(`${c.prenom} ${c.nom} ${colonnes.map((k) => texteDe(c, k, echanges)).join(" ")}`).includes(t));
    const ordre = (c: Contact, i: number) => c.ordre ?? i;
    const indexes = new Map(contacts.map((c, i) => [c.id, i]));
    l = [...l].sort((a, b) => ordre(a, indexes.get(a.id)!) - ordre(b, indexes.get(b.id)!));
    if (tri) {
      const col = colonnes.find((c) => c.id === tri.col);
      const cle = (c: Contact): string | number | null => {
        if (tri.col === "nom") return `${c.nom} ${c.prenom}`.trim().toLowerCase() || null;
        if (!col) return null;
        if (col.type === "nombre" || col.type === "note") { const v = valeur(c, col); return v === null || v === undefined ? null : Number(v); }
        if (col.type === "statut") { const i = libellesDe(col).findIndex((x) => x.id === valeur(c, col)); return i < 0 ? null : i; }
        if (col.type === "case") return valeur(c, col) ? 1 : 0;
        if (col.type === "dernier_echange") return dernierEchange(c.id, echanges);
        if (col.type === "date") return (valeur(c, col) as string | null) || null;
        return texteDe(c, col, echanges).toLowerCase() || null;
      };
      l.sort((a, b) => {
        const x = cle(a), y = cle(b);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * tri.dir;
      });
    }
    return l;
  }, [contacts, echanges, colonnes, q, filtre, tri, groupeDe, s.reglages.delai_contact_mois]);

  const patchContact = useCallback((id: string, p: Partial<Contact>) => s.patch("contacts", id, p), [s]);

  function ajouterContact(groupeId: string, saisie: string): Contact {
    const { prenom, nom } = decouperNom(saisie);
    const dans = contacts.filter((c) => groupeDe(c) === groupeId);
    return s.add("contacts", {
      nom, prenom, structure: null, fonction: null, ville: null, email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: [],
      groupe_id: groupeId, champs: {}, ordre: rangSuivant(dans),
    });
  }
  function deplacer(id: string, groupeId: string) {
    s.patch("contacts", id, { groupe_id: groupeId, ordre: rangSuivant(contacts.filter((c) => groupeDe(c) === groupeId)) });
  }

  function ajouterColonne(titre: string, type: TypeColonne) {
    const libelles = type === "statut" ? LIBELLES_NOUVEAU_STATUT.map((l) => ({ ...l, id: uid().slice(0, 8) })) : [];
    return s.add("crm_colonnes", {
      cle: "", titre: titre.trim() || TYPES_COLONNE.find((t) => t.id === type)?.label || "Colonne", type,
      options: type === "statut" || type === "etiquettes" ? { libelles } : {},
      ordre: rangSuivant(colonnes), largeur: type === "texte_long" ? 240 : type === "case" || type === "note" ? 130 : 170, masquee: false, systeme: false,
    });
  }
  const patchColonne = (id: string, p: Partial<CrmColonne>) => s.patch("crm_colonnes", id, p);
  function supprimerColonne(id: string) {
    s.remove("crm_colonnes", id);
    if (tri?.col === id) setTri(null);
    if (filtre?.col === id) setFiltre(null);
  }
  function deplacerColonne(id: string, sens: -1 | 1) {
    const i = visibles.findIndex((c) => c.id === id);
    const autre = visibles[i + sens];
    if (!autre) return;
    const a = visibles[i];
    s.patch("crm_colonnes", a.id, { ordre: autre.ordre });
    s.patch("crm_colonnes", autre.id, { ordre: a.ordre });
  }
  /** Enregistre les libellés ; renommer une étiquette la renomme chez tous les contacts. */
  function majLibelles(col: CrmColonne, libs: Libelle[]) {
    if (col.type === "etiquettes") {
      const renommes = libellesDe(col).map((o) => [o.label, libs.find((n) => n.id === o.id)?.label] as const).filter(([a, b]) => b && a !== b);
      if (renommes.length) {
        contacts.forEach((c) => {
          const v = valeur(c, col) as string[];
          if (!v.some((t) => renommes.some(([a]) => a === t))) return;
          const nv = v.map((t) => renommes.find(([a]) => a === t)?.[1] ?? t);
          s.patch("contacts", c.id, col.systeme ? { etiquettes: nv } : { champs: { ...(c.champs ?? {}), [col.id]: nv } });
        });
      }
    }
    s.patch("crm_colonnes", col.id, { options: { ...col.options, libelles: libs } });
  }

  function ajouterGroupe() {
    return s.add("crm_groupes", { titre: "Nouveau groupe", couleur: PALETTE[groupes.length % PALETTE.length], ordre: rangSuivant(groupes), replie: false });
  }
  const patchGroupe = (id: string, p: Partial<CrmGroupe>) => s.patch("crm_groupes", id, p);
  function supprimerGroupe(id: string) {
    const cible = groupes.find((g) => g.id !== id);
    if (!cible) return;
    contacts.filter((c) => groupeDe(c) === id).forEach((c) => deplacer(c.id, cible.id));
    s.remove("crm_groupes", id);
  }
  function deplacerGroupe(id: string, sens: -1 | 1) {
    const i = groupes.findIndex((g) => g.id === id);
    const autre = groupes[i + sens];
    if (!autre) return;
    s.patch("crm_groupes", id, { ordre: autre.ordre });
    s.patch("crm_groupes", autre.id, { ordre: groupes[i].ordre });
  }

  return {
    s, q, setQ, filtre, setFiltre, tri, setTri, colonnes, groupes, visibles, masquees, lignes, groupeDe, patchContact,
    ajouterContact, deplacer, ajouterColonne, patchColonne, supprimerColonne, deplacerColonne, majLibelles,
    ajouterGroupe, patchGroupe, supprimerGroupe, deplacerGroupe, premier,
  };
}
export type Crm = ReturnType<typeof useCrm>;
