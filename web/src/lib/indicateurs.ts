"use client";

import { useMemo } from "react";
import { addDays, diffDays, today } from "./dates";
import { aRecontacter, dernierEchange } from "./contacts";
import { prochaineAction } from "./actions";
import { aRelancer, prochaineRelance } from "./relances";
import { catalogueMetiers, metiersSuivis, passeMetiers } from "@shared/metiers";
import { useStore } from "./store";
import type { Candidature, Contact, Echange } from "./types";
import { offreDansPerimetre, offresVues, productionDansPerimetre, productionsVues } from "./veille";

export interface ContactSuivi {
  c: Contact;
  dernier: string | null;
  jours: number | null;
  oublie: boolean;
}

/** Tous les chiffres de l’app (tableau de bord, compteurs de navigation, recherche). */
export function useIndicateurs() {
  const s = useStore();
  const { collecte, data, reglages, visitePrecedente } = s;

  return useMemo(() => {
    // Mots-clés des métiers : catalogue par défaut + personnalisations des réglages
    const catalogue = catalogueMetiers(reglages.perimetre.metiers_perso);
    const offres = collecte ? offresVues(collecte, data, visitePrecedente, catalogue) : [];
    const prods = collecte ? productionsVues(collecte, data, visitePrecedente, catalogue) : [];
    const metiersChoisis = metiersSuivis(reglages.perimetre);
    const offresPerimetre = offres
      .filter((o) => passeMetiers(o.metiers, metiersChoisis) && offreDansPerimetre(o, reglages))
      .sort((a, b) => b.premiereVue.localeCompare(a.premiereVue));
    const nouvellesOffres = offresPerimetre.filter((o) => o.nouveau);
    const prodsMoment = prods.filter((p) => p.bonMomentDecor && productionDansPerimetre(p, reglages));
    const prodsSurveillees = prods
      .filter((p) => productionDansPerimetre(p, reglages) && (p.bonMomentDecor || p.misEnAvant))
      .sort((a, b) => Number(b.bonMomentDecor) - Number(a.bonMomentDecor) || b.premiereVue.localeCompare(a.premiereVue));

    const relancesDues: Candidature[] = data.candidatures
      .filter((c) => aRelancer(c, data.relances, reglages))
      .sort((a, b) => (prochaineRelance(a, data.relances, reglages) ?? "").localeCompare(prochaineRelance(b, data.relances, reglages) ?? ""));

    // Actions saisies à la main et échues (hors relances déjà comptées plus haut)
    const actionsCandidatures = data.candidatures
      .map((c) => ({ c, a: prochaineAction(c, data.relances, reglages) }))
      .filter((x): x is { c: Candidature; a: NonNullable<typeof x.a> } => !!x.a && !x.a.deduite && x.a.echue)
      .sort((x, y) => (x.a.date ?? "").localeCompare(y.a.date ?? ""));

    const suivis: ContactSuivi[] = data.contacts.map((c) => {
      const dernier = dernierEchange(c.id, data.echanges);
      return { c, dernier, jours: dernier ? diffDays(today(), dernier) : null, oublie: aRecontacter(dernier, reglages.delai_contact_mois) };
    });
    const contactsARecontacter = suivis.filter((x) => x.oublie).sort((a, b) => (b.jours ?? 0) - (a.jours ?? 0));

    const actionsContacts: { e: Echange; c: Contact }[] = data.echanges
      .filter((e) => e.prochaine_action && e.prochaine_date && e.prochaine_date <= today())
      .map((e) => ({ e, c: data.contacts.find((k) => k.id === e.contact_id)! }))
      .filter((x) => x.c)
      .sort((a, b) => (a.e.prochaine_date ?? "").localeCompare(b.e.prochaine_date ?? ""));

    return {
      offres, prods, metiersChoisis, offresPerimetre, nouvellesOffres, prodsMoment, prodsSurveillees,
      relancesDues, actionsCandidatures, suivis, contactsARecontacter, actionsContacts,
      compteurs: {
        veille: nouvellesOffres.length,
        candidatures: relancesDues.length + actionsCandidatures.length,
        contacts: contactsARecontacter.length,
      },
    };
  }, [collecte, data, reglages, visitePrecedente]);
}

/** Candidatures envoyées par semaine (lundi), sur les `n` dernières semaines. */
export function envoyeesParSemaine(candidatures: Candidature[], n = 8) {
  const d = new Date();
  const jour = (d.getDay() + 6) % 7; // 0 = lundi
  const lundi = addDays(today(), -jour);
  const semaines = Array.from({ length: n }, (_, i) => addDays(lundi, -7 * (n - 1 - i)));
  return semaines.map((debut, i) => {
    const fin = addDays(debut, 7);
    const nb = candidatures.filter((c) => c.date_envoi && c.statut !== "a_preparer" && c.date_envoi >= debut && c.date_envoi < fin).length;
    return { debut, nb, courant: i === n - 1 };
  });
}

export const REPONDUES = ["entretien", "peut_etre", "refus", "acceptee"];
