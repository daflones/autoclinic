-- ============================================================
-- Tabela: otp_verificacoes
-- Finalidade: Armazena códigos OTP para verificação de WhatsApp
-- no cadastro de novos usuários.
-- Execute este SQL no Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.otp_verificacoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         text NOT NULL,           -- Formato: 5511999999999 (sem @s.whatsapp.net)
  code_hash     text NOT NULL,           -- SHA-256 do código de 6 dígitos
  expires_at    timestamptz NOT NULL,    -- Expiração: agora + 5 minutos
  attempts      integer NOT NULL DEFAULT 0,  -- Tentativas de validação (máx 3)
  verified      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice para buscas rápidas por telefone
CREATE INDEX IF NOT EXISTS idx_otp_verificacoes_phone ON public.otp_verificacoes (phone);

-- Limpeza automática: remove registros expirados após 1h
-- (opcional, pode rodar via pg_cron ou manualmente)
-- DELETE FROM public.otp_verificacoes WHERE expires_at < now() - interval '1 hour';

-- RLS: Esta tabela só é acessada pelo backend via service role key.
-- Bloquear acesso direto do frontend (anon/authenticated).
ALTER TABLE public.otp_verificacoes ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy = nenhum acesso via anon ou authenticated JWT.
-- O backend usa service role key que bypassa RLS.
