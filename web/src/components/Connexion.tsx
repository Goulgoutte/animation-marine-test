"use client";

import { useState } from "react";
import { DecorIllustration } from "./DecorIllustration";
import { Logo } from "./Logo";
import { Squelette } from "./ui";
import { BASE_PATH, supabase } from "@/lib/supabase";
import { SCOPE_GMAIL, attendreJetonGmail } from "@/lib/gmail";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function Connexion({ pret }: { pret: boolean }) {
  const [etat, setEtat] = useState<"repos" | "envoi" | "erreur">("repos");
  const [msg, setMsg] = useState("");

  async function google() {
    setEtat("envoi");
    // Gmail (brouillons et envoi) est demandé dès la connexion : un seul écran d'autorisation Google.
    attendreJetonGmail();
    const { error } = await supabase()!.auth.signInWithOAuth({
      provider: "google",
      options: { scopes: SCOPE_GMAIL, redirectTo: `${window.location.origin}${BASE_PATH}/` },
    });
    if (error) {
      setMsg(error.message);
      setEtat("erreur");
    }
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[55fr_45fr]">
      <div className="lg:p-4">
        <DecorIllustration className="h-[35vh] min-h-[220px] rounded-b-[28px] lg:sticky lg:top-4 lg:h-[calc(100dvh-2rem)] lg:rounded-[28px]" />
      </div>

      <section className="flex flex-col items-center justify-center px-6 py-12 pt-[max(48px,env(safe-area-inset-top))]">
        <div className="anim-entree w-full max-w-sm">
          <Logo taille={44} texte={false} />
          <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">Bienvenue sur Veille animation</h1>
          <p className="mt-2 text-[14.5px] text-muted">Ta veille emploi, tes candidatures et ton réseau dans la décoration en animation 2D, au même endroit.</p>

          {!pret ? (
            <Squelette className="mt-8 h-12 w-full rounded-xl" />
          ) : (
            <button
              onClick={google}
              disabled={etat === "envoi"}
              className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white text-[15px] font-semibold text-[#3c4043] shadow-sm transition hover:bg-[#f8f9fa] hover:shadow active:scale-[0.99] disabled:opacity-60"
            >
              <GoogleG />
              {etat === "envoi" ? "Redirection vers Google…" : "Continuer avec Google"}
            </button>
          )}
          {etat === "erreur" && <p role="alert" className="mt-3 text-sm text-danger">{msg}</p>}
          <p className="mt-6 text-center text-xs text-muted">Accès privé : seul ton compte Google autorisé peut ouvrir l’app. Aucun mot de passe à retenir.</p>
        </div>
      </section>
    </main>
  );
}
