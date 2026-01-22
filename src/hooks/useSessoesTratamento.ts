import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  sessoesTratamentoService,
  type SessaoTratamento,
  type SessaoTratamentoFilters,
} from '@/services/api/sessoes-tratamento'

export function useSessoesTratamento(filters: SessaoTratamentoFilters = {}) {
  const query = useQuery<SessaoTratamento[]>({
    queryKey: ['sessoes-tratamento', filters],
    queryFn: () => sessoesTratamentoService.list(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: Boolean(filters.paciente_id || filters.plano_tratamento_id),
  })

  const sessoes = useMemo(() => query.data ?? [], [query.data])

  return {
    ...query,
    data: sessoes,
  }
}
