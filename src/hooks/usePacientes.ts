import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pacientesService, type Paciente, type PacienteFilters, type PacienteCreateData, type PacienteUpdateData } from '@/services/api/pacientes'
import { toast } from '@/lib/toast'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

export function usePacientes(filters: PacienteFilters = {}) {
  const query = useQuery({
    queryKey: ['pacientes', filters],
    queryFn: () => pacientesService.getAll(filters),
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })

  const pacientes = useMemo(() => query.data?.data ?? [], [query.data])

  return {
    ...query,
    data: pacientes,
    count: query.data?.count ?? 0,
  }
}

export function usePaciente(id?: string) {
  return useQuery<Paciente | null>({
    queryKey: ['pacientes', id],
    queryFn: () => pacientesService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function usePacientesStatusStats() {
  return useQuery({
    queryKey: ['pacientes-status-stats'],
    queryFn: () => pacientesService.getStatusStats(),
    staleTime: 0,
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  })
}

export function useCreatePaciente() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: PacienteCreateData) => pacientesService.create(payload),
    onSuccess: async (paciente) => {
      await refreshAfterMutation('paciente', 'create')
      toast.success(`Paciente "${paciente?.nome_completo || 'cadastrado'}" cadastrado!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao cadastrar paciente')
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    },
  })
}

export function useUpdatePaciente() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PacienteUpdateData }) => pacientesService.update(id, data),
    onSuccess: async (paciente) => {
      await refreshAfterMutation('paciente', 'update')
      toast.success(`Paciente "${paciente?.nome_completo || 'atualizado'}" atualizado!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar paciente')
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    },
  })
}

export function useDeletePaciente() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (id: string) => pacientesService.delete(id),
    onSuccess: async () => {
      await refreshAfterMutation('paciente', 'delete')
      toast.success('Paciente removido com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover paciente')
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    },
  })
}
