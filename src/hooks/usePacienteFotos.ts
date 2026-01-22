import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import {
  pacienteFotosService,
  type PacienteFoto,
  type PacienteFotoCreateData,
} from '@/services/api/paciente-fotos'

export function usePacienteFotos(pacienteId?: string) {
  const query = useQuery<PacienteFoto[]>({
    queryKey: ['paciente-fotos', pacienteId],
    queryFn: () => pacienteFotosService.listByPacienteId(pacienteId as string),
    enabled: Boolean(pacienteId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const fotos = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: fotos,
  }
}

export function useCreatePacienteFoto() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: PacienteFotoCreateData) => pacienteFotosService.create(payload),
    onSuccess: async (_, payload) => {
      await refreshAfterMutation('paciente_foto', 'create')
      queryClient.invalidateQueries({ queryKey: ['paciente-fotos', payload.paciente_id] })
      toast.success('Foto adicionada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar foto')
      queryClient.invalidateQueries({ queryKey: ['paciente-fotos'] })
    },
  })
}

export function useDeletePacienteFoto() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, pacienteId }: { id: string; pacienteId: string }) => pacienteFotosService.delete(id).then(() => ({ pacienteId })),
    onSuccess: async ({ pacienteId }) => {
      await refreshAfterMutation('paciente_foto', 'delete')
      queryClient.invalidateQueries({ queryKey: ['paciente-fotos', pacienteId] })
      toast.success('Foto removida com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover foto')
      queryClient.invalidateQueries({ queryKey: ['paciente-fotos'] })
    },
  })
}
