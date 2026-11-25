"use client";

import { Champ } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { ProfilMail as Profil } from "@/lib/types";
import { BoutonGmail } from "./BoutonGmail";

/** Réglages > Compte : profil d'envoi (variables {{mon_prenom}}, {{ma_signature}}…) et connexion Gmail. */
export function ProfilMail() {
  const s = useStore();
  const p = s.reglages.profil_mail ?? {};
  const maj = (k: keyof Profil, v: string) => s.saveReglages({ profil_mail: { ...p, [k]: v } });
  const champ = (k: keyof Profil, placeholder?: string) => ({ className: "champ", value: (p[k] as string | undefined) ?? "", placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => maj(k, e.target.value) });
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="titre-section">Mes mails</h3>
      <p className="micro mt-1">Ces informations remplissent les variables des modèles. Gmail sert à créer des brouillons et à envoyer.</p>
      <div className="mt-3"><BoutonGmail /></div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Champ label="Prénom"><input {...champ("prenom", s.profil?.prenom ?? "")} /></Champ>
        <Champ label="Nom"><input {...champ("nom")} /></Champ>
        <Champ label="Lien du portfolio"><input type="url" {...champ("portfolio", "https://")} /></Champ>
        <Champ label="Lien du CV"><input type="url" {...champ("cv", "https://")} /></Champ>
        <Champ label="Adresse d’envoi affichée" className="sm:col-span-2">
          <input type="email" {...champ("adresse", s.profil?.email ?? "prenom@exemple.fr")} />
          <span className="micro">Gmail ne l’affiche que s’il s’agit de l’adresse du compte ou d’un alias vérifié ; sinon il garde celle du compte.</span>
        </Champ>
        <Champ label="Signature" className="sm:col-span-2"><textarea {...champ("signature", "Prénom Nom\nDécoratrice en animation 2D")} rows={3} /></Champ>
      </div>
    </div>
  );
}
