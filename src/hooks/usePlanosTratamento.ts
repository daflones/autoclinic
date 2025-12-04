import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  planosTratamentoService,
  type PlanoTratamento,
  type PlanoTratamentoFilters,
  type PlanoTratamentoCreateData,
  type PlanoTratamentoUpdateData,
  type StatusPlanoTratamento,
} from '@/services/api/planos-tratamento'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

export function usePlanosTratamento(filters: PlanoTratamentoFilters = {}) {
  const query = useQuery({
    queryKey: ['planos-tratamento', filters],
    queryFn: () => planosTratamentoService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const planos = useMemo(() => query.data?.data ?? [], [query.data])

  return {
    ...query,
    data: planos,
    count: query.data?.count ?? 0,
  }
}

export function usePlanoTratamento(id?: string) {
  return useQuery<PlanoTratamento | null>({
    queryKey: ['planos-tratamento', id],
    queryFn: () => planosTratamentoService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function useCreatePlanoTratamento() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: PlanoTratamentoCreateData) => planosTratamentoService.create(payload),
    onSuccess: async () => {
      await refreshAfterMutation('plano_tratamento', 'create')
      toast.success('Plano de tratamento criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar plano de tratamento')
      queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
    },
  })
}

export function useUpdatePlanoTratamento() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanoTratamentoUpdateData }) =>
      planosTratamentoService.update(id, data),
    onSuccess: async () => {
      await refreshAfterMutation('plano_tratamento', 'update')
      toast.success('Plano de tratamento atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar plano de tratamento')
      queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
    },
  })
}

export function useDeletePlanoTratamento() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (id: string) => planosTratamentoService.delete(id),
    onSuccess: async () => {
      await refreshAfterMutation('plano_tratamento', 'delete')
      toast.success('Plano de tratamento excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir plano de tratamento')
      queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
    },
  })
}

export function useUpdatePlanoTratamentoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPlanoTratamento }) =>
      planosTratamentoService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
      toast.success('Status do plano atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status do plano de tratamento')
      queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
    },
  })
}
