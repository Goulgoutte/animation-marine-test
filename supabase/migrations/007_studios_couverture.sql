-- Image de couverture des fiches studios (URL). Idempotent : peut être rejoué sans effet.
-- À exécuter dans le SQL Editor de Supabase.

alter table public.studios add column if not exists couverture text;
