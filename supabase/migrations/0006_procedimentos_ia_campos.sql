-- ============================================================
-- Automaclinic CRM – Migração 0006: Procedimentos (campos para IA)
-- Requer: 0005_procedimentos_imagens.sql
-- ============================================================

alter table public.procedimentos
  add column if not exists cuidados_durante text,
  add column if not exists cuidados_apos text,
  add column if not exists quebra_objecoes text,
  add column if not exists ia_informa_preco boolean not null default false,
  add column if not exists ia_envia_imagens boolean not null default false;
