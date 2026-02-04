alter table public.agendamentos_clinica
  add column if not exists is_avaliacao boolean not null default false;

alter table public.agendamentos_clinica
  add column if not exists valor numeric;

create index if not exists agendamentos_clinica_is_avaliacao_idx
  on public.agendamentos_clinica (is_avaliacao);

create index if not exists agendamentos_clinica_procedimento_id_idx
  on public.agendamentos_clinica (procedimento_id);

create index if not exists agendamentos_clinica_data_inicio_idx
  on public.agendamentos_clinica (data_inicio);
