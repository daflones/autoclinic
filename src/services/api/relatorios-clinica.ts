import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type RelatoriosPeriodo = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado'

export interface RelatoriosCustomRange {
  startDate: string // ISO string
  endDate: string // ISO string
}

export interface RelatoriosClinicaMetricas {
  faturamento: number
  ticketMedio: number
  conversao: number
  novosClientes: number
  agendamentosTotal: number
  agendamentosConcluidos: number
}

export interface RelatorioTopItem {
  id: string
  nome: string
  total: number
  concluidos: number
  conversao: number
  faturamento: number
}

export interface RelatorioProfissionalPerformance {
  id: string
  nome: string
  total: number
  concluidos: number
  conversao: number
  faturamento: number
}

export interface RelatorioProfissionalAnalise {
  id: string
  nome: string
  faturamento: number
  agendamentosTotal: number
  agendamentosConcluidos: number
  procedimentosVendidos: number
  pacotesVendidos: number
  status: { status: string; total: number }[]
}

export interface RelatorioClienteResumo {
  id: string
  nome: string
  agendamentosTotal: number
  agendamentosConcluidos: number
  faturamento: number
}

export interface RelatorioSerieDia {
  dia: string
  faturamento: number
  agendamentosTotal: number
  agendamentosConcluidos: number
}

export interface RelatorioStatusDistribuicao {
  status: string
  total: number
}

export interface RelatorioClienteAnalise extends RelatorioClienteResumo {
  procedimentos: { id: string; nome: string; total: number }[]
  pacotes: { id: string; nome: string; total: number }[]
}

export interface RelatoriosClinicaData {
  metricas: RelatoriosClinicaMetricas
  topProcedimentos: RelatorioTopItem[]
  topPacotes: RelatorioTopItem[]
  performanceProfissionais: RelatorioProfissionalPerformance[]
  profissionaisAnalise: RelatorioProfissionalAnalise[]
  topClientes: RelatorioClienteResumo[]
  serieDiaria: RelatorioSerieDia[]
  distribuicaoStatus: RelatorioStatusDistribuicao[]
  clientesAnalise: RelatorioClienteAnalise[]
  range: { startIso: string; endIso: string }
}

function startOfSaoPauloDay(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)

  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return new Date(`${y}-${mm}-${dd}T00:00:00-03:00`)
}

function endOfSaoPauloDay(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const y = Number(parts.find((p) => p.type === 'year')?.value)
  const m = Number(parts.find((p) => p.type === 'month')?.value)
  const d = Number(parts.find((p) => p.type === 'day')?.value)

  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return new Date(`${y}-${mm}-${dd}T23:59:59.999-03:00`)
}

function safeRate(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function safeNumber(v: any) {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : 0
  return Number.isFinite(n) ? n : 0
}

function saoPauloDayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getRangeByPeriodo(periodo: RelatoriosPeriodo, now = new Date()) {
  const end = endOfSaoPauloDay(now)

  if (periodo === 'hoje') {
    const start = startOfSaoPauloDay(now)
    return { start, end }
  }

  const days =
    periodo === 'semana'
      ? 7
      : periodo === 'mes'
        ? 30
        : periodo === 'trimestre'
          ? 90
          : 365

  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { start, end }
}

export const relatoriosClinicaService = {
  async getRelatorios(periodo: RelatoriosPeriodo): Promise<RelatoriosClinicaData> {
    const { adminProfileId } = await getAdminContext()
    const { start, end } = getRangeByPeriodo(periodo)

    const startIso = start.toISOString()
    const endIso = end.toISOString()

    const [
      { data: agendamentosRaw, error: agendamentosErr },
      { count: pacientesNovosCount, error: pacientesErr },
    ] = await Promise.all([
      supabase
        .from('agendamentos_clinica')
        .select(
          'id, paciente_id, profissional_id, plano_tratamento_id, procedimento_id, procedimentos_ids, protocolos_pacotes_ids, status, valor, data_inicio'
        )
        .eq('admin_profile_id', adminProfileId)
        .gte('data_inicio', startIso)
        .lte('data_inicio', endIso)
        .limit(15000),
      supabase
        .from('pacientes')
        .select('id', { count: 'exact', head: true })
        .eq('admin_profile_id', adminProfileId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
    ])

    if (agendamentosErr) throw new Error(agendamentosErr.message)
    if (pacientesErr) throw new Error(pacientesErr.message)

    const agendamentos = (agendamentosRaw ?? []) as any[]

    const agendamentosTotal = agendamentos.length
    const agendamentosConcluidos = agendamentos.filter((a) => a?.status === 'concluido').length

    const faturamento = agendamentos
      .filter((a) => a?.status === 'concluido')
      .reduce((acc, a) => acc + safeNumber(a?.valor), 0)

    const ticketMedio = agendamentosConcluidos ? faturamento / agendamentosConcluidos : 0
    const conversao = safeRate(agendamentosConcluidos, agendamentosTotal)

    const novosClientesFinal = pacientesNovosCount ?? 0

    const procedimentoTotals = new Map<
      string,
      { total: number; concluidos: number; faturamento: number }
    >()

    const profissionalTotals = new Map<
      string,
      { total: number; concluidos: number; faturamento: number }
    >()

    const clienteTotals = new Map<
      string,
      { total: number; concluidos: number; faturamento: number }
    >()

    const clienteProcedimentosTotals = new Map<string, Map<string, number>>()
    const clientePacotesTotals = new Map<string, Map<string, number>>()

    const serieDiariaTotals = new Map<
      string,
      { faturamento: number; agendamentosTotal: number; agendamentosConcluidos: number }
    >()

    const statusTotals = new Map<string, number>()

    const profissionalStatusTotals = new Map<string, Map<string, number>>()
    const profissionalProcedimentosConcluidosTotals = new Map<string, number>()
    const profissionalPacotesConcluidosTotals = new Map<string, number>()

    const planoIds: string[] = []

    const addProcedimentoStats = (id: string, concluded: boolean, valor: number) => {
      const prev = procedimentoTotals.get(id) ?? { total: 0, concluidos: 0, faturamento: 0 }
      prev.total += 1
      if (concluded) {
        prev.concluidos += 1
        prev.faturamento += valor
      }
      procedimentoTotals.set(id, prev)
    }

    agendamentos.forEach((a: any) => {
      const concluded = a?.status === 'concluido'
      const valorTotal = concluded ? safeNumber(a?.valor) : 0

      const statusKey = String(a?.status || 'desconhecido')
      statusTotals.set(statusKey, (statusTotals.get(statusKey) ?? 0) + 1)

      if (a?.profissional_id) {
        const byStatus = profissionalStatusTotals.get(a.profissional_id) ?? new Map<string, number>()
        byStatus.set(statusKey, (byStatus.get(statusKey) ?? 0) + 1)
        profissionalStatusTotals.set(a.profissional_id, byStatus)
      }

      if (a?.data_inicio) {
        const dayKey = saoPauloDayKey(new Date(a.data_inicio))
        const prev = serieDiariaTotals.get(dayKey) ?? {
          faturamento: 0,
          agendamentosTotal: 0,
          agendamentosConcluidos: 0,
        }
        prev.agendamentosTotal += 1
        if (concluded) {
          prev.agendamentosConcluidos += 1
          prev.faturamento += valorTotal
        }
        serieDiariaTotals.set(dayKey, prev)
      }

      const procedimentosIds = Array.isArray(a?.procedimentos_ids)
        ? (a?.procedimentos_ids as string[]).filter(Boolean)
        : a?.procedimento_id
          ? [a.procedimento_id]
          : []

      if (procedimentosIds.length > 0) {
        const valorPorItem = procedimentosIds.length > 0 ? valorTotal / procedimentosIds.length : 0
        procedimentosIds.forEach((id) => addProcedimentoStats(id, concluded, valorPorItem))
      }

      if (concluded && a?.profissional_id && procedimentosIds.length > 0) {
        profissionalProcedimentosConcluidosTotals.set(
          a.profissional_id,
          (profissionalProcedimentosConcluidosTotals.get(a.profissional_id) ?? 0) + procedimentosIds.length
        )
      }

      if (a?.paciente_id && procedimentosIds.length > 0) {
        const map = clienteProcedimentosTotals.get(a.paciente_id) ?? new Map<string, number>()
        procedimentosIds.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1))
        clienteProcedimentosTotals.set(a.paciente_id, map)
      }

      if (a?.profissional_id) {
        const prev = profissionalTotals.get(a.profissional_id) ?? { total: 0, concluidos: 0, faturamento: 0 }
        prev.total += 1
        if (concluded) {
          prev.concluidos += 1
          prev.faturamento += valorTotal
        }
        profissionalTotals.set(a.profissional_id, prev)
      }

      if (a?.paciente_id) {
        const prev = clienteTotals.get(a.paciente_id) ?? { total: 0, concluidos: 0, faturamento: 0 }
        prev.total += 1
        if (concluded) {
          prev.concluidos += 1
          prev.faturamento += valorTotal
        }
        clienteTotals.set(a.paciente_id, prev)
      }

      if (a?.plano_tratamento_id) planoIds.push(a.plano_tratamento_id)
    })

    const topProcedimentoIds = Array.from(procedimentoTotals.entries())
      .sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0))
      .slice(0, 10)
      .map(([id]) => id)

    const uniquePlanoIds = Array.from(new Set(planoIds.filter(Boolean)))

    const [{ data: procedimentosData, error: procErr }, { data: planosData, error: planosErr }] = await Promise.all([
      topProcedimentoIds.length
        ? supabase
            .from('procedimentos')
            .select('id, nome')
            .eq('admin_profile_id', adminProfileId)
            .in('id', topProcedimentoIds)
        : Promise.resolve({ data: [], error: null } as any),
      uniquePlanoIds.length
        ? supabase
            .from('planos_tratamento')
            .select('id, protocolo_pacote_id')
            .eq('admin_profile_id', adminProfileId)
            .in('id', uniquePlanoIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

    if (procErr) throw new Error(procErr.message)
    if (planosErr) throw new Error(planosErr.message)

    const procNameById = new Map<string, string>()
    ;(procedimentosData ?? []).forEach((p: any) => procNameById.set(p.id, p.nome))

    const pacoteIdByPlanoId = new Map<string, string>()
    ;(planosData ?? []).forEach((p: any) => {
      if (p?.id && p?.protocolo_pacote_id) pacoteIdByPlanoId.set(p.id, p.protocolo_pacote_id)
    })

    const pacoteTotals = new Map<string, { total: number; concluidos: number; faturamento: number }>()

    const addPacoteStats = (id: string, concluded: boolean, valor: number) => {
      const prev = pacoteTotals.get(id) ?? { total: 0, concluidos: 0, faturamento: 0 }
      prev.total += 1
      if (concluded) {
        prev.concluidos += 1
        prev.faturamento += valor
      }
      pacoteTotals.set(id, prev)
    }

    agendamentos.forEach((a: any) => {
      const concluded = a?.status === 'concluido'
      const valorTotal = concluded ? safeNumber(a?.valor) : 0

      const pacoteIdsDiretos = Array.isArray(a?.protocolos_pacotes_ids)
        ? (a?.protocolos_pacotes_ids as string[]).filter(Boolean)
        : []

      const pacoteIdsPorPlano = a?.plano_tratamento_id
        ? [pacoteIdByPlanoId.get(a.plano_tratamento_id)].filter((id): id is string => Boolean(id))
        : []

      const pacoteIds = Array.from(new Set([...pacoteIdsDiretos, ...pacoteIdsPorPlano]))
      if (pacoteIds.length === 0) return

      const valorPorItem = pacoteIds.length > 0 ? valorTotal / pacoteIds.length : 0
      pacoteIds.forEach((id) => addPacoteStats(id, concluded, valorPorItem))

      if (concluded && a?.profissional_id && pacoteIds.length > 0) {
        profissionalPacotesConcluidosTotals.set(
          a.profissional_id,
          (profissionalPacotesConcluidosTotals.get(a.profissional_id) ?? 0) + pacoteIds.length
        )
      }

      if (a?.paciente_id) {
        const map = clientePacotesTotals.get(a.paciente_id) ?? new Map<string, number>()
        pacoteIds.forEach((id) => map.set(id, (map.get(id) ?? 0) + 1))
        clientePacotesTotals.set(a.paciente_id, map)
      }
    })

    const topPacoteIds = Array.from(pacoteTotals.entries())
      .sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0))
      .slice(0, 10)
      .map(([id]) => id)

    const [
      { data: pacotesData, error: pacotesErr },
      { data: profissionaisData, error: profErr },
      { data: clientesData, error: clientesErr },
    ] = await Promise.all([
      topPacoteIds.length
        ? supabase
            .from('protocolos_pacotes')
            .select('id, nome')
            .eq('admin_profile_id', adminProfileId)
            .in('id', topPacoteIds)
        : Promise.resolve({ data: [], error: null } as any),
      profissionalTotals.size
        ? supabase
            .from('profissionais_clinica')
            .select('id, nome')
            .eq('admin_profile_id', adminProfileId)
            .in('id', Array.from(profissionalTotals.keys()))
        : Promise.resolve({ data: [], error: null } as any),
      clienteTotals.size
        ? supabase
            .from('pacientes')
            .select('id, nome_completo')
            .eq('admin_profile_id', adminProfileId)
            .in('id', Array.from(clienteTotals.keys()))
        : Promise.resolve({ data: [], error: null } as any),
    ])

    if (pacotesErr) throw new Error(pacotesErr.message)
    if (profErr) throw new Error(profErr.message)
    if (clientesErr) throw new Error(clientesErr.message)

    const pacoteNameById = new Map<string, string>()
    ;(pacotesData ?? []).forEach((p: any) => pacoteNameById.set(p.id, p.nome))

    const profissionalNameById = new Map<string, string>()
    ;(profissionaisData ?? []).forEach((p: any) => profissionalNameById.set(p.id, p.nome))

    const clienteNameById = new Map<string, string>()
    ;(clientesData ?? []).forEach((p: any) => clienteNameById.set(p.id, p.nome_completo))

    const topProcedimentos: RelatorioTopItem[] = topProcedimentoIds.map((id) => {
      const stats = procedimentoTotals.get(id) ?? { total: 0, concluidos: 0, faturamento: 0 }
      return {
        id,
        nome: procNameById.get(id) || 'Procedimento',
        total: stats.total,
        concluidos: stats.concluidos,
        conversao: safeRate(stats.concluidos, stats.total),
        faturamento: stats.faturamento,
      }
    })

    const topPacotes: RelatorioTopItem[] = topPacoteIds.map((id) => {
      const stats = pacoteTotals.get(id) ?? { total: 0, concluidos: 0, faturamento: 0 }
      return {
        id,
        nome: pacoteNameById.get(id) || 'Pacote',
        total: stats.total,
        concluidos: stats.concluidos,
        conversao: safeRate(stats.concluidos, stats.total),
        faturamento: stats.faturamento,
      }
    })

    const performanceProfissionais: RelatorioProfissionalPerformance[] = Array.from(profissionalTotals.entries())
      .map(([id, stats]) => ({
        id,
        nome: profissionalNameById.get(id) || 'Profissional',
        total: stats.total,
        concluidos: stats.concluidos,
        conversao: safeRate(stats.concluidos, stats.total),
        faturamento: stats.faturamento,
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10)

    const profissionaisAnalise: RelatorioProfissionalAnalise[] = Array.from(profissionalTotals.entries())
      .map(([id, stats]) => {
        const byStatus = profissionalStatusTotals.get(id) ?? new Map<string, number>()
        const status = Array.from(byStatus.entries())
          .map(([status, total]) => ({ status, total }))
          .sort((a, b) => b.total - a.total)

        return {
          id,
          nome: profissionalNameById.get(id) || 'Profissional',
          faturamento: stats.faturamento,
          agendamentosTotal: stats.total,
          agendamentosConcluidos: stats.concluidos,
          procedimentosVendidos: profissionalProcedimentosConcluidosTotals.get(id) ?? 0,
          pacotesVendidos: profissionalPacotesConcluidosTotals.get(id) ?? 0,
          status,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento)

    const topClientes: RelatorioClienteResumo[] = Array.from(clienteTotals.entries())
      .map(([id, stats]) => ({
        id,
        nome: clienteNameById.get(id) || 'Cliente',
        agendamentosTotal: stats.total,
        agendamentosConcluidos: stats.concluidos,
        faturamento: stats.faturamento,
      }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10)

    const serieDiaria: RelatorioSerieDia[] = Array.from(serieDiariaTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, s]) => ({
        dia,
        faturamento: s.faturamento,
        agendamentosTotal: s.agendamentosTotal,
        agendamentosConcluidos: s.agendamentosConcluidos,
      }))

    const distribuicaoStatus: RelatorioStatusDistribuicao[] = Array.from(statusTotals.entries())
      .map(([status, total]) => ({ status, total }))
      .sort((a, b) => b.total - a.total)

    const clientesAnalise: RelatorioClienteAnalise[] = Array.from(clienteTotals.entries())
      .sort((a, b) => (b[1]?.faturamento ?? 0) - (a[1]?.faturamento ?? 0))
      .slice(0, 25)
      .map(([id, stats]) => {
        const procMap = clienteProcedimentosTotals.get(id) ?? new Map<string, number>()
        const pacMap = clientePacotesTotals.get(id) ?? new Map<string, number>()

        const procedimentos = Array.from(procMap.entries())
          .map(([procId, total]) => ({
            id: procId,
            nome: procNameById.get(procId) || 'Procedimento',
            total,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 6)

        const pacotes = Array.from(pacMap.entries())
          .map(([pacId, total]) => ({
            id: pacId,
            nome: pacoteNameById.get(pacId) || 'Pacote',
            total,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 6)

        return {
          id,
          nome: clienteNameById.get(id) || 'Cliente',
          agendamentosTotal: stats.total,
          agendamentosConcluidos: stats.concluidos,
          faturamento: stats.faturamento,
          procedimentos,
          pacotes,
        }
      })

    return {
      metricas: {
        faturamento,
        ticketMedio,
        conversao,
        novosClientes: novosClientesFinal,
        agendamentosTotal,
        agendamentosConcluidos,
      },
      topProcedimentos,
      topPacotes,
      performanceProfissionais,
      profissionaisAnalise,
      topClientes,
      serieDiaria,
      distribuicaoStatus,
      clientesAnalise,
      range: { startIso, endIso },
    }
  },
}
