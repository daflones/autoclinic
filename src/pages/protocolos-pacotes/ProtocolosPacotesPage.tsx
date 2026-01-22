import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Plus, Search, Package, Edit, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateProtocoloPacote,
  useDeleteProtocoloPacote,
  useProtocolosPacotes,
  useUpdateProtocoloPacote,
  useUpdateProtocoloPacoteStatus,
} from '@/hooks/useProtocolosPacotes'
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

  const [formState, setFormState] = useState<ProtocoloPacoteCreateData>({
    nome: '',
    descricao: '',
    preco: null,
    itens: '',
    imagem_path: '',
    conteudo: {},
    ativo: true,
  })

  const conteudo = (formState.conteudo || {}) as Record<string, any>

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
      return { ...prev, conteudo: base }
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
  const [pendingCreateImagens, setPendingCreateImagens] = useState<File[]>([])
  const [imagemPreviewUrlById, setImagemPreviewUrlById] = useState<Record<string, string>>({})

  const filters = useMemo(
    () => ({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    [searchTerm, statusFilter]
  )

  const { data: itens, isLoading } = useProtocolosPacotes(filters)

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

  const handleUploadMidiasForProtocolo = async (protocoloId: string, files: File[]) => {
    if (!files.length) return
    setUploadingImagem(true)
    try {
      for (const file of files) {
        const uploaded = await uploadMidia({ bucket: 'pacotes-midias', file, prefix: `protocolos/${protocoloId}/imagem` })
        await createProtocoloMidia.mutateAsync({
          protocolo_pacote_id: protocoloId,
          tipo: 'imagem',
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
    setPendingCreateImagens([])
    setFormState({
      nome: '',
      descricao: '',
      preco: null,
      itens: '',
      imagem_path: '',
      conteudo: {},
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
      conteudo: (item as any).conteudo || {},
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
      const created = await createMutation.mutateAsync({ ...formState, imagem_path: null })
      if (pendingCreateImagens.length > 0) {
        await handleUploadMidiasForProtocolo(created.id, pendingCreateImagens)
      }
      setIsCreateModalOpen(false)
      setPendingCreateImagens([])
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
      await updateMutation.mutateAsync({ id: selectedItem.id, data: formState })
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
      setPendingCreateImagens([])
      setUploadingImagem(false)
    }
  }, [isCreateModalOpen, isEditModalOpen])

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
                <div key={item.id} className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                        <div className="text-xs text-muted-foreground">Preço: R$ {item.preco.toFixed(2)}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Button variant="outline" onClick={() => handleToggleAtivo(item)} disabled={statusMutation.isPending}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="outline" onClick={() => openEdit(item)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="destructive" onClick={() => requestDelete(item)}>
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

      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label>Preço (opcional)</Label>
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

            <div className="space-y-2">
              <Label>Itens (um por linha)</Label>
              <Textarea value={formState.itens || ''} onChange={(e) => setFormState({ ...formState, itens: e.target.value })} rows={4} />
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="text-sm font-semibold">Estrutura completa do Pacote (IA/CRM)</div>

              <div className="space-y-3">
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
                  <div className="grid gap-2">
                    <Label>Itens do pacote (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(getC('estrutura.itens', []), null, 2)}
                      onChange={(e) => {
                        try {
                          setC('estrutura.itens', JSON.parse(e.target.value || '[]'))
                        } catch {
                          // ignore
                        }
                      }}
                      rows={8}
                      placeholder='Ex: [{"procedimento":"Limpeza de pele","qtd":1,"intervalo":"7 dias","ordem":1}]'
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cronograma recomendado (texto)</Label>
                    <Textarea value={getC('estrutura.cronograma_texto', '')} onChange={(e) => setC('estrutura.cronograma_texto', e.target.value)} rows={8} placeholder="Descreva a ordem e intervalos..." />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Valores e condições</Label>
                <div className="grid gap-4 md:grid-cols-2">
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
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor da entrada</Label>
                    <Input type="number" step="0.01" value={getC('valores.valor_entrada', '')} onChange={(e) => setC('valores.valor_entrada', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Condições especiais</Label>
                    <Textarea value={getC('valores.condicoes_especiais', '')} onChange={(e) => setC('valores.condicoes_especiais', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
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

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Copy e narrativa</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Resultados prometidos</Label>
                    <Textarea value={getC('copy.resultados', '')} onChange={(e) => setC('copy.resultados', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Benefícios emocionais</Label>
                    <Textarea value={getC('copy.beneficios_emocionais', '')} onChange={(e) => setC('copy.beneficios_emocionais', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Problemas que resolve</Label>
                    <Textarea value={getC('copy.problemas_resolve', '')} onChange={(e) => setC('copy.problemas_resolve', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Por que é melhor que avulso</Label>
                    <Textarea value={getC('copy.porque_melhor', '')} onChange={(e) => setC('copy.porque_melhor', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Objeções específicas do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Objeções (um por linha)</Label>
                    <Textarea value={(getC('objecoes.lista', []) as any[]).join('\n')} onChange={(e) => setC('objecoes.lista', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Respostas ideais (um por linha)</Label>
                    <Textarea value={(getC('objecoes.respostas', []) as any[]).join('\n')} onChange={(e) => setC('objecoes.respostas', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Upsell dentro do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Complementos sugeridos (um por linha)</Label>
                    <Textarea value={(getC('upsell.complementos', []) as any[]).join('\n')} onChange={(e) => setC('upsell.complementos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
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
                  <div className="grid gap-2">
                    <Label>Mídias de reforço (JSON)</Label>
                    <Textarea value={JSON.stringify(getC('upsell.midias', {}), null, 2)} onChange={(e) => {
                      try {
                        setC('upsell.midias', JSON.parse(e.target.value || '{}'))
                      } catch {
                        // ignore
                      }
                    }} rows={6} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
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

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Mídias do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Antes/depois (paths) — um por linha</Label>
                    <Textarea value={(getC('midias.antes_depois', []) as any[]).join('\n')} onChange={(e) => setC('midias.antes_depois', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Carrossel comercial (paths/urls) — um por linha</Label>
                    <Textarea value={(getC('midias.carrossel', []) as any[]).join('\n')} onChange={(e) => setC('midias.carrossel', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vídeos (urls) — um por linha</Label>
                    <Textarea value={(getC('midias.videos', []) as any[]).join('\n')} onChange={(e) => setC('midias.videos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Depoimentos específicos (urls/paths) — um por linha</Label>
                    <Textarea value={(getC('midias.depoimentos', []) as any[]).join('\n')} onChange={(e) => setC('midias.depoimentos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImagem}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  setPendingCreateImagens((prev) => [...prev, ...files])
                  e.currentTarget.value = ''
                }}
              />
              {pendingCreateImagens.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {pendingCreateImagens.map((f) => {
                    const url = URL.createObjectURL(f)
                    return (
                      <div key={f.name + f.size} className="overflow-hidden rounded-md border border-border/60">
                        <img src={url} alt={f.name} className="h-24 w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 p-2">
                          <div className="min-w-0 text-xs text-muted-foreground truncate">{f.name}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingCreateImagens((prev) => prev.filter((x) => x !== f))}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label>Preço (opcional)</Label>
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

            <div className="space-y-2">
              <Label>Itens (um por linha)</Label>
              <Textarea value={formState.itens || ''} onChange={(e) => setFormState({ ...formState, itens: e.target.value })} rows={4} />
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="text-sm font-semibold">Estrutura completa do Pacote (IA/CRM)</div>

              <div className="space-y-3">
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
                  <div className="grid gap-2">
                    <Label>Itens do pacote (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(getC('estrutura.itens', []), null, 2)}
                      onChange={(e) => {
                        try {
                          setC('estrutura.itens', JSON.parse(e.target.value || '[]'))
                        } catch {
                          // ignore
                        }
                      }}
                      rows={8}
                      placeholder='Ex: [{"procedimento":"Limpeza de pele","qtd":1,"intervalo":"7 dias","ordem":1}]'
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Cronograma recomendado (texto)</Label>
                    <Textarea value={getC('estrutura.cronograma_texto', '')} onChange={(e) => setC('estrutura.cronograma_texto', e.target.value)} rows={8} placeholder="Descreva a ordem e intervalos..." />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Valores e condições</Label>
                <div className="grid gap-4 md:grid-cols-2">
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
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor da entrada</Label>
                    <Input type="number" step="0.01" value={getC('valores.valor_entrada', '')} onChange={(e) => setC('valores.valor_entrada', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Condições especiais</Label>
                    <Textarea value={getC('valores.condicoes_especiais', '')} onChange={(e) => setC('valores.condicoes_especiais', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
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

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Copy e narrativa</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Resultados prometidos</Label>
                    <Textarea value={getC('copy.resultados', '')} onChange={(e) => setC('copy.resultados', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Benefícios emocionais</Label>
                    <Textarea value={getC('copy.beneficios_emocionais', '')} onChange={(e) => setC('copy.beneficios_emocionais', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Problemas que resolve</Label>
                    <Textarea value={getC('copy.problemas_resolve', '')} onChange={(e) => setC('copy.problemas_resolve', e.target.value)} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Por que é melhor que avulso</Label>
                    <Textarea value={getC('copy.porque_melhor', '')} onChange={(e) => setC('copy.porque_melhor', e.target.value)} rows={3} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Objeções específicas do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Objeções (um por linha)</Label>
                    <Textarea value={(getC('objecoes.lista', []) as any[]).join('\n')} onChange={(e) => setC('objecoes.lista', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Respostas ideais (um por linha)</Label>
                    <Textarea value={(getC('objecoes.respostas', []) as any[]).join('\n')} onChange={(e) => setC('objecoes.respostas', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Upsell dentro do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Complementos sugeridos (um por linha)</Label>
                    <Textarea value={(getC('upsell.complementos', []) as any[]).join('\n')} onChange={(e) => setC('upsell.complementos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
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
                  <div className="grid gap-2">
                    <Label>Mídias de reforço (JSON)</Label>
                    <Textarea value={JSON.stringify(getC('upsell.midias', {}), null, 2)} onChange={(e) => {
                      try {
                        setC('upsell.midias', JSON.parse(e.target.value || '{}'))
                      } catch {
                        // ignore
                      }
                    }} rows={6} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
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

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Mídias do pacote</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Antes/depois (paths) — um por linha</Label>
                    <Textarea value={(getC('midias.antes_depois', []) as any[]).join('\n')} onChange={(e) => setC('midias.antes_depois', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Carrossel comercial (paths/urls) — um por linha</Label>
                    <Textarea value={(getC('midias.carrossel', []) as any[]).join('\n')} onChange={(e) => setC('midias.carrossel', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={4} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vídeos (urls) — um por linha</Label>
                    <Textarea value={(getC('midias.videos', []) as any[]).join('\n')} onChange={(e) => setC('midias.videos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Depoimentos específicos (urls/paths) — um por linha</Label>
                    <Textarea value={(getC('midias.depoimentos', []) as any[]).join('\n')} onChange={(e) => setC('midias.depoimentos', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} rows={3} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingImagem || !selectedItem}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.currentTarget.value = ''
                  if (!selectedItem || files.length === 0) return
                  void handleUploadMidiasForProtocolo(selectedItem.id, files)
                }}
              />
              {isLoadingMidias ? (
                <div className="text-sm text-muted-foreground">Carregando imagens...</div>
              ) : protocoloMidias.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {protocoloMidias.map((m) => (
                    <div key={m.id} className="overflow-hidden rounded-md border border-border/60">
                      {imagemPreviewUrlById[m.id] ? (
                        <img src={imagemPreviewUrlById[m.id]} alt={m.label || 'Imagem'} className="h-24 w-full object-cover" />
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
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma imagem cadastrada.</div>
              )}
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
