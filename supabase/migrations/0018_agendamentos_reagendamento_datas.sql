-- ============================================================
-- Automaclinic CRM – Migração 0018: Reagendamento (datas antiga/nova)
-- ============================================================

alter table public.agendamentos_clinica
  add column if not exists data_inicio_anterior timestamptz,
  add column if not exists data_fim_anterior timestamptz,
  add column if not exists remarcado_em timestamptz,
  add column if not exists remarcado_motivo text;

create index if not exists agendamentos_clinica_remarcado_em_idx
  on public.agendamentos_clinica (remarcado_em);
