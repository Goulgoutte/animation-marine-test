-- CRM des contacts façon tableau : colonnes personnalisables, groupes, champs libres.
-- Idempotent : peut être rejoué sans effet. À exécuter dans le SQL Editor de Supabase.

create table if not exists public.crm_colonnes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cle text not null default '',                  -- champ de contacts pour une colonne système, sinon libre
  titre text not null default '',
  type text not null default 'texte',            -- texte | texte_long | statut | etiquettes | date | nombre | lien | email | telephone | case | note | dernier_echange
  options jsonb not null default '{}'::jsonb,    -- { "libelles": [{ "id", "label", "couleur" }] }
  ordre int not null default 0,
  largeur int not null default 180,
  masquee boolean not null default false,
  systeme boolean not null default false,        -- colonne liée à un champ existant de contacts (ou calculée)
  created_at timestamptz not null default now()
);

create table if not exists public.crm_groupes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titre text not null default '',
  couleur text not null default '#5b5bd6',
  ordre int not null default 0,
  replie boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contacts add column if not exists groupe_id uuid references public.crm_groupes(id) on delete set null;
alter table public.contacts add column if not exists champs jsonb not null default '{}'::jsonb;  -- clé = id de colonne
alter table public.contacts add column if not exists ordre int;

create index if not exists crm_colonnes_user_idx on public.crm_colonnes (user_id, ordre);
create index if not exists crm_groupes_user_idx on public.crm_groupes (user_id, ordre);
create index if not exists contacts_groupe_idx on public.contacts (groupe_id);

do $$
declare
  t text;
begin
  foreach t in array array['crm_colonnes', 'crm_groupes']
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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.crm_colonnes, public.crm_groupes to authenticated;
revoke all on public.crm_colonnes, public.crm_groupes from anon;
