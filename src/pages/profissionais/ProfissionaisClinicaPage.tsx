import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ListEditor } from '@/components/ui/list-editor'
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
import { FileUploadButton } from '@/components/ui/file-upload-button'
import { deleteMidia, getSignedMidiaUrl, uploadMidia } from '@/services/api/storage-midias'
import {
  useCreateProfissionalMidia,
  useDeleteProfissionalMidia,
  useProfissionalMidias,
} from '@/hooks/useProfissionalMidias'
import {
  useProfissionaisClinica,
  useCreateProfissionalClinica,
  useUpdateProfissionalClinica,
  useDeleteProfissionalClinica,
} from '@/hooks/useProfissionaisClinica'
import { useProcedimentos } from '@/hooks/useProcedimentos'
import type {
  ProfissionalClinica,
  ProfissionalCreateData,
  StatusProfissional,
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
  const [procedimentosSearch, setProcedimentosSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalClinica | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [pendingCreateFotos, setPendingCreateFotos] = useState<File[]>([])
  const [fotoPreviewUrlById, setFotoPreviewUrlById] = useState<Record<string, string>>({})

  const [formState, setFormState] = useState<ProfissionalCreateData>({
    nome: '',
    cargo: '',
    documento: '',
    email: '',
    telefone: '',
    whatsapp: '',
    conselho: '',
    registro_profissional: '',
    especialidades: [],
    experiencia: '',
    certificacoes: '',
    procedimentos: '',
    procedimentos_ids: [],
    bio: '',
    foto_url: '',
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
  const { data: procedimentos = [] } = useProcedimentos({ limit: 1000 } as any)

  const createMutation = useCreateProfissionalClinica()
  const updateMutation = useUpdateProfissionalClinica()
  const deleteMutation = useDeleteProfissionalClinica()

  const { data: profissionalMidias = [], isLoading: isLoadingMidias } = useProfissionalMidias(
    isEditModalOpen ? selectedProfissional?.id ?? undefined : undefined,
  )
  const createProfissionalMidia = useCreateProfissionalMidia()
  const deleteProfissionalMidia = useDeleteProfissionalMidia()

  const stats = useMemo(() => {
    return {
      total: profissionais.length,
      ativos: profissionais.filter((p) => p.status === 'ativo').length,
      inativos: profissionais.filter((p) => p.status === 'inativo').length,
    }
  }, [profissionais])

  useEffect(() => {
    let cancelled = false
    async function hydrateUrls() {
      if (!profissionalMidias || profissionalMidias.length === 0) return
      const missing = profissionalMidias.filter((m) => !fotoPreviewUrlById[m.id])
      if (missing.length === 0) return

      const entries = await Promise.all(
        missing.map(async (m) => {
          try {
            const url = await getSignedMidiaUrl({ bucket: 'profissionais-midias', path: m.storage_path, expiresIn: 60 * 60 })
            return [m.id, url] as const
          } catch {
            return [m.id, ''] as const
          }
        }),
      )

      if (cancelled) return
      setFotoPreviewUrlById((prev) => {
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
  }, [profissionalMidias, fotoPreviewUrlById])

  const handleUploadMidiasForProfissional = async (profissionalId: string, files: File[]) => {
    if (!files.length) return
    setUploadingFoto(true)
    try {
      for (const file of files) {
        const uploaded = await uploadMidia({
          bucket: 'profissionais-midias',
          file,
          prefix: `profissionais/${profissionalId}/foto`,
        })

        await createProfissionalMidia.mutateAsync({
          profissional_id: profissionalId,
          tipo: 'foto',
          storage_bucket: 'profissionais-midias',
          storage_path: uploaded.path,
          label: file.name,
        })
      }
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleRemoveMidia = async (midia: any) => {
    if (!selectedProfissional) return
    setUploadingFoto(true)
    try {
      try {
        await deleteMidia({ bucket: 'profissionais-midias', path: midia.storage_path })
      } catch {
        // ignore
      }

      await deleteProfissionalMidia.mutateAsync({ id: midia.id, profissionalId: selectedProfissional.id })
      setFotoPreviewUrlById((prev) => {
        const copy = { ...prev }
        delete copy[midia.id]
        return copy
      })
    } finally {
      setUploadingFoto(false)
    }
  }

  const handleCreateProfissional = async () => {
    if (!formState.nome) {
      toast.error('Preencha o nome do profissional')
      return
    }

    try {
      const created = await createMutation.mutateAsync({ ...formState, foto_url: null })
      if (pendingCreateFotos.length > 0) {
        await handleUploadMidiasForProfissional(created.id, pendingCreateFotos)
      }
      setIsCreateModalOpen(false)
      setFormState({
        nome: '',
        cargo: '',
        documento: '',
        email: '',
        telefone: '',
        whatsapp: '',
        conselho: '',
        registro_profissional: '',
        especialidades: [],
        experiencia: '',
        certificacoes: '',
        procedimentos: '',
        procedimentos_ids: [],
        bio: '',
        foto_url: '',
        percentual_comissao: undefined,
        meta_mensal: undefined,
        status: 'ativo',
      })
      setPendingCreateFotos([])
    } catch (error) {
      console.error('Erro ao criar profissional:', error)
    }
  }

  const handleOpenEdit = (profissional: ProfissionalClinica) => {
    setSelectedProfissional(profissional)
    setFormState({
      nome: profissional.nome,
      cargo: profissional.cargo || '',
      documento: profissional.documento || '',
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      whatsapp: profissional.whatsapp || '',
      conselho: profissional.conselho || '',
      registro_profissional: profissional.registro_profissional || '',
      especialidades: profissional.especialidades || [],
      experiencia: profissional.experiencia || '',
      certificacoes: profissional.certificacoes || '',
      procedimentos: profissional.procedimentos || '',
      procedimentos_ids: (profissional as any).procedimentos_ids || [],
      bio: (profissional as any).bio || '',
      foto_url: profissional.foto_url || '',
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
        data: { ...formState, foto_url: selectedProfissional.foto_url ?? null },
      })
      setIsEditModalOpen(false)
      setSelectedProfissional(null)
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error)
    }
  }

  const procedimentosFiltered = useMemo(() => {
    const term = procedimentosSearch.trim().toLowerCase()
    if (!term) return procedimentos
    return procedimentos.filter((p: any) => String(p.nome || '').toLowerCase().includes(term))
  }, [procedimentos, procedimentosSearch])

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

  const toggleProcedimento = (id: string) => {
    const current = Array.isArray(formState.procedimentos_ids) ? formState.procedimentos_ids : []
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setFormState({ ...formState, procedimentos_ids: next })
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
        <Button
          onClick={() => {
            setIsCreateModalOpen(true)
            setPendingCreateFotos([])
          }}
        >
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
            <DialogDescription>Cadastre um novo profissional na clínica</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={handleCreateProfissional} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Profissional'}
            </Button>
          </div>

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
                <Label htmlFor="create-cargo">Cargo</Label>
                <Input
                  id="create-cargo"
                  value={formState.cargo || ''}
                  onChange={(e) => setFormState({ ...formState, cargo: e.target.value })}
                  placeholder="Ex: Biomédico, Esteticista, Fisioterapeuta"
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
                <Label>Foto</Label>
                <FileUploadButton
                  label="Enviar fotos"
                  accept="image/*"
                  multiple
                  disabled={uploadingFoto}
                  onFiles={(files) => setPendingCreateFotos(files)}
                />
                {pendingCreateFotos.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {pendingCreateFotos.map((f) => {
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
                              onClick={() => setPendingCreateFotos((prev) => prev.filter((x) => x !== f))}
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
                <Label htmlFor="create-whatsapp">WhatsApp</Label>
                <Input
                  id="create-whatsapp"
                  value={formState.whatsapp || ''}
                  onChange={(e) => setFormState({ ...formState, whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-especialidades">Especialidades (uma por linha)</Label>
                <ListEditor
                  placeholder="Adicione especialidades"
                  items={normalizeStringList((formState as any).especialidades)}
                  onChange={(items: string[]) => setFormState({ ...formState, especialidades: items as any })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-experiencia">Experiência</Label>
                <Textarea
                  id="create-experiencia"
                  value={formState.experiencia || ''}
                  onChange={(e) => setFormState({ ...formState, experiencia: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-certificacoes">Certificações</Label>
                <Textarea
                  id="create-certificacoes"
                  value={formState.certificacoes || ''}
                  onChange={(e) => setFormState({ ...formState, certificacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Procedimentos que realiza</Label>
                <Input
                  placeholder="Buscar procedimento..."
                  value={procedimentosSearch}
                  onChange={(e) => setProcedimentosSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-auto rounded-md border border-border/60 bg-background p-2">
                  {procedimentosFiltered.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum procedimento encontrado</div>
                  ) : (
                    <div className="space-y-2">
                      {procedimentosFiltered.map((p: any) => {
                        const checked = (formState.procedimentos_ids || []).includes(p.id)
                        return (
                          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
                              onChange={() => toggleProcedimento(p.id)}
                            />
                            <span className="text-sm">{p.nome}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                {formState.procedimentos_ids && formState.procedimentos_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {formState.procedimentos_ids
                      .map((id) => (procedimentos as any[]).find((p) => p.id === id))
                      .filter(Boolean)
                      .map((p: any) => (
                        <Badge key={p.id} variant="secondary">
                          {p.nome}
                        </Badge>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-bio">Bio</Label>
              <Textarea
                id="create-bio"
                value={formState.bio || ''}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                rows={4}
              />
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

          <div className="flex justify-end">
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>

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
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Input
                  id="edit-cargo"
                  value={formState.cargo || ''}
                  onChange={(e) => setFormState({ ...formState, cargo: e.target.value })}
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
                <Label>Foto</Label>
                <FileUploadButton
                  label="Enviar fotos"
                  accept="image/*"
                  multiple
                  disabled={uploadingFoto || !selectedProfissional}
                  onFiles={(files) => {
                    if (selectedProfissional) {
                      void handleUploadMidiasForProfissional(selectedProfissional.id, files)
                    }
                  }}
                />
                {isLoadingMidias ? (
                  <div className="text-sm text-muted-foreground">Carregando fotos...</div>
                ) : profissionalMidias.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {profissionalMidias.map((m) => (
                      <div key={m.id} className="overflow-hidden rounded-md border border-border/60">
                        {fotoPreviewUrlById[m.id] ? (
                          <img src={fotoPreviewUrlById[m.id]} alt={m.label || 'Foto'} className="h-24 w-full object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                        )}
                        <div className="flex items-center justify-between gap-2 p-2">
                          <div className="min-w-0 text-xs text-muted-foreground truncate">{m.label || m.storage_path}</div>
                          <Button type="button" variant="outline" size="sm" disabled={uploadingFoto} onClick={() => void handleRemoveMidia(m)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma foto cadastrada.</div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  value={formState.whatsapp || ''}
                  onChange={(e) => setFormState({ ...formState, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-especialidades">Especialidades (uma por linha)</Label>
                <ListEditor
                  placeholder="Adicione especialidades"
                  items={normalizeStringList((formState as any).especialidades)}
                  onChange={(items: string[]) => setFormState({ ...formState, especialidades: items as any })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-experiencia">Experiência</Label>
                <Textarea
                  id="edit-experiencia"
                  value={formState.experiencia || ''}
                  onChange={(e) => setFormState({ ...formState, experiencia: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-certificacoes">Certificações</Label>
                <Textarea
                  id="edit-certificacoes"
                  value={formState.certificacoes || ''}
                  onChange={(e) => setFormState({ ...formState, certificacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Procedimentos que realiza</Label>
                <Input
                  placeholder="Buscar procedimento..."
                  value={procedimentosSearch}
                  onChange={(e) => setProcedimentosSearch(e.target.value)}
                />
                <div className="max-h-40 overflow-auto rounded-md border border-border/60 bg-background p-2">
                  {procedimentosFiltered.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Nenhum procedimento encontrado</div>
                  ) : (
                    <div className="space-y-2">
                      {procedimentosFiltered.map((p: any) => {
                        const checked = (formState.procedimentos_ids || []).includes(p.id)
                        return (
                          <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={checked}
                              onChange={() => toggleProcedimento(p.id)}
                            />
                            <span className="text-sm">{p.nome}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                {formState.procedimentos_ids && formState.procedimentos_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {formState.procedimentos_ids
                      .map((id) => (procedimentos as any[]).find((p) => p.id === id))
                      .filter(Boolean)
                      .map((p: any) => (
                        <Badge key={p.id} variant="secondary">
                          {p.nome}
                        </Badge>
                      ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={formState.bio || ''}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                rows={4}
              />
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
