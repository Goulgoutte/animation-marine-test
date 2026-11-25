"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, CalendarCheck, Check, CheckCircle2, Film, Radar, RefreshCw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Avatar, Kpi, Vide } from "@/components/ui";
import { fmtCourt, ilYa, diffDays, today } from "@/lib/dates";
import { envoyeesParSemaine, REPONDUES, useIndicateurs } from "@/lib/indicateurs";
import { prochaineRelance } from "@/lib/relances";
import { COULEUR, LIBELLE, santeSource } from "@/lib/sante";
import { useStore, type Focus } from "@/lib/store";
import { LABEL_FORMAT, LABEL_MODE, LABEL_STATUT_PROD } from "@/lib/veille";

const dateLongue = () => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Accueil() {
  const s = useStore();
  const router = useRouter();
  const ind = useIndicateurs();
  const { candidatures, relances } = s.data;

  const semaines = useMemo(() => envoyeesParSemaine(candidatures, 8), [candidatures]);
  const envoyees = candidatures.filter((c) => c.date_envoi && c.statut !== "a_preparer");
  const reponses = envoyees.filter((c) => REPONDUES.includes(c.statut)).length;
  const entretiens = envoyees.filter((c) => c.statut === "entretien" || c.statut === "acceptee").length;
  const acceptees = envoyees.filter((c) => c.statut === "acceptee").length;
  const entonnoir = [
    { label: "Envoyées", n: envoyees.length, ton: "var(--accent)" },
    { label: "Réponses", n: reponses, ton: "var(--info)" },
    { label: "Entretiens", n: entretiens, ton: "#8a52d9" },
    { label: "Acceptées", n: acceptees, ton: "var(--ok)" },
  ];

  const aFaire = ind.relancesDues.length + ind.actionsContacts.length;

  function ouvrir(f: Focus, chemin: string) {
    s.setFocus(f);
    router.push(chemin);
  }
  function relancer(id: string) {
    s.add("relances", { candidature_id: id, date: today(), canal: "mail", note: null });
    s.patch("candidatures", id, { statut: "relancee", cloture_auto: false, cloture_annulee: false });
  }
  function actionFaite(id: string) {
    const x = s.data.echanges.find((e) => e.id === id);
    if (!x) return;
    s.patch("echanges", id, {
      prochaine_action: null, prochaine_date: null,
      sujets: [x.sujets, `Fait : ${x.prochaine_action} (${fmtCourt(today())})`].filter(Boolean).join(" · "),
    });
  }

  const sources = (s.collecte?.sources.sources ?? []).filter((x) => x.actif && x.methode !== "manuel");
  const sante = sources.map((x) => ({ x, st: santeSource(x) }));
  const nbOk = sante.filter((x) => x.st === "vert").length;
  const nbSurv = sante.filter((x) => x.st === "orange").length;
  const nbErr = sante.filter((x) => x.st === "rouge").length;
  const dernier = s.collecte?.sources.genereLe ?? s.collecte?.offres.genereLe;
  const pb = sante.filter((x) => x.st === "rouge" || x.st === "orange").slice(0, 3);

  return (
    <>
      <header className="mb-6">
        <p className="text-[13px] font-medium text-muted">{cap(dateLongue())}</p>
        <h1 className="titre-page mt-0.5">Bonjour{s.profil?.prenom ? ` ${s.profil.prenom}` : ""}</h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {aFaire > 0 ? <>Tu as <strong className="font-semibold text-fg">{aFaire} chose{aFaire > 1 ? "s" : ""} à faire</strong> aujourd’hui.</> : "Rien d’urgent aujourd’hui."}
          {ind.nouvellesOffres.length > 0 && <> {ind.nouvellesOffres.length} nouvelle{ind.nouvellesOffres.length > 1 ? "s" : ""} offre{ind.nouvellesOffres.length > 1 ? "s" : ""} décor depuis ta dernière visite.</>}
        </p>
      </header>

      <section aria-label="Indicateurs" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi href="/veille/" label="Nouvelles offres décor" valeur={ind.nouvellesOffres.length} icone={Radar} ton="accent" note="dans ton périmètre" />
        <Kpi href="/veille/?onglet=productions" label="Bon moment pour candidater" valeur={ind.prodsMoment.length} icone={Sparkles} ton="ok" note="productions à approcher" />
        <Kpi href="/candidatures/" label="Relances dues aujourd’hui" valeur={ind.relancesDues.length} icone={CalendarCheck} ton={ind.relancesDues.length ? "danger" : "info"} note={ind.relancesDues.length ? "à envoyer maintenant" : "tout est à jour"} />
        <Kpi href="/contacts/" label="Contacts à recontacter" valeur={ind.contactsARecontacter.length} icone={Users} ton="warn" note={`sans échange depuis ${s.reglages.delai_contact_mois} mois`} />
      </section>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="carte p-5 lg:col-span-3" aria-label="Candidatures envoyées par semaine">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">Candidatures envoyées</h2>
            <span className="micro">8 dernières semaines</span>
          </div>
          <div className="mt-3 h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semaines.map((w) => ({ ...w, label: fmtCourt(w.debut) }))} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--line)" }} tick={{ fill: "var(--muted)", fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} width={40} />
                <Tooltip
                  cursor={{ fill: "var(--accent-soft)" }}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, boxShadow: "var(--ombre)" }}
                  labelFormatter={(l) => `Semaine du ${l}`}
                  formatter={(v) => [v, "Envoyées"]}
                />
                <Bar dataKey="nb" radius={[6, 6, 2, 2]} maxBarSize={36} animationDuration={400}>
                  {semaines.map((w) => <Cell key={w.debut} fill={w.courant ? "var(--accent)" : "color-mix(in srgb, var(--accent) 45%, var(--surface))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="carte p-5 lg:col-span-2" aria-label="Entonnoir des candidatures">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">Entonnoir</h2>
            <Link href="/candidatures/" className="micro inline-flex items-center gap-1 hover:text-fg">Candidatures <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <ul className="mt-4 space-y-3.5">
            {entonnoir.map((e, i) => {
              const base = entonnoir[0].n || 1;
              const prec = entonnoir[i - 1]?.n;
              return (
                <li key={e.label}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="font-medium">{e.label}</span>
                    <span><strong className="text-[15px]">{e.n}</strong>{i > 0 && prec ? <span className="micro ml-1.5">{Math.round((e.n / prec) * 100)} %</span> : null}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(e.n ? 4 : 0, (e.n / base) * 100)}%`, background: e.ton }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {envoyees.length === 0 && <p className="micro mt-4">Le suivi se remplit dès que tu marques une candidature comme envoyée.</p>}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="carte p-5 lg:col-span-3" aria-label="À faire aujourd’hui">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">À faire aujourd’hui</h2>
            {aFaire > 0 && <span className="badge c-danger">{aFaire}</span>}
          </div>
          {aFaire === 0 ? (
            <div className="mt-4"><Vide icone={CheckCircle2} titre="Tout est à jour">Aucune relance due ni action de contact en retard. Profites-en pour regarder les nouvelles productions.</Vide></div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {ind.relancesDues.map((c) => {
                const p = prochaineRelance(c, relances, s.reglages)!;
                const retard = diffDays(today(), p);
                return (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => ouvrir({ kind: "candidature", id: c.id }, "/candidatures/")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <Avatar nom={c.studio || "?"} taille={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold">Relancer {c.studio || "sans studio"}</span>
                        <span className="micro block truncate">{c.poste} · {retard > 0 ? `en retard de ${retard} j` : "échéance aujourd’hui"}</span>
                      </span>
                    </button>
                    <button className="bouton bouton-petit flex-none" onClick={() => relancer(c.id)} title="Enregistre une relance aujourd’hui"><Check />J’ai relancé</button>
                  </li>
                );
              })}
              {ind.actionsContacts.map(({ e, c }) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <button onClick={() => ouvrir({ kind: "contact", id: c.id }, "/contacts/")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar nom={`${c.prenom} ${c.nom}`} taille={36} rond />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">{e.prochaine_action}</span>
                      <span className="micro block truncate">{c.prenom} {c.nom}{c.structure ? ` · ${c.structure}` : ""} · prévu le {fmtCourt(e.prochaine_date)}</span>
                    </span>
                  </button>
                  <button className="bouton bouton-petit flex-none" onClick={() => actionFaite(e.id)}><Check />Fait</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte p-5 lg:col-span-2" aria-label="Santé de la collecte">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">Santé de la collecte</h2>
            <Link href="/reglages/" className="micro inline-flex items-center gap-1 hover:text-fg">Sources <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[13px]"><RefreshCw className="h-3.5 w-3.5 text-muted" />Dernière collecte : <strong className="font-semibold">{dernier ? `${fmtCourt(dernier)} (${ilYa(Math.max(0, diffDays(today(), dernier.slice(0, 10))))})` : "jamais"}</strong></p>
          {sources.length > 0 && (
            <>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_7%,transparent)]" role="img" aria-label={`${nbOk} sources en bonne santé, ${nbSurv} à surveiller, ${nbErr} en erreur`}>
                <span style={{ width: `${(nbOk / sources.length) * 100}%`, background: COULEUR.vert }} />
                <span style={{ width: `${(nbSurv / sources.length) * 100}%`, background: COULEUR.orange }} />
                <span style={{ width: `${(nbErr / sources.length) * 100}%`, background: COULEUR.rouge }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-xl font-bold" style={{ color: COULEUR.vert }}>{nbOk}</p><p className="micro">OK</p></div>
                <div><p className="text-xl font-bold" style={{ color: COULEUR.orange }}>{nbSurv}</p><p className="micro">À surveiller</p></div>
                <div><p className="text-xl font-bold" style={{ color: COULEUR.rouge }}>{nbErr}</p><p className="micro">En erreur</p></div>
              </div>
              {pb.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {pb.map(({ x, st }) => (
                    <li key={x.id} className="flex items-center gap-2 text-[12.5px]">
                      <span className="pastille" style={{ background: COULEUR[st] }} title={LIBELLE[st]} />
                      <span className="min-w-0 flex-1 truncate font-medium">{x.nom}</span>
                      <span className="micro">{st === "rouge" ? "muette" : "à surveiller"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {sources.length === 0 && <p className="micro mt-4">Aucune source collectée pour l’instant.</p>}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="carte p-5" aria-label="Dernières offres">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">Dernières offres décor</h2>
            <Link href="/veille/" className="micro inline-flex items-center gap-1 hover:text-fg">Tout voir <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {ind.offresPerimetre.length === 0 ? (
            <div className="mt-3"><Vide icone={Radar} titre="Pas d’offre dans ton périmètre">La collecte passe deux fois par jour. Tu peux aussi ajouter une annonce à la main.</Vide></div>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {ind.offresPerimetre.slice(0, 5).map((o) => (
                <li key={o.id}>
                  <button onClick={() => ouvrir({ kind: "offre", id: o.id }, "/veille/")} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <Avatar nom={o.studio ?? o.titre} taille={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{o.titre}</span>
                      <span className="micro block truncate">{[o.studio, LABEL_MODE[o.modeTravail]].filter(Boolean).join(" · ")}</span>
                    </span>
                    {o.nouveau && <span className="badge badge-plein c-accent flex-none">Nouveau</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte p-5" aria-label="Productions à surveiller">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="titre-section">Productions à surveiller</h2>
            <Link href="/veille/?onglet=productions" className="micro inline-flex items-center gap-1 hover:text-fg">Tout voir <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {ind.prodsSurveillees.length === 0 ? (
            <div className="mt-3"><Vide icone={Film} titre="Aucune production repérée">Les productions 2D qui démarrent apparaîtront ici.</Vide></div>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {ind.prodsSurveillees.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <button onClick={() => ouvrir({ kind: "production", id: p.id }, "/veille/")} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2">
                    <Avatar nom={p.studiosFabrication[0] ?? p.producteurs[0] ?? p.titre} taille={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">{p.titre}</span>
                      <span className="micro block truncate">{[LABEL_FORMAT[p.format], LABEL_STATUT_PROD[p.statut], p.producteurs[0]].filter(Boolean).join(" · ")}</span>
                    </span>
                    {p.bonMomentDecor && <span className="badge c-ok flex-none"><Sparkles />Bon moment</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
