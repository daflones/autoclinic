import { supabase } from '@/lib/supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface EvolutionConfig {
  serverUrl: string
  instance: string
  apiKey: string
}

export interface RemoteJidInfo {
  remoteJid: string
  isGroup: boolean
  phoneNumber: string
}

export interface ProfilePictureResponse {
  wuid: string
  profilePictureUrl: string | null
}

export interface ChatResponse {
  id: string
  remoteJid: string
  pushName?: string
  profilePicUrl?: string
  unreadCount?: number
  lastMessage?: {
    key: MessageKey
    message: any
    messageTimestamp: string
  }
}

export interface ContactResponse {
  id: string
  pushName?: string
  profilePictureUrl?: string
  owner?: string
}

export interface MessageKey {
  remoteJid: string
  fromMe: boolean
  id: string
  participant?: string
}

export interface MessageResponse {
  key: MessageKey
  pushName?: string
  message?: any
  messageType?: string
  messageTimestamp?: string | number
  status?: string
}

export interface SendTextPayload {
  number: string
  text: string
  delay?: number
  linkPreview?: boolean
  mentionsEveryOne?: boolean
  mentioned?: string[]
  quoted?: {
    key: { id: string }
    message: { conversation: string }
  }
}

export interface SendMediaPayload {
  number: string
  mediatype: 'image' | 'video' | 'document'
  mimetype: string
  caption?: string
  media: string
  fileName?: string
  delay?: number
}

export interface SendAudioPayload {
  number: string
  audio: string
  delay?: number
  quoted?: {
    key: { id: string }
    message: { conversation: string }
  }
}

export interface SendLocationPayload {
  number: string
  name: string
  address: string
  latitude: number
  longitude: number
  delay?: number
}

export interface SendReactionPayload {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  reaction: string
}

export interface UpdateMessagePayload {
  number: number
  text: string
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
}

export interface MarkAsReadPayload {
  readMessages: Array<{
    remoteJid: string
    fromMe: boolean
    id: string
  }>
}

export interface GetBase64Payload {
  message: {
    key: {
      id: string
    }
  }
  convertToMp4?: boolean
}

// =====================================================
// CLASSE PRINCIPAL: EvolutionAPI
// =====================================================

export class EvolutionAPI {
  private serverUrl: string
  private instance: string
  private apiKey: string

  constructor(config: EvolutionConfig) {
    this.serverUrl = config.serverUrl.replace(/\/$/, '')
    this.instance = config.instance
    this.apiKey = config.apiKey
  }

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    }
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    body?: any
  ): Promise<T> {
    const url = `${this.serverUrl}${endpoint}`
    
    const authHeaders = await this.getAuthHeaders()
    const options: RequestInit = {
      method,
      headers: {
        ...this.headers,
        ...authHeaders,
      },
    }

    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Evolution API Error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  // =====================================================
  // CHAT CONTROLLER
  // =====================================================

  async fetchProfilePictureUrl(number: string): Promise<ProfilePictureResponse> {
    return this.request<ProfilePictureResponse>(
      `/chat/fetchProfilePictureUrl/${this.instance}`,
      'POST',
      { number }
    )
  }

  async findChats(): Promise<ChatResponse[]> {
    return this.request<ChatResponse[]>(
      `/chat/findChats/${this.instance}`,
      'POST',
      {}
    )
  }

  async findContacts(remoteJid?: string): Promise<ContactResponse[]> {
    const body = remoteJid ? { where: { id: remoteJid } } : {}
    return this.request<ContactResponse[]>(
      `/chat/findContacts/${this.instance}`,
      'POST',
      body
    )
  }

  async findMessages(remoteJid: string): Promise<MessageResponse[]> {
    return this.request<MessageResponse[]>(
      `/chat/findMessages/${this.instance}`,
      'POST',
      {
        where: {
          key: {
            remoteJid,
          },
        },
      }
    )
  }

  async getBase64FromMedia(messageId: string, convertToMp4 = false): Promise<{ base64: string; mimetype: string }> {
    return this.request(
      `/chat/getBase64FromMediaMessage/${this.instance}`,
      'POST',
      {
        message: {
          key: {
            id: messageId,
          },
        },
        convertToMp4,
      }
    )
  }

  async markMessageAsRead(messages: MarkAsReadPayload['readMessages']): Promise<{ message: string; read: string }> {
    return this.request(
      `/chat/markMessageAsRead/${this.instance}`,
      'POST',
      { readMessages: messages }
    )
  }

  async updateMessage(payload: UpdateMessagePayload): Promise<MessageResponse> {
    return this.request<MessageResponse>(
      `/chat/updateMessage/${this.instance}`,
      'POST',
      payload
    )
  }

  // =====================================================
  // MESSAGE CONTROLLER
  // =====================================================

  async sendText(payload: SendTextPayload): Promise<MessageResponse> {
    return this.request<MessageResponse>(
      `/message/sendText/${this.instance}`,
      'POST',
      payload
    )
  }

  async sendMedia(payload: SendMediaPayload): Promise<MessageResponse> {
    return this.request<MessageResponse>(
      `/message/sendMedia/${this.instance}`,
      'POST',
      payload
    )
  }

  async sendAudio(payload: SendAudioPayload): Promise<MessageResponse> {
    return this.request<MessageResponse>(
      `/message/sendWhatsAppAudio/${this.instance}`,
      'POST',
      payload
    )
  }

  async sendLocation(payload: SendLocationPayload): Promise<MessageResponse> {
    return this.request<MessageResponse>(
      `/message/sendLocation/${this.instance}`,
      'POST',
      payload
    )
  }

  async sendReaction(payload: SendReactionPayload): Promise<any> {
    return this.request(
      `/message/sendReaction/${this.instance}`,
      'POST',
      payload
    )
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  static formatRemoteJid(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')
    return `${cleaned}@s.whatsapp.net`
  }

  static parseRemoteJid(remoteJid: string): RemoteJidInfo {
    const isGroup = remoteJid.endsWith('@g.us')
    const phoneNumber = remoteJid.split('@')[0]

    return {
      remoteJid,
      isGroup,
      phoneNumber,
    }
  }

  static extractPhoneNumber(remoteJid: string): string {
    return remoteJid.split('@')[0]
  }
}

// =====================================================
// FUNÇÃO PARA OBTER CONFIGURAÇÃO DA INSTÂNCIA
// =====================================================

export async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const authUserId = authData?.user?.id
  if (authError || !authUserId) {
    console.error('Erro ao obter usuário autenticado:', authError)
    return null
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, admin_profile_id, role, instancia_whatsapp')
    .eq('id', authUserId)
    .single()

  if (profileError || !userProfile) {
    console.error('Erro ao obter perfil do usuário:', profileError)
    return null
  }

  const clinicAdminId = userProfile.role === 'admin' ? userProfile.id : (userProfile.admin_profile_id || null)
  if (!clinicAdminId) {
    console.error('Perfil não possui admin_profile_id para resolver clínica/instância')
    return null
  }

  const { data: clinicAdminProfile, error: adminError } = await supabase
    .from('profiles')
    .select('instancia_whatsapp')
    .eq('id', clinicAdminId)
    .single()

  if (adminError || !clinicAdminProfile?.instancia_whatsapp) {
    console.error('Erro ao obter instância WhatsApp da clínica (admin):', adminError)
    return null
  }

  // Por padrão, usar o backend como proxy (mesma origem) em /api/evolution.
  // Nunca chamar a Evolution API direta do browser.
  const serverUrl = '/api/evolution'
  const apiKey = ''

  return {
    serverUrl,
    instance: clinicAdminProfile.instancia_whatsapp,
    apiKey,
  }
}

// =====================================================
// INSTÂNCIA SINGLETON (lazy loading)
// =====================================================

let evolutionApiInstance: EvolutionAPI | null = null

export async function getEvolutionAPI(): Promise<EvolutionAPI | null> {
  if (evolutionApiInstance) {
    return evolutionApiInstance
  }

  const config = await getEvolutionConfig()
  if (!config) {
    return null
  }

  evolutionApiInstance = new EvolutionAPI(config)
  return evolutionApiInstance
}

export function resetEvolutionAPI(): void {
  evolutionApiInstance = null
}
