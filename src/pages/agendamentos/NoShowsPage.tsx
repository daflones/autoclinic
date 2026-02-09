import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAgendamentosClinica } from '@/hooks/useAgendamentosClinica'

export function NoShowsPage() {
  const { data: agendamentos } = useAgendamentosClinica({})

  const noShows = useMemo(
    () => agendamentos.filter((a) => a.status === 'nao_compareceu'),
    [agendamentos]
  )

  const formatDateTime = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            No-shows
          </h2>
          <p className="text-sm text-muted-foreground">Agendamentos marcados como "Não Compareceu".</p>
        </div>
        <div>
          {noShows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum no-show registrado.</div>
          ) : (
            <div className="space-y-3">
              {noShows.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{agendamento.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(agendamento.data_inicio)}
                      {agendamento.paciente?.nome_completo ? ` • ${agendamento.paciente.nome_completo}` : ''}
                    </div>
                  </div>
                  <Badge variant="destructive">No-show</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
