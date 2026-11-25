// Génère supabase/migrations/003_sources.sql à partir de config/sources.json : `pnpm migration`.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lireSourcesLocales, sourceEnLigne } from "./remote.ts";

const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);

export function construireMigration(): string {
  const lignes = lireSourcesLocales().map((s) => {
    const l = sourceEnLigne(s);
    return `  (${q(l.id)}, ${q(l.nom)}, ${q(l.url)}, ${q(l.type)}, ${q(l.methode)}, ${q(l.frequence)}, ${l.actif}, ${q(JSON.stringify(l.config))}::jsonb, ${q(l.notes)})`;
  });
  return `-- Veille animation : sources de collecte gérables depuis l'app (idempotent, à coller dans SQL Editor).
-- Fichier généré par \`pnpm migration\` (collector/) à partir de collector/config/sources.json : ne pas éditer les INSERT à la main.
--
-- Les sources ne sont pas sensibles (URLs publiques de sites d'emploi et de presse) :
--   * lecture publique : anon (la collecte GitHub Actions, avec la clé publique) et authenticated ;
--   * écriture réservée aux utilisateurs connectés :
--       - une source ajoutée dans l'app porte user_id = auth.uid() : seule sa propriétaire la modifie ou la supprime ;
--       - les sources par défaut (INSERT en bas de ce fichier) ont user_id null : toute personne connectée peut les
--         modifier (fréquence, activation, sélecteurs), personne ne peut les supprimer ;
--       - user_id ne change jamais après l'insertion (déclencheur).
-- Une source collectée = actif et fréquence échue (voir collector/src/collect.ts).

create table if not exists public.sources (
  id text primary key,
  nom text not null,
  url text not null,
  type text not null default 'actualite',        -- emploi | carriere-studio | actualite | base-projets
  methode text not null default 'html',          -- rss | html | playwright | manuel | lever | recruitee | teamtailor | workable | smartrecruiters | werecruit | cnc
  frequence text not null default 'quotidien',   -- 3h | 6h | 12h | quotidien | hebdo
  actif boolean not null default true,
  config jsonb not null default '{}'::jsonb,     -- selecteurs, filtre (regex sur le titre), studio, technique, lieuDefaut
  notes text,
  ajoutee_par_utilisatrice boolean not null default false,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_frequence_check check (frequence in ('3h', '6h', '12h', 'quotidien', 'hebdo'))
);

create index if not exists sources_user_idx on public.sources (user_id);

create or replace function public.sources_avant_maj() returns trigger
language plpgsql as $$
begin
  new.user_id := old.user_id;          -- la propriété d'une ligne ne change pas
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sources_avant_maj on public.sources;
create trigger sources_avant_maj before update on public.sources
  for each row execute function public.sources_avant_maj();

alter table public.sources enable row level security;

drop policy if exists sources_select_publique on public.sources;
create policy sources_select_publique on public.sources for select to anon, authenticated using (true);

drop policy if exists sources_insert_connecte on public.sources;
create policy sources_insert_connecte on public.sources for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists sources_update_proprietaire on public.sources;
create policy sources_update_proprietaire on public.sources for update to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id is null or user_id = auth.uid());

drop policy if exists sources_delete_proprietaire on public.sources;
create policy sources_delete_proprietaire on public.sources for delete to authenticated
  using (user_id = auth.uid());

grant select on public.sources to anon, authenticated;
grant insert, update, delete on public.sources to authenticated;

-- Sources par défaut (user_id null). on conflict do nothing : relancer le fichier n'écrase aucun réglage.
insert into public.sources (id, nom, url, type, methode, frequence, actif, config, notes) values
${lignes.join(",\n")}
on conflict (id) do nothing;
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const f = new URL("../../supabase/migrations/003_sources.sql", import.meta.url);
  writeFileSync(f, construireMigration());
  console.log(`Écrit ${fileURLToPath(f)}`);
}
