import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  useAgendamentosClinica,
  useCreateAgendamentoClinica,
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoClinica | null>(null)

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
  const updateMutation = useUpdateAgendamentoClinica()
  const deleteMutation = useDeleteAgendamentoClinica()
  const updateStatusMutation = useUpdateAgendamentoClinicaStatus()

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda Clínica</h1>
          <p className="text-muted-foreground">Gerencie os agendamentos de consultas e procedimentos</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
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
            <div className="text-center py-8 text-muted-foreground">
              Nenhum agendamento encontrado
            </div>
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
