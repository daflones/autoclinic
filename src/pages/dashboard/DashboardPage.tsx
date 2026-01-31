import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { Sparkles, CalendarHeart, Heart, Activity, Layers, Stethoscope } from 'lucide-react'
import { useDisparosStats } from '@/hooks/useDisparosStats'
import { useDashboardClinica } from '@/hooks/useDashboardClinica'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

export function DashboardPage() {
  const { user } = useAuthStore()
  const disparosStatsQuery = useDisparosStats(null)
  const disparosStats = disparosStatsQuery.data?.stats
  const dashboardClinicaQuery = useDashboardClinica()
  const dashboardClinica = dashboardClinicaQuery.data

  return (
    <div className="relative w-full space-y-8 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-100/40 via-secondary-100/30 to-transparent" />

      <div className="flex flex-col gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-primary-600 backdrop-blur dark:bg-neutral-900/70">
          <Sparkles className="h-3.5 w-3.5" />
          Experiência clínica Automaclinic
        </div>
        <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
          Olá, {user?.full_name?.split(' ')[0] || 'profissional'}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-300 max-w-xl">
          Esta área será o centro de insights Automaclinic: métricas de pacientes, fluxo de agendas e performance da equipe clínica.
          Enquanto preparamos as integrações com Supabase, você pode navegar pelos módulos e iniciar o cadastro das informações principais.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(53,20,76,0.45)] dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Pacientes ativos</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.pacientesAtivos ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Heart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pacientes acompanhados neste mês</p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(53,20,76,0.45)] dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Sessões de hoje</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.sessoesHoje ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <CalendarHeart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Tratamentos agendados para hoje</p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(53,20,76,0.45)] dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Taxa de adesão</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {`${dashboardClinica?.taxaAdesao ?? 0}%`}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Planos concluídos / total de planos</p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(53,20,76,0.45)] dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Protocolos em andamento</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.protocolosAtivos ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Planos em aprovado / em execução / em aprovação</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <Activity className="h-5 w-5 text-primary-500" />
              Tendência (7 dias)
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Novos pacientes e agendamentos concluídos por dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardClinica?.serieSemana ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pacientesNovos" name="Pacientes novos" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="agendamentosTotal" name="Agendamentos" stroke="#06b6d4" strokeWidth={2} />
                  <Line type="monotone" dataKey="agendamentosConcluidos" name="Concluídos" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <Layers className="h-5 w-5 text-secondary-500" />
              Tendência (30 dias)
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Visão mensal para acompanhamento de crescimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardClinica?.serieMes ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pacientesNovos" name="Pacientes novos" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="agendamentosTotal" name="Agendamentos" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="agendamentosConcluidos" name="Concluídos" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Novos pacientes (hoje)</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.pacientesNovos?.hoje ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Heart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Semana: {(dashboardClinica?.pacientesNovos?.semana ?? 0).toString()} | Mês: {(dashboardClinica?.pacientesNovos?.mes ?? 0).toString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Concluídos (hoje)</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.agendamentosConcluidos?.hoje ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <CalendarHeart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Semana: {(dashboardClinica?.agendamentosConcluidos?.semana ?? 0).toString()} | Mês: {(dashboardClinica?.agendamentosConcluidos?.mes ?? 0).toString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Conversão (hoje)</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {`${dashboardClinica?.conversaoAgendamentos?.hoje ?? 0}%`}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Semana: {`${dashboardClinica?.conversaoAgendamentos?.semana ?? 0}%`} | Mês: {`${dashboardClinica?.conversaoAgendamentos?.mes ?? 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Kanban de pacientes</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(dashboardClinica?.pacientesKanban?.novos ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Agendado: {(dashboardClinica?.pacientesKanban?.agendado ?? 0).toString()} | Concluído: {(dashboardClinica?.pacientesKanban?.concluido ?? 0).toString()} | Arquivado: {(dashboardClinica?.pacientesKanban?.arquivado ?? 0).toString()}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Disparos hoje</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(disparosStats?.hoje?.sent ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Únicos: {(disparosStats?.hoje?.unique ?? 0).toString()} | Falhas: {(disparosStats?.hoje?.failed ?? 0).toString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Disparos (7 dias)</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(disparosStats?.semana?.sent ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Únicos: {(disparosStats?.semana?.unique ?? 0).toString()} | Falhas: {(disparosStats?.semana?.failed ?? 0).toString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Disparos (30 dias)</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {(disparosStats?.mes?.sent ?? 0).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Únicos: {(disparosStats?.mes?.unique ?? 0).toString()} | Falhas: {(disparosStats?.mes?.failed ?? 0).toString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Fila de disparos</p>
              <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                {((disparosStats?.total?.scheduled ?? 0) + (disparosStats?.total?.running ?? 0)).toString()}
              </CardTitle>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Agendados: {(disparosStats?.total?.scheduled ?? 0).toString()} | Rodando: {(disparosStats?.total?.running ?? 0).toString()}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <Stethoscope className="h-5 w-5 text-secondary-500" />
              Procedimentos mais vendidos (30d)
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Ranking baseado em agendamentos concluídos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {(dashboardClinica?.topProcedimentos ?? []).length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary-200/60 bg-gradient-to-tr from-primary-50/60 via-transparent to-secondary-50/60 text-center text-sm text-neutral-400 dark:border-white/15 dark:text-neutral-500">
                  <p>Nenhum procedimento concluído encontrado nos últimos 30 dias.</p>
                </div>
              ) : (
                (dashboardClinica?.topProcedimentos ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm dark:border-white/15 dark:bg-neutral-900/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-neutral-700 dark:text-neutral-200">{it.nome}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Total: {it.total} • Concluídos: {it.concluidos} • Conversão: {it.conversao}%</div>
                    </div>
                    <span className="font-semibold text-neutral-900 dark:text-white">{it.total}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <CalendarHeart className="h-5 w-5 text-primary-500" />
              Pacotes mais vendidos (30d)
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Ranking baseado em planos de tratamento vinculados a protocolos/pacotes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {(dashboardClinica?.topPacotes ?? []).length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary-200/60 bg-gradient-to-tr from-primary-50/60 via-transparent to-secondary-50/60 text-center text-sm text-neutral-400 dark:border-white/15 dark:text-neutral-500">
                  <p>Nenhum pacote vinculado a plano encontrado nos últimos 30 dias.</p>
                </div>
              ) : (
                (dashboardClinica?.topPacotes ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-sm dark:border-white/15 dark:bg-neutral-900/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-neutral-700 dark:text-neutral-200">{it.nome}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">Total: {it.total} • Concluídos: {it.concluidos} • Conversão: {it.conversao}%</div>
                    </div>
                    <span className="font-semibold text-neutral-900 dark:text-white">{it.total}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
