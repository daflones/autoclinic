import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Stethoscope,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  Wand2,
  RefreshCw,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventDropArg } from '@fullcalendar/core'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import {
  useListaEsperaAgendamentos,
  useCreateListaEsperaAgendamento,
  useUpdateListaEsperaAgendamento,
  useDeleteListaEsperaAgendamento,
} from '@/hooks/useListaEsperaAgendamentos'
import {
  useAgendamentosClinica,
  useCreateAgendamentoClinica,
  useRescheduleAgendamentoClinica,
  useUpdateAgendamentoClinica,
  useDeleteAgendamentoClinica,
  useUpdateAgendamentoClinicaStatus,
} from '@/hooks/useAgendamentosClinica'
import { usePacientes } from '@/hooks/usePacientes'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { AgendamentoModals } from '@/components/agendamentos/AgendamentoModals'
import type {
  AgendamentoClinica,
  AgendamentoClinicaCreateData,
  StatusAgendamentoClinica,
} from '@/services/api/agendamentos-clinica'
import type {
  ListaEsperaPrioridade,
  ListaEsperaStatus,
} from '@/services/api/lista-espera-agendamentos'

type CalendarView = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'
type AgendaView = 'calendario' | 'lista'

const STATUS_CONFIG: Record<
  StatusAgendamentoClinica,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
> = {
  agendado: { label: 'Agendado', variant: 'default', icon: Calendar },
  confirmado: { label: 'Confirmado', variant: 'default', icon: CalendarCheck },
  check_in: { label: 'Check-in', variant: 'secondary', icon: Clock },
  em_andamento: { label: 'Em Andamento', variant: 'secondary', icon: AlertCircle },
  concluido: { label: 'Concluído', variant: 'outline', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
  nao_compareceu: { label: 'Não Compareceu', variant: 'destructive', icon: CalendarX },
  remarcado: { label: 'Remarcado', variant: 'outline', icon: CalendarClock },
}

export function AgendamentosClinicaPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusAgendamentoClinica | 'all'>('all')
  const [pacienteFilter, setPacienteFilter] = useState<string>('all')
  const [profissionalFilter, setProfissionalFilter] = useState<string>('all')
  const [agendaView, setAgendaView] = useState<AgendaView>('lista')
  const [calendarView, setCalendarView] = useState<CalendarView>('timeGridWeek')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoClinica | null>(null)

  const calendarRef = useRef<FullCalendar | null>(null)

  const [formState, setFormState] = useState<AgendamentoClinicaCreateData>({
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    paciente_id: null,
    profissional_id: null,
    sala: '',
    status: 'agendado',
  })

  const [editFormState, setEditFormState] = useState<AgendamentoClinicaCreateData>({
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    paciente_id: null,
    profissional_id: null,
    sala: '',
    status: 'agendado',
  })

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paciente_id: pacienteFilter !== 'all' ? pacienteFilter : undefined,
      profissional_id: profissionalFilter !== 'all' ? profissionalFilter : undefined,
    }),
    [searchTerm, statusFilter, pacienteFilter, profissionalFilter]
  )

  const { data: agendamentos, isLoading, count } = useAgendamentosClinica(filters)
  const { data: pacientes } = usePacientes({ limit: 1000 })
  const { data: profissionais } = useProfissionaisClinica({ limit: 1000 })

  const createMutation = useCreateAgendamentoClinica()
  const rescheduleMutation = useRescheduleAgendamentoClinica()
  const updateMutation = useUpdateAgendamentoClinica()
  const deleteMutation = useDeleteAgendamentoClinica()
  const updateStatusMutation = useUpdateAgendamentoClinicaStatus()

  const { data: waitlistQuery } = useListaEsperaAgendamentos({ limit: 200 })
  const createWaitlistMutation = useCreateListaEsperaAgendamento()
  const updateWaitlistMutation = useUpdateListaEsperaAgendamento()
  const deleteWaitlistMutation = useDeleteListaEsperaAgendamento()

  const [waitlistForm, setWaitlistForm] = useState({
    paciente_id: 'none',
    nome_paciente: '',
    telefone: '',
    procedimento_id: 'none',
    preferencia_horario: '',
    prioridade: 'media' as ListaEsperaPrioridade,
    observacoes: '',
  })

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleState, setRescheduleState] = useState({
    data_inicio: '',
    data_fim: '',
    motivo: '',
  })

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const agendamentosHoje = agendamentos.filter((a) => a.data_inicio.startsWith(hoje))

    return {
      total: count,
      hoje: agendamentosHoje.length,
      confirmados: agendamentos.filter((a) => a.status === 'confirmado').length,
      concluidos: agendamentos.filter((a) => a.status === 'concluido').length,
    }
  }, [agendamentos, count])

  const formatLocalDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = date.getFullYear()
    const mm = pad(date.getMonth() + 1)
    const dd = pad(date.getDate())
    const hh = pad(date.getHours())
    const mi = pad(date.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  }

  const toUtcIso = (date: Date) => {
    return date.toISOString()
  }

  const handleWaitlistAgendar = (itemId: string, pacienteId?: string | null, nome?: string | null) => {
    setFormState((prev) => ({
      ...prev,
      titulo: nome ? `Agendamento - ${nome}` : prev.titulo || 'Agendamento',
      paciente_id: pacienteId ?? null,
    }))
    setIsCreateModalOpen(true)
    updateWaitlistMutation.mutate({ id: itemId, data: { status: 'agendado' } })
  }

  const handleOpenRescheduleModal = () => {
    if (!selectedAgendamento) return

    const start = selectedAgendamento.data_inicio
    const end = selectedAgendamento.data_fim

    setRescheduleState({
      data_inicio: start,
      data_fim: end,
      motivo: '',
    })
    setIsRescheduleModalOpen(true)
  }

  const handleConfirmReschedule = async () => {
    if (!selectedAgendamento) return
    if (!rescheduleState.data_inicio || !rescheduleState.data_fim) {
      toast.error('Selecione data/hora de início e fim')
      return
    }

    const start = new Date(rescheduleState.data_inicio)
    const end = new Date(rescheduleState.data_fim)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Data/hora inválida')
      return
    }

    try {
      setIsRescheduleModalOpen(false)
      await rescheduleMutation.mutateAsync({
        id: selectedAgendamento.id,
        data: {
          data_inicio: start.toISOString(),
          data_fim: end.toISOString(),
          motivo: rescheduleState.motivo || null,
        },
      })
      setSelectedAgendamento((prev) => (prev ? { ...prev, status: 'remarcado' } : prev))
    } catch (error) {
      console.error('Erro ao reagendar:', error)
    }
  }

  const noShows = useMemo(() => agendamentos.filter((a) => a.status === 'nao_compareceu'), [agendamentos])

  const retornoSuggestions = useMemo(() => {
    const now = new Date()
    const candidates = agendamentos
      .filter((a) => a.status === 'concluido')
      .map((a) => {
        const end = new Date(a.data_fim)
        const follow = new Date(end)
        follow.setDate(follow.getDate() + 30)
        return {
          agendamento: a,
          follow,
        }
      })
      .filter((c) => c.follow <= now)
      .sort((a, b) => b.follow.getTime() - a.follow.getTime())
      .slice(0, 8)

    return candidates
  }, [agendamentos])

  const handleCreateAgendamento = async () => {
    if (!formState.titulo || !formState.data_inicio || !formState.data_fim) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      await createMutation.mutateAsync(formState)
      setIsCreateModalOpen(false)
      setFormState({
        titulo: '',
        descricao: '',
        data_inicio: '',
        data_fim: '',
        paciente_id: null,
        profissional_id: null,
        sala: '',
        status: 'agendado',
      })
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
    }
  }

  const handleChangeView = (view: CalendarView) => {
    setCalendarView(view)
    const api = (calendarRef.current as any)?.getApi?.()
    if (api) api.changeView(view)
  }

  const handleCalendarToday = () => {
    const api = (calendarRef.current as any)?.getApi?.()
    if (api) api.today()
  }

  const handleCalendarPrev = () => {
    const api = (calendarRef.current as any)?.getApi?.()
    if (api) api.prev()
  }

  const handleCalendarNext = () => {
    const api = (calendarRef.current as any)?.getApi?.()
    if (api) api.next()
  }

  const handleOpenDetails = (agendamento: AgendamentoClinica) => {
    setSelectedAgendamento(agendamento)
    setIsDetailsModalOpen(true)
  }

  const handleOpenEditModal = () => {
    if (!selectedAgendamento) return

    setEditFormState({
      titulo: selectedAgendamento.titulo,
      descricao: selectedAgendamento.descricao || '',
      data_inicio: selectedAgendamento.data_inicio,
      data_fim: selectedAgendamento.data_fim,
      paciente_id: selectedAgendamento.paciente_id,
      profissional_id: selectedAgendamento.profissional_id,
      sala: selectedAgendamento.sala || '',
      status: selectedAgendamento.status,
    })
    setIsDetailsModalOpen(false)
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAgendamento) return

    try {
      await updateMutation.mutateAsync({
        id: selectedAgendamento.id,
        data: editFormState,
      })
      setIsEditModalOpen(false)
      setSelectedAgendamento(null)
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
    }
  }

  const handleRequestDelete = () => {
    setIsDetailsModalOpen(false)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedAgendamento) return

    try {
      await deleteMutation.mutateAsync(selectedAgendamento.id)
      setIsDeleteConfirmOpen(false)
      setSelectedAgendamento(null)
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
    }
  }

  const handleUpdateStatus = async (status: StatusAgendamentoClinica) => {
    if (!selectedAgendamento) return

    if (status === 'remarcado') {
      handleOpenRescheduleModal()
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedAgendamento.id,
        status,
      })
      setSelectedAgendamento({ ...selectedAgendamento, status })
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const events = useMemo(() => {
    const filteredAgendamentos = agendamentos.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (pacienteFilter !== 'all' && (a.paciente_id ?? '') !== pacienteFilter) return false
      if (profissionalFilter !== 'all' && (a.profissional_id ?? '') !== profissionalFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase()
        const haystack = [
          a.titulo,
          a.descricao || '',
          a.paciente?.nome_completo || '',
          a.profissional?.nome || '',
          a.sala || '',
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(term)) return false
      }

      return true
    })

    const baseHueByProcedimento: Record<string, number> = {}

    const getColor = (procedimentoId?: string | null) => {
      if (!procedimentoId) return { bg: 'hsl(225 85% 62%)', border: 'hsl(225 85% 52%)' }
      if (!baseHueByProcedimento[procedimentoId]) {
        let hash = 0
        for (let i = 0; i < procedimentoId.length; i++) hash = (hash * 31 + procedimentoId.charCodeAt(i)) % 360
        baseHueByProcedimento[procedimentoId] = hash
      }
      const h = baseHueByProcedimento[procedimentoId]
      return { bg: `hsl(${h} 78% 56%)`, border: `hsl(${h} 78% 46%)` }
    }

    return filteredAgendamentos.map((a) => {
      const color = getColor(a.procedimento_id)
      const patient = a.paciente?.nome_completo ? ` • ${a.paciente.nome_completo}` : ''
      const room = a.sala ? ` • Sala ${a.sala}` : ''
      return {
        id: a.id,
        title: `${a.titulo}${patient}${room}`,
        start: a.data_inicio,
        end: a.data_fim,
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: '#fff',
        extendedProps: {
          agendamento: a,
        },
      }
    })
  }, [agendamentos, pacienteFilter, profissionalFilter, searchTerm, statusFilter])

  const handleEventClick = (info: any) => {
    const agendamento = info?.event?.extendedProps?.agendamento as AgendamentoClinica | undefined
    if (!agendamento) return
    handleOpenDetails(agendamento)
  }

  const handleEventDrop = async (arg: EventDropArg) => {
    const agendamento = (arg.event.extendedProps as any)?.agendamento as AgendamentoClinica | undefined
    if (!agendamento) return

    try {
      await updateMutation.mutateAsync({
        id: agendamento.id,
        data: {
          data_inicio: arg.event.start?.toISOString() || agendamento.data_inicio,
          data_fim: arg.event.end?.toISOString() || agendamento.data_fim,
        },
      })
    } catch {
      arg.revert()
    }
  }

  const handleEventResize = async (arg: any) => {
    const agendamento = (arg.event.extendedProps as any)?.agendamento as AgendamentoClinica | undefined
    if (!agendamento) return

    try {
      await updateMutation.mutateAsync({
        id: agendamento.id,
        data: {
          data_inicio: arg.event.start?.toISOString() || agendamento.data_inicio,
          data_fim: arg.event.end?.toISOString() || agendamento.data_fim,
        },
      })
    } catch {
      arg.revert()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda Clínica</h1>
          <p className="text-muted-foreground">Gerencie os agendamentos de consultas e procedimentos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={agendaView === 'calendario' ? 'default' : 'outline'}
            onClick={() => setAgendaView('calendario')}
          >
            Calendário
          </Button>
          <Button
            type="button"
            variant={agendaView === 'lista' ? 'default' : 'outline'}
            onClick={() => setAgendaView('lista')}
          >
            Lista
          </Button>

          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Agendamentos totais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hoje}</div>
            <p className="text-xs text-muted-foreground">Agendamentos para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmados}</div>
            <p className="text-xs text-muted-foreground">Aguardando atendimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.concluidos}</div>
            <p className="text-xs text-muted-foreground">Atendimentos finalizados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paciente-filter">Paciente</Label>
              <Select value={pacienteFilter} onValueChange={setPacienteFilter}>
                <SelectTrigger id="paciente-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profissional-filter">Profissional</Label>
              <Select value={profissionalFilter} onValueChange={setProfissionalFilter}>
                <SelectTrigger id="profissional-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {agendaView === 'calendario' ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Calendário</CardTitle>
                <CardDescription>Visualização diária, semanal e mensal. Arraste para reagendar.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={handleCalendarPrev}>
                  ◀
                </Button>
                <Button type="button" variant="outline" onClick={handleCalendarToday}>
                  Hoje
                </Button>
                <Button type="button" variant="outline" onClick={handleCalendarNext}>
                  ▶
                </Button>

                <Button
                  type="button"
                  variant={calendarView === 'timeGridDay' ? 'default' : 'outline'}
                  onClick={() => handleChangeView('timeGridDay')}
                >
                  Dia
                </Button>
                <Button
                  type="button"
                  variant={calendarView === 'timeGridWeek' ? 'default' : 'outline'}
                  onClick={() => handleChangeView('timeGridWeek')}
                >
                  Semana
                </Button>
                <Button
                  type="button"
                  variant={calendarView === 'dayGridMonth' ? 'default' : 'outline'}
                  onClick={() => handleChangeView('dayGridMonth')}
                >
                  Mês
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border overflow-hidden bg-background">
              <FullCalendar
                ref={calendarRef as any}
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={false}
                locale="pt-br"
                firstDay={1}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                slotDuration="00:15:00"
                snapDuration="00:15:00"
                nowIndicator
                editable
                selectable
                selectMirror
                dayMaxEvents
                events={events as any}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                select={(selection) => {
                  const start = selection.start ? toUtcIso(selection.start) : ''
                  const end = selection.end ? toUtcIso(selection.end) : ''
                  setFormState((prev) => ({
                    ...prev,
                    titulo: prev.titulo || 'Agendamento',
                    descricao: prev.descricao || '',
                    data_inicio: start,
                    data_fim: end,
                    status: prev.status || 'agendado',
                  }))
                  setIsCreateModalOpen(true)
                }}
                contentHeight={650}
                expandRows
                stickyHeaderDates
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false } as any}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {agendaView === 'lista' ? (
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos ({count})</CardTitle>
            <CardDescription>Lista de todos os agendamentos clínicos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum agendamento encontrado</div>
            ) : (
              <div className="space-y-4">
                {agendamentos.map((agendamento) => {
                  const statusConfig = STATUS_CONFIG[agendamento.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => handleOpenDetails(agendamento)}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agendamento.titulo}</h3>
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(agendamento.data_inicio)}
                          </span>
                          {agendamento.paciente && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {agendamento.paciente.nome_completo}
                            </span>
                          )}
                          {agendamento.profissional && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" />
                              {agendamento.profissional.nome}
                            </span>
                          )}
                          {agendamento.sala && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {agendamento.sala}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Lista de espera
            </CardTitle>
            <CardDescription>
              Registre pacientes interessados quando não há horário disponível. Use prioridade e status para organizar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paciente cadastrado (opcional)</Label>
                  <Select value={waitlistForm.paciente_id} onValueChange={(v) => setWaitlistForm((s) => ({ ...s, paciente_id: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {pacientes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Procedimento desejado (opcional)</Label>
                  <Input
                    value={waitlistForm.procedimento_id === 'none' ? '' : waitlistForm.procedimento_id}
                    onChange={(e) => setWaitlistForm((s) => ({ ...s, procedimento_id: e.target.value || 'none' }))}
                    placeholder="(por enquanto: informe o ID do procedimento)"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome (se não cadastrado)</Label>
                  <Input value={waitlistForm.nome_paciente} onChange={(e) => setWaitlistForm((s) => ({ ...s, nome_paciente: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={waitlistForm.telefone} onChange={(e) => setWaitlistForm((s) => ({ ...s, telefone: e.target.value }))} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preferência de horário</Label>
                  <Input value={waitlistForm.preferencia_horario} onChange={(e) => setWaitlistForm((s) => ({ ...s, preferencia_horario: e.target.value }))} placeholder="Ex: manhã, tarde, seg/qua" />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={waitlistForm.prioridade} onValueChange={(v) => setWaitlistForm((s) => ({ ...s, prioridade: v as ListaEsperaPrioridade }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={waitlistForm.observacoes} onChange={(e) => setWaitlistForm((s) => ({ ...s, observacoes: e.target.value }))} rows={3} />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    if (waitlistForm.paciente_id === 'none' && !waitlistForm.nome_paciente.trim()) {
                      toast.error('Informe um paciente ou o nome')
                      return
                    }

                    await createWaitlistMutation.mutateAsync({
                      paciente_id: waitlistForm.paciente_id === 'none' ? null : waitlistForm.paciente_id,
                      nome_paciente: waitlistForm.nome_paciente || null,
                      telefone: waitlistForm.telefone || null,
                      procedimento_id: waitlistForm.procedimento_id === 'none' ? null : waitlistForm.procedimento_id,
                      preferencia_horario: waitlistForm.preferencia_horario || null,
                      prioridade: waitlistForm.prioridade,
                      status: 'aguardando',
                      observacoes: waitlistForm.observacoes || null,
                    })

                    setWaitlistForm({
                      paciente_id: 'none',
                      nome_paciente: '',
                      telefone: '',
                      procedimento_id: 'none',
                      preferencia_horario: '',
                      prioridade: 'media',
                      observacoes: '',
                    })
                  }}
                  disabled={createWaitlistMutation.isPending}
                >
                  {createWaitlistMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">Fila ({waitlistQuery?.count ?? 0})</div>
              {waitlistQuery?.data?.length ? (
                <div className="space-y-2">
                  {waitlistQuery.data.map((item) => {
                    const nome = item.paciente?.nome_completo || item.nome_paciente || 'Sem nome'
                    const statusLabel: Record<ListaEsperaStatus, string> = {
                      aguardando: 'Aguardando',
                      contatado: 'Contatado',
                      agendado: 'Agendado',
                      cancelado: 'Cancelado',
                    }

                    const prioLabel: Record<ListaEsperaPrioridade, string> = {
                      alta: 'Alta',
                      media: 'Média',
                      baixa: 'Baixa',
                    }

                    return (
                      <div key={item.id} className="rounded-xl border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.preferencia_horario ? item.preferencia_horario : 'Sem preferência'}
                              {item.telefone ? ` • ${item.telefone}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{prioLabel[item.prioridade]}</Badge>
                            <Badge variant="secondary">{statusLabel[item.status]}</Badge>
                          </div>
                        </div>

                        {item.observacoes ? (
                          <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{item.observacoes}</div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleWaitlistAgendar(item.id, item.paciente_id, nome)}
                          >
                            Agendar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateWaitlistMutation.mutate({ id: item.id, data: { status: 'contatado' } })}
                          >
                            Marcar contatado
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateWaitlistMutation.mutate({ id: item.id, data: { status: 'cancelado' } })}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteWaitlistMutation.mutate(item.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum item na lista de espera.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sugestões automáticas de retorno
            </CardTitle>
            <CardDescription>
              Sugestões geradas a partir de atendimentos concluídos (ex.: retorno em 30 dias).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {retornoSuggestions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhuma sugestão no momento. Para gerar sugestões, conclua um atendimento (status: Concluído).
              </div>
            ) : (
              <div className="space-y-3">
                {retornoSuggestions.map(({ agendamento, follow }) => (
                  <div key={agendamento.id} className="rounded-xl border p-3">
                    <div className="font-medium truncate">
                      {agendamento.paciente?.nome_completo || agendamento.titulo}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Último: {formatDateTime(agendamento.data_fim)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sugestão: {format(follow, 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFormState({
                            ...formState,
                            titulo: `Retorno - ${agendamento.paciente?.nome_completo || agendamento.titulo}`,
                            paciente_id: agendamento.paciente_id ?? null,
                            profissional_id: agendamento.profissional_id ?? null,
                            data_inicio: new Date(follow).toISOString(),
                            data_fim: new Date(new Date(follow).getTime() + 30 * 60 * 1000).toISOString(),
                          })
                          setIsCreateModalOpen(true)
                        }}
                      >
                        Sugerir agendamento
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No-shows</CardTitle>
          <CardDescription>Agendamentos marcados como “Não Compareceu”.</CardDescription>
        </CardHeader>
        <CardContent>
          {noShows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum no-show registrado.</div>
          ) : (
            <div className="space-y-3">
              {noShows.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => handleOpenDetails(agendamento)}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{agendamento.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(agendamento.data_inicio)}
                      {agendamento.paciente?.nome_completo ? ` • ${agendamento.paciente.nome_completo}` : ''}
                    </div>
                  </div>
                  <Badge variant="destructive">No-show</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="w-[98vw] max-w-6xl max-h-[calc(100vh-4rem)] overflow-visible flex flex-col">
          <DialogHeader>
            <DialogTitle>Reagendar</DialogTitle>
            <DialogDescription>
              Escolha a nova data e hora.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-visible">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
              <DateTimePicker
                value={rescheduleState.data_inicio}
                onChange={(v) =>
                  setRescheduleState((s) => {
                    const start = new Date(v)
                    if (Number.isNaN(start.getTime())) return { ...s, data_inicio: v }

                    const currentEnd = s.data_fim ? new Date(s.data_fim) : null
                    const minEnd = new Date(start)
                    minEnd.setMinutes(minEnd.getMinutes() + 15)

                    const nextEnd = !currentEnd || Number.isNaN(currentEnd.getTime()) || currentEnd < minEnd ? minEnd : currentEnd

                    return {
                      ...s,
                      data_inicio: v,
                      data_fim: formatLocalDateTime(nextEnd),
                    }
                  })
                }
                label="Novo início"
                required
              />
              <DateTimePicker
                value={rescheduleState.data_fim}
                min={rescheduleState.data_inicio}
                onChange={(v) =>
                  setRescheduleState((s) => {
                    const start = s.data_inicio ? new Date(s.data_inicio) : null
                    const end = new Date(v)
                    if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ...s, data_fim: v }
                    const safeEnd = end < start ? start : end
                    return { ...s, data_fim: formatLocalDateTime(safeEnd) }
                  })
                }
                label="Novo fim"
                required
              />
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  value={rescheduleState.motivo}
                  onChange={(e) => setRescheduleState((s) => ({ ...s, motivo: e.target.value }))}
                  rows={3}
                  placeholder="Ex: paciente solicitou outro horário"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmReschedule} disabled={rescheduleMutation.isPending}>
              {rescheduleMutation.isPending ? 'Salvando...' : 'Confirmar reagendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AgendamentoModals
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        isDetailsModalOpen={isDetailsModalOpen}
        setIsDetailsModalOpen={setIsDetailsModalOpen}
        isEditModalOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        isDeleteConfirmOpen={isDeleteConfirmOpen}
        setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
        selectedAgendamento={selectedAgendamento}
        formState={formState}
        setFormState={setFormState}
        editFormState={editFormState}
        setEditFormState={setEditFormState}
        pacientes={pacientes}
        profissionais={profissionais}
        onCreateAgendamento={handleCreateAgendamento}
        onSaveEdit={handleSaveEdit}
        onRequestDelete={handleRequestDelete}
        onConfirmDelete={handleConfirmDelete}
        onUpdateStatus={handleUpdateStatus}
        onOpenEditModal={handleOpenEditModal}
        createPending={createMutation.isPending}
        updatePending={updateMutation.isPending}
        deletePending={deleteMutation.isPending}
        updateStatusPending={updateStatusMutation.isPending}
      />
    </div>
  )
}
