import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  procedimentosService,
  type Procedimento,
  type ProcedimentoFilters,
  type ProcedimentoCreateData,
  type ProcedimentoUpdateData,
  type StatusProcedimento,
} from '@/services/api/procedimentos'
import { toast } from 'sonner'

export function useProcedimentos(filters: ProcedimentoFilters = {}) {
  const query = useQuery({
    queryKey: ['procedimentos', filters],
    queryFn: () => procedimentosService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const procedimentos = useMemo(() => query.data?.data ?? [], [query.data])

  return {
    ...query,
    data: procedimentos,
    count: query.data?.count ?? 0,
  }
}

export function useProcedimento(id?: string) {
  return useQuery<Procedimento | null>({
    queryKey: ['procedimentos', id],
    queryFn: () => procedimentosService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function useCreateProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProcedimentoCreateData) => procedimentosService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Procedimento criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar procedimento')
    },
  })
}

export function useUpdateProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcedimentoUpdateData }) =>
      procedimentosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Procedimento atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar procedimento')
    },
  })
}

export function useDeleteProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => procedimentosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Procedimento excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir procedimento')
    },
  })
}

export function useUpdateProcedimentoStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProcedimento }) =>
      procedimentosService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Status do procedimento atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status do procedimento')
    },
  })
}
