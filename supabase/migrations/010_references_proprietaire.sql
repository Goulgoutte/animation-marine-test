-- Références croisées : une ligne ne peut pointer que vers des lignes de la même personne.
-- Idempotent. À exécuter après 009 (partage de vue).
--
-- Pourquoi : avec le partage de vue, une invitée lit les identifiants des contacts, studios et
-- candidatures de la propriétaire. Sans ces contrôles, elle pourrait créer dans son propre compte des
-- lignes qui s'y rattachent (rien n'est lu ni modifié chez la propriétaire, mais les contraintes
-- d'unicité globales lui permettraient de bloquer certaines insertions). Les insertions et
-- modifications vérifient donc que chaque référence appartient à auth.uid(), et l'unicité de
-- contact_studios devient propre à chaque compte.

-- contact_studios : contact et studio doivent être à moi ; unicité par compte.
alter table public.contact_studios drop constraint if exists contact_studios_contact_id_studio_id_role_key;
alter table public.contact_studios drop constraint if exists contact_studios_unique;
alter table public.contact_studios add constraint contact_studios_unique unique (user_id, contact_id, studio_id, role);

drop policy if exists contact_studios_insert_own on public.contact_studios;
create policy contact_studios_insert_own on public.contact_studios for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
  and exists (select 1 from public.studios s where s.id = studio_id and s.user_id = auth.uid())
);
drop policy if exists contact_studios_update_own on public.contact_studios;
create policy contact_studios_update_own on public.contact_studios for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
  and exists (select 1 from public.studios s where s.id = studio_id and s.user_id = auth.uid())
);

-- echanges : le contact doit être à moi.
drop policy if exists echanges_insert_own on public.echanges;
create policy echanges_insert_own on public.echanges for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
);
drop policy if exists echanges_update_own on public.echanges;
create policy echanges_update_own on public.echanges for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())
);

-- relances : la candidature doit être à moi.
drop policy if exists relances_insert_own on public.relances;
create policy relances_insert_own on public.relances for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.candidatures k where k.id = candidature_id and k.user_id = auth.uid())
);
drop policy if exists relances_update_own on public.relances;
create policy relances_update_own on public.relances for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.candidatures k where k.id = candidature_id and k.user_id = auth.uid())
);

-- contacts : le groupe CRM, s'il est renseigné, doit être à moi.
drop policy if exists contacts_insert_own on public.contacts;
create policy contacts_insert_own on public.contacts for insert with check (
  user_id = auth.uid()
  and (groupe_id is null or exists (select 1 from public.crm_groupes g where g.id = groupe_id and g.user_id = auth.uid()))
);
drop policy if exists contacts_update_own on public.contacts;
create policy contacts_update_own on public.contacts for update using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and (groupe_id is null or exists (select 1 from public.crm_groupes g where g.id = groupe_id and g.user_id = auth.uid()))
);
