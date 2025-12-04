import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusCategoria = 'ativa' | 'inativa'

export interface CategoriaProcedimento {
  id: string
  admin_profile_id: string
  nome: string
  descricao?: string | null
  cor?: string | null
  icone?: string | null
  ordem?: number | null
  status: StatusCategoria
  created_at: string
  updated_at: string
}

export interface CategoriaFilters {
  status?: StatusCategoria
  search?: string
  limit?: number
}

export interface CategoriaCreateData {
  nome: string
  descricao?: string | null
  cor?: string | null
  icone?: string | null
  ordem?: number | null
  status?: StatusCategoria
}

export type CategoriaUpdateData = Partial<CategoriaCreateData>

export const categoriasService = {
  async getAll(filters: CategoriaFilters = {}): Promise<CategoriaProcedimento[]> {
    const { adminProfileId } = await getAdminContext()

    let query = supabase
      .from('categorias_procedimento')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .order('ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.search) {
      const searchTerm = filters.search.trim()
      query = query.or(`nome.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar categorias:', error)
      throw new Error(error.message || 'Erro ao buscar categorias')
    }

    return data ?? []
  },

  async getById(id: string): Promise<CategoriaProcedimento | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('categorias_procedimento')
      .select('*')
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar categoria:', error)
      throw new Error(error.message || 'Erro ao buscar categoria')
    }

    return data
  },

  async create(payload: CategoriaCreateData): Promise<CategoriaProcedimento> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('categorias_procedimento')
      .insert({
        ...payload,
        admin_profile_id: adminProfileId,
        status: payload.status ?? 'ativa',
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar categoria:', error)
      throw new Error(error.message || 'Erro ao criar categoria')
    }

    return data
  },

  async update(id: string, payload: CategoriaUpdateData): Promise<CategoriaProcedimento> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('categorias_procedimento')
      .update(payload)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar categoria:', error)
      throw new Error(error.message || 'Erro ao atualizar categoria')
    }

    return data
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('categorias_procedimento')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao excluir categoria:', error)
      throw new Error(error.message || 'Erro ao excluir categoria')
    }
  },

  async updateStatus(id: string, status: StatusCategoria): Promise<CategoriaProcedimento> {
    return this.update(id, { status })
  },
}
