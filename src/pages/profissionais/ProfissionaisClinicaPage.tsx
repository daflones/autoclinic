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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalClinica | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [pendingCreateFotos, setPendingCreateFotos] = useState<File[]>([])
  const [fotoPreviewUrlById, setFotoPreviewUrlById] = useState<Record<string, string>>({})

  const [formState, setFormState] = useState<ProfissionalCreateData>({
    nome: '',
    cargo: '',
    senha: '',
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
    if (!formState.cargo) {
      toast.error('Selecione o cargo do profissional')
      return
    }
    if (!formState.email) {
      toast.error('Preencha o e-mail do profissional')
      return
    }
    if (!formState.senha || (formState.senha as string).length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
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
        senha: '',
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

  const handleOpenDetails = (profissional: ProfissionalClinica) => {
    setSelectedProfissional(profissional)
    setIsDetailsModalOpen(true)
  }

  const handleOpenEdit = (profissional: ProfissionalClinica) => {
    setSelectedProfissional(profissional)
    setFormState({
      nome: profissional.nome,
      cargo: profissional.cargo || '',
      senha: '',
      email: profissional.email || '',
      telefone: profissional.telefone || '',
      conselho: profissional.conselho || '',
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
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profissionais da Clínica</h1>
          <p className="text-sm text-muted-foreground">Gerencie a equipe clínica e suas especialidades</p>
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
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <UserSquare className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Profissionais cadastrados</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ativos</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.ativos}</h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Em atividade</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-rose-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inativos</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{stats.inativos}</h3>
            </div>
            <div className="rounded-full bg-rose-500/10 p-2 text-rose-500">
              <UserSquare className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Temporariamente indisponíveis</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Profissionais ({profissionais.length})</h2>
          <span className="text-sm text-muted-foreground">Exibindo {profissionais.length} registros</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nome, email ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : profissionais.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum profissional encontrado
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left font-medium">Profissional</th>
                  <th scope="col" className="px-5 py-3 text-left font-medium">Contato</th>
                  <th scope="col" className="px-5 py-3 text-left font-medium">Especialidades</th>
                  <th scope="col" className="px-5 py-3 text-left font-medium">Status</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-background/40">
                {profissionais.map((profissional) => {
                  const statusConfig = STATUS_CONFIG[profissional.status]
                  return (
                    <tr key={profissional.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleOpenDetails(profissional)}>
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-foreground">{profissional.nome}</div>
                        {profissional.conselho && (
                          <p className="text-xs text-muted-foreground">{profissional.conselho}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top text-muted-foreground">
                        <div className="flex flex-col gap-1 text-xs">
                          {profissional.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{profissional.email}</span>}
                          {profissional.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{profissional.telefone}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        {profissional.especialidades && profissional.especialidades.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {profissional.especialidades.map((esp) => (
                              <span key={esp} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">{esp}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          profissional.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : profissional.status === 'inativo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                        }`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <Button variant="ghost" size="icon" className="text-primary hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); handleOpenEdit(profissional) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={(e) => { e.stopPropagation(); handleRequestDelete(profissional) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

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
                <Label htmlFor="create-cargo">Cargo / Função *</Label>
                <Select
                  value={formState.cargo || ''}
                  onValueChange={(v) => setFormState({ ...formState, cargo: v })}
                >
                  <SelectTrigger id="create-cargo">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="create-email">E-mail *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-senha">Senha de Acesso *</Label>
                <Input
                  id="create-senha"
                  type="password"
                  value={formState.senha || ''}
                  onChange={(e) => setFormState({ ...formState, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-telefone">Telefone</Label>
                <Input
                  id="create-telefone"
                  value={formState.telefone || ''}
                  onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

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
                <Label htmlFor="edit-cargo">Cargo / Função *</Label>
                <Select
                  value={formState.cargo || ''}
                  onValueChange={(v) => setFormState({ ...formState, cargo: v })}
                >
                  <SelectTrigger id="edit-cargo">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="recepcao">Recepção</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Profissional</DialogTitle>
            <DialogDescription>Informações completas sobre o profissional</DialogDescription>
          </DialogHeader>

          {selectedProfissional && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Nome:</strong> {selectedProfissional.nome}</div>
                    <div><strong>Cargo:</strong> {selectedProfissional.cargo || 'Não informado'}</div>
                    <div><strong>Status:</strong> 
                      <span className={`ml-2 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        selectedProfissional.status === 'ativo' ? 'bg-emerald-100 text-emerald-700'
                        : selectedProfissional.status === 'inativo' ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                      }`}>
                        {STATUS_CONFIG[selectedProfissional.status]?.label || selectedProfissional.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Contato</h4>
                  <div className="space-y-2 text-sm">
                    {selectedProfissional.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProfissional.email}</span>
                      </div>
                    )}
                    {selectedProfissional.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProfissional.telefone}</span>
                      </div>
                    )}
                    {selectedProfissional.whatsapp && (
                      <div><strong>WhatsApp:</strong> {selectedProfissional.whatsapp}</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedProfissional.especialidades && selectedProfissional.especialidades.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Especialidades</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfissional.especialidades.map((esp) => (
                      <span key={esp} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProfissional.conselho && (
                <div>
                  <h4 className="font-semibold mb-2">Informações Profissionais</h4>
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <strong>Conselho:</strong> {selectedProfissional.conselho}
                  </div>
                </div>
              )}

              {(selectedProfissional as any).bio && (
                <div>
                  <h4 className="font-semibold mb-2">Biografia</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {(selectedProfissional as any).bio}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsDetailsModalOpen(false)
              if (selectedProfissional) handleOpenEdit(selectedProfissional)
            }}>
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
