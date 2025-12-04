import { supabase } from '@/lib/supabase'
// import { supabaseAdmin } from '@/lib/supabase-admin'
// import { AtividadeService } from './atividades'

export interface SetorResponsavel {
  id: string
  nome: string
  email?: string
  telefone?: string
  whatsapp?: string
  cargo?: string
}

export interface Setor {
  id: string
  nome: string
  descricao?: string
  email?: string
  telefone?: string
  whatsapp?: string
  responsavel?: string
  responsaveis: SetorResponsavel[]
  horario_funcionamento?: {
    [key: string]: {
      ativo: boolean
      periodos: Array<{
        inicio: string
        fim: string
      }>
    }
  }
  cor_identificacao?: string
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
  ativo: boolean
  notificacoes_ativas: boolean
  // Novos campos para IA
  instrucoes_ia?: string
  contexto_uso?: string
  palavras_chave?: string[]
  metadados: Record<string, any>
  is_sistema: boolean
  profile: string // Campo para filtro por empresa
  created_at: string
  updated_at: string
}

export interface SetorCreateData {
  nome: string
  descricao?: string
  email?: string
  telefone?: string
  whatsapp?: string
  responsavel?: string
  responsaveis?: SetorResponsavel[]
  horario_funcionamento?: {
    [key: string]: {
      ativo: boolean
      periodos: Array<{
        inicio: string
        fim: string
      }>
    }
  }
  cor_identificacao?: string
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
  ativo?: boolean
  notificacoes_ativas?: boolean
  // Novos campos para IA
  instrucoes_ia?: string
  contexto_uso?: string
  palavras_chave?: string[]
  metadados?: Record<string, any>
  is_sistema?: boolean
}

export interface SetorUpdateData extends Partial<SetorCreateData> {
  responsaveis?: SetorResponsavel[]
}

const DEFAULT_SETORES = [
  {
    nome: 'RH',
    descricao: 'Departamento responsável por recursos humanos e gestão de pessoas',
    cor_identificacao: '#8b5cf6',
    prioridade: 'media' as const,
  },
  {
    nome: 'Financeiro',
    descricao: 'Gestão financeira, cobranças e faturamento',
    cor_identificacao: '#22c55e',
    prioridade: 'alta' as const,
  },
  {
    nome: 'Compras',
    descricao: 'Equipe responsável por compras e fornecedores',
    cor_identificacao: '#3b82f6',
    prioridade: 'media' as const,
  },
  {
    nome: 'Suporte',
    descricao: 'Suporte e auxílio ao cliente pós-venda',
    cor_identificacao: '#6366f1',
    prioridade: 'alta' as const,
  },
]

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const sanitizeResponsaveis = (responsaveis?: SetorResponsavel[]): SetorResponsavel[] => {
  if (!Array.isArray(responsaveis)) {
    return []
  }

  return responsaveis
    .map((responsavel: SetorResponsavel | null | undefined) => {
      if (!responsavel?.nome?.trim()) {
        return null
      }

      return {
        id: responsavel.id || generateId(),
        nome: responsavel.nome.trim(),
        email: responsavel.email?.trim() || undefined,
        telefone: responsavel.telefone?.trim() || undefined,
        whatsapp: responsavel.whatsapp?.trim() || undefined,
        cargo: responsavel.cargo?.trim() || undefined,
      }
    })
    .filter(Boolean) as SetorResponsavel[]
}

const ensureDefaultSetores = async (profileId: string) => {
  try {
    const { data: existing, error } = await supabase
      .from('setores_atendimento')
      .select('id, nome')
      .eq('profile', profileId)
      .eq('is_sistema', true)

    if (error) throw error

    // Remover legados de setores que não são mais nativos
    const legacyNames = ['Atendimento', 'Comercial']
    for (const legacyName of legacyNames) {
      if (existing?.some((setor: { nome?: string | null }) => setor.nome?.toLowerCase() === legacyName.toLowerCase())) {
        await supabase
          .from('setores_atendimento')
          .delete()
          .eq('profile', profileId)
          .eq('is_sistema', true)
          .eq('nome', legacyName)
      }
    }

    const existingNames = new Set(
      (existing || []).map((setor: { nome?: string | null }) => setor.nome?.toLowerCase()).filter(Boolean)
    )

    const setoresToInsert = DEFAULT_SETORES
      .filter((defaultSetor) => !existingNames.has(defaultSetor.nome.toLowerCase()))
      .map((defaultSetor) => ({
        profile: profileId,
        nome: defaultSetor.nome,
        descricao: defaultSetor.descricao,
        responsavel: null,
        responsaveis: [],
        cor_identificacao: defaultSetor.cor_identificacao,
        prioridade: defaultSetor.prioridade,
        ativo: true,
        notificacoes_ativas: true,
        is_sistema: true,
        metadados: { origem: 'default' },
      }))

    if (setoresToInsert.length === 0) {
      return
    }

    const { error: insertError } = await supabase
      .from('setores_atendimento')
      .insert(setoresToInsert)

    if (insertError) {
      console.warn('Erro ao inserir setores padrão:', insertError)
    }
  } catch (error) {
    console.warn('Erro ao garantir setores padrão:', error)
  }
}

const normalizeSetor = (raw: any): Setor => {
  const responsaveis = sanitizeResponsaveis(raw?.responsaveis)
  const firstResponsavel = responsaveis[0]?.nome

  return {
    ...raw,
    responsaveis,
    responsavel: raw?.responsavel ?? firstResponsavel,
    metadados: raw?.metadados ?? {},
    is_sistema: Boolean(raw?.is_sistema),
  }
}

export class SetorService {
  static async getAll(): Promise<Setor[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      await ensureDefaultSetores(user.id)

      const { data, error } = await supabase
        .from('setores_atendimento')
        .select('*')
        .eq('profile', user.id)
        .order('is_sistema', { ascending: false })
        .order('nome', { ascending: true })

      if (error) throw error
      return (data || []).map(normalizeSetor)
    } catch (error) {
      console.error('Erro ao buscar setores:', error)
      throw error
    }
  }

  static async getById(id: string): Promise<Setor | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('setores_atendimento')
        .select('*')
        .eq('id', id)
        .eq('profile', user.id)
        .single()

      if (error) throw error
      return data ? normalizeSetor(data) : null
    } catch (error) {
      console.error('Erro ao buscar setor:', error)
      throw error
    }
  }

  static async create(setorData: SetorCreateData): Promise<Setor> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const sanitizedResponsaveis = sanitizeResponsaveis(setorData.responsaveis)

      const dataToInsert = {
        nome: setorData.nome.trim(),
        descricao: setorData.descricao?.trim() || null,
        email: setorData.email?.trim() || null,
        telefone: setorData.telefone?.trim() || null,
        whatsapp: setorData.whatsapp?.trim() || null,
        responsavel: sanitizedResponsaveis[0]?.nome || setorData.responsavel?.trim() || null,
        responsaveis: sanitizedResponsaveis,
        horario_funcionamento: setorData.horario_funcionamento ?? null,
        cor_identificacao: setorData.cor_identificacao || '#6366f1',
        prioridade: setorData.prioridade || 'media',
        ativo: setorData.ativo ?? true,
        notificacoes_ativas: setorData.notificacoes_ativas ?? true,
        instrucoes_ia: setorData.instrucoes_ia?.trim() || null,
        contexto_uso: setorData.contexto_uso?.trim() || null,
        palavras_chave: setorData.palavras_chave?.filter(Boolean) ?? null,
        metadados: setorData.metadados ?? {},
        is_sistema: setorData.is_sistema ?? false,
        profile: user.id,
      }

      const { data, error } = await supabase
        .from('setores_atendimento')
        .insert([dataToInsert])
        .select()
        .single()

      if (error) throw error

      // Registrar atividade
      // TODO: Implementar AtividadeService.registrarAtividade
      // try {
      //   await AtividadeService.registrarAtividade({
      //     tipo: 'setor_criado',
      //     descricao: `Setor "${setorData.nome}" foi criado`,
      //     detalhes: {
      //       setor_id: data.id,
      //       setor_nome: setorData.nome
      //     }
      //   })
      // } catch (error) {
      //   console.error('Erro ao registrar atividade:', error)
      // }
      return data ? normalizeSetor(data) : data
    } catch (error) {
      console.error('Erro ao criar setor:', error)
      throw error
    }
  }

  static async update(id: string, setorData: SetorUpdateData): Promise<Setor> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const existing = await this.getById(id)
      if (!existing) {
        throw new Error('Setor não encontrado')
      }

      const sanitizedResponsaveis =
        setorData.responsaveis !== undefined
          ? sanitizeResponsaveis(setorData.responsaveis)
          : existing.responsaveis

      const payload: Record<string, any> = {
        nome: setorData.nome?.trim() ?? existing.nome,
        descricao: setorData.descricao?.trim() ?? existing.descricao ?? null,
        email: setorData.email?.trim() ?? existing.email ?? null,
        telefone: setorData.telefone?.trim() ?? existing.telefone ?? null,
        whatsapp: setorData.whatsapp?.trim() ?? existing.whatsapp ?? null,
        responsavel:
          (sanitizedResponsaveis[0]?.nome || setorData.responsavel?.trim() || existing.responsavel || null),
        responsaveis: sanitizedResponsaveis,
        horario_funcionamento: setorData.horario_funcionamento ?? existing.horario_funcionamento ?? null,
        cor_identificacao: setorData.cor_identificacao || existing.cor_identificacao || '#6366f1',
        prioridade: setorData.prioridade || existing.prioridade || 'media',
        ativo: setorData.ativo ?? existing.ativo,
        notificacoes_ativas: setorData.notificacoes_ativas ?? existing.notificacoes_ativas,
        instrucoes_ia: setorData.instrucoes_ia?.trim() ?? existing.instrucoes_ia ?? null,
        contexto_uso: setorData.contexto_uso?.trim() ?? existing.contexto_uso ?? null,
        palavras_chave: setorData.palavras_chave ?? existing.palavras_chave ?? null,
        metadados: setorData.metadados ?? existing.metadados ?? {},
        updated_at: new Date().toISOString(),
      }

      // Nunca permitir que setores nativos sejam convertidos para não-nativos
      if (existing.is_sistema) {
        payload.is_sistema = true
      } else if (setorData.is_sistema !== undefined) {
        payload.is_sistema = setorData.is_sistema
      }

      const { data, error } = await supabase
        .from('setores_atendimento')
        .update(payload)
        .eq('id', id)
        .eq('profile', user.id)
        .select()
        .single()

      if (error) throw error

      // Registrar atividade
      // TODO: Implementar AtividadeService.registrarAtividade
      // try {
      //   await AtividadeService.registrarAtividade({
      //     tipo: 'setor_atualizado',
      //     descricao: `Setor "${data.nome}" foi atualizado`,
      //     detalhes: {
      //       setor_id: id,
      //       setor_nome: data.nome,
      //       alteracoes: setorData
      //     }
      //   })
      // } catch (atividadeError) {
      //   console.warn('Erro ao registrar atividade:', atividadeError)
      // }
      return data ? normalizeSetor(data) : data
    } catch (error) {
      console.error('Erro ao atualizar setor:', error)
      throw error
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const setor = await this.getById(id)
      if (!setor) {
        throw new Error('Setor não encontrado')
      }

      if (setor.is_sistema) {
        throw new Error('Setores nativos do sistema não podem ser excluídos')
      }

      const { error } = await supabase
        .from('setores_atendimento')
        .delete()
        .eq('id', id)
        .eq('profile', user.id)

      if (error) throw error

      // Registrar atividade
      // TODO: Implementar AtividadeService.registrarAtividade
      // if (setor) {
      //   try {
      //     await AtividadeService.registrarAtividade({
      //       tipo: 'setor_excluido',
      //       descricao: `Setor "${setor.nome}" foi excluído`,
      //       detalhes: {
      //         setor_id: id,
      //         setor_nome: setor.nome
      //       }
      //     })
      //   } catch (error) {
      //     console.error('Erro ao registrar atividade:', error)
      //   }
      // }
    } catch (error) {
      console.error('Erro ao excluir setor:', error)
      throw error
    }
  }

  static async toggleStatus(id: string): Promise<Setor> {
    try {
      const setor = await this.getById(id)
      if (!setor) throw new Error('Setor não encontrado')

      return await this.update(id, { ativo: !setor.ativo })
    } catch (error) {
      console.error('Erro ao alterar status do setor:', error)
      throw error
    }
  }

  static async getSetoresAtivos(): Promise<Setor[]> {
    try {
      const setores = await SetorService.getAll()
      return setores.filter(setor => setor.ativo)
    } catch (error) {
      console.error('Erro ao buscar setores ativos:', error)
      throw error
    }
  }
}
