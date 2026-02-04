import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type ProtocoloPacoteStatus = 'ativo' | 'inativo'

export interface ProtocoloPacote {
  id: string
  admin_profile_id: string
  nome: string
  descricao?: string | null
  preco?: number | null
  itens?: string | null
  imagem_path?: string | null
  conteudo?: Record<string, any> | null
  ia_config?: Record<string, any> | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ProtocoloPacoteFilters {
  status?: ProtocoloPacoteStatus
  search?: string
  limit?: number
}

export interface ProtocoloPacoteCreateData {
  nome: string
  descricao?: string | null
  preco?: number | null
  itens?: string | null
  imagem_path?: string | null
  conteudo?: Record<string, any> | null
  ia_config?: Record<string, any> | null
  ativo?: boolean
}

export type ProtocoloPacoteUpdateData = Partial<ProtocoloPacoteCreateData>

export const protocolosPacotesService = {
  async getAll(filters: ProtocoloPacoteFilters = {}): Promise<ProtocoloPacote[]> {
    const { adminProfileId } = await getAdminContext()

    let query = supabase
      .from('protocolos_pacotes')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .order('nome', { ascending: true })

    if (filters.status) {
      query = query.eq('ativo', filters.status === 'ativo')
    }

    if (filters.search) {
      const s = filters.search.trim()
      query = query.or([`nome.ilike.%${s}%`, `descricao.ilike.%${s}%`].join(','))
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar protocolos/pacotes:', error)
      throw new Error(error.message || 'Erro ao buscar protocolos/pacotes')
    }

    return (data as ProtocoloPacote[]) ?? []
  },

  async getById(id: string): Promise<ProtocoloPacote | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('protocolos_pacotes')
      .select('*')
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .single()

    if (error) {
      console.error('Erro ao buscar protocolo/pacote:', error)
      throw new Error(error.message || 'Erro ao buscar protocolo/pacote')
    }

    return (data as ProtocoloPacote) ?? null
  },

  async create(payload: ProtocoloPacoteCreateData): Promise<ProtocoloPacote> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('protocolos_pacotes')
      .insert({
        ...payload,
        admin_profile_id: adminProfileId,
        ativo: payload.ativo ?? true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar protocolo/pacote:', error)
      throw new Error(error.message || 'Erro ao criar protocolo/pacote')
    }

    return data as ProtocoloPacote
  },

  async update(id: string, payload: ProtocoloPacoteUpdateData): Promise<ProtocoloPacote> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('protocolos_pacotes')
      .update(payload)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar protocolo/pacote:', error)
      throw new Error(error.message || 'Erro ao atualizar protocolo/pacote')
    }

    return data as ProtocoloPacote
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('protocolos_pacotes')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao excluir protocolo/pacote:', error)
      throw new Error(error.message || 'Erro ao excluir protocolo/pacote')
    }
  },
}
