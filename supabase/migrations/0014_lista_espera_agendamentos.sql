-- ============================================================
-- Automaclinic CRM – Migração 0014: Lista de Espera (Agenda)
-- ============================================================

create table if not exists public.lista_espera_agendamentos (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid references public.pacientes(id) on delete set null,
  nome_paciente text,
  telefone text,
  procedimento_id uuid references public.procedimentos(id) on delete set null,
  preferencia_horario text,
  prioridade text not null default 'media',
  status text not null default 'aguardando',
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lista_espera_agendamentos_admin_idx
  on public.lista_espera_agendamentos(admin_profile_id);

create index if not exists lista_espera_agendamentos_status_idx
  on public.lista_espera_agendamentos(status);

alter table public.lista_espera_agendamentos enable row level security;

create policy lista_espera_agendamentos_policy on public.lista_espera_agendamentos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create trigger touch_lista_espera_agendamentos before update on public.lista_espera_agendamentos
  for each row execute procedure public.touch_updated_at();
