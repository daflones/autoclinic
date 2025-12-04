import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { Plus, Search, Filter, UserSquare, Edit, Trash2, Mail, Phone, Award } from 'lucide-react'
import { toast } from 'sonner'
import {
  useProfissionaisClinica,
  useCreateProfissionalClinica,
  useUpdateProfissionalClinica,
  useDeleteProfissionalClinica,
} from '@/hooks/useProfissionaisClinica'
import type {
  ProfissionalClinica,
  ProfissionalCreateData,
  StatusProfissional,
  ModalidadeAtendimento,
} from '@/services/api/profissionais-clinica'

const STATUS_CONFIG: Record<StatusProfissional, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ativo: { label: 'Ativo', variant: 'default' },
  inativo: { label: 'Inativo', variant: 'secondary' },
  ferias: { label: 'Férias', variant: 'outline' },
  afastado: { label: 'Afastado', variant: 'secondary' },
  desligado: { label: 'Desligado', variant: 'destructive' },
}

export function ProfissionaisClinicaPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusProfissional | 'all'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalClinica | null>(null)

  const [formState, setFormState] = useState<ProfissionalCreateData>({
    nome: '',
    documento: '',
    email: '',
    telefone: '',
    whatsapp: '',
    conselho: '',
    registro_profissional: '',
    especialidades: [],
    modalidade: undefined,
    percentual_comissao: undefined,
    meta_mensal: undefined,
    status: 'ativo',
  })

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    [searchTerm, statusFilter]
  )

  const { data: profissionais, isLoading } = useProfissionaisClinica(filters)

  const createMutation = useCreateProfissionalClinica()
  const updateMutation = useUpdateProfissionalClinica()
  const deleteMutation = useDeleteProfissionalClinica()

  const stats = useMemo(() => {
    return {
      total: profissionais.length,
      ativos: profissionais.filter((p) => p.status === 'ativo').length,
      inativos: profissionais.filter((p) => p.status === 'inativo').length,
    }
  }, [profissionais])

  const handleCreateProfissional = async () => {
    if (!formState.nome) {
      toast.error('Preencha o nome do profissional')
      return
    }

    try {
      await createMutation.mutateAsync(formState)
      setIsCreateModalOpen(false)
      setFormState({
        nome: '',
        documento: '',
        email: '',
        telefone: '',
        whatsapp: '',
        conselho: '',
        registro_profissional: '',
        especialidades: [],
        modalidade: undefined,
        percentual_comissao: undefined,
        meta_mensal: undefined,
        status: 'ativo',
      })
    } catch (error) {
      console.error('Erro ao criar profissional:', error)
    }
  }

  const handleOpenEdit = (profissional: ProfissionalClinica) => {
    setSelectedProfissional(profissional)
    setFormState({
      nome: profissional.nome,
      documento: profissional.documento || '',
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      whatsapp: profissional.whatsapp || '',
      conselho: profissional.conselho || '',
      registro_profissional: profissional.registro_profissional || '',
      especialidades: profissional.especialidades || [],
      modalidade: profissional.modalidade || undefined,
      percentual_comissao: profissional.percentual_comissao || undefined,
      meta_mensal: profissional.meta_mensal || undefined,
      status: profissional.status,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProfissional) return

    try {
      await updateMutation.mutateAsync({
        id: selectedProfissional.id,
        data: formState,
      })
      setIsEditModalOpen(false)
      setSelectedProfissional(null)
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error)
    }
  }

  const handleRequestDelete = (profissional: ProfissionalClinica) => {
    setSelectedProfissional(profissional)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedProfissional) return

    try {
      await deleteMutation.mutateAsync(selectedProfissional.id)
      setIsDeleteConfirmOpen(false)
      setSelectedProfissional(null)
    } catch (error) {
      console.error('Erro ao excluir profissional:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profissionais da Clínica</h1>
          <p className="text-muted-foreground">Gerencie a equipe clínica e suas especialidades</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Profissional
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UserSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Profissionais cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">Em atividade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <UserSquare className="h-4 w-4 text-muted-foreground" />
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, email ou documento..."
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profissionais ({profissionais.length})</CardTitle>
          <CardDescription>Lista de todos os profissionais da clínica</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : profissionais.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum profissional encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {profissionais.map((profissional) => {
                const statusConfig = STATUS_CONFIG[profissional.status]

                return (
                  <div
                    key={profissional.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{profissional.nome}</h3>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        {profissional.conselho && (
                          <Badge variant="outline">{profissional.conselho}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {profissional.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {profissional.email}
                          </span>
                        )}
                        {profissional.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {profissional.telefone}
                          </span>
                        )}
                        {profissional.especialidades && profissional.especialidades.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {profissional.especialidades.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEdit(profissional)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestDelete(profissional)}
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
            <DialogTitle>Novo Profissional</DialogTitle>
            <DialogDescription>Cadastre um novo profissional da clínica</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-nome">Nome Completo *</Label>
                <Input
                  id="create-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                  placeholder="Ex: Dr. João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-documento">CPF/Documento</Label>
                <Input
                  id="create-documento"
                  value={formState.documento || ''}
                  onChange={(e) => setFormState({ ...formState, documento: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-email">E-mail</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-telefone">Telefone</Label>
                <Input
                  id="create-telefone"
                  value={formState.telefone || ''}
                  onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-conselho">Conselho Profissional</Label>
                <Input
                  id="create-conselho"
                  value={formState.conselho || ''}
                  onChange={(e) => setFormState({ ...formState, conselho: e.target.value })}
                  placeholder="Ex: CRM, CRO, CREFITO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-registro">Número de Registro</Label>
                <Input
                  id="create-registro"
                  value={formState.registro_profissional || ''}
                  onChange={(e) => setFormState({ ...formState, registro_profissional: e.target.value })}
                  placeholder="Ex: 12345/SP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-modalidade">Modalidade de Atendimento</Label>
              <Select
                value={formState.modalidade || ''}
                onValueChange={(value) => setFormState({ ...formState, modalidade: value as ModalidadeAtendimento })}
              >
                <SelectTrigger id="create-modalidade">
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-comissao">Comissão (%)</Label>
                <Input
                  id="create-comissao"
                  type="number"
                  step="0.01"
                  value={formState.percentual_comissao || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, percentual_comissao: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-meta">Meta Mensal (R$)</Label>
                <Input
                  id="create-meta"
                  type="number"
                  step="0.01"
                  value={formState.meta_mensal || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, meta_mensal: parseFloat(e.target.value) || undefined })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(v) =>
                  setFormState({ ...formState, status: v as StatusProfissional })
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProfissional} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Profissional'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição - Similar ao de criação */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Profissional</DialogTitle>
            <DialogDescription>Atualize as informações do profissional</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome Completo *</Label>
                <Input
                  id="edit-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-documento">CPF/Documento</Label>
                <Input
                  id="edit-documento"
                  value={formState.documento || ''}
                  onChange={(e) => setFormState({ ...formState, documento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={formState.telefone || ''}
                  onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-conselho">Conselho Profissional</Label>
                <Input
                  id="edit-conselho"
                  value={formState.conselho || ''}
                  onChange={(e) => setFormState({ ...formState, conselho: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-registro">Número de Registro</Label>
                <Input
                  id="edit-registro"
                  value={formState.registro_profissional || ''}
                  onChange={(e) => setFormState({ ...formState, registro_profissional: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-modalidade">Modalidade de Atendimento</Label>
              <Select
                value={formState.modalidade || ''}
                onValueChange={(value) => setFormState({ ...formState, modalidade: value as ModalidadeAtendimento })}
              >
                <SelectTrigger id="edit-modalidade">
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-comissao">Comissão (%)</Label>
                <Input
                  id="edit-comissao"
                  type="number"
                  step="0.01"
                  value={formState.percentual_comissao || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, percentual_comissao: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-meta">Meta Mensal (R$)</Label>
                <Input
                  id="edit-meta"
                  type="number"
                  step="0.01"
                  value={formState.meta_mensal || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, meta_mensal: parseFloat(e.target.value) || undefined })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(v) =>
                  setFormState({ ...formState, status: v as StatusProfissional })
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
              Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.
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
