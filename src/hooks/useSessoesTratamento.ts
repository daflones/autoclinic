import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  sessoesTratamentoService,
  type SessaoTratamento,
  type SessaoTratamentoFilters,
  type SessaoTratamentoCreateData,
  type SessaoTratamentoUpdateData,
} from '@/services/api/sessoes-tratamento'

export function useSessoesTratamento(filters: SessaoTratamentoFilters = {}) {
  const query = useQuery<SessaoTratamento[]>({
    queryKey: ['sessoes-tratamento', filters],
    queryFn: () => sessoesTratamentoService.list(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: Boolean(filters.paciente_id || filters.plano_tratamento_id),
  })

  const sessoes = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: sessoes,
  }
}

export function useCreateSessoesTratamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payloads: SessaoTratamentoCreateData[]) => sessoesTratamentoService.createMany(payloads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes-tratamento'] })
    },
  })
}

export function useDeleteSessaoTratamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sessoesTratamentoService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes-tratamento'] })
    },
  })
}

export function useUpdateSessaoTratamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SessaoTratamentoUpdateData }) =>
      sessoesTratamentoService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessoes-tratamento'] })
    },
  })
}
