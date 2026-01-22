import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type TipoProtocoloPacoteMidia = 'imagem' | 'outro'

export interface ProtocoloPacoteMidia {
  id: string
  admin_profile_id: string
  protocolo_pacote_id: string
  tipo: TipoProtocoloPacoteMidia | string
  storage_bucket: string
  storage_path: string
  label?: string | null
  created_at: string
  updated_at: string
}

export interface ProtocoloPacoteMidiaCreateData {
  protocolo_pacote_id: string
  tipo?: TipoProtocoloPacoteMidia | string
  storage_bucket: string
  storage_path: string
  label?: string | null
}

export const protocoloPacoteMidiasService = {
  async listByProtocoloPacoteId(protocoloPacoteId: string): Promise<ProtocoloPacoteMidia[]> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('protocolo_pacote_midias')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .eq('protocolo_pacote_id', protocoloPacoteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar mídias do protocolo/pacote:', error)
      throw new Error(`Erro ao buscar mídias do protocolo/pacote: ${error.message}`)
    }

    return (data as ProtocoloPacoteMidia[]) ?? []
  },

  async create(payload: ProtocoloPacoteMidiaCreateData): Promise<ProtocoloPacoteMidia> {
    const { adminProfileId } = await getAdminContext()

    const baseData = {
      admin_profile_id: adminProfileId,
      protocolo_pacote_id: payload.protocolo_pacote_id,
      tipo: payload.tipo ?? 'imagem',
      storage_bucket: payload.storage_bucket,
      storage_path: payload.storage_path,
      label: payload.label ?? null,
    }

    const { data, error } = await supabase
      .from('protocolo_pacote_midias')
      .insert(baseData)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar mídia do protocolo/pacote:', error)
      throw new Error(`Erro ao criar mídia do protocolo/pacote: ${error.message}`)
    }

    return data as ProtocoloPacoteMidia
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('protocolo_pacote_midias')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao deletar mídia do protocolo/pacote:', error)
      throw new Error(`Erro ao deletar mídia do protocolo/pacote: ${error.message}`)
    }
  },
}
