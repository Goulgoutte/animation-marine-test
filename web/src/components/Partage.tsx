"use client";

import { Eye, Trash2, UserPlus } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Avatar } from "./ui";

function Interrupteur({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center" aria-label={label}>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 flex-none rounded-full bg-[color-mix(in_srgb,var(--fg)_18%,transparent)] transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-4" />
    </label>
  );
}

/** Réglages > Compte : la propriétaire active, coupe ou retire le partage de sa vue. */
export function PartagerMaVue() {
  const s = useStore();
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  if (s.lectureSeule) return null;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    const r = await s.partager(email);
    setEnvoi(false);
    setErreur(r);
    if (!r) setEmail("");
  }

  return (
    <div className="mt-5 border-t border-line pt-4" data-testid="partager-ma-vue">
      <h3 className="flex items-center gap-1.5 text-[14px] font-semibold"><Eye className="h-4 w-4 text-accent" />Partager ma vue</h3>
      <p className="micro mt-1">Cette personne verra tes candidatures, contacts, studios et notes, sans pouvoir rien modifier. Tu peux arrêter à tout moment.</p>
      <form onSubmit={envoyer} className="mt-3 flex flex-wrap items-start gap-2">
        <input className="champ min-w-0 flex-1 basis-56" type="email" required placeholder="adresse Gmail de la personne" aria-label="E-mail de la personne" value={email} onChange={(e) => { setEmail(e.target.value); setErreur(null); }} />
        <button className="bouton bouton-plein" type="submit" disabled={envoi || !email.trim()}><UserPlus />Partager en lecture seule</button>
      </form>
      {erreur && <p role="alert" className="micro mt-2 text-danger">{erreur}</p>}
      {s.mesPartages.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line" aria-label="Personnes avec qui je partage">
          {s.mesPartages.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold">{p.invite_email}</p>
                <p className="micro">{p.actif ? "Voit ta vue en lecture seule" : "Partage en pause"}</p>
              </div>
              <Interrupteur label={`Partage actif pour ${p.invite_email}`} checked={p.actif} onChange={(v) => s.majPartage(p.id, v)} />
              <button type="button" className="bouton bouton-texte bouton-icone text-danger" aria-label={`Arrêter le partage avec ${p.invite_email}`} onClick={() => s.retirerPartage(p.id)}><Trash2 /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Section du menu de l'avatar : choisir la vue à afficher. Rien si personne ne m'a rien partagé. */
export function VuesPartagees({ onChoix }: { onChoix?: () => void }) {
  const { partagesRecus, vue, changerVue } = useStore();
  if (partagesRecus.length === 0) return null;
  const aller = (id: string | null) => {
    changerVue(id);
    onChoix?.();
  };
  return (
    <>
      <div className="my-1 h-px bg-line" />
      <p className="meta px-2.5 pb-1 pt-1.5">Vues partagées avec moi</p>
      <button role="menuitem" onClick={() => aller(null)} className="nav-item w-full text-left" aria-current={!vue ? "true" : undefined}>
        Mon app
      </button>
      {partagesRecus.map((p) => (
        <button key={p.id} role="menuitem" onClick={() => aller(p.proprietaire)} className="nav-item w-full text-left" aria-current={vue?.id === p.id ? "true" : undefined}>
          <Avatar nom={p.proprietaire_nom ?? p.invite_email} url={p.proprietaire_avatar} taille={22} rond />
          <span className="min-w-0 flex-1 truncate">{p.proprietaire_nom ?? "Quelqu’un"}</span>
        </button>
      ))}
    </>
  );
}

/** Bandeau fixe en haut de la vue partagée. Publie sa hauteur dans --bandeau pour décaler les barres collantes. */
export function BandeauPartage() {
  const { vue, refus, changerVue } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const racine = document.documentElement;
    if (!el) {
      racine.style.removeProperty("--bandeau");
      return;
    }
    const maj = () => racine.style.setProperty("--bandeau", `${el.offsetHeight}px`);
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => {
      ro.disconnect();
      racine.style.removeProperty("--bandeau");
    };
  }, [vue]);
  if (!vue) return null;
  const nom = vue.proprietaire_nom ?? "quelqu’un";
  return (
    <div ref={ref} role="status" className="sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn px-4 py-2 text-center text-[13px] font-semibold text-white" data-testid="bandeau-partage">
      <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 flex-none" />Tu regardes l’app de {nom}, en lecture seule</span>
      <button className="rounded-lg bg-white/20 px-2.5 py-1 text-[12.5px] font-semibold hover:bg-white/30" onClick={() => changerVue(null)}>Revenir à mon app</button>
      {refus && <span className="basis-full text-[12.5px] font-medium" role="alert">{refus}</span>}
    </div>
  );
}
