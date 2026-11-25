import type { Candidature } from "./types";

export function nouvelleCandidature(p: Partial<Candidature>): Omit<Candidature, "id"> {
  return {
    studio: "", poste: "", type: "offre", categorie: "decor", offre_id: null, production_id: null, contact_id: null,
    source_url: null, date_envoi: null, canal: "mail", version_cv: null, statut: "a_preparer", statut_avant: null,
    cloture_auto: false, cloture_annulee: false, notes: null, liens: null,
    prochaine_action: null, prochaine_action_date: null, motif_cloture: null, date_statut: null, ...p,
  };
}
