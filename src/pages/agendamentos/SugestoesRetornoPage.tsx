import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAgendamentosClinica } from '@/hooks/useAgendamentosClinica'

export function SugestoesRetornoPage() {
  const { data: agendamentos } = useAgendamentosClinica({})

  const formatDateTime = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return iso
    }
  }

  const retornoSuggestions = useMemo(() => {
    const now = new Date()
    const candidates = agendamentos
      .filter((a) => a.status === 'concluido')
      .map((a) => {
        const end = new Date(a.data_fim)
        const follow = new Date(end)
        follow.setDate(follow.getDate() + 30)
        return {
          agendamento: a,
          follow,
        }
      })
      .filter((c) => c.follow <= now)
      .sort((a, b) => b.follow.getTime() - a.follow.getTime())
      .slice(0, 8)

    return candidates
  }, [agendamentos])

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sugestões automáticas de retorno
          </h2>
          <p className="text-sm text-muted-foreground">
            Sugestões geradas a partir de atendimentos concluídos (ex.: retorno em 30 dias).
          </p>
        </div>
        <div>
          {retornoSuggestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma sugestão no momento. Para gerar sugestões, conclua um atendimento (status: Concluído).
            </div>
          ) : (
            <div className="space-y-3">
              {retornoSuggestions.map(({ agendamento, follow }) => (
                <div key={agendamento.id} className="rounded-xl border p-3">
                  <div className="font-medium truncate">
                    {agendamento.paciente?.nome_completo || agendamento.titulo}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Último: {formatDateTime(agendamento.data_fim)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Sugestão: {format(follow, 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = '/app/agendamentos'
                      }}
                    >
                      Ir para Agenda
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
