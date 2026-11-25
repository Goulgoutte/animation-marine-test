-- Fiches studios et liens contact <-> studio (contact ou ami).
-- Idempotent : peut être rejoué sans effet. À exécuter dans le SQL Editor de Supabase.

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null default '',
  adresse text,
  ville text,
  pays text,
  site text,
  email_recrutement text,
  page_recrutement text,
  description text,
  mode_travail text not null default 'inconnu',  -- presentiel | teletravail | mixte | inconnu
  techniques text[] not null default '{}',       -- 2D, 3D, stop-motion…
  taille text,
  notes text,
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_studios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  role text not null default 'contact',          -- contact | ami
  detail text,                                   -- ex. « régulière en décor depuis 2023 »
  created_at timestamptz not null default now(),
  unique (contact_id, studio_id, role)
);

create index if not exists studios_user_idx on public.studios (user_id, nom);
create index if not exists contact_studios_studio_idx on public.contact_studios (studio_id);
create index if not exists contact_studios_contact_idx on public.contact_studios (contact_id);

do $$
declare
  t text;
begin
  foreach t in array array['studios', 'contact_studios']
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
grant select, insert, update, delete on public.studios, public.contact_studios to authenticated;
revoke all on public.studios, public.contact_studios from anon;
