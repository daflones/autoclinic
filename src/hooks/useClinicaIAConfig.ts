import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getClinicaIAConfig,
  updateClinicaIAConfig,
  type ClinicaIAConfig,
  type ClinicaIAConfigUpdate,
} from '@/services/api/clinica-ia-config'
import { useAuthStore } from '@/stores/authStore'

export const useClinicaIAConfig = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['clinica-ia-config', user?.id],
    queryFn: () => getClinicaIAConfig(),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export const useUpdateClinicaIAConfig = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: ClinicaIAConfigUpdate) => {
      if (!user?.id) throw new Error('Usuário não autenticado')
      return updateClinicaIAConfig(patch)
    },
    onSuccess: (data: ClinicaIAConfig) => {
      queryClient.setQueryData(['clinica-ia-config', user?.id], data)
      toast.success('Configurações de IA atualizadas!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar configurações de IA:', error)
      toast.error('Erro ao atualizar configurações de IA')
    },
  })
}
