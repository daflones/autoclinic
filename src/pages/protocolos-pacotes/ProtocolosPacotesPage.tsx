import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ListEditor } from '@/components/ui/list-editor'
import { PairsEditor, type PairItem } from '@/components/ui/pairs-editor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Search, Package, Edit, Trash2, Image as ImageIcon, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateProtocoloPacote,
  useDeleteProtocoloPacote,
  useProtocolosPacotes,
  useUpdateProtocoloPacote,
  useUpdateProtocoloPacoteStatus,
} from '@/hooks/useProtocolosPacotes'
import { useProcedimentos } from '@/hooks/useProcedimentos'
import type { ProtocoloPacote, ProtocoloPacoteCreateData, ProtocoloPacoteStatus } from '@/services/api/protocolos-pacotes'
import { deleteMidia, getSignedMidiaUrl, uploadMidia } from '@/services/api/storage-midias'
import {
  useCreateProtocoloPacoteMidia,
  useDeleteProtocoloPacoteMidia,
  useProtocoloPacoteMidias,
} from '@/hooks/useProtocoloPacoteMidias'
import { protocoloPacoteMidiasService } from '@/services/api/protocolo-pacote-midias'

const STATUS_BADGE: Record<ProtocoloPacoteStatus | 'all', { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  all: { label: 'Todos', variant: 'secondary' },
  ativo: { label: 'Ativo', variant: 'default' },
  inativo: { label: 'Inativo', variant: 'outline' },
}

export function ProtocolosPacotesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProtocoloPacoteStatus | 'all'>('all')

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProtocoloPacote | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsItem, setDetailsItem] = useState<ProtocoloPacote | null>(null)

  const [formState, setFormState] = useState<ProtocoloPacoteCreateData>({
    nome: '',
    descricao: '',
    preco: null,
    itens: '',
    imagem_path: '',
    conteudo: {},
    ia_config: {},
    ativo: true,
  })

  const conteudo = (formState.conteudo || {}) as Record<string, any>

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

  const getFromObj = (obj: any, path: string, fallback: any = '') => {
    const parts = path.split('.')
    let cursor: any = obj
    for (const p of parts) {
      if (!cursor || typeof cursor !== 'object') return fallback
      cursor = cursor[p]
    }
    return typeof cursor === 'undefined' ? fallback : cursor
  }

  const getDetails = (path: string, fallback: any = '') => {
    const base = (detailsItem as any)?.ia_config || (detailsItem as any)?.conteudo || {}
    return getFromObj(base, path, fallback)
  }

  const openDetails = (item: ProtocoloPacote) => {
    setDetailsItem(item)
    setIsDetailsOpen(true)
  }

  const buildPairsFromTwoLists = (left: any, right: any): PairItem[] => {
    const l = normalizeStringList(left)
    const r = normalizeStringList(right)
    const max = Math.max(l.length, r.length)
    const out: PairItem[] = []
    for (let i = 0; i < max; i++) {
      out.push({ left: l[i] || '', right: r[i] || '' })
    }
    return out
  }

  const normalizeMidiasReforco = (value: any) => {
    const arr = Array.isArray(value) ? value : []
    return arr
      .map((it: any) => ({
        tipo: typeof it?.tipo === 'string' ? it.tipo : 'imagem',
        url: typeof it?.url === 'string' ? it.url : '',
        titulo: typeof it?.titulo === 'string' ? it.titulo : '',
        descricao: typeof it?.descricao === 'string' ? it.descricao : '',
      }))
  }

  const reorder = <T,>(arr: T[], from: number, to: number) => {
    if (from === to) return arr
    const next = [...arr]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }

  const buildIaConfigFromConteudo = (data: ProtocoloPacoteCreateData) => {
    return {
      ...(data.ia_config || {}),
      ...(data.conteudo || {}),
    }
  }

  const setC = (path: string, value: any) => {
    const parts = path.split('.')
    setFormState((prev) => {
      const base = { ...(prev.conteudo || {}) } as any
      let cursor = base
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i]
        cursor[k] = cursor[k] && typeof cursor[k] === 'object' ? { ...cursor[k] } : {}
        cursor = cursor[k]
      }
      cursor[parts[parts.length - 1]] = value
      return { ...prev, conteudo: base, ia_config: base }
    })
  }

  const getC = (path: string, fallback: any = '') => {
    const parts = path.split('.')
    let cursor: any = conteudo
    for (const p of parts) {
      if (!cursor || typeof cursor !== 'object') return fallback
      cursor = cursor[p]
    }
    return cursor ?? fallback
  }

  const [uploadingImagem, setUploadingImagem] = useState(false)
  const [pendingCreateMidias, setPendingCreateMidias] = useState<Record<string, File[]>>({})
  const [imagemPreviewUrlById, setImagemPreviewUrlById] = useState<Record<string, string>>({})

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    [searchTerm, statusFilter]
  )

  const { data: itens, isLoading } = useProtocolosPacotes(filters)
  const { data: procedimentos = [] } = useProcedimentos({} as any)

  const createMutation = useCreateProtocoloPacote()
  const updateMutation = useUpdateProtocoloPacote()
  const deleteMutation = useDeleteProtocoloPacote()
  const statusMutation = useUpdateProtocoloPacoteStatus()

  const { data: protocoloMidias = [], isLoading: isLoadingMidias } = useProtocoloPacoteMidias(
    isEditModalOpen ? selectedItem?.id ?? undefined : undefined,
  )
  const createProtocoloMidia = useCreateProtocoloPacoteMidia()
  const deleteProtocoloMidia = useDeleteProtocoloPacoteMidia()

  const stats = useMemo(() => {
    return {
      total: itens.length,
      ativos: itens.filter((p) => p.ativo).length,
      inativos: itens.filter((p) => !p.ativo).length,
    }
  }, [itens])

  const getEstruturaItens = () => {
    const raw = (getC('estrutura.itens', []) as any[]) || []
    return raw.map((it: any, idx: number) => {
      if (!it || typeof it !== 'object') {
        return {
          tipo: 'manual',
          ordem: idx + 1,
          procedimento_id: null,
          nome_manual: String(it ?? ''),
          sessoes_qtd: null,
          intervalo_recomendado: '',
          duracao_sessao_min: null,
          valor_individual: null,
        }
      }

      const tipo = it.tipo === 'procedimento' || it.procedimento_id ? 'procedimento' : 'manual'
      return {
        tipo,
        ordem: it.ordem ?? idx + 1,
        procedimento_id: it.procedimento_id ?? null,
        nome_manual: it.nome_manual ?? it.procedimento ?? '',
        sessoes_qtd: it.sessoes_qtd ?? it.qtd ?? null,
        intervalo_recomendado: it.intervalo_recomendado ?? it.intervalo ?? '',
        duracao_sessao_min: it.duracao_sessao_min ?? it.duracao_estimada ?? null,
        valor_individual: it.valor_individual ?? it.valor ?? null,
      }
    })
  }

  const setEstruturaItens = (items: any[]) => setC('estrutura.itens', items)

  useEffect(() => {
    let cancelled = false
    async function hydrateUrls() {
      if (!protocoloMidias || protocoloMidias.length === 0) return
      const missing = protocoloMidias.filter((m) => !imagemPreviewUrlById[m.id])
      if (missing.length === 0) return

      const entries = await Promise.all(
        missing.map(async (m) => {
          try {
            const url = await getSignedMidiaUrl({ bucket: 'pacotes-midias', path: m.storage_path, expiresIn: 60 * 60 })
            return [m.id, url] as const
          } catch {
            return [m.id, ''] as const
          }
        }),
      )

      if (cancelled) return
      setImagemPreviewUrlById((prev) => {
        const next = { ...prev }
        entries.forEach(([id, url]) => {
          if (url) next[id] = url
        })
        return next
      })
    }
    void hydrateUrls()
    return () => {
      cancelled = true
    }
  }, [protocoloMidias, imagemPreviewUrlById])

  const handleUploadMidiasForProtocolo = async (protocoloId: string, tipo: string, files: File[]) => {
    if (!files.length) return
    setUploadingImagem(true)
    try {
      for (const file of files) {
        const uploaded = await uploadMidia({ bucket: 'pacotes-midias', file, prefix: `protocolos/${protocoloId}/${tipo}` })
        await createProtocoloMidia.mutateAsync({
          protocolo_pacote_id: protocoloId,
          tipo,
          storage_bucket: 'pacotes-midias',
          storage_path: uploaded.path,
          label: file.name,
        })
      }
    } finally {
      setUploadingImagem(false)
    }
  }

  const handleRemoveMidia = async (midia: any) => {
    if (!selectedItem) return
    setUploadingImagem(true)
    try {
      try {
        await deleteMidia({ bucket: 'pacotes-midias', path: midia.storage_path })
      } catch {
        // ignore
      }
      await deleteProtocoloMidia.mutateAsync({ id: midia.id, protocoloPacoteId: selectedItem.id })
      setImagemPreviewUrlById((prev) => {
        const copy = { ...prev }
        delete copy[midia.id]
        return copy
      })
    } finally {
      setUploadingImagem(false)
    }
  }

  const openCreate = () => {
    setSelectedItem(null)
    setPendingCreateMidias({})
    setFormState({
      nome: '',
      descricao: '',
      preco: null,
      itens: '',
      imagem_path: '',
      conteudo: {},
      ia_config: {},
      ativo: true,
    })
    setIsCreateModalOpen(true)
  }

  const openEdit = (item: ProtocoloPacote) => {
    setSelectedItem(item)
    setFormState({
      nome: item.nome,
      descricao: item.descricao ?? '',
      preco: item.preco ?? null,
      itens: item.itens ?? '',
      imagem_path: item.imagem_path ?? '',
      conteudo: (item as any).ia_config || (item as any).conteudo || {},
      ia_config: (item as any).ia_config || (item as any).conteudo || {},
      ativo: item.ativo,
    })
    setIsEditModalOpen(true)
  }

  const requestDelete = (item: ProtocoloPacote) => {
    setSelectedItem(item)
    setIsDeleteConfirmOpen(true)
  }

  const handleCreate = async () => {
    if (!formState.nome) {
      toast.error('Preencha o nome')
      return
    }
    try {
      const payload = {
        ...formState,
        imagem_path: null,
        ia_config: buildIaConfigFromConteudo(formState),
      }
      const created = await createMutation.mutateAsync(payload)
      const entries = Object.entries(pendingCreateMidias)
      for (const [tipo, files] of entries) {
        if (files && files.length > 0) {
          await handleUploadMidiasForProtocolo(created.id, tipo, files)
        }
      }
      setIsCreateModalOpen(false)
      setPendingCreateMidias({})
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedItem) return
    if (!formState.nome) {
      toast.error('Preencha o nome')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: selectedItem.id,
        data: {
          ...formState,
          ia_config: buildIaConfigFromConteudo(formState),
        },
      })
      setIsEditModalOpen(false)
      setSelectedItem(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedItem) return
    try {
      try {
        const midias = await protocoloPacoteMidiasService.listByProtocoloPacoteId(selectedItem.id)
        await Promise.all(
          midias.map(async (m) => {
            try {
              await deleteMidia({ bucket: 'pacotes-midias', path: m.storage_path })
            } catch {
              // ignore
            }
          }),
        )
      } catch {
        // ignore
      }
      await deleteMutation.mutateAsync(selectedItem.id)
      setIsDeleteConfirmOpen(false)
      setSelectedItem(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleToggleAtivo = async (item: ProtocoloPacote) => {
    try {
      await statusMutation.mutateAsync({ id: item.id, ativo: !item.ativo })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      setPendingCreateMidias({})
      setUploadingImagem(false)
    }
  }, [isCreateModalOpen, isEditModalOpen])

  const renderMidiaUploader = (params: { tipo: string; label: string; accept: string; allowWhenCreating: boolean }) => {
    const { tipo, label, accept, allowWhenCreating } = params
    const existing = protocoloMidias.filter((m: any) => (m?.tipo || 'imagem') === tipo)
    const pending = pendingCreateMidias[tipo] || []
    const canUpload = Boolean(selectedItem) || allowWhenCreating

    return (
      <div className="space-y-2">
        <Label>{label}</Label>

        {canUpload ? (
          <Input
            type="file"
            accept={accept}
            multiple
            className="file:text-foreground file:bg-transparent file:border-0 file:mr-3"
            disabled={uploadingImagem}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              if (!files.length) return

              if (selectedItem) {
                void handleUploadMidiasForProtocolo(selectedItem.id, tipo, files)
              } else {
                setPendingCreateMidias((prev) => ({
                  ...prev,
                  [tipo]: [ ...(prev[tipo] || []), ...files ],
                }))
              }
              e.currentTarget.value = ''
            }}
          />
        ) : null}

        {pending.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {pending.map((f) => {
              const url = URL.createObjectURL(f)
              const isImg = (f.type || '').startsWith('image/')
              const isVideo = (f.type || '').startsWith('video/')

              return (
                <div key={f.name + f.size} className="overflow-hidden rounded-md border border-border/60">
                  {isImg ? (
                    <img src={url} alt={f.name} className="h-24 w-full object-cover" />
                  ) : isVideo ? (
                    <video src={url} className="h-24 w-full object-cover" controls />
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">{f.name}</div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 text-xs text-muted-foreground truncate">{f.name}</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPendingCreateMidias((prev) => ({
                          ...prev,
                          [tipo]: (prev[tipo] || []).filter((x) => x !== f),
                        }))
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {selectedItem ? (
          isLoadingMidias ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : existing.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {existing.map((m: any) => (
                <div key={m.id} className="overflow-hidden rounded-md border border-border/60">
                  {imagemPreviewUrlById[m.id] ? (
                    <img src={imagemPreviewUrlById[m.id]} alt={m.label || 'Mídia'} className="h-24 w-full object-cover" />
                  ) : (
                    <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                  )}
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="min-w-0 text-xs text-muted-foreground truncate">{m.label || m.storage_path}</div>
                    <Button type="button" variant="outline" size="sm" disabled={uploadingImagem} onClick={() => void handleRemoveMidia(m)}>
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocolos/Pacotes</h1>
          <p className="text-muted-foreground">Gerencie protocolos e pacotes disponíveis para sua clínica</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Itens cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Badge variant="default">Ativo</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">Visíveis/selecionáveis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <Badge variant="outline">Inativo</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inativos}</div>
            <p className="text-xs text-muted-foreground">Ocultos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>Crie, edite e gerencie seus protocolos/pacotes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou descrição"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-full md:w-64 space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_BADGE).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum item encontrado.</div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => openDetails(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                      {item.imagem_path ? (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{item.nome}</div>
                        <Badge variant={item.ativo ? 'default' : 'outline'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      {item.descricao ? (
                        <div className="text-sm text-muted-foreground line-clamp-2">{item.descricao}</div>
                      ) : null}
                      {typeof item.preco === 'number' ? (
                        <div className="text-xs text-muted-foreground">Valor total do pacote: R$ {item.preco.toFixed(2)}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleToggleAtivo(item)
                      }}
                      disabled={statusMutation.isPending}
                    >
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(item)
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        requestDelete(item)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open)
          if (!open) setDetailsItem(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Protocolo/Pacote</DialogTitle>
            <DialogDescription>Visualize as informações separadas por seções</DialogDescription>
          </DialogHeader>

          {detailsItem ? (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Informações principais</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1">
                    <div className="text-sm text-muted-foreground">Nome</div>
                    <div className="font-medium">{detailsItem.nome}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">{detailsItem.ativo ? 'Ativo' : 'Inativo'}</div>
                  </div>
                  {detailsItem.descricao ? (
                    <div className="grid gap-1 md:col-span-2">
                      <div className="text-sm text-muted-foreground">Descrição</div>
                      <div className="text-sm whitespace-pre-wrap">{detailsItem.descricao}</div>
                    </div>
                  ) : null}
                  {typeof detailsItem.preco === 'number' ? (
                    <div className="grid gap-1">
                      <div className="text-sm text-muted-foreground">Valor total</div>
                      <div className="font-medium">R$ {detailsItem.preco.toFixed(2)}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Dados básicos</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-1">
                    <div className="text-sm text-muted-foreground">Categoria</div>
                    <div className="text-sm">{String(getDetails('basico.categoria', '') || '')}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-sm text-muted-foreground">Nível</div>
                    <div className="text-sm">{String(getDetails('basico.nivel', '') || '')}</div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-sm text-muted-foreground">Duração média do programa</div>
                    <div className="text-sm">{String(getDetails('basico.duracao_programa', '') || '')}</div>
                  </div>
                  {String(getDetails('basico.descricao_geral', '') || '') ? (
                    <div className="grid gap-1 md:col-span-2">
                      <div className="text-sm text-muted-foreground">Descrição geral</div>
                      <div className="text-sm whitespace-pre-wrap">{String(getDetails('basico.descricao_geral', ''))}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Estrutura / Cronograma</Label>
                {(() => {
                  const items = Array.isArray(getDetails('estrutura.itens', [])) ? (getDetails('estrutura.itens', []) as any[]) : []
                  if (items.length === 0) {
                    return <div className="text-sm text-muted-foreground">Nenhum item adicionado</div>
                  }
                  return (
                    <div className="space-y-3">
                      {items.map((it, idx) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="text-sm"><span className="text-muted-foreground">Tipo:</span> {String(it?.tipo || '')}</div>
                            <div className="text-sm"><span className="text-muted-foreground">Ordem:</span> {String(it?.ordem ?? '')}</div>
                            <div className="text-sm md:col-span-2"><span className="text-muted-foreground">Procedimento/Item:</span> {String(it?.procedimento_id || it?.nome_manual || '')}</div>
                            <div className="text-sm"><span className="text-muted-foreground">Sessões:</span> {String(it?.sessoes_qtd ?? '')}</div>
                            <div className="text-sm"><span className="text-muted-foreground">Intervalo:</span> {String(it?.intervalo_recomendado || '')}</div>
                            <div className="text-sm"><span className="text-muted-foreground">Duração (min):</span> {String(it?.duracao_sessao_min ?? '')}</div>
                            <div className="text-sm"><span className="text-muted-foreground">Valor individual:</span> {typeof it?.valor_individual === 'number' ? `R$ ${it.valor_individual.toFixed(2)}` : String(it?.valor_individual ?? '')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Valores e condições</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-sm"><span className="text-muted-foreground">IA pode informar valores:</span> {Boolean(getDetails('ia.pode_informar_valores', false)) ? 'Sim' : 'Não'}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Pode parcelar:</span> {String(getDetails('valores.pode_parcelar', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Máx. parcelas:</span> {String(getDetails('valores.max_parcelas', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Entrada obrigatória:</span> {String(getDetails('valores.entrada_obrigatoria', '') || '')}</div>
                  {String(getDetails('valores.entrada_obrigatoria', 'nao')) === 'sim' ? (
                    <>
                      <div className="text-sm"><span className="text-muted-foreground">Valor da entrada:</span> {String(getDetails('valores.valor_entrada', '') || '')}</div>
                      {String(getDetails('valores.condicoes_especiais', '') || '') ? (
                        <div className="text-sm md:col-span-2 whitespace-pre-wrap"><span className="text-muted-foreground">Condições especiais:</span> {String(getDetails('valores.condicoes_especiais', ''))}</div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Copy e narrativa</Label>
                {(() => {
                  const mk = (label: string, path: string) => {
                    const arr = normalizeStringList(getDetails(path, []))
                    return (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{label}</div>
                        {arr.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Não informado</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {arr.map((x, i) => (
                              <Badge key={i} variant="secondary">{x}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div className="grid gap-4 md:grid-cols-2">
                      {mk('Resultados prometidos', 'copy.resultados')}
                      {mk('Benefícios emocionais', 'copy.beneficios_emocionais')}
                      {mk('Problemas que resolve', 'copy.problemas_resolve')}
                      {mk('Por que é melhor que avulso', 'copy.porque_melhor')}
                    </div>
                  )
                })()}
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Regras de agendamento do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-sm"><span className="text-muted-foreground">Avaliação primeiro:</span> {String(getDetails('agendamento.avaliacao_primeiro', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">IA pode agendar:</span> {String(getDetails('agendamento.ia_pode_agendar', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Modo:</span> {String(getDetails('agendamento.modo', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Prazo máximo:</span> {String(getDetails('agendamento.prazo_maximo', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Intervalo mín (dias):</span> {String(getDetails('agendamento.intervalo_min_dias', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Intervalo máx (dias):</span> {String(getDetails('agendamento.intervalo_max_dias', '') || '')}</div>
                  {String(getDetails('agendamento.regras_texto', '') || '') ? (
                    <div className="text-sm md:col-span-2 whitespace-pre-wrap"><span className="text-muted-foreground">Regras adicionais:</span> {String(getDetails('agendamento.regras_texto', ''))}</div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Objeções específicas do pacote</Label>
                {(() => {
                  const items = getDetails('objecoes.itens', [])
                  const normalized = Array.isArray(items)
                    ? items.map((it: any) => ({
                        left: typeof it?.left === 'string' ? it.left : typeof it?.objecao === 'string' ? it.objecao : '',
                        right: typeof it?.right === 'string' ? it.right : typeof it?.resposta === 'string' ? it.resposta : '',
                      }))
                    : []
                  if (normalized.length === 0) {
                    return <div className="text-sm text-muted-foreground">Nenhuma objeção cadastrada</div>
                  }
                  return (
                    <div className="space-y-3">
                      {normalized.map((it: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3">
                          <div className="grid gap-2">
                            <div className="text-sm font-medium">Objeção</div>
                            <div className="text-sm whitespace-pre-wrap">{String(it.left || '')}</div>
                            <div className="text-sm font-medium pt-2">Resposta</div>
                            <div className="text-sm whitespace-pre-wrap">{String(it.right || '')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Upsell dentro do pacote</Label>
                {(() => {
                  const complementos = normalizeStringList(getDetails('upsell.complementos', []))
                  const quando = String(getDetails('upsell.quando', '') || '')
                  const argumento = String(getDetails('upsell.argumento', '') || '')
                  const midias = Array.isArray(getDetails('upsell.midias_reforco', [])) ? (getDetails('upsell.midias_reforco', []) as any[]) : []
                  const procedimentos = Array.isArray(getDetails('upsell.procedimentos', [])) ? (getDetails('upsell.procedimentos', []) as any[]) : []
                  const upgrades = Array.isArray(getDetails('upsell.upgrades_pacotes', [])) ? (getDetails('upsell.upgrades_pacotes', []) as any[]) : []
                  const adicionais = Array.isArray(getDetails('upsell.adicionais_por_sessao', [])) ? (getDetails('upsell.adicionais_por_sessao', []) as any[]) : []

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Complementos sugeridos</div>
                          {complementos.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nenhum</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {complementos.map((x, i) => (
                                <Badge key={i} variant="secondary">{x}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Quando sugerir</div>
                          <div className="text-sm">{quando || 'Não informado'}</div>
                        </div>
                        {argumento ? (
                          <div className="space-y-2 md:col-span-2">
                            <div className="text-sm font-medium">Argumento</div>
                            <div className="text-sm whitespace-pre-wrap">{argumento}</div>
                          </div>
                        ) : null}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Procedimentos complementares (IDs)</div>
                          {procedimentos.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nenhum</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {procedimentos.map((x: any, i: number) => (
                                <Badge key={i} variant="secondary">{String(x)}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Upgrade via pacotes (IDs)</div>
                          {upgrades.length === 0 ? (
                            <div className="text-sm text-muted-foreground">Nenhum</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {upgrades.map((x: any, i: number) => (
                                <Badge key={i} variant="secondary">{String(x)}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Mídias de reforço</div>
                        {midias.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhuma</div>
                        ) : (
                          <div className="space-y-2">
                            {midias.map((m: any, idx: number) => (
                              <div key={idx} className="rounded-md border p-2 text-sm">
                                <div><span className="text-muted-foreground">Tipo:</span> {String(m?.tipo || '')}</div>
                                <div><span className="text-muted-foreground">URL:</span> {String(m?.url || '')}</div>
                                {m?.titulo ? <div><span className="text-muted-foreground">Título:</span> {String(m.titulo)}</div> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Adicionais por sessão</div>
                        {adicionais.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Nenhum</div>
                        ) : (
                          <div className="space-y-2">
                            {adicionais.map((a: any, idx: number) => (
                              <div key={idx} className="rounded-md border p-2 text-sm">
                                <div><span className="text-muted-foreground">Nome:</span> {String(a?.nome || '')}</div>
                                <div><span className="text-muted-foreground">Valor:</span> {String(a?.valor ?? '')}</div>
                                {a?.motivo ? <div className="whitespace-pre-wrap"><span className="text-muted-foreground">Motivo:</span> {String(a.motivo)}</div> : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Retorno e manutenção pós-pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-sm"><span className="text-muted-foreground">Retorno (dias):</span> {String(getDetails('pos.retorno_dias', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Manutenção (qtd):</span> {String(getDetails('pos.manutencao_sessoes_qtd', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Reativação (dias):</span> {String(getDetails('pos.reativacao_dias', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Oferecer novo pacote:</span> {String(getDetails('pos.oferecer_novo_pacote', '') || '')}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Oferecer upgrade maior:</span> {String(getDetails('pos.oferecer_upgrade', '') || '')}</div>
                  {String(getDetails('pos.mensagens', '') || '') ? (
                    <div className="text-sm md:col-span-2 whitespace-pre-wrap"><span className="text-muted-foreground">Mensagens pós-pacote:</span> {String(getDetails('pos.mensagens', ''))}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Protocolo/Pacote</DialogTitle>
            <DialogDescription>Cadastre um novo protocolo/pacote</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formState.nome} onChange={(e) => setFormState({ ...formState, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor total do pacote (opcional)</Label>
                <Input
                  type="number"
                  value={formState.preco ?? ''}
                  onChange={(e) => setFormState({ ...formState, preco: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formState.descricao || ''} onChange={(e) => setFormState({ ...formState, descricao: e.target.value })} rows={3} />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Dados básicos</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select value={getC('basico.categoria', 'misto')} onValueChange={(v) => setC('basico.categoria', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facial">Facial</SelectItem>
                        <SelectItem value="corporal">Corporal</SelectItem>
                        <SelectItem value="capilar">Capilar</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                        <SelectItem value="injetaveis">Injetáveis</SelectItem>
                        <SelectItem value="laser">Laser</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Duração média do programa</Label>
                    <Input value={getC('basico.duracao_programa', '')} onChange={(e) => setC('basico.duracao_programa', e.target.value)} placeholder="Ex: 60 dias" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nível</Label>
                    <Select value={getC('basico.nivel', 'intermediario')} onValueChange={(v) => setC('basico.nivel', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                        <SelectItem value="intensivo">Intensivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição geral (visão do tratamento)</Label>
                    <Textarea value={getC('basico.descricao_geral', '')} onChange={(e) => setC('basico.descricao_geral', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Estrutura / Cronograma</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Itens do pacote</Label>
                    <div className="space-y-3">
                      {getEstruturaItens().map((it: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Tipo</Label>
                              <Select
                                value={it.tipo || 'manual'}
                                onValueChange={(v) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], tipo: v }
                                  if (v === 'manual') items[idx] = { ...items[idx], procedimento_id: null }
                                  setEstruturaItens(items)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="procedimento">Procedimento incluído</SelectItem>
                                  <SelectItem value="manual">Item manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Ordem recomendada</Label>
                              <Input
                                type="number"
                                value={it.ordem ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], ordem: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                          </div>

                          {it.tipo === 'procedimento' ? (
                            <div className="grid gap-2">
                              <Label>Procedimento incluído</Label>
                              <Select
                                value={it.procedimento_id || 'none'}
                                onValueChange={(v) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], procedimento_id: v === 'none' ? null : v }
                                  setEstruturaItens(items)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {procedimentos.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <Label>Item (texto)</Label>
                              <Input
                                value={it.nome_manual || ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], nome_manual: e.target.value }
                                  setEstruturaItens(items)
                                }}
                                placeholder="Ex: Máscara de ouro"
                              />
                            </div>
                          )}

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Quantidade de sessões</Label>
                              <Input
                                type="number"
                                value={it.sessoes_qtd ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], sessoes_qtd: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Intervalo recomendado</Label>
                              <Input
                                value={it.intervalo_recomendado || ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], intervalo_recomendado: e.target.value }
                                  setEstruturaItens(items)
                                }}
                                placeholder="Ex: 7 dias / 2x por semana"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Duração de cada sessão (min)</Label>
                              <Input
                                type="number"
                                value={it.duracao_sessao_min ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], duracao_sessao_min: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Valor individual (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={it.valor_individual ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], valor_individual: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const items = getEstruturaItens()
                                items.splice(idx, 1)
                                setEstruturaItens(items)
                              }}
                            >
                              Remover item
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const items = getEstruturaItens()
                          items.push({
                            tipo: 'procedimento',
                            procedimento_id: null,
                            nome_manual: '',
                            sessoes_qtd: null,
                            intervalo_recomendado: '',
                            duracao_sessao_min: null,
                            valor_individual: null,
                            ordem: items.length + 1,
                          })
                          setEstruturaItens(items)
                        }}
                      >
                        Adicionar item
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Valores e condições</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                    <Label>IA pode informar valores?</Label>
                    <Switch checked={Boolean(getC('ia.pode_informar_valores', false))} onCheckedChange={(v) => setC('ia.pode_informar_valores', v)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pode parcelar?</Label>
                    <Select value={getC('valores.pode_parcelar', 'nao')} onValueChange={(v) => setC('valores.pode_parcelar', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Máx. parcelas</Label>
                    <Input type="number" value={getC('valores.max_parcelas', '')} onChange={(e) => setC('valores.max_parcelas', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                    <Label>Entrada/sinal obrigatório?</Label>
                    <Select value={getC('valores.entrada_obrigatoria', 'nao')} onValueChange={(v) => setC('valores.entrada_obrigatoria', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {String(getC('valores.entrada_obrigatoria', 'nao')) === 'sim' ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Valor da entrada</Label>
                        <Input type="number" step="0.01" value={getC('valores.valor_entrada', '')} onChange={(e) => setC('valores.valor_entrada', e.target.value === '' ? null : Number(e.target.value))} />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Condições especiais</Label>
                        <Textarea value={getC('valores.condicoes_especiais', '')} onChange={(e) => setC('valores.condicoes_especiais', e.target.value)} rows={3} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Regras de agendamento do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Agendar avaliação primeiro?</Label>
                    <Select value={getC('agendamento.avaliacao_primeiro', 'sim')} onValueChange={(v) => setC('agendamento.avaliacao_primeiro', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>IA pode agendar sessões diretamente?</Label>
                    <Select value={getC('agendamento.ia_pode_agendar', 'nao')} onValueChange={(v) => setC('agendamento.ia_pode_agendar', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Uma por vez ou várias?</Label>
                    <Select value={getC('agendamento.modo', 'uma_por_vez')} onValueChange={(v) => setC('agendamento.modo', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uma_por_vez">Uma por vez</SelectItem>
                        <SelectItem value="varias">Várias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Prazo máximo para concluir</Label>
                    <Input value={getC('agendamento.prazo_maximo', '')} onChange={(e) => setC('agendamento.prazo_maximo', e.target.value)} placeholder="Ex: 60 dias" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Intervalo mínimo entre sessões (dias)</Label>
                    <Input
                      type="number"
                      value={getC('agendamento.intervalo_min_dias', '')}
                      onChange={(e) => setC('agendamento.intervalo_min_dias', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Intervalo máximo entre sessões (dias)</Label>
                    <Input
                      type="number"
                      value={getC('agendamento.intervalo_max_dias', '')}
                      onChange={(e) => setC('agendamento.intervalo_max_dias', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Regras adicionais (texto)</Label>
                    <Textarea value={getC('agendamento.regras_texto', '')} onChange={(e) => setC('agendamento.regras_texto', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Copy e narrativa</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Resultados prometidos</Label>
                    <ListEditor
                      placeholder="Adicione resultados prometidos"
                      items={normalizeStringList(getC('copy.resultados', []))}
                      onChange={(items) => setC('copy.resultados', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Benefícios emocionais</Label>
                    <ListEditor
                      placeholder="Adicione benefícios emocionais"
                      items={normalizeStringList(getC('copy.beneficios_emocionais', []))}
                      onChange={(items) => setC('copy.beneficios_emocionais', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Problemas que resolve</Label>
                    <ListEditor
                      placeholder="Adicione problemas que resolve"
                      items={normalizeStringList(getC('copy.problemas_resolve', []))}
                      onChange={(items) => setC('copy.problemas_resolve', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Por que é melhor que avulso</Label>
                    <ListEditor
                      placeholder="Adicione razões"
                      items={normalizeStringList(getC('copy.porque_melhor', []))}
                      onChange={(items) => setC('copy.porque_melhor', items)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Objeções específicas do pacote</Label>
                <PairsEditor
                  title="Objeções e respostas"
                  leftLabel="Objeção"
                  rightLabel="Resposta ideal"
                  addLabel="Adicionar objeção"
                  items={(() => {
                    const items = getC('objecoes.itens', [])
                    if (Array.isArray(items) && items.length > 0) {
                      return items.map((it: any) => ({
                        left: typeof it?.left === 'string' ? it.left : typeof it?.objecao === 'string' ? it.objecao : '',
                        right: typeof it?.right === 'string' ? it.right : typeof it?.resposta === 'string' ? it.resposta : '',
                      })) as PairItem[]
                    }
                    return buildPairsFromTwoLists(getC('objecoes.lista', []), getC('objecoes.respostas', []))
                  })()}
                  onChange={(items) => setC('objecoes.itens', items)}
                />
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Upsell dentro do pacote</Label>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <ListEditor
                        label="Complementos sugeridos"
                        placeholder="Adicione complementos"
                        items={normalizeStringList(getC('upsell.complementos', []))}
                        onChange={(items) => setC('upsell.complementos', items)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Quando sugerir</Label>
                      <Select value={getC('upsell.quando', 'no_fechamento')} onValueChange={(v) => setC('upsell.quando', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_fechamento">No fechamento</SelectItem>
                          <SelectItem value="primeira_sessao">Na 1ª sessão</SelectItem>
                          <SelectItem value="metade">Metade do pacote</SelectItem>
                          <SelectItem value="ultima">Última sessão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label>Motivo / argumento principal</Label>
                      <Textarea value={getC('upsell.argumento', '')} onChange={(e) => setC('upsell.argumento', e.target.value)} rows={3} />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label>Mídias de reforço</Label>
                      <div className="space-y-3">
                        {(normalizeMidiasReforco(getC('upsell.midias_reforco', [])) as any[]).map((m, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border/60 bg-background p-3"
                            draggable
                            onDragStart={() => {
                              ;(window as any).__midias_reforco_drag_index__ = idx
                            }}
                            onDragOver={(e) => {
                              e.preventDefault()
                            }}
                            onDrop={() => {
                              const from = (window as any).__midias_reforco_drag_index__
                              ;(window as any).__midias_reforco_drag_index__ = null
                              if (typeof from !== 'number') return
                              const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                              setC('upsell.midias_reforco', reorder(current, from, idx))
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span>Arraste para reordenar</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                  current.splice(idx, 1)
                                  setC('upsell.midias_reforco', current)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Tipo</Label>
                                <Select
                                  value={m.tipo || 'imagem'}
                                  onValueChange={(v) => {
                                    const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                    current[idx] = { ...current[idx], tipo: v }
                                    setC('upsell.midias_reforco', current)
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="imagem">Imagem</SelectItem>
                                    <SelectItem value="video">Vídeo</SelectItem>
                                    <SelectItem value="link">Link</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>URL</Label>
                                <Input
                                  value={m.url || ''}
                                  onChange={(e) => {
                                    const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                    current[idx] = { ...current[idx], url: e.target.value }
                                    setC('upsell.midias_reforco', current)
                                  }}
                                  placeholder="https://..."
                                />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Título (opcional)</Label>
                                <Input
                                  value={m.titulo || ''}
                                  onChange={(e) => {
                                    const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                    current[idx] = { ...current[idx], titulo: e.target.value }
                                    setC('upsell.midias_reforco', current)
                                  }}
                                />
                              </div>
                              <div className="grid gap-2 md:col-span-2">
                                <Label>Descrição (opcional)</Label>
                                <Textarea
                                  value={m.descricao || ''}
                                  onChange={(e) => {
                                    const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                    current[idx] = { ...current[idx], descricao: e.target.value }
                                    setC('upsell.midias_reforco', current)
                                  }}
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                            current.push({ tipo: 'imagem', url: '', titulo: '', descricao: '' })
                            setC('upsell.midias_reforco', current)
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Adicionar mídia
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Procedimentos complementares</Label>
                      <div className="flex gap-2">
                        <Select value={getC('upsell._ui_add_procedimento', 'none')} onValueChange={(v) => setC('upsell._ui_add_procedimento', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione</SelectItem>
                            {procedimentos.map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const selectedId = String(getC('upsell._ui_add_procedimento', 'none') || 'none')
                            if (selectedId === 'none') return
                            const prev = ((getC('upsell.procedimentos', []) as any[]) || []) as any[]
                            if (prev.includes(selectedId)) return
                            setC('upsell.procedimentos', [...prev, selectedId])
                            setC('upsell._ui_add_procedimento', 'none')
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                      {(((getC('upsell.procedimentos', []) as any[]) || []) as any[]).length > 0 ? (
                        <div className="space-y-2">
                          {(((getC('upsell.procedimentos', []) as any[]) || []) as any[]).map((id: any) => {
                            const proc = procedimentos.find((p: any) => p.id === id)
                            return (
                              <div key={String(id)} className="flex items-center justify-between gap-2 rounded-md border p-2">
                                <div className="text-sm text-foreground">{proc?.nome || String(id)}</div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const prev = ((getC('upsell.procedimentos', []) as any[]) || []) as any[]
                                    setC('upsell.procedimentos', prev.filter((x) => x !== id))
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <Label>Upgrade via pacotes</Label>
                      <div className="flex gap-2">
                        <Select value={getC('upsell._ui_add_pacote', 'none')} onValueChange={(v) => setC('upsell._ui_add_pacote', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione</SelectItem>
                            {itens
                              .filter((p: any) => Boolean(p?.ativo))
                              .map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const selectedId = String(getC('upsell._ui_add_pacote', 'none') || 'none')
                            if (selectedId === 'none') return
                            const prev = ((getC('upsell.upgrades_pacotes', []) as any[]) || []) as any[]
                            if (prev.includes(selectedId)) return
                            setC('upsell.upgrades_pacotes', [...prev, selectedId])
                            setC('upsell._ui_add_pacote', 'none')
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                      {(((getC('upsell.upgrades_pacotes', []) as any[]) || []) as any[]).length > 0 ? (
                        <div className="space-y-2">
                          {(((getC('upsell.upgrades_pacotes', []) as any[]) || []) as any[]).map((id: any) => {
                            const pack = itens.find((p: any) => p.id === id)
                            return (
                              <div key={String(id)} className="flex items-center justify-between gap-2 rounded-md border p-2">
                                <div className="text-sm text-foreground">{pack?.nome || String(id)}</div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const prev = ((getC('upsell.upgrades_pacotes', []) as any[]) || []) as any[]
                                    setC('upsell.upgrades_pacotes', prev.filter((x) => x !== id))
                                  }}
                                >
                                  Remover
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Adicionais por sessão</Label>
                    <div className="space-y-3">
                      {(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]).map((a: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label>Nome</Label>
                              <Input
                                value={a?.nome || ''}
                                onChange={(e) => {
                                  const items = [ ...(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]) ]
                                  items[idx] = { ...(items[idx] || {}), nome: e.target.value }
                                  setC('upsell.adicionais_por_sessao', items)
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Valor (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={a?.valor ?? ''}
                                onChange={(e) => {
                                  const items = [ ...(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]) ]
                                  items[idx] = { ...(items[idx] || {}), valor: e.target.value === '' ? null : Number(e.target.value) }
                                  setC('upsell.adicionais_por_sessao', items)
                                }}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  const items = [ ...(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]) ]
                                  items.splice(idx, 1)
                                  setC('upsell.adicionais_por_sessao', items)
                                }}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-2">
                            <Label>Motivo</Label>
                            <Textarea
                              value={a?.motivo || ''}
                              onChange={(e) => {
                                const items = [ ...(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]) ]
                                items[idx] = { ...(items[idx] || {}), motivo: e.target.value }
                                setC('upsell.adicionais_por_sessao', items)
                              }}
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const items = [ ...(((getC('upsell.adicionais_por_sessao', []) as any[]) || []) as any[]) ]
                          items.push({ nome: '', valor: null, motivo: '' })
                          setC('upsell.adicionais_por_sessao', items)
                        }}
                      >
                        Adicionar adicional
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Retorno e manutenção pós-pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Retorno em quantos dias?</Label>
                    <Input type="number" value={getC('pos.retorno_dias', '')} onChange={(e) => setC('pos.retorno_dias', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sessões de manutenção (qtd)</Label>
                    <Input
                      type="number"
                      value={getC('pos.manutencao_sessoes_qtd', '')}
                      onChange={(e) => setC('pos.manutencao_sessoes_qtd', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Período para reativação (dias)</Label>
                    <Input
                      type="number"
                      value={getC('pos.reativacao_dias', '')}
                      onChange={(e) => setC('pos.reativacao_dias', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mensagens pós-pacote (texto)</Label>
                    <Textarea value={getC('pos.mensagens', '')} onChange={(e) => setC('pos.mensagens', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Oferecer novo pacote?</Label>
                    <Select value={getC('pos.oferecer_novo_pacote', 'sim')} onValueChange={(v) => setC('pos.oferecer_novo_pacote', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Oferecer upgrade maior?</Label>
                    <Select value={getC('pos.oferecer_upgrade', 'nao')} onValueChange={(v) => setC('pos.oferecer_upgrade', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Mídias do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderMidiaUploader({ tipo: 'antes_depois', label: 'Antes/depois', accept: 'image/*', allowWhenCreating: true })}
                  {renderMidiaUploader({ tipo: 'carrossel', label: 'Carrossel comercial', accept: 'image/*', allowWhenCreating: true })}
                  {renderMidiaUploader({ tipo: 'cronograma', label: 'Fotos do cronograma', accept: 'image/*', allowWhenCreating: true })}
                  {renderMidiaUploader({ tipo: 'depoimentos', label: 'Depoimentos (mídia)', accept: 'image/*', allowWhenCreating: true })}
                  {renderMidiaUploader({ tipo: 'videos', label: 'Vídeos do pacote', accept: 'video/*', allowWhenCreating: true })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formState.ativo ? 'ativo' : 'inativo'} onValueChange={(v) => setFormState({ ...formState, ativo: v === 'ativo' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Protocolo/Pacote</DialogTitle>
            <DialogDescription>Atualize as informações</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={formState.nome} onChange={(e) => setFormState({ ...formState, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor total do pacote (opcional)</Label>
                <Input
                  type="number"
                  value={formState.preco ?? ''}
                  onChange={(e) => setFormState({ ...formState, preco: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formState.descricao || ''} onChange={(e) => setFormState({ ...formState, descricao: e.target.value })} rows={3} />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Dados básicos</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select value={getC('basico.categoria', 'misto')} onValueChange={(v) => setC('basico.categoria', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facial">Facial</SelectItem>
                        <SelectItem value="corporal">Corporal</SelectItem>
                        <SelectItem value="capilar">Capilar</SelectItem>
                        <SelectItem value="misto">Misto</SelectItem>
                        <SelectItem value="injetaveis">Injetáveis</SelectItem>
                        <SelectItem value="laser">Laser</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Duração média do programa</Label>
                    <Input value={getC('basico.duracao_programa', '')} onChange={(e) => setC('basico.duracao_programa', e.target.value)} placeholder="Ex: 60 dias" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nível</Label>
                    <Select value={getC('basico.nivel', 'intermediario')} onValueChange={(v) => setC('basico.nivel', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciante">Iniciante</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                        <SelectItem value="intensivo">Intensivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Descrição geral (visão do tratamento)</Label>
                    <Textarea value={getC('basico.descricao_geral', '')} onChange={(e) => setC('basico.descricao_geral', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Estrutura / Cronograma</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Itens do pacote</Label>
                    <div className="space-y-3">
                      {getEstruturaItens().map((it: any, idx: number) => (
                        <div key={idx} className="rounded-lg border p-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Tipo</Label>
                              <Select
                                value={it.tipo || 'manual'}
                                onValueChange={(v) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], tipo: v }
                                  if (v === 'manual') items[idx] = { ...items[idx], procedimento_id: null }
                                  setEstruturaItens(items)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="procedimento">Procedimento incluído</SelectItem>
                                  <SelectItem value="manual">Item manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Ordem recomendada</Label>
                              <Input
                                type="number"
                                value={it.ordem ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], ordem: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                          </div>

                          {it.tipo === 'procedimento' ? (
                            <div className="grid gap-2">
                              <Label>Procedimento incluído</Label>
                              <Select
                                value={it.procedimento_id || 'none'}
                                onValueChange={(v) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], procedimento_id: v === 'none' ? null : v }
                                  setEstruturaItens(items)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nenhum</SelectItem>
                                  {procedimentos.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <Label>Item (texto)</Label>
                              <Input
                                value={it.nome_manual || ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], nome_manual: e.target.value }
                                  setEstruturaItens(items)
                                }}
                                placeholder="Ex: Máscara de ouro"
                              />
                            </div>
                          )}

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Quantidade de sessões</Label>
                              <Input
                                type="number"
                                value={it.sessoes_qtd ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], sessoes_qtd: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Intervalo recomendado</Label>
                              <Input
                                value={it.intervalo_recomendado || ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], intervalo_recomendado: e.target.value }
                                  setEstruturaItens(items)
                                }}
                                placeholder="Ex: 7 dias / 2x por semana"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Duração de cada sessão (min)</Label>
                              <Input
                                type="number"
                                value={it.duracao_sessao_min ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], duracao_sessao_min: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Valor individual (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={it.valor_individual ?? ''}
                                onChange={(e) => {
                                  const items = getEstruturaItens()
                                  items[idx] = { ...items[idx], valor_individual: e.target.value === '' ? null : Number(e.target.value) }
                                  setEstruturaItens(items)
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                const items = getEstruturaItens()
                                items.splice(idx, 1)
                                setEstruturaItens(items)
                              }}
                            >
                              Remover item
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const items = getEstruturaItens()
                          items.push({
                            tipo: 'procedimento',
                            procedimento_id: null,
                            nome_manual: '',
                            sessoes_qtd: null,
                            intervalo_recomendado: '',
                            duracao_sessao_min: null,
                            valor_individual: null,
                            ordem: items.length + 1,
                          })
                          setEstruturaItens(items)
                        }}
                      >
                        Adicionar item
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Valores e condições</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                    <Label>IA pode informar valores?</Label>
                    <Switch checked={Boolean(getC('ia.pode_informar_valores', false))} onCheckedChange={(v) => setC('ia.pode_informar_valores', v)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Pode parcelar?</Label>
                    <Select value={getC('valores.pode_parcelar', 'nao')} onValueChange={(v) => setC('valores.pode_parcelar', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Máx. parcelas</Label>
                    <Input type="number" value={getC('valores.max_parcelas', '')} onChange={(e) => setC('valores.max_parcelas', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
                    <Label>Entrada/sinal obrigatório?</Label>
                    <Select value={getC('valores.entrada_obrigatoria', 'nao')} onValueChange={(v) => setC('valores.entrada_obrigatoria', v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {String(getC('valores.entrada_obrigatoria', 'nao')) === 'sim' ? (
                    <>
                      <div className="grid gap-2">
                        <Label>Valor da entrada</Label>
                        <Input type="number" step="0.01" value={getC('valores.valor_entrada', '')} onChange={(e) => setC('valores.valor_entrada', e.target.value === '' ? null : Number(e.target.value))} />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Condições especiais</Label>
                        <Textarea value={getC('valores.condicoes_especiais', '')} onChange={(e) => setC('valores.condicoes_especiais', e.target.value)} rows={3} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Regras de agendamento do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Agendar avaliação primeiro?</Label>
                    <Select value={getC('agendamento.avaliacao_primeiro', 'sim')} onValueChange={(v) => setC('agendamento.avaliacao_primeiro', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>IA pode agendar sessões diretamente?</Label>
                    <Select value={getC('agendamento.ia_pode_agendar', 'nao')} onValueChange={(v) => setC('agendamento.ia_pode_agendar', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Uma por vez ou várias?</Label>
                    <Select value={getC('agendamento.modo', 'uma_por_vez')} onValueChange={(v) => setC('agendamento.modo', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uma_por_vez">Uma por vez</SelectItem>
                        <SelectItem value="varias">Várias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Prazo máximo para concluir</Label>
                    <Input value={getC('agendamento.prazo_maximo', '')} onChange={(e) => setC('agendamento.prazo_maximo', e.target.value)} placeholder="Ex: 60 dias" />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Regras adicionais (texto)</Label>
                    <Textarea value={getC('agendamento.regras_texto', '')} onChange={(e) => setC('agendamento.regras_texto', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Copy e narrativa</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Resultados prometidos</Label>
                    <ListEditor
                      placeholder="Adicione resultados prometidos"
                      items={normalizeStringList(getC('copy.resultados', []))}
                      onChange={(items) => setC('copy.resultados', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Benefícios emocionais</Label>
                    <ListEditor
                      placeholder="Adicione benefícios emocionais"
                      items={normalizeStringList(getC('copy.beneficios_emocionais', []))}
                      onChange={(items) => setC('copy.beneficios_emocionais', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Problemas que resolve</Label>
                    <ListEditor
                      placeholder="Adicione problemas que resolve"
                      items={normalizeStringList(getC('copy.problemas_resolve', []))}
                      onChange={(items) => setC('copy.problemas_resolve', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Por que é melhor que avulso</Label>
                    <ListEditor
                      placeholder="Adicione razões"
                      items={normalizeStringList(getC('copy.porque_melhor', []))}
                      onChange={(items) => setC('copy.porque_melhor', items)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Objeções específicas do pacote</Label>
                <PairsEditor
                  title="Objeções e respostas"
                  leftLabel="Objeção"
                  rightLabel="Resposta ideal"
                  addLabel="Adicionar objeção"
                  items={(() => {
                    const items = getC('objecoes.itens', [])
                    if (Array.isArray(items) && items.length > 0) {
                      return items.map((it: any) => ({
                        left: typeof it?.left === 'string' ? it.left : typeof it?.objecao === 'string' ? it.objecao : '',
                        right: typeof it?.right === 'string' ? it.right : typeof it?.resposta === 'string' ? it.resposta : '',
                      })) as PairItem[]
                    }
                    return buildPairsFromTwoLists(getC('objecoes.lista', []), getC('objecoes.respostas', []))
                  })()}
                  onChange={(items) => setC('objecoes.itens', items)}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Upsell dentro do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <ListEditor
                      label="Complementos sugeridos"
                      placeholder="Adicione complementos"
                      items={normalizeStringList(getC('upsell.complementos', []))}
                      onChange={(items) => setC('upsell.complementos', items)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Quando sugerir</Label>
                    <Select value={getC('upsell.quando', 'no_fechamento')} onValueChange={(v) => setC('upsell.quando', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_fechamento">No fechamento</SelectItem>
                        <SelectItem value="primeira_sessao">Na 1ª sessão</SelectItem>
                        <SelectItem value="metade">Metade do pacote</SelectItem>
                        <SelectItem value="ultima">Última sessão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Argumento comercial</Label>
                    <Textarea value={getC('upsell.argumento', '')} onChange={(e) => setC('upsell.argumento', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Mídias de reforço</Label>
                    <div className="space-y-3">
                      {(normalizeMidiasReforco(getC('upsell.midias_reforco', [])) as any[]).map((m, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-border/60 bg-background p-3"
                          draggable
                          onDragStart={() => {
                            ;(window as any).__midias_reforco_drag_index__ = idx
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                          }}
                          onDrop={() => {
                            const from = (window as any).__midias_reforco_drag_index__
                            ;(window as any).__midias_reforco_drag_index__ = null
                            if (typeof from !== 'number') return
                            const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                            setC('upsell.midias_reforco', reorder(current, from, idx))
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                              <span>Arraste para reordenar</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                current.splice(idx, 1)
                                setC('upsell.midias_reforco', current)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Tipo</Label>
                              <Select
                                value={m.tipo || 'imagem'}
                                onValueChange={(v) => {
                                  const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                  current[idx] = { ...current[idx], tipo: v }
                                  setC('upsell.midias_reforco', current)
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="imagem">Imagem</SelectItem>
                                  <SelectItem value="video">Vídeo</SelectItem>
                                  <SelectItem value="link">Link</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>URL</Label>
                              <Input
                                value={m.url || ''}
                                onChange={(e) => {
                                  const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                  current[idx] = { ...current[idx], url: e.target.value }
                                  setC('upsell.midias_reforco', current)
                                }}
                                placeholder="https://..."
                              />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                              <Label>Título (opcional)</Label>
                              <Input
                                value={m.titulo || ''}
                                onChange={(e) => {
                                  const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                  current[idx] = { ...current[idx], titulo: e.target.value }
                                  setC('upsell.midias_reforco', current)
                                }}
                              />
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                              <Label>Descrição (opcional)</Label>
                              <Textarea
                                value={m.descricao || ''}
                                onChange={(e) => {
                                  const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                                  current[idx] = { ...current[idx], descricao: e.target.value }
                                  setC('upsell.midias_reforco', current)
                                }}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const current = normalizeMidiasReforco(getC('upsell.midias_reforco', []))
                          current.push({ tipo: 'imagem', url: '', titulo: '', descricao: '' })
                          setC('upsell.midias_reforco', current)
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar mídia
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Retorno e manutenção pós-pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Retorno em quantos dias?</Label>
                    <Input type="number" value={getC('pos.retorno_dias', '')} onChange={(e) => setC('pos.retorno_dias', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mensagens pós-pacote (texto)</Label>
                    <Textarea value={getC('pos.mensagens', '')} onChange={(e) => setC('pos.mensagens', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Oferecer novo pacote?</Label>
                    <Select value={getC('pos.oferecer_novo_pacote', 'sim')} onValueChange={(v) => setC('pos.oferecer_novo_pacote', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Oferecer upgrade maior?</Label>
                    <Select value={getC('pos.oferecer_upgrade', 'nao')} onValueChange={(v) => setC('pos.oferecer_upgrade', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-3">
                <Label className="text-base font-semibold">Mídias do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderMidiaUploader({ tipo: 'antes_depois', label: 'Antes/depois', accept: 'image/*', allowWhenCreating: false })}
                  {renderMidiaUploader({ tipo: 'carrossel', label: 'Carrossel comercial', accept: 'image/*', allowWhenCreating: false })}
                  {renderMidiaUploader({ tipo: 'cronograma', label: 'Fotos do cronograma', accept: 'image/*', allowWhenCreating: false })}
                  {renderMidiaUploader({ tipo: 'depoimentos', label: 'Depoimentos (mídia)', accept: 'image/*', allowWhenCreating: false })}
                  {renderMidiaUploader({ tipo: 'videos', label: 'Vídeos do pacote', accept: 'video/*', allowWhenCreating: false })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formState.ativo ? 'ativo' : 'inativo'} onValueChange={(v) => setFormState({ ...formState, ativo: v === 'ativo' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este item?</DialogDescription>
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
