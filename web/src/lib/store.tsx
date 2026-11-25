"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FichierOffres, FichierProductions, FichierSources } from "@shared/types";
import { donneesDemo } from "@/fixtures/demo";
import { offresFixture, productionsFixture, sourcesFixture } from "@/fixtures/donnees";
import { uid } from "./dates";
import { BASE_PATH, MODE_DEMO, profilDe, supabase, type Profil } from "./supabase";
import { Connexion } from "@/components/Connexion";
import { SqueletteApp } from "@/components/ui";
import { REGLAGES_DEFAUT, TABLE_NAMES, type Donnees, type Reglages, type TableName, type Tables } from "./types";

const CLE_DEMO = "veille-animation-demo-v1";
const vide = (): Donnees => ({
  candidatures: [], relances: [], contacts: [], echanges: [], offres_manuelles: [],
  productions_manuelles: [], corrections: [], masquages: [], reglages: [], crm_colonnes: [], crm_groupes: [],
  studios: [], contact_studios: [],
});

export interface Collecte {
  offres: FichierOffres;
  productions: FichierProductions;
  sources: FichierSources;
  fictives: boolean; // true = fixtures de développement (aucun JSON de collecte trouvé)
}

interface Ctx {
  pret: boolean;
  demo: boolean;
  profil: Profil | null;
  /** Fiche à ouvrir sur la page cible (recherche globale, tableau de bord). */
  focus: Focus | null;
  setFocus(f: Focus | null): void;
  erreur: string | null;
  data: Donnees;
  collecte: Collecte | null;
  reglages: Reglages;
  visitePrecedente: string | null;
  add<T extends TableName>(t: T, row: Omit<Tables[T], "id"> & { id?: string }): Tables[T];
  patch<T extends TableName>(t: T, id: string, p: Partial<Tables[T]>): void;
  remove(t: TableName, id: string): void;
  saveReglages(p: Partial<Omit<Reglages, "id">>): void;
  deconnexion(): Promise<void>;
  effacerDemo(): void;
}

export type Focus = { kind: "offre" | "production" | "candidature" | "contact" | "studio"; id: string };

const PROFIL_DEMO: Profil = { email: null, nom: "Léa Démo", prenom: "Léa", avatar: null };

const StoreCtx = createContext<Ctx | null>(null);
export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore hors provider");
  return c;
};

async function chargerJson<T>(nom: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE_PATH}/data/${nom}.json`, { cache: "no-cache" });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function chargerCollecte(): Promise<Collecte> {
  const [o, p, s] = await Promise.all([
    chargerJson<FichierOffres>("offres"),
    chargerJson<FichierProductions>("productions"),
    chargerJson<FichierSources>("sources"),
  ]);
  return {
    offres: o ?? offresFixture,
    productions: p ?? productionsFixture,
    sources: s ?? sourcesFixture,
    fictives: !o && !p,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(MODE_DEMO ? PROFIL_DEMO : null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [session, setSession] = useState<boolean>(MODE_DEMO);
  const [erreur, setErreur] = useState<string | null>(null);
  const [data, setData] = useState<Donnees>(vide());
  const [collecte, setCollecte] = useState<Collecte | null>(null);
  const [visitePrecedente, setVisitePrecedente] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const sb = supabase();

  // Session Supabase (ou mode démo)
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data: d }) => {
      setSession(!!d.session);
      setProfil(profilDe(d.session?.user));
      if (!d.session) setPret(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
      setProfil(profilDe(s?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const persisterDemo = useCallback((d: Donnees) => {
    try {
      localStorage.setItem(CLE_DEMO, JSON.stringify(d));
    } catch {
      setErreur("Stockage local plein ou indisponible.");
    }
  }, []);

  // Chargement des données
  useEffect(() => {
    let annule = false;
    (async () => {
      const c = await chargerCollecte();
      let d: Donnees;
      if (!sb) {
        const brut = localStorage.getItem(CLE_DEMO);
        d = brut ? { ...vide(), ...JSON.parse(brut) } : donneesDemo();
        if (!brut) persisterDemo(d);
      } else if (session) {
        d = vide();
        await Promise.all(
          TABLE_NAMES.map(async (t) => {
            const { data: rows, error } = await sb.from(t).select("*");
            if (error) setErreur(`Lecture de « ${t} » impossible : ${error.message}`);
            else (d as Record<string, unknown>)[t] = rows ?? [];
          }),
        );
      } else {
        return;
      }
      if (annule) return;
      // Réglages : créer la ligne si besoin ; mémoriser la visite précédente pour le badge « Nouveau »
      let reg = d.reglages[0];
      if (!reg) {
        reg = { id: uid(), ...REGLAGES_DEFAUT };
        d.reglages = [reg];
        if (sb) await sb.from("reglages").insert({ ...reg });
      }
      let ref = sessionStorage.getItem("visite-ref");
      if (ref === null) {
        ref = reg.derniere_visite ?? "";
        sessionStorage.setItem("visite-ref", ref);
        const maintenant = new Date().toISOString();
        reg = { ...reg, derniere_visite: maintenant };
        d.reglages = [reg];
        if (sb) await sb.from("reglages").update({ derniere_visite: maintenant }).eq("id", reg.id);
        else persisterDemo(d);
      }
      setVisitePrecedente(ref || null);
      setData(d);
      setCollecte(c);
      setPret(true);
    })();
    return () => {
      annule = true;
    };
  }, [sb, session, persisterDemo]);

  // Écritures Supabase en file, dans l'ordre des actions : un contact rangé dans un groupe tout juste
  // créé ne doit pas partir avant l'insertion du groupe (sinon contacts_groupe_id_fkey échoue).
  const fileEcritures = useRef<Promise<void>>(Promise.resolve());
  const ecrire = useCallback(
    (fn: () => PromiseLike<{ error: { message: string } | null }> | null) => {
      fileEcritures.current = fileEcritures.current.then(async () => {
        try {
          const p = fn();
          if (!p) return;
          const { error } = await p;
          if (error) setErreur(`Enregistrement impossible : ${error.message}`);
        } catch (e) {
          setErreur(`Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      return fileEcritures.current;
    },
    [],
  );

  const add: Ctx["add"] = useCallback(
    (t, row) => {
      const complet = { ...row, id: row.id ?? uid(), created_at: new Date().toISOString() } as Tables[typeof t];
      const suivant = { ...dataRef.current, [t]: [...dataRef.current[t], complet] } as Donnees;
      dataRef.current = suivant;
      setData(suivant);
      if (sb) ecrire(() => sb.from(t).insert(complet));
      else persisterDemo(suivant);
      return complet;
    },
    [sb, ecrire, persisterDemo],
  );

  const patch: Ctx["patch"] = useCallback(
    (t, id, p) => {
      const suivant = {
        ...dataRef.current,
        [t]: (dataRef.current[t] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...p } : r)),
      } as Donnees;
      dataRef.current = suivant;
      setData(suivant);
      if (sb) ecrire(() => sb.from(t).update(p as never).eq("id", id));
      else persisterDemo(suivant);
    },
    [sb, ecrire, persisterDemo],
  );

  const remove: Ctx["remove"] = useCallback(
    (t, id) => {
      let suivant = {
        ...dataRef.current,
        [t]: (dataRef.current[t] as { id: string }[]).filter((r) => r.id !== id),
      } as Donnees;
      // Suppressions en cascade (la base le fait aussi côté Supabase)
      if (t === "candidatures") suivant = { ...suivant, relances: suivant.relances.filter((r) => r.candidature_id !== id) };
      if (t === "crm_groupes") suivant = { ...suivant, contacts: suivant.contacts.map((k) => (k.groupe_id === id ? { ...k, groupe_id: null } : k)) };
      if (t === "contacts") suivant = { ...suivant, echanges: suivant.echanges.filter((r) => r.contact_id !== id), contact_studios: suivant.contact_studios.filter((r) => r.contact_id !== id) };
      if (t === "studios") suivant = { ...suivant, contact_studios: suivant.contact_studios.filter((r) => r.studio_id !== id) };
      dataRef.current = suivant;
      setData(suivant);
      if (sb) ecrire(() => sb.from(t).delete().eq("id", id));
      else persisterDemo(suivant);
    },
    [sb, ecrire, persisterDemo],
  );

  const reglages = data.reglages[0] ?? { id: "tmp", ...REGLAGES_DEFAUT };

  const saveReglages: Ctx["saveReglages"] = useCallback(
    (p) => {
      const r = dataRef.current.reglages[0];
      if (r) patch("reglages", r.id, p);
    },
    [patch],
  );

  const deconnexion = useCallback(async () => {
    if (sb) await sb.auth.signOut();
  }, [sb]);

  const effacerDemo = useCallback(() => {
    localStorage.removeItem(CLE_DEMO);
    sessionStorage.removeItem("visite-ref");
    window.location.reload();
  }, []);

  const valeur = useMemo<Ctx>(
    () => ({
      pret, demo: MODE_DEMO, profil, focus, setFocus, erreur, data, collecte, reglages, visitePrecedente,
      add, patch, remove, saveReglages, deconnexion, effacerDemo,
    }),
    [pret, profil, focus, erreur, data, collecte, reglages, visitePrecedente, add, patch, remove, saveReglages, deconnexion, effacerDemo],
  );

  if (!MODE_DEMO && !session) return <Connexion pret={pret} />;
  if (!pret) return <SqueletteApp />;
  return <StoreCtx.Provider value={valeur}>{children}</StoreCtx.Provider>;
}
