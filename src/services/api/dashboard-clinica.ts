import { supabase } from '@/lib/supabase'
import { getAdminContext } from './_tenant'

export type DashboardPeriod = 'hoje' | 'semana' | 'mes'

export interface PeriodCount {
  hoje: number
  semana: number
  mes: number
}

export interface TopItem {
  id: string
  nome: string
  count: number
}

export interface TopItemDetalhado {
  id: string
  nome: string
  total: number
  concluidos: number
  conversao: number
}

export interface SerieDia {
  dia: string
  pacientesNovos: number
  agendamentosTotal: number
  agendamentosConcluidos: number
}

export interface DashboardClinicaData {
  pacientesAtivos: number
  sessoesHoje: number
  taxaAdesao: number
  protocolosAtivos: number
  pacientesNovos: PeriodCount
  pacientesKanban: Record<'novos' | 'agendado' | 'concluido' | 'arquivado', number>
  agendamentosConcluidos: PeriodCount
  conversaoAgendamentos: PeriodCount
  serieSemana: SerieDia[]
  serieMes: SerieDia[]
  topProcedimentos: TopItemDetalhado[]
  topPacotes: TopItemDetalhado[]
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

  // Monta início do dia no fuso de São Paulo.
  // Observação: usamos offset fixo -03:00 (compatível com São Paulo atualmente).
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

function dateKeySaoPauloFromIso(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function buildSerieDias(startIso: string, endIso: string, base: Record<string, SerieDia>) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []

  const cursor = new Date(start)
  const out: SerieDia[] = []
  while (cursor.getTime() <= end.getTime()) {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(cursor)
    out.push(base[key] ?? { dia: key, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

function getPeriodRanges() {
  const now = new Date()
  const startHoje = startOfSaoPauloDay(now)
  const startSemana = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const startMes = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  return {
    now,
    startHoje,
    startSemana,
    startMes,
  }
}

async function countPacientesCriadosDesde(adminProfileId: string, iso: string) {
  const { count, error } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .gte('created_at', iso)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countAgendamentosHoje(adminProfileId: string, startIso: string, endIso: string) {
  const { count, error } = await supabase
    .from('agendamentos_clinica')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .gte('data_inicio', startIso)
    .lte('data_inicio', endIso)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countPlanosAtivos(adminProfileId: string) {
  const { count, error } = await supabase
    .from('planos_tratamento')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .in('status', ['aprovado', 'em_execucao', 'em_aprovacao'])

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countPlanosTotal(adminProfileId: string) {
  const { count, error } = await supabase
    .from('planos_tratamento')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countPlanosConcluidos(adminProfileId: string) {
  const { count, error } = await supabase
    .from('planos_tratamento')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .eq('status', 'concluido')

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countPacientesAtivosPorAgendamentos(adminProfileId: string, startIso: string) {
  const { data, error } = await supabase
    .from('agendamentos_clinica')
    .select('paciente_id')
    .eq('admin_profile_id', adminProfileId)
    .gte('data_inicio', startIso)
    .limit(12000)

  if (error) throw new Error(error.message)

  const set = new Set<string>()
  ;(data ?? []).forEach((row: any) => {
    const id = row?.paciente_id
    if (id) set.add(id)
  })
  return set.size
}

async function countPacientesKanban(adminProfileId: string, key: string) {
  const { count, error } = await supabase
    .from('pacientes')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .eq('status_detalhado', key)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countAgendamentosConcluidosDesde(adminProfileId: string, iso: string) {
  const { count, error } = await supabase
    .from('agendamentos_clinica')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .eq('status', 'concluido')
    .gte('data_inicio', iso)

  if (error) throw new Error(error.message)
  return count ?? 0
}

async function countAgendamentosTotalDesde(adminProfileId: string, iso: string) {
  const { count, error } = await supabase
    .from('agendamentos_clinica')
    .select('*', { count: 'exact', head: true })
    .eq('admin_profile_id', adminProfileId)
    .gte('data_inicio', iso)

  if (error) throw new Error(error.message)
  return count ?? 0
}

function safeRate(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

export const dashboardClinicaService = {
  async getDashboardData(): Promise<DashboardClinicaData> {
    const { adminProfileId } = await getAdminContext()
    const { now, startHoje, startSemana, startMes } = getPeriodRanges()
    const endHoje = endOfSaoPauloDay(now)

    const [pacientesAtivos, sessoesHoje, protocolosAtivos, planosTotal, planosConcluidos] = await Promise.all([
      countPacientesAtivosPorAgendamentos(adminProfileId, startMes.toISOString()),
      countAgendamentosHoje(adminProfileId, startHoje.toISOString(), endHoje.toISOString()),
      countPlanosAtivos(adminProfileId),
      countPlanosTotal(adminProfileId),
      countPlanosConcluidos(adminProfileId),
    ])

    const taxaAdesao = safeRate(planosConcluidos, planosTotal)

    const [
      pacientesHoje,
      pacientesSemana,
      pacientesMes,
      kanbanNovos,
      kanbanAgendado,
      kanbanConcluido,
      kanbanArquivado,
      concluidosHoje,
      concluidosSemana,
      concluidosMes,
      totalHoje,
      totalSemana,
      totalMes,
    ] = await Promise.all([
      countPacientesCriadosDesde(adminProfileId, startHoje.toISOString()),
      countPacientesCriadosDesde(adminProfileId, startSemana.toISOString()),
      countPacientesCriadosDesde(adminProfileId, startMes.toISOString()),
      countPacientesKanban(adminProfileId, 'novos'),
      countPacientesKanban(adminProfileId, 'agendado'),
      countPacientesKanban(adminProfileId, 'concluido'),
      countPacientesKanban(adminProfileId, 'arquivado'),
      countAgendamentosConcluidosDesde(adminProfileId, startHoje.toISOString()),
      countAgendamentosConcluidosDesde(adminProfileId, startSemana.toISOString()),
      countAgendamentosConcluidosDesde(adminProfileId, startMes.toISOString()),
      countAgendamentosTotalDesde(adminProfileId, startHoje.toISOString()),
      countAgendamentosTotalDesde(adminProfileId, startSemana.toISOString()),
      countAgendamentosTotalDesde(adminProfileId, startMes.toISOString()),
    ])

    // Série semanal (novos pacientes e concluídos por dia)
    const { data: pacientesSemanaRaw, error: pacientesSemanaErr } = await supabase
      .from('pacientes')
      .select('created_at')
      .eq('admin_profile_id', adminProfileId)
      .gte('created_at', startSemana.toISOString())
      .lte('created_at', endHoje.toISOString())
      .limit(5000)

    if (pacientesSemanaErr) throw new Error(pacientesSemanaErr.message)

    const { data: agendamentosSemanaRaw, error: agendamentosSemanaErr } = await supabase
      .from('agendamentos_clinica')
      .select('data_inicio, status')
      .eq('admin_profile_id', adminProfileId)
      .gte('data_inicio', startSemana.toISOString())
      .lte('data_inicio', endHoje.toISOString())
      .limit(8000)

    if (agendamentosSemanaErr) throw new Error(agendamentosSemanaErr.message)

    const { data: concluidosSemanaRaw, error: concluidosSemanaErr } = await supabase
      .from('agendamentos_clinica')
      .select('data_inicio')
      .eq('admin_profile_id', adminProfileId)
      .eq('status', 'concluido')
      .gte('data_inicio', startSemana.toISOString())
      .lte('data_inicio', endHoje.toISOString())
      .limit(5000)

    if (concluidosSemanaErr) throw new Error(concluidosSemanaErr.message)

    const serieSemanaBase: Record<string, SerieDia> = {}
    ;(pacientesSemanaRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.created_at)
      if (!k) return
      serieSemanaBase[k] = serieSemanaBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieSemanaBase[k].pacientesNovos += 1
    })

    ;(agendamentosSemanaRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.data_inicio)
      if (!k) return
      serieSemanaBase[k] = serieSemanaBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieSemanaBase[k].agendamentosTotal += 1
    })

    ;(concluidosSemanaRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.data_inicio)
      if (!k) return
      serieSemanaBase[k] = serieSemanaBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieSemanaBase[k].agendamentosConcluidos += 1
    })

    const serieSemana = buildSerieDias(startSemana.toISOString(), endHoje.toISOString(), serieSemanaBase)

    // Série mensal (últimos 30 dias)
    const { data: pacientesMesRaw, error: pacientesMesErr } = await supabase
      .from('pacientes')
      .select('created_at')
      .eq('admin_profile_id', adminProfileId)
      .gte('created_at', startMes.toISOString())
      .lte('created_at', endHoje.toISOString())
      .limit(5000)

    if (pacientesMesErr) throw new Error(pacientesMesErr.message)

    const { data: agendamentosMesRaw, error: agendamentosMesErr } = await supabase
      .from('agendamentos_clinica')
      .select('data_inicio, status')
      .eq('admin_profile_id', adminProfileId)
      .gte('data_inicio', startMes.toISOString())
      .lte('data_inicio', endHoje.toISOString())
      .limit(12000)

    if (agendamentosMesErr) throw new Error(agendamentosMesErr.message)

    const { data: concluidosMesRaw, error: concluidosMesErr } = await supabase
      .from('agendamentos_clinica')
      .select('data_inicio')
      .eq('admin_profile_id', adminProfileId)
      .eq('status', 'concluido')
      .gte('data_inicio', startMes.toISOString())
      .lte('data_inicio', endHoje.toISOString())
      .limit(8000)

    if (concluidosMesErr) throw new Error(concluidosMesErr.message)

    const serieMesBase: Record<string, SerieDia> = {}
    ;(pacientesMesRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.created_at)
      if (!k) return
      serieMesBase[k] = serieMesBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieMesBase[k].pacientesNovos += 1
    })

    ;(agendamentosMesRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.data_inicio)
      if (!k) return
      serieMesBase[k] = serieMesBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieMesBase[k].agendamentosTotal += 1
    })

    ;(concluidosMesRaw ?? []).forEach((row: any) => {
      const k = dateKeySaoPauloFromIso(row?.data_inicio)
      if (!k) return
      serieMesBase[k] = serieMesBase[k] ?? { dia: k, pacientesNovos: 0, agendamentosTotal: 0, agendamentosConcluidos: 0 }
      serieMesBase[k].agendamentosConcluidos += 1
    })

    const serieMes = buildSerieDias(startMes.toISOString(), endHoje.toISOString(), serieMesBase)

    // Top procedimentos detalhado (últimos 30 dias)
    const { data: agendamentosProcRaw, error: agError } = await supabase
      .from('agendamentos_clinica')
      .select('procedimento_id, status')
      .eq('admin_profile_id', adminProfileId)
      .gte('data_inicio', startMes.toISOString())
      .limit(5000)

    if (agError) throw new Error(agError.message)

    const procTotals = new Map<string, { total: number; concluidos: number }>()
    ;(agendamentosProcRaw ?? []).forEach((row: any) => {
      const id = row?.procedimento_id
      if (!id) return
      const prev = procTotals.get(id) ?? { total: 0, concluidos: 0 }
      prev.total += 1
      if (row?.status === 'concluido') prev.concluidos += 1
      procTotals.set(id, prev)
    })

    const topProcIds = Array.from(procTotals.entries())
      .sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0))
      .slice(0, 8)
      .map(([id]) => id)

    const { data: procedimentos, error: procErr } = topProcIds.length
      ? await supabase
          .from('procedimentos')
          .select('id, nome')
          .eq('admin_profile_id', adminProfileId)
          .in('id', topProcIds)
      : { data: [], error: null }

    if (procErr) throw new Error(procErr.message)

    const procNameById = new Map<string, string>()
    ;(procedimentos ?? []).forEach((p: any) => procNameById.set(p.id, p.nome))

    const topProcedimentos: TopItemDetalhado[] = topProcIds.map((id) => {
      const stats = procTotals.get(id) ?? { total: 0, concluidos: 0 }
      return {
        id,
        nome: procNameById.get(id) || 'Procedimento',
        total: stats.total,
        concluidos: stats.concluidos,
        conversao: safeRate(stats.concluidos, stats.total),
      }
    })

    // Top pacotes detalhado (últimos 30 dias)
    const { data: agendamentosPlanoRaw, error: agPlanoErr } = await supabase
      .from('agendamentos_clinica')
      .select('plano_tratamento_id, status')
      .eq('admin_profile_id', adminProfileId)
      .not('plano_tratamento_id', 'is', null)
      .gte('data_inicio', startMes.toISOString())
      .limit(8000)

    if (agPlanoErr) throw new Error(agPlanoErr.message)

    const planoIds = Array.from(
      new Set((agendamentosPlanoRaw ?? []).map((r: any) => r?.plano_tratamento_id).filter(Boolean))
    )

    const { data: planos, error: planosErr } = planoIds.length
      ? await supabase
          .from('planos_tratamento')
          .select('id, protocolo_pacote_id')
          .eq('admin_profile_id', adminProfileId)
          .in('id', planoIds)
      : { data: [], error: null }

    if (planosErr) throw new Error(planosErr.message)

    const pacoteIdByPlanoId = new Map<string, string>()
    ;(planos ?? []).forEach((p: any) => {
      if (p?.id && p?.protocolo_pacote_id) pacoteIdByPlanoId.set(p.id, p.protocolo_pacote_id)
    })

    const pacoteTotals = new Map<string, { total: number; concluidos: number }>()
    ;(agendamentosPlanoRaw ?? []).forEach((row: any) => {
      const planoId = row?.plano_tratamento_id
      if (!planoId) return
      const pacoteId = pacoteIdByPlanoId.get(planoId)
      if (!pacoteId) return
      const prev = pacoteTotals.get(pacoteId) ?? { total: 0, concluidos: 0 }
      prev.total += 1
      if (row?.status === 'concluido') prev.concluidos += 1
      pacoteTotals.set(pacoteId, prev)
    })

    const topPacoteIds = Array.from(pacoteTotals.entries())
      .sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0))
      .slice(0, 8)
      .map(([id]) => id)

    const { data: pacotes, error: pacotesErr } = topPacoteIds.length
      ? await supabase
          .from('protocolos_pacotes')
          .select('id, nome')
          .eq('admin_profile_id', adminProfileId)
          .in('id', topPacoteIds)
      : { data: [], error: null }

    if (pacotesErr) throw new Error(pacotesErr.message)

    const pacoteNameById = new Map<string, string>()
    ;(pacotes ?? []).forEach((p: any) => pacoteNameById.set(p.id, p.nome))

    const topPacotes: TopItemDetalhado[] = topPacoteIds.map((id) => {
      const stats = pacoteTotals.get(id) ?? { total: 0, concluidos: 0 }
      return {
        id,
        nome: pacoteNameById.get(id) || 'Pacote',
        total: stats.total,
        concluidos: stats.concluidos,
        conversao: safeRate(stats.concluidos, stats.total),
      }
    })

    return {
      pacientesAtivos,
      sessoesHoje,
      taxaAdesao,
      protocolosAtivos,
      pacientesNovos: { hoje: pacientesHoje, semana: pacientesSemana, mes: pacientesMes },
      pacientesKanban: {
        novos: kanbanNovos,
        agendado: kanbanAgendado,
        concluido: kanbanConcluido,
        arquivado: kanbanArquivado,
      },
      agendamentosConcluidos: { hoje: concluidosHoje, semana: concluidosSemana, mes: concluidosMes },
      conversaoAgendamentos: {
        hoje: safeRate(concluidosHoje, totalHoje),
        semana: safeRate(concluidosSemana, totalSemana),
        mes: safeRate(concluidosMes, totalMes),
      },
      serieSemana,
      serieMes,
      topProcedimentos,
      topPacotes,
    }
  },
}
