import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusProfissional = 'ativo' | 'inativo' | 'ferias' | 'afastado' | 'desligado'

export interface ProfissionalClinica {
  id: string
  admin_profile_id: string
  profile_id?: string | null
  nome: string
  cargo?: string | null
  documento?: string | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  experiencia?: string | null
  certificacoes?: string | null
  procedimentos?: string | null
  procedimentos_ids?: string[]
  foto_url?: string | null
  especialidades?: string[] | null
  conselho?: string | null
  registro_profissional?: string | null
  percentual_comissao?: number | null
  meta_mensal?: number | null
  horario_atendimento?: Record<string, unknown> | null
  horarios_disponiveis?: Record<string, any> | null
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
  cargo?: string | null
  senha?: string | null
  documento?: string | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  experiencia?: string | null
  certificacoes?: string | null
  procedimentos?: string | null
  procedimentos_ids?: string[]
  bio?: string | null
  foto_url?: string | null
  especialidades?: string[] | null
  conselho?: string | null
  registro_profissional?: string | null
  percentual_comissao?: number | null
  meta_mensal?: number | null
  horario_atendimento?: Record<string, unknown> | null
  horarios_disponiveis?: Record<string, any> | null
  status?: StatusProfissional
}

function getWhatsAppServerBaseUrl() {
  const raw = String((import.meta as any)?.env?.VITE_WHATSAPP_SERVER_URL ?? '').trim()
  return raw ? raw.replace(/\/+$/, '') : ''
}

async function backendCreateUser(payload: {
  email: string
  password: string
  fullName: string
  role: string
}): Promise<{ userId: string; clinicAdminId: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sess\u00e3o n\u00e3o encontrada')

  const baseUrl = getWhatsAppServerBaseUrl()
  const res = await fetch(`${baseUrl}/api/admin/createUser`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const body = await res.json()
  if (!res.ok) throw new Error(body?.error || 'Erro ao criar usu\u00e1rio')
  return body
}

export type ProfissionalUpdateData = Partial<ProfissionalCreateData>

async function loadProcedimentosIdsByProfissionalIds(params: {
  adminProfileId: string
  profissionalIds: string[]
}): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('profissionais_clinica_procedimentos')
    .select('profissional_id, procedimento_id')
    .eq('admin_profile_id', params.adminProfileId)
    .in('profissional_id', params.profissionalIds)

  if (error) {
    throw new Error(error.message || 'Erro ao carregar procedimentos do profissional')
  }

  const map: Record<string, string[]> = {}
  for (const row of (data || []) as any[]) {
    const pid = String(row.profissional_id)
    const procId = String(row.procedimento_id)
    if (!map[pid]) map[pid] = []
    map[pid].push(procId)
  }
  return map
}

async function replaceProcedimentosForProfissional(params: {
  adminProfileId: string
  profissionalId: string
  procedimentoIds: string[]
}): Promise<void> {
  const { error: delError } = await supabase
    .from('profissionais_clinica_procedimentos')
    .delete()
    .eq('admin_profile_id', params.adminProfileId)
    .eq('profissional_id', params.profissionalId)

  if (delError) {
    throw new Error(delError.message || 'Erro ao atualizar procedimentos do profissional')
  }

  const uniqueIds = Array.from(new Set((params.procedimentoIds || []).filter(Boolean)))
  if (uniqueIds.length === 0) return

  const rows = uniqueIds.map((procedimento_id) => ({
    admin_profile_id: params.adminProfileId,
    profissional_id: params.profissionalId,
    procedimento_id,
  }))

  const { error: insError } = await supabase
    .from('profissionais_clinica_procedimentos')
    .insert(rows)

  if (insError) {
    throw new Error(insError.message || 'Erro ao salvar procedimentos do profissional')
  }
}

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

    const profissionais = (data as ProfissionalClinica[]) ?? []
    if (profissionais.length === 0) return []

    const map = await loadProcedimentosIdsByProfissionalIds({
      adminProfileId,
      profissionalIds: profissionais.map((p) => p.id),
    })

    return profissionais.map((p) => ({
      ...p,
      procedimentos_ids: map[p.id] ?? [],
    }))
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

    const profissional = data as ProfissionalClinica | null
    if (!profissional) return null

    const map = await loadProcedimentosIdsByProfissionalIds({
      adminProfileId,
      profissionalIds: [profissional.id],
    })

    return {
      ...profissional,
      procedimentos_ids: map[profissional.id] ?? [],
    }
  },

  async create(payload: ProfissionalCreateData): Promise<ProfissionalClinica> {
    const { adminProfileId } = await getAdminContext()

    const { procedimentos_ids, senha, ...rest } = payload as ProfissionalCreateData & { senha?: string }

    // Se tem email e senha, criar conta de usuário (auth + profiles)
    if (rest.email && senha) {
      await backendCreateUser({
        email: rest.email,
        password: senha,
        fullName: rest.nome,
        role: rest.cargo || 'profissional',
      })
    }

    // profile_id = ID da clínica que cadastrou o profissional
    const insertData = { ...rest, senha: undefined } as any
    delete insertData.senha
    insertData.admin_profile_id = adminProfileId
    insertData.profile_id = adminProfileId
    insertData.status = payload.status ?? 'ativo'

    const { data, error } = await supabase
      .from('profissionais_clinica')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar profissional:', error)
      throw new Error(error.message || 'Erro ao criar profissional')
    }

    if (Array.isArray(procedimentos_ids)) {
      await replaceProcedimentosForProfissional({
        adminProfileId,
        profissionalId: data.id,
        procedimentoIds: procedimentos_ids,
      })
    }

    return {
      ...(data as ProfissionalClinica),
      procedimentos_ids: Array.isArray(procedimentos_ids) ? procedimentos_ids : [],
    }
  },

  async update(id: string, payload: ProfissionalUpdateData): Promise<ProfissionalClinica> {
    const { adminProfileId } = await getAdminContext()

    const { procedimentos_ids, ...rest } = payload as ProfissionalUpdateData & {
      procedimentos_ids?: string[]
    }

    const { data, error } = await supabase
      .from('profissionais_clinica')
      .update(rest)
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar profissional:', error)
      throw new Error(error.message || 'Erro ao atualizar profissional')
    }

    if (Array.isArray(procedimentos_ids)) {
      await replaceProcedimentosForProfissional({
        adminProfileId,
        profissionalId: data.id,
        procedimentoIds: procedimentos_ids,
      })
    }

    const map = await loadProcedimentosIdsByProfissionalIds({
      adminProfileId,
      profissionalIds: [data.id],
    })

    return {
      ...(data as ProfissionalClinica),
      procedimentos_ids: map[data.id] ?? [],
    }
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
