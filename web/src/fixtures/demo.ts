import { colonnesParDefaut, groupesParDefaut } from "@/lib/crm";
import { addDays, today } from "@/lib/dates";
import type { Donnees } from "@/lib/types";
import { REGLAGES_DEFAUT } from "@/lib/types";

// Jeu de départ du mode démo (localStorage) : de quoi voir les trois pages remplies.
export function donneesDemo(): Donnees {
  const t = today();
  const base = {
    offre_id: null,
    production_id: null,
    contact_id: null,
    source_url: null,
    version_cv: "CV décor v3",
    statut_avant: null,
    cloture_auto: false,
    cloture_annulee: false,
    notes: null,
    liens: null,
    prochaine_action: null,
    prochaine_action_date: null,
    motif_cloture: null,
    date_statut: null,
  };
  return {
    candidatures: [
      { ...base, id: "demo-c1", studio: "Caribara", poste: "Candidature spontanée, décor couleur", type: "spontanee", categorie: "decor", date_envoi: addDays(t, -20), canal: "mail", statut: "envoyee", contact_id: "demo-k1", production_id: "prod-demo-1" },
      { ...base, id: "demo-c2", studio: "Miyu Productions", poste: "Layout décor, série", type: "offre", categorie: "decor", date_envoi: addDays(t, -40), canal: "formulaire", statut: "relancee" },
      { ...base, id: "demo-c3", studio: "Folivari", poste: "Background artist", type: "offre", categorie: "decor", date_envoi: addDays(t, -6), canal: "linkedin", statut: "envoyee" },
      { ...base, id: "demo-c4", studio: "Blue Spirit", poste: "Color key artist", type: "offre", categorie: "decor", date_envoi: addDays(t, -30), canal: "recommandation", statut: "entretien", prochaine_action: "Entretien visio avec la direction artistique", prochaine_action_date: addDays(t, 3), date_statut: addDays(t, -5) },
      { ...base, id: "demo-c5", studio: "Mist Studio", poste: "Storyboardeuse", type: "offre", categorie: "autre", date_envoi: addDays(t, -50), canal: "mail", statut: "refus", motif_cloture: "Poste pourvu en interne", date_statut: addDays(t, -12) },
      { ...base, id: "demo-c6", studio: "Xilam", poste: "Candidature spontanée", type: "spontanee", categorie: "decor", date_envoi: null, canal: "mail", statut: "a_preparer" },
    ],
    relances: [
      { id: "demo-r1", candidature_id: "demo-c2", date: addDays(t, -25), canal: "mail", note: "Relance courte avec le portfolio mis à jour" },
    ],
    contacts: [
      { id: "demo-k1", nom: "Marchand", prenom: "Élise", structure: "Caribara", fonction: "Chargée de production", ville: "Paris", email: "elise@example.org", telephone: null, linkedin: null, rencontre: "Rencontrée à Annecy, devant la projection du pitch", etiquettes: ["Annecy", "production"], groupe_id: "demo-g0", ordre: 0, champs: { "demo-col-relation": "en_discussion", "demo-col-prochaine_action": addDays(t, -20), "demo-col-notes": "Me prévient dès que le casting décor s’ouvre." } },
      { id: "demo-k2", nom: "Dubois", prenom: "Karim", structure: "Blue Spirit", fonction: "Superviseur décor", ville: "Paris", email: null, telephone: "06 00 00 00 00", linkedin: null, rencontre: "Recommandé par une ancienne collègue", etiquettes: ["décor"], groupe_id: "demo-g0", ordre: 1, champs: { "demo-col-relation": "relance" } },
      { id: "demo-k3", nom: "Lopez", prenom: "Anaïs", structure: "Folivari", fonction: "Directrice artistique", ville: "Paris", email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: [], groupe_id: "demo-g0", ordre: 2, champs: { "demo-col-relation": "a_contacter" } },
      { id: "demo-k4", nom: "Roussel", prenom: "Théo", structure: "Festival d’Annecy", fonction: "Bénévole accueil", ville: "Annecy", email: "theo@example.org", telephone: null, linkedin: "https://www.linkedin.com/in/exemple", rencontre: null, etiquettes: ["Annecy"], groupe_id: "demo-g1", ordre: 0, champs: { "demo-col-relation": "bon_contact" } },
      { id: "demo-k5", nom: "Benali", prenom: "Samia", structure: "Ancienne école", fonction: "Intervenante décor", ville: "Lyon", email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: ["école"], groupe_id: "demo-g1", ordre: 1, champs: { "demo-col-relation": "contacte" } },
      { id: "demo-k6", nom: "Girard", prenom: "Julie", structure: "Mist Studio", fonction: "RH", ville: "Paris", email: "rh@example.org", telephone: "01 00 00 00 00", linkedin: null, rencontre: null, etiquettes: ["RH"], groupe_id: "demo-g2", ordre: 0, champs: { "demo-col-relation": "pas_de_suite" } },
    ],
    echanges: [
      { id: "demo-e1", contact_id: "demo-k1", date: addDays(t, -35), type: "cafe", lieu: "Paris 10e", sujets: "Série en développement, démarrage prévu à l’automne", promesses: "Elle me prévient quand le casting décor s’ouvre", prochaine_action: "Envoyer le portfolio", prochaine_date: addDays(t, -20) },
      { id: "demo-e2", contact_id: "demo-k2", date: addDays(t, -140), type: "visio", lieu: null, sujets: "Retour sur mon portfolio", promesses: null, prochaine_action: null, prochaine_date: null },
      { id: "demo-e3", contact_id: "demo-k4", date: addDays(t, -5), type: "message", lieu: null, sujets: "Échange sur les ateliers de Annecy", promesses: null, prochaine_action: null, prochaine_date: null },
      { id: "demo-e4", contact_id: "demo-k6", date: addDays(t, -62), type: "mail", lieu: null, sujets: "Réponse négative, garde le CV", promesses: null, prochaine_action: null, prochaine_date: null },
    ],
    offres_manuelles: [],
    productions_manuelles: [],
    corrections: [],
    masquages: [],
    crm_colonnes: colonnesParDefaut((cle) => `demo-col-${cle}`),
    crm_groupes: groupesParDefaut((i) => `demo-g${i}`),
    reglages: [{ id: "demo-reglages", ...REGLAGES_DEFAUT, derniere_visite: addDays(t, -3) + "T08:00:00.000Z" }],
  };
}
