import { supabase } from '@/lib/supabase'

export interface WhatsAppInstance {
  instanceName: string
  instanceId: string
  status: 'created' | 'connecting' | 'open' | 'close' | 'disconnected'
  qrcode?: string
  apikey?: string
}

export interface CreateInstanceRequest {
  instanceName: string
  number: string
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string
    instanceId: string
    status: string
  }
  hash: {
    apikey: string
  }
  qrcode?: {
    code: string
    base64: string
  }
}

export interface ConnectionStatus {
  instance: string
  state: 'open' | 'close' | 'connecting'
}

type EvolutionFetchInstanceItem =
  | {
      instance: {
        instanceName?: string
        instanceId?: string
        owner?: string | null
        profileName?: string | null
        profilePictureUrl?: string | null
        profileStatus?: string | null
        status?: string
      }
    }
  | {
      name?: string
      id?: string
      ownerJid?: string | null
      profileName?: string | null
      profilePictureUrl?: string | null
      profileStatus?: string | null
      connectionStatus?: string
    }

class WhatsAppService {
  private baseUrl: string
  private apiKey: string
  private webhookUrl: string

  private formatNumberForEvolution(numberOrRemoteJid: string): string {
    const raw = String(numberOrRemoteJid || '').trim()
    if (!raw) return ''
    const beforeAt = raw.includes('@') ? raw.split('@')[0] : raw
    const cleanNumber = beforeAt.replace(/\D/g, '')
    if (!cleanNumber) return ''
    return cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
  }

  constructor() {
    // Debug: verificar variáveis de ambiente
    console.log('🔧 WhatsApp Service Constructor')
    console.log('📦 VITE_EVOLUTION_API_URL:', import.meta.env.VITE_EVOLUTION_API_URL)
    console.log('🔑 VITE_EVOLUTION_API_KEY:', import.meta.env.VITE_EVOLUTION_API_KEY ? '✓ Configurada' : '✗ Não configurada')
    
    // Remover barra final da URL se existir
    const baseUrl = import.meta.env.VITE_EVOLUTION_API_URL || ''
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.apiKey = import.meta.env.VITE_EVOLUTION_API_KEY || ''
    this.webhookUrl = 'https://n8n.nanosync.com.br/webhook/crmnanosync'
    
    console.log('✅ Base URL final:', this.baseUrl)
    console.log('✅ API Key length:', this.apiKey.length)
    
    // Expor globalmente para debug
    if (typeof window !== 'undefined') {
      (window as any).__whatsappDebug = {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'não configurada'
      }
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Garantir que endpoint começa com /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${this.baseUrl}${cleanEndpoint}`
    
    console.log('🌐 makeRequest - URL completa:', url)
    console.log('🌐 makeRequest - baseUrl:', this.baseUrl)
    console.log('🌐 makeRequest - cleanEndpoint:', cleanEndpoint)
    
    const response = await fetch(url, {
      ...options,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const raw = await response.text()
      let message = raw
      try {
        const parsed = raw ? JSON.parse(raw) : null
        const extracted =
          parsed?.response?.message ??
          parsed?.message ??
          parsed?.error ??
          parsed?.details
        if (typeof extracted === 'string') {
          message = extracted
        } else if (extracted != null) {
          message = JSON.stringify(extracted)
        } else if (parsed) {
          message = JSON.stringify(parsed)
        }
      } catch {
        // manter raw
      }

      throw new Error(`Evolution API Error: ${response.status} - ${message}`)
    }

    const text = await response.text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  async createInstance(instanceName: string, number: string): Promise<CreateInstanceResponse> {
    const payload = {
      instanceName,
      number,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: this.webhookUrl,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT']
      },
      // Configurações padrão
      rejectCall: true,
      msgCall: 'Chamadas não são aceitas neste número.',
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: false,
      syncFullHistory: false
    }

    return this.makeRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }


  async getInstanceStatus(instanceName: string): Promise<any> {
    return this.makeRequest(`/instance/connectionState/${instanceName}`)
  }

  async fetchInstances(): Promise<any[]> {
    const result = await this.makeRequest('/instance/fetchInstances')
    if (!Array.isArray(result)) return []
    return result
  }

  async getInstanceByName(instanceName: string): Promise<any | null> {
    const instances = (await this.fetchInstances()) as EvolutionFetchInstanceItem[]

    const found = instances.find((inst: any) => {
      const docName = inst?.instance?.instanceName
      const legacyName = inst?.name
      return docName === instanceName || legacyName === instanceName
    })

    if (!found) return null

    const doc = (found as any)?.instance
    if (doc && typeof doc === 'object') {
      return {
        instanceName: doc.instanceName,
        instanceId: doc.instanceId,
        status: doc.status,
        owner: doc.owner,
        profileName: doc.profileName,
        profilePictureUrl: doc.profilePictureUrl,
        profileStatus: doc.profileStatus,
      }
    }

    const legacy = found as any
    return {
      instanceName: legacy.name,
      instanceId: legacy.id,
      status: legacy.connectionStatus,
      owner: legacy.ownerJid,
      profileName: legacy.profileName,
      profilePictureUrl: legacy.profilePictureUrl,
      profileStatus: legacy.profileStatus,
    }
  }

  async getQRCode(instanceName: string): Promise<{ code: string; pairingCode: string; count: number; base64: string }> {
    const result = await this.makeRequest(`/instance/connect/${instanceName}`)
    return result
  }

  async deleteInstance(instanceName: string): Promise<any> {
    const safeName = encodeURIComponent(instanceName)
    return await this.makeRequest(`/instance/delete/${safeName}`, {
      method: 'DELETE',
    })
  }

  async logoutInstance(instanceName: string): Promise<void> {
    await this.makeRequest(`/instance/logout/${instanceName}`, {
      method: 'DELETE'
    })
  }

  // Salvar dados da instância no Supabase
  async saveInstanceToProfile(instanceData: {
    instanceName: string
    instanceId: string
    status: string
    apikey?: string
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, admin_profile_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Perfil não encontrado')

    const adminId = profile.admin_profile_id || profile.id

    const { error } = await supabase
      .from('profiles')
      .update({
        instancia_whatsapp: instanceData.instanceName,
        whatsapp_status: instanceData.status,
        whatsapp_instance_id: instanceData.instanceId,
        whatsapp_connected_at: instanceData.status === 'open' ? new Date().toISOString() : null
      })
      .eq('id', adminId)

    if (error) throw error
  }


  // Buscar dados da instância do perfil
  async getInstanceFromProfile(): Promise<{
    instanceName: string | null
    status: string | null
    instanceId: string | null
    connectedAt: string | null
  } | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, admin_profile_id, instancia_whatsapp, whatsapp_status, whatsapp_instance_id, whatsapp_connected_at')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Perfil não encontrado')

    const adminId = profile.admin_profile_id || profile.id

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('instancia_whatsapp, whatsapp_status, whatsapp_instance_id, whatsapp_connected_at')
      .eq('id', adminId)
      .single()

    // Se não há instância configurada, retornar null
    if (!adminProfile?.instancia_whatsapp) {
      return null
    }

    return {
      instanceName: adminProfile.instancia_whatsapp,
      status: adminProfile.whatsapp_status || null,
      instanceId: adminProfile.whatsapp_instance_id || null,
      connectedAt: adminProfile.whatsapp_connected_at || null
    }
  }

  // Limpar dados da instância do perfil
  async clearInstanceFromProfile(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, admin_profile_id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Perfil não encontrado')

    const adminId = profile.admin_profile_id || profile.id

    const { error } = await supabase
      .from('profiles')
      .update({
        instancia_whatsapp: null,
        whatsapp_status: 'disconnected',
        whatsapp_instance_id: null,
        whatsapp_connected_at: null
      })
      .eq('id', adminId)

    if (error) throw error
  }

  /**
   * Enviar documento (PDF, imagem, etc) via WhatsApp
   * @param numberOrRemoteJid - Número do destinatário OU remoteJid (ex: 5511999999999@s.whatsapp.net)
   * @param base64 - Documento em base64 (sem o prefixo data:...)
   * @param fileName - Nome do arquivo (ex: proposta.pdf)
   * @param caption - Legenda/mensagem opcional
   */
  async sendDocument(
    numberOrRemoteJid: string,
    base64: string,
    fileName: string,
    caption?: string
  ): Promise<any> {
    console.log('🔍 WhatsApp Service - Iniciando envio de documento')
    
    // Buscar instância atual do perfil
    const instanceData = await this.getInstanceFromProfile()
    console.log('📱 Instância encontrada:', instanceData)
    
    if (!instanceData?.instanceName) {
      throw new Error('Nenhuma instância WhatsApp configurada. Configure primeiro na página de WhatsApp.')
    }

    if (instanceData.status !== 'open') {
      throw new Error(`Instância WhatsApp não está conectada. Status atual: ${instanceData.status}. Conecte a instância primeiro.`)
    }

    const formattedNumber = this.formatNumberForEvolution(numberOrRemoteJid)
    if (!formattedNumber) {
      throw new Error('Número inválido para envio (vazio após formatação)')
    }
    console.log('📞 Número formatado para Evolution:', formattedNumber)
    
    console.log('🔗 URL da API:', this.baseUrl)
    console.log('📤 Enviando para instância:', instanceData.instanceName)

    // Payload conforme documentação oficial Evolution API v2
    // https://doc.evolution-api.com/v2/api-reference/message-controller/send-media
    const payload = {
      number: formattedNumber,
      mediatype: 'document',
      mimetype: 'application/pdf',
      caption: caption || '',
      media: base64,
      fileName: fileName,
      delay: 4000
    }

    console.log('📦 Payload preparado:', {
      number: formattedNumber,
      mediatype: payload.mediatype,
      mimetype: payload.mimetype,
      fileName: payload.fileName,
      hasCaption: !!caption,
      mediaSize: base64.length
    })

    try {
      const result = await this.makeRequest(`/message/sendMedia/${instanceData.instanceName}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      console.log('✅ Documento enviado com sucesso:', result)
      return result
    } catch (error) {
      console.error('❌ Erro ao enviar documento:', error)
      throw error
    }
  }

  /**
   * Enviar mensagem de texto via WhatsApp
   * @param numberOrRemoteJid - Número do destinatário OU remoteJid (ex: 5511999999999@s.whatsapp.net)
   * @param message - Mensagem de texto
   * @param options - Opções adicionais (linkPreview, delay)
   */
  async sendText(
    numberOrRemoteJid: string, 
    message: string,
    options?: {
      linkPreview?: boolean
      delay?: number
    }
  ): Promise<any> {
    console.log('💬 WhatsApp Service - Enviando mensagem de texto')
    
    const instanceData = await this.getInstanceFromProfile()
    console.log('📱 Instância encontrada:', instanceData)
    
    if (!instanceData?.instanceName) {
      throw new Error('Nenhuma instância WhatsApp configurada.')
    }

    if (instanceData.status !== 'open') {
      throw new Error(`Instância WhatsApp não está conectada. Status atual: ${instanceData.status}`)
    }

    const formattedNumber = this.formatNumberForEvolution(numberOrRemoteJid)
    if (!formattedNumber) {
      throw new Error('Número inválido para envio (vazio após formatação)')
    }
    console.log('📞 Número formatado para Evolution:', formattedNumber)

    // Payload conforme documentação oficial Evolution API v2
    // https://doc.evolution-api.com/v2/api-reference/message-controller/send-text
    const payload = {
      number: formattedNumber,
      text: message,
      delay: 4000,
      linkPreview: options?.linkPreview !== false // true por padrão
    }

    console.log('📦 Payload texto:', {
      number: formattedNumber,
      messageLength: message.length,
      linkPreview: payload.linkPreview
    })

    try {
      const result = await this.makeRequest(`/message/sendText/${instanceData.instanceName}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      console.log('✅ Mensagem enviada com sucesso:', result)
      return result
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error)
      throw error
    }
  }
}

export const whatsappService = new WhatsAppService()
