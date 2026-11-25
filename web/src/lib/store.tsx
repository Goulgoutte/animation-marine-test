"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FichierOffres, FichierProductions, FichierSources } from "@shared/types";
import { donneesDemo } from "@/fixtures/demo";
import { offresFixture, productionsFixture, sourcesFixture } from "@/fixtures/donnees";
import { uid } from "./dates";
import { BASE_PATH, MODE_DEMO, supabase, urlRedirection } from "./supabase";
import { REGLAGES_DEFAUT, TABLE_NAMES, type Donnees, type Reglages, type TableName, type Tables } from "./types";

const CLE_DEMO = "veille-animation-demo-v1";
const vide = (): Donnees => ({
  candidatures: [], relances: [], contacts: [], echanges: [], offres_manuelles: [],
  productions_manuelles: [], corrections: [], masquages: [], reglages: [],
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
  email: string | null;
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
  const [email, setEmail] = useState<string | null>(null);
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
      setEmail(d.session?.user.email ?? null);
      if (!d.session) setPret(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(!!s);
      setEmail(s?.user.email ?? null);
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

  const ecrire = useCallback(
    async (fn: () => PromiseLike<{ error: { message: string } | null }> | null) => {
      const p = fn();
      if (!p) return;
      const { error } = await p;
      if (error) setErreur(`Enregistrement impossible : ${error.message}`);
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
      if (t === "contacts") suivant = { ...suivant, echanges: suivant.echanges.filter((r) => r.contact_id !== id) };
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
      pret, demo: MODE_DEMO, email, erreur, data, collecte, reglages, visitePrecedente,
      add, patch, remove, saveReglages, deconnexion, effacerDemo,
    }),
    [pret, email, erreur, data, collecte, reglages, visitePrecedente, add, patch, remove, saveReglages, deconnexion, effacerDemo],
  );

  if (!MODE_DEMO && !session) return <Connexion pret={pret} />;
  if (!pret) return <div className="p-8 text-sm text-[var(--color-mute)]">Chargement…</div>;
  return <StoreCtx.Provider value={valeur}>{children}</StoreCtx.Provider>;
}

function Connexion({ pret }: { pret: boolean }) {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye" | "erreur">("saisie");
  const [msg, setMsg] = useState("");
  if (!pret) return <div className="p-8 text-sm">Chargement…</div>;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    const { error } = await supabase()!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: urlRedirection() },
    });
    if (error) {
      setMsg(error.message);
      setEtat("erreur");
    } else setEtat("envoye");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <p className="meta">Veille animation</p>
      <h1 className="titre-xxl mt-2">Bonjour.</h1>
      <p className="mt-4 text-[var(--color-mute)]">Saisis ton adresse e-mail : un lien de connexion t’y sera envoyé. Pas de mot de passe.</p>
      {etat === "envoye" ? (
        <p className="mt-8 rounded-xl bg-[var(--color-teal)] p-4 text-white">Lien envoyé à {email}. Ouvre-le depuis cet appareil.</p>
      ) : (
        <form onSubmit={envoyer} className="mt-8 flex flex-col gap-3">
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@adresse.fr" className="champ" aria-label="Adresse e-mail" />
          <button className="bouton bouton-plein" disabled={etat === "envoi"}>{etat === "envoi" ? "Envoi…" : "Recevoir le lien"}</button>
          {etat === "erreur" && <p className="text-sm text-[var(--color-red)]">{msg}</p>}
        </form>
      )}
    </main>
  );
}
