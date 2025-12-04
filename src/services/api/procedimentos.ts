import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusProcedimento = 'ativo' | 'inativo' | 'descontinuado'

export interface Procedimento {
  id: string
  admin_profile_id: string
  categoria_id?: string | null
  nome: string
  descricao?: string | null
  codigo?: string | null
  duracao_estimada?: number | null
  valor_base?: number | null
  valor_minimo?: number | null
  valor_maximo?: number | null
  requer_autorizacao: boolean
  observacoes?: string | null
  status: StatusProcedimento
  created_at: string
  updated_at: string
  categoria?: {
    id: string
    nome: string
  } | null
}

export interface ProcedimentoFilters {
  categoria_id?: string
  status?: StatusProcedimento
  search?: string
  limit?: number
  page?: number
}

export interface ProcedimentoCreateData {
  categoria_id?: string | null
  nome: string
  descricao?: string | null
  codigo?: string | null
  duracao_estimada?: number | null
  valor_base?: number | null
  valor_minimo?: number | null
  valor_maximo?: number | null
  requer_autorizacao?: boolean
  observacoes?: string | null
  status?: StatusProcedimento
}

export type ProcedimentoUpdateData = Partial<ProcedimentoCreateData>

export const procedimentosService = {
  async getAll(filters: ProcedimentoFilters = {}): Promise<{ data: Procedimento[]; count: number }> {
    const { adminProfileId } = await getAdminContext()

    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    const offset = (page - 1) * limit

    let query = supabase
      .from('procedimentos')
      .select(
        `*,
        categoria:categorias_procedimento(id, nome)`,
        { count: 'exact' }
      )
      .eq('admin_profile_id', adminProfileId)
      .order('nome', { ascending: true })
      .range(offset, offset + limit - 1)

    if (filters.categoria_id) {
      query = query.eq('categoria_id', filters.categoria_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.search) {
      const searchTerm = filters.search.trim()
      query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar procedimentos:', error)
      throw new Error(error.message || 'Erro ao buscar procedimentos')
    }

    return { data: data ?? [], count: count ?? 0 }
  },

  async getById(id: string): Promise<Procedimento | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('procedimentos')
      .select(
        `*,
        categoria:categorias_procedimento(id, nome)`
      )
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar procedimento:', error)
      throw new Error(error.message || 'Erro ao buscar procedimento')
    }

    return data
  },

  async create(payload: ProcedimentoCreateData): Promise<Procedimento> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('procedimentos')
      .insert({
        ...payload,
        admin_profile_id: adminProfileId,
        requer_autorizacao: payload.requer_autorizacao ?? false,
        status: payload.status ?? 'ativo',
      })
      .select(
        `*,
        categoria:categorias_procedimento(id, nome)`
      )
      .single()

    if (error) {
      console.error('Erro ao criar procedimento:', error)
      throw new Error(error.message || 'Erro ao criar procedimento')
    }

    return data
  },

  async update(id: string, payload: ProcedimentoUpdateData): Promise<Procedimento> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('procedimentos')
      .update(payload)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select(
        `*,
        categoria:categorias_procedimento(id, nome)`
      )
      .single()

    if (error) {
      console.error('Erro ao atualizar procedimento:', error)
      throw new Error(error.message || 'Erro ao atualizar procedimento')
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('procedimentos')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao excluir procedimento:', error)
      throw new Error(error.message || 'Erro ao excluir procedimento')
    }
  },

  async updateStatus(id: string, status: StatusProcedimento): Promise<Procedimento> {
    return this.update(id, { status })
  },
}
