import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Search, Users, UserPlus, Activity, Ban } from 'lucide-react'

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
  usePacientes,
  usePacientesStatusStats,
  useCreatePaciente,
} from '@/hooks/usePacientes'
import type { PacienteFilters, PacienteCreateData } from '@/services/api/pacientes'
import { type StatusPaciente } from '@/services/api/pacientes'

const pacienteSchema = z.object({
  nome_completo: z.string().min(1, 'Nome completo é obrigatório'),
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
  alergias: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  restricoes: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() === '' ? undefined : value)),
  consentimento_assinado: z.boolean().default(false),
})

type PacienteFormData = z.infer<typeof pacienteSchema>

type StatusFilter = 'all' | StatusPaciente

export function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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
  const { data: statusStats } = usePacientesStatusStats()
  const createPaciente = useCreatePaciente()

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
      email: data.email,
      telefone: data.telefone,
      whatsapp: data.whatsapp || data.telefone,
      data_nascimento: data.data_nascimento,
      fonte_captacao: data.fonte_captacao,
      status: data.status,
      observacoes: data.observacoes,
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, documento ou telefone"
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
          <h2 className="text-lg font-semibold text-foreground">Lista de pacientes</h2>
          <span className="text-sm text-muted-foreground">Exibindo {pacientes.length} registros</span>
        </div>

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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-background/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando pacientes...
                      </div>
                    </td>
                  </tr>
                ) : pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                      Nenhum paciente encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  pacientes.map((paciente) => (
                    <tr key={paciente.id} className="hover:bg-muted/30">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome completo *</Label>
                <Input id="nome_completo" placeholder="Nome do paciente" {...register('nome_completo')} />
                {errors.nome_completo && (
                  <p className="text-xs text-rose-500">{errors.nome_completo.message}</p>
                )}
              </div>

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
                  <Label htmlFor="data_nascimento">Data de nascimento</Label>
                  <Input id="data_nascimento" type="date" {...register('data_nascimento')} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fonte_captacao">Fonte de captação</Label>
                  <Input id="fonte_captacao" placeholder="Indicação, Instagram, Evento..." {...register('fonte_captacao')} />
                </div>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="Separadas por vírgula (ex: botox, vip)"
                  {...register('tags')}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="alergias">Alergias</Label>
                  <Textarea id="alergias" rows={2} placeholder="Informe alergias relevantes" {...register('alergias')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restricoes">Restrições</Label>
                  <Textarea
                    id="restricoes"
                    rows={2}
                    placeholder="Restrições médicas importantes"
                    {...register('restricoes')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações clínicas</Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Anote informações importantes sobre tratamentos e objetivos"
                  {...register('observacoes')}
                />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
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
    </div>
  )
}

export default PacientesPage
