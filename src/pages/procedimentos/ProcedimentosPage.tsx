import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  ProcedimentoImagem,
  StatusProcedimento,
} from '@/services/api/procedimentos'
import { procedimentosService } from '@/services/api/procedimentos'

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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProcedimento, setSelectedProcedimento] = useState<Procedimento | null>(null)
  const [detailsProcedimento, setDetailsProcedimento] = useState<Procedimento | null>(null)

  const [createFiles, setCreateFiles] = useState<File[]>([])
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<Record<string, string>>({})
  const [detailsImageUrls, setDetailsImageUrls] = useState<Record<string, string>>({})

  const [formState, setFormState] = useState<ProcedimentoCreateData>({
    nome: '',
    descricao: '',
    detalhes: '',
    ia_config: {},
    cuidados_durante: '',
    cuidados_apos: '',
    quebra_objecoes: '',
    ia_informa_preco: false,
    ia_envia_imagens: false,
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

  const iaConfig = (formState.ia_config || {}) as Record<string, any>

  const setIA = (path: string, value: any) => {
    const parts = path.split('.')
    setFormState((prev) => {
      const base = { ...(prev.ia_config || {}) } as any
      let cursor = base
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i]
        cursor[k] = cursor[k] && typeof cursor[k] === 'object' ? { ...cursor[k] } : {}
        cursor = cursor[k]
      }
      cursor[parts[parts.length - 1]] = value
      return { ...prev, ia_config: base }
    })
  }

  const getIA = (path: string, fallback: any = '') => {
    const parts = path.split('.')
    let cursor: any = iaConfig
    for (const p of parts) {
      if (!cursor || typeof cursor !== 'object') return fallback
      cursor = cursor[p]
    }
    return cursor ?? fallback
  }

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
      const created = await createMutation.mutateAsync({
        ...formState,
        imagens: [],
      })

      if (createFiles.length > 0) {
        const uploaded = await procedimentosService.uploadImagens(created.id, createFiles)
        await updateMutation.mutateAsync({
          id: created.id,
          data: {
            imagens: uploaded,
          },
        })
      }

      setIsCreateModalOpen(false)
      setCreateFiles([])
      setFormState({
        nome: '',
        descricao: '',
        detalhes: '',
        ia_config: {},
        cuidados_durante: '',
        cuidados_apos: '',
        quebra_objecoes: '',
        ia_informa_preco: false,
        ia_envia_imagens: false,
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
      detalhes: (procedimento as any).detalhes || '',
      ia_config: ((procedimento as any).ia_config as any) || {},
      cuidados_durante: (procedimento as any).cuidados_durante || '',
      cuidados_apos: (procedimento as any).cuidados_apos || '',
      quebra_objecoes: (procedimento as any).quebra_objecoes || '',
      ia_informa_preco: (procedimento as any).ia_informa_preco ?? false,
      ia_envia_imagens: (procedimento as any).ia_envia_imagens ?? false,
      imagens: (procedimento as any).imagens || [],
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

    const imagens: ProcedimentoImagem[] = ((procedimento as any).imagens as ProcedimentoImagem[]) || []
    if (imagens.length > 0) {
      procedimentosService
        .createSignedImagemUrls(imagens)
        .then((urls) => setExistingImageUrls(urls))
        .catch(() => setExistingImageUrls({}))
    } else {
      setExistingImageUrls({})
    }

    setEditFiles([])
    setIsEditModalOpen(true)
  }

  const handleOpenDetails = (procedimento: Procedimento) => {
    setDetailsProcedimento(procedimento)

    const imagens: ProcedimentoImagem[] = ((procedimento as any).imagens as ProcedimentoImagem[]) || []
    if (imagens.length > 0) {
      procedimentosService
        .createSignedImagemUrls(imagens)
        .then((urls) => setDetailsImageUrls(urls))
        .catch(() => setDetailsImageUrls({}))
    } else {
      setDetailsImageUrls({})
    }

    setIsDetailsModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProcedimento) return

    try {
      const existingImagens: ProcedimentoImagem[] = (formState.imagens as ProcedimentoImagem[]) || []

      let mergedImagens = existingImagens
      if (editFiles.length > 0) {
        const uploaded = await procedimentosService.uploadImagens(selectedProcedimento.id, editFiles)
        mergedImagens = [...existingImagens, ...uploaded]
      }

      await updateMutation.mutateAsync({
        id: selectedProcedimento.id,
        data: {
          ...formState,
          imagens: mergedImagens,
        },
      })

      setIsEditModalOpen(false)
      setSelectedProcedimento(null)
      setEditFiles([])
      setExistingImageUrls({})
    } catch (error) {
      console.error('Erro ao atualizar procedimento:', error)
    }
  }

  const handleRemoveExistingImagem = async (img: ProcedimentoImagem) => {
    if (!selectedProcedimento) return

    try {
      await procedimentosService.deleteImagem(img.path)

      const remaining = ((formState.imagens as ProcedimentoImagem[]) || []).filter((i) => i.path !== img.path)
      await updateMutation.mutateAsync({
        id: selectedProcedimento.id,
        data: {
          imagens: remaining,
        },
      })

      setFormState({
        ...formState,
        imagens: remaining,
      })

      setExistingImageUrls((prev) => {
        const copy = { ...prev }
        delete copy[img.path]
        return copy
      })
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao remover imagem')
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleOpenDetails(procedimento)}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(procedimento)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRequestDelete(procedimento)
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
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog
        open={isDetailsModalOpen}
        onOpenChange={(open) => {
          setIsDetailsModalOpen(open)
          if (!open) {
            setDetailsProcedimento(null)
            setDetailsImageUrls({})
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Procedimento</DialogTitle>
            <DialogDescription>Informações completas do procedimento</DialogDescription>
          </DialogHeader>

          {detailsProcedimento && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{detailsProcedimento.nome}</h2>
                  <Badge variant={STATUS_CONFIG[detailsProcedimento.status].variant}>
                    {STATUS_CONFIG[detailsProcedimento.status].label}
                  </Badge>
                  {detailsProcedimento.categoria?.nome && (
                    <Badge variant="outline">{detailsProcedimento.categoria.nome}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {detailsProcedimento.codigo && <span>Código: {detailsProcedimento.codigo}</span>}
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(detailsProcedimento.valor_base)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(detailsProcedimento.duracao_estimada)}
                  </span>
                </div>
              </div>

              {detailsProcedimento.descricao && (
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detailsProcedimento.descricao}</div>
                </div>
              )}

              {(detailsProcedimento as any).detalhes && (
                <div className="space-y-2">
                  <Label>Detalhes</Label>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).detalhes}</div>
                </div>
              )}

              {((detailsProcedimento as any).cuidados_durante || (detailsProcedimento as any).cuidados_apos) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {(detailsProcedimento as any).cuidados_durante && (
                    <div className="space-y-2">
                      <Label>Cuidados durante</Label>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).cuidados_durante}</div>
                    </div>
                  )}

                  {(detailsProcedimento as any).cuidados_apos && (
                    <div className="space-y-2">
                      <Label>Cuidados após</Label>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).cuidados_apos}</div>
                    </div>
                  )}
                </div>
              )}

              {(detailsProcedimento as any).quebra_objecoes && (
                <div className="space-y-2">
                  <Label>Quebra de objeções</Label>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).quebra_objecoes}</div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>IA informa preço?</Label>
                  <div className="text-sm text-muted-foreground">{(detailsProcedimento as any).ia_informa_preco ? 'Sim' : 'Não'}</div>
                </div>
                <div className="space-y-1">
                  <Label>IA envia imagens?</Label>
                  <div className="text-sm text-muted-foreground">{(detailsProcedimento as any).ia_envia_imagens ? 'Sim' : 'Não'}</div>
                </div>
              </div>

              {detailsProcedimento.observacoes && (
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detailsProcedimento.observacoes}</div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Imagens</Label>
                {((((detailsProcedimento as any).imagens as ProcedimentoImagem[]) || []) as ProcedimentoImagem[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {((((detailsProcedimento as any).imagens as ProcedimentoImagem[]) || []) as ProcedimentoImagem[]).map((img) => (
                      <div key={img.path} className="border rounded-md p-2">
                        {detailsImageUrls[img.path] ? (
                          <img
                            src={detailsImageUrls[img.path]}
                            alt={img.name}
                            className="w-full h-32 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-32 rounded bg-muted" />
                        )}
                        <div className="mt-2 text-xs text-muted-foreground truncate">{img.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!detailsProcedimento) return
                setIsDetailsModalOpen(false)
                handleOpenEdit(detailsProcedimento)
              }}
              disabled={!detailsProcedimento}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button variant="default" onClick={() => setIsDetailsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            <div className="space-y-2">
              <Label htmlFor="create-detalhes">Detalhes</Label>
              <Textarea
                id="create-detalhes"
                value={formState.detalhes || ''}
                onChange={(e) => setFormState({ ...formState, detalhes: e.target.value })}
                placeholder="Detalhes do procedimento..."
                rows={5}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-cuidados-durante">Cuidados durante</Label>
                <Textarea
                  id="create-cuidados-durante"
                  value={formState.cuidados_durante || ''}
                  onChange={(e) => setFormState({ ...formState, cuidados_durante: e.target.value })}
                  placeholder="Cuidados durante o procedimento..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-cuidados-apos">Cuidados após</Label>
                <Textarea
                  id="create-cuidados-apos"
                  value={formState.cuidados_apos || ''}
                  onChange={(e) => setFormState({ ...formState, cuidados_apos: e.target.value })}
                  placeholder="Cuidados após o procedimento..."
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-quebra-objecoes">Quebra de objeções</Label>
              <Textarea
                id="create-quebra-objecoes"
                value={formState.quebra_objecoes || ''}
                onChange={(e) => setFormState({ ...formState, quebra_objecoes: e.target.value })}
                placeholder="Principais objeções e respostas..."
                rows={4}
              />
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="text-sm font-semibold">Configurações avançadas (IA) — Procedimento</div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Agendamento</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Requer avaliação prévia?</Label>
                    <Switch checked={!!getIA('agendamento.requer_avaliacao_previa', false)} onCheckedChange={(v) => setIA('agendamento.requer_avaliacao_previa', v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>IA pode agendar direto?</Label>
                    <Switch checked={!!getIA('agendamento.ia_pode_agendar_direto', false)} onCheckedChange={(v) => setIA('agendamento.ia_pode_agendar_direto', v)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Política específica (texto)</Label>
                    <Textarea value={getIA('agendamento.politica_especifica', '')} onChange={(e) => setIA('agendamento.politica_especifica', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tempo de espera recomendado (dias)</Label>
                    <Input type="number" value={getIA('agendamento.tempo_espera_recomendado_dias', '')} onChange={(e) => setIA('agendamento.tempo_espera_recomendado_dias', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Pré-pagamento obrigatório?</Label>
                    <Switch checked={!!getIA('agendamento.pre_pagamento_obrigatorio', false)} onCheckedChange={(v) => setIA('agendamento.pre_pagamento_obrigatorio', v)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Descrição técnica</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Descrição técnica (profissional)</Label>
                    <Textarea value={getIA('tecnica.descricao_profissional', '')} onChange={(e) => setIA('tecnica.descricao_profissional', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Como funciona (leigo)</Label>
                    <Textarea value={getIA('tecnica.como_funciona_leigo', '')} onChange={(e) => setIA('tecnica.como_funciona_leigo', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tecnologia</Label>
                    <Input value={getIA('tecnica.tecnologia', '')} onChange={(e) => setIA('tecnica.tecnologia', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Indicações (um por linha)</Label>
                    <Textarea value={(getIA('tecnica.indicacoes', []) as any[]).join('\n')} onChange={(e) => setIA('tecnica.indicacoes', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Contraindicações (um por linha)</Label>
                    <Textarea value={(getIA('tecnica.contraindicacoes', []) as any[]).join('\n')} onChange={(e) => setIA('tecnica.contraindicacoes', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Riscos raros (um por linha)</Label>
                    <Textarea value={(getIA('tecnica.riscos_raros', []) as any[]).join('\n')} onChange={(e) => setIA('tecnica.riscos_raros', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tempo de recuperação</Label>
                    <Input value={getIA('tecnica.tempo_recuperacao', '')} onChange={(e) => setIA('tecnica.tempo_recuperacao', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quando começam os resultados</Label>
                    <Input value={getIA('tecnica.quando_comecam_resultados', '')} onChange={(e) => setIA('tecnica.quando_comecam_resultados', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quanto tempo duram os resultados</Label>
                    <Input value={getIA('tecnica.quanto_tempo_duram_resultados', '')} onChange={(e) => setIA('tecnica.quanto_tempo_duram_resultados', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Benefícios</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Estéticos (um por linha)</Label>
                    <Textarea value={(getIA('beneficios.esteticos', []) as any[]).join('\n')} onChange={(e) => setIA('beneficios.esteticos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Emocionais (um por linha)</Label>
                    <Textarea value={(getIA('beneficios.emocionais', []) as any[]).join('\n')} onChange={(e) => setIA('beneficios.emocionais', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Funcionais (um por linha)</Label>
                    <Textarea value={(getIA('beneficios.funcionais', []) as any[]).join('\n')} onChange={(e) => setIA('beneficios.funcionais', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Persona ideal</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Indicado para pessoas com...</Label>
                    <Textarea value={getIA('persona.indicado_para', '')} onChange={(e) => setIA('persona.indicado_para', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Faixa etária/sexo (opcional)</Label>
                    <Input value={getIA('persona.faixa_etaria_sexo', '')} onChange={(e) => setIA('persona.faixa_etaria_sexo', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Situações onde o resultado é mais eficiente</Label>
                    <Textarea value={getIA('persona.situacoes_melhor_resultado', '')} onChange={(e) => setIA('persona.situacoes_melhor_resultado', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Objeções e respostas</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Objeções (um por linha)</Label>
                    <Textarea value={(getIA('objecoes.lista', []) as any[]).join('\n')} onChange={(e) => setIA('objecoes.lista', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Respostas treinadas (um por linha)</Label>
                    <Textarea value={(getIA('objecoes.respostas', []) as any[]).join('\n')} onChange={(e) => setIA('objecoes.respostas', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Perguntas frequentes</Label>
                <div className="grid gap-2">
                  <Label>FAQ (um por linha)</Label>
                  <Textarea value={(getIA('faq.perguntas', []) as any[]).join('\n')} onChange={(e) => setIA('faq.perguntas', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={5} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Cuidados pré e pós</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Antes (um por linha)</Label>
                    <Textarea value={(getIA('cuidados.antes', []) as any[]).join('\n')} onChange={(e) => setIA('cuidados.antes', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Depois (um por linha)</Label>
                    <Textarea value={(getIA('cuidados.depois', []) as any[]).join('\n')} onChange={(e) => setIA('cuidados.depois', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Gatilhos de venda específicos</Label>
                <div className="grid gap-2">
                  <Label>Texto</Label>
                  <Textarea value={getIA('vendas.gatilhos', '')} onChange={(e) => setIA('vendas.gatilhos', e.target.value)} rows={4} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Fluxo emocional</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Resultado final esperado</Label>
                    <Textarea value={getIA('emocional.resultado_final', '')} onChange={(e) => setIA('emocional.resultado_final', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sensação que o cliente deseja ter</Label>
                    <Textarea value={getIA('emocional.sensacao_desejada', '')} onChange={(e) => setIA('emocional.sensacao_desejada', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>O que resolve emocionalmente</Label>
                    <Textarea value={getIA('emocional.o_que_resolve', '')} onChange={(e) => setIA('emocional.o_que_resolve', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Retorno / manutenção</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Tempo ideal para retorno</Label>
                    <Input value={getIA('retorno.tempo_ideal', '')} onChange={(e) => setIA('retorno.tempo_ideal', e.target.value)} placeholder="Ex: 30 dias" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Manutenção necessária?</Label>
                    <Select value={getIA('retorno.manutencao', 'opcional')} onValueChange={(v) => setIA('retorno.manutencao', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="opcional">Opcional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Frequência de manutenção</Label>
                    <Input value={getIA('retorno.frequencia_manutencao', '')} onChange={(e) => setIA('retorno.frequencia_manutencao', e.target.value)} placeholder="Ex: 1x a cada 45 dias" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Follow-ups ativados (um por linha)</Label>
                    <Textarea value={(getIA('retorno.follow_ativados', []) as any[]).join('\n')} onChange={(e) => setIA('retorno.follow_ativados', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} placeholder="Ex: 24h\n7 dias\n30 dias" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mensagens sementes (JSON)</Label>
                    <Textarea value={JSON.stringify(getIA('retorno.mensagens', {}), null, 2)} onChange={(e) => {
                      try {
                        setIA('retorno.mensagens', JSON.parse(e.target.value || '{}'))
                      } catch {
                        // ignore
                      }
                    }} rows={6} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Upsell inteligente</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Complementares (um por linha)</Label>
                    <Textarea value={(getIA('upsell.complementares', []) as any[]).join('\n')} onChange={(e) => setIA('upsell.complementares', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Upgrades (um por linha)</Label>
                    <Textarea value={(getIA('upsell.upgrades', []) as any[]).join('\n')} onChange={(e) => setIA('upsell.upgrades', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Motivo do upsell</Label>
                    <Textarea value={getIA('upsell.motivo', '')} onChange={(e) => setIA('upsell.motivo', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quando oferecer</Label>
                    <Select value={getIA('upsell.quando_oferecer', 'imediato')} onValueChange={(v) => setIA('upsell.quando_oferecer', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imediato">Imediato</SelectItem>
                        <SelectItem value="pos_avaliacao">Pós avaliação</SelectItem>
                        <SelectItem value="pos_primeiro_atendimento">Pós primeiro atendimento</SelectItem>
                        <SelectItem value="apos_x_dias">Após X dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Triggers (um por linha)</Label>
                    <Textarea value={(getIA('upsell.triggers', []) as any[]).join('\n')} onChange={(e) => setIA('upsell.triggers', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Material de apoio (JSON)</Label>
                    <Textarea value={JSON.stringify(getIA('upsell.material', {}), null, 2)} onChange={(e) => {
                      try {
                        setIA('upsell.material', JSON.parse(e.target.value || '{}'))
                      } catch {
                        // ignore
                      }
                    }} rows={6} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>IA informa preço?</Label>
                  <p className="text-sm text-muted-foreground">Permite a IA mencionar valores do procedimento</p>
                </div>
                <Switch
                  checked={Boolean(formState.ia_informa_preco)}
                  onCheckedChange={(checked) => setFormState({ ...formState, ia_informa_preco: checked })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>IA envia imagens do procedimento?</Label>
                  <p className="text-sm text-muted-foreground">Permite a IA enviar imagens cadastradas</p>
                </div>
                <Switch
                  checked={Boolean(formState.ia_envia_imagens)}
                  onCheckedChange={(checked) => setFormState({ ...formState, ia_envia_imagens: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-imagens">Imagens</Label>
              <Input
                id="create-imagens"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setCreateFiles((prev) => {
                    const merged = [...prev, ...files]
                    const seen = new Set<string>()
                    return merged.filter((f) => {
                      const key = `${f.name}-${f.size}-${f.lastModified}`
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    })
                  })
                  e.currentTarget.value = ''
                }}
              />

              {createFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {createFiles.map((f) => {
                    const url = URL.createObjectURL(f)
                    return (
                      <div key={f.name + f.size} className="border rounded-md p-2">
                        <img src={url} alt={f.name} className="w-full h-28 object-cover rounded" />
                        <p className="text-xs text-muted-foreground mt-1 truncate">{f.name}</p>
                      </div>
                    )
                  })}
                </div>
              )}
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

            <div className="space-y-2">
              <Label htmlFor="edit-detalhes">Detalhes</Label>
              <Textarea
                id="edit-detalhes"
                value={formState.detalhes || ''}
                onChange={(e) => setFormState({ ...formState, detalhes: e.target.value })}
                rows={5}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-cuidados-durante">Cuidados durante</Label>
                <Textarea
                  id="edit-cuidados-durante"
                  value={formState.cuidados_durante || ''}
                  onChange={(e) => setFormState({ ...formState, cuidados_durante: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cuidados-apos">Cuidados após</Label>
                <Textarea
                  id="edit-cuidados-apos"
                  value={formState.cuidados_apos || ''}
                  onChange={(e) => setFormState({ ...formState, cuidados_apos: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quebra-objecoes">Quebra de objeções</Label>
              <Textarea
                id="edit-quebra-objecoes"
                value={formState.quebra_objecoes || ''}
                onChange={(e) => setFormState({ ...formState, quebra_objecoes: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>IA informa preço?</Label>
                  <p className="text-sm text-muted-foreground">Permite a IA mencionar valores do procedimento</p>
                </div>
                <Switch
                  checked={Boolean(formState.ia_informa_preco)}
                  onCheckedChange={(checked) => setFormState({ ...formState, ia_informa_preco: checked })}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>IA envia imagens do procedimento?</Label>
                  <p className="text-sm text-muted-foreground">Permite a IA enviar imagens cadastradas</p>
                </div>
                <Switch
                  checked={Boolean(formState.ia_envia_imagens)}
                  onCheckedChange={(checked) => setFormState({ ...formState, ia_envia_imagens: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagens atuais</Label>
              {((formState.imagens as ProcedimentoImagem[]) || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(((formState.imagens as ProcedimentoImagem[]) || []) as ProcedimentoImagem[]).map((img) => (
                    <div key={img.path} className="border rounded-md p-2">
                      {existingImageUrls[img.path] ? (
                        <img
                          src={existingImageUrls[img.path]}
                          alt={img.name}
                          className="w-full h-28 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-28 bg-muted rounded" />
                      )}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs text-muted-foreground truncate flex-1">{img.name}</p>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveExistingImagem(img)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-imagens">Adicionar novas imagens</Label>
              <Input
                id="edit-imagens"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setEditFiles((prev) => {
                    const merged = [...prev, ...files]
                    const seen = new Set<string>()
                    return merged.filter((f) => {
                      const key = `${f.name}-${f.size}-${f.lastModified}`
                      if (seen.has(key)) return false
                      seen.add(key)
                      return true
                    })
                  })
                  e.currentTarget.value = ''
                }}
              />

              {editFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {editFiles.map((f) => {
                    const url = URL.createObjectURL(f)
                    return (
                      <div key={f.name + f.size} className="border rounded-md p-2">
                        <img src={url} alt={f.name} className="w-full h-28 object-cover rounded" />
                        <p className="text-xs text-muted-foreground mt-1 truncate">{f.name}</p>
                      </div>
                    )
                  })}
                </div>
              )}
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
