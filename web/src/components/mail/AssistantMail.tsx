"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, ExternalLink, FilePen, Send, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Champ, Sheet } from "@/components/ui";
import { ErreurGmail, LIEN_BROUILLONS, pause, useEtatGmail } from "@/lib/gmail";
import { adresseValide } from "@/lib/mime";
import { rendre, type CleVariable, type Replis } from "@/lib/modeles";
import { BoutonGmail, MSG_DEMO, gmailPret } from "./BoutonGmail";
import { ChampsMail } from "./ChampsMail";
import { useMail, type Cible } from "./useMail";

type Edition = { sujet?: string; corps?: string; email?: string };
type Ligne = { etat: "attente" | "encours" | "ok" | "erreur" | "saute"; message?: string };
const INTERVALLE_MS = 1000;

/** Envoi groupé : 1 modèle, 2 aperçu de chaque mail personnalisé, 3 brouillons (défaut) ou envoi confirmé. */
export function AssistantMail({ cibles, onClose }: { cibles: Cible[]; onClose: () => void }) {
  const mail = useMail();
  const etat = useEtatGmail();
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [replis, setReplis] = useState<Replis>({});
  const [editions, setEditions] = useState<Record<string, Edition>>({});
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<"brouillon" | "envoi">("brouillon");
  const [confirme, setConfirme] = useState(false);
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = useState(false);
  const [fini, setFini] = useState(false);
  const [arret, setArret] = useState<string | null>(null);
  const stop = useRef(false);

  const modele = mail.modeles.find((m) => m.id === modeleId) ?? mail.modeles[0];
  const mails = useMemo(
    () =>
      cibles.map((cible) => {
        const ed = editions[cible.cle] ?? {};
        const rs = modele ? rendre(modele.sujet, cible.valeurs, replis) : { texte: "", vides: [] as CleVariable[] };
        const rc = modele ? rendre(modele.corps, cible.valeurs, replis) : { texte: "", vides: [] as CleVariable[] };
        const email = (ed.email ?? cible.email).trim();
        return {
          cible,
          email,
          emailOk: adresseValide(email),
          sujet: ed.sujet ?? rs.texte,
          corps: ed.corps ?? rc.texte,
          modifie: ed.sujet !== undefined || ed.corps !== undefined,
          // Une partie retouchée à la main n'est plus régie par le modèle : ses variables ne comptent plus.
          vides: Array.from(new Set([...(ed.sujet !== undefined ? [] : rs.vides), ...(ed.corps !== undefined ? [] : rc.vides)])),
        };
      }),
    [cibles, editions, modele, replis],
  );
  const valides = mails.filter((m) => m.emailOk && m.sujet.trim() && m.corps.trim());
  const sansAdresse = mails.filter((m) => !m.emailOk);
  const avecVides = mails.filter((m) => m.vides.length > 0);
  const toutesVides = Array.from(new Set(mails.flatMap((m) => m.vides)));
  const courant = mails[Math.min(index, mails.length - 1)];
  const N = valides.length;

  const majEdition = (cle: string, p: Edition) => setEditions((e) => ({ ...e, [cle]: { ...e[cle], ...p } }));

  async function lancer() {
    stop.current = false;
    setEnCours(true);
    setArret(null);
    const init: Record<string, Ligne> = {};
    for (const m of mails) init[m.cible.cle] = m.emailOk && valides.includes(m) ? { etat: "attente" } : { etat: "saute", message: "Adresse manquante ou message vide" };
    setLignes({ ...init });
    let premier = true;
    for (const m of valides) {
      if (stop.current) break;
      if (!premier && mode === "envoi") await pause(INTERVALLE_MS);
      premier = false;
      if (stop.current) break;
      setLignes((l) => ({ ...l, [m.cible.cle]: { etat: "encours" } }));
      try {
        const r = await mail.livrer(m.cible, mode, m.email, m.sujet, m.corps);
        setLignes((l) => ({ ...l, [m.cible.cle]: { etat: "ok", message: r.simule ? "Simulé" : undefined } }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Échec.";
        setLignes((l) => ({ ...l, [m.cible.cle]: { etat: "erreur", message: msg } }));
        if (e instanceof ErreurGmail && e.reconnecter) {
          setArret("Connexion Gmail expirée ou refusée : les mails restants n’ont pas été traités. Reconnecte Gmail puis relance l’assistant.");
          break;
        }
      }
    }
    setEnCours(false);
    setFini(true);
  }

  const nbOk = Object.values(lignes).filter((l) => l.etat === "ok").length;
  const nbErr = Object.values(lignes).filter((l) => l.etat === "erreur").length;
  const verbe = mode === "brouillon" ? `Créer ${N} brouillon${N > 1 ? "s" : ""}` : `Envoyer ${N} mail${N > 1 ? "s" : ""}`;

  const pied = fini ? (
    <div className="flex justify-end"><button className="bouton bouton-plein" onClick={onClose}>Terminé</button></div>
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button className="bouton" disabled={enCours} onClick={() => (etape === 1 ? onClose() : setEtape((etape - 1) as 1 | 2))}>{etape === 1 ? "Annuler" : <><ArrowLeft />Retour</>}</button>
      {etape < 3 ? (
        <button className="bouton bouton-plein" disabled={!modele} onClick={() => setEtape((etape + 1) as 2 | 3)}>Continuer<ArrowRight /></button>
      ) : enCours ? (
        <button className="bouton" onClick={() => { stop.current = true; }}>Arrêter</button>
      ) : (
        <button className={`bouton ${mode === "brouillon" ? "bouton-plein" : "bouton-danger"}`} disabled={N === 0 || !gmailPret(etat) || (mode === "envoi" && !confirme)} onClick={lancer}>
          {mode === "brouillon" ? <FilePen /> : <Send />}{verbe}
        </button>
      )}
    </div>
  );

  return (
    <Sheet titre={`Préparer ${cibles.length} mail${cibles.length > 1 ? "s" : ""}`} sousTitre={`Étape ${etape} sur 3 · ${etape === 1 ? "Modèle" : etape === 2 ? "Aperçu" : "Brouillons ou envoi"}`} onClose={onClose} large pied={pied}>
      <ol className="mb-4 flex gap-1.5" aria-label="Étapes">
        {[1, 2, 3].map((n) => <li key={n} className="h-1 flex-1 rounded-full" style={{ background: n <= etape ? "var(--accent)" : "var(--line)" }} />)}
      </ol>

      {etape === 1 && (
        <div className="grid gap-3">
          <Champ label="Modèle de mail">
            <select className="champ" value={modele?.id ?? ""} onChange={(e) => setModeleId(e.target.value)} aria-label="Modèle de mail">
              {mail.modeles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </Champ>
          {modele && (
            <div className="rounded-xl bg-surface-2 p-3 text-[13px]">
              <p className="meta">Sujet</p>
              <p className="mt-0.5 font-semibold">{modele.sujet}</p>
              <p className="meta mt-2.5">Message</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-muted">{modele.corps}</p>
            </div>
          )}
          <p className="micro">{cibles.length} destinataire{cibles.length > 1 ? "s" : ""} : {cibles.map((c) => c.nom).join(", ")}. Les variables se remplissent pour chacun à l’étape suivante.</p>
        </div>
      )}

      {etape === 2 && courant && (
        <div className="grid gap-3">
          {(sansAdresse.length > 0 || avecVides.length > 0) && (
            <div role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] p-3 text-[13px]">
              <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 flex-none text-warn" />À vérifier avant de continuer</p>
              <ul className="mt-1.5 list-disc pl-5 text-muted">
                {sansAdresse.length > 0 && <li>{sansAdresse.length} destinataire{sansAdresse.length > 1 ? "s" : ""} sans adresse valide ({sansAdresse.map((m) => m.cible.nom).join(", ")}) : ignoré{sansAdresse.length > 1 ? "s" : ""} à l’étape 3.</li>}
                {avecVides.length > 0 && <li>{avecVides.length} mail{avecVides.length > 1 ? "s" : ""} avec des variables vides ({avecVides.map((m) => m.cible.nom).join(", ")}).</li>}
              </ul>
              {toutesVides.length > 0 && (
                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {toutesVides.map((cle) => (
                    <label key={cle} className="flex min-w-0 flex-col gap-1">
                      <span className="micro">Repli pour <code>{`{{${cle}}}`}</code> (tous les mails)</span>
                      <input className="champ !py-1.5" value={replis[cle] ?? ""} onChange={(e) => setReplis((r) => ({ ...r, [cle]: e.target.value }))} placeholder="Facultatif" />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button className="bouton bouton-icone" aria-label="Mail précédent" disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft /></button>
            <p className="min-w-0 text-center text-[13px]"><strong className="block truncate">{courant.cible.nom}</strong><span className="micro">Mail {index + 1} sur {mails.length}</span></p>
            <button className="bouton bouton-icone" aria-label="Mail suivant" disabled={index >= mails.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight /></button>
          </div>

          <Champ label="Destinataire">
            <input className="champ" type="email" inputMode="email" value={courant.email} onChange={(e) => majEdition(courant.cible.cle, { email: e.target.value })} placeholder="prenom@studio.fr" aria-invalid={!courant.emailOk} />
            {!courant.emailOk && <span className="micro text-warn">{courant.email ? "Adresse invalide." : "Adresse manquante : ce mail sera ignoré."}</span>}
          </Champ>
          <ChampsMail
            sujet={courant.sujet} corps={courant.corps} vides={courant.vides} replis={replis} lignes={10}
            onSujet={(v) => majEdition(courant.cible.cle, { sujet: v })}
            onCorps={(v) => majEdition(courant.cible.cle, { corps: v })}
            onRepli={(k, v) => setReplis((r) => ({ ...r, [k]: v }))}
            modifie={courant.modifie}
            onReset={() => setEditions((e) => ({ ...e, [courant.cible.cle]: { email: e[courant.cible.cle]?.email } }))}
          />
        </div>
      )}

      {etape === 3 && (
        <div className="grid gap-3">
          <BoutonGmail />
          {!fini && !enCours && (
            <>
              <div className="segment w-full" role="group" aria-label="Action">
                <button type="button" className="!flex-1 !justify-center" aria-pressed={mode === "brouillon"} onClick={() => { setMode("brouillon"); setConfirme(false); }}>Brouillons</button>
                <button type="button" className="!flex-1 !justify-center" aria-pressed={mode === "envoi"} onClick={() => setMode("envoi")}>Envoi direct</button>
              </div>
              <p className="text-[13px]">
                {mode === "brouillon"
                  ? <>Les {N} mails sont créés en <strong>brouillons</strong> dans Gmail : tu les relis et les envoies toi-même.</>
                  : <>Les {N} mails partent <strong>immédiatement</strong>, à environ 1 seconde d’intervalle.</>}
                {sansAdresse.length > 0 && ` ${sansAdresse.length} ignoré${sansAdresse.length > 1 ? "s" : ""} (sans adresse).`}
              </p>
              {mode === "envoi" && (
                <label className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-[13px]">
                  <input type="checkbox" className="mt-0.5 accent-[var(--danger)]" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
                  <span>Je confirme l’envoi de <strong>{N} mail{N > 1 ? "s" : ""}</strong> à leurs destinataires{etat === "demo" ? ` (${MSG_DEMO})` : ""}. Cette action est irréversible.</span>
                </label>
              )}
              {etat === "demo" && <p className="micro">{MSG_DEMO}.</p>}
            </>
          )}
          {(enCours || fini) && (
            <div>
              {fini && <p role="status" className="mb-2 text-[13px] font-semibold">{nbOk} {mode === "brouillon" ? `brouillon${nbOk > 1 ? "s" : ""} créé${nbOk > 1 ? "s" : ""}` : `mail${nbOk > 1 ? "s" : ""} envoyé${nbOk > 1 ? "s" : ""}`}{nbErr > 0 ? `, ${nbErr} en erreur` : ""}.{etat === "demo" ? ` ${MSG_DEMO}.` : ""}</p>}
              {arret && <p role="alert" className="mb-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-[13px] text-danger">{arret}</p>}
              {fini && mode === "brouillon" && nbOk > 0 && etat !== "demo" && <a className="mb-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent underline" href={LIEN_BROUILLONS} target="_blank" rel="noopener noreferrer">Ouvrir dans Gmail <ExternalLink className="h-3 w-3" /></a>}
            </div>
          )}
          {(enCours || fini) && (
            <ul className="divide-y divide-line rounded-xl border border-line" aria-label="Résultat par mail">
              {mails.map((m) => {
                const l = lignes[m.cible.cle] ?? { etat: "attente" as const };
                return (
                  <li key={m.cible.cle} className="flex items-start gap-2.5 px-3 py-2 text-[13px]">
                    <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center">
                      {l.etat === "ok" ? <Check className="h-4 w-4 text-ok" /> : l.etat === "erreur" ? <X className="h-4 w-4 text-danger" /> : l.etat === "encours" ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" /> : <span className="h-2 w-2 rounded-full bg-line" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate">{m.cible.nom}</strong>
                      <span className="micro block truncate">{m.email || "Pas d’adresse"} · {m.sujet}</span>
                      {l.message && <span className={`micro block break-words ${l.etat === "erreur" ? "!text-danger" : ""}`}>{l.message}</span>}
                    </span>
                    <span className="micro flex-none">{l.etat === "ok" ? "Réussi" : l.etat === "erreur" ? "Erreur" : l.etat === "saute" ? "Ignoré" : l.etat === "encours" ? "En cours" : "En attente"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}
