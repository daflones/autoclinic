-- ============================================================
-- Automaclinic CRM – Migração 0008: Configurações da IA por clínica (JSON)
-- Requer: 0004_rls_triggers.sql
-- ============================================================

-- Tabela única por clínica (admin_profile_id) com conteúdo em JSONB.
-- Inclui profissionais e pacotes dentro do JSON para simplificar o frontend.
create table if not exists public.clinica_ia_config (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null,

  -- Configurações em blocos (cada bloco é um JSON livre, evolutivo)
  identidade jsonb not null default '{}'::jsonb,
  posicionamento jsonb not null default '{}'::jsonb,
  profissionais jsonb not null default '[]'::jsonb,
  politicas jsonb not null default '{}'::jsonb,
  prova_social jsonb not null default '{}'::jsonb,
  midias jsonb not null default '{}'::jsonb,
  regras_internas jsonb not null default '{}'::jsonb,
  gatilhos_diferenciais jsonb not null default '{}'::jsonb,

  -- Conteúdo adicional livre (para evoluções sem migrations)
  extra jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Garantir 1 registro por clínica
create unique index if not exists clinica_ia_config_admin_profile_uidx
  on public.clinica_ia_config (admin_profile_id);

-- Índices úteis (JSON)
create index if not exists clinica_ia_config_identidade_gin
  on public.clinica_ia_config using gin (identidade);

create index if not exists clinica_ia_config_posicionamento_gin
  on public.clinica_ia_config using gin (posicionamento);

create index if not exists clinica_ia_config_politicas_gin
  on public.clinica_ia_config using gin (politicas);

-- Multi-tenant / RLS
alter table public.clinica_ia_config enable row level security;

create policy clinica_ia_config_policy on public.clinica_ia_config
  for all
  using (public.match_admin_profile(admin_profile_id))
  with check (public.match_admin_profile(admin_profile_id));

-- Trigger de updated_at
create trigger touch_clinica_ia_config before update on public.clinica_ia_config
  for each row execute procedure public.touch_updated_at();

-- Buckets de mídias (privados) -----------------------------------
-- Path multi-tenant recomendado: <admin_profile_id>/<tipo>/<arquivo>
insert into storage.buckets (id, name, public)
values
  ('clinica-midias', 'clinica-midias', false),
  ('pacotes-midias', 'pacotes-midias', false),
  ('profissionais-midias', 'profissionais-midias', false)
on conflict (id) do nothing;

-- Policies storage.objects (mesma estratégia do procedimento-imagens)
-- Read
create policy "clinica_midias_read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('clinica-midias', 'pacotes-midias', 'profissionais-midias')
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Insert
create policy "clinica_midias_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('clinica-midias', 'pacotes-midias', 'profissionais-midias')
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Update
create policy "clinica_midias_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('clinica-midias', 'pacotes-midias', 'profissionais-midias')
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  )
  with check (
    bucket_id in ('clinica-midias', 'pacotes-midias', 'profissionais-midias')
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );

-- Delete
create policy "clinica_midias_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('clinica-midias', 'pacotes-midias', 'profissionais-midias')
    and split_part(name, '/', 1) = public.app_admin_profile_id()::text
  );
