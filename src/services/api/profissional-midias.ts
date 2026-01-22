import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type TipoProfissionalMidia = 'foto' | 'outro'

export interface ProfissionalMidia {
  id: string
  admin_profile_id: string
  profissional_id: string
  tipo: TipoProfissionalMidia | string
  storage_bucket: string
  storage_path: string
  label?: string | null
  created_at: string
  updated_at: string
}

export interface ProfissionalMidiaCreateData {
  profissional_id: string
  tipo?: TipoProfissionalMidia | string
  storage_bucket: string
  storage_path: string
  label?: string | null
}

export const profissionalMidiasService = {
  async listByProfissionalId(profissionalId: string): Promise<ProfissionalMidia[]> {
    const { adminProfileId } = await getAdminContext()

    const { data, error } = await supabase
      .from('profissional_midias')
      .select('*')
      .eq('admin_profile_id', adminProfileId)
      .eq('profissional_id', profissionalId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar mídias do profissional:', error)
      throw new Error(`Erro ao buscar mídias do profissional: ${error.message}`)
    }

    return (data as ProfissionalMidia[]) ?? []
  },

  async create(payload: ProfissionalMidiaCreateData): Promise<ProfissionalMidia> {
    const { adminProfileId } = await getAdminContext()

    const baseData = {
      admin_profile_id: adminProfileId,
      profissional_id: payload.profissional_id,
      tipo: payload.tipo ?? 'foto',
      storage_bucket: payload.storage_bucket,
      storage_path: payload.storage_path,
      label: payload.label ?? null,
    }

    const { data, error } = await supabase
      .from('profissional_midias')
      .insert(baseData)
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao criar mídia do profissional:', error)
      throw new Error(`Erro ao criar mídia do profissional: ${error.message}`)
    }

    return data as ProfissionalMidia
  },

  async delete(id: string): Promise<void> {
    const { adminProfileId } = await getAdminContext()

    const { error } = await supabase
      .from('profissional_midias')
      .delete()
      .eq('id', id)
      .eq('admin_profile_id', adminProfileId)

    if (error) {
      console.error('Erro ao deletar mídia do profissional:', error)
      throw new Error(`Erro ao deletar mídia do profissional: ${error.message}`)
    }
  },
}
