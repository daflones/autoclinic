import { useQuery } from '@tanstack/react-query'

export interface PlaceholderStats {
  totalPacientes: number
  pacientesAtivos: number
  novosPacientesMes: number
  sessoesHoje: number
  sessoesConfirmadas: number
  faturamentoEstimado: number
  ticketMedioSessao: number
  protocolosAtivos: number
}

export const DASHBOARD_PLACEHOLDER_STATS: PlaceholderStats = {
  totalPacientes: 0,
  pacientesAtivos: 0,
  novosPacientesMes: 0,
  sessoesHoje: 0,
  sessoesConfirmadas: 0,
  faturamentoEstimado: 0,
  ticketMedioSessao: 0,
  protocolosAtivos: 0,
}

const emptyArray: any[] = []

const useDisabledQuery = <T,>(placeholder: T) =>
  useQuery({
    queryKey: ['automaclinic-disabled'],
    queryFn: async () => placeholder,
    staleTime: Infinity,
    gcTime: Infinity,
  })

export const useDashboardStats = () => useDisabledQuery(DASHBOARD_PLACEHOLDER_STATS)
export const useRecentActivities = () => useDisabledQuery(emptyArray)
export const useRecentProposals = () => useDisabledQuery(emptyArray)
export const useSalesConversion = () => useDisabledQuery(emptyArray)
export const useSalesPipeline = () => useDisabledQuery(emptyArray)

export const useDashboardData = () => {
  const stats = useDashboardStats()
  const activities = useRecentActivities()
  const proposals = useRecentProposals()
  const conversion = useSalesConversion()
  const pipeline = useSalesPipeline()

  return {
    stats,
    activities,
    proposals,
    conversion,
    pipeline,
    isLoading: false,
    isError: false,
    error: null,
    refetchAll: () => undefined,
  }
}
