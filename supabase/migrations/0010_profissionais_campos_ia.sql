-- ============================================================
-- Migração 0010: Campos adicionais em profissionais_clinica
-- Objetivo: suportar ficha de profissional (cargo, experiencia, certificacoes, procedimentos)
-- ============================================================

alter table public.profissionais_clinica
  add column if not exists cargo text,
  add column if not exists experiencia text,
  add column if not exists certificacoes text,
  add column if not exists procedimentos text;
