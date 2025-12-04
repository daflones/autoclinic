import { supabase } from '@/lib/supabase'

interface AdminContext {
  userId: string
  adminProfileId: string
}

export async function getAdminContext(): Promise<AdminContext> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, admin_profile_id')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(`Erro ao buscar perfil: ${error.message}`)
  }

  if (!profile) {
    throw new Error('Perfil não encontrado')
  }

  const adminProfileId = profile.admin_profile_id || profile.id

  return {
    userId: user.id,
    adminProfileId,
  }
}
