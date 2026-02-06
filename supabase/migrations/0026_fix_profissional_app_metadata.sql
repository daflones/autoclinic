-- Migration: Corrigir RLS para profissionais e copiar admin_profile_id no JWT
-- IMPORTANTE: Executar no SQL Editor do Supabase
-- ============================================================

-- 1. Corrigir a função app_admin_profile_id() para ler admin_profile_id
--    do app_metadata no JWT (Supabase coloca app_metadata aninhado)
CREATE OR REPLACE FUNCTION public.app_admin_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT coalesce(
    -- Primeiro tenta ler de app_metadata (onde o Supabase coloca dados do app_metadata)
    nullif(current_setting('request.jwt.claims', true)::json->'app_metadata'->>'admin_profile_id','')::uuid,
    -- Fallback: tenta ler do top-level (caso de JWT customizado)
    nullif(current_setting('request.jwt.claims', true)::json->>'admin_profile_id','')::uuid,
    -- Último fallback: usa o próprio sub (user id) — funciona para admin/clinica
    nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
  );
$$;

-- 2. Atualizar app_metadata de todos os profissionais que já existem
--    para que o JWT inclua admin_profile_id e o RLS funcione corretamente
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('admin_profile_id', p.admin_profile_id::text)
FROM public.profiles p
WHERE auth.users.id = p.id
  AND p.admin_profile_id IS NOT NULL
  AND p.role IN ('profissional', 'recepcao', 'gestor', 'admin')
  AND (
    raw_app_meta_data->>'admin_profile_id' IS NULL
    OR raw_app_meta_data->>'admin_profile_id' != p.admin_profile_id::text
  );
