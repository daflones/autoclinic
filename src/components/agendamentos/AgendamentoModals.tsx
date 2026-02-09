import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Edit, Trash2, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import type {
  AgendamentoClinica,
  AgendamentoClinicaCreateData,
  StatusAgendamentoClinica,
} from '@/services/api/agendamentos-clinica'
import type { Paciente } from '@/services/api/pacientes'
import type { ProfissionalClinica } from '@/services/api/profissionais-clinica'
import type { Procedimento } from '@/services/api/procedimentos'
import type { ProtocoloPacote } from '@/services/api/protocolos-pacotes'

const STATUS_CONFIG: Record<
  StatusAgendamentoClinica,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }
> = {
  agendado: { label: 'Agendado', variant: 'default', icon: null },
  confirmado: { label: 'Confirmado', variant: 'default', icon: null },
  check_in: { label: 'Check-in', variant: 'secondary', icon: null },
  em_andamento: { label: 'Em Andamento', variant: 'secondary', icon: null },
  concluido: { label: 'Concluído', variant: 'outline', icon: null },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: null },
  nao_compareceu: { label: 'Não Compareceu', variant: 'destructive', icon: null },
  remarcado: { label: 'Remarcado', variant: 'outline', icon: null },
}


interface AgendamentoModalsProps {
  isCreateModalOpen: boolean
  setIsCreateModalOpen: (open: boolean) => void
  isDetailsModalOpen: boolean
  setIsDetailsModalOpen: (open: boolean) => void
  isEditModalOpen: boolean
  setIsEditModalOpen: (open: boolean) => void
  isDeleteConfirmOpen: boolean
  setIsDeleteConfirmOpen: (open: boolean) => void
  selectedAgendamento: AgendamentoClinica | null
  formState: AgendamentoClinicaCreateData
  setFormState: (state: AgendamentoClinicaCreateData) => void
  editFormState: AgendamentoClinicaCreateData
  setEditFormState: (state: AgendamentoClinicaCreateData) => void
  pacientes: Paciente[]
  profissionais: ProfissionalClinica[]
  procedimentos: Procedimento[]
  protocolosPacotes: ProtocoloPacote[]
  onCreateAgendamento: () => void
  onSaveEdit: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onUpdateStatus: (status: StatusAgendamentoClinica) => void
  onOpenEditModal: () => void
  createPending: boolean
  updatePending: boolean
  deletePending: boolean
  updateStatusPending: boolean
}

export function AgendamentoModals({
  isCreateModalOpen,
  setIsCreateModalOpen,
  isDetailsModalOpen,
  setIsDetailsModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  selectedAgendamento,
  formState,
  setFormState,
  editFormState,
  setEditFormState,
  pacientes,
  profissionais,
  procedimentos,
  protocolosPacotes,
  onCreateAgendamento,
  onSaveEdit,
  onRequestDelete,
  onConfirmDelete,
  onUpdateStatus,
  onOpenEditModal,
  createPending,
  updatePending,
  deletePending,
  updateStatusPending,
}: AgendamentoModalsProps) {
  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const normalizeIdArray = (v: any): string[] => {
    if (Array.isArray(v)) return v.filter(Boolean)
    return []
  }

  const calcValor = (procedimentoIds: string[], pacoteIds: string[]) => {
    const procedimentosTotal = procedimentoIds.reduce((acc, id) => {
      const p: any = (procedimentos as any[]).find((x) => x.id === id)
      const v =
        typeof p?.valor_promocional === 'number'
          ? p.valor_promocional
          : typeof p?.valor_base === 'number'
            ? p.valor_base
            : 0
      return acc + (Number.isFinite(v) ? v : 0)
    }, 0)

    const pacotesTotal = pacoteIds.reduce((acc, id) => {
      const p: any = (protocolosPacotes as any[]).find((x) => x.id === id)
      const v = typeof p?.preco === 'number' ? p.preco : 0
      return acc + (Number.isFinite(v) ? v : 0)
    }, 0)

    const total = procedimentosTotal + pacotesTotal
    return Number.isFinite(total) ? total : 0
  }

  const generateTitle = (
    isAvaliacao: boolean,
    _pacienteId: string | null,
    procedimentoIds: string[],
    pacoteIds: string[],
    _profissionalId: string | null
  ) => {
    const parts: string[] = []
    
    // Add "Avaliação:" prefix if it's an evaluation
    if (isAvaliacao) {
      parts.push('Avaliação:')
    }
    
    // Add procedures with proper prefix
    if (procedimentoIds.length > 0) {
      const procedureNames: string[] = []
      procedimentoIds.forEach(id => {
        const proc = procedimentos.find((p: any) => p.id === id)
        if (proc) {
          procedureNames.push(proc.nome)
        }
      })
      
      if (procedureNames.length > 0) {
        const prefix = procedureNames.length === 1 ? 'Procedimento:' : 'Procedimentos:'
        parts.push(`${prefix} ${procedureNames.join(', ')}`)
      }
    }
    
    // Add packages with proper prefix
    if (pacoteIds.length > 0) {
      const packageNames: string[] = []
      pacoteIds.forEach(id => {
        const pack = protocolosPacotes.find((p: any) => p.id === id)
        if (pack) {
          packageNames.push(pack.nome)
        }
      })
      
      if (packageNames.length > 0) {
        const prefix = packageNames.length === 1 ? 'Protocolo/Pacote:' : 'Protocolos/Pacotes:'
        parts.push(`${prefix} ${packageNames.join(', ')}`)
      }
    }
    
    // Return a default title if no parts were added
    return parts.length > 0 ? parts.join(' - ') : 'Agendamento'
  }

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime || !durationMinutes) return ''
    
    try {
      const startDate = new Date(startTime)
      if (isNaN(startDate.getTime())) return ''
      
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
      return endDate.toISOString()
    } catch {
      return ''
    }
  }

  const getDurationFromTimes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 60 // default 60 minutes
    
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 60
      
      const diffMs = end.getTime() - start.getTime()
      return Math.max(15, Math.round(diffMs / (60 * 1000))) // minimum 15 minutes
    } catch {
      return 60
    }
  }

  const toggleCreateProcedimento = (id: string) => {
    const current = normalizeIdArray((formState as any).procedimentos_ids)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    const pacoteIds = normalizeIdArray((formState as any).protocolos_pacotes_ids)
    const valor = calcValor(next, pacoteIds)
    const newTitle = generateTitle(
      Boolean(formState.is_avaliacao),
      formState.paciente_id || null,
      next,
      pacoteIds,
      formState.profissional_id || null
    )
    setFormState({
      ...formState,
      procedimentos_ids: next,
      procedimento_id: next[0] ?? null,
      valor,
      titulo: newTitle,
      plano_tratamento_id: null,
    } as any)
  }

  const toggleCreatePacote = (id: string) => {
    const current = normalizeIdArray((formState as any).protocolos_pacotes_ids)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    const procedimentoIds = normalizeIdArray((formState as any).procedimentos_ids)
    const valor = calcValor(procedimentoIds, next)
    const newTitle = generateTitle(
      Boolean(formState.is_avaliacao),
      formState.paciente_id || null,
      procedimentoIds,
      next,
      formState.profissional_id || null
    )
    setFormState({
      ...formState,
      protocolos_pacotes_ids: next,
      valor,
      titulo: newTitle,
      plano_tratamento_id: null,
    } as any)
  }

  const toggleEditProcedimento = (id: string) => {
    const current = normalizeIdArray((editFormState as any).procedimentos_ids)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    const pacoteIds = normalizeIdArray((editFormState as any).protocolos_pacotes_ids)
    const valor = calcValor(next, pacoteIds)
    const newTitle = generateTitle(
      Boolean(editFormState.is_avaliacao),
      editFormState.paciente_id || null,
      next,
      pacoteIds,
      editFormState.profissional_id || null
    )
    setEditFormState({
      ...editFormState,
      procedimentos_ids: next,
      procedimento_id: next[0] ?? null,
      valor,
      titulo: newTitle,
      plano_tratamento_id: null,
    } as any)
  }

  const toggleEditPacote = (id: string) => {
    const current = normalizeIdArray((editFormState as any).protocolos_pacotes_ids)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    const procedimentoIds = normalizeIdArray((editFormState as any).procedimentos_ids)
    const valor = calcValor(procedimentoIds, next)
    const newTitle = generateTitle(
      Boolean(editFormState.is_avaliacao),
      editFormState.paciente_id || null,
      procedimentoIds,
      next,
      editFormState.profissional_id || null
    )
    setEditFormState({
      ...editFormState,
      protocolos_pacotes_ids: next,
      valor,
      titulo: newTitle,
      plano_tratamento_id: null,
    } as any)
  }

  const generateSessionsFromPackage = (packageId: string) => {
    const pack = protocolosPacotes.find((p: any) => p.id === packageId)
    if (!pack || !pack.conteudo?.estrutura?.itens) return []

    const sessions = []
    const items = pack.conteudo.estrutura.itens || []
    
    for (const item of items) {
      const sessionCount = item.sessoes_qtd || 1
      const duration = item.duracao_sessao_min || 60
      const interval = item.intervalo_recomendado || '7 dias'
      const intervalDays = extractDaysFromInterval(interval)
      
      // Get the actual procedure name from the item
      let procedimentoNome = 'Sessão'
      
      // Try to get from nome_manual first
      if (item.nome_manual) {
        procedimentoNome = item.nome_manual
      }
      // If no nome_manual, try to find the procedure by ID
      else if (item.procedimento_id) {
        const procedure = procedimentos.find((p: any) => p.id === item.procedimento_id)
        if (procedure) {
          procedimentoNome = procedure.nome
        }
      }
      // If still no name, try to get from item.nome
      else if (item.nome) {
        procedimentoNome = item.nome
      }
      
      for (let i = 0; i < sessionCount; i++) {
        sessions.push({
          id: `package-${packageId}-${item.ordem || 0}-${i}`,
          type: 'package',
          packageId,
          itemId: item.ordem || 0,
          sessionNumber: i + 1,
          totalSessions: sessionCount,
          duration,
          interval,
          intervalDays,
          procedimentoNome,
          data_inicio: '',
          data_fim: '',
        })
      }
    }
    
    return sessions
  }

  const generateSessionsFromProcedure = (procedureId: string) => {
    const procedure = procedimentos.find((p: any) => p.id === procedureId)
    if (!procedure) return []

    // Get session configuration from procedure's IA config
    const iaConfig = procedure.ia_config || {}
    const sessoes = iaConfig.sessoes || {}
    const sessionCount = sessoes.quantidade_recomendada || 1
    const duration = sessoes.duracao_estimada_min || (procedure as any).duracao_estimada || 60
    const interval = sessoes.intervalo || '7 dias'
    const intervalDays = extractDaysFromInterval(interval)

    const sessions = []
    for (let i = 0; i < sessionCount; i++) {
      sessions.push({
        id: `procedure-${procedureId}-${i}`,
        type: 'procedure',
        procedureId,
        sessionNumber: i + 1,
        totalSessions: sessionCount,
        duration,
        interval,
        intervalDays,
        procedimentoNome: procedure.nome,
        data_inicio: '',
        data_fim: '',
      })
    }
    
    return sessions
  }

  const extractDaysFromInterval = (interval: string): number => {
    if (!interval) return 7
    const match = interval.match(/(\d+)\s*dia/i)
    return match ? parseInt(match[1]) : 7
  }

  const getSessionsForSelectedItems = () => {
    const selectedPackageIds = normalizeIdArray((formState as any).protocolos_pacotes_ids)
    const selectedProcedureIds = normalizeIdArray((formState as any).procedimentos_ids)
    const allSessions = []
    
    // Add sessions from packages
    for (const packageId of selectedPackageIds) {
      const packageSessions = generateSessionsFromPackage(packageId)
      allSessions.push(...packageSessions)
    }
    
    // Add sessions from procedures
    for (const procedureId of selectedProcedureIds) {
      const procedureSessions = generateSessionsFromProcedure(procedureId)
      allSessions.push(...procedureSessions)
    }
    
    return allSessions
  }

  const updateSessionData = (sessionId: string, field: string, value: string) => {
    const currentSessions = (formState as any).sessoes_agendamento || []
    const updatedSessions = currentSessions.map((session: any) => 
      session.id === sessionId ? { ...session, [field]: value } : session
    )
    
    if (!currentSessions.find((s: any) => s.id === sessionId)) {
      const sessionTemplate = getSessionsForSelectedItems().find((s: any) => s.id === sessionId)
      if (sessionTemplate) {
        updatedSessions.push({ ...sessionTemplate, [field]: value })
      }
    }
    
    // If updating the first session's start time, automatically schedule other sessions
    if (field === 'data_inicio' && value) {
      const session = updatedSessions.find((s: any) => s.id === sessionId)
      if (session && session.sessionNumber === 1) {
        autoScheduleFollowingSessions(updatedSessions, session)
      }
    }
    
    setFormState({ ...formState, sessoes_agendamento: updatedSessions } as any)
  }

  const formatLocalDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const updateSessionDataBatch = (sessionId: string, startValue: string, durationMin: number) => {
    const currentSessions = (formState as any).sessoes_agendamento || []
    const allTemplates = getSessionsForSelectedItems()
    
    // Start from current sessions, deep copy
    let updatedSessions = [...currentSessions.map((s: any) => ({ ...s }))]
    
    // Ensure ALL template sessions exist in updatedSessions (not just the one being edited)
    for (const template of allTemplates) {
      if (!updatedSessions.find((s: any) => s.id === template.id)) {
        updatedSessions.push({ ...template })
      }
    }
    
    // Find the session being edited
    let sessionEntry = updatedSessions.find((s: any) => s.id === sessionId)

    if (sessionEntry) {
      sessionEntry.data_inicio = startValue
      if (startValue) {
        sessionEntry.data_fim = calculateSessionEndTime(startValue, durationMin)
      }

      // Auto-schedule following sessions if this is session 1
      if (sessionEntry.sessionNumber === 1) {
        autoScheduleFollowingSessions(updatedSessions, sessionEntry)
      }
    }

    setFormState({ ...formState, sessoes_agendamento: updatedSessions } as any)
  }

  const autoScheduleFollowingSessions = (sessions: any[], firstSession: any) => {
    const relatedSessions = sessions.filter((s: any) => 
      s.type === firstSession.type && 
      (s.packageId === firstSession.packageId || s.procedureId === firstSession.procedureId) &&
      s.sessionNumber > 1
    )

    const firstStartTime = new Date(firstSession.data_inicio)
    if (isNaN(firstStartTime.getTime())) return
    
    relatedSessions.forEach((session: any) => {
      const sessionIndex = session.sessionNumber - 1
      const daysToAdd = sessionIndex * session.intervalDays
      
      const scheduledDate = new Date(firstStartTime)
      scheduledDate.setDate(scheduledDate.getDate() + daysToAdd)
      
      const startTime = formatLocalDateTime(scheduledDate)
      const endTime = calculateSessionEndTime(startTime, session.duration)
      
      session.data_inicio = startTime
      session.data_fim = endTime
    })
  }

  const calculateSessionEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return ''
    const start = new Date(startTime)
    if (isNaN(start.getTime())) return ''
    const end = new Date(start.getTime() + durationMinutes * 60000)
    return formatLocalDateTime(end)
  }

  const renderSessionScheduling = () => {
    const sessions = getSessionsForSelectedItems()
    const currentSessionData = (formState as any).sessoes_agendamento || []
    
    if (sessions.length === 0) return null

    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Configure as datas e horários para cada sessão dos procedimentos e protocolos/pacotes selecionados.
        </div>
        
        {sessions.map((session: any, index: number) => {
          const sessionData = currentSessionData.find((s: any) => s.id === session.id) || session
          const startTime = sessionData.data_inicio
          const endTime = sessionData.data_fim || calculateSessionEndTime(startTime, session.duration)
          const typeLabel = session.type === 'package' ? 'Pacote' : 'Procedimento'
          
          return (
            <div key={session.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    {session.procedimentoNome} - Sessão {session.sessionNumber}/{session.totalSessions}
                  </h4>
                  <div className="text-xs text-muted-foreground mt-1">
                    {typeLabel} • Duração: {session.duration} min
                  </div>
                </div>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data/Hora Início</Label>
                  <DateTimePicker
                    value={startTime || ''}
                    onChange={(value) => {
                      updateSessionDataBatch(session.id, value || '', session.duration)
                    }}
                    label=""
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data/Hora Fim</Label>
                  <DateTimePicker
                    value={endTime || ''}
                    onChange={(value) => updateSessionData(session.id, 'data_fim', value || '')}
                    label=""
                    min={startTime}
                  />
                </div>
              </div>
              
              {session.interval && (
                <div className="text-xs text-muted-foreground">
                  Intervalo recomendado: {session.interval} ({session.intervalDays} dias)
                </div>
              )}
              
              {session.sessionNumber === 1 && session.totalSessions > 1 && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  💡 Configure a primeira sessão e as demais serão agendadas automaticamente respeitando o intervalo de {session.intervalDays} dias.
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Crie um novo agendamento clínico</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={onCreateAgendamento} disabled={createPending}>
              {createPending ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-titulo">Título *</Label>
              <Input
                id="create-titulo"
                value={formState.titulo}
                onChange={(e) => setFormState({ ...formState, titulo: e.target.value })}
                placeholder="Ex: Consulta de avaliação"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <input
                  id="create-is-avaliacao"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={Boolean(formState.is_avaliacao)}
                  onChange={(e) => {
                    const newTitle = generateTitle(
                      e.target.checked,
                      formState.paciente_id || null,
                      normalizeIdArray((formState as any).procedimentos_ids),
                      normalizeIdArray((formState as any).protocolos_pacotes_ids),
                      formState.profissional_id || null
                    )
                    setFormState({ ...formState, is_avaliacao: e.target.checked, titulo: newTitle })
                  }}
                />
                <Label htmlFor="create-is-avaliacao" className="text-sm">
                  Agendamento é uma avaliação
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-valor">Valor</Label>
                <Input
                  id="create-valor"
                  type="number"
                  inputMode="decimal"
                  value={formState.valor === null || typeof formState.valor === 'undefined' ? '' : String(formState.valor)}
                  disabled
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-paciente">Paciente</Label>
                <Select
                  value={formState.paciente_id || 'none'}
                  onValueChange={(v) => {
                    const newPacienteId = v === 'none' ? null : v
                    const newTitle = generateTitle(
                      Boolean(formState.is_avaliacao),
                      newPacienteId,
                      normalizeIdArray((formState as any).procedimentos_ids),
                      normalizeIdArray((formState as any).protocolos_pacotes_ids),
                      formState.profissional_id || null
                    )
                    setFormState({ ...formState, paciente_id: newPacienteId, titulo: newTitle })
                  }}
                >
                  <SelectTrigger id="create-paciente">
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-profissional">Profissional</Label>
                <Select
                  value={formState.profissional_id || 'none'}
                  onValueChange={(v) => {
                    const newProfissionalId = v === 'none' ? null : v
                    const newTitle = generateTitle(
                      Boolean(formState.is_avaliacao),
                      formState.paciente_id || null,
                      normalizeIdArray((formState as any).procedimentos_ids),
                      normalizeIdArray((formState as any).protocolos_pacotes_ids),
                      newProfissionalId
                    )
                    setFormState({ ...formState, profissional_id: newProfissionalId, titulo: newTitle })
                  }}
                >
                  <SelectTrigger id="create-profissional">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Procedimentos</Label>
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v !== 'none') {
                      toggleCreateProcedimento(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar procedimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecionar procedimentos</SelectItem>
                    {procedimentos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {normalizeIdArray((formState as any).procedimentos_ids).length > 0 && (
                  <div className="space-y-2">
                    {normalizeIdArray((formState as any).procedimentos_ids).map((id: string) => {
                      const proc = procedimentos.find((p: any) => p.id === id)
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/20">
                          <span className="text-sm font-medium">{proc?.nome || id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCreateProcedimento(id)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Protocolos/Pacotes</Label>
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v !== 'none') {
                      toggleCreatePacote(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar pacotes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecionar pacotes</SelectItem>
                    {protocolosPacotes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {normalizeIdArray((formState as any).protocolos_pacotes_ids).length > 0 && (
                  <div className="space-y-2">
                    {normalizeIdArray((formState as any).protocolos_pacotes_ids).map((id: string) => {
                      const pack = protocolosPacotes.find((p: any) => p.id === id)
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/20">
                          <span className="text-sm font-medium">{pack?.nome || id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCreatePacote(id)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {normalizeIdArray((formState as any).protocolos_pacotes_ids).length > 0 && !formState.paciente_id && (
                  <p className="text-xs text-muted-foreground">Selecione um paciente para vincular os pacotes.</p>
                )}
              </div>

              {/* Session Scheduling Interface */}
              {(normalizeIdArray((formState as any).protocolos_pacotes_ids).length > 0 || 
                normalizeIdArray((formState as any).procedimentos_ids).length > 0) && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Agendamento das Sessões</Label>
                  {renderSessionScheduling()}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <DateTimePicker
                  value={formState.data_inicio || ''}
                  onChange={(value) => {
                    const currentDuration = getDurationFromTimes(formState.data_inicio, formState.data_fim)
                    const newEndTime = calculateEndTime(value, currentDuration)
                    setFormState({ 
                      ...formState, 
                      data_inicio: value,
                      data_fim: newEndTime || formState.data_fim
                    })
                  }}
                  label="Data/Hora Início"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Duração (min) *</Label>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    value={getDurationFromTimes(formState.data_inicio, formState.data_fim)}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value) || 60
                      const newEndTime = calculateEndTime(formState.data_inicio, duration)
                      if (newEndTime) {
                        setFormState({ ...formState, data_fim: newEndTime })
                      }
                    }}
                    placeholder="60"
                    className="text-center text-sm h-8"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[15, 30, 45, 60, 90, 120].map((minutes) => (
                      <Button
                        key={minutes}
                        type="button"
                        variant={getDurationFromTimes(formState.data_inicio, formState.data_fim) === minutes ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newEndTime = calculateEndTime(formState.data_inicio, minutes)
                          if (newEndTime) {
                            setFormState({ ...formState, data_fim: newEndTime })
                          }
                        }}
                        className="text-xs h-6 px-2"
                      >
                        {minutes}min
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✓ Duração: {getDurationFromTimes(formState.data_inicio, formState.data_fim)} minutos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <DateTimePicker
                  value={formState.data_fim || ''}
                  onChange={(value) => setFormState({ ...formState, data_fim: value })}
                  label="Data/Hora Fim"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-sala">Sala/Consultório</Label>
                <Input
                  id="create-sala"
                  value={formState.sala || ''}
                  onChange={(e) => setFormState({ ...formState, sala: e.target.value })}
                  placeholder="Ex: Sala 1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-status">Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(v) =>
                    setFormState({ ...formState, status: v as StatusAgendamentoClinica })
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
              <Label htmlFor="create-descricao">Descrição</Label>
              <Textarea
                id="create-descricao"
                value={formState.descricao || ''}
                onChange={(e) => setFormState({ ...formState, descricao: e.target.value })}
                placeholder="Detalhes do agendamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreateAgendamento} disabled={createPending}>
              {createPending ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAgendamento && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAgendamento.titulo}
                  <Badge variant={STATUS_CONFIG[selectedAgendamento.status].variant}>
                    {STATUS_CONFIG[selectedAgendamento.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>Detalhes do agendamento clínico</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Data/Hora Início</Label>
                    <p className="font-medium">{formatDateTime(selectedAgendamento.data_inicio)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data/Hora Fim</Label>
                    <p className="font-medium">{formatDateTime(selectedAgendamento.data_fim)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Avaliação</Label>
                    <p className="font-medium">{selectedAgendamento.is_avaliacao ? 'Sim' : 'Não'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Valor</Label>
                    <p className="font-medium">
                      {typeof selectedAgendamento.valor === 'number'
                        ? selectedAgendamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </p>
                  </div>
                </div>

                {selectedAgendamento.paciente && (
                  <div>
                    <Label className="text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{selectedAgendamento.paciente.nome_completo}</p>
                    {selectedAgendamento.paciente.telefone && (
                      <p className="text-sm text-muted-foreground">
                        {selectedAgendamento.paciente.telefone}
                      </p>
                    )}
                  </div>
                )}

                {selectedAgendamento.profissional && (
                  <div>
                    <Label className="text-muted-foreground">Profissional</Label>
                    <p className="font-medium">{selectedAgendamento.profissional.nome}</p>
                    {selectedAgendamento.profissional.conselho && (
                      <p className="text-sm text-muted-foreground">
                        {selectedAgendamento.profissional.conselho}
                      </p>
                    )}
                  </div>
                )}

                {selectedAgendamento.sala && (
                  <div>
                    <Label className="text-muted-foreground">Sala/Consultório</Label>
                    <p className="font-medium">{selectedAgendamento.sala}</p>
                  </div>
                )}

                {selectedAgendamento.descricao && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="font-medium whitespace-pre-wrap">{selectedAgendamento.descricao}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Atualizar Status</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <Button
                        key={key}
                        variant={selectedAgendamento.status === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onUpdateStatus(key as StatusAgendamentoClinica)}
                        disabled={updateStatusPending}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                  Fechar
                </Button>
                <Button variant="outline" onClick={onOpenEditModal}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={onRequestDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Atualize as informações do agendamento</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button onClick={onSaveEdit} disabled={updatePending}>
              {updatePending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-titulo">Título *</Label>
              <Input
                id="edit-titulo"
                value={editFormState.titulo}
                onChange={(e) => setEditFormState({ ...editFormState, titulo: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <input
                  id="edit-is-avaliacao"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={Boolean(editFormState.is_avaliacao)}
                  onChange={(e) => {
                    const newTitle = generateTitle(
                      e.target.checked,
                      editFormState.paciente_id || null,
                      normalizeIdArray((editFormState as any).procedimentos_ids),
                      normalizeIdArray((editFormState as any).protocolos_pacotes_ids),
                      editFormState.profissional_id || null
                    )
                    setEditFormState({ ...editFormState, is_avaliacao: e.target.checked, titulo: newTitle })
                  }}
                />
                <Label htmlFor="edit-is-avaliacao" className="text-sm">
                  Agendamento é uma avaliação
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-valor">Valor</Label>
                <Input
                  id="edit-valor"
                  type="number"
                  inputMode="decimal"
                  value={editFormState.valor === null || typeof editFormState.valor === 'undefined' ? '' : String(editFormState.valor)}
                  disabled
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-paciente">Paciente</Label>
                <Select
                  value={editFormState.paciente_id || 'none'}
                  onValueChange={(v) => {
                    const newPacienteId = v === 'none' ? null : v
                    const newTitle = generateTitle(
                      Boolean(editFormState.is_avaliacao),
                      newPacienteId,
                      normalizeIdArray((editFormState as any).procedimentos_ids),
                      normalizeIdArray((editFormState as any).protocolos_pacotes_ids),
                      editFormState.profissional_id || null
                    )
                    setEditFormState({ ...editFormState, paciente_id: newPacienteId, titulo: newTitle })
                  }}
                >
                  <SelectTrigger id="edit-paciente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-profissional">Profissional</Label>
                <Select
                  value={editFormState.profissional_id || 'none'}
                  onValueChange={(v) => {
                    const newProfissionalId = v === 'none' ? null : v
                    const newTitle = generateTitle(
                      Boolean(editFormState.is_avaliacao),
                      editFormState.paciente_id || null,
                      normalizeIdArray((editFormState as any).procedimentos_ids),
                      normalizeIdArray((editFormState as any).protocolos_pacotes_ids),
                      newProfissionalId
                    )
                    setEditFormState({ ...editFormState, profissional_id: newProfissionalId, titulo: newTitle })
                  }}
                >
                  <SelectTrigger id="edit-profissional">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Procedimentos</Label>
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v !== 'none') {
                      toggleEditProcedimento(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar procedimentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecionar procedimentos</SelectItem>
                    {procedimentos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {normalizeIdArray((editFormState as any).procedimentos_ids).length > 0 && (
                  <div className="space-y-2">
                    {normalizeIdArray((editFormState as any).procedimentos_ids).map((id: string) => {
                      const proc = procedimentos.find((p: any) => p.id === id)
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/20">
                          <span className="text-sm font-medium">{proc?.nome || id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditProcedimento(id)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Protocolos/Pacotes</Label>
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v !== 'none') {
                      toggleEditPacote(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar pacotes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecionar pacotes</SelectItem>
                    {protocolosPacotes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {normalizeIdArray((editFormState as any).protocolos_pacotes_ids).length > 0 && (
                  <div className="space-y-2">
                    {normalizeIdArray((editFormState as any).protocolos_pacotes_ids).map((id: string) => {
                      const pack = protocolosPacotes.find((p: any) => p.id === id)
                      return (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-md border p-2 bg-muted/20">
                          <span className="text-sm font-medium">{pack?.nome || id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEditPacote(id)}
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {normalizeIdArray((editFormState as any).protocolos_pacotes_ids).length > 0 && !editFormState.paciente_id && (
                  <p className="text-xs text-muted-foreground">Selecione um paciente para vincular os pacotes.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <DateTimePicker
                  value={editFormState.data_inicio || ''}
                  onChange={(value) => {
                    const currentDuration = getDurationFromTimes(editFormState.data_inicio, editFormState.data_fim)
                    const newEndTime = calculateEndTime(value, currentDuration)
                    setEditFormState({ 
                      ...editFormState, 
                      data_inicio: value,
                      data_fim: newEndTime || editFormState.data_fim
                    })
                  }}
                  label="Data/Hora Início"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Duração (min) *</Label>
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="15"
                    max="480"
                    value={getDurationFromTimes(editFormState.data_inicio, editFormState.data_fim)}
                    onChange={(e) => {
                      const duration = parseInt(e.target.value) || 60
                      const newEndTime = calculateEndTime(editFormState.data_inicio, duration)
                      if (newEndTime) {
                        setEditFormState({ ...editFormState, data_fim: newEndTime })
                      }
                    }}
                    placeholder="60"
                    className="text-center text-sm h-8"
                  />
                  <div className="flex flex-wrap gap-1">
                    {[15, 30, 45, 60, 90, 120].map((minutes) => (
                      <Button
                        key={minutes}
                        type="button"
                        variant={getDurationFromTimes(editFormState.data_inicio, editFormState.data_fim) === minutes ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newEndTime = calculateEndTime(editFormState.data_inicio, minutes)
                          if (newEndTime) {
                            setEditFormState({ ...editFormState, data_fim: newEndTime })
                          }
                        }}
                        className="text-xs h-6 px-2"
                      >
                        {minutes}min
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✓ Duração: {getDurationFromTimes(editFormState.data_inicio, editFormState.data_fim)} minutos
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <DateTimePicker
                  value={editFormState.data_fim || ''}
                  onChange={(value) => setEditFormState({ ...editFormState, data_fim: value })}
                  label="Data/Hora Fim"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-sala">Sala/Consultório</Label>
                <Input
                  id="edit-sala"
                  value={editFormState.sala || ''}
                  onChange={(e) => setEditFormState({ ...editFormState, sala: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormState.status}
                  onValueChange={(v) =>
                    setEditFormState({ ...editFormState, status: v as StatusAgendamentoClinica })
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
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={editFormState.descricao || ''}
                onChange={(e) => setEditFormState({ ...editFormState, descricao: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSaveEdit} disabled={updatePending}>
              {updatePending ? 'Salvando...' : 'Salvar Alterações'}
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
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={deletePending}>
              {deletePending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
