import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export interface ClinicaIAConfig {
  id: string
  admin_profile_id: string
  identidade: Record<string, any>
  posicionamento: Record<string, any>
  profissionais: any[]
  politicas: Record<string, any>
  prova_social: Record<string, any>
  midias: Record<string, any>
  regras_internas: Record<string, any>
  gatilhos_diferenciais: Record<string, any>
  extra: Record<string, any>
  created_at: string
  updated_at: string
}

function defaultClinicaIAConfig(adminProfileId: string): Partial<ClinicaIAConfig> {
  return {
    admin_profile_id: adminProfileId,
    identidade: {},
    posicionamento: {},
    profissionais: [],
    politicas: {},
    prova_social: {},
    midias: {},
    regras_internas: {},
    gatilhos_diferenciais: {},
    extra: {},
  }
}

export async function getClinicaIAConfig(): Promise<ClinicaIAConfig> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('clinica_ia_config')
    .select('*')
    .eq('admin_profile_id', adminProfileId)
    .single()

  if (error) {
    throw new Error(error.message || 'Erro ao buscar configurações de IA da clínica')
  }

  if (!data) {
    // Com seed automática no banco, isso não deveria acontecer.
    // Mesmo assim, manter fallback defensivo.
    const fallback = defaultClinicaIAConfig(adminProfileId)

    const { data: created, error: createError } = await supabase
      .from('clinica_ia_config')
      .insert(fallback)
      .select('*')
      .single()

    if (createError || !created) {
      throw new Error(createError?.message || 'Erro ao criar configurações de IA da clínica')
    }

    return created as ClinicaIAConfig
  }

  return data as ClinicaIAConfig
}

export type ClinicaIAConfigUpdate = Partial<Pick<ClinicaIAConfig,
  | 'identidade'
  | 'posicionamento'
  | 'profissionais'
  | 'politicas'
  | 'prova_social'
  | 'midias'
  | 'regras_internas'
  | 'gatilhos_diferenciais'
  | 'extra'
>>

export async function updateClinicaIAConfig(patch: ClinicaIAConfigUpdate): Promise<ClinicaIAConfig> {
  const { adminProfileId } = await getAdminContext()

  const { data, error } = await supabase
    .from('clinica_ia_config')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('admin_profile_id', adminProfileId)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Erro ao salvar configurações de IA da clínica')
  }

  return data as ClinicaIAConfig
}
