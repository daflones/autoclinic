import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'
import {
  protocoloPacoteMidiasService,
  type ProtocoloPacoteMidia,
  type ProtocoloPacoteMidiaCreateData,
} from '@/services/api/protocolo-pacote-midias'

export function useProtocoloPacoteMidias(protocoloPacoteId?: string) {
  const query = useQuery<ProtocoloPacoteMidia[]>({
    queryKey: ['protocolo-pacote-midias', protocoloPacoteId],
    queryFn: () => protocoloPacoteMidiasService.listByProtocoloPacoteId(protocoloPacoteId as string),
    enabled: Boolean(protocoloPacoteId),
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

export function useCreateProtocoloPacoteMidia() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: ProtocoloPacoteMidiaCreateData) => protocoloPacoteMidiasService.create(payload),
    onSuccess: async (_, payload) => {
      await refreshAfterMutation('protocolo_pacote_midia', 'create')
      queryClient.invalidateQueries({ queryKey: ['protocolo-pacote-midias', payload.protocolo_pacote_id] })
      toast.success('Mídia adicionada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar mídia')
      queryClient.invalidateQueries({ queryKey: ['protocolo-pacote-midias'] })
    },
  })
}

export function useDeleteProtocoloPacoteMidia() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, protocoloPacoteId }: { id: string; protocoloPacoteId: string }) =>
      protocoloPacoteMidiasService.delete(id).then(() => ({ protocoloPacoteId })),
    onSuccess: async ({ protocoloPacoteId }) => {
      await refreshAfterMutation('protocolo_pacote_midia', 'delete')
      queryClient.invalidateQueries({ queryKey: ['protocolo-pacote-midias', protocoloPacoteId] })
      toast.success('Mídia removida com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover mídia')
      queryClient.invalidateQueries({ queryKey: ['protocolo-pacote-midias'] })
    },
  })
}
