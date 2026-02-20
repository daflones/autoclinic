import { useEffect, useMemo, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Search, UserSquare, Edit, Trash2, Mail, Phone, Award, Clock, Stethoscope, Calendar } from 'lucide-react'
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

const defaultHorariosProfissional: Record<string, any> = {
  segunda: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  terca: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  quarta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  quinta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  sexta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  sabado: { ativo: false, periodos: [{ inicio: '08:00', fim: '12:00' }] },
  domingo: { ativo: false, periodos: [{ inicio: '08:00', fim: '12:00' }] },
}

const DIAS_SEMANA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const
const DIAS_LABEL: Record<string, string> = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado', domingo: 'Domingo' }

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
    horarios_disponiveis: defaultHorariosProfissional,
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
        horarios_disponiveis: defaultHorariosProfissional,
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
      horarios_disponiveis: profissional.horarios_disponiveis || defaultHorariosProfissional,
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

  const updateHorario = (dia: string, update: Record<string, any>) => {
    const horarios = { ...(formState.horarios_disponiveis || defaultHorariosProfissional) }
    horarios[dia] = { ...(horarios[dia] || defaultHorariosProfissional[dia]), ...update }
    setFormState({ ...formState, horarios_disponiveis: horarios })
  }

  const updateHorarioPeriodo = (dia: string, idx: number, field: string, value: string) => {
    const horarios = { ...(formState.horarios_disponiveis || defaultHorariosProfissional) }
    const config = horarios[dia] || defaultHorariosProfissional[dia]
    const periodos = Array.isArray(config.periodos) ? [...config.periodos] : [{ inicio: '08:00', fim: '18:00' }]
    periodos[idx] = { ...periodos[idx], [field]: value }
    horarios[dia] = { ...config, periodos }
    setFormState({ ...formState, horarios_disponiveis: horarios })
  }

  const addHorarioPeriodo = (dia: string) => {
    const horarios = { ...(formState.horarios_disponiveis || defaultHorariosProfissional) }
    const config = horarios[dia] || defaultHorariosProfissional[dia]
    const periodos = Array.isArray(config.periodos) ? [...config.periodos] : []
    periodos.push({ inicio: '13:00', fim: '18:00' })
    horarios[dia] = { ...config, periodos }
    setFormState({ ...formState, horarios_disponiveis: horarios })
  }

  const removeHorarioPeriodo = (dia: string, idx: number) => {
    const horarios = { ...(formState.horarios_disponiveis || defaultHorariosProfissional) }
    const config = horarios[dia] || defaultHorariosProfissional[dia]
    const periodos = (Array.isArray(config.periodos) ? [...config.periodos] : []).filter((_: any, i: number) => i !== idx)
    horarios[dia] = { ...config, periodos }
    setFormState({ ...formState, horarios_disponiveis: horarios })
  }

  const renderHorariosSelector = () => {
    const horarios = formState.horarios_disponiveis || defaultHorariosProfissional
    return (
      <div className="space-y-3 pt-4 border-t">
<Label className="text-sm"><Clock className="h-4 w-4" /> Horários Disponíveis</Label>
        <p className="text-xs text-muted-foreground">Configure os horários de atendimento deste profissional</p>
        {DIAS_SEMANA.map((dia) => {
          const config = (horarios as any)[dia] || defaultHorariosProfissional[dia]
          const periodos = Array.isArray(config?.periodos) ? config.periodos : [{ inicio: config?.inicio || '08:00', fim: config?.fim || '18:00' }]
          return (
            <div key={dia} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-20 pt-1">
<Label className="text-sm">{DIAS_LABEL[dia]}</Label>
              </div>
              <Switch
                checked={config?.ativo || false}
                onCheckedChange={(checked) => {
                  const p = (!checked || periodos.length > 0) ? periodos : [{ inicio: '08:00', fim: '18:00' }]
                  updateHorario(dia, { ativo: checked, periodos: p })
                }}
              />
              {config?.ativo ? (
                <div className="flex-1 space-y-2">
                  {periodos.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16">Período {idx + 1}</span>
                      <Input type="time" value={p?.inicio || '08:00'} onChange={(e) => updateHorarioPeriodo(dia, idx, 'inicio', e.target.value)} className="w-24 h-8 text-xs" />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input type="time" value={p?.fim || '18:00'} onChange={(e) => updateHorarioPeriodo(dia, idx, 'fim', e.target.value)} className="w-24 h-8 text-xs" />
                      {periodos.length > 1 && (
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => removeHorarioPeriodo(dia, idx)}>?</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addHorarioPeriodo(dia)}>+ Intervalo</Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground pt-1">Não atende</span>
              )}
            </div>
          )
        })}
      </div>
    )
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
                <Label htmlFor="create-nome" className="text-sm">Nome Completo *</Label>
                <Input
                  id="create-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                  placeholder="Ex: Dr. João Silva"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-cargo" className="text-sm">Cargo / Função *</Label>
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
                <Label htmlFor="create-documento" className="text-sm">CPF/Documento</Label>
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
                <Label htmlFor="create-email" className="text-sm">E-mail *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-senha" className="text-sm">Senha de Acesso *</Label>
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
                <Label htmlFor="create-telefone" className="text-sm">Telefone</Label>
                <Input
                  id="create-telefone"
                  value={formState.telefone || ''}
                  onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
<Label className="text-sm">Foto</Label>
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
                <Label htmlFor="create-whatsapp" className="text-sm">WhatsApp</Label>
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
                <Label htmlFor="create-especialidades" className="text-sm">Especialidades (uma por linha)</Label>
                <ListEditor
                  placeholder="Adicione especialidades"
                  items={normalizeStringList((formState as any).especialidades)}
                  onChange={(items: string[]) => setFormState({ ...formState, especialidades: items as any })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-experiencia" className="text-sm">Experiência</Label>
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
                <Label htmlFor="create-certificacoes" className="text-sm">Certificações</Label>
                <Textarea
                  id="create-certificacoes"
                  value={formState.certificacoes || ''}
                  onChange={(e) => setFormState({ ...formState, certificacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
<Label className="text-sm">Procedimentos que realiza</Label>
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
              <Label htmlFor="create-bio" className="text-sm">Bio</Label>
              <Textarea
                id="create-bio"
                value={formState.bio || ''}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-conselho" className="text-sm">Conselho Profissional</Label>
                <Input
                  id="create-conselho"
                  value={formState.conselho || ''}
                  onChange={(e) => setFormState({ ...formState, conselho: e.target.value })}
                  placeholder="Ex: CRM, CRO, CREFITO"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-registro" className="text-sm">Número de Registro</Label>
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
                <Label htmlFor="create-comissao" className="text-sm">Comissão (%)</Label>
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
                <Label htmlFor="create-meta" className="text-sm">Meta Mensal (R$)</Label>
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

            {renderHorariosSelector()}

            <div className="space-y-2">
              <Label htmlFor="create-status" className="text-sm">Status</Label>
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
                <Label htmlFor="edit-nome" className="text-sm">Nome Completo *</Label>
                <Input
                  id="edit-nome"
                  value={formState.nome}
                  onChange={(e) => setFormState({ ...formState, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cargo" className="text-sm">Cargo / Função *</Label>
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
                <Label htmlFor="edit-documento" className="text-sm">CPF/Documento</Label>
                <Input
                  id="edit-documento"
                  value={formState.documento || ''}
                  onChange={(e) => setFormState({ ...formState, documento: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formState.email || ''}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefone" className="text-sm">Telefone</Label>
                <Input
                  id="edit-telefone"
                  value={formState.telefone || ''}
                  onChange={(e) => setFormState({ ...formState, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
<Label className="text-sm">Foto</Label>
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
                <Label htmlFor="edit-whatsapp" className="text-sm">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  value={formState.whatsapp || ''}
                  onChange={(e) => setFormState({ ...formState, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-especialidades" className="text-sm">Especialidades (uma por linha)</Label>
                <ListEditor
                  placeholder="Adicione especialidades"
                  items={normalizeStringList((formState as any).especialidades)}
                  onChange={(items: string[]) => setFormState({ ...formState, especialidades: items as any })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-experiencia" className="text-sm">Experiência</Label>
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
                <Label htmlFor="edit-certificacoes" className="text-sm">Certificações</Label>
                <Textarea
                  id="edit-certificacoes"
                  value={formState.certificacoes || ''}
                  onChange={(e) => setFormState({ ...formState, certificacoes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
<Label className="text-sm">Procedimentos que realiza</Label>
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
              <Label htmlFor="edit-bio" className="text-sm">Bio</Label>
              <Textarea
                id="edit-bio"
                value={formState.bio || ''}
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-conselho" className="text-sm">Conselho Profissional</Label>
                <Input
                  id="edit-conselho"
                  value={formState.conselho || ''}
                  onChange={(e) => setFormState({ ...formState, conselho: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-registro" className="text-sm">Número de Registro</Label>
                <Input
                  id="edit-registro"
                  value={formState.registro_profissional || ''}
                  onChange={(e) => setFormState({ ...formState, registro_profissional: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-comissao" className="text-sm">Comissão (%)</Label>
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
                <Label htmlFor="edit-meta" className="text-sm">Meta Mensal (R$)</Label>
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

            {renderHorariosSelector()}

            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-sm">Status</Label>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserSquare className="h-5 w-5" />
              {selectedProfissional?.nome || 'Detalhes do Profissional'}
            </DialogTitle>
            <DialogDescription>Informações completas do profissional</DialogDescription>
          </DialogHeader>

          {selectedProfissional && (
            <div className="space-y-5">
              {/* Fotos */}
              {(() => {
                const detailMidias = profissionalMidias.filter((m: any) => true)
                if (detailMidias.length === 0) return null
                return (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Fotos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {detailMidias.map((m: any) => (
                        <div key={m.id} className="overflow-hidden rounded-lg border">
                          {fotoPreviewUrlById[m.id] ? (
                            <img src={fotoPreviewUrlById[m.id]} alt={m.label || 'Foto'} className="h-28 w-full object-cover" />
                          ) : (
                            <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">Carregando...</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Info básica + Contato */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Dados Pessoais</h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{selectedProfissional.nome}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cargo</span><span className="font-medium">{selectedProfissional.cargo || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Documento</span><span className="font-medium">{selectedProfissional.documento || '—'}</span></div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        selectedProfissional.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : selectedProfissional.status === 'inativo' ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                      }`}>
                        {STATUS_CONFIG[selectedProfissional.status]?.label || selectedProfissional.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Contato</h4>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{selectedProfissional.email || '—'}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{selectedProfissional.telefone || '—'}</span></div>
                    {selectedProfissional.whatsapp && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>WhatsApp: {selectedProfissional.whatsapp}</span></div>}
                  </div>
                </div>
              </div>

              {/* Registro profissional */}
              {(selectedProfissional.conselho || selectedProfissional.registro_profissional) && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Registro Profissional</h4>
                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    <div><span className="text-muted-foreground">Conselho:</span> <span className="font-medium">{selectedProfissional.conselho || '—'}</span></div>
                    <div><span className="text-muted-foreground">Registro:</span> <span className="font-medium">{selectedProfissional.registro_profissional || '—'}</span></div>
                  </div>
                </div>
              )}

              {/* Especialidades */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Especialidades</h4>
                {selectedProfissional.especialidades && selectedProfissional.especialidades.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProfissional.especialidades.map((esp) => (
                      <span key={esp} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{esp}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma especialidade cadastrada</p>
                )}
              </div>

              {/* Procedimentos */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4" /> Procedimentos que realiza</h4>
                {(selectedProfissional as any).procedimentos_ids && (selectedProfissional as any).procedimentos_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {((selectedProfissional as any).procedimentos_ids as string[]).map((id: string) => {
                      const proc = (procedimentos as any[]).find((p) => p.id === id)
                      return <Badge key={id} variant="secondary" className="text-xs">{proc?.nome || id}</Badge>
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum procedimento vinculado</p>
                )}
              </div>

              {/* Horários Disponíveis */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Horários Disponíveis</h4>
                {(() => {
                  const horarios = selectedProfissional.horarios_disponiveis || {}
                  const dias = Object.keys(horarios)
                  if (dias.length === 0) return <p className="text-xs text-muted-foreground">Nenhum horário configurado</p>
                  return (
                    <div className="grid gap-1.5">
                      {DIAS_SEMANA.map((dia) => {
                        const config = (horarios as any)[dia]
                        if (!config?.ativo) return (
                          <div key={dia} className="flex items-center gap-3 text-xs">
                            <span className="w-16 font-medium text-muted-foreground">{DIAS_LABEL[dia]}</span>
                            <span className="text-muted-foreground/60">Não atende</span>
                          </div>
                        )
                        const periodos = Array.isArray(config.periodos) ? config.periodos : [{ inicio: config.inicio || '08:00', fim: config.fim || '18:00' }]
                        return (
                          <div key={dia} className="flex items-center gap-3 text-xs">
                            <span className="w-16 font-medium">{DIAS_LABEL[dia]}</span>
                            <div className="flex flex-wrap gap-2">
                              {periodos.map((p: any, i: number) => (
                                <span key={i} className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                  {p.inicio} – {p.fim}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Financeiro */}
              {(selectedProfissional.percentual_comissao || selectedProfissional.meta_mensal) && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-sm font-semibold">Financeiro</h4>
                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    {selectedProfissional.percentual_comissao != null && <div><span className="text-muted-foreground">Comissão:</span> <span className="font-medium">{selectedProfissional.percentual_comissao}%</span></div>}
                    {selectedProfissional.meta_mensal != null && <div><span className="text-muted-foreground">Meta mensal:</span> <span className="font-medium">R$ {selectedProfissional.meta_mensal.toFixed(2)}</span></div>}
                  </div>
                </div>
              )}

              {/* Bio / Experiência */}
              {((selectedProfissional as any).bio || selectedProfissional.experiencia || selectedProfissional.certificacoes) && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Sobre o profissional</h4>
                  {(selectedProfissional as any).bio && (
                    <div><p className="text-xs text-muted-foreground mb-1">Biografia</p><p className="text-sm">{(selectedProfissional as any).bio}</p></div>
                  )}
                  {selectedProfissional.experiencia && (
                    <div><p className="text-xs text-muted-foreground mb-1">Experiência</p><p className="text-sm">{selectedProfissional.experiencia}</p></div>
                  )}
                  {selectedProfissional.certificacoes && (
                    <div><p className="text-xs text-muted-foreground mb-1">Certificações</p><p className="text-sm">{selectedProfissional.certificacoes}</p></div>
                  )}
                </div>
              )}

              {/* Datas */}
              <div className="grid gap-2 md:grid-cols-2 text-xs text-muted-foreground">
                <div>Criado em: {new Date(selectedProfissional.created_at).toLocaleString('pt-BR')}</div>
                <div>Atualizado em: {new Date(selectedProfissional.updated_at).toLocaleString('pt-BR')}</div>
              </div>
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
