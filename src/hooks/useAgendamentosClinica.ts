import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  agendamentosClinicaService,
  type AgendamentoClinica,
  type AgendamentoClinicaFilters,
  type AgendamentoClinicaCreateData,
  type AgendamentoClinicaUpdateData,
  type StatusAgendamentoClinica,
} from '@/services/api/agendamentos-clinica'
import { toast } from 'sonner'
import { useAutoRefresh } from '@/hooks/useAutoRefresh'

export function useAgendamentosClinica(filters: AgendamentoClinicaFilters = {}) {
  const query = useQuery({
    queryKey: ['agendamentos-clinica', filters],
    queryFn: () => agendamentosClinicaService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const agendamentos = useMemo(() => query.data?.data ?? [], [query.data])

  return {
    ...query,
    data: agendamentos,
    count: query.data?.count ?? 0,
  }
}

export function useAgendamentoClinica(id?: string) {
  return useQuery<AgendamentoClinica | null>({
    queryKey: ['agendamentos-clinica', id],
    queryFn: () => agendamentosClinicaService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function useRescheduleAgendamentoClinica() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { data_inicio: string; data_fim: string; motivo?: string | null }
    }) => agendamentosClinicaService.reschedule(id, data),
    onSuccess: async () => {
      await refreshAfterMutation('agendamento_clinica', 'update')
      toast.success('Agendamento reagendado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao reagendar agendamento clínico')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
    },
  })
}

export function useCreateAgendamentoClinica() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (payload: AgendamentoClinicaCreateData) => agendamentosClinicaService.create(payload),
    onSuccess: async () => {
      await refreshAfterMutation('agendamento_clinica', 'create')
      toast.success('Agendamento clínico criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar agendamento clínico')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
    },
  })
}

export function useUpdateAgendamentoClinica() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgendamentoClinicaUpdateData }) =>
      agendamentosClinicaService.update(id, data),
    onSuccess: async () => {
      await refreshAfterMutation('agendamento_clinica', 'update')
      toast.success('Agendamento clínico atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar agendamento clínico')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
    },
  })
}

export function useDeleteAgendamentoClinica() {
  const queryClient = useQueryClient()
  const { refreshAfterMutation } = useAutoRefresh()

  return useMutation({
    mutationFn: (id: string) => agendamentosClinicaService.delete(id),
    onSuccess: async () => {
      await refreshAfterMutation('agendamento_clinica', 'delete')
      toast.success('Agendamento clínico excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir agendamento clínico')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
    },
  })
}

export function useUpdateAgendamentoClinicaStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusAgendamentoClinica }) =>
      agendamentosClinicaService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-status-stats'] })
      toast.success('Status do agendamento clínico atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status do agendamento clínico')
      queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      queryClient.invalidateQueries({ queryKey: ['pacientes-status-stats'] })
    },
  })
}
