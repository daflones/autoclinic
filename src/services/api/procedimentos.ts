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
  descricao?: string | null
  detalhes?: string | null
  ia_config?: Record<string, any> | null
  cuidados_durante?: string | null
  cuidados_apos?: string | null
  quebra_objecoes?: string | null
  ia_informa_preco?: boolean
  ia_envia_imagens?: boolean
  imagens?: ProcedimentoImagem[] | null
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
  detalhes?: string | null
  ia_config?: Record<string, any> | null
  cuidados_durante?: string | null
  cuidados_apos?: string | null
  quebra_objecoes?: string | null
  ia_informa_preco?: boolean
  ia_envia_imagens?: boolean
  imagens?: ProcedimentoImagem[] | null
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

const PROCEDIMENTO_IMAGENS_BUCKET = 'procedimento-imagens'

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
