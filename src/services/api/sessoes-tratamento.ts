import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusSessaoTratamento =
  | 'planejada'
  | 'agendada'
  | 'realizada'
  | 'cancelada'
  | 'nao_compareceu'

export interface SessaoTratamento {
  id: string
  admin_profile_id: string
  plano_tratamento_id?: string | null
  agendamento_id?: string | null
  paciente_id: string
  profissional_id?: string | null
  procedimento_id?: string | null
  status: StatusSessaoTratamento
  inicio_previsto?: string | null
  termino_previsto?: string | null
  inicio_real?: string | null
  termino_real?: string | null
  duracao_minutos?: number | null
  observacoes?: string | null
  created_at: string
  updated_at: string
}

export interface SessaoTratamentoFilters {
  paciente_id?: string
  plano_tratamento_id?: string
  status?: StatusSessaoTratamento
  data_inicio?: string
  data_fim?: string
}

export const sessoesTratamentoService = {
  async list(filters: SessaoTratamentoFilters = {}): Promise<SessaoTratamento[]> {
    const { adminProfileId } = await getAdminContext()

    let query = supabase
      .from('sessoes_tratamento')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .order('inicio_previsto', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (filters.paciente_id) query = query.eq('paciente_id', filters.paciente_id)
    if (filters.plano_tratamento_id) query = query.eq('plano_tratamento_id', filters.plano_tratamento_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.data_inicio) query = query.gte('inicio_previsto', filters.data_inicio)
    if (filters.data_fim) query = query.lte('inicio_previsto', filters.data_fim)

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar sessões de tratamento:', error)
      throw new Error(`Erro ao buscar sessões de tratamento: ${error.message}`)
    }

    return (data as SessaoTratamento[]) ?? []
  },
}
