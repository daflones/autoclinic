-- ============================================================
-- Migração 0012: expansão de Procedimentos via JSONB
-- ============================================================

alter table public.procedimentos
  add column if not exists ia_config jsonb not null default '{}'::jsonb;

create index if not exists procedimentos_ia_config_gin_idx
  on public.procedimentos using gin (ia_config);
