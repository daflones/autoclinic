-- Migration: Sistema de Chat WhatsApp com Evolution API
-- Descrição: Tabelas para gerenciar conversas e mensagens do WhatsApp

-- =====================================================
-- FUNÇÃO: set_updated_at (criar se não existir)
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABELA: whatsapp_conversas
-- Armazena as conversas/chats do WhatsApp
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  remote_jid text NOT NULL,
  paciente_id uuid,
  nome_contato text,
  numero_telefone text,
  foto_perfil_url text,
  ultima_mensagem text,
  ultima_mensagem_timestamp bigint,
  mensagens_nao_lidas integer DEFAULT 0,
  arquivado boolean DEFAULT false,
  fixado boolean DEFAULT false,
  silenciado boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT whatsapp_conversas_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_conversas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL,
  CONSTRAINT whatsapp_conversas_admin_remote_jid_unique UNIQUE (admin_profile_id, remote_jid)
);

-- Índices para whatsapp_conversas
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_admin ON public.whatsapp_conversas(admin_profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_remote_jid ON public.whatsapp_conversas(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_paciente ON public.whatsapp_conversas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_ultima_msg ON public.whatsapp_conversas(ultima_mensagem_timestamp DESC);

-- =====================================================
-- TABELA: whatsapp_mensagens
-- Armazena as mensagens individuais do WhatsApp
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  conversa_id uuid NOT NULL,
  message_id text NOT NULL,
  remote_jid text NOT NULL,
  conteudo text,
  tipo_mensagem text NOT NULL DEFAULT 'text',
  from_me boolean NOT NULL DEFAULT false,
  timestamp_msg bigint NOT NULL,
  status text DEFAULT 'PENDING',
  media_url text,
  media_mimetype text,
  media_filename text,
  caption text,
  latitude decimal,
  longitude decimal,
  location_name text,
  location_address text,
  profissional_id uuid,
  reacao text,
  quoted_message_id text,
  editado boolean DEFAULT false,
  editado_em timestamp with time zone,
  deletado boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT whatsapp_mensagens_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_mensagens_conversa_id_fkey FOREIGN KEY (conversa_id) REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  CONSTRAINT whatsapp_mensagens_profissional_id_fkey FOREIGN KEY (profissional_id) REFERENCES public.profissionais_clinica(id) ON DELETE SET NULL,
  CONSTRAINT whatsapp_mensagens_admin_message_id_unique UNIQUE (admin_profile_id, message_id)
);

-- Índices para whatsapp_mensagens
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_admin ON public.whatsapp_mensagens(admin_profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_conversa ON public.whatsapp_mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_remote_jid ON public.whatsapp_mensagens(remote_jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_timestamp ON public.whatsapp_mensagens(timestamp_msg DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_profissional ON public.whatsapp_mensagens(profissional_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_message_id ON public.whatsapp_mensagens(message_id);

-- =====================================================
-- TABELA: whatsapp_contatos
-- Cache de contatos sincronizados do WhatsApp
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_contatos (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  remote_jid text NOT NULL,
  nome text,
  numero_telefone text,
  foto_perfil_url text,
  is_business boolean DEFAULT false,
  sincronizado_em timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT whatsapp_contatos_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_contatos_admin_remote_jid_unique UNIQUE (admin_profile_id, remote_jid)
);

-- Índices para whatsapp_contatos
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_admin ON public.whatsapp_contatos(admin_profile_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contatos_remote_jid ON public.whatsapp_contatos(remote_jid);

-- =====================================================
-- TABELA: whatsapp_reacoes
-- Armazena reações em mensagens
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_reacoes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_profile_id uuid NOT NULL DEFAULT app_admin_profile_id(),
  mensagem_id uuid NOT NULL,
  remote_jid text NOT NULL,
  emoji text NOT NULL,
  from_me boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT whatsapp_reacoes_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_reacoes_mensagem_id_fkey FOREIGN KEY (mensagem_id) REFERENCES public.whatsapp_mensagens(id) ON DELETE CASCADE
);

-- Índice para whatsapp_reacoes
CREATE INDEX IF NOT EXISTS idx_whatsapp_reacoes_mensagem ON public.whatsapp_reacoes(mensagem_id);

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_reacoes ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_conversas
CREATE POLICY "whatsapp_conversas_select" ON public.whatsapp_conversas
  FOR SELECT USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_conversas_insert" ON public.whatsapp_conversas
  FOR INSERT WITH CHECK (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_conversas_update" ON public.whatsapp_conversas
  FOR UPDATE USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_conversas_delete" ON public.whatsapp_conversas
  FOR DELETE USING (admin_profile_id = app_admin_profile_id());

-- Policies para whatsapp_mensagens
CREATE POLICY "whatsapp_mensagens_select" ON public.whatsapp_mensagens
  FOR SELECT USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_mensagens_insert" ON public.whatsapp_mensagens
  FOR INSERT WITH CHECK (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_mensagens_update" ON public.whatsapp_mensagens
  FOR UPDATE USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_mensagens_delete" ON public.whatsapp_mensagens
  FOR DELETE USING (admin_profile_id = app_admin_profile_id());

-- Policies para whatsapp_contatos
CREATE POLICY "whatsapp_contatos_select" ON public.whatsapp_contatos
  FOR SELECT USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_contatos_insert" ON public.whatsapp_contatos
  FOR INSERT WITH CHECK (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_contatos_update" ON public.whatsapp_contatos
  FOR UPDATE USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_contatos_delete" ON public.whatsapp_contatos
  FOR DELETE USING (admin_profile_id = app_admin_profile_id());

-- Policies para whatsapp_reacoes
CREATE POLICY "whatsapp_reacoes_select" ON public.whatsapp_reacoes
  FOR SELECT USING (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_reacoes_insert" ON public.whatsapp_reacoes
  FOR INSERT WITH CHECK (admin_profile_id = app_admin_profile_id());

CREATE POLICY "whatsapp_reacoes_delete" ON public.whatsapp_reacoes
  FOR DELETE USING (admin_profile_id = app_admin_profile_id());

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================

-- Trigger para whatsapp_conversas
CREATE TRIGGER set_whatsapp_conversas_updated_at
  BEFORE UPDATE ON public.whatsapp_conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger para whatsapp_mensagens
CREATE TRIGGER set_whatsapp_mensagens_updated_at
  BEFORE UPDATE ON public.whatsapp_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger para whatsapp_contatos
CREATE TRIGGER set_whatsapp_contatos_updated_at
  BEFORE UPDATE ON public.whatsapp_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- FUNÇÃO: Atualizar conversa ao inserir mensagem
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_conversa_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.whatsapp_conversas
  SET 
    ultima_mensagem = COALESCE(NEW.conteudo, NEW.caption, '[Mídia]'),
    ultima_mensagem_timestamp = NEW.timestamp_msg,
    mensagens_nao_lidas = CASE 
      WHEN NEW.from_me = false THEN mensagens_nao_lidas + 1 
      ELSE mensagens_nao_lidas 
    END,
    updated_at = now()
  WHERE id = NEW.conversa_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar conversa
CREATE TRIGGER trigger_update_conversa_on_message
  AFTER INSERT ON public.whatsapp_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversa_on_message();

-- =====================================================
-- COMENTÁRIOS nas tabelas
-- =====================================================
COMMENT ON TABLE public.whatsapp_conversas IS 'Conversas/chats do WhatsApp via Evolution API';
COMMENT ON TABLE public.whatsapp_mensagens IS 'Mensagens individuais do WhatsApp';
COMMENT ON TABLE public.whatsapp_contatos IS 'Cache de contatos sincronizados do WhatsApp';
COMMENT ON TABLE public.whatsapp_reacoes IS 'Reações em mensagens do WhatsApp';

COMMENT ON COLUMN public.whatsapp_mensagens.profissional_id IS 'ID do profissional que enviou a mensagem (para rastreamento)';
COMMENT ON COLUMN public.whatsapp_mensagens.tipo_mensagem IS 'Tipo: text, audio, image, video, document, location, sticker';
COMMENT ON COLUMN public.whatsapp_mensagens.status IS 'Status: PENDING, SENT, DELIVERED, READ';
