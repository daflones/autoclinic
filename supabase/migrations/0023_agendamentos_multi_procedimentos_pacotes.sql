-- ============================================================
-- Automaclinic CRM – Migração 0023: Agendamentos com múltiplos procedimentos/pacotes
-- ============================================================

alter table public.agendamentos_clinica
  add column if not exists procedimentos_ids uuid[] not null default '{}'::uuid[];

alter table public.agendamentos_clinica
  add column if not exists protocolos_pacotes_ids uuid[] not null default '{}'::uuid[];

-- Backfill: procedimentos_ids baseado no procedimento_id antigo
update public.agendamentos_clinica
set procedimentos_ids = array[procedimento_id]
where procedimento_id is not null
  and (procedimentos_ids is null or array_length(procedimentos_ids, 1) is null);

-- Backfill: protocolos_pacotes_ids baseado no plano_tratamento_id (quando existir)
update public.agendamentos_clinica a
set protocolos_pacotes_ids = array[p.protocolo_pacote_id]
from public.planos_tratamento p
where a.plano_tratamento_id = p.id
  and p.protocolo_pacote_id is not null
  and (a.protocolos_pacotes_ids is null or array_length(a.protocolos_pacotes_ids, 1) is null);

create index if not exists agendamentos_clinica_procedimentos_ids_gin
  on public.agendamentos_clinica using gin (procedimentos_ids);

create index if not exists agendamentos_clinica_protocolos_pacotes_ids_gin
  on public.agendamentos_clinica using gin (protocolos_pacotes_ids);
