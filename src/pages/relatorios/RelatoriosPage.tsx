import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { useRelatoriosClinica } from '@/hooks/useRelatoriosClinica'
import type { RelatoriosPeriodo, RelatoriosCustomRange } from '@/services/api/relatorios-clinica'
import { downloadRelatoriosClinicaPDF, type RelatorioTipo } from '@/services/pdf/relatoriosClinicaGenerator'
import {
  ResponsiveContainer,
  LineChart as ReLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart as ReBarChart,
  Bar,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts'
import { 
  Download,
  FileText,
  TrendingUp,
  Calendar,
  Filter,
  BarChart3,
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  Loader2
} from 'lucide-react'

export function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes')
  const [activeReportType, setActiveReportType] = useState<string | null>(null)
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false)
  const [customRange, setCustomRange] = useState<RelatoriosCustomRange>({
    startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    endDate: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
  })

  const periodoQuery = useMemo<RelatoriosPeriodo>(() => {
    if (selectedPeriod === 'hoje') return 'hoje'
    if (selectedPeriod === 'semana') return 'semana'
    if (selectedPeriod === 'mes') return 'mes'
    if (selectedPeriod === 'trimestre') return 'trimestre'
    if (selectedPeriod === 'ano') return 'ano'
    if (selectedPeriod === 'personalizado') return 'personalizado'
    return 'mes'
  }, [selectedPeriod])

  const handleCustomDateApply = () => {
    setIsCustomDateOpen(false)
    // Trigger refetch with custom dates
  }

  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const relatoriosQuery = useRelatoriosClinica(periodoQuery)
  const relatorios = relatoriosQuery.data

  const currency = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  )

  const handleExportCsv = () => {
    if (!relatorios) return

    const rows: string[][] = []

    rows.push(['Período', periodoQuery])
    rows.push(['Início', relatorios.range.startIso])
    rows.push(['Fim', relatorios.range.endIso])
    rows.push([])

    rows.push(['Métricas'])
    rows.push(['Faturamento', String(relatorios.metricas.faturamento)])
    rows.push(['Ticket médio', String(relatorios.metricas.ticketMedio)])
    rows.push(['Conversão (%)', String(relatorios.metricas.conversao)])
    rows.push(['Novos clientes', String(relatorios.metricas.novosClientes)])
    rows.push(['Agendamentos (total)', String(relatorios.metricas.agendamentosTotal)])
    rows.push(['Agendamentos (concluídos)', String(relatorios.metricas.agendamentosConcluidos)])
    rows.push([])

    rows.push(['Procedimentos mais vendidos'])
    rows.push(['Posição', 'Procedimento', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
    relatorios.topProcedimentos.forEach((p, idx) => {
      rows.push([
        String(idx + 1),
        p.nome,
        String(p.total),
        String(p.concluidos),
        String(p.conversao),
        String(p.faturamento),
      ])
    })
    rows.push([])

    rows.push(['Protocolos/Pacotes mais vendidos'])
    rows.push(['Posição', 'Pacote', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
    relatorios.topPacotes.forEach((p, idx) => {
      rows.push([
        String(idx + 1),
        p.nome,
        String(p.total),
        String(p.concluidos),
        String(p.conversao),
        String(p.faturamento),
      ])
    })
    rows.push([])

    rows.push(['Performance dos profissionais'])
    rows.push(['Profissional', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
    relatorios.performanceProfissionais.forEach((p) => {
      rows.push([
        p.nome,
        String(p.total),
        String(p.concluidos),
        String(p.conversao),
        String(p.faturamento),
      ])
    })
    rows.push([])

    rows.push(['Top clientes (por faturamento)'])
    rows.push(['Cliente', 'Agendamentos', 'Concluídos', 'Faturamento'])
    relatorios.topClientes.forEach((c) => {
      rows.push([c.nome, String(c.agendamentosTotal), String(c.agendamentosConcluidos), String(c.faturamento)])
    })

    const escapeCell = (v: string) => {
      const value = v ?? ''
      const needsQuote = /["\n\r,;]/.test(value)
      const escaped = value.replace(/"/g, '""')
      return needsQuote ? `"${escaped}"` : escaped
    }

    const csv = '\uFEFF' + rows.map((r) => r.map((c) => escapeCell(String(c ?? ''))).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    const name = `relatorios-${periodoQuery}-${new Date().toISOString().slice(0, 10)}.csv`
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async (tipo?: RelatorioTipo) => {
    if (!relatorios) return
    await downloadRelatoriosClinicaPDF(
      {
        periodo: periodoQuery,
        theme: 'purple',
        tipo: tipo || 'geral',
      },
      relatorios
    )
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const toggleAllClients = () => {
    if (!relatorios) return
    if (selectedClientIds.size === relatorios.clientesAnalise.length) {
      setSelectedClientIds(new Set())
    } else {
      setSelectedClientIds(new Set(relatorios.clientesAnalise.map((c) => c.id)))
    }
  }

  const getFilteredClientes = () => {
    if (!relatorios) return []
    if (selectedClientIds.size === 0) return relatorios.clientesAnalise
    return relatorios.clientesAnalise.filter((c) => selectedClientIds.has(c.id))
  }

  const handleExportCsvByType = (tipo: RelatorioTipo) => {
    if (!relatorios) return

    const rows: string[][] = []
    const escapeCell = (v: string) => {
      const value = v ?? ''
      const needsQuote = /["\n\r,;]/.test(value)
      const escaped = value.replace(/"/g, '""')
      return needsQuote ? `"${escaped}"` : escaped
    }

    rows.push(['Período', periodoQuery])
    rows.push(['Início', relatorios.range.startIso])
    rows.push(['Fim', relatorios.range.endIso])
    rows.push([])

    switch (tipo) {
      case 'vendas':
        rows.push(['Métricas'])
        rows.push(['Faturamento', String(relatorios.metricas.faturamento)])
        rows.push(['Ticket médio', String(relatorios.metricas.ticketMedio)])
        rows.push(['Conversão (%)', String(relatorios.metricas.conversao)])
        rows.push(['Novos clientes', String(relatorios.metricas.novosClientes)])
        rows.push([])
        rows.push(['Procedimentos mais vendidos'])
        rows.push(['Posição', 'Procedimento', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
        relatorios.topProcedimentos.forEach((p, idx) => {
          rows.push([String(idx + 1), p.nome, String(p.total), String(p.concluidos), String(p.conversao), String(p.faturamento)])
        })
        rows.push([])
        rows.push(['Protocolos/Pacotes mais vendidos'])
        rows.push(['Posição', 'Pacote', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
        relatorios.topPacotes.forEach((p, idx) => {
          rows.push([String(idx + 1), p.nome, String(p.total), String(p.concluidos), String(p.conversao), String(p.faturamento)])
        })
        break

      case 'vendedores':
        rows.push(['Performance dos profissionais'])
        rows.push(['Profissional', 'Agendamentos', 'Concluídos', 'Procedimentos', 'Pacotes', 'Faturamento', 'Status'])
        relatorios.profissionaisAnalise.forEach((p) => {
          rows.push([
            p.nome,
            String(p.agendamentosTotal),
            String(p.agendamentosConcluidos),
            String(p.procedimentosVendidos),
            String(p.pacotesVendidos),
            String(p.faturamento),
            p.status.map((s) => `${s.status}: ${s.total}`).join(' | '),
          ])
        })
        break

      case 'produtos':
        rows.push(['Procedimentos mais vendidos'])
        rows.push(['Posição', 'Procedimento', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
        relatorios.topProcedimentos.forEach((p, idx) => {
          rows.push([String(idx + 1), p.nome, String(p.total), String(p.concluidos), String(p.conversao), String(p.faturamento)])
        })
        rows.push([])
        rows.push(['Protocolos/Pacotes mais vendidos'])
        rows.push(['Posição', 'Pacote', 'Agendamentos', 'Concluídos', 'Conversão (%)', 'Faturamento'])
        relatorios.topPacotes.forEach((p, idx) => {
          rows.push([String(idx + 1), p.nome, String(p.total), String(p.concluidos), String(p.conversao), String(p.faturamento)])
        })
        break

      case 'financeiro':
        rows.push(['Métricas'])
        rows.push(['Faturamento', String(relatorios.metricas.faturamento)])
        rows.push(['Ticket médio', String(relatorios.metricas.ticketMedio)])
        rows.push(['Conversão (%)', String(relatorios.metricas.conversao)])
        rows.push([])
        rows.push(['Faturamento por dia'])
        rows.push(['Data', 'Faturamento', 'Agendamentos', 'Concluídos'])
        relatorios.serieDiaria.forEach((s) => {
          rows.push([s.dia, String(s.faturamento), String(s.agendamentosTotal), String(s.agendamentosConcluidos)])
        })
        break

      case 'pipeline':
        rows.push(['Distribuição por status'])
        rows.push(['Status', 'Total', 'Percentual'])
        const total = relatorios.distribuicaoStatus.reduce((acc, s) => acc + s.total, 0)
        relatorios.distribuicaoStatus.forEach((s) => {
          rows.push([s.status, String(s.total), `${total ? Math.round((s.total / total) * 100) : 0}%`])
        })
        break

      case 'clientes':
        const clientesToExport = getFilteredClientes()
        rows.push(['Top clientes (por faturamento)'])
        rows.push(['Cliente', 'Agendamentos', 'Concluídos', 'Faturamento'])
        relatorios.topClientes.forEach((c) => {
          rows.push([c.nome, String(c.agendamentosTotal), String(c.agendamentosConcluidos), String(c.faturamento)])
        })
        rows.push([])
        rows.push(['Análise detalhada de clientes'])
        rows.push(['Cliente', 'Concluídos', 'Faturamento', 'Ticket Médio', 'Taxa Conclusão', 'Procedimentos', 'Pacotes'])
        clientesToExport.forEach((c) => {
          const ticketMedio = c.agendamentosConcluidos > 0 ? c.faturamento / c.agendamentosConcluidos : 0
          const taxaConclusao = c.agendamentosTotal > 0 ? Math.round((c.agendamentosConcluidos / c.agendamentosTotal) * 100) : 0
          rows.push([
            c.nome,
            String(c.agendamentosConcluidos),
            String(c.faturamento),
            String(ticketMedio.toFixed(2)),
            `${taxaConclusao}%`,
            c.procedimentos.map((p) => `${p.nome} (${p.total})`).join(', ') || '—',
            c.pacotes.map((p) => `${p.nome} (${p.total})`).join(', ') || '—',
          ])
        })
        break
    }

    const csv = '\uFEFF' + rows.map((r) => r.map((c) => escapeCell(String(c ?? ''))).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${tipo}-${periodoQuery}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  }

  const openReportViewer = (tipo: string) => {
    setActiveReportType(tipo)
    setIsReportViewerOpen(true)
  }

  const getPeriodoLabel = (periodo: string): string => {
    const labels: Record<string, string> = {
      hoje: 'Hoje',
      semana: 'Esta Semana',
      mes: 'Este Mês',
      trimestre: 'Trimestre',
      ano: 'Este Ano',
    }
    return labels[periodo] || periodo
  }

  const relatoriosDisponiveis = [
    {
      id: 1,
      titulo: 'Relatório de Procedimentos Realizados',
      descricao: 'Análise completa dos procedimentos realizados',
      tipo: 'vendas',
      icon: ShoppingCart,
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 2,
      titulo: 'Performance de Profissionais',
      descricao: 'Desempenho individual e metas atingidas',
      tipo: 'vendedores',
      icon: Users,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 3,
      titulo: 'Análise de Procedimentos',
      descricao: 'Procedimentos mais realizados e análise',
      tipo: 'produtos',
      icon: Package,
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 4,
      titulo: 'Relatório de Pacotes Vendidos',
      descricao: 'Receitas, pacotes vendidos e lucratividade',
      tipo: 'financeiro',
      icon: DollarSign,
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      id: 5,
      titulo: 'Relatórios de Planos de Tratamento Criados',
      descricao: 'Status de planos criados e conversão',
      tipo: 'pipeline',
      icon: TrendingUp,
      color: 'from-indigo-400 to-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      id: 6,
      titulo: 'Análise de Clientes',
      descricao: 'Segmentação e comportamento',
      tipo: 'clientes',
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    },
  ]

  const statusColorByKey = useMemo(() => {
    return {
      concluido: '#22c55e',
      confirmado: '#06b6d4',
      agendado: '#8b5cf6',
      cancelado: '#ef4444',
      pendente: '#f59e0b',
      desconhecido: '#94a3b8',
    } as Record<string, string>
  }, [])

  const pieData = useMemo(() => {
    return (relatorios?.distribuicaoStatus ?? []).map((s) => ({
      name: s.status,
      value: s.total,
    }))
  }, [relatorios])

  const reportTitle = useMemo(() => {
    if (activeReportType === 'vendas') return 'Relatório de Procedimentos Realizados'
    if (activeReportType === 'vendedores') return 'Performance de Profissionais'
    if (activeReportType === 'produtos') return 'Análise de Procedimentos'
    if (activeReportType === 'financeiro') return 'Relatório de Pacotes Vendidos'
    if (activeReportType === 'pipeline') return 'Relatórios de Planos de Tratamento Criados'
    if (activeReportType === 'clientes') return 'Análise de Clientes'
    return 'Relatório'
  }, [activeReportType])

  const pipelineSteps = useMemo(() => {
    const map = new Map<string, number>((relatorios?.distribuicaoStatus ?? []).map((s) => [String(s.status), s.total]))
    const total = Array.from(map.values()).reduce((acc, v) => acc + (Number(v) || 0), 0)
    const agendado = map.get('agendado') ?? 0
    const confirmado = map.get('confirmado') ?? 0
    const concluido = map.get('concluido') ?? 0
    const cancelado = map.get('cancelado') ?? 0
    const outros = Math.max(0, total - agendado - confirmado - concluido - cancelado)

    return {
      total,
      steps: [
        { key: 'agendado', label: 'Agendados', value: agendado, color: '#8b5cf6' },
        { key: 'confirmado', label: 'Confirmados', value: confirmado, color: '#06b6d4' },
        { key: 'concluido', label: 'Concluídos', value: concluido, color: '#22c55e' },
        { key: 'cancelado', label: 'Cancelados', value: cancelado, color: '#ef4444' },
        { key: 'outros', label: 'Outros', value: outros, color: '#94a3b8' },
      ].filter((s) => s.value > 0),
    }
  }, [relatorios])

  const metricas = useMemo(
    () =>
      relatorios
        ? [
            {
              titulo: 'Faturamento',
              valor: currency.format(relatorios.metricas.faturamento),
              comparacao: 'Agendamentos concluídos no período',
            },
            {
              titulo: 'Ticket Médio',
              valor: currency.format(relatorios.metricas.ticketMedio),
              comparacao: 'Média por agendamento concluído',
            },
            {
              titulo: 'Taxa de Conversão',
              valor: `${relatorios.metricas.conversao}%`,
              comparacao: `${relatorios.metricas.agendamentosConcluidos}/${relatorios.metricas.agendamentosTotal} concluídos`,
            },
            {
              titulo: 'Novos Clientes',
              valor: String(relatorios.metricas.novosClientes),
              comparacao: 'Cadastros de pacientes no período',
            },
          ]
        : [],
    [currency, relatorios]
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Relatórios e Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Análises e insights da sua clínica</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'hoje', label: 'Hoje' },
          { value: 'semana', label: 'Esta Semana' },
          { value: 'mes', label: 'Este Mês' },
          { value: 'trimestre', label: 'Trimestre' },
          { value: 'ano', label: 'Este Ano' },
        ].map((period) => (
          <Button
            key={period.value}
            variant={selectedPeriod === period.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod(period.value)}
            className="whitespace-nowrap"
          >
            <Calendar className="mr-2 h-4 w-4" />
            {period.label}
          </Button>
        ))}
        <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={selectedPeriod === 'personalizado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedPeriod('personalizado')
                setIsCustomDateOpen(true)
              }}
              className="whitespace-nowrap"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Personalizado
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-white dark:bg-gray-800" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-base text-black dark:text-white">Período Personalizado</h4>
                <p className="text-sm text-black dark:text-gray-300">Selecione a data e hora de início e fim</p>
              </div>
              <div className="space-y-4">
                <DateTimePicker
                  value={customRange.startDate}
                  onChange={(value) => {
                    if (value) {
                      setCustomRange((prev) => ({ ...prev, startDate: value }))
                    }
                  }}
                  label="Data e Hora de Início"
                />
                <DateTimePicker
                  value={customRange.endDate}
                  onChange={(value) => {
                    if (value) {
                      setCustomRange((prev) => ({ ...prev, endDate: value }))
                    }
                  }}
                  label="Data e Hora de Fim"
                  min={customRange.startDate}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    setIsCustomDateOpen(false)
                    setSelectedPeriod('mes')
                  }}
                  className="text-sm text-foreground border-border"
                >
                  Cancelar
                </Button>
                <Button size="default" onClick={handleCustomDateApply} className="text-sm">
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Métricas Resumo */}
      <div className="w-full grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {relatoriosQuery.isLoading ? (
          <Card>
            <CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando métricas...
            </CardContent>
          </Card>
        ) : relatoriosQuery.isError ? (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="p-6 text-sm text-red-600">
              {(relatoriosQuery.error as any)?.message || 'Erro ao carregar relatórios'}
            </CardContent>
          </Card>
        ) : (
          metricas.map((metrica) => (
            <Card key={metrica.titulo}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{metrica.titulo}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrica.valor}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{metrica.comparacao}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Charts Preview */}
      <div className="w-full grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Procedimentos realizados por Período</CardTitle>
            <CardDescription>
              Evolução dos procedimentos realizados nos últimos 12 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={relatorios?.serieDiaria ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      if (name === 'faturamento') return [currency.format(Number(value || 0)), 'Faturamento']
                      return [String(value ?? ''), String(name)]
                    }}
                  />
                  <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>
              Participação de cada categoria nas vendas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Tooltip />
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={55} paddingAngle={2}>
                    {pieData.map((entry, index) => {
                      const key = String(entry.name || 'desconhecido')
                      const color = statusColorByKey[key] || '#94a3b8'
                      return <Cell key={`cell-${index}`} fill={color} />
                    })}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Relatórios Disponíveis</CardTitle>
              <CardDescription>
                Selecione um relatório para visualizar ou baixar
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {relatoriosDisponiveis.map((relatorio) => {
              const Icon = relatorio.icon
              return (
                <div
                  key={relatorio.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${relatorio.bgColor}`}>
                      <Icon className={`h-5 w-5 ${relatorio.color}`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {relatorio.titulo}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {relatorio.descricao}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openReportViewer(relatorio.tipo)}>
                      <FileText className="mr-1 h-3 w-3" />
                      Visualizar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1" disabled={!relatorios}>
                          <Download className="mr-1 h-3 w-3" />
                          Baixar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportCsvByType(relatorio.tipo as RelatorioTipo)}>
                          Baixar CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void handleExportPdf(relatorio.tipo as RelatorioTipo)}>
                          Baixar PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReportViewerOpen} onOpenChange={setIsReportViewerOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reportTitle}</DialogTitle>
            <DialogDescription>
              Período: {getPeriodoLabel(selectedPeriod)} • {relatorios ? `${new Date(relatorios.range.startIso).toLocaleDateString('pt-BR')} - ${new Date(relatorios.range.endIso).toLocaleDateString('pt-BR')}` : ''}
            </DialogDescription>
          </DialogHeader>

          {!relatorios ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-6">
              {activeReportType === 'vendas' || !activeReportType ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {metricas.map((m) => (
                      <Card key={m.titulo}>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{m.titulo}</div>
                          <div className="mt-1 text-lg font-semibold">{m.valor}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{m.comparacao}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Faturamento por dia</CardTitle>
                        <CardDescription>Evolução diária no período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReLineChart data={relatorios.serieDiaria}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(value: any) => currency.format(Number(value || 0))} />
                              <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#8b5cf6" strokeWidth={2} />
                            </ReLineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Agendamentos por dia</CardTitle>
                        <CardDescription>Total vs Concluídos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReLineChart data={relatorios.serieDiaria}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="agendamentosTotal" name="Total" stroke="#06b6d4" strokeWidth={2} />
                              <Line type="monotone" dataKey="agendamentosConcluidos" name="Concluídos" stroke="#22c55e" strokeWidth={2} />
                            </ReLineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Procedimentos mais vendidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="text-xs text-muted-foreground uppercase border-b">
                              <tr>
                                <th className="px-2 py-2 text-left">Procedimento</th>
                                <th className="px-2 py-2 text-right">Agend.</th>
                                <th className="px-2 py-2 text-right">Concl.</th>
                                <th className="px-2 py-2 text-right">Faturamento</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {relatorios.topProcedimentos.map((p) => (
                                <tr key={p.id} className="border-b">
                                  <td className="px-2 py-2">{p.nome}</td>
                                  <td className="px-2 py-2 text-right">{p.total}</td>
                                  <td className="px-2 py-2 text-right">{p.concluidos}</td>
                                  <td className="px-2 py-2 text-right font-medium">{currency.format(p.faturamento)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Protocolos/Pacotes mais vendidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="text-xs text-muted-foreground uppercase border-b">
                              <tr>
                                <th className="px-2 py-2 text-left">Pacote</th>
                                <th className="px-2 py-2 text-right">Agend.</th>
                                <th className="px-2 py-2 text-right">Concl.</th>
                                <th className="px-2 py-2 text-right">Faturamento</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {relatorios.topPacotes.map((p) => (
                                <tr key={p.id} className="border-b">
                                  <td className="px-2 py-2">{p.nome}</td>
                                  <td className="px-2 py-2 text-right">{p.total}</td>
                                  <td className="px-2 py-2 text-right">{p.concluidos}</td>
                                  <td className="px-2 py-2 text-right font-medium">{currency.format(p.faturamento)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}

              {activeReportType === 'vendedores' ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Faturamento</div>
                        <div className="mt-1 text-lg font-semibold">{currency.format(relatorios.metricas.faturamento)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Somente concluídos no período</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Agendamentos (total)</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.metricas.agendamentosTotal}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Todos os status</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Concluídos</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.metricas.agendamentosConcluidos}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Conversão: {relatorios.metricas.conversao}%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Profissionais Ativos</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.profissionaisAnalise.length}</div>
                        <div className="mt-1 text-xs text-muted-foreground">No período</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Faturamento por profissional</CardTitle>
                        <CardDescription>Ranking e comparação no período</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={relatorios.profissionaisAnalise.slice(0, 10)}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="nome" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip formatter={(v: any) => currency.format(Number(v || 0))} />
                              <Bar dataKey="faturamento" name="Faturamento" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </ReBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Itens vendidos por profissional</CardTitle>
                        <CardDescription>Procedimentos e pacotes concluídos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={relatorios.profissionaisAnalise.slice(0, 10)}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="nome" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="procedimentosVendidos" name="Procedimentos" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="pacotesVendidos" name="Pacotes" fill="#22c55e" radius={[6, 6, 0, 0]} />
                            </ReBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo por profissional</CardTitle>
                      <CardDescription>Status, vendidos e atividades</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="text-xs text-muted-foreground uppercase border-b">
                            <tr>
                              <th className="px-2 py-2 text-left">Profissional</th>
                              <th className="px-2 py-2 text-right">Agend.</th>
                              <th className="px-2 py-2 text-right">Concl.</th>
                              <th className="px-2 py-2 text-right">Proced.</th>
                              <th className="px-2 py-2 text-right">Pacotes</th>
                              <th className="px-2 py-2 text-right">Faturamento</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {relatorios.profissionaisAnalise.slice(0, 15).map((p) => (
                              <tr key={p.id} className="border-b">
                                <td className="px-2 py-2">
                                  <div className="font-medium">{p.nome}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {p.status.slice(0, 3).map((s) => `${s.status}: ${s.total}`).join(' • ')}
                                  </div>
                                </td>
                                <td className="px-2 py-2 text-right">{p.agendamentosTotal}</td>
                                <td className="px-2 py-2 text-right">{p.agendamentosConcluidos}</td>
                                <td className="px-2 py-2 text-right">{p.procedimentosVendidos}</td>
                                <td className="px-2 py-2 text-right">{p.pacotesVendidos}</td>
                                <td className="px-2 py-2 text-right font-medium">{currency.format(p.faturamento)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {activeReportType === 'pipeline' ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total no período</div>
                        <div className="mt-1 text-lg font-semibold">{pipelineSteps.total}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Todos os status</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Agendados</div>
                        <div className="mt-1 text-lg font-semibold">{pipelineSteps.steps.find((s) => s.key === 'agendado')?.value ?? 0}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Entrada do funil</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Confirmados</div>
                        <div className="mt-1 text-lg font-semibold">{pipelineSteps.steps.find((s) => s.key === 'confirmado')?.value ?? 0}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Prontos para atendimento</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Taxa de Conversão</div>
                        <div className="mt-1 text-lg font-semibold">
                          {pipelineSteps.total > 0
                            ? Math.round(((pipelineSteps.steps.find((s) => s.key === 'concluido')?.value ?? 0) / pipelineSteps.total) * 100)
                            : 0}%
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Agendado → Concluído</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Funil de conversão</CardTitle>
                        <CardDescription>Visualização do fluxo de agendamentos</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {pipelineSteps.steps.map((s, idx) => {
                            const pct = pipelineSteps.total ? Math.round((s.value / pipelineSteps.total) * 100) : 0
                            const prevStep = idx > 0 ? pipelineSteps.steps[idx - 1] : null
                            const conversionFromPrev = prevStep && prevStep.value > 0
                              ? Math.round((s.value / prevStep.value) * 100)
                              : 100
                            
                            return (
                              <div key={s.key}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                                    <span className="font-medium">{s.label}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {idx > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {conversionFromPrev}% do anterior
                                      </span>
                                    )}
                                    <span className="font-semibold">{s.value}</span>
                                    <span className="text-muted-foreground">({pct}%)</span>
                                  </div>
                                </div>
                                <div className="h-8 rounded-lg" style={{ width: `${pct}%`, background: s.color, opacity: 0.8 }} />
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Distribuição por status</CardTitle>
                        <CardDescription>Proporção de cada etapa</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Tooltip formatter={(value: any) => `${value} agendamentos`} />
                              <Pie
                                data={pipelineSteps.steps}
                                dataKey="value"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label={({ label, value }) => `${label}: ${value}`}
                                labelLine={{ stroke: '#888', strokeWidth: 1 }}
                              >
                                {pipelineSteps.steps.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </RePieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Taxas de conversão entre etapas</CardTitle>
                      <CardDescription>Eficiência de cada transição no funil</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {pipelineSteps.steps.map((s, idx) => {
                          if (idx === 0) return null
                          const prevStep = pipelineSteps.steps[idx - 1]
                          const conversionRate = prevStep.value > 0 ? Math.round((s.value / prevStep.value) * 100) : 0
                          
                          return (
                            <div key={s.key} className="p-4 border rounded-lg">
                              <div className="text-xs text-muted-foreground mb-1">
                                {prevStep.label} → {s.label}
                              </div>
                              <div className="text-2xl font-bold" style={{ color: s.color }}>
                                {conversionRate}%
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {s.value} de {prevStep.value}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {activeReportType === 'clientes' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Seleção de Clientes</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedClientIds.size === 0
                          ? 'Todos os clientes serão incluídos no relatório'
                          : `${selectedClientIds.size} cliente(s) selecionado(s)`}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleAllClients}>
                      {selectedClientIds.size === relatorios.clientesAnalise.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total de Clientes</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.clientesAnalise.length}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {selectedClientIds.size > 0 ? `${selectedClientIds.size} selecionados` : 'No período'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Faturamento Total</div>
                        <div className="mt-1 text-lg font-semibold">{currency.format(relatorios.clientesAnalise.reduce((acc, c) => acc + c.faturamento, 0))}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Todos os clientes</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Ticket Médio</div>
                        <div className="mt-1 text-lg font-semibold">
                          {currency.format(
                            relatorios.clientesAnalise.length > 0
                              ? relatorios.clientesAnalise.reduce((acc, c) => acc + c.faturamento, 0) / relatorios.clientesAnalise.length
                              : 0
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Por cliente</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Taxa de Conclusão</div>
                        <div className="mt-1 text-lg font-semibold">
                          {relatorios.clientesAnalise.length > 0
                            ? Math.round(
                                (relatorios.clientesAnalise.reduce((acc, c) => acc + c.agendamentosConcluidos, 0) /
                                  relatorios.clientesAnalise.reduce((acc, c) => acc + c.agendamentosTotal, 0)) *
                                  100
                              )
                            : 0}%
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Média geral</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Análise detalhada de clientes</CardTitle>
                      <CardDescription>Histórico completo de cada cliente no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {relatorios.clientesAnalise.map((c) => {
                          const ticketMedio = c.agendamentosConcluidos > 0 ? c.faturamento / c.agendamentosConcluidos : 0
                          const taxaConclusao = c.agendamentosTotal > 0 ? Math.round((c.agendamentosConcluidos / c.agendamentosTotal) * 100) : 0
                          const isSelected = selectedClientIds.has(c.id)
                          
                          return (
                            <div
                              key={c.id}
                              className={`rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer ${
                                isSelected ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => toggleClientSelection(c.id)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleClientSelection(c.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <div className="font-semibold text-base">{c.nome}</div>
                                    <div className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                      {taxaConclusao}% conclusão
                                    </div>
                                  </div>
                                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                      <div className="text-xs text-muted-foreground">Faturamento</div>
                                      <div className="text-sm font-semibold">{currency.format(c.faturamento)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Ticket Médio</div>
                                      <div className="text-sm font-semibold">{currency.format(ticketMedio)}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Agendamentos</div>
                                      <div className="text-sm font-semibold">{c.agendamentosTotal}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-muted-foreground">Concluídos</div>
                                      <div className="text-sm font-semibold">{c.agendamentosConcluidos}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2">
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">Procedimentos Realizados</div>
                                  {c.procedimentos.length > 0 ? (
                                    <div className="space-y-1">
                                      {c.procedimentos.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">{p.nome}</span>
                                          <span className="font-medium">{p.total}x</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">Nenhum procedimento</div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-muted-foreground mb-2">Pacotes/Protocolos</div>
                                  {c.pacotes.length > 0 ? (
                                    <div className="space-y-1">
                                      {c.pacotes.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">{p.nome}</span>
                                          <span className="font-medium">{p.total}x</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">Nenhum pacote</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : null}

              {activeReportType === 'produtos' ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total de Procedimentos</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.topProcedimentos.length}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Diferentes no período</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Total de Pacotes</div>
                        <div className="mt-1 text-lg font-semibold">{relatorios.topPacotes.length}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Diferentes no período</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Conversão Média</div>
                        <div className="mt-1 text-lg font-semibold">
                          {relatorios.topProcedimentos.length > 0
                            ? Math.round(
                                relatorios.topProcedimentos.reduce((acc, p) => acc + p.conversao, 0) / relatorios.topProcedimentos.length
                              )
                            : 0}%
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Procedimentos</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Faturamento Total</div>
                        <div className="mt-1 text-lg font-semibold">{currency.format(relatorios.metricas.faturamento)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Todos os produtos</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Top 10 Procedimentos</CardTitle>
                        <CardDescription>Ranking por faturamento</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={relatorios.topProcedimentos.slice(0, 10)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis type="number" tick={{ fontSize: 10 }} />
                              <YAxis dataKey="nome" type="category" tick={{ fontSize: 9 }} width={100} />
                              <Tooltip formatter={(v: any) => currency.format(Number(v || 0))} />
                              <Bar dataKey="faturamento" name="Faturamento" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                            </ReBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Taxa de Conversão</CardTitle>
                        <CardDescription>Procedimentos por taxa de conclusão</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={relatorios.topProcedimentos.slice(0, 10)} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} />
                              <YAxis dataKey="nome" type="category" tick={{ fontSize: 9 }} width={100} />
                              <Tooltip formatter={(v: any) => `${v}%`} />
                              <Bar dataKey="conversao" name="Conversão (%)" fill="#22c55e" radius={[0, 6, 6, 0]} />
                            </ReBarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Procedimentos mais vendidos</CardTitle>
                        <CardDescription>Volume e faturamento detalhado</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="text-xs text-muted-foreground uppercase border-b">
                              <tr>
                                <th className="px-2 py-2 text-left">Procedimento</th>
                                <th className="px-2 py-2 text-right">Agend.</th>
                                <th className="px-2 py-2 text-right">Concl.</th>
                                <th className="px-2 py-2 text-right">Conv.</th>
                                <th className="px-2 py-2 text-right">Faturamento</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {relatorios.topProcedimentos.map((p, idx) => (
                                <tr key={p.id} className="border-b hover:bg-muted/50">
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                                      <span>{p.nome}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-right">{p.total}</td>
                                  <td className="px-2 py-2 text-right">{p.concluidos}</td>
                                  <td className="px-2 py-2 text-right">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      p.conversao >= 80 ? 'bg-green-100 text-green-700' :
                                      p.conversao >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {p.conversao}%
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right font-medium">{currency.format(p.faturamento)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Protocolos/Pacotes mais vendidos</CardTitle>
                        <CardDescription>Volume e faturamento detalhado</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="text-xs text-muted-foreground uppercase border-b">
                              <tr>
                                <th className="px-2 py-2 text-left">Pacote</th>
                                <th className="px-2 py-2 text-right">Agend.</th>
                                <th className="px-2 py-2 text-right">Concl.</th>
                                <th className="px-2 py-2 text-right">Conv.</th>
                                <th className="px-2 py-2 text-right">Faturamento</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {relatorios.topPacotes.map((p, idx) => (
                                <tr key={p.id} className="border-b hover:bg-muted/50">
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                                      <span>{p.nome}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-right">{p.total}</td>
                                  <td className="px-2 py-2 text-right">{p.concluidos}</td>
                                  <td className="px-2 py-2 text-right">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      p.conversao >= 80 ? 'bg-green-100 text-green-700' :
                                      p.conversao >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {p.conversao}%
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right font-medium">{currency.format(p.faturamento)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}


              {activeReportType === 'financeiro' ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {metricas.map((m) => (
                      <Card key={m.titulo}>
                        <CardContent className="p-4">
                          <div className="text-xs text-muted-foreground">{m.titulo}</div>
                          <div className="mt-1 text-lg font-semibold">{m.valor}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{m.comparacao}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Evolução do faturamento</CardTitle>
                      <CardDescription>Faturamento diário no período selecionado</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReLineChart data={relatorios.serieDiaria}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(value: any) => currency.format(Number(value || 0))} />
                            <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Breakdown de receitas</CardTitle>
                        <CardDescription>Contribuição por categoria</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Procedimentos</span>
                              <span className="text-sm font-semibold">
                                {currency.format(relatorios.topProcedimentos.reduce((acc, p) => acc + p.faturamento, 0))}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-purple-500"
                                style={{
                                  width: `${relatorios.metricas.faturamento > 0
                                    ? (relatorios.topProcedimentos.reduce((acc, p) => acc + p.faturamento, 0) / relatorios.metricas.faturamento) * 100
                                    : 0}%`
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Pacotes/Protocolos</span>
                              <span className="text-sm font-semibold">
                                {currency.format(relatorios.topPacotes.reduce((acc, p) => acc + p.faturamento, 0))}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-green-500"
                                style={{
                                  width: `${relatorios.metricas.faturamento > 0
                                    ? (relatorios.topPacotes.reduce((acc, p) => acc + p.faturamento, 0) / relatorios.metricas.faturamento) * 100
                                    : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Estatísticas do período</CardTitle>
                        <CardDescription>Resumo financeiro</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm text-muted-foreground">Maior faturamento diário</span>
                            <span className="text-sm font-semibold">
                              {currency.format(Math.max(...relatorios.serieDiaria.map((s) => s.faturamento)))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm text-muted-foreground">Média diária</span>
                            <span className="text-sm font-semibold">
                              {currency.format(
                                relatorios.serieDiaria.length > 0
                                  ? relatorios.serieDiaria.reduce((acc, s) => acc + s.faturamento, 0) / relatorios.serieDiaria.length
                                  : 0
                              )}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b">
                            <span className="text-sm text-muted-foreground">Total de dias com faturamento</span>
                            <span className="text-sm font-semibold">
                              {relatorios.serieDiaria.filter((s) => s.faturamento > 0).length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-muted-foreground">Agendamentos concluídos</span>
                            <span className="text-sm font-semibold">{relatorios.metricas.agendamentosConcluidos}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsReportViewerOpen(false)}>
              Fechar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" disabled={!relatorios}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportCsvByType((activeReportType as RelatorioTipo) || 'geral')}>Baixar CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExportPdf((activeReportType as RelatorioTipo) || 'geral')}>Baixar PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full grid gap-4 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Procedimentos Mais Vendidos</CardTitle>
            <CardDescription>Baseado em agendamentos no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-left">#</th>
                    <th className="px-2 py-3 text-left">Procedimento</th>
                    <th className="px-2 py-3 text-right">Agend.</th>
                    <th className="px-2 py-3 text-right">Concl.</th>
                    <th className="px-2 py-3 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(relatorios?.topProcedimentos ?? []).map((row, idx) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-3 font-medium text-gray-900 dark:text-white">{idx + 1}</td>
                      <td className="px-2 py-3 text-gray-900 dark:text-white">{row.nome}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.total}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.concluidos}</td>
                      <td className="px-2 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {currency.format(row.faturamento)}
                      </td>
                    </tr>
                  ))}
                  {relatorios && relatorios.topProcedimentos.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-sm text-muted-foreground" colSpan={5}>
                        Sem dados no período
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protocolos/Pacotes Mais Vendidos</CardTitle>
            <CardDescription>Baseado em agendamentos vinculados a planos de tratamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-left">#</th>
                    <th className="px-2 py-3 text-left">Pacote</th>
                    <th className="px-2 py-3 text-right">Agend.</th>
                    <th className="px-2 py-3 text-right">Concl.</th>
                    <th className="px-2 py-3 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(relatorios?.topPacotes ?? []).map((row, idx) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-3 font-medium text-gray-900 dark:text-white">{idx + 1}</td>
                      <td className="px-2 py-3 text-gray-900 dark:text-white">{row.nome}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.total}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.concluidos}</td>
                      <td className="px-2 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {currency.format(row.faturamento)}
                      </td>
                    </tr>
                  ))}
                  {relatorios && relatorios.topPacotes.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-sm text-muted-foreground" colSpan={5}>
                        Sem dados no período
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full grid gap-4 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Profissionais</CardTitle>
            <CardDescription>Atendimentos e faturamento por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-left">Profissional</th>
                    <th className="px-2 py-3 text-right">Agend.</th>
                    <th className="px-2 py-3 text-right">Concl.</th>
                    <th className="px-2 py-3 text-right">Conversão</th>
                    <th className="px-2 py-3 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(relatorios?.performanceProfissionais ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-3 text-gray-900 dark:text-white">{row.nome}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.total}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.concluidos}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.conversao}%</td>
                      <td className="px-2 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {currency.format(row.faturamento)}
                      </td>
                    </tr>
                  ))}
                  {relatorios && relatorios.performanceProfissionais.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-sm text-muted-foreground" colSpan={5}>
                        Sem dados no período
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Clientes</CardTitle>
            <CardDescription>Clientes com maior faturamento no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-2 py-3 text-left">Cliente</th>
                    <th className="px-2 py-3 text-right">Agend.</th>
                    <th className="px-2 py-3 text-right">Concl.</th>
                    <th className="px-2 py-3 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(relatorios?.topClientes ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-3 text-gray-900 dark:text-white">{row.nome}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.agendamentosTotal}</td>
                      <td className="px-2 py-3 text-right text-gray-900 dark:text-white">{row.agendamentosConcluidos}</td>
                      <td className="px-2 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {currency.format(row.faturamento)}
                      </td>
                    </tr>
                  ))}
                  {relatorios && relatorios.topClientes.length === 0 ? (
                    <tr>
                      <td className="px-2 py-6 text-center text-sm text-muted-foreground" colSpan={4}>
                        Sem dados no período
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
