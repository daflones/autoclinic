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
import { Edit, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

const toDateTimeLocalValue = (value: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const toUtcIsoFromLocalInput = (value: string) => {
  if (!value) return ''
  // value is local time without timezone (YYYY-MM-DDTHH:mm)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString()
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
  createProtocoloPacoteId: string
  setCreateProtocoloPacoteId: (value: string) => void
  editProtocoloPacoteId: string
  setEditProtocoloPacoteId: (value: string) => void
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
  createProtocoloPacoteId,
  setCreateProtocoloPacoteId,
  editProtocoloPacoteId,
  setEditProtocoloPacoteId,
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

  return (
    <>
      {/* Modal de Criação */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Crie um novo agendamento clínico</DialogDescription>
          </DialogHeader>

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
                  onChange={(e) => setFormState({ ...formState, is_avaliacao: e.target.checked })}
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
                  onChange={(e) => {
                    const raw = e.target.value
                    const next = raw === '' ? null : Number(raw)
                    setFormState({ ...formState, valor: Number.isFinite(next as number) ? (next as number) : null })
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-paciente">Paciente</Label>
                <Select
                  value={formState.paciente_id || 'none'}
                  onValueChange={(v) =>
                    setFormState({ ...formState, paciente_id: v === 'none' ? null : v })
                  }
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
                  onValueChange={(v) =>
                    setFormState({ ...formState, profissional_id: v === 'none' ? null : v })
                  }
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
                <Label htmlFor="create-procedimento">Procedimento</Label>
                <Select
                  value={formState.procedimento_id || 'none'}
                  onValueChange={(v) => {
                    const nextId = v === 'none' ? null : v
                    setCreateProtocoloPacoteId('none')
                    setFormState({
                      ...formState,
                      procedimento_id: nextId,
                      plano_tratamento_id: null,
                    })
                  }}
                >
                  <SelectTrigger id="create-procedimento">
                    <SelectValue placeholder="Selecione o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {procedimentos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-pacote">Pacote</Label>
                <Select
                  value={createProtocoloPacoteId || 'none'}
                  onValueChange={(v) => {
                    const nextId = v === 'none' ? 'none' : v
                    setCreateProtocoloPacoteId(nextId)
                    setFormState({
                      ...formState,
                      procedimento_id: null,
                      plano_tratamento_id: null,
                    })
                  }}
                >
                  <SelectTrigger id="create-pacote">
                    <SelectValue placeholder="Selecione o pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {protocolosPacotes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createProtocoloPacoteId && createProtocoloPacoteId !== 'none' && !formState.paciente_id && (
                  <p className="text-xs text-muted-foreground">Selecione um paciente para vincular o pacote.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-data-inicio">Data/Hora Início *</Label>
                <Input
                  id="create-data-inicio"
                  type="datetime-local"
                  value={toDateTimeLocalValue(formState.data_inicio)}
                  onChange={(e) =>
                    setFormState({ ...formState, data_inicio: toUtcIsoFromLocalInput(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-data-fim">Data/Hora Fim *</Label>
                <Input
                  id="create-data-fim"
                  type="datetime-local"
                  value={toDateTimeLocalValue(formState.data_fim)}
                  onChange={(e) => setFormState({ ...formState, data_fim: toUtcIsoFromLocalInput(e.target.value) })}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Atualize as informações do agendamento</DialogDescription>
          </DialogHeader>

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
                  onChange={(e) => setEditFormState({ ...editFormState, is_avaliacao: e.target.checked })}
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
                  onChange={(e) => {
                    const raw = e.target.value
                    const next = raw === '' ? null : Number(raw)
                    setEditFormState({ ...editFormState, valor: Number.isFinite(next as number) ? (next as number) : null })
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-paciente">Paciente</Label>
                <Select
                  value={editFormState.paciente_id || 'none'}
                  onValueChange={(v) =>
                    setEditFormState({ ...editFormState, paciente_id: v === 'none' ? null : v })
                  }
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
                  onValueChange={(v) =>
                    setEditFormState({ ...editFormState, profissional_id: v === 'none' ? null : v })
                  }
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
                <Label htmlFor="edit-procedimento">Procedimento</Label>
                <Select
                  value={editFormState.procedimento_id || 'none'}
                  onValueChange={(v) => {
                    const nextId = v === 'none' ? null : v
                    setEditProtocoloPacoteId('none')
                    setEditFormState({
                      ...editFormState,
                      procedimento_id: nextId,
                      plano_tratamento_id: null,
                    })
                  }}
                >
                  <SelectTrigger id="edit-procedimento">
                    <SelectValue placeholder="Selecione o procedimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {procedimentos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pacote">Pacote</Label>
                <Select
                  value={editProtocoloPacoteId || 'none'}
                  onValueChange={(v) => {
                    const nextId = v === 'none' ? 'none' : v
                    setEditProtocoloPacoteId(nextId)
                    setEditFormState({
                      ...editFormState,
                      procedimento_id: null,
                      plano_tratamento_id: editFormState.plano_tratamento_id ?? null,
                    })
                  }}
                >
                  <SelectTrigger id="edit-pacote">
                    <SelectValue placeholder="Selecione o pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {protocolosPacotes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editProtocoloPacoteId && editProtocoloPacoteId !== 'none' && !editFormState.paciente_id && (
                  <p className="text-xs text-muted-foreground">Selecione um paciente para vincular o pacote.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-data-inicio">Data/Hora Início *</Label>
                <Input
                  id="edit-data-inicio"
                  type="datetime-local"
                  value={toDateTimeLocalValue(editFormState.data_inicio)}
                  onChange={(e) =>
                    setEditFormState({ ...editFormState, data_inicio: toUtcIsoFromLocalInput(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-data-fim">Data/Hora Fim *</Label>
                <Input
                  id="edit-data-fim"
                  type="datetime-local"
                  value={toDateTimeLocalValue(editFormState.data_fim)}
                  onChange={(e) => setEditFormState({ ...editFormState, data_fim: toUtcIsoFromLocalInput(e.target.value) })}
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
