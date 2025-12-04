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
import { type StatusPlanoTratamento, type PlanoTratamento } from '@/services/api/planos-tratamento'
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

  const { data: planos = [], count = 0, isLoading } = usePlanosTratamento({
    page,
    limit,
    status: statusFilter === 'todos' ? undefined : (statusFilter as StatusPlanoTratamento),
    search: searchTerm || undefined,
  })

  const { data: planoDetalhes, isLoading: isLoadingPlano } = usePlanoTratamento(isDetailsOpen ? selectedPlanoId ?? undefined : undefined)

  const { data: pacientes = [] } = usePacientes({ limit: 100 })
  const { data: profissionais = [] } = useProfissionaisClinica()

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

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchTerm])

  const totalPages = Math.max(1, Math.ceil(count / limit))

  const handleOpenCreateModal = () => {
    setFormState(initialFormState)
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
        titulo: formState.titulo,
        descricao: formState.descricao || undefined,
        status: formState.status,
        validade_dias: Number(formState.validade_dias) || 30,
        total_previsto: Number(formState.total_previsto) || 0,
        total_pago: Number(formState.total_pago) || 0,
        observacoes: formState.observacoes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Plano de tratamento criado com sucesso!')
          setIsCreateModalOpen(false)
          setFormState(initialFormState)
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

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedPlanoId(null)
  }

  const handleOpenEditModal = () => {
    if (!planoDetalhes) return

    setEditFormState({
      paciente_id: planoDetalhes.paciente_id,
      responsavel_profissional_id: planoDetalhes.responsavel_profissional_id ?? '',
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
          titulo: editFormState.titulo,
          descricao: editFormState.descricao || undefined,
          status: editFormState.status,
          validade_dias: Number(editFormState.validade_dias) || 30,
          total_previsto: Number(editFormState.total_previsto) || 0,
          total_pago: Number(editFormState.total_pago) || 0,
          observacoes: editFormState.observacoes || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsEditModalOpen(false)
          setEditFormState(null)
        },
      },
    )
  }

  const handleRequestDeletePlano = () => {
    if (!planoDetalhes) return
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDeletePlano = () => {
    if (!planoDetalhes) return

    deletePlano.mutate(planoDetalhes.id, {
      onSuccess: () => {
        setIsDeleteConfirmOpen(false)
        handleCloseDetails()
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
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Planos de Tratamento</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Centralize diagnósticos, protocolos e acompanhamentos clínicos em planos personalizados para cada paciente.
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
        <Card className="bg-gradient-to-br from-primary-500/90 to-primary-600 text-white shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide">
              Planos ativos
            </CardTitle>
            <CardDescription className="text-primary-100">Monitoramento clínico em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {planos.filter((plano) => ['aprovado', 'em_execucao'].includes(plano.status)).length}
            </div>
            <p className="text-xs text-primary-100 mt-2">
              {count} planos no total
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Em aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {planos.filter((plano) => plano.status === 'em_aprovacao').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Protocolos aguardando confirmação clínica
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Concluídos no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {planos.filter((plano) => {
                if (plano.status !== 'concluido') return false
                const createdAt = new Date(plano.updated_at || plano.created_at)
                const now = new Date()
                return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Protocolos finalizados neste mês
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Receita prevista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(
                planos.reduce((total, plano) => total + Number(plano.total_previsto || 0), 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Considera os planos listados nesta página
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
          <div className="relative md:max-w-xs">
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
            <SelectTrigger className="w-full md:w-56">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
              <Card key={plano.id} className="group relative border border-gray-100 shadow-sm transition-all hover:shadow-lg dark:border-gray-800">
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
                    {statusMeta && (
                      <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                    )}
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
                        <SelectTrigger className="h-9">
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenDetails(plano)}>
                      Detalhes do plano
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </section>

      {/* Criação de plano */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Novo plano de tratamento</DialogTitle>
            <DialogDescription>
              Defina o paciente, o responsável clínico e as premissas principais do plano. Você poderá complementar itens e sessões posteriormente.
            </DialogDescription>
          </DialogHeader>

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
        <DialogContent className="max-w-3xl">
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar plano de tratamento</DialogTitle>
            <DialogDescription>
              Atualize as informações principais do plano de tratamento.
            </DialogDescription>
          </DialogHeader>

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
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
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
