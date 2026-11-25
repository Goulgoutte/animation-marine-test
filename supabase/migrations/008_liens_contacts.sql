-- Liens entre personnes du réseau (ami, présenté par, collègue, même école…).
-- Pour « presente_par », le sens compte : contact_a a présenté contact_b.
-- Idempotent : peut être rejoué sans effet. À exécuter dans le SQL Editor de Supabase.

create table if not exists public.liens_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_a uuid not null references public.contacts(id) on delete cascade,
  contact_b uuid not null references public.contacts(id) on delete cascade,
  type text not null default 'autre',            -- ami | presente_par | collegue | meme_ecole | autre
  production text,                               -- ex. « a bossé avec moi sur Les Vacances de Zoé »
  note text,
  created_at timestamptz not null default now(),
  constraint liens_contacts_type_check check (type in ('ami', 'presente_par', 'collegue', 'meme_ecole', 'autre')),
  constraint liens_contacts_distincts check (contact_a <> contact_b),
  unique (contact_a, contact_b, type)
);

create index if not exists liens_contacts_a_idx on public.liens_contacts (contact_a);
create index if not exists liens_contacts_b_idx on public.liens_contacts (contact_b);
create index if not exists liens_contacts_user_idx on public.liens_contacts (user_id);

do $$
declare
  t text;
begin
  foreach t in array array['liens_contacts']
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
grant select, insert, update, delete on public.liens_contacts to authenticated;
revoke all on public.liens_contacts from anon;
