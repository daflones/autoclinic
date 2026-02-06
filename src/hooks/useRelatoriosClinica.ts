import { useQuery } from '@tanstack/react-query'
import {
  relatoriosClinicaService,
  type RelatoriosClinicaData,
  type RelatoriosPeriodo,
} from '@/services/api/relatorios-clinica'

export function useRelatoriosClinica(periodo: RelatoriosPeriodo) {
  return useQuery<RelatoriosClinicaData>({
    queryKey: ['relatorios-clinica', periodo],
    queryFn: () => relatoriosClinicaService.getRelatorios(periodo),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}
