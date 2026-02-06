import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Search, Users, UserPlus, Activity, Ban, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { FileUploadButton } from '@/components/ui/file-upload-button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimpleDateTime } from '@/components/ui/simple-datetime'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import {
  usePacientes,
  usePacientesStatusStats,
  useCreatePaciente,
  useUpdatePaciente,
  useDeletePaciente,
} from '@/hooks/usePacientes'
import {
  useAgendamentosClinica,
  useDeleteAgendamentoClinica,
  useUpdateAgendamentoClinica,
} from '@/hooks/useAgendamentosClinica'
import {
  usePlanosTratamento,
  useDeletePlanoTratamento,
  useUpdatePlanoTratamento,
} from '@/hooks/usePlanosTratamento'
import {
  useSessoesTratamento,
  useUpdateSessaoTratamento,
  useDeleteSessaoTratamento,
} from '@/hooks/useSessoesTratamento'
import { useProtocolosPacotes } from '@/hooks/useProtocolosPacotes'
import {
  usePacienteFotos,
  useCreatePacienteFoto,
  useDeletePacienteFoto,
} from '@/hooks/usePacienteFotos'
import type { PacienteFilters, PacienteCreateData } from '@/services/api/pacientes'
import { type StatusPaciente, type SexoPaciente } from '@/services/api/pacientes'
import { deleteMidia, uploadMidia, getSignedMidiaUrl } from '@/services/api/storage-midias'

const pacienteSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
  genero: z.enum(['nao_informado', 'masculino', 'feminino', 'outro'] as const).default('nao_informado'),
  cpf: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value))
    .transform((value) => (value ? value.replace(/\D/g, '') : value))
    .refine((value) => !value || value.length === 11, {
      message: 'CPF deve conter 11 dígitos',
    }),
  rg: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value))
    .transform((value) => (value ? value.replace(/\D/g, '') : value)),
  email: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value))
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'Informe um e-mail válido',
    }),
  telefone: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  whatsapp: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  data_nascimento: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  fonte_captacao: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  status: z
    .enum(['ativo', 'inativo', 'arquivado'] as const)
    .default('ativo'),
  tags: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  observacoes: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  analise_cliente: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  produto_interesse: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  alergias: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  restricoes: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_logradouro: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_numero: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_complemento: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_bairro: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_cidade: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_estado: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  endereco_cep: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value))
    .transform((value) => (value ? value.replace(/\D/g, '') : value))
    .refine((value) => !value || value.length === 8, {
      message: 'CEP deve conter 8 dígitos',
    }),
  consentimento_assinado: z.boolean().default(false),
})

type PacienteFormData = z.infer<typeof pacienteSchema>

type StatusFilter = 'all' | StatusPaciente
type ViewMode = 'lista' | 'kanban'

export function PacientesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<PacienteFilters>({
    search: '',
    status: 'all',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('lista')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null)
  const [deletePacienteId, setDeletePacienteId] = useState<string | null>(null)
  const [draggingPacienteId, setDraggingPacienteId] = useState<string | null>(null)
  const [optimisticStatusByPacienteId, setOptimisticStatusByPacienteId] = useState<Record<string, string>>({})
  const [tabPacientePerfil, setTabPacientePerfil] = useState<'geral' | 'agendamentos' | 'pacotes' | 'fotos'>('geral')
  const [fotoPreviewUrlById, setFotoPreviewUrlById] = useState<Record<string, string>>({})
  const [uploadingFotoTipo, setUploadingFotoTipo] = useState<'antes' | 'depois' | null>(null)

  // Debounce search term to avoid excessive refetches
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const pacienteFilters: PacienteFilters = useMemo(() => {
    const filters: PacienteFilters = {
      search: debouncedSearch || undefined,
    }

    if (statusFilter !== 'all') {
      filters.status = statusFilter as StatusPaciente
    }

    return filters
  }, [debouncedSearch, statusFilter])

  const {
    data: pacientes = [],
    count: totalPacientes = 0,
    isLoading,
  } = usePacientes(pacienteFilters)

  const kanbanColumns = useMemo(
    () => [
      { key: 'novos', title: 'Novos' },
      { key: 'agendado', title: 'Agendado' },
      { key: 'concluido', title: 'Concluído' },
      { key: 'arquivado', title: 'Arquivado' },
    ],
    [],
  )

  const openPacienteDetails = (id: string) => {
    setSelectedPacienteId(id)
    setIsDetailsOpen(true)
    setTabPacientePerfil('geral')
  }

  const getKanbanStatusLabel = (key?: string | null) => {
    const normalized = (key || '').trim().toLowerCase()
    if (normalized === 'novos') return 'Novos'
    if (normalized === 'agendado') return 'Agendado'
    if (normalized === 'concluido') return 'Concluído'
    if (normalized === 'arquivado') return 'Arquivado'
    return 'Novos'
  }

  const getKanbanKeyForPaciente = (paciente: any) => {
    const optimistic = optimisticStatusByPacienteId[paciente.id]
    const raw = optimistic ?? (paciente.status_detalhado as string | null | undefined)
    let key = (raw || '').trim().toLowerCase()
    if (!key) key = 'novos'
    if (key === 'avaliacao' || key === 'retorno' || key === 'pausados') key = 'novos'
    if (paciente.status === 'inativo') key = 'novos'
    if (paciente.status === 'arquivado') key = 'arquivado'
    return key
  }

  const { data: fotosPaciente, isLoading: isLoadingFotos } = usePacienteFotos(selectedPacienteId ?? undefined)
  const createFotoMutation = useCreatePacienteFoto()

  useEffect(() => {
    let cancelled = false
    async function hydrateUrls() {
      if (!fotosPaciente || fotosPaciente.length === 0) return
      const missing = fotosPaciente.filter((f) => !fotoPreviewUrlById[f.id])
      if (missing.length === 0) return

      const entries = await Promise.all(
        missing.map(async (f) => {
          try {
            const url = await getSignedMidiaUrl({ bucket: 'pacientes-midias', path: f.storage_path, expiresIn: 60 * 60 })
            return [f.id, url] as const
          } catch {
            return [f.id, ''] as const
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
  }, [fotosPaciente, fotoPreviewUrlById])

  const handleUploadPacienteFoto = async (tipo: 'antes' | 'depois', file: File) => {
    if (!pacienteSelecionado) return
    setUploadingFotoTipo(tipo)
    try {
      const uploaded = await uploadMidia({
        bucket: 'pacientes-midias',
        file,
        prefix: `pacientes/${pacienteSelecionado.id}/${tipo}`,
      })

      await createFotoMutation.mutateAsync({
        paciente_id: pacienteSelecionado.id,
        tipo,
        storage_bucket: 'pacientes-midias',
        storage_path: uploaded.path,
        metadata: { original_name: file.name, content_type: file.type, size: file.size },
      })
    } finally {
      setUploadingFotoTipo(null)
    }
  }

  const onDropPacienteToColumn = async (targetKey: string) => {
    if (!draggingPacienteId) return

    const paciente = pacientes.find((p) => p.id === draggingPacienteId)
    if (!paciente) return

    const nextDetailed = targetKey
    const nextStatus = nextDetailed === 'arquivado' ? 'arquivado' : 'ativo'

    const previousDetailed = (paciente as any).status_detalhado as string | null | undefined

    setOptimisticStatusByPacienteId((prev) => ({ ...prev, [draggingPacienteId]: nextDetailed }))
    setDraggingPacienteId(null)

    try {
      await updatePaciente.mutateAsync({
        id: paciente.id,
        data: {
          status_detalhado: nextDetailed as any,
          status: nextStatus as any,
        },
      })
    } catch (e) {
      setOptimisticStatusByPacienteId((prev) => {
        const copy = { ...prev }
        if (previousDetailed) copy[draggingPacienteId] = previousDetailed
        else delete copy[draggingPacienteId]
        return copy
      })
      throw e
    }
  }

  const pacientesByKanban = useMemo(() => {
    const grouped: Record<string, typeof pacientes> = {}
    kanbanColumns.forEach((c) => {
      grouped[c.key] = []
    })

    pacientes.forEach((p) => {
      const optimistic = optimisticStatusByPacienteId[p.id]
      const raw = optimistic ?? ((p as any).status_detalhado as string | null | undefined)
      const normalized = (raw || '').trim().toLowerCase()

      let key = normalized
      if (!key) key = 'novos'
      if (key === 'avaliacao' || key === 'retorno' || key === 'pausados') key = 'novos'
      if (p.status === 'inativo') key = 'novos'
      if (p.status === 'arquivado') key = 'arquivado'

      if (!grouped[key]) {
        grouped['novos'].push(p)
        return
      }

      grouped[key].push(p)
    })

    return grouped
  }, [kanbanColumns, pacientes, optimisticStatusByPacienteId])
  const { data: statusStats } = usePacientesStatusStats()
  const createPaciente = useCreatePaciente()
  const updatePaciente = useUpdatePaciente()
  const deletePaciente = useDeletePaciente()
  const deleteAgendamentoClinica = useDeleteAgendamentoClinica()
  const updateAgendamentoClinica = useUpdateAgendamentoClinica()
  const deletePlanoTratamento = useDeletePlanoTratamento()
  const updatePlanoTratamento = useUpdatePlanoTratamento()
  const deletePacienteFoto = useDeletePacienteFoto()
  const updateSessaoTratamento = useUpdateSessaoTratamento()
  const deleteSessaoTratamento = useDeleteSessaoTratamento()

  const [isEditingPaciente, setIsEditingPaciente] = useState(false)
  const [editingPacienteDraft, setEditingPacienteDraft] = useState<Record<string, any> | null>(null)

  const [editingAgendamentoId, setEditingAgendamentoId] = useState<string | null>(null)
  const [editingAgendamentoDraft, setEditingAgendamentoDraft] = useState<Record<string, any> | null>(null)

  const [editingPlanoId, setEditingPlanoId] = useState<string | null>(null)
  const [editingPlanoDraft, setEditingPlanoDraft] = useState<Record<string, any> | null>(null)

  const [editingSessaoId, setEditingSessaoId] = useState<string | null>(null)
  const [editingSessaoDraft, setEditingSessaoDraft] = useState<Record<string, any> | null>(null)

  const [expandedPlanoSessoesById, setExpandedPlanoSessoesById] = useState<Record<string, boolean>>({})

  const pacienteSelecionado = useMemo(
    () => pacientes.find((p) => p.id === selectedPacienteId) ?? null,
    [pacientes, selectedPacienteId],
  )

  useEffect(() => {
    if (!isDetailsOpen || !pacienteSelecionado) {
      setIsEditingPaciente(false)
      setEditingPacienteDraft(null)
      setEditingAgendamentoId(null)
      setEditingAgendamentoDraft(null)
      setEditingPlanoId(null)
      setEditingPlanoDraft(null)
      setEditingSessaoId(null)
      setEditingSessaoDraft(null)
      setExpandedPlanoSessoesById({})
      return
    }
    if (!isEditingPaciente) {
      setEditingPacienteDraft(null)
    }
  }, [isDetailsOpen, pacienteSelecionado, isEditingPaciente])

  const { data: agendamentosPaciente, isLoading: isLoadingAgendamentos } = useAgendamentosClinica({
    paciente_id: selectedPacienteId ?? undefined,
    limit: 50,
    page: 1,
  })

  const { data: planosPaciente, isLoading: isLoadingPlanos } = usePlanosTratamento({
    paciente_id: selectedPacienteId ?? undefined,
    limit: 50,
    page: 1,
  })

  const { data: pacotesAtivos = [] } = useProtocolosPacotes({ status: 'ativo', limit: 1000 } as any)

  const { data: sessoesPaciente, isLoading: isLoadingSessoes } = useSessoesTratamento({
    paciente_id: selectedPacienteId ?? undefined,
  })

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: {
      status: 'ativo',
      consentimento_assinado: false,
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const handleCreatePaciente = async (data: PacienteFormData) => {
    const payload: PacienteCreateData = {
      nome_completo: data.nome_completo,
      sexo: data.genero as SexoPaciente,
      cpf: data.cpf,
      rg: data.rg,
      email: data.email,
      telefone: data.telefone,
      whatsapp: data.whatsapp || data.telefone,
      data_nascimento: data.data_nascimento,
      fonte_captacao: data.fonte_captacao,
      status: data.status,
      endereco:
        data.endereco_logradouro ||
        data.endereco_numero ||
        data.endereco_complemento ||
        data.endereco_bairro ||
        data.endereco_cidade ||
        data.endereco_estado ||
        data.endereco_cep
          ? {
              logradouro: data.endereco_logradouro,
              numero: data.endereco_numero,
              complemento: data.endereco_complemento,
              bairro: data.endereco_bairro,
              cidade: data.endereco_cidade,
              estado: data.endereco_estado,
              cep: data.endereco_cep,
            }
          : undefined,
      observacoes: data.observacoes,
      analise_cliente: data.analise_cliente,
      produto_interesse: data.produto_interesse,
      alergias: data.alergias,
      restricoes: data.restricoes,
      consentimento_assinado: data.consentimento_assinado,
      tags: data.tags ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
    }

    try {
      await createPaciente.mutateAsync(payload)
      setIsCreateModalOpen(false)
      reset()
    } catch (error) {
      console.error('Erro ao cadastrar paciente:', error)
    }
  }

  const formatStatus = (status: StatusPaciente) => {
    if (status === 'ativo') return 'Ativo'
    if (status === 'inativo') return 'Inativo'
    return 'Arquivado'
  }

  const getStatusColor = (status: StatusPaciente) => {
    switch (status) {
      case 'ativo':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
      case 'inativo':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      case 'arquivado':
      default:
        return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
    }
  }

  const statusTotals: Record<StatusPaciente, number> = {
    ativo: statusStats?.ativo ?? 0,
    inativo: statusStats?.inativo ?? 0,
    arquivado: statusStats?.arquivado ?? 0,
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie fichas clínicas, histórico e consentimentos dos pacientes da clínica.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'lista' ? 'default' : 'ghost'}
              onClick={() => setViewMode('lista')}
            >
              Lista
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, RG ou telefone"
              className="pl-9 w-64"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="arquivado">Arquivados</option>
          </select>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Novo paciente
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {totalPacientes}
              </h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Pacientes cadastrados na clínica</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ativos</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {statusTotals.ativo}
              </h3>
            </div>
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Pacientes em acompanhamento</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-rose-500/10 via-background to-background p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arquivados</p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {statusTotals.arquivado}
              </h3>
            </div>
            <div className="rounded-full bg-rose-500/10 p-2 text-rose-500">
              <Ban className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Pacientes sem acompanhamento ativo</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {viewMode === 'lista' ? 'Lista de pacientes' : 'Kanban de pacientes'}
          </h2>
          <span className="text-sm text-muted-foreground">Exibindo {pacientes.length} registros</span>
        </div>

        {viewMode === 'lista' ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border/50">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Paciente</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Contato</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Último atendimento</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 text-left font-medium">Tags</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-background/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Carregando pacientes...
                        </div>
                      </td>
                    </tr>
                  ) : pacientes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        Nenhum paciente encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    pacientes.map((paciente) => (
                      <tr
                        key={paciente.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => openPacienteDetails(paciente.id)}
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="font-medium text-foreground">{paciente.nome_completo}</div>
                          {paciente.fonte_captacao && (
                            <p className="text-xs text-muted-foreground">Fonte: {paciente.fonte_captacao}</p>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-muted-foreground">
                          <div className="flex flex-col gap-1 text-xs">
                            {paciente.whatsapp && <span>Whatsapp: {paciente.whatsapp}</span>}
                            {paciente.telefone && <span>Telefone: {paciente.telefone}</span>}
                            {paciente.email && <span>E-mail: {paciente.email}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-muted-foreground">
                          <div className="flex flex-col text-xs">
                            {paciente.data_ultimo_atendimento ? (
                              <span>
                                {new Date(paciente.data_ultimo_atendimento).toLocaleDateString('pt-BR')}
                              </span>
                            ) : (
                              <span className="italic text-muted-foreground/80">Sem atendimento</span>
                            )}
                            <span className="mt-1 text-[11px] text-muted-foreground">
                              Criado em {new Date(paciente.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                              paciente.status,
                            )}`}
                          >
                            {formatStatus(paciente.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          {paciente.tags && paciente.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {paciente.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Sem tags</span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <AlertDialog
                            open={deletePacienteId === paciente.id}
                            onOpenChange={(open) => setDeletePacienteId(open ? paciente.id : null)}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                disabled={deletePaciente.isPending}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletePacienteId(paciente.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover paciente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover este paciente? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel
                                  disabled={deletePaciente.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletePacienteId(null)
                                  }}
                                >
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  disabled={deletePaciente.isPending}
                                  onClick={async () => {
                                    try {
                                      await deletePaciente.mutateAsync(paciente.id)
                                      setDeletePacienteId(null)
                                      if (selectedPacienteId === paciente.id) {
                                        setIsDetailsOpen(false)
                                        setSelectedPacienteId(null)
                                        setTabPacientePerfil('geral')
                                      }
                                    } catch {
                                      // erro tratado no hook
                                    }
                                  }}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-hidden">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {kanbanColumns.map((col) => (
                <div
                  key={col.key}
                  className="rounded-2xl border border-border/60 bg-background/50 w-full min-w-0"
                >
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                    <div className="text-sm font-semibold text-foreground">
                      {col.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pacientesByKanban[col.key]?.length ?? 0}
                    </div>
                  </div>

                  <div
                    className="p-4 space-y-3 min-h-[260px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      void onDropPacienteToColumn(col.key)
                    }}
                  >
                    {(pacientesByKanban[col.key] ?? []).map((paciente) => (
                      <button
                        key={paciente.id}
                        type="button"
                        onClick={() => openPacienteDetails(paciente.id)}
                        draggable
                        onDragStart={() => setDraggingPacienteId(paciente.id)}
                        onDragEnd={() => setDraggingPacienteId(null)}
                        className="w-full text-left rounded-2xl border border-border/60 bg-background p-4 shadow-sm hover:bg-muted/20"
                      >
                        <div className="font-semibold text-base text-foreground leading-snug">
                          {paciente.nome_completo}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {paciente.whatsapp && <div>{paciente.whatsapp}</div>}
                          {paciente.telefone && !paciente.whatsapp && <div>{paciente.telefone}</div>}
                          {(paciente as any).cpf && <div>CPF: {(paciente as any).cpf}</div>}
                          {paciente.data_ultimo_atendimento && (
                            <div>
                              Último: {new Date(paciente.data_ultimo_atendimento).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                        {paciente.tags && paciente.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {paciente.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}

                    {(pacientesByKanban[col.key]?.length ?? 0) === 0 && (
                      <div className="text-sm text-muted-foreground/70">Sem pacientes</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
            <DialogDescription>
              Cadastre um novo paciente informando os principais dados clínicos e de contato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleCreatePaciente)} className="space-y-4">
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || createPaciente.isPending} className="gap-2">
                {createPaciente.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar paciente
              </Button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="text-sm font-medium text-foreground">Dados do paciente</div>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="nome_completo">Nome completo *</Label>
                    <Input id="nome_completo" placeholder="Nome do paciente" {...register('nome_completo')} />
                    {errors.nome_completo && <p className="text-xs text-rose-500">{errors.nome_completo.message}</p>}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" placeholder="Somente números" {...register('cpf')} />
                      {errors.cpf && <p className="text-xs text-rose-500">{errors.cpf.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rg">RG</Label>
                      <Input id="rg" placeholder="Somente números" {...register('rg')} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="genero">Gênero</Label>
                      <select
                        id="genero"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        {...register('genero')}
                      >
                        <option value="nao_informado">Prefiro não informar</option>
                        <option value="masculino">Homem</option>
                        <option value="feminino">Mulher</option>
                        <option value="outro">Outros</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="data_nascimento">Data de nascimento</Label>
                      <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                        {...register('status')}
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input id="tags" placeholder="Separadas por vírgula (ex: botox, vip)" {...register('tags')} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="text-sm font-medium text-foreground">Contato</div>
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" placeholder="email@paciente.com" {...register('email')} />
                      {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" placeholder="(00) 00000-0000" {...register('telefone')} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">Whatsapp</Label>
                      <Input id="whatsapp" placeholder="(00) 00000-0000" {...register('whatsapp')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fonte_captacao">Fonte de captação</Label>
                      <Input id="fonte_captacao" placeholder="Indicação, Instagram, Evento..." {...register('fonte_captacao')} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <div className="text-sm font-medium text-foreground">Endereço</div>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="endereco_logradouro">Logradouro</Label>
                    <Input id="endereco_logradouro" placeholder="Rua, avenida..." {...register('endereco_logradouro')} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-1">
                      <Label htmlFor="endereco_numero">Número</Label>
                      <Input id="endereco_numero" placeholder="Nº" {...register('endereco_numero')} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="endereco_complemento">Complemento</Label>
                      <Input id="endereco_complemento" placeholder="Apto, sala..." {...register('endereco_complemento')} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="endereco_bairro">Bairro</Label>
                      <Input id="endereco_bairro" {...register('endereco_bairro')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endereco_cidade">Cidade</Label>
                      <Input id="endereco_cidade" {...register('endereco_cidade')} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="endereco_estado">Estado</Label>
                      <Input id="endereco_estado" placeholder="UF" {...register('endereco_estado')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endereco_cep">CEP</Label>
                      <Input id="endereco_cep" placeholder="Somente números" {...register('endereco_cep')} />
                      {errors.endereco_cep && <p className="text-xs text-rose-500">{errors.endereco_cep.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="text-sm font-medium text-foreground">Saúde</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="alergias">Alergias</Label>
                    <Textarea id="alergias" rows={2} placeholder="Informe alergias relevantes" {...register('alergias')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restricoes">Restrições</Label>
                    <Textarea id="restricoes" rows={2} placeholder="Restrições médicas importantes" {...register('restricoes')} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="text-sm font-medium text-foreground">Informações clínicas</div>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações clínicas</Label>
                    <Textarea
                      id="observacoes"
                      rows={3}
                      placeholder="Anote informações importantes sobre tratamentos e objetivos"
                      {...register('observacoes')}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="analise_cliente">Análise do paciente</Label>
                      <Textarea
                        id="analise_cliente"
                        rows={3}
                        placeholder="Resumo/diagnóstico/observações sobre o paciente"
                        {...register('analise_cliente')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="produto_interesse">Procedimento de interesse</Label>
                      <Textarea
                        id="produto_interesse"
                        rows={3}
                        placeholder="Procedimento(s) de interesse do paciente"
                        {...register('produto_interesse')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-4">
                <input
                  id="consentimento_assinado"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  {...register('consentimento_assinado')}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="consentimento_assinado" className="text-sm">
                    Consentimento assinado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Indica que o paciente assinou o termo de consentimento informado.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || createPaciente.isPending} className="gap-2">
                {createPaciente.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Cadastrar paciente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDetailsOpen}
        onOpenChange={(open) => {
          setIsDetailsOpen(open)
          if (!open) {
            setSelectedPacienteId(null)
            setTabPacientePerfil('geral')
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Paciente</DialogTitle>
            <DialogDescription>Visualize o perfil completo do paciente.</DialogDescription>
          </DialogHeader>

          {(() => {
            const paciente = pacienteSelecionado
            if (!paciente) {
              return <div className="text-sm text-muted-foreground">Paciente não encontrado.</div>
            }

            const kanbanKey = getKanbanKeyForPaciente(paciente as any)
            const statusKanbanLabel = getKanbanStatusLabel(kanbanKey)

            const planosAtivos = (planosPaciente || []).filter((p) => p.status === 'aprovado' || p.status === 'em_execucao')
            const pacotesMap = new Map((pacotesAtivos || []).map((p: any) => [p.id, p.nome]))
            const sessoesByPlanoId = (sessoesPaciente || []).reduce<Record<string, any[]>>((acc, s: any) => {
              const k = s.plano_tratamento_id || 'sem_plano'
              acc[k] = acc[k] ? [...acc[k], s] : [s]
              return acc
            }, {})

            const fotosAntes = (fotosPaciente || []).filter((f: any) => f.tipo === 'antes')
            const fotosDepois = (fotosPaciente || []).filter((f: any) => f.tipo === 'depois')

            return (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xl font-semibold text-foreground">{paciente.nome_completo}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                          paciente.status,
                        )}`}
                      >
                        {formatStatus(paciente.status)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {statusKanbanLabel}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {paciente.whatsapp ? `Whatsapp: ${paciente.whatsapp}` : paciente.telefone ? `Telefone: ${paciente.telefone}` : ''}
                  </div>
                </div>

                {tabPacientePerfil === 'geral' ? (
                  <div className="flex items-center justify-end gap-2">
                    {isEditingPaciente ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditingPaciente(false)
                            setEditingPacienteDraft(null)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          disabled={updatePaciente.isPending}
                          onClick={async () => {
                            if (!editingPacienteDraft) return
                            try {
                              const enderecoRaw = editingPacienteDraft.endereco
                              const endereco = enderecoRaw && typeof enderecoRaw === 'object' ? enderecoRaw : null
                              await updatePaciente.mutateAsync({
                                id: paciente.id,
                                data: {
                                  cpf: editingPacienteDraft.cpf || null,
                                  rg: editingPacienteDraft.rg || null,
                                  email: editingPacienteDraft.email || null,
                                  telefone: editingPacienteDraft.telefone || null,
                                  whatsapp: editingPacienteDraft.whatsapp || null,
                                  endereco,
                                  analise_cliente: editingPacienteDraft.analise_cliente || null,
                                  produto_interesse: editingPacienteDraft.produto_interesse || null,
                                },
                              })
                              setIsEditingPaciente(false)
                              setEditingPacienteDraft(null)
                            } catch {
                              // handled by hook
                            }
                          }}
                        >
                          Salvar
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditingPaciente(true)
                          setEditingPacienteDraft({
                            cpf: (paciente as any).cpf ?? '',
                            rg: (paciente as any).rg ?? '',
                            email: paciente.email ?? '',
                            telefone: paciente.telefone ?? '',
                            whatsapp: paciente.whatsapp ?? '',
                            endereco: (paciente as any).endereco ?? {},
                            analise_cliente: (paciente as any).analise_cliente ?? '',
                            produto_interesse: (paciente as any).produto_interesse ?? '',
                          })
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                ) : null}

                <Tabs
                  value={tabPacientePerfil}
                  onValueChange={(v) => {
                    const next = v as any
                    setTabPacientePerfil(next)
                    if (next !== 'geral') {
                      setIsEditingPaciente(false)
                      setEditingPacienteDraft(null)
                    }
                  }}
                >
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="geral">Geral</TabsTrigger>
                    <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
                    <TabsTrigger value="pacotes">Pacotes</TabsTrigger>
                    <TabsTrigger value="fotos">Fotos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="geral">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
                        <div className="text-sm font-medium text-foreground">Documentos</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="text-sm">
                            <div className="text-xs text-muted-foreground">CPF</div>
                            {isEditingPaciente ? (
                              <Input
                                value={String(editingPacienteDraft?.cpf ?? '')}
                                onChange={(e) => setEditingPacienteDraft((prev) => ({ ...(prev || {}), cpf: e.target.value }))}
                              />
                            ) : (
                              <div className="font-medium text-foreground">{(paciente as any).cpf || '—'}</div>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="text-xs text-muted-foreground">RG</div>
                            {isEditingPaciente ? (
                              <Input
                                value={String(editingPacienteDraft?.rg ?? '')}
                                onChange={(e) => setEditingPacienteDraft((prev) => ({ ...(prev || {}), rg: e.target.value }))}
                              />
                            ) : (
                              <div className="font-medium text-foreground">{(paciente as any).rg || '—'}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4">
                        <div className="text-sm font-medium text-foreground">Contato</div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="text-sm">
                            <div className="text-xs text-muted-foreground">E-mail</div>
                            {isEditingPaciente ? (
                              <Input
                                value={String(editingPacienteDraft?.email ?? '')}
                                onChange={(e) => setEditingPacienteDraft((prev) => ({ ...(prev || {}), email: e.target.value }))}
                              />
                            ) : (
                              <div className="font-medium text-foreground">{paciente.email || '—'}</div>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="text-xs text-muted-foreground">Whatsapp</div>
                            {isEditingPaciente ? (
                              <Input
                                value={String(editingPacienteDraft?.whatsapp ?? '')}
                                onChange={(e) => setEditingPacienteDraft((prev) => ({ ...(prev || {}), whatsapp: e.target.value }))}
                              />
                            ) : (
                              <div className="font-medium text-foreground">{paciente.whatsapp || '—'}</div>
                            )}
                          </div>
                          <div className="text-sm">
                            <div className="text-xs text-muted-foreground">Telefone</div>
                            {isEditingPaciente ? (
                              <Input
                                value={String(editingPacienteDraft?.telefone ?? '')}
                                onChange={(e) => setEditingPacienteDraft((prev) => ({ ...(prev || {}), telefone: e.target.value }))}
                              />
                            ) : (
                              <div className="font-medium text-foreground">{paciente.telefone || '—'}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4 text-sm">
                        <div className="text-sm font-medium text-foreground">Análise do paciente</div>
                        {isEditingPaciente ? (
                          <Textarea
                            rows={4}
                            value={String(editingPacienteDraft?.analise_cliente ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({ ...(prev || {}), analise_cliente: e.target.value }))
                            }
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-foreground">{(paciente as any).analise_cliente || '—'}</div>
                        )}
                      </div>

                      <div className="space-y-3 rounded-xl border border-border/60 bg-background p-4 text-sm">
                        <div className="text-sm font-medium text-foreground">Procedimento de interesse</div>
                        {isEditingPaciente ? (
                          <Textarea
                            rows={4}
                            value={String(editingPacienteDraft?.produto_interesse ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({ ...(prev || {}), produto_interesse: e.target.value }))
                            }
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-foreground">{(paciente as any).produto_interesse || '—'}</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border/60 bg-background p-4 text-sm">
                      <div className="text-sm font-medium text-foreground">Endereço</div>
                      {isEditingPaciente ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Logradouro"
                            value={String(editingPacienteDraft?.endereco?.logradouro ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), logradouro: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Número"
                            value={String(editingPacienteDraft?.endereco?.numero ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), numero: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Bairro"
                            value={String(editingPacienteDraft?.endereco?.bairro ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), bairro: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Cidade"
                            value={String(editingPacienteDraft?.endereco?.cidade ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), cidade: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="Estado"
                            value={String(editingPacienteDraft?.endereco?.estado ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), estado: e.target.value },
                              }))
                            }
                          />
                          <Input
                            placeholder="CEP"
                            value={String(editingPacienteDraft?.endereco?.cep ?? '')}
                            onChange={(e) =>
                              setEditingPacienteDraft((prev) => ({
                                ...(prev || {}),
                                endereco: { ...(prev?.endereco || {}), cep: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 font-medium text-foreground">
                            {[
                              (paciente as any).endereco?.logradouro,
                              (paciente as any).endereco?.numero,
                              (paciente as any).endereco?.bairro,
                            ]
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </div>
                          <div className="text-muted-foreground">
                            {[
                              (paciente as any).endereco?.cidade,
                              (paciente as any).endereco?.estado,
                              (paciente as any).endereco?.cep,
                            ]
                              .filter(Boolean)
                              .join(' - ') || '—'}
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="agendamentos">
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      {isLoadingAgendamentos ? (
                        <div className="text-sm text-muted-foreground">Carregando agendamentos...</div>
                      ) : agendamentosPaciente.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</div>
                      ) : (
                        <div className="space-y-3">
                          {agendamentosPaciente.map((a: any) => (
                            <div key={a.id} className="rounded-lg border border-border/60 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  {editingAgendamentoId === a.id ? (
                                    <div className="space-y-2">
                                      <Input
                                        value={String(editingAgendamentoDraft?.titulo ?? '')}
                                        onChange={(e) =>
                                          setEditingAgendamentoDraft((prev) => ({ ...(prev || {}), titulo: e.target.value }))
                                        }
                                      />
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <SimpleDateTime
                                          value={String(editingAgendamentoDraft?.data_inicio ?? '')}
                                          onChange={(v) => setEditingAgendamentoDraft((prev) => ({ ...(prev || {}), data_inicio: v }))}
                                          label="Início"
                                        />
                                        <SimpleDateTime
                                          value={String(editingAgendamentoDraft?.data_fim ?? '')}
                                          onChange={(v) => setEditingAgendamentoDraft((prev) => ({ ...(prev || {}), data_fim: v }))}
                                          label="Fim"
                                        />
                                      </div>
                                      <div className="max-w-xs">
                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                        <Select
                                          value={String(editingAgendamentoDraft?.status ?? 'agendado')}
                                          onValueChange={(v) =>
                                            setEditingAgendamentoDraft((prev) => ({ ...(prev || {}), status: v }))
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="agendado">Agendado</SelectItem>
                                            <SelectItem value="confirmado">Confirmado</SelectItem>
                                            <SelectItem value="check_in">Check-in</SelectItem>
                                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                                            <SelectItem value="concluido">Concluído</SelectItem>
                                            <SelectItem value="cancelado">Cancelado</SelectItem>
                                            <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
                                            <SelectItem value="remarcado">Remarcado</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-sm font-medium text-foreground">{a.titulo}</div>
                                      <div className="mt-1 text-xs text-muted-foreground">
                                        {new Date(a.data_inicio).toLocaleString('pt-BR')} - {new Date(a.data_fim).toLocaleTimeString('pt-BR')}
                                      </div>
                                    </>
                                  )}
                                  {a.profissional?.nome && (
                                    <div className="mt-1 text-xs text-muted-foreground">Profissional: {a.profissional.nome}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {String(a.status || '').replace(/_/g, ' ')}
                                  </span>
                                  <div className="mt-2 flex justify-end">
                                    {editingAgendamentoId === a.id ? (
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingAgendamentoId(null)
                                            setEditingAgendamentoDraft(null)
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={updateAgendamentoClinica.isPending}
                                          onClick={async () => {
                                            if (!editingAgendamentoDraft) return
                                            try {
                                              await updateAgendamentoClinica.mutateAsync({
                                                id: a.id,
                                                data: {
                                                  titulo: editingAgendamentoDraft.titulo,
                                                  data_inicio: editingAgendamentoDraft.data_inicio,
                                                  data_fim: editingAgendamentoDraft.data_fim,
                                                  status: editingAgendamentoDraft.status,
                                                } as any,
                                              })
                                              queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
                                              setEditingAgendamentoId(null)
                                              setEditingAgendamentoDraft(null)
                                            } catch {
                                              // handled by hook
                                            }
                                          }}
                                        >
                                          Salvar
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingAgendamentoId(a.id)
                                            setEditingAgendamentoDraft({
                                              titulo: a.titulo ?? '',
                                              data_inicio: a.data_inicio ?? '',
                                              data_fim: a.data_fim ?? '',
                                              status: a.status ?? 'agendado',
                                            })
                                          }}
                                        >
                                          Editar
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="destructive"
                                          disabled={deleteAgendamentoClinica.isPending}
                                          onClick={async () => {
                                            try {
                                              await deleteAgendamentoClinica.mutateAsync(a.id)
                                              queryClient.invalidateQueries({ queryKey: ['agendamentos-clinica'] })
                                            } catch {
                                              // handled by hook
                                            }
                                          }}
                                        >
                                          Excluir
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  {String(a.status) === 'remarcado' && (a.data_inicio_anterior || a.data_fim_anterior) ? (
                                    <div className="mt-2 space-y-1 text-[11px] leading-snug text-muted-foreground">
                                      <div>
                                        <span className="font-medium text-foreground">Antes:</span>{' '}
                                        {a.data_inicio_anterior ? new Date(a.data_inicio_anterior).toLocaleString('pt-BR') : '-'}
                                        {' - '}
                                        {a.data_fim_anterior ? new Date(a.data_fim_anterior).toLocaleTimeString('pt-BR') : '-'}
                                      </div>
                                      <div>
                                        <span className="font-medium text-foreground">Novo:</span>{' '}
                                        {new Date(a.data_inicio).toLocaleString('pt-BR')} - {new Date(a.data_fim).toLocaleTimeString('pt-BR')}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="pacotes">
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      {isLoadingPlanos || isLoadingSessoes ? (
                        <div className="text-sm text-muted-foreground">Carregando pacotes e sessões...</div>
                      ) : planosAtivos.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nenhum pacote ativo encontrado.</div>
                      ) : (
                        <div className="space-y-4">
                          {planosAtivos.map((plano: any) => {
                            const sessoes = (sessoesByPlanoId[plano.id] ?? []) as any[]
                            const realizadas = sessoes.filter((s) => Boolean(s.inicio_real) || s.status === 'concluida')
                            const pendentes = sessoes.filter((s) => !s.inicio_real && s.status !== 'concluida')
                            const datasRealizadas = realizadas
                              .map((s) => s.inicio_real)
                              .filter(Boolean)
                              .map((d) => new Date(d).toLocaleDateString('pt-BR'))

                            const datasRecomendadas = pendentes
                              .map((s) => s.inicio_previsto)
                              .filter(Boolean)
                              .slice(0, 5)
                              .map((d) => new Date(d).toLocaleDateString('pt-BR'))

                            const statusPacote =
                              plano.status === 'concluido'
                                ? 'Concluído'
                                : plano.status === 'cancelado'
                                  ? 'Abandonado'
                                  : plano.status === 'em_aprovacao' || plano.status === 'rascunho'
                                    ? 'Pausado'
                                    : 'Ativo'

                            return (
                              <div key={plano.id} className="rounded-xl border border-border/60 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    {editingPlanoId === plano.id ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={String(editingPlanoDraft?.titulo ?? '')}
                                          onChange={(e) => setEditingPlanoDraft((prev) => ({ ...(prev || {}), titulo: e.target.value }))}
                                        />
                                        <Textarea
                                          value={String(editingPlanoDraft?.descricao ?? '')}
                                          onChange={(e) =>
                                            setEditingPlanoDraft((prev) => ({ ...(prev || {}), descricao: e.target.value }))
                                          }
                                        />
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <Label className="text-xs text-muted-foreground">Status</Label>
                                            <Select
                                              value={String(editingPlanoDraft?.status ?? plano.status)}
                                              onValueChange={(v) => setEditingPlanoDraft((prev) => ({ ...(prev || {}), status: v }))}
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="rascunho">Rascunho</SelectItem>
                                                <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                                                <SelectItem value="aprovado">Aprovado</SelectItem>
                                                <SelectItem value="em_execucao">Em execução</SelectItem>
                                                <SelectItem value="concluido">Concluído</SelectItem>
                                                <SelectItem value="cancelado">Cancelado</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs text-muted-foreground">Pacote/Protocolo</Label>
                                            <Select
                                              value={String(editingPlanoDraft?.protocolo_pacote_id ?? 'none')}
                                              onValueChange={(v) =>
                                                setEditingPlanoDraft((prev) => ({
                                                  ...(prev || {}),
                                                  protocolo_pacote_id: v === 'none' ? null : v,
                                                }))
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {(pacotesAtivos || []).map((p: any) => (
                                                  <SelectItem key={p.id} value={p.id}>
                                                    {p.nome}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <div className="mt-2 flex gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingPlanoId(null)
                                              setEditingPlanoDraft(null)
                                            }}
                                          >
                                            Cancelar
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={updatePlanoTratamento.isPending}
                                            onClick={async () => {
                                              if (!editingPlanoDraft) return
                                              try {
                                                await updatePlanoTratamento.mutateAsync({
                                                  id: plano.id,
                                                  data: {
                                                    titulo: editingPlanoDraft.titulo,
                                                    descricao: editingPlanoDraft.descricao,
                                                    status: editingPlanoDraft.status,
                                                    protocolo_pacote_id: editingPlanoDraft.protocolo_pacote_id ?? null,
                                                  } as any,
                                                })
                                                queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
                                                setEditingPlanoId(null)
                                                setEditingPlanoDraft(null)
                                              } catch {
                                                // handled by hook
                                              }
                                            }}
                                          >
                                            Salvar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="text-sm font-semibold text-foreground">{plano.titulo}</div>
                                        {plano.descricao && <div className="mt-1 text-xs text-muted-foreground">{plano.descricao}</div>}
                                        {plano.protocolo_pacote_id ? (
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            Pacote/Protocolo: {pacotesMap.get(plano.protocolo_pacote_id) ?? plano.protocolo_pacote_id}
                                          </div>
                                        ) : null}
                                        <div className="mt-2 flex gap-2">
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setEditingPlanoId(plano.id)
                                              setEditingPlanoDraft({
                                                titulo: plano.titulo ?? '',
                                                descricao: plano.descricao ?? '',
                                                status: plano.status,
                                                protocolo_pacote_id: plano.protocolo_pacote_id ?? null,
                                              })
                                            }}
                                          >
                                            Editar
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="destructive"
                                            disabled={deletePlanoTratamento.isPending}
                                            onClick={async () => {
                                              try {
                                                await deletePlanoTratamento.mutateAsync(plano.id)
                                                queryClient.invalidateQueries({ queryKey: ['planos-tratamento'] })
                                              } catch {
                                                // handled by hook
                                              }
                                            }}
                                          >
                                            Excluir plano
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                    {statusPacote}
                                  </span>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-lg bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Total de sessões</div>
                                    <div className="text-lg font-semibold text-foreground">{sessoes.length}</div>
                                  </div>
                                  <div className="rounded-lg bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Sessões realizadas</div>
                                    <div className="text-lg font-semibold text-foreground">{realizadas.length}</div>
                                  </div>
                                  <div className="rounded-lg bg-muted/30 p-3">
                                    <div className="text-xs text-muted-foreground">Sessões pendentes</div>
                                    <div className="text-lg font-semibold text-foreground">{pendentes.length}</div>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <div className="text-sm">
                                    <div className="text-xs font-medium text-muted-foreground">Datas realizadas</div>
                                    <div className="mt-1 text-sm text-foreground">
                                      {datasRealizadas.length ? datasRealizadas.join(', ') : 'Nenhuma'}
                                    </div>
                                  </div>
                                  <div className="text-sm">
                                    <div className="text-xs font-medium text-muted-foreground">Próximas recomendadas</div>
                                    <div className="mt-1 text-sm text-foreground">
                                      {datasRecomendadas.length ? datasRecomendadas.join(', ') : 'Nenhuma'}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedPlanoSessoesById((prev) => {
                                        const nextValue = !Boolean(prev[plano.id])
                                        return nextValue ? { [plano.id]: true } : {}
                                      })
                                      setEditingSessaoId(null)
                                      setEditingSessaoDraft(null)
                                    }}
                                  >
                                    {expandedPlanoSessoesById[plano.id] ? 'Ocultar detalhes de sessões' : 'Mostrar detalhes de sessões'}
                                  </Button>
                                </div>

                                {expandedPlanoSessoesById[plano.id] ? (
                                  <div className="mt-4">
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessões</div>
                                    {sessoes.length === 0 ? (
                                      <div className="mt-2 text-sm text-muted-foreground">Nenhuma sessão encontrada.</div>
                                    ) : (
                                      <div className="mt-2 space-y-2">
                                        {sessoes
                                          .slice()
                                          .sort((a, b) => {
                                            const da = a.inicio_previsto || a.created_at || ''
                                            const db = b.inicio_previsto || b.created_at || ''
                                            return String(da).localeCompare(String(db))
                                          })
                                          .map((s: any, idx: number) => (
                                            <div key={s.id} className="rounded-lg border border-border/60 p-3">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                  <div className="text-sm font-medium text-foreground">Sessão {idx + 1}</div>
                                                  {editingSessaoId === s.id ? (
                                                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                                      <SimpleDateTime
                                                        value={String(editingSessaoDraft?.inicio_previsto ?? '')}
                                                        onChange={(v) =>
                                                          setEditingSessaoDraft((prev) => ({ ...(prev || {}), inicio_previsto: v }))
                                                        }
                                                        label="Prevista"
                                                      />
                                                      <SimpleDateTime
                                                        value={String(editingSessaoDraft?.inicio_real ?? '')}
                                                        onChange={(v) =>
                                                          setEditingSessaoDraft((prev) => ({ ...(prev || {}), inicio_real: v }))
                                                        }
                                                        label="Realizada"
                                                      />
                                                      <div className="sm:col-span-2 max-w-xs">
                                                        <Label className="text-xs text-muted-foreground">Status</Label>
                                                        <Select
                                                          value={String(editingSessaoDraft?.status ?? 'planejada')}
                                                          onValueChange={(v) =>
                                                            setEditingSessaoDraft((prev) => ({ ...(prev || {}), status: v }))
                                                          }
                                                        >
                                                          <SelectTrigger>
                                                            <SelectValue placeholder="Selecione" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            <SelectItem value="planejada">Planejada</SelectItem>
                                                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                                                            <SelectItem value="concluida">Concluída</SelectItem>
                                                            <SelectItem value="cancelada">Cancelada</SelectItem>
                                                            <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
                                                          </SelectContent>
                                                        </Select>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                                      <div>
                                                        <span className="font-medium text-foreground">Prevista:</span>{' '}
                                                        {s.inicio_previsto ? new Date(s.inicio_previsto).toLocaleString('pt-BR') : '—'}
                                                      </div>
                                                      <div>
                                                        <span className="font-medium text-foreground">Realizada:</span>{' '}
                                                        {s.inicio_real ? new Date(s.inicio_real).toLocaleString('pt-BR') : '—'}
                                                      </div>
                                                      <div>
                                                        <span className="font-medium text-foreground">Status:</span> {String(s.status || '')}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                  {editingSessaoId === s.id ? (
                                                    <>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                          setEditingSessaoId(null)
                                                          setEditingSessaoDraft(null)
                                                        }}
                                                      >
                                                        Cancelar
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        disabled={updateSessaoTratamento.isPending}
                                                        onClick={async () => {
                                                          if (!editingSessaoDraft) return
                                                          try {
                                                            await updateSessaoTratamento.mutateAsync({
                                                              id: s.id,
                                                              data: {
                                                                inicio_previsto: editingSessaoDraft.inicio_previsto || null,
                                                                inicio_real: editingSessaoDraft.inicio_real || null,
                                                                status: editingSessaoDraft.status,
                                                              } as any,
                                                            })
                                                            setEditingSessaoId(null)
                                                            setEditingSessaoDraft(null)
                                                          } catch {
                                                            // handled by hook
                                                          }
                                                        }}
                                                      >
                                                        Salvar
                                                      </Button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                          setEditingSessaoId(s.id)
                                                          setEditingSessaoDraft({
                                                            inicio_previsto: s.inicio_previsto ?? '',
                                                            inicio_real: s.inicio_real ?? '',
                                                            status: s.status ?? 'planejada',
                                                          })
                                                        }}
                                                      >
                                                        Editar
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        disabled={deleteSessaoTratamento.isPending}
                                                        onClick={async () => {
                                                          try {
                                                            await deleteSessaoTratamento.mutateAsync(s.id)
                                                          } catch {
                                                            // handled by hook
                                                          }
                                                        }}
                                                      >
                                                        Excluir
                                                      </Button>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="fotos">
                    <div className="rounded-xl border border-border/60 bg-background p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-medium text-foreground">Fotos de Antes e Depois</div>
                        <div className="flex flex-wrap gap-2">
                          <FileUploadButton
                            label={uploadingFotoTipo === 'antes' ? 'Enviando...' : 'Adicionar ANTES'}
                            accept="image/*"
                            disabled={uploadingFotoTipo !== null}
                            onFiles={(files) => {
                              if (files[0]) {
                                void handleUploadPacienteFoto('antes', files[0])
                              }
                            }}
                          />
                          <FileUploadButton
                            label={uploadingFotoTipo === 'depois' ? 'Enviando...' : 'Adicionar DEPOIS'}
                            accept="image/*"
                            disabled={uploadingFotoTipo !== null}
                            onFiles={(files) => {
                              if (files[0]) {
                                void handleUploadPacienteFoto('depois', files[0])
                              }
                            }}
                          />
                        </div>
                      </div>

                      {isLoadingFotos ? (
                        <div className="mt-4 text-sm text-muted-foreground">Carregando fotos...</div>
                      ) : (fotosPaciente?.length ?? 0) === 0 ? (
                        <div className="mt-4 text-sm text-muted-foreground">Nenhuma foto cadastrada.</div>
                      ) : (
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Antes</div>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {fotosAntes.map((f: any) => (
                                <div key={f.id} className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
                                  {fotoPreviewUrlById[f.id] ? (
                                    <img
                                      src={fotoPreviewUrlById[f.id]}
                                      alt="Foto antes"
                                      className="h-40 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                                      Carregando...
                                    </div>
                                  )}
                                  <div className="p-2 flex justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletePacienteFoto.isPending}
                                      onClick={async () => {
                                        try {
                                          try {
                                            await deleteMidia({ bucket: f.storage_bucket, path: f.storage_path })
                                          } catch {
                                            // ignore
                                          }
                                          await deletePacienteFoto.mutateAsync({ id: f.id, pacienteId: paciente.id })
                                        } catch {
                                          // handled by hook
                                        }
                                      }}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Depois</div>
                            <div className="mt-2 grid gap-3 sm:grid-cols-2">
                              {fotosDepois.map((f: any) => (
                                <div key={f.id} className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
                                  {fotoPreviewUrlById[f.id] ? (
                                    <img
                                      src={fotoPreviewUrlById[f.id]}
                                      alt="Foto depois"
                                      className="h-40 w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                                      Carregando...
                                    </div>
                                  )}
                                  <div className="p-2 flex justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      disabled={deletePacienteFoto.isPending}
                                      onClick={async () => {
                                        try {
                                          try {
                                            await deleteMidia({ bucket: f.storage_bucket, path: f.storage_path })
                                          } catch {
                                            // ignore
                                          }
                                          await deletePacienteFoto.mutateAsync({ id: f.id, pacienteId: paciente.id })
                                        } catch {
                                          // handled by hook
                                        }
                                      }}
                                    >
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )
          })()}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PacientesPage
