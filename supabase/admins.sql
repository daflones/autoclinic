-- Tabela de administradores do sistema
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  cargo         text NOT NULL DEFAULT 'dev',
  nome          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at (reutiliza função já existente ou cria)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS admins_updated_at ON public.admins;
CREATE TRIGGER admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: somente service_role pode acessar (backend usa service_role key)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Bloqueia acesso anon/auth — acesso só via service_role no backend
DROP POLICY IF EXISTS "admins_no_public" ON public.admins;
CREATE POLICY "admins_no_public"
  ON public.admins FOR ALL
  USING (false);

-- ─────────────────── SEED — Primeiro Admin ───────────────────
-- ATENÇÃO: Substitua o password_hash abaixo pelo hash gerado via bcrypt.
-- Para gerar: node -e "const bcrypt=require('bcrypt'); bcrypt.hash('226602Ju$$$',10).then(h=>console.log(h))"
-- Ou use o endpoint POST /api/admin/hash-password (apenas em desenvolvimento)

-- INSERT INTO public.admins (email, password_hash, cargo, nome)
-- VALUES (
--   'nanosyncdev@gmail.com',
--   '$2b$10$SEU_HASH_AQUI',
--   'dev',
--   'Dev Master'
-- )
-- ON CONFLICT (email) DO NOTHING;
