import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface WhatsAppConversa {
  id: string
  admin_profile_id: string
  remote_jid: string
  paciente_id: string | null
  nome_contato: string | null
  numero_telefone: string | null
  foto_perfil_url: string | null
  ultima_mensagem: string | null
  ultima_mensagem_timestamp: number | null
  mensagens_nao_lidas: number
  arquivado: boolean
  fixado: boolean
  silenciado: boolean
  created_at: string
  updated_at: string
  paciente?: {
    id: string
    nome_completo: string | null
    nome_social: string | null
    telefone: string | null
    whatsapp: string | null
  } | null
}

export interface WhatsAppMensagem {
  id: string
  admin_profile_id: string
  conversa_id: string
  message_id: string
  remote_jid: string
  conteudo: string | null
  tipo_mensagem: string
  from_me: boolean
  timestamp_msg: number
  status: string
  media_url: string | null
  media_mimetype: string | null
  media_filename: string | null
  caption: string | null
  latitude: number | null
  longitude: number | null
  location_name: string | null
  location_address: string | null
  profissional_id: string | null
  reacao: string | null
  quoted_message_id: string | null
  editado: boolean
  editado_em: string | null
  deletado: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  profissional?: {
    id: string
    nome: string
  } | null
}

export interface WhatsAppContato {
  id: string
  admin_profile_id: string
  remote_jid: string
  nome: string | null
  numero_telefone: string | null
  foto_perfil_url: string | null
  is_business: boolean
  sincronizado_em: string
  created_at: string
  updated_at: string
}

// =====================================================
// SERVIÇO DE CONVERSAS
// =====================================================

export async function getConversas(): Promise<WhatsAppConversa[]> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('whatsapp_conversas')
    .select(`
      *,
      paciente:pacientes(id, nome_completo, nome_social, telefone, whatsapp)
    `)
    .eq('admin_profile_id', adminProfileId)
    .order('ultima_mensagem_timestamp', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as WhatsAppConversa[]
}

export async function getConversaByRemoteJid(remoteJid: string): Promise<WhatsAppConversa | null> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('whatsapp_conversas')
    .select(`
      *,
      paciente:pacientes(id, nome_completo, nome_social, telefone, whatsapp)
    `)
    .eq('admin_profile_id', adminProfileId)
    .eq('remote_jid', remoteJid)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as WhatsAppConversa | null
}

export async function createOrUpdateConversa(
  remoteJid: string,
  data: Partial<WhatsAppConversa>
): Promise<WhatsAppConversa> {
  const { adminProfileId } = await getAdminContext()

  const { data: result, error } = await supabase
    .from('whatsapp_conversas')
    .upsert(
      {
        admin_profile_id: adminProfileId,
        remote_jid: remoteJid,
        ...data,
      },
      {
        onConflict: 'admin_profile_id,remote_jid',
      }
    )
    .select()
    .single()

  if (error) throw error
  return result as WhatsAppConversa
}

export async function updateConversa(
  id: string,
  data: Partial<WhatsAppConversa>
): Promise<WhatsAppConversa> {
  const { data: result, error } = await supabase
    .from('whatsapp_conversas')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as WhatsAppConversa
}

export async function markConversaAsRead(conversaId: string): Promise<void> {
  await supabase
    .from('whatsapp_conversas')
    .update({ mensagens_nao_lidas: 0 })
    .eq('id', conversaId)
}

export async function vincularPacienteConversa(
  conversaId: string,
  pacienteId: string
): Promise<void> {
  await supabase
    .from('whatsapp_conversas')
    .update({ paciente_id: pacienteId })
    .eq('id', conversaId)
}

// =====================================================
// SERVIÇO DE MENSAGENS
// =====================================================

export async function getMensagens(conversaId: string): Promise<WhatsAppMensagem[]> {
  const { data, error } = await supabase
    .from('whatsapp_mensagens')
    .select(`
      *,
      profissional:profissionais_clinica(id, nome)
    `)
    .eq('conversa_id', conversaId)
    .eq('deletado', false)
    .order('timestamp_msg', { ascending: true })

  if (error) throw error
  return (data ?? []) as WhatsAppMensagem[]
}

export async function getMensagensByRemoteJid(remoteJid: string): Promise<WhatsAppMensagem[]> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('whatsapp_mensagens')
    .select(`
      *,
      profissional:profissionais_clinica(id, nome)
    `)
    .eq('admin_profile_id', adminProfileId)
    .eq('remote_jid', remoteJid)
    .eq('deletado', false)
    .order('timestamp_msg', { ascending: true })

  if (error) throw error
  return (data ?? []) as WhatsAppMensagem[]
}

export async function createMensagem(
  data: Omit<WhatsAppMensagem, 'id' | 'admin_profile_id' | 'created_at' | 'updated_at' | 'profissional'>
): Promise<WhatsAppMensagem> {
  const { adminProfileId } = await getAdminContext()

  const { data: result, error } = await supabase
    .from('whatsapp_mensagens')
    .insert({
      ...data,
      admin_profile_id: adminProfileId,
    })
    .select(`
      *,
      profissional:profissionais_clinica(id, nome)
    `)
    .single()

  if (error) throw error
  return result as WhatsAppMensagem
}

export async function updateMensagem(
  id: string,
  data: Partial<WhatsAppMensagem>
): Promise<WhatsAppMensagem> {
  const { data: result, error } = await supabase
    .from('whatsapp_mensagens')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as WhatsAppMensagem
}

export async function updateMensagemReacao(
  messageId: string,
  reacao: string | null
): Promise<void> {
  const { adminProfileId } = await getAdminContext()

  await supabase
    .from('whatsapp_mensagens')
    .update({ reacao })
    .eq('admin_profile_id', adminProfileId)
    .eq('message_id', messageId)
}

// =====================================================
// SERVIÇO DE CONTATOS
// =====================================================

export async function getContatos(): Promise<WhatsAppContato[]> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('whatsapp_contatos')
    .select('*')
    .eq('admin_profile_id', adminProfileId)
    .order('nome', { ascending: true })

  if (error) throw error
  return (data ?? []) as WhatsAppContato[]
}

export async function createOrUpdateContato(
  remoteJid: string,
  data: Partial<WhatsAppContato>
): Promise<WhatsAppContato> {
  const { adminProfileId } = await getAdminContext()

  const { data: result, error } = await supabase
    .from('whatsapp_contatos')
    .upsert(
      {
        admin_profile_id: adminProfileId,
        remote_jid: remoteJid,
        ...data,
        sincronizado_em: new Date().toISOString(),
      },
      {
        onConflict: 'admin_profile_id,remote_jid',
      }
    )
    .select()
    .single()

  if (error) throw error
  return result as WhatsAppContato
}

// =====================================================
// SINCRONIZAÇÃO COM EVOLUTION API
// =====================================================

export async function syncConversasFromEvolution(): Promise<WhatsAppConversa[]> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Usuário não autenticado')

  const res = await fetch('/api/chat/findChats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Falha ao sincronizar conversas')
  }

  // Backend já faz upsert no banco. Retornamos a lista do banco para UI.
  return getConversas()
}

export async function syncMensagensFromEvolution(
  conversaId: string,
  remoteJid: string
): Promise<WhatsAppMensagem[]> {
  void conversaId
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Usuário não autenticado')

  const res = await fetch('/api/chat/findMessages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ remoteJid }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Falha ao sincronizar mensagens')
  }

  // Backend já faz upsert. Retornamos do banco para render.
  const conversa = await getConversaByRemoteJid(remoteJid)
  if (!conversa?.id) return []
  return getMensagens(conversa.id)
}

// =====================================================
// HELPER: Chamada autenticada ao backend
// =====================================================

async function backendPost<T = any>(endpoint: string, body: Record<string, any> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Usuário não autenticado')

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try { msg = JSON.parse(text)?.details || JSON.parse(text)?.error || text } catch {}
    throw new Error(msg || `Backend error ${res.status}`)
  }

  return res.json()
}

// =====================================================
// ENVIO DE MENSAGENS (via backend enriched endpoints)
// =====================================================

export async function sendTextMessage(
  conversaId: string,
  remoteJid: string,
  text: string,
  profissionalId?: string,
  quotedMessageId?: string
): Promise<void> {
  await backendPost('/api/chat/sendText', {
    remoteJid,
    text,
    profissionalId: profissionalId || null,
    quotedMessageId: quotedMessageId || null,
  })
}

export async function sendMediaMessage(
  conversaId: string,
  remoteJid: string,
  mediaType: 'image' | 'video' | 'document',
  mediaUrl: string,
  mimetype: string,
  caption?: string,
  fileName?: string,
  profissionalId?: string
): Promise<void> {
  await backendPost('/api/chat/sendMedia', {
    remoteJid,
    mediatype: mediaType,
    mimetype,
    media: mediaUrl,
    caption: caption || null,
    fileName: fileName || null,
    profissionalId: profissionalId || null,
  })
}

export async function sendAudioMessage(
  conversaId: string,
  remoteJid: string,
  audioUrl: string,
  profissionalId?: string
): Promise<void> {
  await backendPost('/api/chat/sendAudio', {
    remoteJid,
    audio: audioUrl,
    profissionalId: profissionalId || null,
  })
}

export async function sendLocationMessage(
  conversaId: string,
  remoteJid: string,
  latitude: number,
  longitude: number,
  name: string,
  address: string,
  profissionalId?: string
): Promise<void> {
  await backendPost('/api/chat/sendLocation', {
    remoteJid,
    latitude,
    longitude,
    name,
    address,
    profissionalId: profissionalId || null,
  })
}

export async function sendReaction(
  remoteJid: string,
  messageId: string,
  fromMe: boolean,
  emoji: string
): Promise<void> {
  await backendPost('/api/chat/sendReaction', {
    remoteJid,
    messageId,
    fromMe,
    emoji,
  })
}

export async function editMessage(
  remoteJid: string,
  messageId: string,
  newText: string
): Promise<void> {
  await backendPost('/api/chat/updateMessage', {
    remoteJid,
    messageId,
    text: newText,
  })
}

export async function markMessagesAsRead(
  conversaId: string,
  remoteJid: string,
  messages: Array<{ messageId: string; fromMe: boolean }>
): Promise<void> {
  await backendPost('/api/chat/markAsRead', {
    remoteJid,
    conversaId,
    messages: messages.map(m => ({ id: m.messageId, fromMe: m.fromMe })),
  })
}

