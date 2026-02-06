import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ListEditor } from '@/components/ui/list-editor'
import { PairsEditor, type PairItem } from '@/components/ui/pairs-editor'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Filter, Stethoscope, Edit, Trash2, DollarSign, Clock, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  useProcedimentos,
  useCreateProcedimento,
  useUpdateProcedimento,
  useDeleteProcedimento,
} from '@/hooks/useProcedimentos'
import { useCategoriasProcedimento } from '@/hooks/useCategoriasProcedimento'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { useProtocolosPacotes } from '@/hooks/useProtocolosPacotes'
import type {
  Procedimento,
  ProcedimentoCreateData,
  StatusProcedimento,
} from '@/services/api/procedimentos'
import { deleteMidia, getSignedMidiaUrl, uploadMidia } from '@/services/api/storage-midias'

const STATUS_CONFIG: Record<StatusProcedimento, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  ativo: { label: 'Ativo', variant: 'default' },
  inativo: { label: 'Inativo', variant: 'secondary' },
  descontinuado: { label: 'Descontinuado', variant: 'destructive' },
}

function FileUploadButton({
  label,
  accept,
  multiple,
  disabled,
  onFiles,
}: {
  label: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}) {
  return (
    <div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          onFiles(files)
          e.currentTarget.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        disabled={disabled}
        onClick={(e) => {
          const input = (e.currentTarget.previousSibling as HTMLInputElement | null)
          input?.click()
        }}
      >
        <Upload className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </div>
  )
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

  const [uploadingMidiaKey, setUploadingMidiaKey] = useState<string | null>(null)
  const [midiaUrlByKey, setMidiaUrlByKey] = useState<Record<string, string>>({})

  const getEmptyFormState = (): ProcedimentoCreateData => ({
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

  const [formState, setFormState] = useState<ProcedimentoCreateData>(getEmptyFormState())

  const iaConfig = (formState.ia_config || {}) as Record<string, any>

  const getMidias = () => (getIA('midias', {}) || {}) as Record<string, any>
  const setMidias = (path: string, value: any) => setIA(`midias.${path}`, value)

  const ensureMidiaSignedUrl = async (bucket: any, path: string) => {
    const key = `${bucket}:${path}`
    if (midiaUrlByKey[key]) return
    try {
      const url = await getSignedMidiaUrl({ bucket, path })
      setMidiaUrlByKey((prev) => ({ ...prev, [key]: url }))
    } catch {
      setMidiaUrlByKey((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const handleUploadMidias = async (category: string, files: File[]) => {
    if (files.length === 0) return

    const procedimentoId = selectedProcedimento?.id
    if (!procedimentoId) {
      toast.error('Salve o procedimento antes de enviar mídias')
      return
    }

    const key = `midia:${category}`
    setUploadingMidiaKey(key)
    try {
      const uploaded = [] as { bucket: 'clinica-midias'; path: string }[]
      for (const file of files) {
        const up = await uploadMidia({
          bucket: 'clinica-midias',
          file,
          prefix: `procedimentos/${procedimentoId}/${category}`,
        })
        uploaded.push({ bucket: 'clinica-midias', path: up.path })
      }

      const prevArr = (getIA(`midias.${category}`, []) as any[]) || []
      const next = [...prevArr, ...uploaded]

      await updateMutation.mutateAsync({
        id: procedimentoId,
        data: {
          ia_config: { ...(formState.ia_config || {}), midias: { ...getMidias(), [category]: next } },
        },
      })

      setMidias(category, next)
      for (const u of uploaded) {
        void ensureMidiaSignedUrl(u.bucket, u.path)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao enviar mídia')
    } finally {
      setUploadingMidiaKey(null)
    }
  }

  const handleRemoveMidia = async (category: string, item: { bucket: 'clinica-midias'; path: string }) => {
    const procedimentoId = selectedProcedimento?.id
    if (!procedimentoId) return

    try {
      await deleteMidia({ bucket: item.bucket, path: item.path })

      const prevArr = (getIA(`midias.${category}`, []) as any[]) || []
      const next = prevArr.filter((x) => x?.path !== item.path)

      await updateMutation.mutateAsync({
        id: procedimentoId,
        data: {
          ia_config: { ...(formState.ia_config || {}), midias: { ...getMidias(), [category]: next } },
        },
      })
      setMidias(category, next)
      const urlKey = `${item.bucket}:${item.path}`
      setMidiaUrlByKey((prev) => {
        const copy = { ...prev }
        delete copy[urlKey]
        return copy
      })
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover mídia')
    }
  }

  useEffect(() => {
    const proc = selectedProcedimento || detailsProcedimento
    const midias = (((proc as any)?.ia_config || {}) as any)?.midias || {}
    const buckets = [
      'antes_depois',
      'imagens_ilustrativas',
      'carrossel_comercial',
      'prova_social_especifica',
      'material_apoio',
      'videos_whatsapp',
      'videos_explicativos',
      'videos_depoimentos',
    ]
    for (const cat of buckets) {
      const arr = (midias?.[cat] as any[]) || []
      for (const item of arr) {
        if (item?.bucket && item?.path) {
          void ensureMidiaSignedUrl(item.bucket, item.path)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProcedimento, detailsProcedimento])

  const toggleMulti = (current: string[], value: string) =>
    current.includes(value) ? current.filter((x) => x !== value) : [...current, value]

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
    for (const k of parts) {
      if (!cursor || typeof cursor !== 'object') return fallback
      cursor = cursor[k]
    }
    return typeof cursor === 'undefined' ? fallback : cursor
  }

  const normalizeStringList = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.map((x) => String(x ?? '').trim()).filter(Boolean)
    }
    if (typeof value === 'string') {
      return value
        .split(/\r?\n|,|;/g)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }

  const normalizePairs = (value: any, legacyStrings?: any): PairItem[] => {
    const arr = Array.isArray(value) ? value : []
    const mapped = arr
      .map((it: any) => ({
        left: typeof it?.left === 'string' ? it.left : typeof it?.pergunta === 'string' ? it.pergunta : typeof it?.titulo === 'string' ? it.titulo : '',
        right: typeof it?.right === 'string' ? it.right : typeof it?.resposta === 'string' ? it.resposta : typeof it?.texto === 'string' ? it.texto : '',
      }))

    if (mapped.length > 0) return mapped

    const legacy = Array.isArray(legacyStrings) ? legacyStrings : []
    return legacy
      .map((s: any) => String(s || '').trim())
      .filter(Boolean)
      .map((q: string) => ({ left: q, right: '' }))
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
  const { data: profissionaisClinica = [] } = useProfissionaisClinica({ limit: 1000 } as any)
  const { data: pacotes = [] } = useProtocolosPacotes({ limit: 1000 } as any)

  const createMutation = useCreateProcedimento()
  const updateMutation = useUpdateProcedimento()
  const deleteMutation = useDeleteProcedimento()

  const handleOpenCreate = () => {
    setSelectedProcedimento(null)
    setIsEditModalOpen(false)
    setFormState(getEmptyFormState())
    setIsCreateModalOpen(true)
  }

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
      await createMutation.mutateAsync({
        ...formState,
      })

      setIsCreateModalOpen(false)
      setFormState(getEmptyFormState())
    } catch (error) {
      console.error('Erro ao criar procedimento:', error)
    }
  }

  const handleOpenEdit = (procedimento: Procedimento) => {
    const toNumberOrUndefined = (v: any) => {
      if (v === null || typeof v === 'undefined') return undefined
      if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
      if (typeof v === 'string') {
        const t = v.trim()
        if (!t) return undefined
        const n = Number(t.replace(',', '.'))
        return Number.isFinite(n) ? n : undefined
      }
      return undefined
    }

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
      codigo: procedimento.codigo || '',
      categoria_id: procedimento.categoria_id,
      duracao_estimada: toNumberOrUndefined((procedimento as any).duracao_estimada),
      valor_base: procedimento.valor_base || undefined,
      valor_minimo: toNumberOrUndefined((procedimento as any).valor_minimo),
      valor_maximo: toNumberOrUndefined((procedimento as any).valor_maximo),
      requer_autorizacao: procedimento.requer_autorizacao,
      observacoes: procedimento.observacoes || '',
      status: procedimento.status,
    })
    setIsEditModalOpen(true)
  }

  const handleOpenDetails = (procedimento: Procedimento) => {
    setDetailsProcedimento(procedimento)

    setIsDetailsModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProcedimento) return

    try {
      await updateMutation.mutateAsync({
        id: selectedProcedimento.id,
        data: {
          ...formState,
        },
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

  const formatDuration = (minutes?: number | string | null) => {
    const n = typeof minutes === 'number' ? minutes : typeof minutes === 'string' ? Number(minutes) : null
    if (!n) return 'N/A'
    const hours = Math.floor(n / 60)
    const mins = n % 60
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ' ' + mins + 'min' : ''}`
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
        <Button onClick={handleOpenCreate}>
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
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Procedimento</DialogTitle>
            <DialogDescription>Informações completas do procedimento</DialogDescription>
          </DialogHeader>

          {detailsProcedimento && (
            <div className="space-y-4">
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

              <Tabs defaultValue="geral">
                <TabsList className="w-full justify-start flex-wrap h-auto">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="sessoes">Sessões</TabsTrigger>
                  <TabsTrigger value="execucao">Execução</TabsTrigger>
                  <TabsTrigger value="tecnica">Técnica</TabsTrigger>
                  <TabsTrigger value="agendamento">Agendamento</TabsTrigger>
                  <TabsTrigger value="midias">Mídias</TabsTrigger>
                </TabsList>

                <TabsContent value="geral">
                  <div className="space-y-4">
                    {detailsProcedimento.descricao ? (
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detailsProcedimento.descricao}</div>
                      </div>
                    ) : null}

                    {(detailsProcedimento as any).detalhes ? (
                      <div className="space-y-2">
                        <Label>Detalhes</Label>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).detalhes}</div>
                      </div>
                    ) : null}

                    {((detailsProcedimento as any).cuidados_durante || (detailsProcedimento as any).cuidados_apos) ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {(detailsProcedimento as any).cuidados_durante ? (
                          <div className="space-y-2">
                            <Label>Cuidados durante</Label>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).cuidados_durante}</div>
                          </div>
                        ) : null}

                        {(detailsProcedimento as any).cuidados_apos ? (
                          <div className="space-y-2">
                            <Label>Cuidados após</Label>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{(detailsProcedimento as any).cuidados_apos}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>IA pode mostrar valores?</Label>
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const ia = ((detailsProcedimento as any).ia_config || {}) as any
                            const v = String(ia?.valores?.ia_pode_mostrar || 'nao')
                            if (v === 'exato') return 'Sim, valor exato'
                            if (v === 'faixa') return 'Sim, faixa de preço'
                            return 'Não'
                          })()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>IA envia imagens?</Label>
                        <div className="text-sm text-muted-foreground">{(detailsProcedimento as any).ia_envia_imagens ? 'Sim' : 'Não'}</div>
                      </div>
                    </div>

                    {detailsProcedimento.observacoes ? (
                      <div className="space-y-2">
                        <Label>Observações</Label>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{detailsProcedimento.observacoes}</div>
                      </div>
                    ) : null}
                  </div>
                </TabsContent>

                <TabsContent value="sessoes">
                  {(() => {
                    const ia = ((detailsProcedimento as any).ia_config || {}) as any
                    const s = (ia?.sessoes || {}) as any
                    const intervalo = s?.intervalo
                    const qtd = s?.quantidade_recomendada
                    const duracaoSessao = s?.duracao_estimada_min
                    return (
                      <div className="space-y-3">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-1">
                            <Label>Intervalo recomendado</Label>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{intervalo || '—'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label>Quantidade recomendada</Label>
                            <div className="text-sm text-muted-foreground">{qtd ?? '—'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label>Duração por sessão (min)</Label>
                            <div className="text-sm text-muted-foreground">{duracaoSessao ?? '—'}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="execucao">
                  {(() => {
                    const ia = ((detailsProcedimento as any).ia_config || {}) as any
                    const exec = (ia?.execucao || {}) as any
                    const ids = (exec?.profissionais_ids || []) as string[]
                    const nomes = profissionaisClinica
                      .filter((p: any) => ids.includes(p.id))
                      .map((p: any) => p.nome)
                    return (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label>Profissionais habilitados</Label>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {nomes.length > 0 ? nomes.join(', ') : '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="tecnica">
                  {(() => {
                    const ia = ((detailsProcedimento as any).ia_config || {}) as any
                    const t = (ia?.tecnica || {}) as any
                    const descProf = t?.descricao_profissional
                    const comoFunciona = t?.como_funciona
                    const equipamentosArr = normalizeStringList(t?.equipamentos)
                    return (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Descrição técnica (profissional)</Label>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{descProf || '—'}</div>
                          </div>
                          <div className="space-y-2">
                            <Label>Como funciona (leigo)</Label>
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap">{comoFunciona || '—'}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Equipamentos usados</Label>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {equipamentosArr.length > 0 ? equipamentosArr.join(', ') : '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="agendamento">
                  {(() => {
                    const ia = ((detailsProcedimento as any).ia_config || {}) as any
                    const a = (ia?.agendamento || {}) as any
                    return (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label>Requer avaliação prévia?</Label>
                            <div className="text-sm text-muted-foreground">{a?.requer_avaliacao_previa ? 'Sim' : 'Não'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label>IA pode agendar direto?</Label>
                            <div className="text-sm text-muted-foreground">{a?.ia_pode_agendar_direto ? 'Sim' : 'Não'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label>Pré-pagamento obrigatório?</Label>
                            <div className="text-sm text-muted-foreground">{a?.pre_pagamento_obrigatorio ? 'Sim' : 'Não'}</div>
                          </div>
                          <div className="space-y-1">
                            <Label>Tempo de espera recomendado (dias)</Label>
                            <div className="text-sm text-muted-foreground">{a?.tempo_espera_recomendado_dias ?? '—'}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Política específica (texto)</Label>
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{a?.politica_especifica || '—'}</div>
                        </div>
                      </div>
                    )
                  })()}
                </TabsContent>

                <TabsContent value="midias">
                  {(() => {
                    const ia = ((detailsProcedimento as any).ia_config || {}) as any
                    const midias = (ia?.midias || {}) as any
                    const sections = [
                      { key: 'antes_depois', label: 'Antes e depois' },
                      { key: 'imagens_ilustrativas', label: 'Imagens ilustrativas' },
                      { key: 'carrossel_comercial', label: 'Carrossel comercial' },
                      { key: 'prova_social_especifica', label: 'Prova social específica' },
                      { key: 'material_apoio', label: 'Material de apoio' },
                      { key: 'videos_whatsapp', label: 'Vídeos para WhatsApp' },
                      { key: 'videos_explicativos', label: 'Vídeos explicativos' },
                      { key: 'videos_depoimentos', label: 'Vídeos de depoimentos' },
                    ]

                    return (
                      <div className="space-y-6">
                        {sections.map((s) => {
                          const arr = (midias?.[s.key] as any[]) || []
                          if (!arr || arr.length === 0) return null
                          return (
                            <div key={s.key} className="space-y-2">
                              <Label>{s.label}</Label>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {arr.map((m: any) => {
                                  const urlKey = `${m.bucket}:${m.path}`
                                  const url = midiaUrlByKey[urlKey]
                                  const isVideo = String(s.key).startsWith('videos')
                                  return (
                                    <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                                      {url ? (
                                        isVideo ? (
                                          <video src={url} controls className="h-40 w-full object-cover" />
                                        ) : (
                                          <img src={url} className="h-40 w-full object-cover" />
                                        )
                                      ) : url === '' ? (
                                        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Falha ao carregar</div>
                                      ) : (
                                        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                                      )}
                                      <div className="p-2 text-xs text-muted-foreground truncate">{m.path}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog
          open={isCreateModalOpen || isEditModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false)
              setIsEditModalOpen(false)
              setSelectedProcedimento(null)
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProcedimento ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
              <DialogDescription>
                {selectedProcedimento ? 'Atualize as informações do procedimento' : 'Cadastre um novo procedimento ou tratamento'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end">
              {selectedProcedimento ? (
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              ) : (
                <Button onClick={handleCreateProcedimento} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="duracao-sessao">Duração da sessão (minutos)</Label>
                <Input
                  id="duracao-sessao"
                  type="number"
                  value={formState.duracao_estimada ?? ''}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      duracao_estimada: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="intervalo-sessoes">Tempo de intervalo entre sessões</Label>
                <Input
                  id="intervalo-sessoes"
                  value={getIA('sessoes.intervalo', '')}
                  onChange={(e) => setIA('sessoes.intervalo', e.target.value)}
                  placeholder="Ex: 7 dias"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd-sessoes">Quantidade recomendada de sessões</Label>
                <Input
                  id="qtd-sessoes"
                  type="number"
                  value={getIA('sessoes.quantidade_recomendada', '')}
                  onChange={(e) =>
                    setIA(
                      'sessoes.quantidade_recomendada',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Quem executa (pode selecionar mais de um)</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" className="justify-between">
                      Selecionar profissionais
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-72 overflow-auto">
                    {profissionaisClinica.map((p: any) => {
                      const selectedIds = (getIA('execucao.profissionais_ids', []) as string[]) || []
                      const checked = selectedIds.includes(p.id)
                      return (
                        <DropdownMenuCheckboxItem
                          key={p.id}
                          checked={checked}
                          onCheckedChange={() =>
                            setIA('execucao.profissionais_ids', toggleMulti(selectedIds, p.id))
                          }
                        >
                          {p.nome}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {(() => {
                  const ids = (getIA('execucao.profissionais_ids', []) as string[]) || []
                  if (ids.length === 0) {
                    return <div className="text-xs text-muted-foreground">Nenhum selecionado</div>
                  }
                  const selected = profissionaisClinica.filter((p: any) => ids.includes(p.id))
                  return (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selected.map((p: any) => (
                        <Badge key={p.id} variant="secondary" className="flex items-center gap-2">
                          <span className="max-w-[220px] truncate">{p.nome}</span>
                          <button
                            type="button"
                            className="rounded-sm opacity-80 hover:opacity-100"
                            onClick={() => {
                              const current = (getIA('execucao.profissionais_ids', []) as string[]) || []
                              setIA('execucao.profissionais_ids', current.filter((x) => x !== p.id))
                            }}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label>Equipamentos usados (opcional)</Label>
                <ListEditor
                  placeholder="Adicione equipamentos"
                  items={normalizeStringList(getIA('tecnica.equipamentos', []))}
                  onChange={(items) => setIA('tecnica.equipamentos', items)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Valores</Label>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>IA pode mostrar valores desse procedimento?</Label>
                  <Select
                    value={getIA('valores.ia_pode_mostrar', 'nao')}
                    onValueChange={(v) => {
                      setIA('valores.ia_pode_mostrar', v)
                      if (v === 'nao') {
                        setFormState((prev) => ({ ...prev, valor_base: undefined, valor_minimo: undefined, valor_maximo: undefined }))
                      }
                      if (v === 'exato') {
                        setFormState((prev) => ({ ...prev, valor_minimo: undefined, valor_maximo: undefined }))
                      }
                      if (v === 'faixa') {
                        setFormState((prev) => ({ ...prev, valor_base: undefined }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exato">Sim, valor exato</SelectItem>
                      <SelectItem value="faixa">Sim, faixa de preço</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
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

              {getIA('valores.ia_pode_mostrar', 'nao') === 'exato' ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit-valor-base">Valor (R$)</Label>
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
                </div>
              ) : null}

              {getIA('valores.ia_pode_mostrar', 'nao') === 'faixa' ? (
                <div className="grid gap-4 md:grid-cols-3">
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
              ) : null}
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
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Tecnologia</Label>
                    <Textarea value={getIA('tecnica.tecnologia', '')} onChange={(e) => setIA('tecnica.tecnologia', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Indicações"
                      placeholder="Adicione indicações"
                      items={(getIA('tecnica.indicacoes', []) as any[]) as string[]}
                      onChange={(items) => setIA('tecnica.indicacoes', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Contraindicações"
                      placeholder="Adicione contraindicações"
                      items={(getIA('tecnica.contraindicacoes', []) as any[]) as string[]}
                      onChange={(items) => setIA('tecnica.contraindicacoes', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Riscos raros"
                      placeholder="Adicione riscos raros"
                      items={(getIA('tecnica.riscos_raros', []) as any[]) as string[]}
                      onChange={(items) => setIA('tecnica.riscos_raros', items)}
                    />
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
                    <ListEditor
                      label="Estéticos"
                      placeholder="Adicione benefícios estéticos"
                      items={(getIA('beneficios.esteticos', []) as any[]) as string[]}
                      onChange={(items) => setIA('beneficios.esteticos', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Emocionais"
                      placeholder="Adicione benefícios emocionais"
                      items={(getIA('beneficios.emocionais', []) as any[]) as string[]}
                      onChange={(items) => setIA('beneficios.emocionais', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Funcionais"
                      placeholder="Adicione benefícios funcionais"
                      items={(getIA('beneficios.funcionais', []) as any[]) as string[]}
                      onChange={(items) => setIA('beneficios.funcionais', items)}
                    />
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
                <div className="space-y-3">
                  {(((getIA('objecoes.itens', []) as any[]) || []) as any[]).map((it, idx) => (
                    <div key={idx} className="grid gap-3 md:grid-cols-2 border rounded-lg p-3">
                      <div className="grid gap-2">
                        <Label>Objeção</Label>
                        <Input
                          value={it?.objecao || ''}
                          onChange={(e) => {
                            const items = [ ...(((getIA('objecoes.itens', []) as any[]) || []) as any[]) ]
                            items[idx] = { ...(items[idx] || {}), objecao: e.target.value }
                            setIA('objecoes.itens', items)
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Resposta</Label>
                        <Input
                          value={it?.resposta || ''}
                          onChange={(e) => {
                            const items = [ ...(((getIA('objecoes.itens', []) as any[]) || []) as any[]) ]
                            items[idx] = { ...(items[idx] || {}), resposta: e.target.value }
                            setIA('objecoes.itens', items)
                          }}
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const items = [ ...(((getIA('objecoes.itens', []) as any[]) || []) as any[]) ]
                            items.splice(idx, 1)
                            setIA('objecoes.itens', items)
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const items = [ ...(((getIA('objecoes.itens', []) as any[]) || []) as any[]) ]
                      items.push({ objecao: '', resposta: '' })
                      setIA('objecoes.itens', items)
                    }}
                  >
                    Adicionar objeção
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Perguntas frequentes</Label>
                <PairsEditor
                  title="FAQ"
                  leftLabel="Pergunta"
                  rightLabel="Resposta"
                  addLabel="Adicionar pergunta"
                  items={normalizePairs(getIA('faq.itens', []), getIA('faq.perguntas', []))}
                  onChange={(items) => setIA('faq.itens', items)}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Cuidados pré e pós</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <ListEditor
                      label="Antes"
                      placeholder=""
                      items={(getIA('cuidados.antes', []) as any[]) as string[]}
                      onChange={(items) => setIA('cuidados.antes', items)}
                      hideEmptyState
                    />
                  </div>
                  <div className="grid gap-2">
                    <ListEditor
                      label="Depois"
                      placeholder=""
                      items={(getIA('cuidados.depois', []) as any[]) as string[]}
                      onChange={(items) => setIA('cuidados.depois', items)}
                      hideEmptyState
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Gatilhos de venda específicos</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>O que torna esse procedimento superior a outros</Label>
                    <Textarea value={getIA('vendas.superioridade', '')} onChange={(e) => setIA('vendas.superioridade', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Por que vale a pena fazer na clínica</Label>
                    <Textarea value={getIA('vendas.porque_na_clinica', '')} onChange={(e) => setIA('vendas.porque_na_clinica', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Diferenciais do equipamento ou técnica</Label>
                    <Textarea value={getIA('vendas.diferenciais_tecnica', '')} onChange={(e) => setIA('vendas.diferenciais_tecnica', e.target.value)} rows={4} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Selo de segurança</Label>
                    <Textarea value={getIA('vendas.selo_seguranca', '')} onChange={(e) => setIA('vendas.selo_seguranca', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Garantias (se houver)</Label>
                    <Textarea value={getIA('vendas.garantias', '')} onChange={(e) => setIA('vendas.garantias', e.target.value)} rows={3} />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-semibold">Depoimentos</Label>
                  {(((getIA('midias.depoimentos', []) as any[]) || []) as any[]).map((d: any, idx) => (
                    <div key={idx} className="grid gap-3 md:grid-cols-3 border rounded-lg p-3">
                      <div className="grid gap-2">
                        <Label>Nome</Label>
                        <Input
                          value={d?.nome || ''}
                          onChange={(e) => {
                            const items = [ ...(((getIA('midias.depoimentos', []) as any[]) || []) as any[]) ]
                            items[idx] = { ...(items[idx] || {}), nome: e.target.value }
                            setIA('midias.depoimentos', items)
                          }}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Idade</Label>
                        <Input
                          type="number"
                          value={d?.idade ?? ''}
                          onChange={(e) => {
                            const items = [ ...(((getIA('midias.depoimentos', []) as any[]) || []) as any[]) ]
                            items[idx] = { ...(items[idx] || {}), idade: e.target.value === '' ? null : Number(e.target.value) }
                            setIA('midias.depoimentos', items)
                          }}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-3">
                        <Label>Depoimento</Label>
                        <Textarea
                          value={d?.texto || ''}
                          onChange={(e) => {
                            const items = [ ...(((getIA('midias.depoimentos', []) as any[]) || []) as any[]) ]
                            items[idx] = { ...(items[idx] || {}), texto: e.target.value }
                            setIA('midias.depoimentos', items)
                          }}
                          rows={3}
                        />
                      </div>
                      <div className="md:col-span-3 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const items = [ ...(((getIA('midias.depoimentos', []) as any[]) || []) as any[]) ]
                            items.splice(idx, 1)
                            setIA('midias.depoimentos', items)
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const items = [ ...(((getIA('midias.depoimentos', []) as any[]) || []) as any[]) ]
                      items.push({ nome: '', idade: null, texto: '' })
                      setIA('midias.depoimentos', items)
                    }}
                  >
                    Adicionar depoimento
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                  <div className="grid gap-2">
                    <Label>Prova social específica (texto)</Label>
                    <Textarea value={getIA('midias.prova_social_texto', '')} onChange={(e) => setIA('midias.prova_social_texto', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Prova social específica (upload)</Label>
                    <FileUploadButton
                      label="Enviar imagens"
                      accept="image/*"
                      multiple
                      disabled={uploadingMidiaKey === 'midia:prova_social_especifica'}
                      onFiles={(files) => void handleUploadMidias('prova_social_especifica', files)}
                    />
                  </div>
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
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Upsell inteligente</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Procedimentos complementares</Label>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" className="justify-between">
                          {(() => {
                            const ids = (getIA('upsell.complementares_ids', []) as string[]) || []
                            if (ids.length === 0) return 'Selecionar procedimentos'
                            const nomes = procedimentos
                              .filter((p) => ids.includes(p.id))
                              .map((p) => p.nome)
                            return nomes.join(', ')
                          })()}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 overflow-auto">
                        {procedimentos.map((p) => {
                          const ids = (getIA('upsell.complementares_ids', []) as string[]) || []
                          const checked = ids.includes(p.id)
                          return (
                            <DropdownMenuCheckboxItem
                              key={p.id}
                              checked={checked}
                              onCheckedChange={() => setIA('upsell.complementares_ids', toggleMulti(ids, p.id))}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {p.nome}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid gap-2">
                    <Label>Procedimentos de upsell (upgrade direto)</Label>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" className="justify-between">
                          {(() => {
                            const ids = (getIA('upsell.upgrades_ids', []) as string[]) || []
                            if (ids.length === 0) return 'Selecionar procedimentos'
                            const nomes = procedimentos
                              .filter((p) => ids.includes(p.id))
                              .map((p) => p.nome)
                            return nomes.join(', ')
                          })()}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 overflow-auto">
                        {procedimentos.map((p) => {
                          const ids = (getIA('upsell.upgrades_ids', []) as string[]) || []
                          const checked = ids.includes(p.id)
                          return (
                            <DropdownMenuCheckboxItem
                              key={p.id}
                              checked={checked}
                              onCheckedChange={() => setIA('upsell.upgrades_ids', toggleMulti(ids, p.id))}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {p.nome}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                    <ListEditor
                      label="Triggers"
                      placeholder="Adicione triggers"
                      items={(getIA('upsell.triggers', []) as any[]) as string[]}
                      onChange={(items) => setIA('upsell.triggers', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Opções de pacote</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" className="justify-between">
                          Selecionar pacotes
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 overflow-auto">
                        {pacotes.map((p: any) => {
                          const ids = (getIA('upsell.pacotes_ids', []) as string[]) || []
                          const checked = ids.includes(p.id)
                          return (
                            <DropdownMenuCheckboxItem
                              key={p.id}
                              checked={checked}
                              onCheckedChange={() => setIA('upsell.pacotes_ids', toggleMulti(ids, p.id))}
                            >
                              {p.nome}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Material de apoio (upload imagem e vídeo)</Label>
                    <FileUploadButton
                      label="Enviar arquivos"
                      accept="image/*,video/*"
                      multiple
                      disabled={uploadingMidiaKey === 'midia:material_apoio'}
                      onFiles={(files) => void handleUploadMidias('material_apoio', files)}
                    />
                    {(((getIA('midias.material_apoio', []) as any[]) || []) as any[]).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(((getIA('midias.material_apoio', []) as any[]) || []) as any[]).map((m: any) => {
                          const urlKey = `${m.bucket}:${m.path}`
                          const url = midiaUrlByKey[urlKey]
                          const isImg = typeof url === 'string' && /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url)
                          return (
                            <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                              {url ? (
                                isImg ? (
                                  <img src={url} className="h-24 w-full object-cover" />
                                ) : (
                                  <a className="block p-3 text-sm underline" href={url} target="_blank" rel="noreferrer">
                                    Abrir
                                  </a>
                                )
                              ) : (
                                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                              )}
                              <div className="flex items-center justify-between gap-2 p-2">
                                <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('material_apoio', m)}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Mídias</Label>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Antes e depois</Label>
                    <FileUploadButton
                      label="Enviar imagens"
                      accept="image/*"
                      multiple
                      disabled={uploadingMidiaKey === 'midia:antes_depois'}
                      onFiles={(files) => void handleUploadMidias('antes_depois', files)}
                    />
                    {(((getIA('midias.antes_depois', []) as any[]) || []) as any[]).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(((getIA('midias.antes_depois', []) as any[]) || []) as any[]).map((m: any) => {
                          const urlKey = `${m.bucket}:${m.path}`
                          const url = midiaUrlByKey[urlKey]
                          return (
                            <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                              {url ? (
                                <img src={url} className="h-24 w-full object-cover" />
                              ) : (
                                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                              )}
                              <div className="flex items-center justify-between gap-2 p-2">
                                <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('antes_depois', m)}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label>Imagens ilustrativas</Label>
                    <FileUploadButton
                      label="Enviar imagens"
                      accept="image/*"
                      multiple
                      disabled={uploadingMidiaKey === 'midia:imagens_ilustrativas'}
                      onFiles={(files) => void handleUploadMidias('imagens_ilustrativas', files)}
                    />
                    {(((getIA('midias.imagens_ilustrativas', []) as any[]) || []) as any[]).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(((getIA('midias.imagens_ilustrativas', []) as any[]) || []) as any[]).map((m: any) => {
                          const urlKey = `${m.bucket}:${m.path}`
                          const url = midiaUrlByKey[urlKey]
                          return (
                            <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                              {url ? (
                                <img src={url} className="h-24 w-full object-cover" />
                              ) : (
                                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                              )}
                              <div className="flex items-center justify-between gap-2 p-2">
                                <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('imagens_ilustrativas', m)}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label>Carrossel comercial</Label>
                    <FileUploadButton
                      label="Enviar imagens"
                      accept="image/*"
                      multiple
                      disabled={uploadingMidiaKey === 'midia:carrossel_comercial'}
                      onFiles={(files) => void handleUploadMidias('carrossel_comercial', files)}
                    />
                    {(((getIA('midias.carrossel_comercial', []) as any[]) || []) as any[]).length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {(((getIA('midias.carrossel_comercial', []) as any[]) || []) as any[]).map((m: any) => {
                          const urlKey = `${m.bucket}:${m.path}`
                          const url = midiaUrlByKey[urlKey]
                          return (
                            <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                              {url ? (
                                <img src={url} className="h-24 w-full object-cover" />
                              ) : (
                                <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                              )}
                              <div className="flex items-center justify-between gap-2 p-2">
                                <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('carrossel_comercial', m)}>
                                  Remover
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Vídeos curtos para WhatsApp</Label>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Upload</Label>
                        <FileUploadButton
                          label="Enviar vídeos"
                          accept="video/*"
                          multiple
                          disabled={uploadingMidiaKey === 'midia:videos_whatsapp'}
                          onFiles={(files) => void handleUploadMidias('videos_whatsapp', files)}
                        />
                        {(((getIA('midias.videos_whatsapp', []) as any[]) || []) as any[]).length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {(((getIA('midias.videos_whatsapp', []) as any[]) || []) as any[]).map((m: any) => {
                              const urlKey = `${m.bucket}:${m.path}`
                              const url = midiaUrlByKey[urlKey]
                              return (
                                <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                                  {url ? (
                                    <video src={url} controls className="h-40 w-full object-cover" />
                                  ) : (
                                    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                                  )}
                                  <div className="flex items-center justify-between gap-2 p-2">
                                    <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('videos_whatsapp', m)}>
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Vídeos explicativos</Label>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Upload</Label>
                        <FileUploadButton
                          label="Enviar vídeos"
                          accept="video/*"
                          multiple
                          disabled={uploadingMidiaKey === 'midia:videos_explicativos'}
                          onFiles={(files) => void handleUploadMidias('videos_explicativos', files)}
                        />
                        {(((getIA('midias.videos_explicativos', []) as any[]) || []) as any[]).length > 0 ? (
                          <div className="grid grid-cols-1 gap-3">
                            {(((getIA('midias.videos_explicativos', []) as any[]) || []) as any[]).map((m: any) => {
                              const urlKey = `${m.bucket}:${m.path}`
                              const url = midiaUrlByKey[urlKey]
                              return (
                                <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                                  {url ? (
                                    <video src={url} controls className="h-40 w-full object-cover" />
                                  ) : (
                                    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                                  )}
                                  <div className="flex items-center justify-between gap-2 p-2">
                                    <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('videos_explicativos', m)}>
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label className="text-sm font-semibold">Vídeos de depoimentos</Label>
                    <div className="grid gap-2">
                      <Label>Upload</Label>
                      <FileUploadButton
                        label="Enviar vídeos"
                        accept="video/*"
                        multiple
                        disabled={uploadingMidiaKey === 'midia:videos_depoimentos'}
                        onFiles={(files) => void handleUploadMidias('videos_depoimentos', files)}
                      />
                      {(((getIA('midias.videos_depoimentos', []) as any[]) || []) as any[]).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {(((getIA('midias.videos_depoimentos', []) as any[]) || []) as any[]).map((m: any) => {
                            const urlKey = `${m.bucket}:${m.path}`
                            const url = midiaUrlByKey[urlKey]
                            return (
                              <div key={m.path} className="overflow-hidden rounded-md border border-border/60">
                                {url ? (
                                  <video src={url} controls className="h-40 w-full object-cover" />
                                ) : (
                                  <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                                )}
                                <div className="flex items-center justify-between gap-2 p-2">
                                  <div className="min-w-0 text-xs text-muted-foreground truncate">{m.path}</div>
                                  <Button type="button" variant="outline" size="sm" onClick={() => void handleRemoveMidia('videos_depoimentos', m)}>
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedProcedimento(null)
              }}
            >
              Cancelar
            </Button>
            {selectedProcedimento ? (
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            ) : (
              <Button onClick={handleCreateProcedimento} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar'}
              </Button>
            )}
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
