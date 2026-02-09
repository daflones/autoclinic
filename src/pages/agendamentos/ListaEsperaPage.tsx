import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  useListaEsperaAgendamentos,
  useCreateListaEsperaAgendamento,
  useUpdateListaEsperaAgendamento,
  useDeleteListaEsperaAgendamento,
} from '@/hooks/useListaEsperaAgendamentos'
import { usePacientes } from '@/hooks/usePacientes'
import type {
  ListaEsperaPrioridade,
  ListaEsperaStatus,
} from '@/services/api/lista-espera-agendamentos'

export function ListaEsperaPage() {
  const { data: pacientes } = usePacientes({ limit: 1000 })
  const { data: waitlistQuery } = useListaEsperaAgendamentos({ limit: 200 })
  const createWaitlistMutation = useCreateListaEsperaAgendamento()
  const updateWaitlistMutation = useUpdateListaEsperaAgendamento()
  const deleteWaitlistMutation = useDeleteListaEsperaAgendamento()

  const [waitlistForm, setWaitlistForm] = useState({
    paciente_id: 'none',
    nome_paciente: '',
    telefone: '',
    procedimento_id: 'none',
    preferencia_horario: '',
    prioridade: 'media' as ListaEsperaPrioridade,
    observacoes: '',
  })

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Lista de espera
          </h2>
          <p className="text-sm text-muted-foreground">
            Registre pacientes interessados quando não há horário disponível. Use prioridade e status para organizar.
          </p>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Paciente cadastrado (opcional)</Label>
                <Select value={waitlistForm.paciente_id} onValueChange={(v) => setWaitlistForm((s) => ({ ...s, paciente_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Procedimento desejado (opcional)</Label>
                <Input
                  value={waitlistForm.procedimento_id === 'none' ? '' : waitlistForm.procedimento_id}
                  onChange={(e) => setWaitlistForm((s) => ({ ...s, procedimento_id: e.target.value || 'none' }))}
                  placeholder="(por enquanto: informe o ID do procedimento)"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome (se não cadastrado)</Label>
                <Input value={waitlistForm.nome_paciente} onChange={(e) => setWaitlistForm((s) => ({ ...s, nome_paciente: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={waitlistForm.telefone} onChange={(e) => setWaitlistForm((s) => ({ ...s, telefone: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Preferência de horário</Label>
                <Input value={waitlistForm.preferencia_horario} onChange={(e) => setWaitlistForm((s) => ({ ...s, preferencia_horario: e.target.value }))} placeholder="Ex: manhã, tarde, seg/qua" />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={waitlistForm.prioridade} onValueChange={(v) => setWaitlistForm((s) => ({ ...s, prioridade: v as ListaEsperaPrioridade }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={waitlistForm.observacoes} onChange={(e) => setWaitlistForm((s) => ({ ...s, observacoes: e.target.value }))} rows={3} />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={async () => {
                  if (waitlistForm.paciente_id === 'none' && !waitlistForm.nome_paciente.trim()) {
                    toast.error('Informe um paciente ou o nome')
                    return
                  }

                  await createWaitlistMutation.mutateAsync({
                    paciente_id: waitlistForm.paciente_id === 'none' ? null : waitlistForm.paciente_id,
                    nome_paciente: waitlistForm.nome_paciente || null,
                    telefone: waitlistForm.telefone || null,
                    procedimento_id: waitlistForm.procedimento_id === 'none' ? null : waitlistForm.procedimento_id,
                    preferencia_horario: waitlistForm.preferencia_horario || null,
                    prioridade: waitlistForm.prioridade,
                    status: 'aguardando',
                    observacoes: waitlistForm.observacoes || null,
                  })

                  setWaitlistForm({
                    paciente_id: 'none',
                    nome_paciente: '',
                    telefone: '',
                    procedimento_id: 'none',
                    preferencia_horario: '',
                    prioridade: 'media',
                    observacoes: '',
                  })
                }}
                disabled={createWaitlistMutation.isPending}
              >
                {createWaitlistMutation.isPending ? 'Adicionando...' : 'Adicionar'}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Fila ({waitlistQuery?.count ?? 0})</div>
            {waitlistQuery?.data?.length ? (
              <div className="space-y-2">
                {waitlistQuery.data.map((item) => {
                  const nome = item.paciente?.nome_completo || item.nome_paciente || 'Sem nome'
                  const statusLabel: Record<ListaEsperaStatus, string> = {
                    aguardando: 'Aguardando',
                    contatado: 'Contatado',
                    agendado: 'Agendado',
                    cancelado: 'Cancelado',
                  }

                  const prioLabel: Record<ListaEsperaPrioridade, string> = {
                    alta: 'Alta',
                    media: 'Média',
                    baixa: 'Baixa',
                  }

                  return (
                    <div key={item.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.preferencia_horario ? item.preferencia_horario : 'Sem preferência'}
                            {item.telefone ? ` • ${item.telefone}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{prioLabel[item.prioridade]}</Badge>
                          <Badge variant="secondary">{statusLabel[item.status]}</Badge>
                        </div>
                      </div>

                      {item.observacoes ? (
                        <div className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{item.observacoes}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateWaitlistMutation.mutate({ id: item.id, data: { status: 'contatado' } })}
                        >
                          Marcar contatado
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => updateWaitlistMutation.mutate({ id: item.id, data: { status: 'cancelado' } })}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteWaitlistMutation.mutate(item.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum item na lista de espera.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
