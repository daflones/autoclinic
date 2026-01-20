import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type ListaEsperaPrioridade = 'alta' | 'media' | 'baixa'
export type ListaEsperaStatus = 'aguardando' | 'contatado' | 'agendado' | 'cancelado'

export interface ListaEsperaAgendamento {
  id: string
  admin_profile_id: string
  paciente_id?: string | null
  nome_paciente?: string | null
  telefone?: string | null
  procedimento_id?: string | null
  preferencia_horario?: string | null
  prioridade: ListaEsperaPrioridade
  status: ListaEsperaStatus
  observacoes?: string | null
  created_at: string
  updated_at: string
  paciente?: {
    id: string
    nome_completo: string
    telefone?: string | null
    whatsapp?: string | null
  } | null
  procedimento?: {
    id: string
    nome: string
  } | null
}

export interface ListaEsperaAgendamentosFilters {
  status?: ListaEsperaStatus
  prioridade?: ListaEsperaPrioridade
  search?: string
  limit?: number
}

export interface ListaEsperaAgendamentoCreateData {
  paciente_id?: string | null
  nome_paciente?: string | null
  telefone?: string | null
  procedimento_id?: string | null
  preferencia_horario?: string | null
  prioridade?: ListaEsperaPrioridade
  status?: ListaEsperaStatus
  observacoes?: string | null
}

export type ListaEsperaAgendamentoUpdateData = Partial<ListaEsperaAgendamentoCreateData>

function buildSelectQuery() {
  return supabase
    .from('lista_espera_agendamentos')
    .select(
      `*,
      paciente:pacientes(id, nome_completo, telefone, whatsapp),
      procedimento:procedimentos(id, nome)`,
      { count: 'exact' }
    )
}

export const listaEsperaAgendamentosService = {
  async getAll(filters: ListaEsperaAgendamentosFilters = {}): Promise<{ data: ListaEsperaAgendamento[]; count: number }> {
    const { adminProfileId } = await getAdminContext()

    const limit = filters.limit ?? 200
    let query = buildSelectQuery()
      .eq('admin_profile_id', adminProfileId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.prioridade) query = query.eq('prioridade', filters.prioridade)

    if (filters.search) {
      const term = filters.search.trim()
      query = query.or([
        `nome_paciente.ilike.%${term}%`,
        `telefone.ilike.%${term}%`,
        `preferencia_horario.ilike.%${term}%`,
        `observacoes.ilike.%${term}%`
      ].join(','))
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message || 'Erro ao buscar lista de espera')

    return { data: (data as ListaEsperaAgendamento[]) ?? [], count: count ?? 0 }
  },

  async create(payload: ListaEsperaAgendamentoCreateData): Promise<ListaEsperaAgendamento> {
    const { adminProfileId } = await getAdminContext()

    const base = {
      admin_profile_id: adminProfileId,
      paciente_id: payload.paciente_id ?? null,
      nome_paciente: payload.nome_paciente ?? null,
      telefone: payload.telefone ?? null,
      procedimento_id: payload.procedimento_id ?? null,
      preferencia_horario: payload.preferencia_horario ?? null,
      prioridade: payload.prioridade ?? 'media',
      status: payload.status ?? 'aguardando',
      observacoes: payload.observacoes ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('lista_espera_agendamentos')
      .insert(base)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        procedimento:procedimentos(id, nome)`
      )
      .single()

    if (error) throw new Error(error.message || 'Erro ao criar item da lista de espera')
    return data as ListaEsperaAgendamento
  },

  async update(id: string, updates: ListaEsperaAgendamentoUpdateData): Promise<ListaEsperaAgendamento> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('lista_espera_agendamentos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        procedimento:procedimentos(id, nome)`
      )
      .single()

    if (error) throw new Error(error.message || 'Erro ao atualizar item da lista de espera')
    return data as ListaEsperaAgendamento
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('lista_espera_agendamentos')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) throw new Error(error.message || 'Erro ao excluir item da lista de espera')
  },
}
