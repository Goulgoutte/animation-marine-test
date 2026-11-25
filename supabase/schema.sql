-- Veille animation : schéma Supabase (idempotent, à coller dans SQL Editor).
-- Chaque table : user_id = utilisateur connecté, RLS « propriétaire seulement ».

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- candidatures
create table if not exists public.candidatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  studio text not null default '',
  poste text not null default '',
  type text not null default 'offre',            -- offre | spontanee
  categorie text not null default 'decor',       -- decor | autre
  offre_id text,                                 -- id d'une offre collectée ou manuelle
  production_id text,                            -- id d'une production collectée ou manuelle
  contact_id uuid,
  source_url text,
  date_envoi date,
  canal text not null default 'mail',            -- mail | formulaire | linkedin | salon | recommandation | autre
  version_cv text,
  statut text not null default 'a_preparer',     -- a_preparer | envoyee | relancee | entretien | refus | acceptee | sans_reponse
  statut_avant text,                             -- pour annuler un passage automatique en « sans réponse »
  cloture_auto boolean not null default false,
  cloture_annulee boolean not null default false,
  notes text,
  liens text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  candidature_id uuid not null references public.candidatures(id) on delete cascade,
  date date not null default current_date,
  canal text not null default 'mail',
  note text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null default '',
  prenom text not null default '',
  structure text,
  fonction text,
  ville text,
  email text,
  telephone text,
  linkedin text,
  rencontre text,
  etiquettes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.echanges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  date date not null default current_date,
  type text not null default 'message',          -- cafe | dejeuner | festival | visio | appel | message | mail
  lieu text,
  sujets text,
  promesses text,
  prochaine_action text,
  prochaine_date date,
  created_at timestamptz not null default now()
);

-- ----------------------------------------- ajouts et corrections faits à la main
create table if not exists public.offres_manuelles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,                           -- forme de shared/types.ts › Offre
  created_at timestamptz not null default now()
);

create table if not exists public.productions_manuelles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,                           -- forme de shared/types.ts › Production
  created_at timestamptz not null default now()
);

create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offre', 'production')),
  ref_id text not null,                          -- id de l'offre / production collectée
  champs jsonb not null default '{}'::jsonb,     -- surcharges champ par champ
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

create table if not exists public.masquages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offre', 'production')),
  ref_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

-- -------------------------------------------------------------------- réglages
create table if not exists public.reglages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  perimetre jsonb not null default '{"zone":"petite-couronne","teletravail":true,"langues":["fr","en"],"afficher3d":false}'::jsonb,
  delai_relance_1 int not null default 10,       -- jours ouvrés après l'envoi
  delai_relance_2 int not null default 15,       -- jours ouvrés après la relance précédente
  delai_contact_mois int not null default 3,
  derniere_visite timestamptz,                   -- badge « Nouveau »
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ index & RLS
create index if not exists relances_candidature_idx on public.relances (candidature_id);
create index if not exists echanges_contact_idx on public.echanges (contact_id);
create index if not exists candidatures_user_idx on public.candidatures (user_id, statut);

do $$
declare
  t text;
begin
  foreach t in array array[
    'candidatures', 'relances', 'contacts', 'echanges', 'offres_manuelles',
    'productions_manuelles', 'corrections', 'masquages', 'reglages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('create policy %I on public.%I for select using (user_id = auth.uid())', t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('create policy %I on public.%I for insert with check (user_id = auth.uid())', t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('create policy %I on public.%I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format('create policy %I on public.%I for delete using (user_id = auth.uid())', t || '_delete_own', t);
  end loop;
end $$;

-- Droits explicites pour les utilisateurs connectés (les nouveaux projets ne les donnent plus d'office).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
