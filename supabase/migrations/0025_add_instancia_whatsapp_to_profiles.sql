-- Migration: Garantir constraints únicas para upsert do chat WhatsApp
-- A coluna instancia_whatsapp já existe em profiles.
-- Precisamos garantir as UNIQUE constraints para que os upserts funcionem.

-- Unique constraint para whatsapp_conversas (admin_profile_id, remote_jid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_conversas_admin_remote_jid_unique'
  ) THEN
    ALTER TABLE public.whatsapp_conversas
      ADD CONSTRAINT whatsapp_conversas_admin_remote_jid_unique
      UNIQUE (admin_profile_id, remote_jid);
  END IF;
END $$;

-- Unique constraint para whatsapp_mensagens (admin_profile_id, message_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_mensagens_admin_message_id_unique'
  ) THEN
    ALTER TABLE public.whatsapp_mensagens
      ADD CONSTRAINT whatsapp_mensagens_admin_message_id_unique
      UNIQUE (admin_profile_id, message_id);
  END IF;
END $$;

-- Unique constraint para whatsapp_contatos (admin_profile_id, remote_jid)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_contatos_admin_remote_jid_unique'
  ) THEN
    ALTER TABLE public.whatsapp_contatos
      ADD CONSTRAINT whatsapp_contatos_admin_remote_jid_unique
      UNIQUE (admin_profile_id, remote_jid);
  END IF;
END $$;
