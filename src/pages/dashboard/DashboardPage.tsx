import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardData, DASHBOARD_PLACEHOLDER_STATS, type PlaceholderStats } from '@/hooks/useDashboard'
import { Sparkles, CalendarHeart, Heart, Activity, Layers, Stethoscope } from 'lucide-react'

type StatAccessor<T> = (data: T) => number | undefined

interface MetricDefinition<T> {
  title: string
  description: string
  icon: typeof Heart
  accessor: StatAccessor<T>
  formatter?: (value: number | undefined) => string
}

const metricConfig: MetricDefinition<PlaceholderStats>[] = [
  {
    title: 'Pacientes ativos',
    description: 'Pacientes acompanhados neste mês',
    icon: Heart,
    accessor: (data) => data.pacientesAtivos,
  },
  {
    title: 'Sessões de hoje',
    description: 'Tratamentos agendados para hoje',
    icon: CalendarHeart,
    accessor: (data) => data.sessoesHoje,
  },
  {
    title: 'Taxa de adesão',
    description: 'Pacientes que concluíram protocolos',
    icon: Activity,
    accessor: (data) => {
      const total = data.totalPacientes || 0
      const ativos = data.pacientesAtivos || 0
      return total > 0 ? Math.round((ativos / total) * 100) : 0
    },
    formatter: (value) => `${value ?? 0}%`,
  },
  {
    title: 'Protocolos em andamento',
    description: 'Planos de tratamento ativos',
    icon: Layers,
    accessor: (data) => data.protocolosAtivos,
  },
]

export function DashboardPage() {
  const { user } = useAuthStore()
  const { stats: statsQuery } = useDashboardData()
  const statsData: PlaceholderStats = statsQuery.data ?? DASHBOARD_PLACEHOLDER_STATS

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
        {metricConfig.map(({ title, description, icon: Icon, accessor, formatter }) => {
          const rawValue = accessor(statsData)
          const value = formatter ? formatter(rawValue) : (rawValue ?? 0).toString()

          return (
            <Card
              key={title}
              className="border-white/40 bg-white/75 shadow-[0_18px_48px_-34px_rgba(53,20,76,0.35)] backdrop-blur-lg transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-28px_rgba(53,20,76,0.45)] dark:border-white/10 dark:bg-neutral-900/70"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{title}</p>
                  <CardTitle className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">
                    {value}
                  </CardTitle>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-primary-400/90 to-secondary-300/80 p-3 text-white shadow-lg">
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <Stethoscope className="h-5 w-5 text-secondary-500" />
              Evolução de pacientes
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Em breve você acompanhará adesão aos protocolos, retorno de pacientes e indicadores de satisfação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary-200/60 bg-gradient-to-tr from-primary-50/60 via-transparent to-secondary-50/60 text-center text-sm text-neutral-400 dark:border-white/15 dark:text-neutral-500">
              <p>Integração em andamento. Seus dados clínicos aparecerão aqui automaticamente.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/40 bg-white/75 shadow-[0_20px_54px_-32px_rgba(53,20,76,0.4)] backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-neutral-900 dark:text-white">
              <CalendarHeart className="h-5 w-5 text-primary-500" />
              Agenda inteligente
            </CardTitle>
            <CardDescription className="text-neutral-500 dark:text-neutral-400">
              Visualize ocupação de salas, sessões confirmadas e alertas de follow-up — conectaremos aos novos agendamentos Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm text-neutral-400 dark:text-neutral-500">
              <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 dark:border-white/15 dark:bg-neutral-900/60">
                <span>Sessões confirmadas</span>
                <span className="font-medium text-neutral-500 dark:text-neutral-300">—</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 dark:border-white/15 dark:bg-neutral-900/60">
                <span>Follow-ups pendentes</span>
                <span className="font-medium text-neutral-500 dark:text-neutral-300">—</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-4 py-3 dark:border-white/15 dark:bg-neutral-900/60">
                <span>Taxa de ocupação</span>
                <span className="font-medium text-neutral-500 dark:text-neutral-300">—</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
