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
import { Search, Filter, Calendar, User, Stethoscope, Clock, DollarSign, Eye, Download } from 'lucide-react'
import { useAgendamentosClinica } from '@/hooks/useAgendamentosClinica'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { usePacientes } from '@/hooks/usePacientes'
import { useProcedimentos } from '@/hooks/useProcedimentos'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ProcedimentosRealizadosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [profissionalFilter, setProfissionalFilter] = useState<string>('all')
  const [pacienteFilter, setPacienteFilter] = useState<string>('all')
  const [procedimentoFilter, setProcedimentoFilter] = useState<string>('all')
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
  const { data: procedimentos = [] } = useProcedimentos({ limit: 1000 } as any)

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

  const procedimentosMap = useMemo(() => {
    const map = new Map()
    procedimentos.forEach((p: any) => map.set(p.id, p))
    return map
  }, [procedimentos])

  // Filter agendamentos to show only those with procedures
  const procedimentosRealizados = useMemo(() => {
    return agendamentos.filter((agendamento: any) => {
      // Only show agendamentos that have procedures (not just packages)
      const hasProcedures = agendamento.procedimentos_ids && agendamento.procedimentos_ids.length > 0
      
      if (!hasProcedures) return false

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

      // Procedure filter
      const matchesProcedimento = procedimentoFilter === 'all' || 
        (agendamento.procedimentos_ids && agendamento.procedimentos_ids.includes(procedimentoFilter))

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

      return matchesSearch && matchesProfissional && matchesPaciente && matchesProcedimento && matchesDate
    })
  }, [agendamentos, searchTerm, profissionalFilter, pacienteFilter, procedimentoFilter, dataInicio, dataFim, pacientesMap, profissionaisMap])

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
    const headers = ['Data', 'Paciente', 'Profissional', 'Procedimentos', 'Duração', 'Valor', 'Observações']
    const rows = procedimentosRealizados.map((agendamento: any) => {
      const paciente = pacientesMap.get(agendamento.paciente_id)
      const profissional = profissionaisMap.get(agendamento.profissional_id)
      const procedimentosNomes = (agendamento.procedimentos_ids || [])
        .map((id: string) => procedimentosMap.get(id)?.nome || 'Procedimento não encontrado')
        .join(', ')
      
      return [
        formatDateTime(agendamento.data_inicio),
        paciente?.nome_completo || 'Paciente não encontrado',
        profissional?.nome || 'Profissional não encontrado',
        procedimentosNomes,
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
    a.download = `procedimentos-realizados-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Procedimentos Realizados</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Lista detalhada de todos os procedimentos concluídos com filtros avançados
          </p>
        </div>
        <Button size="sm" onClick={exportToCsv} disabled={procedimentosRealizados.length === 0} className="self-start sm:self-auto text-xs sm:text-sm">
          <Download className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          Exportar CSV
        </Button>
      </header>

      <div className="rounded-2xl sm:rounded-3xl border border-border/60 bg-background/80 p-3 sm:p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Procedimentos Realizados
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
<Label className="text-sm">Profissional</Label>
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
<Label className="text-sm">Paciente</Label>
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
<Label className="text-sm">Procedimento</Label>
                <Select value={procedimentoFilter} onValueChange={setProcedimentoFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os procedimentos</SelectItem>
                    {procedimentos.map((proc: any) => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
<Label className="text-sm">Data Início</Label>
                <DateTimePicker
                  value={dataInicio}
                  onChange={(value) => setDataInicio(value || '')}
                  label=""
                />
              </div>

              <div className="space-y-2">
<Label className="text-sm">Data Fim</Label>
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
            <span>Exibindo {procedimentosRealizados.length} procedimentos realizados</span>
            <span>
              Total faturado: {formatCurrency(
                procedimentosRealizados.reduce((acc: number, ag: any) => acc + (ag.valor || 0), 0)
              )}
            </span>
          </div>

          {/* List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : procedimentosRealizados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum procedimento realizado encontrado</p>
              </div>
            ) : (
              procedimentosRealizados.map((agendamento: any) => {
                const paciente = pacientesMap.get(agendamento.paciente_id)
                const profissional = profissionaisMap.get(agendamento.profissional_id)
                const procedimentosNomes = (agendamento.procedimentos_ids || [])
                  .map((id: string) => procedimentosMap.get(id)?.nome || 'Procedimento não encontrado')
                
                return (
                  <div
                    key={agendamento.id}
                    className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{agendamento.titulo}</h4>
                          <Badge className="bg-green-100 text-green-800">
                            Concluído
                          </Badge>
                        </div>
                        
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{paciente?.nome_completo || 'Paciente não encontrado'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Stethoscope className="h-4 w-4" />
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

                        {/* Procedimentos */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Procedimentos:</div>
                          <div className="flex flex-wrap gap-1">
                            {procedimentosNomes.map((nome: string, index: number) => (
                              <span key={index} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                {nome}
                              </span>
                            ))}
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
