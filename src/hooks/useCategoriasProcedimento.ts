import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  categoriasService,
  type CategoriaProcedimento,
  type CategoriaFilters,
  type CategoriaCreateData,
  type CategoriaUpdateData,
  type StatusCategoria,
} from '@/services/api/categorias-procedimento'
import { toast } from 'sonner'

export function useCategoriasProcedimento(filters: CategoriaFilters = {}) {
  const query = useQuery({
    queryKey: ['categorias-procedimento', filters],
    queryFn: () => categoriasService.getAll(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  const categorias = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: categorias,
  }
}

export function useCategoriaProcedimento(id?: string) {
  return useQuery<CategoriaProcedimento | null>({
    queryKey: ['categorias-procedimento', id],
    queryFn: () => categoriasService.getById(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

export function useCreateCategoriaProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CategoriaCreateData) => categoriasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-procedimento'] })
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Categoria criada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar categoria')
    },
  })
}

export function useUpdateCategoriaProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoriaUpdateData }) =>
      categoriasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-procedimento'] })
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Categoria atualizada com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar categoria')
    },
  })
}

export function useDeleteCategoriaProcedimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => categoriasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-procedimento'] })
      queryClient.invalidateQueries({ queryKey: ['procedimentos'] })
      toast.success('Categoria excluída com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir categoria')
    },
  })
}

export function useUpdateCategoriaStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusCategoria }) =>
      categoriasService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-procedimento'] })
      toast.success('Status da categoria atualizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar status da categoria')
    },
  })
}
