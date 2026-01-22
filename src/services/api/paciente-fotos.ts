import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type TipoPacienteFoto = 'antes' | 'depois'

export interface PacienteFoto {
  id: string
  admin_profile_id: string
  paciente_id: string
  tipo: TipoPacienteFoto
  titulo?: string | null
  descricao?: string | null
  storage_bucket: string
  storage_path: string
  metadata?: Record<string, any> | null
  criado_por?: string | null
  created_at: string
}

export interface PacienteFotoCreateData {
  paciente_id: string
  tipo: TipoPacienteFoto
  titulo?: string | null
  descricao?: string | null
  storage_bucket: string
  storage_path: string
  metadata?: Record<string, any> | null
}

export const pacienteFotosService = {
  async listByPacienteId(pacienteId: string): Promise<PacienteFoto[]> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('paciente_fotos')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar fotos do paciente:', error)
      throw new Error(`Erro ao buscar fotos do paciente: ${error.message}`)
    }

    return (data as PacienteFoto[]) ?? []
  },

  async create(payload: PacienteFotoCreateData): Promise<PacienteFoto> {
    const { adminProfileId } = await getAdminContext()

    const baseData = {
      admin_profile_id: adminProfileId,
      paciente_id: payload.paciente_id,
      tipo: payload.tipo,
      titulo: payload.titulo ?? null,
      descricao: payload.descricao ?? null,
      storage_bucket: payload.storage_bucket,
      storage_path: payload.storage_path,
      metadata: payload.metadata ?? {},
    }

    const { data, error } = await supabase
      .from('paciente_fotos')
      .insert(baseData)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar foto do paciente:', error)
      throw new Error(`Erro ao criar foto do paciente: ${error.message}`)
    }

    return data as PacienteFoto
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('paciente_fotos')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao deletar foto do paciente:', error)
      throw new Error(`Erro ao deletar foto do paciente: ${error.message}`)
    }
  },
}
