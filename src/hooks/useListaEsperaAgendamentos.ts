import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listaEsperaAgendamentosService,
  type ListaEsperaAgendamento,
  type ListaEsperaAgendamentoCreateData,
  type ListaEsperaAgendamentoUpdateData,
  type ListaEsperaAgendamentosFilters,
} from '@/services/api/lista-espera-agendamentos'
import { toast } from 'sonner'

export function useListaEsperaAgendamentos(filters: ListaEsperaAgendamentosFilters = {}) {
  return useQuery<{ data: ListaEsperaAgendamento[]; count: number }>({
    queryKey: ['lista-espera-agendamentos', filters],
    queryFn: () => listaEsperaAgendamentosService.getAll(filters),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })
}

export function useCreateListaEsperaAgendamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ListaEsperaAgendamentoCreateData) => listaEsperaAgendamentosService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera-agendamentos'] })
      toast.success('Item adicionado à lista de espera')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar à lista de espera')
    },
  })
}

export function useUpdateListaEsperaAgendamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ListaEsperaAgendamentoUpdateData }) =>
      listaEsperaAgendamentosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera-agendamentos'] })
      toast.success('Lista de espera atualizada')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar lista de espera')
    },
  })
}

export function useDeleteListaEsperaAgendamento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => listaEsperaAgendamentosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera-agendamentos'] })
      toast.success('Item removido da lista de espera')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover item')
    },
  })
}
