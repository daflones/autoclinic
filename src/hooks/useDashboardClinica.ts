import { useQuery } from '@tanstack/react-query'
import { dashboardClinicaService, type DashboardClinicaData } from '@/services/api/dashboard-clinica'

export function useDashboardClinica() {
  return useQuery<DashboardClinicaData>({
    queryKey: ['dashboard-clinica'],
    queryFn: () => dashboardClinicaService.getDashboardData(),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  })
}
