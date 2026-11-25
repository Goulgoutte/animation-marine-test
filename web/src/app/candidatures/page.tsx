"use client";

import { useMemo, useState } from "react";
import { EnTete, Onglets, Sheet, Vide } from "@/components/ui";
import { FicheCandidature } from "@/components/FicheCandidature";
import { nouvelleCandidature } from "@/lib/candidature";
import { fmt, fmtCourt, today } from "@/lib/dates";
import { aRelancer, prochaineRelance, relancesDe } from "@/lib/relances";
import { useStore } from "@/lib/store";
import { CANAUX, STATUTS, labelCanal, labelStatut, type Candidature, type Statut } from "@/lib/types";

export default function Candidatures() {
  const s = useStore();
  const [vue, setVue] = useState<"tableau" | "kanban">("kanban");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [nouvelle, setNouvelle] = useState(false);
  const { candidatures, relances } = s.data;

  const aRelancerListe = useMemo(
    () => candidatures.filter((c) => aRelancer(c, relances, s.reglages)).sort((a, b) => (prochaineRelance(a, relances, s.reglages) ?? "").localeCompare(prochaineRelance(b, relances, s.reglages) ?? "")),
    [candidatures, relances, s.reglages],
  );

  const mois = today().slice(0, 7);
  const envoyees = candidatures.filter((c) => c.date_envoi && c.statut !== "a_preparer");
  const ceMois = envoyees.filter((c) => c.date_envoi!.startsWith(mois)).length;
  const repondues = envoyees.filter((c) => ["entretien", "refus", "acceptee"].includes(c.statut)).length;
  const taux = envoyees.length ? Math.round((repondues / envoyees.length) * 100) : null;
  const parCanal = CANAUX.map((c) => ({ ...c, n: envoyees.filter((x) => x.canal === c.id).length })).filter((c) => c.n > 0);
  const parCat = [
    { id: "decor", label: "Décor", n: envoyees.filter((x) => x.categorie === "decor").length },
    { id: "autre", label: "Autres métiers", n: envoyees.filter((x) => x.categorie === "autre").length },
  ];

  const courante = candidatures.find((c) => c.id === ouverte) ?? null;

  function creer(p: Partial<Candidature>) {
    const c = s.add("candidatures", nouvelleCandidature(p));
    setNouvelle(false);
    setOuverte(c.id);
  }

  return (
    <>
      <EnTete
        surtitre="Candidatures"
        titre={aRelancerListe.length > 0 ? <><span className="text-[var(--color-red)]">{aRelancerListe.length}</span> à relancer</> : <>Suivi</>}
        droite={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}>+ Candidature</button>}
      />

      <section aria-label="Tableau de bord" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="carte p-4">
          <p className="meta">Envoyées ce mois</p>
          <p className="chiffre mt-3">{ceMois}</p>
        </div>
        <div className="carte p-4">
          <p className="meta">Taux de réponse</p>
          <p className="chiffre mt-3">{taux === null ? "—" : <>{taux}<span className="text-[.5em]">%</span></>}</p>
          <p className="micro mt-2">{repondues} réponses sur {envoyees.length} envoyées</p>
        </div>
        <div className="carte p-4">
          <p className="meta">Par canal</p>
          <ul className="mt-2 space-y-1 text-sm">
            {parCanal.length === 0 && <li className="micro">Rien d’envoyé pour l’instant.</li>}
            {parCanal.map((c) => (
              <li key={c.id} className="flex justify-between gap-2"><span>{c.label}</span><strong>{c.n}</strong></li>
            ))}
          </ul>
        </div>
        <div className="carte p-4">
          <p className="meta">Par catégorie</p>
          <ul className="mt-2 space-y-1 text-sm">
            {parCat.map((c) => (
              <li key={c.id} className="flex justify-between gap-2"><span>{c.label}</span><strong>{c.n}</strong></li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="À relancer aujourd’hui" className="mb-8">
        <h2 className="titre-xl mb-3">À relancer aujourd’hui</h2>
        {aRelancerListe.length === 0 ? (
          <p className="carte border-dashed p-4 text-sm text-[var(--color-mute)]">Rien à relancer. Quand une candidature envoyée atteint son délai ({s.reglages.delai_relance_1} jours ouvrés, puis {s.reglages.delai_relance_2}), elle apparaît ici.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {aRelancerListe.map((c) => {
              const p = prochaineRelance(c, relances, s.reglages)!;
              return (
                <li key={c.id}>
                  <button onClick={() => setOuverte(c.id)} className="carte carte-lien trait-rouge flex w-full items-center justify-between gap-3 p-3 text-left">
                    <span className="min-w-0">
                      <strong className="block truncate">{c.studio || "Sans studio"}</strong>
                      <span className="micro block truncate">{c.poste} · envoyée le {fmtCourt(c.date_envoi)} · {relancesDe(c, relances).length} relance(s)</span>
                    </span>
                    <span className="badge badge-plein b-nouveau">{p < today() ? `depuis le ${fmtCourt(p)}` : "aujourd’hui"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="titre-xl">Toutes</h2>
        <Onglets valeur={vue} onChange={setVue} options={[{ id: "kanban", label: "Kanban" }, { id: "tableau", label: "Tableau" }]} />
      </div>

      {candidatures.length === 0 ? (
        <Vide titre="Aucune candidature" action={<button className="bouton bouton-plein" onClick={() => setNouvelle(true)}>Créer une candidature</button>}>
          Depuis la Veille, « Ajouter à mes candidatures » ou « Préparer une candidature spontanée » crée une fiche préremplie. Tu peux aussi en créer une ici.
        </Vide>
      ) : vue === "kanban" ? (
        <div className="kanban">
          {STATUTS.map((st) => {
            const liste = candidatures.filter((c) => c.statut === st.id);
            return (
              <div key={st.id} className="min-w-0">
                <div className="mb-2 flex items-baseline justify-between border-b-[3px] pb-1" style={{ borderColor: st.couleur }}>
                  <h3 className="text-sm font-extrabold">{st.label}</h3>
                  <span className="font-serif text-2xl font-bold leading-none">{liste.length}</span>
                </div>
                <ul className="space-y-2">
                  {liste.length === 0 && <li className="micro rounded-lg border border-dashed border-[var(--color-line)] p-3">Vide</li>}
                  {liste.map((c) => (
                    <li key={c.id} className="carte p-3">
                      <button onClick={() => setOuverte(c.id)} className="block w-full text-left">
                        <strong className="block break-words leading-tight">{c.studio || "Sans studio"}</strong>
                        <span className="micro block break-words">{c.poste}</span>
                        <span className="micro mt-1 block">{c.date_envoi ? `Envoyée le ${fmtCourt(c.date_envoi)}` : "Pas encore envoyée"}</span>
                      </button>
                      <select aria-label={`Statut de ${c.studio}`} className="champ mt-2 !py-1 text-xs" value={c.statut} onChange={(e) => changerStatut(c, e.target.value as Statut)}>
                        {STATUTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[720px]">
            <thead>
              <tr><th>Studio</th><th>Poste</th><th>Statut</th><th>Envoi</th><th>Canal</th><th>Prochaine relance</th></tr>
            </thead>
            <tbody>
              {candidatures.map((c) => {
                const p = prochaineRelance(c, relances, s.reglages);
                return (
                  <tr key={c.id} data-cliquable onClick={() => setOuverte(c.id)}>
                    <td className="font-bold">{c.studio || "—"}</td>
                    <td>{c.poste}</td>
                    <td><span className="badge" style={{ color: STATUTS.find((x) => x.id === c.statut)?.couleur }}>{labelStatut(c.statut)}</span></td>
                    <td>{fmt(c.date_envoi)}</td>
                    <td>{labelCanal(c.canal)}</td>
                    <td className={p && p <= today() ? "font-bold text-[var(--color-red)]" : ""}>{p ? fmt(p) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {courante && <FicheCandidature c={courante} onClose={() => setOuverte(null)} />}
      {nouvelle && (
        <Sheet titre="Nouvelle candidature" onClose={() => setNouvelle(false)}>
          <NouvelleRapide onCreer={creer} />
        </Sheet>
      )}
    </>
  );

  function changerStatut(c: Candidature, statut: Statut) {
    const p: Partial<Candidature> = { statut, cloture_auto: false };
    if ((statut === "envoyee" || statut === "relancee") && !c.date_envoi) p.date_envoi = today();
    s.patch("candidatures", c.id, p);
  }
}

function NouvelleRapide({ onCreer }: { onCreer: (p: Partial<Candidature>) => void }) {
  const [studio, setStudio] = useState("");
  const [poste, setPoste] = useState("");
  const [spont, setSpont] = useState(false);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onCreer({ studio, poste: poste || (spont ? "Candidature spontanée" : ""), type: spont ? "spontanee" : "offre" });
      }}
    >
      <label className="flex flex-col gap-1"><span className="meta">Studio</span><input className="champ" required value={studio} onChange={(e) => setStudio(e.target.value)} autoFocus /></label>
      <label className="flex flex-col gap-1"><span className="meta">Poste</span><input className="champ" value={poste} onChange={(e) => setPoste(e.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spont} onChange={(e) => setSpont(e.target.checked)} /> Candidature spontanée</label>
      <button className="bouton bouton-plein">Créer et ouvrir la fiche</button>
    </form>
  );
}
