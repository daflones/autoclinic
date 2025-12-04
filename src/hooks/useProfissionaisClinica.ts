import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  profissionaisClinicaService,
  type ProfissionalClinica,
  type ProfissionalFilters,
  type ProfissionalCreateData,
  type ProfissionalUpdateData,
  type StatusProfissional,
} from '@/services/api/profissionais-clinica'
import { toast } from 'sonner'

export function useProfissionaisClinica(filters: ProfissionalFilters = {}) {
  const query = useQuery({
    queryKey: ['profissionais-clinica', filters],
    queryFn: () => profissionaisClinicaService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const profissionais = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: profissionais,
  }
}

export function useCreateProfissionalClinica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ProfissionalCreateData) => profissionaisClinicaService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-clinica'] })
      toast.success('Profissional criado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar profissional')
    },
  })
}

export function useUpdateProfissionalClinica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfissionalUpdateData }) =>
      profissionaisClinicaService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-clinica'] })
      toast.success('Profissional atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar profissional')
    },
  })
}

export function useDeleteProfissionalClinica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => profissionaisClinicaService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-clinica'] })
      toast.success('Profissional excluído com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir profissional')
    },
  })
}

export function useUpdateProfissionalStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProfissional }) =>
      profissionaisClinicaService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profissionais-clinica'] })
      toast.success('Status do profissional atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status do profissional')
    },
  })
}

export function useProfissionalClinica(id?: string) {
  return useQuery<ProfissionalClinica | null>({
    queryKey: ['profissionais-clinica', id],
    queryFn: () => profissionaisClinicaService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
