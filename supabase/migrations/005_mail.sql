-- Mail : modèles, profil d'envoi, brouillons Gmail, image des candidatures (idempotent).

create table if not exists public.modeles_mail (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nom text not null default '',
  sujet text not null default '',
  corps text not null default '',                -- variables {{studio}}, {{poste}}, {{contact_prenom}}…
  categorie text not null default 'candidature', -- candidature | relance | remerciement | autre
  created_at timestamptz not null default now()
);

-- RLS « propriétaire seulement », comme les autres tables de schema.sql.
alter table public.modeles_mail enable row level security;

drop policy if exists modeles_mail_select_own on public.modeles_mail;
create policy modeles_mail_select_own on public.modeles_mail for select using (user_id = auth.uid());

drop policy if exists modeles_mail_insert_own on public.modeles_mail;
create policy modeles_mail_insert_own on public.modeles_mail for insert with check (user_id = auth.uid());

drop policy if exists modeles_mail_update_own on public.modeles_mail;
create policy modeles_mail_update_own on public.modeles_mail for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists modeles_mail_delete_own on public.modeles_mail;
create policy modeles_mail_delete_own on public.modeles_mail for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.modeles_mail to authenticated;
revoke all on public.modeles_mail from anon;

-- Candidatures : vignette, destinataire du mail, brouillon Gmail.
alter table public.candidatures
  add column if not exists image text,                 -- URL copiée de l'offre ou de la production liée
  add column if not exists email_destinataire text,    -- par défaut l'e-mail du contact lié
  add column if not exists gmail_brouillon_id text;    -- brouillon créé, pas encore envoyé

-- Réglages : profil d'envoi (prénom, nom, signature, portfolio, CV, adresse affichée).
alter table public.reglages
  add column if not exists profil_mail jsonb not null default '{}'::jsonb;
