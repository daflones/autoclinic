import { supabase } from '@/lib/supabase'
import { AtividadeService } from './atividades'
import { getAdminContext } from './_tenant'

export type SexoPaciente = 'feminino' | 'masculino' | 'outro' | 'nao_informado'
export type StatusPaciente = 'ativo' | 'inativo' | 'arquivado'

export type StatusPacienteDetalhado =
  | 'novos'
  | 'agendado'
  | 'concluido'
  | 'arquivado'
  | 'avaliacao'
  | 'em-andamento'
  | 'retornos'
  | 'pausados'
  | 'inativos'
  | 'concluidos'
  | 'arquivados'

export interface PacienteEndereco {
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  pais?: string
}

export interface Paciente {
  id: string
  admin_profile_id: string
  responsavel_profissional_id?: string | null
  nome_completo: string
  nome_social?: string | null
  documento?: string | null
  cpf?: string | null
  rg?: string | null
  data_nascimento?: string | null
  sexo: SexoPaciente
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  endereco: PacienteEndereco | null
  alergias?: string | null
  restricoes?: string | null
  observacoes?: string | null
  status: StatusPaciente
  status_detalhado?: StatusPacienteDetalhado | null
  tags?: string[] | null
  fonte_captacao?: string | null
  data_primeiro_atendimento?: string | null
  data_ultimo_atendimento?: string | null
  consentimento_assinado: boolean
  consentimento_data?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
}

export interface PacienteFilters {
  responsavel_profissional_id?: string
  status?: StatusPaciente
  search?: string
  tag?: string
  page?: number
  limit?: number
}

export interface PacienteCreateData {
  responsavel_profissional_id?: string | null
  nome_completo: string
  nome_social?: string | null
  documento?: string | null
  cpf?: string | null
  rg?: string | null
  data_nascimento?: string | null
  sexo?: SexoPaciente
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  endereco?: PacienteEndereco | null
  alergias?: string | null
  restricoes?: string | null
  observacoes?: string | null
  status?: StatusPaciente
  status_detalhado?: StatusPacienteDetalhado | null
  tags?: string[] | null
  fonte_captacao?: string | null
  data_primeiro_atendimento?: string | null
  data_ultimo_atendimento?: string | null
  consentimento_assinado?: boolean
  consentimento_data?: string | null
}

export type PacienteUpdateData = Partial<PacienteCreateData>

export const pacientesService = {
  async getAll(filters: PacienteFilters = {}): Promise<{ data: Paciente[]; count: number }> {
    const { adminProfileId } = await getAdminContext()

    const page = filters.page ?? 1
    const limit = filters.limit ?? 50
    const offset = (page - 1) * limit

    let query = supabase
      .from('pacientes')
      .select('*', { count: 'exact' })
      .eq('admin_profile_id', adminProfileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.responsavel_profissional_id) {
      query = query.eq('responsavel_profissional_id', filters.responsavel_profissional_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.tag) {
      query = query.contains('tags', [filters.tag])
    }

    if (filters.search) {
      const searchTerm = filters.search.trim()
      const numericSearch = searchTerm.replace(/\D/g, '')

      query = query.or(
        [
          `nome_completo.ilike.%${searchTerm}%`,
          `nome_social.ilike.%${searchTerm}%`,
          `email.ilike.%${searchTerm}%`,
          `documento.ilike.%${numericSearch}%`,
          `cpf.ilike.%${numericSearch}%`,
          `rg.ilike.%${numericSearch}%`,
          `telefone.ilike.%${numericSearch}%`,
          `whatsapp.ilike.%${numericSearch}%`
        ].join(',')
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erro ao buscar pacientes:', error)
      throw new Error(`Erro ao buscar pacientes: ${error.message}`)
    }

    return {
      data: (data as Paciente[]) || [],
      count: count ?? 0
    }
  },

  async getStatusStats(): Promise<Record<StatusPaciente, number>> {
    const { adminProfileId } = await getAdminContext()
    const statuses: StatusPaciente[] = ['ativo', 'inativo', 'arquivado']
    const stats: Record<StatusPaciente, number> = {
      ativo: 0,
      inativo: 0,
      arquivado: 0
    }

    const responses = await Promise.all(
      statuses.map((status) =>
        supabase
          .from('pacientes')
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

  async getById(id: string): Promise<Paciente | null> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .single()

    if (error) {
      console.error('Erro ao buscar paciente:', error)
      throw new Error(`Erro ao buscar paciente: ${error.message}`)
    }

    return data as Paciente | null
  },

  async create(pacienteData: PacienteCreateData): Promise<Paciente> {
    const { adminProfileId, userId } = await getAdminContext()

    if (!pacienteData.nome_completo) {
      throw new Error('Nome completo é obrigatório')
    }

    const insertData = {
      admin_profile_id: adminProfileId,
      responsavel_profissional_id: pacienteData.responsavel_profissional_id ?? null,
      nome_completo: pacienteData.nome_completo,
      nome_social: pacienteData.nome_social ?? null,
      documento: pacienteData.documento ?? null,
      cpf: pacienteData.cpf ?? null,
      rg: pacienteData.rg ?? null,
      data_nascimento: pacienteData.data_nascimento ?? null,
      sexo: pacienteData.sexo ?? 'nao_informado',
      email: pacienteData.email ?? null,
      telefone: pacienteData.telefone ?? null,
      whatsapp: pacienteData.whatsapp ?? null,
      endereco: pacienteData.endereco ?? null,
      alergias: pacienteData.alergias ?? null,
      restricoes: pacienteData.restricoes ?? null,
      observacoes: pacienteData.observacoes ?? null,
      status: pacienteData.status ?? 'ativo',
      status_detalhado: pacienteData.status_detalhado ?? null,
      tags: pacienteData.tags ?? [],
      fonte_captacao: pacienteData.fonte_captacao ?? null,
      data_primeiro_atendimento: pacienteData.data_primeiro_atendimento ?? null,
      data_ultimo_atendimento: pacienteData.data_ultimo_atendimento ?? null,
      consentimento_assinado: pacienteData.consentimento_assinado ?? false,
      consentimento_data: pacienteData.consentimento_data ?? null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('pacientes')
      .insert(insertData)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar paciente:', error)
      throw new Error(`Erro ao criar paciente: ${error.message}`)
    }

    await AtividadeService.criar(
      'paciente',
      data.id,
      data,
      `Paciente cadastrado: ${data.nome_completo}`
    )

    return data as Paciente
  },

  async update(id: string, updates: PacienteUpdateData): Promise<Paciente> {
    const { adminProfileId } = await getAdminContext()

    const pacienteAnterior = await this.getById(id)
    if (!pacienteAnterior) {
      throw new Error('Paciente não encontrado')
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('pacientes')
      .update(updateData)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao atualizar paciente:', error)
      throw new Error(`Erro ao atualizar paciente: ${error.message}`)
    }

    await AtividadeService.editar(
      'paciente',
      data.id,
      pacienteAnterior,
      data,
      `Paciente atualizado: ${data.nome_completo}`
    )

    return data as Paciente
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const paciente = await this.getById(id)
    if (!paciente) {
      throw new Error('Paciente não encontrado')
    }

    const { error } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao excluir paciente:', error)
      throw new Error(`Erro ao excluir paciente: ${error.message}`)
    }

    await AtividadeService.deletar(
      'paciente',
      id,
      paciente,
      `Paciente removido: ${paciente.nome_completo}`
    )
  }
}
