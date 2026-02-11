import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Search, Filter, Calendar, User, Clock, DollarSign, Eye, Download, CalendarCheck } from 'lucide-react'
import { useAgendamentosClinica } from '@/hooks/useAgendamentosClinica'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { usePacientes } from '@/hooks/usePacientes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG = {
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  realizado: { label: 'Realizado', color: 'bg-blue-100 text-blue-800' },
}

export function AgendamentosRealizadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [profissionalFilter, setProfissionalFilter] = useState<string>('all')
  const [pacienteFilter, setPacienteFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch data
  const { data: agendamentos = [], isLoading } = useAgendamentosClinica({
    status: 'concluido',
    limit: 1000,
  })
  const { data: profissionais = [] } = useProfissionaisClinica({ limit: 1000 })
  const { data: pacientes = [] } = usePacientes({ limit: 1000 })

  // Create lookup maps
  const profissionaisMap = useMemo(() => {
    const map = new Map()
    profissionais.forEach((p: any) => map.set(p.id, p))
    return map
  }, [profissionais])

  const pacientesMap = useMemo(() => {
    const map = new Map()
    pacientes.forEach((p: any) => map.set(p.id, p))
    return map
  }, [pacientes])

  // Filter agendamentos
  const agendamentosRealizados = useMemo(() => {
    return agendamentos.filter((agendamento: any) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const paciente = pacientesMap.get(agendamento.paciente_id)
      const profissional = profissionaisMap.get(agendamento.profissional_id)
      
      const matchesSearch = !searchTerm || (
        agendamento.titulo?.toLowerCase().includes(searchLower) ||
        paciente?.nome_completo?.toLowerCase().includes(searchLower) ||
        profissional?.nome?.toLowerCase().includes(searchLower) ||
        agendamento.observacoes?.toLowerCase().includes(searchLower)
      )

      // Professional filter
      const matchesProfissional = profissionalFilter === 'all' || 
        agendamento.profissional_id === profissionalFilter

      // Patient filter
      const matchesPaciente = pacienteFilter === 'all' || 
        agendamento.paciente_id === pacienteFilter

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        agendamento.status === statusFilter

      // Date filters
      let matchesDate = true
      if (dataInicio && agendamento.data_inicio) {
        const agendamentoDate = new Date(agendamento.data_inicio)
        const filterStartDate = new Date(dataInicio)
        matchesDate = matchesDate && agendamentoDate >= filterStartDate
      }
      if (dataFim && agendamento.data_inicio) {
        const agendamentoDate = new Date(agendamento.data_inicio)
        const filterEndDate = new Date(dataFim)
        matchesDate = matchesDate && agendamentoDate <= filterEndDate
      }

      return matchesSearch && matchesProfissional && matchesPaciente && matchesStatus && matchesDate
    })
  }, [agendamentos, searchTerm, profissionalFilter, pacienteFilter, statusFilter, dataInicio, dataFim, pacientesMap, profissionaisMap])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const calculateDuration = (inicio: string, fim: string) => {
    try {
      const start = new Date(inicio)
      const end = new Date(fim)
      const diffMs = end.getTime() - start.getTime()
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return `${diffMinutes} min`
    } catch {
      return '—'
    }
  }

  const exportToCsv = () => {
    const headers = ['Data', 'Paciente', 'Profissional', 'Título', 'Status', 'Duração', 'Valor', 'Observações']
    const rows = agendamentosRealizados.map((agendamento: any) => {
      const paciente = pacientesMap.get(agendamento.paciente_id)
      const profissional = profissionaisMap.get(agendamento.profissional_id)
      
      return [
        formatDateTime(agendamento.data_inicio),
        paciente?.nome_completo || 'Paciente não encontrado',
        profissional?.nome || 'Profissional não encontrado',
        agendamento.titulo || '—',
        agendamento.status || '—',
        agendamento.data_fim ? calculateDuration(agendamento.data_inicio, agendamento.data_fim) : '—',
        agendamento.valor ? formatCurrency(agendamento.valor) : 'R$ 0,00',
        agendamento.observacoes || '—'
      ]
    })

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agendamentos-realizados-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Agendamentos Realizados</h1>
          <p className="text-sm text-muted-foreground">
            Lista detalhada de todos os agendamentos concluídos com filtros avançados
          </p>
        </div>
        <Button onClick={exportToCsv} disabled={agendamentosRealizados.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </header>

      <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Agendamentos Realizados
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente, profissional, título ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 p-4 bg-muted/20 rounded-lg">
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {profissionais.map((prof: any) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={pacienteFilter} onValueChange={setPacienteFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pacientes</SelectItem>
                    {pacientes.slice(0, 100).map((pac: any) => (
                      <SelectItem key={pac.id} value={pac.id}>
                        {pac.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <DateTimePicker
                  value={dataInicio}
                  onChange={(value) => setDataInicio(value || '')}
                  label=""
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <DateTimePicker
                  value={dataFim}
                  onChange={(value) => setDataFim(value || '')}
                  label=""
                  min={dataInicio}
                />
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Exibindo {agendamentosRealizados.length} agendamentos realizados</span>
            <span>
              Total faturado: {formatCurrency(
                agendamentosRealizados.reduce((acc: number, ag: any) => acc + (ag.valor || 0), 0)
              )}
            </span>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : agendamentosRealizados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento realizado encontrado</p>
              </div>
            ) : (
              agendamentosRealizados.map((agendamento: any) => {
                const paciente = pacientesMap.get(agendamento.paciente_id)
                const profissional = profissionaisMap.get(agendamento.profissional_id)
                const statusConfig = STATUS_CONFIG[agendamento.status as keyof typeof STATUS_CONFIG] || 
                  { label: agendamento.status, color: 'bg-gray-100 text-gray-800' }
                
                return (
                  <div
                    key={agendamento.id}
                    className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{agendamento.titulo}</h4>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{paciente?.nome_completo || 'Paciente não encontrado'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{profissional?.nome || 'Profissional não encontrado'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDateTime(agendamento.data_inicio)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {agendamento.data_fim 
                                ? calculateDuration(agendamento.data_inicio, agendamento.data_fim)
                                : '—'
                              }
                            </span>
                          </div>
                        </div>

                        {agendamento.observacoes && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {agendamento.observacoes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {agendamento.valor && (
                          <div className="flex items-center gap-1 text-green-600 font-medium">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(agendamento.valor)}</span>
                          </div>
                        )}
                        
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
