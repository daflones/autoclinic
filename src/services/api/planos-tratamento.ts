import { supabase } from '@/lib/supabase'
import { AtividadeService } from './atividades'
import { getAdminContext } from './_tenant'

export type StatusPlanoTratamento =
  | 'rascunho'
  | 'em_aprovacao'
  | 'aprovado'
  | 'em_execucao'
  | 'concluido'
  | 'cancelado'

export interface PlanoTratamentoItem {
  id: string
  plano_id: string
  procedimento_id?: string | null
  descricao_personalizada?: string | null
  quantidade: number
  ordem: number
  valor_unitario: number
  desconto_percentual: number
  total: number
  observacoes?: string | null
}

export interface PlanoTratamento {
  id: string
  admin_profile_id: string
  paciente_id: string
  responsavel_profissional_id?: string | null
  protocolo_pacote_id?: string | null
  titulo: string
  descricao?: string | null
  status: StatusPlanoTratamento
  validade_dias: number
  total_previsto: number
  total_pago: number
  observacoes?: string | null
  criado_por?: string | null
  aprovado_por?: string | null
  aprovado_em?: string | null
  created_at: string
  updated_at: string
  itens?: PlanoTratamentoItem[]
  paciente?: {
    id: string
    nome_completo: string
    telefone?: string | null
    whatsapp?: string | null
    email?: string | null
  } | null
}

export interface PlanoTratamentoFilters {
  paciente_id?: string
  responsavel_profissional_id?: string
  protocolo_pacote_id?: string
  status?: StatusPlanoTratamento
  search?: string
  page?: number
  limit?: number
  data_inicio?: string
  data_fim?: string
}

export interface PlanoTratamentoItemInput {
  procedimento_id?: string | null
  descricao_personalizada?: string | null
  quantidade?: number
  ordem?: number
  valor_unitario?: number
  desconto_percentual?: number
  observacoes?: string | null
}

export interface PlanoTratamentoCreateData {
  paciente_id: string
  responsavel_profissional_id?: string | null
  protocolo_pacote_id?: string | null
  titulo: string
  descricao?: string | null
  status?: StatusPlanoTratamento
  validade_dias?: number
  total_previsto?: number
  total_pago?: number
  observacoes?: string | null
  itens?: PlanoTratamentoItemInput[]
}

export interface PlanoTratamentoUpdateData extends Partial<PlanoTratamentoCreateData> {
  aprovado_por?: string | null
  aprovado_em?: string | null
}

function prepareItensForInsert(planoId: string, itens?: PlanoTratamentoItemInput[]) {
  if (!Array.isArray(itens)) return []

  return itens
    .filter((item) => item && (item.procedimento_id || item.descricao_personalizada))
    .map((item, index) => ({
      plano_id: planoId,
      procedimento_id: item.procedimento_id ?? null,
      descricao_personalizada: item.descricao_personalizada ?? null,
      quantidade: item.quantidade ?? 1,
      ordem: item.ordem ?? index,
      valor_unitario: item.valor_unitario ?? 0,
      desconto_percentual: item.desconto_percentual ?? 0,
      observacoes: item.observacoes ?? null
    }))
}

export const planosTratamentoService = {
  async getAll(filters: PlanoTratamentoFilters = {}): Promise<{ data: PlanoTratamento[]; count: number }> {
    const { adminProfileId, role, profissionalClinicaId } = await getAdminContext()

    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const offset = (page - 1) * limit

    let query = supabase
      .from('planos_tratamento')
      .select('*, paciente:pacientes(id,nome_completo,telefone,whatsapp,email)', { count: 'exact' })
      .eq('admin_profile_id', adminProfileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.paciente_id) {
      query = query.eq('paciente_id', filters.paciente_id)
    }

    // Profissional só vê planos onde é o responsável
    if (role === 'profissional' && profissionalClinicaId) {
      query = query.eq('responsavel_profissional_id', profissionalClinicaId)
    } else if (filters.responsavel_profissional_id) {
      query = query.eq('responsavel_profissional_id', filters.responsavel_profissional_id)
    }

    if (filters.protocolo_pacote_id) {
      query = query.eq('protocolo_pacote_id', filters.protocolo_pacote_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.data_inicio) {
      query = query.gte('created_at', filters.data_inicio)
    }

    if (filters.data_fim) {
      query = query.lte('created_at', filters.data_fim)
    }

    if (filters.search) {
      const searchTerm = filters.search.trim()
      query = query.or([
        `titulo.ilike.%${searchTerm}%`,
        `descricao.ilike.%${searchTerm}%`,
        `observacoes.ilike.%${searchTerm}%`
      ].join(','))
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar planos de tratamento:', error)
      throw new Error(`Erro ao buscar planos de tratamento: ${error.message}`)
    }

    return {
      data: (data as PlanoTratamento[]) ?? [],
      count: count ?? 0
    }
  },

  async getById(id: string): Promise<PlanoTratamento | null> {
    const { adminProfileId, role, profissionalClinicaId } = await getAdminContext()

    let query = supabase
      .from('planos_tratamento')
      .select('*')
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    // Profissional só vê planos onde é o responsável
    if (role === 'profissional' && profissionalClinicaId) {
      query = query.eq('responsavel_profissional_id', profissionalClinicaId)
    }

    const { data: plano, error } = await query.single()

    if (error) {
      console.error('Erro ao buscar plano de tratamento:', error)
      throw new Error(`Erro ao buscar plano de tratamento: ${error.message}`)
    }

    if (!plano) return null

    const { data: itens, error: itensError } = await supabase
      .from('planos_tratamento_itens')
      .select('*')
      .eq('plano_id', id)
      .order('ordem', { ascending: true })

    if (itensError) {
      console.error('Erro ao buscar itens do plano:', itensError)
      throw new Error(`Erro ao buscar itens do plano: ${itensError.message}`)
    }

    return {
      ...(plano as PlanoTratamento),
      itens: (itens as PlanoTratamentoItem[]) ?? []
    }
  },

  async create(payload: PlanoTratamentoCreateData): Promise<PlanoTratamento> {
    const { adminProfileId, userId } = await getAdminContext()

    if (!payload.paciente_id) {
      throw new Error('Paciente é obrigatório')
    }

    if (!payload.titulo) {
      throw new Error('Título é obrigatório')
    }

    const baseData = {
      admin_profile_id: adminProfileId,
      paciente_id: payload.paciente_id,
      responsavel_profissional_id: payload.responsavel_profissional_id ?? null,
      protocolo_pacote_id: payload.protocolo_pacote_id ?? null,
      titulo: payload.titulo,
      descricao: payload.descricao ?? null,
      status: payload.status ?? 'rascunho',
      validade_dias: payload.validade_dias ?? 30,
      total_previsto: payload.total_previsto ?? 0,
      total_pago: payload.total_pago ?? 0,
      observacoes: payload.observacoes ?? null,
      criado_por: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: plano, error } = await supabase
      .from('planos_tratamento')
      .insert(baseData)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar plano de tratamento:', error)
      throw new Error(`Erro ao criar plano de tratamento: ${error.message}`)
    }

    const itensToInsert = prepareItensForInsert(plano.id, payload.itens)

    if (itensToInsert.length > 0) {
      const { error: itensError } = await supabase
        .from('planos_tratamento_itens')
        .insert(itensToInsert)

      if (itensError) {
        console.error('Erro ao criar itens do plano:', itensError)
        throw new Error(`Erro ao criar itens do plano: ${itensError.message}`)
      }
    }

    const planoCompleto = await this.getById(plano.id)

    await AtividadeService.criar(
      'plano_tratamento',
      plano.id,
      planoCompleto,
      `Plano de tratamento criado: ${plano.titulo}`
    )

    return planoCompleto as PlanoTratamento
  },

  async update(id: string, updates: PlanoTratamentoUpdateData): Promise<PlanoTratamento> {
    const planoAnterior = await this.getById(id)
    if (!planoAnterior) {
      throw new Error('Plano de tratamento não encontrado')
    }

    const baseUpdate = {
      ...updates,
      protocolo_pacote_id: updates.protocolo_pacote_id ?? undefined,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('planos_tratamento')
      .update(baseUpdate)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar plano de tratamento:', error)
      throw new Error(`Erro ao atualizar plano de tratamento: ${error.message}`)
    }

    if (Array.isArray(updates.itens)) {
      const { error: deleteError } = await supabase
        .from('planos_tratamento_itens')
        .delete()
        .eq('plano_id', id)

      if (deleteError) {
        console.error('Erro ao remover itens antigos do plano:', deleteError)
        throw new Error(`Erro ao atualizar itens do plano: ${deleteError.message}`)
      }

      const itensToInsert = prepareItensForInsert(id, updates.itens)

      if (itensToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('planos_tratamento_itens')
          .insert(itensToInsert)

        if (insertError) {
          console.error('Erro ao inserir novos itens do plano:', insertError)
          throw new Error(`Erro ao inserir novos itens do plano: ${insertError.message}`)
        }
      }
    }

    const planoAtualizado = await this.getById(id)

    await AtividadeService.editar(
      'plano_tratamento',
      id,
      planoAnterior,
      planoAtualizado,
      `Plano de tratamento atualizado: ${planoAtualizado?.titulo ?? planoAnterior.titulo}`
    )

    return planoAtualizado as PlanoTratamento
  },

  async updateStatus(id: string, status: StatusPlanoTratamento): Promise<PlanoTratamento> {
    const planoAnterior = await this.getById(id)
    if (!planoAnterior) {
      throw new Error('Plano de tratamento não encontrado')
    }

    const { error } = await supabase
      .from('planos_tratamento')
      .update({
        status,
        updated_at: new Date().toISOString(),
        aprovado_em: status === 'aprovado' ? new Date().toISOString() : planoAnterior.aprovado_em
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar status do plano:', error)
      throw new Error(`Erro ao atualizar status do plano: ${error.message}`)
    }

    const planoAtualizado = await this.getById(id)

    if (status === 'aprovado') {
      await AtividadeService.aprovar(
        'plano_tratamento',
        id,
        planoAnterior,
        planoAtualizado,
        `Plano de tratamento aprovado: ${planoAtualizado?.titulo ?? planoAnterior.titulo}`
      )
    } else {
      await AtividadeService.editar(
        'plano_tratamento',
        id,
        planoAnterior,
        planoAtualizado,
        `Status do plano atualizado: ${planoAnterior.titulo}`
      )
    }

    return planoAtualizado as PlanoTratamento
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const plano = await this.getById(id)
    if (!plano) {
      throw new Error('Plano de tratamento não encontrado')
    }

    const { error: itensError } = await supabase
      .from('planos_tratamento_itens')
      .delete()
      .eq('plano_id', id)

    if (itensError) {
      console.error('Erro ao remover itens do plano:', itensError)
      throw new Error(`Erro ao remover itens do plano: ${itensError.message}`)
    }

    const { error } = await supabase
      .from('planos_tratamento')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao deletar plano de tratamento:', error)
      throw new Error(`Erro ao deletar plano de tratamento: ${error.message}`)
    }

    await AtividadeService.deletar(
      'plano_tratamento',
      id,
      plano,
      `Plano de tratamento removido: ${plano.titulo}`
    )
  }
}
