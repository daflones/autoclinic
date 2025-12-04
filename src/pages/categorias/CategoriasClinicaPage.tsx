import { useState } from 'react'
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
import { Plus, Palette, Edit, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCategoriasProcedimento,
  useCreateCategoriaProcedimento,
  useUpdateCategoriaProcedimento,
  useDeleteCategoriaProcedimento,
} from '@/hooks/useCategoriasProcedimento'
import type {
  CategoriaProcedimento,
  CategoriaCreateData,
  StatusCategoria,
} from '@/services/api/categorias-procedimento'

const STATUS_CONFIG: Record<StatusCategoria, { label: string; variant: 'default' | 'secondary' }> = {
  ativa: { label: 'Ativa', variant: 'default' },
  inativa: { label: 'Inativa', variant: 'secondary' },
}

export function CategoriasClinicaPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaProcedimento | null>(null)

  const [formState, setFormState] = useState<CategoriaCreateData>({
    nome: '',
    descricao: '',
    cor: '#3b82f6',
    icone: '',
    ordem: undefined,
    status: 'ativa',
  })

  const { data: categorias, isLoading } = useCategoriasProcedimento()

  const createMutation = useCreateCategoriaProcedimento()
  const updateMutation = useUpdateCategoriaProcedimento()
  const deleteMutation = useDeleteCategoriaProcedimento()

  const handleCreateCategoria = async () => {
    if (!formState.nome) {
      toast.error('Preencha o nome da categoria')
      return
    }

    try {
      await createMutation.mutateAsync(formState)
      setIsCreateModalOpen(false)
      setFormState({
        nome: '',
        descricao: '',
        cor: '#3b82f6',
        icone: '',
        ordem: undefined,
        status: 'ativa',
      })
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
    }
  }

  const handleOpenEdit = (categoria: CategoriaProcedimento) => {
    setSelectedCategoria(categoria)
    setFormState({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor || '#3b82f6',
      icone: categoria.icone || '',
      ordem: categoria.ordem || undefined,
      status: categoria.status,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedCategoria) return

    try {
      await updateMutation.mutateAsync({
        id: selectedCategoria.id,
        data: formState,
      })
      setIsEditModalOpen(false)
      setSelectedCategoria(null)
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error)
    }
  }

  const handleRequestDelete = (categoria: CategoriaProcedimento) => {
    setSelectedCategoria(categoria)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedCategoria) return

    try {
      await deleteMutation.mutateAsync(selectedCategoria.id)
      setIsDeleteConfirmOpen(false)
      setSelectedCategoria(null)
    } catch (error) {
      console.error('Erro ao excluir categoria:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias de Procedimentos</h1>
          <p className="text-muted-foreground">Organize os procedimentos por categorias</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Categorias ({categorias.length})
          </CardTitle>
          <CardDescription>Lista de todas as categorias cadastradas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categorias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma categoria encontrada
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categorias.map((categoria) => {
                const statusConfig = STATUS_CONFIG[categoria.status]

                return (
                  <Card key={categoria.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: categoria.cor || '#3b82f6' }}
                          />
                          <CardTitle className="text-base">{categoria.nome}</CardTitle>
                        </div>
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {categoria.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {categoria.descricao}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenEdit(categoria)}
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestDelete(categoria)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma nova categoria de procedimentos</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-nome">Nome *</Label>
              <Input
                id="create-nome"
                value={formState.nome}
                onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                placeholder="Ex: Tratamentos Faciais"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-descricao">Descrição</Label>
              <Textarea
                id="create-descricao"
                value={formState.descricao || ''}
                onChange={(e) => setFormState({ ...formState, descricao: e.target.value })}
                placeholder="Descreva a categoria..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-cor">Cor</Label>
                <Input
                  id="create-cor"
                  type="color"
                  value={formState.cor || '#3b82f6'}
                  onChange={(e) => setFormState({ ...formState, cor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-ordem">Ordem</Label>
                <Input
                  id="create-ordem"
                  type="number"
                  value={formState.ordem || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, ordem: parseInt(e.target.value) || undefined })
                  }
                  placeholder="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(v) => setFormState({ ...formState, status: v as StatusCategoria })}
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
            <Button onClick={handleCreateCategoria} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>Atualize as informações da categoria</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome *</Label>
              <Input
                id="edit-nome"
                value={formState.nome}
                onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
              />
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-cor">Cor</Label>
                <Input
                  id="edit-cor"
                  type="color"
                  value={formState.cor || '#3b82f6'}
                  onChange={(e) => setFormState({ ...formState, cor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-ordem">Ordem</Label>
                <Input
                  id="edit-ordem"
                  type="number"
                  value={formState.ordem || ''}
                  onChange={(e) =>
                    setFormState({ ...formState, ordem: parseInt(e.target.value) || undefined })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formState.status}
                onValueChange={(v) => setFormState({ ...formState, status: v as StatusCategoria })}
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
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
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
