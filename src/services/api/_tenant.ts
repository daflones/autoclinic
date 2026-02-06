import { supabase } from '@/lib/supabase'

type AppRole = 'clinica' | 'admin' | 'profissional' | 'recepcao' | 'gestor'

interface AdminContext {
  userId: string
  adminProfileId: string
  role: AppRole
  profissionalClinicaId: string | null
}

export async function getAdminContext(): Promise<AdminContext> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, role, admin_profile_id')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar perfil: ${error.message}`)
  }

  if (!profile) {
    throw new Error('Perfil não encontrado')
  }

  const adminProfileId = profile.admin_profile_id || profile.id
  const role = (profile.role || 'profissional') as AppRole

  let profissionalClinicaId: string | null = null
  if (role === 'profissional' || role === 'recepcao' || role === 'gestor') {
    // profile_id em profissionais_clinica = ID da clínica, não do usuário
    // Buscar pelo email do usuário dentro da clínica
    const { data: prof } = await supabase
      .from('profissionais_clinica')
      .select('id')
      .eq('admin_profile_id', adminProfileId)
      .eq('email', profile.email)
      .maybeSingle()
    profissionalClinicaId = prof?.id || null
  }

  return {
    userId: user.id,
    adminProfileId,
    role,
    profissionalClinicaId,
  }
}
