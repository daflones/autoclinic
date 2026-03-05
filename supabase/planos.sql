-- Tabela de planos da landing page / página de preços
-- Execute este SQL no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.planos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,          -- 'essential' | 'clinica_pro' | 'elite_ia'
  nome          text NOT NULL,
  tagline       text NOT NULL DEFAULT '',
  preco         numeric(10, 2) NOT NULL,        -- Ex: 197.00
  tokens        text NOT NULL DEFAULT '',       -- Ex: '1.000'
  descricao     text NOT NULL DEFAULT '',
  popular       boolean NOT NULL DEFAULT false,
  ordem         integer NOT NULL DEFAULT 0,     -- Ordem de exibição (0, 1, 2)
  ativo         boolean NOT NULL DEFAULT true,
  -- Features exibidas no card (array de objetos)
  -- Exemplo: [{"text": "1.000 tokens/mês", "highlight": true}, {"text": "CRM completo", "highlight": false}]
  features      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Itens NÃO incluídos (riscados)
  -- Exemplo: ["IA envia áudios personalizados"]
  not_included  jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Configurações visuais do card (cores, estilos)
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS planos_updated_at ON public.planos;
CREATE TRIGGER planos_updated_at
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: leitura pública (landing page não requer login)
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos_public_read" ON public.planos;
CREATE POLICY "planos_public_read"
  ON public.planos FOR SELECT
  USING (ativo = true);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS planos_ordem_idx ON public.planos (ordem);

-- ─────────────────── DADOS INICIAIS ───────────────────

INSERT INTO public.planos (slug, nome, tagline, preco, tokens, descricao, popular, ordem, features, not_included, config)
VALUES
(
  'essential',
  'Essential',
  'Comece a converter',
  197.00,
  '1.000',
  'Para clínicas que querem dar o primeiro passo na automação do atendimento via WhatsApp.',
  false,
  0,
  '[
    {"text": "1.000 tokens/mês — 1 token por mensagem ou ação da IA", "highlight": true},
    {"text": "Renovação automática todo mês", "highlight": false},
    {"text": "IA lê e interpreta imagens enviadas", "highlight": false},
    {"text": "IA transcreve e entende áudios", "highlight": false},
    {"text": "Atendimento automático no WhatsApp", "highlight": false},
    {"text": "CRM completo de pacientes", "highlight": false},
    {"text": "Agendamento inteligente", "highlight": false}
  ]'::jsonb,
  '["IA envia áudios personalizados"]'::jsonb,
  '{
    "accentFrom": "#C265A3",
    "accentTo": "#A15486",
    "badgeBg": "bg-primary-100",
    "badgeText": "text-primary-700",
    "ringClass": "ring-primary-200",
    "iconBg": "from-primary-400 to-primary-600",
    "checkBg": "bg-primary-500",
    "cta": "Começar com Essential"
  }'::jsonb
),
(
  'clinica_pro',
  'Clínica Pro',
  'O preferido das clínicas',
  347.00,
  '2.000',
  'Para clínicas em crescimento que querem dobrar os agendamentos sem aumentar a equipe.',
  true,
  1,
  '[
    {"text": "2.000 tokens/mês — 1 token por mensagem ou ação da IA", "highlight": true},
    {"text": "Renovação automática todo mês", "highlight": false},
    {"text": "IA lê e interpreta imagens enviadas", "highlight": false},
    {"text": "IA transcreve e entende áudios", "highlight": false},
    {"text": "Atendimento automático no WhatsApp", "highlight": false},
    {"text": "CRM completo de pacientes", "highlight": false},
    {"text": "Agendamento inteligente", "highlight": false}
  ]'::jsonb,
  '["IA envia áudios personalizados"]'::jsonb,
  '{
    "accentFrom": "#C265A3",
    "accentTo": "#8655FF",
    "badgeBg": "bg-secondary-200",
    "badgeText": "text-secondary-800",
    "ringClass": "ring-secondary-300",
    "iconBg": "from-primary-500 to-secondary-600",
    "checkBg": "bg-primary-500",
    "cta": "Quero o Clínica Pro"
  }'::jsonb
),
(
  'elite_ia',
  'Elite IA',
  'Experiência total com IA',
  547.00,
  '2.500',
  'Para clínicas premium que querem o máximo de conversão e uma experiência de atendimento inesquecível.',
  false,
  2,
  '[
    {"text": "2.500 tokens/mês — 1 token por mensagem ou ação da IA", "highlight": true},
    {"text": "Renovação automática todo mês", "highlight": false},
    {"text": "IA lê e interpreta imagens enviadas", "highlight": false},
    {"text": "IA transcreve e entende áudios", "highlight": false},
    {"text": "IA envia áudios personalizados", "highlight": true},
    {"text": "Atendimento automático no WhatsApp", "highlight": false},
    {"text": "CRM completo de pacientes", "highlight": false},
    {"text": "Agendamento inteligente", "highlight": false}
  ]'::jsonb,
  '[]'::jsonb,
  '{
    "accentFrom": "#A15486",
    "accentTo": "#6A30F0",
    "badgeBg": "bg-secondary-100",
    "badgeText": "text-secondary-700",
    "ringClass": "ring-secondary-200",
    "iconBg": "from-primary-600 to-secondary-700",
    "checkBg": "bg-secondary-600",
    "cta": "Quero o Elite IA"
  }'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  nome         = EXCLUDED.nome,
  tagline      = EXCLUDED.tagline,
  preco        = EXCLUDED.preco,
  tokens       = EXCLUDED.tokens,
  descricao    = EXCLUDED.descricao,
  popular      = EXCLUDED.popular,
  ordem        = EXCLUDED.ordem,
  features     = EXCLUDED.features,
  not_included = EXCLUDED.not_included,
  config       = EXCLUDED.config,
  updated_at   = now();
