import { useQuery } from '@tanstack/react-query'

export interface DisparosPeriodStats {
  sent: number
  failed: number
  unique: number
}

export interface DisparosStatsResponse {
  instanceName: string | null
  stats: {
    total: {
      scheduled: number
      running: number
      sent: number
      failed: number
      canceled: number
    }
    hoje: DisparosPeriodStats
    semana: DisparosPeriodStats
    mes: DisparosPeriodStats
  }
}

function getWhatsAppServerBaseUrl() {
  const raw = String((import.meta as any)?.env?.VITE_WHATSAPP_SERVER_URL ?? '').trim()
  return raw ? raw.replace(/\/+$/, '') : ''
}

export function useDisparosStats(instanceName?: string | null) {
  return useQuery<DisparosStatsResponse>({
    queryKey: ['disparos-stats', instanceName ?? null],
    queryFn: async () => {
      const baseUrl = getWhatsAppServerBaseUrl()
      const path = instanceName
        ? `/api/disparos/stats?instanceName=${encodeURIComponent(instanceName)}`
        : '/api/disparos/stats'
      const url = baseUrl ? `${baseUrl}${path}` : path

      const res = await fetch(url)
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || 'Erro ao buscar stats de disparos')
      }
      return (await res.json()) as DisparosStatsResponse
    },
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 15,
    refetchOnWindowFocus: true,
  })
}
