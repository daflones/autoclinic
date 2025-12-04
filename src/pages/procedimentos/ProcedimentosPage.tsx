import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Filter, Stethoscope, Edit, Trash2, DollarSign, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  useProcedimentos,
  useCreateProcedimento,
  useUpdateProcedimento,
  useDeleteProcedimento,
} from '@/hooks/useProcedimentos'
import { useCategoriasProcedimento } from '@/hooks/useCategoriasProcedimento'
import type {
  Procedimento,
  ProcedimentoCreateData,
  StatusProcedimento,
} from '@/services/api/procedimentos'

const STATUS_CONFIG: Record<StatusProcedimento, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  ativo: { label: 'Ativo', variant: 'default' },
  inativo: { label: 'Inativo', variant: 'secondary' },
  descontinuado: { label: 'Descontinuado', variant: 'destructive' },
}

export function ProcedimentosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusProcedimento | 'all'>('all')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProcedimento, setSelectedProcedimento] = useState<Procedimento | null>(null)

  const [formState, setFormState] = useState<ProcedimentoCreateData>({
    nome: '',
    descricao: '',
    codigo: '',
    categoria_id: null,
    duracao_estimada: undefined,
    valor_base: undefined,
    valor_minimo: undefined,
    valor_maximo: undefined,
    requer_autorizacao: false,
    observacoes: '',
    status: 'ativo',
  })

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      categoria_id: categoriaFilter !== 'all' ? categoriaFilter : undefined,
    }),
    [searchTerm, statusFilter, categoriaFilter]
  )

  const { data: procedimentos, isLoading, count } = useProcedimentos(filters)
  const { data: categorias } = useCategoriasProcedimento({ limit: 1000 })

  const createMutation = useCreateProcedimento()
  const updateMutation = useUpdateProcedimento()
  const deleteMutation = useDeleteProcedimento()

  const stats = useMemo(() => {
    return {
      total: count,
      ativos: procedimentos.filter((p) => p.status === 'ativo').length,
      inativos: procedimentos.filter((p) => p.status === 'inativo').length,
    }
  }, [procedimentos, count])

  const handleCreateProcedimento = async () => {
    if (!formState.nome) {
      toast.error('Preencha o nome do procedimento')
      return
    }

    try {
      await createMutation.mutateAsync(formState)
      setIsCreateModalOpen(false)
      setFormState({
        nome: '',
        descricao: '',
        codigo: '',
        categoria_id: null,
        duracao_estimada: undefined,
        valor_base: undefined,
        valor_minimo: undefined,
        valor_maximo: undefined,
        requer_autorizacao: false,
        observacoes: '',
        status: 'ativo',
      })
    } catch (error) {
      console.error('Erro ao criar procedimento:', error)
    }
  }

  const handleOpenEdit = (procedimento: Procedimento) => {
    setSelectedProcedimento(procedimento)
    setFormState({
      nome: procedimento.nome,
      descricao: procedimento.descricao || '',
      codigo: procedimento.codigo || '',
      categoria_id: procedimento.categoria_id,
      duracao_estimada: procedimento.duracao_estimada || undefined,
      valor_base: procedimento.valor_base || undefined,
      valor_minimo: procedimento.valor_minimo || undefined,
      valor_maximo: procedimento.valor_maximo || undefined,
      requer_autorizacao: procedimento.requer_autorizacao,
      observacoes: procedimento.observacoes || '',
      status: procedimento.status,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProcedimento) return

    try {
      await updateMutation.mutateAsync({
        id: selectedProcedimento.id,
        data: formState,
      })
      setIsEditModalOpen(false)
      setSelectedProcedimento(null)
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error)
    }
  }

  const handleRequestDelete = (procedimento: Procedimento) => {
    setSelectedProcedimento(procedimento)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedProcedimento) return

    try {
      await deleteMutation.mutateAsync(selectedProcedimento.id)
      setIsDeleteConfirmOpen(false)
      setSelectedProcedimento(null)
    } catch (error) {
      console.error('Erro ao excluir procedimento:', error)
    }
  }

  const formatCurrency = (value?: number | null) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDuration = (minutes?: number | null) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`
    }
    return `${mins}min`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procedimentos</h1>
          <p className="text-muted-foreground">Gerencie os procedimentos e tratamentos oferecidos</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Procedimento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Procedimentos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">Disponíveis para agendamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inativos}</div>
            <p className="text-xs text-muted-foreground">Temporariamente indisponíveis</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, código ou descrição..."
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
              <Label htmlFor="categoria-filter">Categoria</Label>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger id="categoria-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
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
          <CardTitle>Procedimentos ({count})</CardTitle>
          <CardDescription>Lista de todos os procedimentos cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : procedimentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum procedimento encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {procedimentos.map((procedimento) => {
                const statusConfig = STATUS_CONFIG[procedimento.status]

                return (
                  <div
                    key={procedimento.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{procedimento.nome}</h3>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        {procedimento.categoria && (
                          <Badge variant="outline">{procedimento.categoria.nome}</Badge>
                        )}
                      </div>
                      {procedimento.descricao && (
                        <p className="text-sm text-muted-foreground">{procedimento.descricao}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {procedimento.codigo && <span>Código: {procedimento.codigo}</span>}
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(procedimento.valor_base)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(procedimento.duracao_estimada)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(procedimento)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestDelete(procedimento)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Procedimento</DialogTitle>
            <DialogDescription>Cadastre um novo procedimento ou tratamento</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-nome">Nome *</Label>
                <Input
                  id="create-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                  placeholder="Ex: Limpeza de Pele"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-codigo">Código</Label>
                <Input
                  id="create-codigo"
                  value={formState.codigo || ''}
                  onChange={(e) => setFormState({ ...formState, codigo: e.target.value })}
                  placeholder="Ex: LP001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-categoria">Categoria</Label>
              <Select
                value={formState.categoria_id || 'none'}
                onValueChange={(v) =>
                  setFormState({ ...formState, categoria_id: v === 'none' ? null : v })
                }
              >
                <SelectTrigger id="create-categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-descricao">Descrição</Label>
              <Textarea
                id="create-descricao"
                value={formState.descricao || ''}
                onChange={(e) => setFormState({ ...formState, descricao: e.target.value })}
                placeholder="Descreva o procedimento..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="create-valor-base">Valor Base (R$)</Label>
                <Input
                  id="create-valor-base"
                  type="number"
                  step="0.01"
                  value={formState.valor_base || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_base: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-valor-minimo">Valor Mínimo (R$)</Label>
                <Input
                  id="create-valor-minimo"
                  type="number"
                  step="0.01"
                  value={formState.valor_minimo || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_minimo: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-valor-maximo">Valor Máximo (R$)</Label>
                <Input
                  id="create-valor-maximo"
                  type="number"
                  step="0.01"
                  value={formState.valor_maximo || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_maximo: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-duracao">Duração Estimada (minutos)</Label>
                <Input
                  id="create-duracao"
                  type="number"
                  value={formState.duracao_estimada || ''}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      duracao_estimada: parseInt(e.target.value) || undefined,
                    })
                  }
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(v) =>
                    setFormState({ ...formState, status: v as StatusProcedimento })
                  }
                >
                  <SelectTrigger id="create-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-observacoes">Observações</Label>
              <Textarea
                id="create-observacoes"
                value={formState.observacoes || ''}
                onChange={(e) => setFormState({ ...formState, observacoes: e.target.value })}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProcedimento} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Procedimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição - Similar ao de criação */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Procedimento</DialogTitle>
            <DialogDescription>Atualize as informações do procedimento</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-codigo">Código</Label>
                <Input
                  id="edit-codigo"
                  value={formState.codigo || ''}
                  onChange={(e) => setFormState({ ...formState, codigo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select
                value={formState.categoria_id || 'none'}
                onValueChange={(v) =>
                  setFormState({ ...formState, categoria_id: v === 'none' ? null : v })
                }
              >
                <SelectTrigger id="edit-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={formState.descricao || ''}
                onChange={(e) => setFormState({ ...formState, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-valor-base">Valor Base (R$)</Label>
                <Input
                  id="edit-valor-base"
                  type="number"
                  step="0.01"
                  value={formState.valor_base || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_base: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valor-minimo">Valor Mínimo (R$)</Label>
                <Input
                  id="edit-valor-minimo"
                  type="number"
                  step="0.01"
                  value={formState.valor_minimo || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_minimo: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valor-maximo">Valor Máximo (R$)</Label>
                <Input
                  id="edit-valor-maximo"
                  type="number"
                  step="0.01"
                  value={formState.valor_maximo || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, valor_maximo: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-duracao">Duração Estimada (minutos)</Label>
                <Input
                  id="edit-duracao"
                  type="number"
                  value={formState.duracao_estimada || ''}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      duracao_estimada: parseInt(e.target.value) || undefined,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(v) =>
                    setFormState({ ...formState, status: v as StatusProcedimento })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Textarea
                id="edit-observacoes"
                value={formState.observacoes || ''}
                onChange={(e) => setFormState({ ...formState, observacoes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
