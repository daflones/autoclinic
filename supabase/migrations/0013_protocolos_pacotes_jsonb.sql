-- ============================================================
-- Migração 0013: expansão de Protocolos/Pacotes via JSONB
-- ============================================================

alter table public.protocolos_pacotes
  add column if not exists conteudo jsonb not null default '{}'::jsonb;

create index if not exists protocolos_pacotes_conteudo_gin_idx
  on public.protocolos_pacotes using gin (conteudo);
