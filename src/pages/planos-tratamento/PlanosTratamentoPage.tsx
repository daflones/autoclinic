import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { PlanoAtivoButton } from '@/components/PlanoAtivoGuard'
import { SimpleDateTime } from '@/components/ui/simple-datetime'
import {
  usePlanosTratamento,
  usePlanoTratamento,
  useCreatePlanoTratamento,
  useUpdatePlanoTratamento,
  useDeletePlanoTratamento,
  useUpdatePlanoTratamentoStatus,
} from '@/hooks/usePlanosTratamento'
import { usePacientes } from '@/hooks/usePacientes'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { useProtocolosPacotes } from '@/hooks/useProtocolosPacotes'
import { useProcedimentos } from '@/hooks/useProcedimentos'
import type { PlanoTratamentoItemInput } from '@/services/api/planos-tratamento'
import {
  useCreateSessoesTratamento,
  useDeleteSessaoTratamento,
  useSessoesTratamento,
  useUpdateSessaoTratamento,
} from '@/hooks/useSessoesTratamento'
import { type StatusPlanoTratamento, type PlanoTratamento } from '@/services/api/planos-tratamento'
import { useAgendamentosClinica } from '@/hooks/useAgendamentosClinica'
import { toast } from 'sonner'
import {
  FileText,
  Loader2,
  Stethoscope,
  UserCircle,
  ClipboardList,
  Calendar,
  Coins,
  CheckCircle2,
  Printer,
  Pencil,
  Trash2,
} from 'lucide-react'

const statusOptions: { value: StatusPlanoTratamento; label: string; badgeClass: string }[] = [
  { value: 'rascunho', label: 'Rascunho', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' },
  { value: 'em_aprovacao', label: 'Em aprovação', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
  { value: 'aprovado', label: 'Aprovado', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
  { value: 'em_execucao', label: 'Em execução', badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200' },
  { value: 'concluido', label: 'Concluído', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' },
  { value: 'cancelado', label: 'Cancelado', badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
]

const statusFilterOptions = [{ value: 'todos', label: 'Todos' as const }, ...statusOptions.map(({ value, label }) => ({ value, label }))]

const initialFormState = {
  paciente_id: '',
  responsavel_profissional_id: '',
  protocolo_pacote_id: '',
  titulo: '',
  descricao: '',
  status: 'rascunho' as StatusPlanoTratamento,
  validade_dias: 30,
  total_previsto: '0',
  total_pago: '0',
  observacoes: '',
  data_prevista_inicio: '',
  data_prevista_conclusao: '',
}

function addDaysISO(date: Date, days: number) {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

type PlanoFormState = typeof initialFormState

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export function PlanosTratamentoPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [page, setPage] = useState(1)
  const limit = 12

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formState, setFormState] = useState<PlanoFormState>(initialFormState)

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedPlanoId, setSelectedPlanoId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormState, setEditFormState] = useState<PlanoFormState | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingDeletePlanoId, setPendingDeletePlanoId] = useState<string | null>(null)
  const [openEditAfterDetailsLoad, setOpenEditAfterDetailsLoad] = useState(false)

  const [createItens, setCreateItens] = useState<PlanoTratamentoItemInput[]>([])
  const [editItens, setEditItens] = useState<PlanoTratamentoItemInput[]>([])

  const { data: planos = [], count = 0, isLoading } = usePlanosTratamento({
    page,
    limit,
    status: statusFilter === 'todos' ? undefined : (statusFilter as StatusPlanoTratamento),
    search: searchTerm || undefined,
  })

  const { data: planoDetalhes, isLoading: isLoadingPlano } = usePlanoTratamento(isDetailsOpen ? selectedPlanoId ?? undefined : undefined)

  const { data: pacientes = [] } = usePacientes({ limit: 100 })
  const { data: profissionais = [] } = useProfissionaisClinica()
  const { data: pacotes = [] } = useProtocolosPacotes({ status: 'ativo', limit: 1000 } as any)
  const { data: procedimentosList = [] } = useProcedimentos({} as any)

  const procedimentosMap = useMemo(() => {
    return new Map((procedimentosList as any[]).map((p: any) => [p.id, p]))
  }, [procedimentosList])

  const { data: sessoesPlano = [] } = useSessoesTratamento({
    plano_tratamento_id: isDetailsOpen ? selectedPlanoId ?? undefined : undefined,
  })

  const { data: agendamentosPaciente = [] } = useAgendamentosClinica(
    isDetailsOpen && planoDetalhes?.paciente_id
      ? { paciente_id: planoDetalhes.paciente_id, limit: 100 }
      : { limit: 0 }
  )

  const createSessoes = useCreateSessoesTratamento()
  const deleteSessao = useDeleteSessaoTratamento()
  const updateSessao = useUpdateSessaoTratamento()

  const [gerarSessoesQtd, setGerarSessoesQtd] = useState<number>(0)
  const [gerarSessoesIntervaloDias, setGerarSessoesIntervaloDias] = useState<number>(7)
  const [sessaoInicioPrevistoById, setSessaoInicioPrevistoById] = useState<Record<string, string>>({})

  const createPlano = useCreatePlanoTratamento()
  const updatePlano = useUpdatePlanoTratamento()
  const deletePlano = useDeletePlanoTratamento()
  const updateStatus = useUpdatePlanoTratamentoStatus()

  const pacientesMap = useMemo(() => {
    return new Map(pacientes.map((paciente) => [paciente.id, paciente.nome_completo]))
  }, [pacientes])

  const profissionaisMap = useMemo(() => {
    return new Map(profissionais.map((profissional) => [profissional.id, profissional.nome]))
  }, [profissionais])

  const pacotesMap = useMemo(() => {
    return new Map(pacotes.map((p: any) => [p.id, p.nome]))
  }, [pacotes])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(count / limit))

  const handleOpenCreateModal = () => {
    setFormState(initialFormState)
    setCreateItens([])
    setIsCreateModalOpen(true)
  }

  const handleCreatePlano = () => {
    if (!formState.paciente_id || !formState.titulo) {
      toast.error('Selecione o paciente e informe o título do plano.')
      return
    }

    createPlano.mutate(
      {
        paciente_id: formState.paciente_id,
        responsavel_profissional_id: formState.responsavel_profissional_id || null,
        protocolo_pacote_id: formState.protocolo_pacote_id || null,
        titulo: formState.titulo,
        descricao: formState.descricao || undefined,
        status: formState.status,
        validade_dias: Number(formState.validade_dias) || 30,
        total_previsto: Number(formState.total_previsto) || 0,
        total_pago: Number(formState.total_pago) || 0,
        observacoes: formState.observacoes || undefined,
        itens: createItens.length > 0 ? createItens : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Plano de tratamento criado com sucesso!')
          setIsCreateModalOpen(false)
          setFormState(initialFormState)
          setCreateItens([])
          setPage(1)
        },
        onError: (error) => {
          toast.error(error.message || 'Erro ao criar plano de tratamento')
        },
      },
    )
  }

  const handleStatusUpdate = async (planoId: string, status: StatusPlanoTratamento) => {
    updateStatus.mutate(
      { id: planoId, status },
      {
        onError: (error) => {
          toast.error(error.message || 'Erro ao atualizar status do plano')
        },
      },
    )
  }

  const handleOpenDetails = (plano: PlanoTratamento) => {
    setSelectedPlanoId(plano.id)
    setIsDetailsOpen(true)
  }

  const handleOpenEditFromList = (plano: PlanoTratamento) => {
    setSelectedPlanoId(plano.id)
    setOpenEditAfterDetailsLoad(true)
    setIsDetailsOpen(true)
  }

  const handleRequestDeleteFromList = (plano: PlanoTratamento) => {
    setPendingDeletePlanoId(plano.id)
    setIsDeleteConfirmOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedPlanoId(null)
  }

  useEffect(() => {
    if (!openEditAfterDetailsLoad) return
    if (!isDetailsOpen) return
    if (!planoDetalhes) return
    setOpenEditAfterDetailsLoad(false)
    handleOpenEditModal()
  }, [openEditAfterDetailsLoad, isDetailsOpen, planoDetalhes])

  const handleOpenEditModal = () => {
    if (!planoDetalhes) return

    setEditFormState({
      paciente_id: planoDetalhes.paciente_id,
      responsavel_profissional_id: planoDetalhes.responsavel_profissional_id ?? '',
      protocolo_pacote_id: planoDetalhes.protocolo_pacote_id ?? '',
      titulo: planoDetalhes.titulo,
      descricao: planoDetalhes.descricao ?? '',
      status: planoDetalhes.status,
      validade_dias: planoDetalhes.validade_dias,
      total_previsto: String(planoDetalhes.total_previsto ?? 0),
      total_pago: String(planoDetalhes.total_pago ?? 0),
      observacoes: planoDetalhes.observacoes ?? '',
      data_prevista_inicio: '',
      data_prevista_conclusao: '',
    })

    setEditItens(
      (planoDetalhes.itens || []).map((it) => ({
        procedimento_id: it.procedimento_id ?? null,
        descricao_personalizada: it.descricao_personalizada ?? null,
        quantidade: it.quantidade ?? 1,
        ordem: it.ordem ?? 0,
        valor_unitario: it.valor_unitario ?? 0,
        desconto_percentual: it.desconto_percentual ?? 0,
        observacoes: it.observacoes ?? null,
      }))
    )

    setIsEditModalOpen(true)
  }

  const handleSaveEditPlano = () => {
    if (!planoDetalhes || !editFormState) return

    updatePlano.mutate(
      {
        id: planoDetalhes.id,
        data: {
          paciente_id: editFormState.paciente_id,
          responsavel_profissional_id: editFormState.responsavel_profissional_id || null,
          protocolo_pacote_id: editFormState.protocolo_pacote_id || null,
          titulo: editFormState.titulo,
          descricao: editFormState.descricao || undefined,
          status: editFormState.status,
          validade_dias: Number(editFormState.validade_dias) || 30,
          total_previsto: Number(editFormState.total_previsto) || 0,
          total_pago: Number(editFormState.total_pago) || 0,
          observacoes: editFormState.observacoes || undefined,
          itens: editItens,
        },
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false)
          setEditFormState(null)
          setEditItens([])
        },
      },
    )
  }

  const handleRequestDeletePlano = () => {
    if (!planoDetalhes) return
    setPendingDeletePlanoId(planoDetalhes.id)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDeletePlano = () => {
    if (!pendingDeletePlanoId) return

    deletePlano.mutate(pendingDeletePlanoId, {
      onSuccess: () => {
        setIsDeleteConfirmOpen(false)
        setPendingDeletePlanoId(null)
        if (selectedPlanoId === pendingDeletePlanoId) {
          handleCloseDetails()
        }
      },
    })
  }

  const handlePrintPlano = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const selectedPlanoStatusMeta = statusOptions.find((option) => option.value === planoDetalhes?.status)

  return (
    <div className="w-full h-full space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Planos de Tratamento</h1>
          <p className="text-sm text-muted-foreground">
            Centralize diagnósticos, protocolos e acompanhamentos clínicos em planos personalizados.
          </p>
        </div>
        <PlanoAtivoButton
          className="bg-primary-600 hover:bg-primary-700"
          variant="primary"
          onClick={handleOpenCreateModal}
        >
          <FileText className="mr-2 h-4 w-4" />
          Novo Plano
        </PlanoAtivoButton>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Planos Ativos</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {planos.filter((plano) => ['aprovado', 'em_execucao'].includes(plano.status)).length}
              </h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{count} planos no total</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Em Aprovação</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {planos.filter((plano) => plano.status === 'em_aprovacao').length}
              </h3>
            </div>
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Protocolos aguardando confirmação</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Concluídos no Mês</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {planos.filter((plano) => {
                  if (plano.status !== 'concluido') return false
                  const createdAt = new Date(plano.updated_at || plano.created_at)
                  const now = new Date()
                  return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
                }).length}
              </h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Protocolos finalizados neste mês</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Receita Prevista</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {formatCurrency(
                  planos.reduce((total, plano) => total + Number(plano.total_previsto || 0), 0),
                )}
              </h3>
            </div>
            <div className="rounded-full bg-sky-500/10 p-2 text-sky-500">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Considera os planos listados nesta página</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-xs">
              <Input
                placeholder="Buscar por título, paciente ou observações"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-3"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="mt-4 text-sm">Carregando planos de tratamento...</p>
          </div>
        ) : planos.length === 0 ? (
          <Card className="col-span-full border-dashed border-2 border-muted">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum plano encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Ajuste os filtros de busca ou crie um novo plano de tratamento para começar a acompanhar os protocolos clínicos da sua equipe.
              </p>
              <Button className="mt-6" onClick={handleOpenCreateModal}>
                <FileText className="mr-2 h-4 w-4" />
                Criar primeiro plano
              </Button>
            </CardContent>
          </Card>
        ) : (
          planos.map((plano) => {
            const pacienteNome = pacientesMap.get(plano.paciente_id)
            const profissionalNome = plano.responsavel_profissional_id
              ? profissionaisMap.get(plano.responsavel_profissional_id)
              : null
            const statusMeta = statusOptions.find((option) => option.value === plano.status)

            return (
              <Card
                key={plano.id}
                className="group relative rounded-2xl border border-border/60 shadow-sm transition-all hover:shadow-lg cursor-pointer"
                onClick={() => handleOpenDetails(plano)}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-400 to-secondary-500 opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {plano.titulo}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserCircle className="h-4 w-4" />
                        {pacienteNome ?? 'Paciente não encontrado'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusMeta && <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Editar"
                        aria-label="Editar"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEditFromList(plano)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        title="Excluir"
                        aria-label="Excluir"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRequestDeleteFromList(plano)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div className="flex flex-col rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Responsável</span>
                      <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                        <Stethoscope className="h-4 w-4 text-primary-500" />
                        {profissionalNome ?? 'Sem responsável definido'}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</span>
                      <Select
                        value={plano.status}
                        onValueChange={(value) => handleStatusUpdate(plano.id, value as StatusPlanoTratamento)}
                      >
                        <SelectTrigger
                          className="h-9"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Criado em</span>
                      <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 text-primary-500" />
                        {new Date(plano.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Valor previsto</span>
                      <span className="flex items-center gap-2 font-semibold text-primary-600 dark:text-primary-300">
                        <Coins className="h-4 w-4" />
                        {formatCurrency(Number(plano.total_previsto || 0))}
                      </span>
                    </div>
                  </div>

                  {plano.observacoes && (
                    <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/60 p-3 text-sm text-primary-900 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-100">
                      {plano.observacoes}
                    </div>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Atualizado em {new Date(plano.updated_at).toLocaleDateString('pt-BR')} às {new Date(plano.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenDetails(plano)
                      }}
                    >
                      Detalhes do plano
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
        </div>
      </section>

      {/* Criação de plano */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo plano de tratamento</DialogTitle>
            <DialogDescription>
              Defina o paciente, o responsável clínico e as premissas principais do plano. Você poderá complementar itens e sessões posteriormente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={handleCreatePlano} disabled={createPlano.isPending}>
              {createPlano.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Criar plano
                </>
              )}
            </Button>
          </div>

          <div className="grid gap-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select
                  value={formState.paciente_id}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, paciente_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map((paciente) => (
                      <SelectItem key={paciente.id} value={paciente.id}>
                        {paciente.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsável clínico</Label>
                <Select
                  value={formState.responsavel_profissional_id || 'none'}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      responsavel_profissional_id: value === 'none' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {profissionais.map((profissional) => (
                      <SelectItem key={profissional.id} value={profissional.id}>
                        {profissional.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Protocolo/Pacote</Label>
              <Select
                value={formState.protocolo_pacote_id || 'none'}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    protocolo_pacote_id: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um protocolo/pacote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem protocolo/pacote</SelectItem>
                  {pacotes.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-semibold">Procedimentos do plano</Label>
              <p className="text-xs text-muted-foreground">Adicione procedimentos que farão parte deste plano de tratamento.</p>
              {createItens.map((item, idx) => {
                const proc = item.procedimento_id ? procedimentosMap.get(item.procedimento_id) : null
                return (
                  <div key={idx} className="rounded-lg border p-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Procedimento</Label>
                        <Select
                          value={item.procedimento_id || 'none'}
                          onValueChange={(v) => {
                            setCreateItens((prev) => {
                              const next = [...prev]
                              const selectedProc: any = v !== 'none' ? procedimentosMap.get(v) : null
                              next[idx] = {
                                ...next[idx],
                                procedimento_id: v === 'none' ? null : v,
                                descricao_personalizada: selectedProc?.nome || next[idx].descricao_personalizada,
                                valor_unitario: selectedProc?.valor_base ?? next[idx].valor_unitario ?? 0,
                              }
                              return next
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um procedimento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum (item manual)</SelectItem>
                            {(procedimentosList as any[]).map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{item.procedimento_id ? 'Descrição personalizada' : 'Descrição do item *'}</Label>
                        <Input
                          value={item.descricao_personalizada || ''}
                          onChange={(e) => {
                            setCreateItens((prev) => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], descricao_personalizada: e.target.value }
                              return next
                            })
                          }}
                          placeholder={proc ? proc.nome : 'Ex: Limpeza de pele'}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantidade ?? 1}
                          onChange={(e) => {
                            setCreateItens((prev) => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], quantidade: Number(e.target.value) || 1 }
                              return next
                            })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor unitário (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.valor_unitario ?? 0}
                          onChange={(e) => {
                            setCreateItens((prev) => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], valor_unitario: Number(e.target.value) || 0 }
                              return next
                            })
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Desconto (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={item.desconto_percentual ?? 0}
                          onChange={(e) => {
                            setCreateItens((prev) => {
                              const next = [...prev]
                              next[idx] = { ...next[idx], desconto_percentual: Number(e.target.value) || 0 }
                              return next
                            })
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        setCreateItens((prev) => prev.filter((_, i) => i !== idx))
                      }}>
                        Remover
                      </Button>
                    </div>
                  </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateItens((prev) => [
                    ...prev,
                    {
                      procedimento_id: null,
                      descricao_personalizada: '',
                      quantidade: 1,
                      ordem: prev.length,
                      valor_unitario: 0,
                      desconto_percentual: 0,
                      observacoes: null,
                    },
                  ])
                }}
              >
                + Adicionar procedimento / item
              </Button>
            </div>
            <Separator />

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Plano de Rejuvenescimento Facial"
                value={formState.titulo}
                onChange={(event) => setFormState((prev) => ({ ...prev, titulo: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição clínica</Label>
              <Textarea
                placeholder="Resumo do diagnóstico, objetivos terapêuticos e abordagem sugerida"
                value={formState.descricao}
                onChange={(event) => setFormState((prev) => ({ ...prev, descricao: event.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Status inicial</Label>
                <Select
                  value={formState.status}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as StatusPlanoTratamento }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formState.validade_dias}
                  onChange={(event) => setFormState((prev) => ({ ...prev, validade_dias: Number(event.target.value) || 0 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor previsto (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.total_previsto}
                  onChange={(event) => setFormState((prev) => ({ ...prev, total_previsto: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor pago (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.total_pago}
                  onChange={(event) => setFormState((prev) => ({ ...prev, total_pago: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Início previsto</Label>
                <SimpleDateTime
                  showTime={false}
                  value={formState.data_prevista_inicio || ''}
                  onChange={(value) => setFormState((prev) => ({ ...prev, data_prevista_inicio: value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Conclusão prevista</Label>
                <SimpleDateTime
                  showTime={false}
                  value={formState.data_prevista_conclusao || ''}
                  onChange={(value) => setFormState((prev) => ({ ...prev, data_prevista_conclusao: value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações adicionais</Label>
              <Textarea
                placeholder="Orientações específicas, restrições ou cuidados importantes"
                value={formState.observacoes}
                onChange={(event) => setFormState((prev) => ({ ...prev, observacoes: event.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePlano} disabled={createPlano.isPending}>
              {createPlano.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Criar plano
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes do plano */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => (open ? setIsDetailsOpen(true) : handleCloseDetails())}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planoDetalhes ? planoDetalhes.titulo : 'Detalhes do plano'}
            </DialogTitle>
            {planoDetalhes && (
              <DialogDescription className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                {pacientesMap.get(planoDetalhes.paciente_id) ?? 'Paciente não encontrado'}
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoadingPlano ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm">Carregando informações do plano...</p>
            </div>
          ) : planoDetalhes ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Responsável</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {planoDetalhes.responsavel_profissional_id
                      ? profissionaisMap.get(planoDetalhes.responsavel_profissional_id) ?? 'Não informado'
                      : 'Não informado'}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Protocolo/Pacote</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {planoDetalhes.protocolo_pacote_id
                      ? pacotesMap.get(planoDetalhes.protocolo_pacote_id) ?? 'Não informado'
                      : 'Não informado'}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Status atual</p>
                  <div className="mt-2 flex items-center gap-2">
                    {selectedPlanoStatusMeta && <Badge className={selectedPlanoStatusMeta.badgeClass}>{selectedPlanoStatusMeta.label}</Badge>}
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Valor previsto</p>
                  <p className="mt-1 text-lg font-semibold text-primary-600 dark:text-primary-400">
                    {formatCurrency(Number(planoDetalhes.total_previsto || 0))}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Valor pago</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(planoDetalhes.total_pago || 0))}
                  </p>
                </div>
              </div>

              {planoDetalhes.itens && planoDetalhes.itens.length > 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Procedimentos / Itens do plano</p>
                  <div className="space-y-2">
                    {planoDetalhes.itens.map((item, idx) => {
                      const proc: any = item.procedimento_id ? procedimentosMap.get(item.procedimento_id) : null
                      const nome = proc?.nome || item.descricao_personalizada || '—'
                      const subtotal = (item.valor_unitario ?? 0) * (item.quantidade ?? 1) * (1 - (item.desconto_percentual ?? 0) / 100)
                      return (
                        <div key={item.id || idx} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{nome}</span>
                            {item.procedimento_id && <Badge variant="secondary" className="ml-2 text-[10px]">Procedimento</Badge>}
                            {!item.procedimento_id && <Badge variant="outline" className="ml-2 text-[10px]">Manual</Badge>}
                            <span className="ml-2 text-muted-foreground">
                              {item.quantidade ?? 1}x {formatCurrency(item.valor_unitario ?? 0)}
                              {(item.desconto_percentual ?? 0) > 0 ? ` (-${item.desconto_percentual}%)` : ''}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sessões</p>

                {(() => {
                  const sessoes = (sessoesPlano || []).filter((s: any) => s.plano_tratamento_id === planoDetalhes.id)
                  const realizadas = sessoes.filter((s: any) => Boolean(s.inicio_real) || s.status === 'concluida')
                  const pendentes = sessoes.filter((s: any) => !Boolean(s.inicio_real) && s.status !== 'concluida')

                  const datasRealizadas = realizadas
                    .map((s: any) => s.inicio_real || s.inicio_previsto)
                    .filter((d: any) => Boolean(d))
                    .map((d: any) => new Date(d).toLocaleDateString('pt-BR'))
                    .filter((d: any, idx: number, arr: any[]) => arr.indexOf(d) === idx)
                    .slice(0, 5)

                  const proximasRecomendadas = pendentes
                    .map((s: any) => s.inicio_previsto)
                    .filter((d: any) => Boolean(d))
                    .filter((d: any, idx: number, arr: any[]) => arr.indexOf(d) === idx)
                    .slice(0, 5)
                    .map((d: any) => new Date(d).toLocaleDateString('pt-BR'))

                  const canGerar = Boolean(
                    planoDetalhes.paciente_id &&
                      gerarSessoesQtd > 0 &&
                      Number.isFinite(gerarSessoesQtd) &&
                      gerarSessoesIntervaloDias >= 0
                  )

                  const getStartDateForAppend = () => {
                    const dates = (sessoes || [])
                      .map((s: any) => (s?.inicio_previsto ? new Date(s.inicio_previsto).getTime() : null))
                      .filter((x: any) => typeof x === 'number' && Number.isFinite(x)) as number[]
                    if (dates.length === 0) return new Date()
                    return new Date(Math.max(...dates))
                  }

                  return (
                    <div className="mt-3 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Total de sessões</div>
                          <div className="text-lg font-semibold text-foreground">{sessoes.length}</div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Sessões realizadas</div>
                          <div className="text-lg font-semibold text-foreground">{realizadas.length}</div>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Sessões pendentes</div>
                          <div className="text-lg font-semibold text-foreground">{pendentes.length}</div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">Datas realizadas</div>
                          <div className="mt-1 text-sm text-foreground">{datasRealizadas.length ? datasRealizadas.join(', ') : 'Nenhuma'}</div>
                        </div>
                        <div className="rounded-lg bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground">Próximas recomendadas</div>
                          <div className="mt-1 text-sm text-foreground">{proximasRecomendadas.length ? proximasRecomendadas.join(', ') : 'Nenhuma'}</div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/60 p-3">
                        <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                          <div className="space-y-2">
                            <Label>Adicionar sessões</Label>
                            <Input
                              type="number"
                              min={0}
                              value={gerarSessoesQtd}
                              onChange={(e) => setGerarSessoesQtd(Number(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Intervalo (dias)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={gerarSessoesIntervaloDias}
                              onChange={(e) => setGerarSessoesIntervaloDias(Number(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Button
                              type="button"
                              disabled={!canGerar || createSessoes.isPending}
                              onClick={async () => {
                                try {
                                  const start = getStartDateForAppend()
                                  const payloads = Array.from({ length: gerarSessoesQtd }).map((_, idx) => ({
                                    paciente_id: planoDetalhes.paciente_id,
                                    plano_tratamento_id: planoDetalhes.id,
                                    profissional_id: planoDetalhes.responsavel_profissional_id ?? null,
                                    status: 'planejada' as any,
                                    inicio_previsto: addDaysISO(start, (idx + 1) * gerarSessoesIntervaloDias),
                                  }))
                                  await createSessoes.mutateAsync(payloads)
                                  toast.success('Sessões adicionadas!')
                                } catch (e: any) {
                                  toast.error(e?.message || 'Erro ao adicionar sessões')
                                }
                              }}
                            >
                              {createSessoes.isPending ? 'Adicionando...' : 'Adicionar'}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {sessoes.length === 0 ? null : (
                        <div className="space-y-2">
                          {sessoes.slice(0, 10).map((s: any, idx: number) => {
                            const realizado = Boolean(s.inicio_real) || s.status === 'concluida'
                            const label = s.inicio_previsto
                              ? new Date(s.inicio_previsto).toLocaleDateString('pt-BR')
                              : `Sessão ${idx + 1}`
                            const localInicioPrevisto = sessaoInicioPrevistoById[s.id] ?? (s.inicio_previsto || '')
                            return (
                              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground">{label}</div>
                                  <div className="text-xs text-muted-foreground">Status: {String(s.status || '').replace(/_/g, ' ')}</div>

                                  <div className="mt-2 grid gap-2 sm:grid-cols-2 sm:items-end">
                                    <div className="space-y-1">
                                      <div className="text-xs text-muted-foreground">Data prevista</div>
                                      <SimpleDateTime
                                        showTime={false}
                                        value={localInicioPrevisto}
                                        onChange={(value) =>
                                          setSessaoInicioPrevistoById((prev) => ({ ...prev, [s.id]: value }))
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        disabled={updateSessao.isPending}
                                        onClick={async () => {
                                          try {
                                            await updateSessao.mutateAsync({
                                              id: s.id,
                                              data: { inicio_previsto: localInicioPrevisto || null },
                                            })
                                            toast.success('Sessão atualizada!')
                                          } catch (e: any) {
                                            toast.error(e?.message || 'Erro ao atualizar sessão')
                                          }
                                        }}
                                      >
                                        Salvar data
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Button
                                    type="button"
                                    variant={realizado ? 'outline' : 'default'}
                                    disabled={updateSessao.isPending}
                                    onClick={async () => {
                                      try {
                                        if (realizado) {
                                          await updateSessao.mutateAsync({
                                            id: s.id,
                                            data: { status: 'planejada' as any, inicio_real: null, termino_real: null },
                                          })
                                        } else {
                                          await updateSessao.mutateAsync({
                                            id: s.id,
                                            data: { status: 'concluida' as any, inicio_real: s.inicio_previsto || new Date().toISOString() },
                                          })
                                        }
                                      } catch (e: any) {
                                        toast.error(e?.message || 'Erro ao atualizar sessão')
                                      }
                                    }}
                                  >
                                    {realizado ? 'Desfazer' : 'Marcar realizada'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={deleteSessao.isPending}
                                    onClick={async () => {
                                      try {
                                        await deleteSessao.mutateAsync(s.id)
                                        toast.success('Sessão removida!')
                                      } catch (e: any) {
                                        toast.error(e?.message || 'Erro ao remover sessão')
                                      }
                                    }}
                                  >
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                          {sessoes.length > 10 ? (
                            <div className="text-xs text-muted-foreground">Mostrando 10 de {sessoes.length} sessões.</div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Agendamentos do paciente */}
              {agendamentosPaciente.length > 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Agendamentos do paciente</p>
                  <div className="space-y-2">
                    {agendamentosPaciente.slice(0, 20).map((ag: any) => {
                      const dataStr = ag.data_inicio
                        ? new Date(ag.data_inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'
                      const statusLabel = ag.status === 'concluido' ? 'Concluído'
                        : ag.status === 'agendado' ? 'Agendado'
                        : ag.status === 'confirmado' ? 'Confirmado'
                        : ag.status === 'cancelado' ? 'Cancelado'
                        : ag.status === 'remarcado' ? 'Remarcado'
                        : ag.status || '—'
                      const statusColor = ag.status === 'concluido' ? 'bg-green-100 text-green-800'
                        : ag.status === 'agendado' ? 'bg-blue-100 text-blue-800'
                        : ag.status === 'confirmado' ? 'bg-emerald-100 text-emerald-800'
                        : ag.status === 'cancelado' ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                      return (
                        <div key={ag.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{ag.titulo || 'Agendamento'}</span>
                            <span className="ml-2 text-muted-foreground text-xs">{dataStr}</span>
                          </div>
                          <Badge className={statusColor + ' text-[10px]'}>{statusLabel}</Badge>
                        </div>
                      )
                    })}
                    {agendamentosPaciente.length > 20 && (
                      <div className="text-xs text-muted-foreground">Mostrando 20 de {agendamentosPaciente.length} agendamentos.</div>
                    )}
                  </div>
                </div>
              )}

              {planoDetalhes.descricao && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800/60 dark:text-gray-200">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Descrição clínica</p>
                  <p className="mt-2 leading-relaxed">{planoDetalhes.descricao}</p>
                </div>
              )}

              {planoDetalhes.observacoes && (
                <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/60 p-4 text-sm text-primary-900 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-100">
                  <p className="font-semibold">Observações</p>
                  <p className="mt-2 leading-relaxed">{planoDetalhes.observacoes}</p>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-gray-200 p-4 dark:border-gray-800">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Cronograma</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(planoDetalhes.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última atualização</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(planoDetalhes.updated_at).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              {planoDetalhes.itens && planoDetalhes.itens.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Procedimentos e etapas</p>
                  <div className="space-y-2">
                    {planoDetalhes.itens.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900/70">
                        <p className="font-medium text-foreground">{item.descricao_personalizada ?? 'Procedimento personalizado'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>Quantidade: {item.quantidade}</span>
                          <span>Ordem: {item.ordem + 1}</span>
                          <span>Valor unitário: {formatCurrency(Number(item.valor_unitario || 0))}</span>
                          <span>Total: {formatCurrency(Number(item.total || 0))}</span>
                        </div>
                        {item.observacoes && (
                          <p className="mt-2 text-xs text-muted-foreground">{item.observacoes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10" />
              <p className="mt-3 text-sm">Não foi possível carregar os detalhes do plano selecionado.</p>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {planoDetalhes && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRequestDeletePlano}
                disabled={deletePlano.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir plano
              </Button>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {planoDetalhes && (
                <>
                  <Button type="button" variant="outline" onClick={handlePrintPlano}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button type="button" onClick={handleOpenEditModal}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar plano
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" onClick={handleCloseDetails}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edição de plano */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano de tratamento</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do plano de tratamento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSaveEditPlano} disabled={updatePlano.isPending || !editFormState}>
              {updatePlano.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </div>

          {editFormState && (
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select
                    value={editFormState.paciente_id}
                    onValueChange={(value) =>
                      setEditFormState((prev) => (prev ? { ...prev, paciente_id: value } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes.map((paciente) => (
                        <SelectItem key={paciente.id} value={paciente.id}>
                          {paciente.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Responsável clínico</Label>
                  <Select
                    value={editFormState.responsavel_profissional_id || 'none'}
                    onValueChange={(value) =>
                      setEditFormState((prev) =>
                        prev
                          ? {
                              ...prev,
                              responsavel_profissional_id: value === 'none' ? '' : value,
                            }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {profissionais.map((profissional) => (
                        <SelectItem key={profissional.id} value={profissional.id}>
                          {profissional.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Protocolo/Pacote</Label>
                <Select
                  value={editFormState.protocolo_pacote_id || 'none'}
                  onValueChange={(value) =>
                    setEditFormState((prev) =>
                      prev
                        ? {
                            ...prev,
                            protocolo_pacote_id: value === 'none' ? '' : value,
                          }
                        : prev,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um protocolo/pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem protocolo/pacote</SelectItem>
                    {pacotes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">Procedimentos do plano</Label>
                <p className="text-xs text-muted-foreground">Gerencie os procedimentos incluídos neste plano de tratamento.</p>
                {editItens.map((item, idx) => {
                  const proc = item.procedimento_id ? procedimentosMap.get(item.procedimento_id) : null
                  return (
                    <div key={idx} className="rounded-lg border p-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Procedimento</Label>
                          <Select
                            value={item.procedimento_id || 'none'}
                            onValueChange={(v) => {
                              setEditItens((prev) => {
                                const next = [...prev]
                                const selectedProc: any = v !== 'none' ? procedimentosMap.get(v) : null
                                next[idx] = {
                                  ...next[idx],
                                  procedimento_id: v === 'none' ? null : v,
                                  descricao_personalizada: selectedProc?.nome || next[idx].descricao_personalizada,
                                  valor_unitario: selectedProc?.valor_base ?? next[idx].valor_unitario ?? 0,
                                }
                                return next
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um procedimento" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (item manual)</SelectItem>
                              {(procedimentosList as any[]).map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{item.procedimento_id ? 'Descrição personalizada' : 'Descrição do item *'}</Label>
                          <Input
                            value={item.descricao_personalizada || ''}
                            onChange={(e) => {
                              setEditItens((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], descricao_personalizada: e.target.value }
                                return next
                              })
                            }}
                            placeholder={proc ? proc.nome : 'Ex: Limpeza de pele'}
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantidade ?? 1}
                            onChange={(e) => {
                              setEditItens((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], quantidade: Number(e.target.value) || 1 }
                                return next
                              })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor unitário (R$)</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.valor_unitario ?? 0}
                            onChange={(e) => {
                              setEditItens((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], valor_unitario: Number(e.target.value) || 0 }
                                return next
                              })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Desconto (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={item.desconto_percentual ?? 0}
                            onChange={(e) => {
                              setEditItens((prev) => {
                                const next = [...prev]
                                next[idx] = { ...next[idx], desconto_percentual: Number(e.target.value) || 0 }
                                return next
                              })
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          setEditItens((prev) => prev.filter((_, i) => i !== idx))
                        }}>
                          Remover
                        </Button>
                      </div>
                    </div>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditItens((prev) => [
                      ...prev,
                      {
                        procedimento_id: null,
                        descricao_personalizada: '',
                        quantidade: 1,
                        ordem: prev.length,
                        valor_unitario: 0,
                        desconto_percentual: 0,
                        observacoes: null,
                      },
                    ])
                  }}
                >
                  + Adicionar procedimento / item
                </Button>
              </div>
              <Separator />

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={editFormState.titulo}
                  onChange={(event) =>
                    setEditFormState((prev) =>
                      prev ? { ...prev, titulo: event.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição clínica</Label>
                <Textarea
                  value={editFormState.descricao}
                  onChange={(event) =>
                    setEditFormState((prev) =>
                      prev ? { ...prev, descricao: event.target.value } : prev,
                    )
                  }
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editFormState.status}
                    onValueChange={(value) =>
                      setEditFormState((prev) =>
                        prev
                          ? { ...prev, status: value as StatusPlanoTratamento }
                          : prev,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Validade (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editFormState.validade_dias}
                    onChange={(event) =>
                      setEditFormState((prev) =>
                        prev
                          ? {
                              ...prev,
                              validade_dias: Number(event.target.value) || 0,
                            }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor previsto (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormState.total_previsto}
                    onChange={(event) =>
                      setEditFormState((prev) =>
                        prev
                          ? { ...prev, total_previsto: event.target.value }
                          : prev,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor pago (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormState.total_pago}
                    onChange={(event) =>
                      setEditFormState((prev) =>
                        prev
                          ? { ...prev, total_pago: event.target.value }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações adicionais</Label>
                <Textarea
                  value={editFormState.observacoes}
                  onChange={(event) =>
                    setEditFormState((prev) =>
                      prev ? { ...prev, observacoes: event.target.value } : prev,
                    )
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setEditFormState(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditPlano}
              disabled={updatePlano.isPending || !editFormState}
            >
              {updatePlano.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open)
          if (!open) setPendingDeletePlanoId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir plano de tratamento</DialogTitle>
            <DialogDescription>
              Essa ação não pode ser desfeita. Tem certeza que deseja excluir este plano?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeletePlano}
              disabled={deletePlano.isPending}
            >
              {deletePlano.isPending ? 'Excluindo...' : 'Excluir plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PlanosTratamentoPage
