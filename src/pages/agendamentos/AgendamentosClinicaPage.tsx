import { useState, useMemo, useRef } from 'react'
// Card components removed after style standardization
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
  Plus,
  Search,
  Calendar,
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
  Edit,
  Trash2,
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
  useAgendamentosClinica,
  useCreateAgendamentoClinica,
  useRescheduleAgendamentoClinica,
  useUpdateAgendamentoClinica,
  useDeleteAgendamentoClinica,
  useUpdateAgendamentoClinicaStatus,
} from '@/hooks/useAgendamentosClinica'
import { usePacientes, useCreatePaciente } from '@/hooks/usePacientes'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { useProcedimentos } from '@/hooks/useProcedimentos'
import { useProtocolosPacotes } from '@/hooks/useProtocolosPacotes'
import { AgendamentoModals } from '@/components/agendamentos/AgendamentoModals'
import type {
  AgendamentoClinica,
  AgendamentoClinicaCreateData,
  StatusAgendamentoClinica,
} from '@/services/api/agendamentos-clinica'

type CalendarView = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'
type AgendaView = 'calendario' | 'lista' | 'disponibilidade'

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
  const [, setPacienteSearch] = useState('')
  const [profissionalFilter, setProfissionalFilter] = useState<string>('all')
  const [procedimentoFilter, setProcedimentoFilter] = useState<string>('all')
  const [avaliacaoFilter, setAvaliacaoFilter] = useState<'all' | 'true' | 'false'>('all')
  const [dataInicioFilter, setDataInicioFilter] = useState<string>('')
  const [dataFimFilter, setDataFimFilter] = useState<string>('')
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
    is_avaliacao: false,
    valor: null,
    data_inicio: '',
    data_fim: '',
    paciente_id: null,
    profissional_id: null,
    plano_tratamento_id: null,
    procedimento_id: null,
    procedimentos_ids: [],
    protocolos_pacotes_ids: [],
    sala: '',
    status: 'agendado',
  })

  const [editFormState, setEditFormState] = useState<AgendamentoClinicaCreateData>({
    titulo: '',
    descricao: '',
    is_avaliacao: false,
    valor: null,
    data_inicio: '',
    data_fim: '',
    paciente_id: null,
    profissional_id: null,
    plano_tratamento_id: null,
    procedimento_id: null,
    procedimentos_ids: [],
    protocolos_pacotes_ids: [],
    sala: '',
    status: 'agendado',
  })

  const filters = useMemo(() => {
    const startIso = dataInicioFilter
      ? new Date(`${dataInicioFilter}T00:00:00`).toISOString()
      : undefined
    const endIso = dataFimFilter
      ? new Date(`${dataFimFilter}T23:59:59.999`).toISOString()
      : undefined

    return {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paciente_id: pacienteFilter !== 'all' ? pacienteFilter : undefined,
      profissional_id: profissionalFilter !== 'all' ? profissionalFilter : undefined,
      procedimento_id: procedimentoFilter !== 'all' ? procedimentoFilter : undefined,
      is_avaliacao:
        avaliacaoFilter === 'all' ? undefined : avaliacaoFilter === 'true' ? true : false,
      data_inicio: startIso,
      data_fim: endIso,
    }
  }, [statusFilter, pacienteFilter, profissionalFilter, procedimentoFilter, avaliacaoFilter, dataInicioFilter, dataFimFilter])

  const { data: agendamentos, isLoading, count } = useAgendamentosClinica(filters)
  const { data: pacientes } = usePacientes({ limit: 1000 })
  const { data: profissionais } = useProfissionaisClinica({ limit: 1000 })
  const { data: procedimentos } = useProcedimentos({ limit: 1000 } as any)
  const { data: protocolosPacotes } = useProtocolosPacotes({ limit: 1000, status: 'ativo' } as any)

  const calcValorAgendamento = (procedimentoIds: string[], pacoteIds: string[]) => {
    const procedimentosTotal = (procedimentoIds || []).reduce((acc, id) => {
      const p: any = (procedimentos as any[]).find((x) => x.id === id)
      const v =
        typeof p?.valor_promocional === 'number'
          ? p.valor_promocional
          : typeof p?.valor_base === 'number'
            ? p.valor_base
            : 0
      return acc + (Number.isFinite(v) ? v : 0)
    }, 0)

    const pacotesTotal = (pacoteIds || []).reduce((acc, id) => {
      const p: any = (protocolosPacotes as any[]).find((x) => x.id === id)
      const v = typeof p?.preco === 'number' ? p.preco : 0
      return acc + (Number.isFinite(v) ? v : 0)
    }, 0)

    const total = procedimentosTotal + pacotesTotal
    return Number.isFinite(total) ? total : 0
  }

  const createMutation = useCreateAgendamentoClinica()
  const rescheduleMutation = useRescheduleAgendamentoClinica()
  const updateMutation = useUpdateAgendamentoClinica()
  const deleteMutation = useDeleteAgendamentoClinica()
  const updateStatusMutation = useUpdateAgendamentoClinicaStatus()
  const createPacienteMutation = useCreatePaciente()

  const handleCreatePaciente = async (nome: string) => {
    if (!nome || nome.trim().length < 2) {
      toast.error('Informe o nome do paciente (mínimo 2 caracteres)')
      return
    }
    try {
      const novoPaciente = await createPacienteMutation.mutateAsync({
        nome_completo: nome.trim(),
      })
      if (novoPaciente?.id) {
        setFormState((prev) => ({ ...prev, paciente_id: novoPaciente.id }))
        toast.success(`Paciente "${nome.trim()}" cadastrado!`)
      }
    } catch {
      // error handled by mutation hook
    }
  }

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleState, setRescheduleState] = useState({
    data_inicio: '',
    data_fim: '',
    motivo: '',
  })

  // Client-side filtering for search by patient name, professional name, title (case-insensitive)
  const filteredAgendamentos = useMemo(() => {
    if (!searchTerm.trim()) return agendamentos
    const term = searchTerm.trim().toLowerCase()
    return agendamentos.filter((a) => {
      const titulo = (a.titulo || '').toLowerCase()
      const pacienteNome = (a.paciente?.nome_completo || '').toLowerCase()
      const profissionalNome = (a.profissional?.nome || '').toLowerCase()
      const descricao = (a.descricao || '').toLowerCase()
      const sala = (a.sala || '').toLowerCase()
      return titulo.includes(term) || pacienteNome.includes(term) || profissionalNome.includes(term) || descricao.includes(term) || sala.includes(term)
    })
  }, [agendamentos, searchTerm])

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

  const handleCreateAgendamento = async () => {
    if (!formState.titulo || !formState.data_inicio || !formState.data_fim) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const pacoteIds = Array.isArray((formState as any).protocolos_pacotes_ids)
      ? ((formState as any).protocolos_pacotes_ids as string[])
      : []

    if (pacoteIds.length > 0 && !formState.paciente_id) {
      toast.error('Selecione o paciente para vincular os pacotes')
      return
    }

    try {
      await createMutation.mutateAsync({
        ...formState,
        procedimentos_ids: (formState as any).procedimentos_ids ?? [],
        protocolos_pacotes_ids: pacoteIds,
        plano_tratamento_id: null,
      } as any)
      setIsCreateModalOpen(false)
      setFormState({
        titulo: '',
        descricao: '',
        is_avaliacao: false,
        valor: null,
        data_inicio: '',
        data_fim: '',
        paciente_id: null,
        profissional_id: null,
        plano_tratamento_id: null,
        procedimento_id: null,
        procedimentos_ids: [],
        protocolos_pacotes_ids: [],
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

    const procedimentosIds =
      Array.isArray((selectedAgendamento as any).procedimentos_ids)
        ? ((selectedAgendamento as any).procedimentos_ids as string[])
        : selectedAgendamento.procedimento_id
          ? [selectedAgendamento.procedimento_id]
          : []

    const pacotesIds = Array.isArray((selectedAgendamento as any).protocolos_pacotes_ids)
      ? ((selectedAgendamento as any).protocolos_pacotes_ids as string[])
      : []

    const valorCalculado = calcValorAgendamento(procedimentosIds, pacotesIds)

    setEditFormState({
      titulo: selectedAgendamento.titulo,
      descricao: selectedAgendamento.descricao || '',
      is_avaliacao: Boolean((selectedAgendamento as any).is_avaliacao),
      valor: valorCalculado,
      data_inicio: selectedAgendamento.data_inicio,
      data_fim: selectedAgendamento.data_fim,
      paciente_id: selectedAgendamento.paciente_id || null,
      profissional_id: selectedAgendamento.profissional_id || null,
      plano_tratamento_id: selectedAgendamento.plano_tratamento_id ?? null,
      procedimento_id: selectedAgendamento.procedimento_id ?? null,
      procedimentos_ids: procedimentosIds,
      protocolos_pacotes_ids: pacotesIds,
      sala: selectedAgendamento.sala || '',
      status: selectedAgendamento.status,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedAgendamento) return

    try {
      const pacoteIds = Array.isArray((editFormState as any).protocolos_pacotes_ids)
        ? ((editFormState as any).protocolos_pacotes_ids as string[])
        : []

      if (pacoteIds.length > 0 && !editFormState.paciente_id) {
        toast.error('Selecione o paciente para vincular os pacotes')
        return
      }

      await updateMutation.mutateAsync({
        id: selectedAgendamento.id,
        data: {
          ...editFormState,
          procedimentos_ids: (editFormState as any).procedimentos_ids ?? [],
          protocolos_pacotes_ids: pacoteIds,
          plano_tratamento_id: null,
        } as any,
      })
      setIsEditModalOpen(false)
      setSelectedAgendamento(null)
    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
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
        title: `${a.is_avaliacao ? 'Avaliação • ' : ''}${a.titulo}${patient}${room}`,
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Agenda Clínica</h1>
          <p className="text-sm text-muted-foreground">Gerencie os agendamentos de consultas e procedimentos</p>
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
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Agendamentos totais</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hoje</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.hoje}</h3>
            </div>
            <div className="rounded-full bg-sky-500/10 p-2 text-sky-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Agendamentos para hoje</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirmados</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.confirmados}</h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Aguardando atendimento</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-purple-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluídos</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.concluidos}</h3>
            </div>
            <div className="rounded-full bg-purple-500/10 p-2 text-purple-500">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Atendimentos finalizados</p>
        </div>
      </section>

      <section className="relative z-20 overflow-visible rounded-2xl border border-border/40 bg-background/60 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-end gap-2 overflow-visible">
          <div className="relative min-w-[120px]">
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Buscar</span>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pacientes</span>
            <Select value={pacienteFilter} onValueChange={(v) => { setPacienteFilter(v); setPacienteSearch('') }}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(pacientes || []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pacotes/Procedimentos</span>
            <Select value={procedimentoFilter} onValueChange={setProcedimentoFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(procedimentos || []).length > 0 && (
                  <SelectItem value="__header_proc" disabled className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">— Procedimentos —</SelectItem>
                )}
                {(procedimentos || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
                {(protocolosPacotes || []).length > 0 && (
                  <SelectItem value="__header_pac" disabled className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">— Pacotes —</SelectItem>
                )}
                {((protocolosPacotes || []) as any[]).map((p: any) => (
                  <SelectItem key={`pac_${p.id}`} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Avaliação</span>
            <Select value={avaliacaoFilter} onValueChange={(v) => setAvaliacaoFilter(v as any)}>
              <SelectTrigger className="h-8 w-[90px] text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Avaliações</SelectItem>
                <SelectItem value="false">Não-avaliações</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Data início</span>
            <DateTimePicker
              value={dataInicioFilter ? `${dataInicioFilter}T00:00:00` : ''}
              onChange={(value) => {
                if (value) {
                  const date = new Date(value)
                  if (!isNaN(date.getTime())) {
                    const yyyy = date.getFullYear()
                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                    const dd = String(date.getDate()).padStart(2, '0')
                    setDataInicioFilter(`${yyyy}-${mm}-${dd}`)
                  }
                } else {
                  setDataInicioFilter('')
                }
              }}
              label=""
            />
          </div>

          <div>
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Data fim</span>
            <DateTimePicker
              value={dataFimFilter ? `${dataFimFilter}T23:59:59` : ''}
              onChange={(value) => {
                if (value) {
                  const date = new Date(value)
                  if (!isNaN(date.getTime())) {
                    const yyyy = date.getFullYear()
                    const mm = String(date.getMonth() + 1).padStart(2, '0')
                    const dd = String(date.getDate()).padStart(2, '0')
                    setDataFimFilter(`${yyyy}-${mm}-${dd}`)
                  }
                } else {
                  setDataFimFilter('')
                }
              }}
              label=""
            />
          </div>

          {(searchTerm || statusFilter !== 'all' || pacienteFilter !== 'all' || profissionalFilter !== 'all' || procedimentoFilter !== 'all' || avaliacaoFilter !== 'all' || dataInicioFilter || dataFimFilter) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPacienteFilter('all')
                  setPacienteSearch('')
                  setProfissionalFilter('all')
                  setProcedimentoFilter('all')
                  setAvaliacaoFilter('all')
                  setDataInicioFilter('')
                  setDataFimFilter('')
                }}
              >
                Limpar
              </Button>
            </div>
          )}
        </div>
      </section>

      {agendaView === 'calendario' ? (
        <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Calendário</h2>
                <p className="text-sm text-muted-foreground">Visualização diária, semanal e mensal. Arraste para reagendar.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={handleCalendarPrev}>
                  ?
                </Button>
                <Button type="button" variant="outline" onClick={handleCalendarToday}>
                  Hoje
                </Button>
                <Button type="button" variant="outline" onClick={handleCalendarNext}>
                  ?
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
          </div>

          <div>
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
          </div>
        </section>
      ) : null}

      {agendaView === 'lista' ? (
        <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Agendamentos ({count})</h2>
            <span className="text-sm text-muted-foreground">Lista de todos os agendamentos clínicos</span>
          </div>
          <div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredAgendamentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum agendamento encontrado</div>
            ) : (
              <div className="space-y-4">
                {filteredAgendamentos.map((agendamento) => {
                  const statusConfig = STATUS_CONFIG[agendamento.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={agendamento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div 
                        className="flex-1 space-y-1 cursor-pointer"
                        onClick={() => handleOpenDetails(agendamento)}
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agendamento.titulo}</h3>
                          <Badge variant={statusConfig.variant}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                          {agendamento.is_avaliacao ? <Badge variant="secondary">Avaliação</Badge> : null}
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
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAgendamento(agendamento)
                            setIsDetailsModalOpen(false)
                            const procedimentosIds = Array.isArray((agendamento as any).procedimentos_ids)
                              ? ((agendamento as any).procedimentos_ids as string[])
                              : agendamento.procedimento_id ? [agendamento.procedimento_id] : []
                            const pacotesIds = Array.isArray((agendamento as any).protocolos_pacotes_ids)
                              ? ((agendamento as any).rotocolos_pacotes_ids as string[]) : []
                            setEditFormState({
                              titulo: agendamento.titulo,
                              descricao: agendamento.descricao || '',
                              is_avaliacao: Boolean((agendamento as any).is_avaliacao),
                              valor: calcValorAgendamento(procedimentosIds, pacotesIds),
                              data_inicio: agendamento.data_inicio,
                              data_fim: agendamento.data_fim,
                              paciente_id: agendamento.paciente_id || null,
                              profissional_id: agendamento.profissional_id || null,
                              plano_tratamento_id: agendamento.plano_tratamento_id ?? null,
                              procedimento_id: agendamento.procedimento_id ?? null,
                              procedimentos_ids: procedimentosIds,
                              protocolos_pacotes_ids: pacotesIds,
                              sala: agendamento.sala || '',
                              status: agendamento.status,
                            })
                            setIsEditModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                              deleteMutation.mutate(agendamento.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}

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
<Label className="text-sm">Motivo (opcional)</Label>
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
        procedimentos={procedimentos}
        protocolosPacotes={protocolosPacotes}
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
        agendamentos={agendamentos}
        onCreatePaciente={handleCreatePaciente}
      />
    </div>
  )
}
