"use client";

import { useCallback, useEffect, useMemo } from "react";
import { changementStatut } from "@/lib/actions";
import { today } from "@/lib/dates";
import { creerBrouillon, envoyerMail, ErreurGmail, type ResultatMail } from "@/lib/gmail";
import { MODELES_PAR_DEFAUT, valeursCandidature, valeursContact, type Valeurs } from "@/lib/modeles";
import { useStore } from "@/lib/store";
import type { Candidature, Contact } from "@/lib/types";
import { offresVues, productionsVues } from "@/lib/veille";

/** Un destinataire potentiel : une candidature ou un contact, avec les valeurs des variables. */
export interface Cible {
  cle: string;
  nom: string;
  sousTitre: string;
  email: string;
  valeurs: Valeurs;
  candidature?: Candidature;
  contact?: Contact;
}

// Plusieurs composants montés en même temps appellent useMail : un seul doit semer les modèles.
let semisEnCours = false;

export function useMail() {
  const s = useStore();
  const profil = s.reglages.profil_mail;
  const vuesProd = useMemo(() => new Map((s.collecte ? productionsVues(s.collecte, s.data, null) : []).map((p) => [p.id, p.titre])), [s.collecte, s.data]);
  const vuesOffre = useMemo(() => new Map((s.collecte ? offresVues(s.collecte, s.data, null) : []).map((o) => [o.id, o.production])), [s.collecte, s.data]);

  // Modèles par défaut : créés une seule fois, au premier usage (le drapeau évite de les recréer si on les supprime).
  const assurerModeles = useCallback(() => {
    if (s.lectureSeule || semisEnCours || profil?.modeles_init || s.data.modeles_mail.length > 0) return;
    semisEnCours = true;
    for (const m of MODELES_PAR_DEFAUT) s.add("modeles_mail", m);
    s.saveReglages({ profil_mail: { ...(profil ?? {}), modeles_init: true } });
  }, [s, profil]);
  useEffect(() => assurerModeles(), [assurerModeles]);

  const cibleCandidature = useCallback(
    (c: Candidature): Cible => {
      const contact = s.data.contacts.find((k) => k.id === c.contact_id) ?? null;
      const production = (c.production_id && vuesProd.get(c.production_id)) || (c.offre_id && vuesOffre.get(c.offre_id)) || "";
      return {
        cle: c.id,
        nom: c.studio || "Sans studio",
        sousTitre: c.poste,
        email: c.email_destinataire || contact?.email || "",
        valeurs: valeursCandidature({ c, contact, production, profil, compte: s.profil }),
        candidature: c,
        contact: contact ?? undefined,
      };
    },
    [s.data.contacts, s.profil, profil, vuesProd, vuesOffre],
  );

  const cibleContact = useCallback(
    (k: Contact): Cible => ({
      cle: k.id,
      nom: `${k.prenom} ${k.nom}`.trim() || "Sans nom",
      sousTitre: k.structure ?? "",
      email: k.email ?? "",
      valeurs: valeursContact({ k, profil, compte: s.profil }),
      contact: k,
    }),
    [s.profil, profil],
  );

  /** Crée le brouillon Gmail (ou l'envoie) puis met à jour la candidature et l'historique. Lève ErreurGmail en cas d'échec. */
  const livrer = useCallback(
    async (cible: Cible, mode: "brouillon" | "envoi", email: string, sujet: string, corps: string): Promise<ResultatMail> => {
      if (s.lectureSeule) throw new ErreurGmail("Gmail est désactivé en lecture seule.");
      const nomDe = [profil?.prenom, profil?.nom].filter(Boolean).join(" ") || undefined;
      const mail = { a: email, sujet, corps, de: profil?.adresse || undefined, nomDe, html: true };
      const res = mode === "brouillon" ? await creerBrouillon(mail) : await envoyerMail(mail);
      const c = cible.candidature;
      const maj = (p: Partial<Candidature>) => c && s.patch("candidatures", c.id, p);
      if (mode === "brouillon") {
        maj({ email_destinataire: email, gmail_brouillon_id: res.id });
        return res;
      }
      const base = { email_destinataire: email, gmail_brouillon_id: null };
      if (c) {
        if (c.statut === "a_preparer") {
          maj(changementStatut(c, "envoyee", { ...base, date_envoi: today(), canal: "mail", prochaine_action: null, prochaine_action_date: null }));
        } else if (c.statut === "envoyee" || c.statut === "relancee") {
          // Un mail sur une candidature déjà partie est une relance : elle entre dans l'historique des relances.
          s.add("relances", { candidature_id: c.id, date: today(), canal: "mail", note: `Mail envoyé : ${sujet}` });
          maj(changementStatut(c, "relancee", { ...base, cloture_annulee: false, prochaine_action: null, prochaine_action_date: null }));
        } else {
          maj(base);
        }
      }
      const contactId = cible.contact?.id ?? c?.contact_id;
      if (contactId && s.data.contacts.some((k) => k.id === contactId)) {
        s.add("echanges", { contact_id: contactId, date: today(), type: "mail", lieu: null, sujets: `Mail envoyé : ${sujet}`, promesses: null, prochaine_action: null, prochaine_date: null });
      }
      return res;
    },
    [s, profil],
  );

  return { lectureSeule: s.lectureSeule, modeles: s.data.modeles_mail, assurerModeles, cibleCandidature, cibleContact, livrer };
}
