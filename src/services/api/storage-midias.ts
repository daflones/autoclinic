import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

type MidiaBucket = 'clinica-midias' | 'pacientes-midias' | 'profissionais-midias' | 'pacotes-midias' | 'procedimento-imagens'

export interface UploadedMidia {
  bucket: MidiaBucket
  path: string
}

function sanitizeFilename(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function uploadMidia(params: {
  bucket: MidiaBucket
  file: File
  prefix?: string
  pathOverride?: string
}): Promise<UploadedMidia> {
  const { adminProfileId } = await getAdminContext()

  if (params.pathOverride) {
    const { error } = await supabase.storage.from(params.bucket).upload(params.pathOverride, params.file, {
      upsert: false,
      contentType: params.file.type || undefined,
    })

    if (error) {
      throw new Error(error.message || 'Erro ao fazer upload')
    }

    return { bucket: params.bucket, path: params.pathOverride }
  }

  const safeName = sanitizeFilename(params.file.name || 'arquivo')
  const ext = safeName.includes('.') ? safeName.split('.').pop() : ''
  const base = ext ? safeName.slice(0, -(ext.length + 1)) : safeName
  const filename = `${base}-${Date.now()}${ext ? `.${ext}` : ''}`

  const prefix = params.prefix ? `${params.prefix}/` : ''
  const path = `${adminProfileId}/${prefix}${filename}`

  const { error } = await supabase.storage.from(params.bucket).upload(path, params.file, {
    upsert: false,
    contentType: params.file.type || undefined,
  })

  if (error) {
    throw new Error(error.message || 'Erro ao fazer upload')
  }

  return { bucket: params.bucket, path }
}

export async function deleteMidia(params: { bucket: MidiaBucket; path: string }) {
  const { error } = await supabase.storage.from(params.bucket).remove([params.path])
  if (error) {
    throw new Error(error.message || 'Erro ao remover mídia')
  }
}

export async function getSignedMidiaUrl(params: {
  bucket: MidiaBucket
  path: string
  expiresIn?: number
}) {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, params.expiresIn ?? 60 * 60)

  if (error) {
    throw new Error(error.message || 'Erro ao gerar URL assinada')
  }

  return data.signedUrl
}
