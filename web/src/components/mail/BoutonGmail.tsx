"use client";

import { Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { connecterGmail, expirationGmail, useEtatGmail } from "@/lib/gmail";
import { useStore } from "@/lib/store";

export const MSG_DEMO = "Mode démo : aucun mail réel";

/** État de la connexion Gmail et bouton « Connecter Gmail » / « Reconnecter Gmail ». */
export function BoutonGmail({ compact }: { compact?: boolean }) {
  const etat = useEtatGmail();
  const { lectureSeule } = useStore();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (lectureSeule) return <p className="micro rounded-lg bg-surface-2 px-2.5 py-1.5" role="status">Gmail désactivé : tu es en lecture seule.</p>;
  if (etat === "demo") return <p className="micro rounded-lg bg-surface-2 px-2.5 py-1.5" role="status">{MSG_DEMO}</p>;

  const fin = expirationGmail();
  const heure = fin ? new Date(fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
  async function lancer() {
    setEnvoi(true);
    setErreur(await connecterGmail());
    setEnvoi(false);
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {etat === "connecte" ? (
        <p className="micro inline-flex items-center gap-1.5 font-medium text-ok" role="status"><Mail className="h-3.5 w-3.5" />Gmail connecté, jusqu’à {heure}</p>
      ) : (
        <button type="button" className={`bouton ${etat === "expire" ? "bouton-plein" : ""} ${compact ? "bouton-petit" : ""}`} onClick={lancer} disabled={envoi}>
          {etat === "expire" ? <RefreshCw /> : <Mail />}{envoi ? "Redirection vers Google…" : etat === "expire" ? "Reconnecter Gmail" : "Connecter Gmail"}
        </button>
      )}
      {etat === "expire" && <span className="micro">Le jeton Google dure environ 1 h.</span>}
      {erreur && <span role="alert" className="micro text-danger">{erreur}</span>}
    </div>
  );
}

export const gmailPret = (etat: ReturnType<typeof useEtatGmail>, lectureSeule = false) => !lectureSeule && (etat === "demo" || etat === "connecte");
