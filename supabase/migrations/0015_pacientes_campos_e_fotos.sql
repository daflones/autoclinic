-- ============================================================
-- Automaclinic CRM – Migração 0015: Pacientes (CPF/RG/Status detalhado) + Fotos Antes/Depois
-- ============================================================

-- 1) Novos campos em pacientes --------------------------------------------
alter table public.pacientes
  add column if not exists cpf text,
  add column if not exists rg text,
  add column if not exists status_detalhado text;

-- Backfill status_detalhado com base no status antigo
update public.pacientes
set status_detalhado = case
  when status = 'arquivado' then 'arquivado'
  when status = 'inativo' then 'pausados'
  else 'novos'
end
where status_detalhado is null;

-- CPF único por clínica
create unique index if not exists pacientes_admin_cpf_unique
  on public.pacientes(admin_profile_id, cpf)
  where cpf is not null and cpf <> '';

create index if not exists pacientes_admin_status_detalhado_idx
  on public.pacientes(admin_profile_id, status_detalhado);

-- 2) Tabela de fotos antes/depois ------------------------------------------
create table if not exists public.paciente_fotos (
  id uuid primary key default uuid_generate_v4(),
  admin_profile_id uuid not null default public.app_admin_profile_id(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  tipo text not null,
  storage_bucket text not null,
  storage_path text not null,
  label text,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paciente_fotos_admin_idx
  on public.paciente_fotos(admin_profile_id);

create index if not exists paciente_fotos_paciente_idx
  on public.paciente_fotos(paciente_id);

create index if not exists paciente_fotos_tipo_idx
  on public.paciente_fotos(tipo);

alter table public.paciente_fotos enable row level security;

create policy paciente_fotos_policy on public.paciente_fotos
  for all using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

create trigger touch_paciente_fotos before update on public.paciente_fotos
  for each row execute procedure public.touch_updated_at();
