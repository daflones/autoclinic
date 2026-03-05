import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIAConfig, upsertIAConfig, testIAConfig, type IAConfig } from '@/services/api/ia-config'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/lib/toast'

// Hook para buscar configurações de IA
export const useIAConfig = () => {
  const { user } = useAuthStore()

  return useQuery<IAConfig | null>({
    queryKey: ['ia-config', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await getIAConfig(user.id)
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false // Não tentar novamente em caso de 404
  })
}

// Hook para atualizar configurações de IA
export const useUpdateIAConfig = () => {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config: Partial<IAConfig>) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }
      return upsertIAConfig(user.id, config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia-config'] })
      toast.success('Configurações de IA atualizadas com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar configurações de IA:', error)
      toast.error('Erro ao atualizar configurações de IA')
    }
  })
}

// Hook para testar configurações de IA
export const useTestIAConfig = () => {
  return useMutation({
    mutationFn: (config: Partial<IAConfig>) => testIAConfig(config),
    onSuccess: (response: any) => {
      toast.success(response.message || 'Teste realizado com sucesso!')
    },
    onError: (error: any) => {
      console.error('Erro ao testar configurações de IA:', error)
      toast.error('Erro ao testar configurações de IA')
    }
  })
}
