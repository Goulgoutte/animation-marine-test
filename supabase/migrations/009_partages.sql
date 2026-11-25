-- Partage de vue en lecture seule : une personne (la propriétaire) autorise une autre (l'invitée,
-- identifiée par son e-mail Google) à LIRE toute son app, sans rien pouvoir modifier.
--
-- Modèle de sécurité
--   1. Seule la propriétaire crée, active, désactive ou supprime un partage (table partages,
--      RLS : proprietaire = auth.uid()). L'invitée ne peut que lire les lignes qui la concernent, et
--      seulement tant que actif = true. Révocation immédiate : décocher ou supprimer la ligne.
--   2. Toutes les tables par utilisateur gardent des politiques insert/update/delete « propriétaire
--      seulement » (user_id = auth.uid()) : personne ne peut écrire chez quelqu'un d'autre, partage
--      ou non. Seule la politique SELECT change : user_id = moi OU un partage actif m'a été accordé.
--   3. Le test de partage passe par public.peut_lire(owner), fonction security definer : elle lit
--      partages sans repasser par sa RLS (pas de récursion) et ne renvoie qu'un booléen. Sans partage,
--      on ne voit que ses propres lignes. La table sources (publique) n'est pas concernée.
--
-- Côté appli : un select sans filtre renvoie désormais aussi les lignes partagées. Le client filtre
-- donc toujours par .eq('user_id', propriétaire affiché).
--
-- Idempotent : peut être rejoué sans effet. À exécuter dans le SQL Editor de Supabase, après 002 à 008.
-- Si liens_contacts n'existe pas encore, rejouer cette migration une fois sa table créée.

create table if not exists public.partages (
  id uuid primary key default gen_random_uuid(),
  proprietaire uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invite_email text not null check (invite_email = lower(btrim(invite_email)) and invite_email <> ''),
  actif boolean not null default true,
  proprietaire_nom text,      -- remplis par la propriétaire à partir de son profil Google, pour l'affichage chez l'invitée
  proprietaire_avatar text,
  created_at timestamptz not null default now(),
  unique (proprietaire, invite_email)
);

alter table public.partages add column if not exists proprietaire_nom text;
alter table public.partages add column if not exists proprietaire_avatar text;

create index if not exists partages_invite_idx on public.partages (lower(invite_email)) where actif;

alter table public.partages enable row level security;

drop policy if exists partages_select_proprietaire on public.partages;
create policy partages_select_proprietaire on public.partages for select using (proprietaire = auth.uid());

drop policy if exists partages_select_invite on public.partages;
create policy partages_select_invite on public.partages for select
  using (actif and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists partages_insert_proprietaire on public.partages;
create policy partages_insert_proprietaire on public.partages for insert with check (proprietaire = auth.uid());

drop policy if exists partages_update_proprietaire on public.partages;
create policy partages_update_proprietaire on public.partages for update
  using (proprietaire = auth.uid()) with check (proprietaire = auth.uid());

drop policy if exists partages_delete_proprietaire on public.partages;
create policy partages_delete_proprietaire on public.partages for delete using (proprietaire = auth.uid());

-- Peut-on lire les lignes de « owner » ? Oui si ce sont les siennes ou si un partage actif nous est accordé.
create or replace function public.peut_lire(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select owner = auth.uid()
    or exists (
      select 1 from public.partages p
      where p.proprietaire = owner
        and p.actif
        and lower(p.invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

revoke all on function public.peut_lire(uuid) from public, anon;
grant execute on function public.peut_lire(uuid) to authenticated;

-- Politique SELECT : propriétaire OU partage actif. Insert, update et delete ne changent pas.
do $$
declare
  t text;
begin
  foreach t in array array[
    'candidatures', 'relances', 'contacts', 'echanges',
    'offres_manuelles', 'productions_manuelles', 'corrections', 'masquages',
    'reglages', 'crm_colonnes', 'crm_groupes', 'modeles_mail',
    'studios', 'contact_studios'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_partage', t);
    execute format('create policy %I on public.%I for select using (public.peut_lire(user_id))', t || '_select_partage', t);
  end loop;

  -- Créée en parallèle par une autre branche : n'agir que si elle existe déjà.
  if to_regclass('public.liens_contacts') is not null then
    drop policy if exists liens_contacts_select_own on public.liens_contacts;
    drop policy if exists liens_contacts_select_partage on public.liens_contacts;
    create policy liens_contacts_select_partage on public.liens_contacts for select using (public.peut_lire(user_id));
  end if;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.partages to authenticated;
revoke all on public.partages from anon;
