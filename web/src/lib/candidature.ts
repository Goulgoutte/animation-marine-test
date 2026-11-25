import type { Collecte } from "./store";
import type { Candidature, Donnees } from "./types";

export function nouvelleCandidature(p: Partial<Candidature>): Omit<Candidature, "id"> {
  return {
    studio: "", poste: "", type: "offre", categorie: "decor", offre_id: null, production_id: null, contact_id: null,
    source_url: null, date_envoi: null, canal: "mail", version_cv: null, statut: "a_preparer", statut_avant: null,
    cloture_auto: false, cloture_annulee: false, notes: null, liens: null,
    prochaine_action: null, prochaine_action_date: null, motif_cloture: null, date_statut: null,
    image: null, email_destinataire: null, gmail_brouillon_id: null, ...p,
  };
}

type AvecImage = { image?: string | null; logo?: string | null };

/**
 * Image de la candidature : celle de l'offre liée, sinon de la production liée (collectée, ajoutée à la main,
 * corrections comprises), sinon l'URL gardée sur la candidature si l'offre a disparu de la collecte.
 */
export function imageLiee(c: Candidature, collecte: Collecte | null, d: Donnees): string | null {
  const cherche = (kind: "offre" | "production", id: string | null): string | null => {
    if (!id) return null;
    const corr = d.corrections.find((x) => x.kind === kind && x.ref_id === id)?.champs as AvecImage | undefined;
    let base: AvecImage | undefined;
    if (id.startsWith("m:")) {
      const ligne = id.slice(2);
      base = (kind === "offre" ? d.offres_manuelles : d.productions_manuelles).find((m) => m.id === ligne)?.data;
    } else {
      base = (kind === "offre" ? collecte?.offres.offres : collecte?.productions.productions)?.find((o) => o.id === id);
    }
    const f = { ...base, ...corr };
    return f.image || f.logo || null;
  };
  return cherche("offre", c.offre_id) ?? cherche("production", c.production_id) ?? c.image ?? null;
}
