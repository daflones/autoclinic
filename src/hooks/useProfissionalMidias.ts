import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import {
  profissionalMidiasService,
  type ProfissionalMidia,
  type ProfissionalMidiaCreateData,
} from '@/services/api/profissional-midias'

export function useProfissionalMidias(profissionalId?: string) {
  const query = useQuery<ProfissionalMidia[]>({
    queryKey: ['profissional-midias', profissionalId],
    queryFn: () => profissionalMidiasService.listByProfissionalId(profissionalId as string),
    enabled: Boolean(profissionalId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const midias = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: midias,
  }
}

export function useCreateProfissionalMidia() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: ProfissionalMidiaCreateData) => profissionalMidiasService.create(payload),
    onSuccess: async (_, payload) => {
      await refreshAfterMutation('profissional_midia', 'create')
      queryClient.invalidateQueries({ queryKey: ['profissional-midias', payload.profissional_id] })
      toast.success('Mídia adicionada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar mídia')
      queryClient.invalidateQueries({ queryKey: ['profissional-midias'] })
    },
  })
}

export function useDeleteProfissionalMidia() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, profissionalId }: { id: string; profissionalId: string }) =>
      profissionalMidiasService.delete(id).then(() => ({ profissionalId })),
    onSuccess: async ({ profissionalId }) => {
      await refreshAfterMutation('profissional_midia', 'delete')
      queryClient.invalidateQueries({ queryKey: ['profissional-midias', profissionalId] })
      toast.success('Mídia removida com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover mídia')
      queryClient.invalidateQueries({ queryKey: ['profissional-midias'] })
    },
  })
}
