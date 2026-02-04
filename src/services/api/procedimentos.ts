import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type StatusProcedimento = 'ativo' | 'inativo' | 'descontinuado'

export interface ProcedimentoImagem {
  path: string
  name: string
  contentType?: string | null
  size?: number | null
}

export interface Procedimento {
  id: string
  admin_profile_id: string
  categoria_id?: string | null
  nome: string
  codigo?: string | null
  descricao?: string | null
  detalhes?: string | null
  duracao_minutos: number
  intervalo_recuperacao_minutos?: number | null
  ia_config?: Record<string, any> | null
  cuidados_pre?: string | null
  cuidados_pos?: string | null
  contraindicacoes?: string | null
  materiais_padrao?: any[] | null
  anexos_padrao?: any[] | null
  ativo?: boolean | null
  destaque?: boolean | null
  cuidados_durante?: string | null
  cuidados_apos?: string | null
  quebra_objecoes?: string | null
  ia_informa_preco?: boolean
  ia_envia_imagens?: boolean
  imagens?: ProcedimentoImagem[] | null
  duracao_estimada?: string | number | null
  valor_base?: number | null
  valor_promocional?: number | null
  valor_minimo?: string | number | null
  valor_maximo?: string | number | null
  requer_autorizacao?: string | null
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
  codigo?: string | null
  descricao?: string | null
  detalhes?: string | null
  duracao_minutos?: number
  intervalo_recuperacao_minutos?: number | null
  ia_config?: Record<string, any> | null
  cuidados_pre?: string | null
  cuidados_pos?: string | null
  contraindicacoes?: string | null
  materiais_padrao?: any[] | null
  anexos_padrao?: any[] | null
  ativo?: boolean | null
  destaque?: boolean | null
  cuidados_durante?: string | null
  cuidados_apos?: string | null
  quebra_objecoes?: string | null
  ia_informa_preco?: boolean
  ia_envia_imagens?: boolean
  imagens?: ProcedimentoImagem[] | null
  duracao_estimada?: string | number | null
  valor_base?: number | null
  valor_promocional?: number | null
  valor_minimo?: string | number | null
  valor_maximo?: string | number | null
  requer_autorizacao?: string | boolean | null
  observacoes?: string | null
  status?: StatusProcedimento
}

export type ProcedimentoUpdateData = Partial<ProcedimentoCreateData>

const PROCEDIMENTO_IMAGENS_BUCKET = 'procedimento-imagens'

function buildProcedimentoIaConfig(params: {
  current?: Partial<Procedimento> | null
  payload: Partial<ProcedimentoCreateData>
}): Record<string, any> {
  const base = {
    ...(((params.current as any)?.ia_config as any) || {}),
    ...(((params.payload as any)?.ia_config as any) || {}),
  } as Record<string, any>

  const toTextOrNull = (v: any) => {
    if (typeof v === 'string') {
      const t = v.trim()
      return t === '' ? null : t
    }
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return v ? 'sim' : 'nao'
    return v ?? null
  }

  const merged: Record<string, any> = {
    ...base,
    resumo: {
      ...(base.resumo || {}),
      nome: params.payload.nome ?? (params.current as any)?.nome ?? null,
      codigo: params.payload.codigo ?? (params.current as any)?.codigo ?? null,
      descricao: params.payload.descricao ?? (params.current as any)?.descricao ?? null,
      detalhes: (params.payload as any).detalhes ?? (params.current as any)?.detalhes ?? null,
      categoria_id: params.payload.categoria_id ?? (params.current as any)?.categoria_id ?? null,
      status: params.payload.status ?? (params.current as any)?.status ?? null,
      ativo:
        typeof params.payload.ativo === 'boolean' ? params.payload.ativo : (params.current as any)?.ativo ?? null,
      destaque:
        typeof params.payload.destaque === 'boolean' ? params.payload.destaque : (params.current as any)?.destaque ?? null,
      duracao_minutos:
        typeof params.payload.duracao_minutos === 'number'
          ? params.payload.duracao_minutos
          : (params.current as any)?.duracao_minutos ?? null,
      intervalo_recuperacao_minutos:
        typeof params.payload.intervalo_recuperacao_minutos === 'number'
          ? params.payload.intervalo_recuperacao_minutos
          : (params.current as any)?.intervalo_recuperacao_minutos ?? null,
      duracao_estimada: toTextOrNull((params.payload as any).duracao_estimada ?? (params.current as any)?.duracao_estimada),
      requer_autorizacao: toTextOrNull((params.payload as any).requer_autorizacao ?? (params.current as any)?.requer_autorizacao),
      valor_base: params.payload.valor_base ?? (params.current as any)?.valor_base ?? null,
      valor_promocional: params.payload.valor_promocional ?? (params.current as any)?.valor_promocional ?? null,
      valor_minimo: params.payload.valor_minimo ?? (params.current as any)?.valor_minimo ?? null,
      valor_maximo: params.payload.valor_maximo ?? (params.current as any)?.valor_maximo ?? null,
      observacoes: params.payload.observacoes ?? (params.current as any)?.observacoes ?? null,
      cuidados_pre: params.payload.cuidados_pre ?? (params.current as any)?.cuidados_pre ?? null,
      cuidados_pos: params.payload.cuidados_pos ?? (params.current as any)?.cuidados_pos ?? null,
      contraindicacoes: params.payload.contraindicacoes ?? (params.current as any)?.contraindicacoes ?? null,
      cuidados_durante: params.payload.cuidados_durante ?? (params.current as any)?.cuidados_durante ?? null,
      cuidados_apos: params.payload.cuidados_apos ?? (params.current as any)?.cuidados_apos ?? null,
      quebra_objecoes: params.payload.quebra_objecoes ?? (params.current as any)?.quebra_objecoes ?? null,
      ia_informa_preco:
        typeof params.payload.ia_informa_preco === 'boolean'
          ? params.payload.ia_informa_preco
          : (params.current as any)?.ia_informa_preco ?? null,
      ia_envia_imagens:
        typeof params.payload.ia_envia_imagens === 'boolean'
          ? params.payload.ia_envia_imagens
          : (params.current as any)?.ia_envia_imagens ?? null,
      imagens_count: Array.isArray(params.payload.imagens)
        ? params.payload.imagens.length
        : Array.isArray((params.current as any)?.imagens)
          ? (params.current as any)?.imagens.length
          : null,
      materiais_padrao_count: Array.isArray(params.payload.materiais_padrao)
        ? params.payload.materiais_padrao.length
        : Array.isArray((params.current as any)?.materiais_padrao)
          ? (params.current as any)?.materiais_padrao.length
          : null,
      anexos_padrao_count: Array.isArray(params.payload.anexos_padrao)
        ? params.payload.anexos_padrao.length
        : Array.isArray((params.current as any)?.anexos_padrao)
          ? (params.current as any)?.anexos_padrao.length
          : null,
    },
    db_snapshot: {
      ...(base.db_snapshot || {}),
      id: (params.current as any)?.id ?? null,
      admin_profile_id: (params.current as any)?.admin_profile_id ?? null,
      categoria_id: params.payload.categoria_id ?? (params.current as any)?.categoria_id ?? null,
      nome: params.payload.nome ?? (params.current as any)?.nome ?? null,
      codigo: params.payload.codigo ?? (params.current as any)?.codigo ?? null,
      descricao: params.payload.descricao ?? (params.current as any)?.descricao ?? null,
      detalhes: (params.payload as any).detalhes ?? (params.current as any)?.detalhes ?? null,
      status: params.payload.status ?? (params.current as any)?.status ?? null,
      ativo:
        typeof params.payload.ativo === 'boolean' ? params.payload.ativo : (params.current as any)?.ativo ?? null,
      destaque:
        typeof params.payload.destaque === 'boolean' ? params.payload.destaque : (params.current as any)?.destaque ?? null,
      duracao_minutos:
        typeof params.payload.duracao_minutos === 'number'
          ? params.payload.duracao_minutos
          : (params.current as any)?.duracao_minutos ?? null,
      intervalo_recuperacao_minutos:
        typeof params.payload.intervalo_recuperacao_minutos === 'number'
          ? params.payload.intervalo_recuperacao_minutos
          : (params.current as any)?.intervalo_recuperacao_minutos ?? null,
      valor_base: params.payload.valor_base ?? (params.current as any)?.valor_base ?? null,
      valor_promocional: params.payload.valor_promocional ?? (params.current as any)?.valor_promocional ?? null,
      valor_minimo: toTextOrNull(params.payload.valor_minimo ?? (params.current as any)?.valor_minimo),
      valor_maximo: toTextOrNull(params.payload.valor_maximo ?? (params.current as any)?.valor_maximo),
      duracao_estimada: toTextOrNull((params.payload as any).duracao_estimada ?? (params.current as any)?.duracao_estimada),
      requer_autorizacao: toTextOrNull((params.payload as any).requer_autorizacao ?? (params.current as any)?.requer_autorizacao),
      observacoes: params.payload.observacoes ?? (params.current as any)?.observacoes ?? null,
      cuidados_pre: params.payload.cuidados_pre ?? (params.current as any)?.cuidados_pre ?? null,
      cuidados_pos: params.payload.cuidados_pos ?? (params.current as any)?.cuidados_pos ?? null,
      contraindicacoes: params.payload.contraindicacoes ?? (params.current as any)?.contraindicacoes ?? null,
      cuidados_durante: params.payload.cuidados_durante ?? (params.current as any)?.cuidados_durante ?? null,
      cuidados_apos: params.payload.cuidados_apos ?? (params.current as any)?.cuidados_apos ?? null,
      quebra_objecoes: params.payload.quebra_objecoes ?? (params.current as any)?.quebra_objecoes ?? null,
      ia_informa_preco:
        typeof params.payload.ia_informa_preco === 'boolean'
          ? params.payload.ia_informa_preco
          : (params.current as any)?.ia_informa_preco ?? null,
      ia_envia_imagens:
        typeof params.payload.ia_envia_imagens === 'boolean'
          ? params.payload.ia_envia_imagens
          : (params.current as any)?.ia_envia_imagens ?? null,
      materiais_padrao:
        params.payload.materiais_padrao ?? (params.current as any)?.materiais_padrao ?? null,
      anexos_padrao:
        params.payload.anexos_padrao ?? (params.current as any)?.anexos_padrao ?? null,
      imagens:
        params.payload.imagens ?? (params.current as any)?.imagens ?? null,
      created_at: (params.current as any)?.created_at ?? null,
      updated_at: (params.current as any)?.updated_at ?? null,
    },
  }

  return merged
}

function normalizeProcedimentoPayloadForDb(payload: Partial<ProcedimentoCreateData>) {
  const copy: Record<string, any> = { ...payload }

  if (typeof copy.requer_autorizacao === 'boolean') {
    copy.requer_autorizacao = copy.requer_autorizacao ? 'sim' : 'nao'
  }

  // schema: text
  if (typeof copy.duracao_estimada === 'number') {
    copy.duracao_estimada = String(copy.duracao_estimada)
  }
  if (typeof copy.valor_minimo === 'number') {
    copy.valor_minimo = String(copy.valor_minimo)
  }
  if (typeof copy.valor_maximo === 'number') {
    copy.valor_maximo = String(copy.valor_maximo)
  }

  // defaults
  if (typeof copy.duracao_minutos !== 'number') {
    delete copy.duracao_minutos
  }

  return copy
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getFileExt(name: string): string {
  const parts = name.split('.')
  return (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase()
}

function generateRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const procedimentosService = {
  async uploadImagens(procedimentoId: string, files: File[]): Promise<ProcedimentoImagem[]> {
    const { adminProfileId } = await getAdminContext()

    if (!procedimentoId) {
      throw new Error('Procedimento inválido para upload de imagens')
    }

    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const maxSizeBytes = 8 * 1024 * 1024

    const uploaded: ProcedimentoImagem[] = []

    for (const file of files) {
      const ext = getFileExt(file.name)
      if (!ext || !allowedExts.includes(ext)) {
        throw new Error('Tipo de arquivo não suportado. Use JPG, PNG, WebP ou GIF.')
      }
      if (file.size > maxSizeBytes) {
        throw new Error('Arquivo muito grande. Máximo 8MB por imagem.')
      }

      const fileId = generateRandomId()
      const safeName = sanitizeFileName(file.name)
      const objectPath = `${adminProfileId}/${procedimentoId}/${fileId}-${safeName}`

      const { data, error } = await supabase.storage
        .from(PROCEDIMENTO_IMAGENS_BUCKET)
        .upload(objectPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (error) {
        throw new Error(error.message || 'Erro ao fazer upload da imagem')
      }

      uploaded.push({
        path: data.path,
        name: safeName,
        contentType: file.type,
        size: file.size,
      })
    }

    return uploaded
  },

  async deleteImagem(path: string): Promise<void> {
    if (!path) return

    const { error } = await supabase.storage
      .from(PROCEDIMENTO_IMAGENS_BUCKET)
      .remove([path])

    if (error) {
      throw new Error(error.message || 'Erro ao remover imagem')
    }
  },

  async createSignedImagemUrl(path: string, expiresInSeconds = 60 * 60): Promise<string> {
    if (!path) return ''

    const { data, error } = await supabase.storage
      .from(PROCEDIMENTO_IMAGENS_BUCKET)
      .createSignedUrl(path, expiresInSeconds)

    if (error) {
      throw new Error(error.message || 'Erro ao gerar URL da imagem')
    }

    return data.signedUrl
  },

  async createSignedImagemUrls(imagens: ProcedimentoImagem[], expiresInSeconds = 60 * 60): Promise<Record<string, string>> {
    const result: Record<string, string> = {}

    for (const img of imagens) {
      try {
        result[img.path] = await this.createSignedImagemUrl(img.path, expiresInSeconds)
      } catch {
        result[img.path] = ''
      }
    }

    return result
  },

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

    const normalizedPayload = normalizeProcedimentoPayloadForDb(payload)
    const ia_config = buildProcedimentoIaConfig({ current: null, payload: normalizedPayload })

    const { data, error } = await supabase
      .from('procedimentos')
      .insert({
        ...normalizedPayload,
        ia_config,
        admin_profile_id: adminProfileId,
        requer_autorizacao: (normalizedPayload as any).requer_autorizacao ?? null,
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

    const current = await this.getById(id)
    const normalizedPayload = normalizeProcedimentoPayloadForDb(payload)
    const ia_config = buildProcedimentoIaConfig({ current, payload: normalizedPayload })

    const { data, error } = await supabase
      .from('procedimentos')
      .update({
        ...normalizedPayload,
        ia_config,
      })
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
