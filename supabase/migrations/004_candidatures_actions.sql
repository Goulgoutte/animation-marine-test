-- Candidatures : prochaine action, motif de clôture, date du dernier changement de statut (idempotent).
alter table public.candidatures
  add column if not exists prochaine_action text,
  add column if not exists prochaine_action_date date,
  add column if not exists motif_cloture text,
  add column if not exists date_statut date;      -- dernier changement de statut (réponse reçue, clôture…)
