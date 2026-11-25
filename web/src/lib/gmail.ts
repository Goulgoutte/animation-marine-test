"use client";

import { useEffect, useSyncExternalStore } from "react";
import { encoderMessage, type MailBrut } from "./mime";
import { MODE_DEMO, supabase } from "./supabase";

// Gmail est une connexion incrémentale : la connexion normale ne change pas. Le jeton d'accès Google
// (session.provider_token, ~1 h) n'est jamais écrit en base ni rafraîchi par Supabase : il vit en mémoire
// et dans sessionStorage, avec son expiration ; passé ce délai, il faut « Reconnecter Gmail ».

export const SCOPE_GMAIL = "https://www.googleapis.com/auth/gmail.compose";
export const LIEN_BROUILLONS = "https://mail.google.com/mail/u/0/#drafts";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const CLE_JETON = "va-gmail-jeton";
const CLE_ATTENTE = "va-gmail-attente";
/** Durée de vie d'un jeton Google : 3600 s ; on garde une marge. */
const DUREE_MS = 3500 * 1000;

interface Jeton {
  token: string;
  expire: number;
}

let jeton: Jeton | null = null;
let charge = false;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

function lire(): Jeton | null {
  if (!charge && typeof window !== "undefined") {
    charge = true;
    try {
      const brut = sessionStorage.getItem(CLE_JETON);
      if (brut) jeton = JSON.parse(brut) as Jeton;
    } catch {
      jeton = null;
    }
  }
  return jeton;
}

function ecrire(j: Jeton | null) {
  jeton = j;
  charge = true;
  try {
    if (j) sessionStorage.setItem(CLE_JETON, JSON.stringify(j));
    else sessionStorage.removeItem(CLE_JETON);
  } catch {
    /* stockage indisponible : le jeton reste en mémoire */
  }
  notifier();
}

export type EtatGmail = "demo" | "deconnecte" | "connecte" | "expire";

export function etatGmail(maintenant = Date.now()): EtatGmail {
  if (MODE_DEMO) return "demo";
  const j = lire();
  if (!j) return "deconnecte";
  return j.expire > maintenant ? "connecte" : "expire";
}

export function expirationGmail(): number | null {
  return lire()?.expire ?? null;
}

/**
 * À appeler avec chaque session Supabase. Le jeton n'est gardé que si la connexion a été lancée par
 * « Connecter Gmail » : une connexion Google normale fournit aussi un provider_token, sans droit Gmail.
 */
export function capturerJeton(session: { provider_token?: string | null } | null | undefined) {
  const token = session?.provider_token;
  if (!token) return;
  let attendu = false;
  try {
    attendu = sessionStorage.getItem(CLE_ATTENTE) === "1";
  } catch {
    /* ignoré */
  }
  if (!attendu) return;
  if (lire()?.token === token) return;
  try {
    sessionStorage.removeItem(CLE_ATTENTE);
  } catch {
    /* ignoré */
  }
  ecrire({ token, expire: Date.now() + DUREE_MS });
}

/** Relance l'OAuth Google avec le scope gmail.compose, puis revient sur la page courante. */
export async function connecterGmail(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return "Mode démo : aucune connexion Google.";
  try {
    sessionStorage.setItem(CLE_ATTENTE, "1");
  } catch {
    /* ignoré */
  }
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: SCOPE_GMAIL,
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: "consent" },
    },
  });
  return error ? error.message : null;
}

export function oublierGmail() {
  ecrire(null);
}

/** Hook : état réactif, avec un rendu à l'instant d'expiration. */
export function useEtatGmail(): EtatGmail {
  const etat = useSyncExternalStore(
    (cb) => {
      abonnes.add(cb);
      return () => abonnes.delete(cb);
    },
    () => etatGmail(),
    () => "deconnecte" as EtatGmail,
  );
  useEffect(() => {
    const j = lire();
    if (!j || j.expire <= Date.now()) return;
    const t = setTimeout(notifier, Math.min(j.expire - Date.now() + 50, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [etat]);
  return etat;
}

export class ErreurGmail extends Error {
  /** true : le jeton est absent, expiré ou refusé : afficher « Reconnecter Gmail ». */
  constructor(message: string, public reconnecter = false) {
    super(message);
  }
}

async function appel<T>(chemin: string, corps: unknown): Promise<T> {
  const j = lire();
  if (!j || j.expire <= Date.now()) throw new ErreurGmail("Connexion Gmail expirée.", true);
  let r: Response;
  try {
    r = await fetch(`${API}${chemin}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${j.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
  } catch {
    throw new ErreurGmail("Gmail est injoignable (réseau ou extension qui bloque la requête).");
  }
  if (r.status === 401) {
    ecrire({ ...j, expire: 0 }); // le jeton ne vaut plus rien : l'interface propose de reconnecter
    throw new ErreurGmail("Connexion Gmail expirée.", true);
  }
  if (!r.ok) {
    let detail = "";
    try {
      detail = ((await r.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {
      /* corps non JSON */
    }
    if (r.status === 403) throw new ErreurGmail(`Gmail refuse l'accès (${detail || "droit gmail.compose manquant"}). Reconnecte Gmail en acceptant l'autorisation.`, true);
    throw new ErreurGmail(`Gmail a répondu ${r.status}${detail ? ` : ${detail}` : ""}.`);
  }
  return (await r.json()) as T;
}

const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export interface ResultatMail {
  id: string;
  simule: boolean;
}

/** POST users/me/drafts. En mode démo : simulation, aucun appel réseau. */
export async function creerBrouillon(m: MailBrut): Promise<ResultatMail> {
  const raw = encoderMessage(m); // valide aussi l'adresse
  if (MODE_DEMO) {
    await pause(250);
    return { id: `demo-brouillon-${Date.now().toString(36)}`, simule: true };
  }
  const r = await appel<{ id: string }>("/drafts", { message: { raw } });
  return { id: r.id, simule: false };
}

/** POST users/me/messages/send. En mode démo : simulation, aucun appel réseau. */
export async function envoyerMail(m: MailBrut): Promise<ResultatMail> {
  const raw = encoderMessage(m);
  if (MODE_DEMO) {
    await pause(250);
    return { id: `demo-envoi-${Date.now().toString(36)}`, simule: true };
  }
  const r = await appel<{ id: string }>("/messages/send", { raw });
  return { id: r.id, simule: false };
}

export { pause };
