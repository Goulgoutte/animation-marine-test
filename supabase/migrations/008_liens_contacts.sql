-- Liens entre personnes du réseau (ami, présenté par, collègue, même école…).
-- Pour « presente_par », le sens compte : contact_a a présenté contact_b.
-- Idempotent : peut être rejoué sans effet. À exécuter dans le SQL Editor de Supabase.
--
-- Sécurité : un lien ne peut relier que des contacts appartenant à la même personne que le lien
-- (vérifié à l'insertion et à la modification). L'unicité est propre à chaque compte : avec le partage
-- de vue (009), une invitée voit les identifiants des contacts de la propriétaire et ne doit pas pouvoir
-- créer de liens qui s'y rattachent ni bloquer ses insertions.

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
  constraint liens_contacts_unique unique (user_id, contact_a, contact_b, type)
);

create index if not exists liens_contacts_a_idx on public.liens_contacts (contact_a);
create index if not exists liens_contacts_b_idx on public.liens_contacts (contact_b);
create index if not exists liens_contacts_user_idx on public.liens_contacts (user_id);

alter table public.liens_contacts enable row level security;

drop policy if exists liens_contacts_select_own on public.liens_contacts;
create policy liens_contacts_select_own on public.liens_contacts for select using (user_id = auth.uid());

drop policy if exists liens_contacts_insert_own on public.liens_contacts;
create policy liens_contacts_insert_own on public.liens_contacts for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_a and c.user_id = auth.uid())
  and exists (select 1 from public.contacts c where c.id = contact_b and c.user_id = auth.uid())
);

drop policy if exists liens_contacts_update_own on public.liens_contacts;
create policy liens_contacts_update_own on public.liens_contacts for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_a and c.user_id = auth.uid())
  and exists (select 1 from public.contacts c where c.id = contact_b and c.user_id = auth.uid())
);

drop policy if exists liens_contacts_delete_own on public.liens_contacts;
create policy liens_contacts_delete_own on public.liens_contacts for delete using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.liens_contacts to authenticated;
revoke all on public.liens_contacts from anon;
