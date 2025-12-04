import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusProfissional = 'ativo' | 'inativo' | 'ferias' | 'afastado' | 'desligado'
export type ModalidadeAtendimento = 'presencial' | 'online' | 'hibrido'

export interface ProfissionalClinica {
  id: string
  admin_profile_id: string
  profile_id?: string | null
  nome: string
  documento?: string | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  foto_url?: string | null
  especialidades?: string[] | null
  conselho?: string | null
  registro_profissional?: string | null
  modalidade?: ModalidadeAtendimento | null
  percentual_comissao?: number | null
  meta_mensal?: number | null
  horario_atendimento?: Record<string, unknown> | null
  status: StatusProfissional
  created_at: string
  updated_at: string
}

export interface ProfissionalFilters {
  status?: StatusProfissional
  search?: string
  limit?: number
}

export interface ProfissionalCreateData {
  profile_id?: string | null
  nome: string
  documento?: string | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  foto_url?: string | null
  especialidades?: string[] | null
  conselho?: string | null
  registro_profissional?: string | null
  modalidade?: ModalidadeAtendimento | null
  percentual_comissao?: number | null
  meta_mensal?: number | null
  horario_atendimento?: Record<string, unknown> | null
  status?: StatusProfissional
}

export type ProfissionalUpdateData = Partial<ProfissionalCreateData>

export const profissionaisClinicaService = {
  async getAll(filters: ProfissionalFilters = {}): Promise<ProfissionalClinica[]> {
    const { adminProfileId } = await getAdminContext()

    let query = supabase
      .from('profissionais_clinica')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .order('nome', { ascending: true })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.search) {
      const searchTerm = filters.search.trim()
      query = query.or([
        `nome.ilike.%${searchTerm}%`,
        `email.ilike.%${searchTerm}%`,
        `documento.ilike.%${searchTerm}%`
      ].join(','))
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar profissionais da clínica:', error)
      throw new Error(`Erro ao buscar profissionais: ${error.message}`)
    }

    return (data as ProfissionalClinica[]) ?? []
  },

  async getById(id: string): Promise<ProfissionalClinica | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('profissionais_clinica')
      .select('*')
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .single()

    if (error) {
      console.error('Erro ao buscar profissional da clínica:', error)
      throw new Error(`Erro ao buscar profissional: ${error.message}`)
    }

    return data as ProfissionalClinica | null
  },

  async create(payload: ProfissionalCreateData): Promise<ProfissionalClinica> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('profissionais_clinica')
      .insert({
        ...payload,
        admin_profile_id: adminProfileId,
        status: payload.status ?? 'ativo',
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar profissional:', error)
      throw new Error(error.message || 'Erro ao criar profissional')
    }

    return data
  },

  async update(id: string, payload: ProfissionalUpdateData): Promise<ProfissionalClinica> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('profissionais_clinica')
      .update(payload)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar profissional:', error)
      throw new Error(error.message || 'Erro ao atualizar profissional')
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('profissionais_clinica')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao excluir profissional:', error)
      throw new Error(error.message || 'Erro ao excluir profissional')
    }
  },

  async updateStatus(id: string, status: StatusProfissional): Promise<ProfissionalClinica> {
    return this.update(id, { status })
  },
}
