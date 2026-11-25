"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FichierOffres, FichierProductions, FichierSources } from "@shared/types";
import { donneesDemo } from "@/fixtures/demo";
import { offresFixture, productionsFixture, sourcesFixture } from "@/fixtures/donnees";
import { uid } from "./dates";
import { capturerJeton } from "./gmail";
import { BASE_PATH, MODE_DEMO, profilDe, supabase, type Profil } from "./supabase";
import { Connexion } from "@/components/Connexion";
import { SqueletteApp } from "@/components/ui";
import { REGLAGES_DEFAUT, TABLE_NAMES, type Donnees, type Partage, type Reglages, type TableName, type Tables } from "./types";

const CLE_DEMO = "veille-animation-demo-v1";
const CLE_PARTAGES_DEMO = "veille-animation-demo-partages-v1";
const CLE_VUE = "vue-partagee";
/** Propriétaire fictif de la vue partagée en mode démo. */
const ID_MARINE_DEMO = "demo-marine";
const PARTAGE_MARINE_DEMO: Partage = { id: "demo-partage-marine", proprietaire: ID_MARINE_DEMO, invite_email: "demo@exemple.fr", actif: true, proprietaire_nom: "Marine (démo)", proprietaire_avatar: null };
const vide = (): Donnees => ({
  candidatures: [], relances: [], contacts: [], echanges: [], offres_manuelles: [],
  productions_manuelles: [], corrections: [], masquages: [], reglages: [], crm_colonnes: [], crm_groupes: [],
  studios: [], contact_studios: [], modeles_mail: [],
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
  /** Vue affichée : null = mon app ; sinon la propriétaire qui m'a partagé la sienne (lecture seule). */
  vue: Partage | null;
  lectureSeule: boolean;
  /** Message temporaire quand une écriture est refusée en lecture seule. */
  refus: string | null;
  /** Propriétaires qui m'ont partagé leur vue. */
  partagesRecus: Partage[];
  changerVue(proprietaire: string | null): void;
  /** Personnes avec qui je partage ma vue. */
  mesPartages: Partage[];
  partager(email: string): Promise<string | null>;
  majPartage(id: string, actif: boolean): Promise<void>;
  retirerPartage(id: string): Promise<void>;
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
  const [monId, setMonId] = useState<string | null>(null);
  const [vueId, setVueId] = useState<string | null>(null);
  const [partagesRecus, setPartagesRecus] = useState<Partage[]>(MODE_DEMO ? [PARTAGE_MARINE_DEMO] : []);
  const [mesPartages, setMesPartages] = useState<Partage[]>([]);
  const [partagesPrets, setPartagesPrets] = useState<boolean>(MODE_DEMO);
  const [refus, setRefus] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const vue = useMemo(() => partagesRecus.find((p) => p.proprietaire === vueId) ?? null, [partagesRecus, vueId]);
  const lectureSeule = vue !== null;
  const vueRef = useRef(vue);
  vueRef.current = vue;
  const emailMoi = profil?.email?.toLowerCase() ?? null;

  const sb = supabase();

  // Session Supabase (ou mode démo)
  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data: d }) => {
      capturerJeton(d.session);
      setSession(!!d.session);
      setMonId(d.session?.user.id ?? null);
      setProfil(profilDe(d.session?.user));
      if (!d.session) setPret(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      capturerJeton(s);
      setSession(!!s);
      setMonId(s?.user.id ?? null);
      setProfil(profilDe(s?.user));
      if (!s) {
        setVueId(null);
        setPartagesPrets(false);
      }
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

  // Partages : ceux que j'ai accordés, et ceux qu'on m'a accordés (pour la liste « Vues partagées avec moi »).
  useEffect(() => {
    let annule = false;
    (async () => {
      let recus: Partage[] = [];
      let miens: Partage[] = [];
      if (!sb) {
        recus = [PARTAGE_MARINE_DEMO];
        try {
          miens = JSON.parse(localStorage.getItem(CLE_PARTAGES_DEMO) ?? "[]") as Partage[];
        } catch {
          miens = [];
        }
      } else if (session && monId) {
        const [r, m] = await Promise.all([
          emailMoi
            ? sb.from("partages").select("*").eq("invite_email", emailMoi).eq("actif", true).neq("proprietaire", monId)
            : Promise.resolve({ data: [] as Partage[] }),
          sb.from("partages").select("*").eq("proprietaire", monId).order("created_at", { ascending: true }),
        ]);
        recus = (r.data as Partage[] | null) ?? [];
        miens = (m.data as Partage[] | null) ?? [];
      } else {
        return;
      }
      if (annule) return;
      let choisi: string | null = null;
      try {
        choisi = sessionStorage.getItem(CLE_VUE);
      } catch {}
      setPartagesRecus(recus);
      setMesPartages(miens);
      setVueId(choisi && recus.some((p) => p.proprietaire === choisi) ? choisi : null);
      setPartagesPrets(true);
    })();
    return () => {
      annule = true;
    };
  }, [sb, session, monId, emailMoi]);

  // Si la propriétaire coupe le partage pendant que je le regarde, retour à ma vue.
  useEffect(() => {
    if (vueId && partagesPrets && !partagesRecus.some((p) => p.proprietaire === vueId)) {
      setPret(false);
      setData(vide());
      dataRef.current = vide();
      try {
        sessionStorage.removeItem(CLE_VUE);
      } catch {}
      setVueId(null);
    }
  }, [vueId, partagesPrets, partagesRecus]);

  // Chargement des données : toujours celles d'UNE seule personne (la vue affichée), jamais un mélange.
  useEffect(() => {
    if (!partagesPrets) return;
    const proprietaire = vueId ?? monId;
    let annule = false;
    (async () => {
      const c = await chargerCollecte();
      let d: Donnees;
      if (!sb && vueId) {
        d = donneesDemo();
      } else if (!sb) {
        const brut = localStorage.getItem(CLE_DEMO);
        d = brut ? { ...vide(), ...JSON.parse(brut) } : donneesDemo();
        if (!brut) persisterDemo(d);
      } else if (session && proprietaire) {
        d = vide();
        await Promise.all(
          TABLE_NAMES.map(async (t) => {
            const { data: rows, error } = await sb.from(t).select("*").eq("user_id", proprietaire);
            if (error) setErreur(`Lecture de « ${t} » impossible : ${error.message}`);
            else (d as Record<string, unknown>)[t] = rows ?? [];
          }),
        );
      } else {
        return;
      }
      if (annule) return;
      if (vueId) {
        // Vue partagée : rien n'est écrit chez la propriétaire (pas de réglages créés, pas de « dernière visite »).
        setVisitePrecedente(null);
        setData(d);
        setCollecte(c);
        setPret(true);
        return;
      }
      // Réglages : créer la ligne si besoin ; mémoriser la visite précédente pour le badge « Nouveau »
      let reg = d.reglages[0];
      if (!reg) {
        reg = { id: uid(), ...REGLAGES_DEFAUT };
        d.reglages = [reg];
        if (sb) await sb.from("reglages").insert({ ...reg, user_id: monId });
      }
      let ref = sessionStorage.getItem("visite-ref");
      if (ref === null) {
        ref = reg.derniere_visite ?? "";
        sessionStorage.setItem("visite-ref", ref);
        const maintenant = new Date().toISOString();
        reg = { ...reg, derniere_visite: maintenant };
        d.reglages = [reg];
        if (sb) await sb.from("reglages").update({ derniere_visite: maintenant }).eq("id", reg.id).eq("user_id", monId!);
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
  }, [sb, session, monId, vueId, partagesPrets, persisterDemo]);

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

  // Lecture seule : aucune écriture, ni locale ni distante. Le message disparaît tout seul.
  const refuser = useCallback(() => {
    setRefus(`Lecture seule : tu regardes l’app de ${vueRef.current?.proprietaire_nom ?? "quelqu’un d’autre"}, rien n’a été modifié.`);
  }, []);
  useEffect(() => {
    if (!refus) return;
    const t = setTimeout(() => setRefus(null), 5000);
    return () => clearTimeout(t);
  }, [refus]);

  const add: Ctx["add"] = useCallback(
    (t, row) => {
      const complet = { ...row, id: row.id ?? uid(), created_at: new Date().toISOString() } as Tables[typeof t];
      if (vueRef.current) {
        refuser();
        return complet;
      }
      const suivant = { ...dataRef.current, [t]: [...dataRef.current[t], complet] } as Donnees;
      dataRef.current = suivant;
      setData(suivant);
      if (sb) ecrire(() => sb.from(t).insert({ ...complet, user_id: monId }));
      else persisterDemo(suivant);
      return complet;
    },
    [sb, monId, ecrire, persisterDemo, refuser],
  );

  const patch: Ctx["patch"] = useCallback(
    (t, id, p) => {
      if (vueRef.current) return refuser();
      const suivant = {
        ...dataRef.current,
        [t]: (dataRef.current[t] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...p } : r)),
      } as Donnees;
      dataRef.current = suivant;
      setData(suivant);
      if (sb) ecrire(() => sb.from(t).update(p as never).eq("id", id).eq("user_id", monId!));
      else persisterDemo(suivant);
    },
    [sb, monId, ecrire, persisterDemo, refuser],
  );

  const remove: Ctx["remove"] = useCallback(
    (t, id) => {
      if (vueRef.current) return refuser();
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
      if (sb) ecrire(() => sb.from(t).delete().eq("id", id).eq("user_id", monId!));
      else persisterDemo(suivant);
    },
    [sb, monId, ecrire, persisterDemo, refuser],
  );

  const reglages = data.reglages[0] ?? { id: "tmp", ...REGLAGES_DEFAUT };

  const saveReglages: Ctx["saveReglages"] = useCallback(
    (p) => {
      const r = dataRef.current.reglages[0];
      if (r) patch("reglages", r.id, p);
    },
    [patch],
  );

  const changerVue = useCallback(
    (proprietaire: string | null) => {
      const cible = proprietaire && partagesRecus.some((p) => p.proprietaire === proprietaire) ? proprietaire : null;
      if (cible === vueId) return;
      // On vide tout avant de recharger : jamais les données de deux personnes en même temps.
      setPret(false);
      setData(vide());
      dataRef.current = vide();
      setFocus(null);
      setRefus(null);
      try {
        if (cible) sessionStorage.setItem(CLE_VUE, cible);
        else sessionStorage.removeItem(CLE_VUE);
      } catch {}
      setVueId(cible);
    },
    [partagesRecus, vueId],
  );

  const persisterPartagesDemo = (l: Partage[]) => {
    try {
      localStorage.setItem(CLE_PARTAGES_DEMO, JSON.stringify(l));
    } catch {}
  };

  const partager: Ctx["partager"] = async (brut) => {
    if (vueRef.current) return "Lecture seule : tu ne peux pas partager la vue de quelqu’un d’autre.";
    const email = brut.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Cette adresse e-mail ne semble pas valide.";
    if (email === emailMoi) return "C’est ton adresse : inutile de partager avec toi-même.";
    if (mesPartages.some((p) => p.invite_email === email)) return "Tu partages déjà avec cette adresse.";
    const ligne = { invite_email: email, actif: true, proprietaire_nom: profil?.nom ?? profil?.prenom ?? null, proprietaire_avatar: profil?.avatar ?? null };
    if (!sb) {
      const l = [...mesPartages, { id: uid(), proprietaire: "demo-moi", created_at: new Date().toISOString(), ...ligne }];
      setMesPartages(l);
      persisterPartagesDemo(l);
      return null;
    }
    const { data: cree, error } = await sb.from("partages").insert({ ...ligne, proprietaire: monId }).select().single();
    if (error) return `Partage impossible : ${error.message}`;
    setMesPartages((l) => [...l, cree as Partage]);
    return null;
  };

  const majPartage: Ctx["majPartage"] = async (id, actif) => {
    if (vueRef.current) return refuser();
    const maj = { actif, proprietaire_nom: profil?.nom ?? profil?.prenom ?? null, proprietaire_avatar: profil?.avatar ?? null };
    if (!sb) {
      const l = mesPartages.map((p) => (p.id === id ? { ...p, ...maj } : p));
      setMesPartages(l);
      return persisterPartagesDemo(l);
    }
    const { error } = await sb.from("partages").update(maj).eq("id", id).eq("proprietaire", monId!);
    if (error) return setErreur(`Partage non modifié : ${error.message}`);
    setMesPartages((l) => l.map((p) => (p.id === id ? { ...p, ...maj } : p)));
  };

  const retirerPartage: Ctx["retirerPartage"] = async (id) => {
    if (vueRef.current) return refuser();
    if (!sb) {
      const l = mesPartages.filter((p) => p.id !== id);
      setMesPartages(l);
      return persisterPartagesDemo(l);
    }
    const { error } = await sb.from("partages").delete().eq("id", id).eq("proprietaire", monId!);
    if (error) return setErreur(`Partage non supprimé : ${error.message}`);
    setMesPartages((l) => l.filter((p) => p.id !== id));
  };

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
      vue, lectureSeule, refus, partagesRecus, changerVue, mesPartages, partager, majPartage, retirerPartage,
    }),
    // partager, majPartage et retirerPartage sont recréées à chaque rendu : leur identité ne compte pas ici.
    [pret, profil, focus, erreur, data, collecte, reglages, visitePrecedente, add, patch, remove, saveReglages, deconnexion, effacerDemo, vue, lectureSeule, refus, partagesRecus, changerVue, mesPartages, monId],
  );

  if (!MODE_DEMO && !session) return <Connexion pret={pret} />;
  if (!pret) return <SqueletteApp />;
  return <StoreCtx.Provider value={valeur}>{children}</StoreCtx.Provider>;
}
