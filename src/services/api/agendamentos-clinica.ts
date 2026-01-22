import { supabase } from '@/lib/supabase'
import { AtividadeService } from './atividades'
import { getAdminContext } from './_tenant'

export type StatusAgendamentoClinica =
  | 'agendado'
  | 'confirmado'
  | 'check_in'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu'
  | 'remarcado'

export interface AgendamentoClinica {
  id: string
  admin_profile_id: string
  paciente_id?: string | null
  profissional_id?: string | null
  plano_tratamento_id?: string | null
  procedimento_id?: string | null
  titulo: string
  descricao?: string | null
  data_inicio: string
  data_fim: string
  data_inicio_anterior?: string | null
  data_fim_anterior?: string | null
  remarcado_em?: string | null
  remarcado_motivo?: string | null
  sala?: string | null
  status: StatusAgendamentoClinica
  origem?: string | null
  lembrete_enviado: boolean
  confirmar_paciente: boolean
  confirmar_profissional: boolean
  notas_pos_atendimento?: string | null
  follow_up_em?: string | null
  created_at: string
  updated_at: string
  paciente?: {
    id: string
    nome_completo: string
    telefone?: string | null
    whatsapp?: string | null
  } | null
  profissional?: {
    id: string
    nome: string
    conselho?: string | null
  } | null
}

export interface AgendamentoClinicaFilters {
  paciente_id?: string
  profissional_id?: string
  plano_tratamento_id?: string
  procedimento_id?: string
  status?: StatusAgendamentoClinica
  data_inicio?: string
  data_fim?: string
  search?: string
  page?: number
  limit?: number
}

export interface AgendamentoClinicaCreateData {
  paciente_id?: string | null
  profissional_id?: string | null
  plano_tratamento_id?: string | null
  procedimento_id?: string | null
  titulo: string
  descricao?: string | null
  data_inicio: string
  data_fim: string
  data_inicio_anterior?: string | null
  data_fim_anterior?: string | null
  remarcado_em?: string | null
  remarcado_motivo?: string | null
  sala?: string | null
  status?: StatusAgendamentoClinica
  origem?: string | null
  lembrete_enviado?: boolean
  confirmar_paciente?: boolean
  confirmar_profissional?: boolean
  notas_pos_atendimento?: string | null
  follow_up_em?: string | null
}

export type AgendamentoClinicaUpdateData = Partial<AgendamentoClinicaCreateData>

function buildSelectQuery() {
  return supabase
    .from('agendamentos_clinica')
    .select(
      `*,
      paciente:pacientes(id, nome_completo, telefone, whatsapp),
      profissional:profissionais_clinica(id, nome, conselho)`,
      { count: 'exact' }
    )
}

export const agendamentosClinicaService = {
  async getAll(filters: AgendamentoClinicaFilters = {}): Promise<{ data: AgendamentoClinica[]; count: number }> {
    const { adminProfileId } = await getAdminContext()

    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    const offset = (page - 1) * limit

    let query = buildSelectQuery()
      .eq('admin_profile_id', adminProfileId)
      .order('data_inicio', { ascending: true })
      .range(offset, offset + limit - 1)

    if (filters.paciente_id) {
      query = query.eq('paciente_id', filters.paciente_id)
    }

    if (filters.profissional_id) {
      query = query.eq('profissional_id', filters.profissional_id)
    }

    if (filters.plano_tratamento_id) {
      query = query.eq('plano_tratamento_id', filters.plano_tratamento_id)
    }

    if (filters.procedimento_id) {
      query = query.eq('procedimento_id', filters.procedimento_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.data_inicio) {
      query = query.gte('data_inicio', filters.data_inicio)
    }

    if (filters.data_fim) {
      query = query.lte('data_fim', filters.data_fim)
    }

    if (filters.search) {
      const term = filters.search.trim()
      query = query.or(
        [
          `titulo.ilike.%${term}%`,
          `descricao.ilike.%${term}%`,
          `sala.ilike.%${term}%`
        ].join(',')
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar agendamentos clínicos:', error)
      throw new Error(`Erro ao buscar agendamentos clínicos: ${error.message}`)
    }

    return {
      data: (data as AgendamentoClinica[]) ?? [],
      count: count ?? 0
    }
  },

  async getById(id: string): Promise<AgendamentoClinica | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await buildSelectQuery()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .single()

    if (error) {
      console.error('Erro ao buscar agendamento clínico:', error)
      throw new Error(`Erro ao buscar agendamento clínico: ${error.message}`)
    }

    return (data as AgendamentoClinica) ?? null
  },

  async getStatusStats(): Promise<Record<StatusAgendamentoClinica, number>> {
    const { adminProfileId } = await getAdminContext()

    const statuses: StatusAgendamentoClinica[] = [
      'agendado',
      'confirmado',
      'check_in',
      'em_andamento',
      'concluido',
      'cancelado',
      'nao_compareceu',
      'remarcado'
    ]

    const stats: Record<StatusAgendamentoClinica, number> = {
      agendado: 0,
      confirmado: 0,
      check_in: 0,
      em_andamento: 0,
      concluido: 0,
      cancelado: 0,
      nao_compareceu: 0,
      remarcado: 0
    }

    const responses = await Promise.all(
      statuses.map((status) =>
        supabase
          .from('agendamentos_clinica')
          .select('*', { count: 'exact', head: true })
          .eq('admin_profile_id', adminProfileId)
          .eq('status', status)
      )
    )

    responses.forEach((response, index) => {
      const status = statuses[index]
      stats[status] = response.count ?? 0
    })

    return stats
  },

  async create(payload: AgendamentoClinicaCreateData): Promise<AgendamentoClinica> {
    const { adminProfileId } = await getAdminContext()

    if (!payload.data_inicio || !payload.data_fim) {
      throw new Error('Datas de início e fim são obrigatórias')
    }

    if (!payload.titulo) {
      throw new Error('Título do agendamento é obrigatório')
    }

    const baseData = {
      admin_profile_id: adminProfileId,
      paciente_id: payload.paciente_id ?? null,
      profissional_id: payload.profissional_id ?? null,
      plano_tratamento_id: payload.plano_tratamento_id ?? null,
      procedimento_id: payload.procedimento_id ?? null,
      titulo: payload.titulo,
      descricao: payload.descricao ?? null,
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      data_inicio_anterior: payload.data_inicio_anterior ?? null,
      data_fim_anterior: payload.data_fim_anterior ?? null,
      remarcado_em: payload.remarcado_em ?? null,
      remarcado_motivo: payload.remarcado_motivo ?? null,
      sala: payload.sala ?? null,
      status: payload.status ?? 'agendado',
      origem: payload.origem ?? null,
      lembrete_enviado: payload.lembrete_enviado ?? false,
      confirmar_paciente: payload.confirmar_paciente ?? false,
      confirmar_profissional: payload.confirmar_profissional ?? false,
      notas_pos_atendimento: payload.notas_pos_atendimento ?? null,
      follow_up_em: payload.follow_up_em ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('agendamentos_clinica')
      .insert(baseData)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        profissional:profissionais_clinica(id, nome, conselho)`
      )
      .single()

    if (error) {
      console.error('Erro ao criar agendamento clínico:', error)
      throw new Error(`Erro ao criar agendamento clínico: ${error.message}`)
    }

    await AtividadeService.criar(
      'agendamento',
      data.id,
      data,
      `Agendamento criado: ${data.titulo}`
    )

    return data as AgendamentoClinica
  },

  async update(id: string, updates: AgendamentoClinicaUpdateData): Promise<AgendamentoClinica> {
    const { adminProfileId } = await getAdminContext()

    const agendamentoAnterior = await this.getById(id)
    if (!agendamentoAnterior) {
      throw new Error('Agendamento não encontrado')
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('agendamentos_clinica')
      .update(updateData)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        profissional:profissionais_clinica(id, nome, conselho)`
      )
      .single()

    if (error) {
      console.error('Erro ao atualizar agendamento clínico:', error)
      throw new Error(`Erro ao atualizar agendamento clínico: ${error.message}`)
    }

    await AtividadeService.editar(
      'agendamento',
      id,
      agendamentoAnterior,
      data,
      `Agendamento atualizado: ${data.titulo}`
    )

    return data as AgendamentoClinica
  },

  async reschedule(
    id: string,
    params: {
      data_inicio: string
      data_fim: string
      motivo?: string | null
    },
  ): Promise<AgendamentoClinica> {
    const { adminProfileId } = await getAdminContext()

    const agendamentoAnterior = await this.getById(id)
    if (!agendamentoAnterior) {
      throw new Error('Agendamento não encontrado')
    }

    const { data, error } = await supabase
      .from('agendamentos_clinica')
      .update({
        status: 'remarcado',
        data_inicio_anterior: agendamentoAnterior.data_inicio,
        data_fim_anterior: agendamentoAnterior.data_fim,
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
        remarcado_em: new Date().toISOString(),
        remarcado_motivo: params.motivo ?? null,
        origem: agendamentoAnterior.origem ?? 'reagendamento',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        profissional:profissionais_clinica(id, nome, conselho)`
      )
      .single()

    if (error) {
      console.error('Erro ao reagendar agendamento clínico:', error)
      throw new Error(`Erro ao reagendar agendamento clínico: ${error.message}`)
    }

    await AtividadeService.editar(
      'agendamento',
      id,
      agendamentoAnterior,
      data,
      `Agendamento reagendado: ${data.titulo}`
    )

    return data as AgendamentoClinica
  },

  async updateStatus(id: string, status: StatusAgendamentoClinica): Promise<AgendamentoClinica> {
    const agendamentoAnterior = await this.getById(id)
    if (!agendamentoAnterior) {
      throw new Error('Agendamento não encontrado')
    }

    const { data, error } = await supabase
      .from('agendamentos_clinica')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(
        `*,
        paciente:pacientes(id, nome_completo, telefone, whatsapp),
        profissional:profissionais_clinica(id, nome, conselho)`
      )
      .single()

    if (error) {
      console.error('Erro ao atualizar status do agendamento clínico:', error)
      throw new Error(`Erro ao atualizar status do agendamento clínico: ${error.message}`)
    }

    await AtividadeService.editar(
      'agendamento',
      id,
      agendamentoAnterior,
      data,
      `Status do agendamento atualizado: ${data.titulo}`
    )

    return data as AgendamentoClinica
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const agendamento = await this.getById(id)
    if (!agendamento) {
      throw new Error('Agendamento não encontrado')
    }

    const { error } = await supabase
      .from('agendamentos_clinica')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao apagar agendamento clínico:', error)
      throw new Error(`Erro ao apagar agendamento clínico: ${error.message}`)
    }

    await AtividadeService.deletar(
      'agendamento',
      id,
      agendamento,
      `Agendamento removido: ${agendamento.titulo}`
    )
  }
}
