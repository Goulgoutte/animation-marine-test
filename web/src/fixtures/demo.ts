import { colonnesParDefaut, groupesParDefaut } from "@/lib/crm";
import { addDays, today } from "@/lib/dates";
import type { Donnees } from "@/lib/types";
import { studioVide } from "@/lib/studios";
import { REGLAGES_DEFAUT } from "@/lib/types";

// Vignette de démonstration (SVG intégré : aucun accès réseau).
const couvertureDemo = (a: string, b: string, soleil: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 200" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="900" height="200" fill="url(#g)"/><circle cx="450" cy="80" r="24" fill="${soleil}" opacity=".9"/><path d="M0 130 C140 80 260 120 400 110 S700 70 900 120 V200 H0Z" fill="#fff" opacity=".18"/><path d="M0 160 C180 130 320 170 480 150 S760 130 900 160 V200 H0Z" fill="#000" opacity=".2"/></svg>`)}`;
const IMAGE_DEMO = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b8def"/><stop offset="1" stop-color="#b06ad8"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><path d="M0 56 C18 38 32 46 46 52 S70 36 80 48 V80 H0Z" fill="#fff" opacity=".35"/><circle cx="58" cy="22" r="8" fill="#ffe08a"/></svg>')}`;

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
    image: null,
    email_destinataire: null,
    gmail_brouillon_id: null,
  };
  return {
    candidatures: [
      { ...base, id: "demo-c1", studio: "Caribara", poste: "Candidature spontanée, décor couleur", type: "spontanee", categorie: "decor", date_envoi: addDays(t, -20), canal: "mail", statut: "envoyee", contact_id: "demo-k1", production_id: "prod-demo-1", image: IMAGE_DEMO },
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
      { id: "demo-k7", nom: "Carré", prenom: "Inès", structure: "La Chouette Compagnie", fonction: "Cheffe décorateur", ville: "Paris", email: "ines@example.org", telephone: null, linkedin: null, rencontre: "Rencontrée à Annecy", etiquettes: ["décor"], groupe_id: "demo-g0", ordre: 3, champs: { "demo-col-relation": "bon_contact" } },
      { id: "demo-k8", nom: "Vidal", prenom: "Camille", structure: null, fonction: "Décoratrice indépendante", ville: "Paris", email: null, telephone: null, linkedin: null, rencontre: "Ancienne de l’école", etiquettes: ["école"], groupe_id: "demo-g1", ordre: 2, champs: { "demo-col-relation": "bon_contact" } },
      { id: "demo-k9", nom: "Hamon", prenom: "Nils", structure: null, fonction: "Animateur 2D", ville: "Montreuil", email: null, telephone: null, linkedin: null, rencontre: null, etiquettes: [], groupe_id: "demo-g1", ordre: 3, champs: { "demo-col-relation": "contacte" } },
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
    studios: [
      { ...studioVide("La Chouette Compagnie", "Paris"), id: "demo-s1", couverture: couvertureDemo("#4a63d8", "#a05bd0", "#ffe08a"), adresse: "14 rue des Vinaigriers, 75010 Paris", pays: "France", site: "https://example.org/la-chouette", email_recrutement: "recrutement@example.org", page_recrutement: "https://example.org/la-chouette/recrutement", description: "Studio de séries jeunesse en 2D. Équipe décor intégrée, ambiance familiale.", mode_travail: "mixte", techniques: ["2D"], taille: "30 à 50 personnes", notes: "Deux jours de présence par semaine pour le décor." },
      { ...studioVide("Caribara", "Paris"), id: "demo-s2", couverture: couvertureDemo("#2f9bb5", "#4f5bd5", "#ffd29a"), adresse: "Paris 11e", pays: "France", site: "https://example.org/caribara", description: "Production de films et séries d’animation pour la jeunesse.", mode_travail: "presentiel", techniques: ["2D", "3D"], taille: "20 à 30 personnes" },
      { ...studioVide("Blue Spirit", "Paris"), id: "demo-s3", pays: "France", description: "Studio de longs métrages et de séries.", mode_travail: "mixte", techniques: ["2D", "3D"], taille: "100 personnes et plus" },
      { ...studioVide("Folimage", "Valence"), id: "demo-s4", pays: "France", description: "Studio historique, papier découpé et stop-motion.", mode_travail: "presentiel", techniques: ["2D", "stop-motion"], taille: "50 à 100 personnes", notes: "Résidence sur place indispensable." },
    ],
    contact_studios: [
      { id: "demo-cs1", contact_id: "demo-k7", studio_id: "demo-s1", role: "contact", detail: "Cheffe décorateur, elle suit les recrutements décor" },
      { id: "demo-cs2", contact_id: "demo-k5", studio_id: "demo-s1", role: "ami", detail: "Régulière en décor depuis 2023" },
      { id: "demo-cs3", contact_id: "demo-k8", studio_id: "demo-s1", role: "ami", detail: "Fait des missions de fond de décor à la saison" },
      { id: "demo-cs4", contact_id: "demo-k1", studio_id: "demo-s2", role: "contact", detail: "Chargée de production" },
      { id: "demo-cs5", contact_id: "demo-k2", studio_id: "demo-s3", role: "contact", detail: "Superviseur décor" },
      { id: "demo-cs6", contact_id: "demo-k9", studio_id: "demo-s3", role: "ami", detail: "Animateur régulier sur les séries" },
    ],
    modeles_mail: [],
    reglages: [{ id: "demo-reglages", ...REGLAGES_DEFAUT, derniere_visite: addDays(t, -3) + "T08:00:00.000Z" }],
  };
}
