import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  protocolosPacotesService,
  type ProtocoloPacote,
  type ProtocoloPacoteFilters,
  type ProtocoloPacoteCreateData,
  type ProtocoloPacoteUpdateData,
} from '@/services/api/protocolos-pacotes'
import { toast } from 'sonner'

export function useProtocolosPacotes(filters: ProtocoloPacoteFilters = {}) {
  const query = useQuery({
    queryKey: ['protocolos-pacotes', filters],
    queryFn: () => protocolosPacotesService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const itens = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: itens,
  }
}

export function useCreateProtocoloPacote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProtocoloPacoteCreateData) => protocolosPacotesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos-pacotes'] })
      toast.success('Protocolo/Pacote criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar protocolo/pacote')
    },
  })
}

export function useUpdateProtocoloPacote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProtocoloPacoteUpdateData }) =>
      protocolosPacotesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos-pacotes'] })
      toast.success('Protocolo/Pacote atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar protocolo/pacote')
    },
  })
}

export function useDeleteProtocoloPacote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => protocolosPacotesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocolos-pacotes'] })
      toast.success('Protocolo/Pacote excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir protocolo/pacote')
    },
  })
}

export function useUpdateProtocoloPacoteStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      protocolosPacotesService.update(id, { ativo }),
    onSuccess: (_data: ProtocoloPacote) => {
      queryClient.invalidateQueries({ queryKey: ['protocolos-pacotes'] })
      toast.success('Status atualizado!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status')
    },
  })
}
