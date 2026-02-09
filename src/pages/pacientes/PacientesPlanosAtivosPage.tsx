import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, User, Calendar, DollarSign, FileText, Eye, Edit, Trash2 } from 'lucide-react'
import { usePlanosTratamento } from '@/hooks/usePlanosTratamento'
import { usePacientes } from '@/hooks/usePacientes'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
  em_aprovacao: { label: 'Em Aprovação', variant: 'outline' as const, color: 'bg-yellow-100 text-yellow-800' },
  aprovado: { label: 'Aprovado', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
  em_execucao: { label: 'Em Execução', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  concluido: { label: 'Concluído', variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800' },
  pausado: { label: 'Pausado', variant: 'outline' as const, color: 'bg-orange-100 text-orange-800' },
  cancelado: { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' },
}

export function PacientesPlanosAtivosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlano, setSelectedPlano] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { data: planosTratamento = [], isLoading: isLoadingPlanos } = usePlanosTratamento({
    limit: 1000
  })
  const { data: pacientes = [] } = usePacientes({ limit: 1000 })

  const pacientesMap = useMemo(() => {
    const map = new Map()
    pacientes.forEach((p: any) => map.set(p.id, p))
    return map
  }, [pacientes])

  const filteredPlanos = useMemo(() => {
    const activeStatuses = ['aprovado', 'em_execucao', 'concluido']
    return planosTratamento.filter((plano: any) => {
      // First filter by active statuses
      if (!activeStatuses.includes(plano.status)) {
        return false
      }
      
      // Then filter by search term
      const paciente = pacientesMap.get(plano.paciente_id)
      const searchLower = searchTerm.toLowerCase()
      return (
        plano.titulo?.toLowerCase().includes(searchLower) ||
        paciente?.nome_completo?.toLowerCase().includes(searchLower) ||
        plano.observacoes?.toLowerCase().includes(searchLower)
      )
    })
  }, [planosTratamento, pacientesMap, searchTerm])

  const handleViewDetails = (plano: any) => {
    setSelectedPlano(plano)
    setIsDetailsOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return 'Data inválida'
    }
  }

  if (isLoadingPlanos) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando planos ativos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planos Ativos</h1>
          <p className="text-muted-foreground">
            Visualize todos os planos de tratamento ativos dos pacientes
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Planos de Tratamento Ativos
          </CardTitle>
          <CardDescription>
            Lista completa de todos os planos de tratamento em andamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, título do plano ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredPlanos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum plano ativo encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Não há planos de tratamento ativos no momento.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlanos.map((plano: any) => {
                const paciente = pacientesMap.get(plano.paciente_id)
                const statusConfig = STATUS_CONFIG[plano.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.aprovado

                return (
                  <Card key={plano.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-lg">{plano.titulo}</h3>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{paciente?.nome_completo || 'Paciente não encontrado'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Criado em {formatDate(plano.created_at)}</span>
                            </div>
                            {plano.valor_previsto && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>{formatCurrency(plano.valor_previsto)}</span>
                              </div>
                            )}
                          </div>

                          {plano.observacoes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {plano.observacoes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(plano)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Plano de Tratamento</DialogTitle>
            <DialogDescription>
              Informações completas sobre o plano de tratamento
            </DialogDescription>
          </DialogHeader>

          {selectedPlano && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Informações Básicas</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Título:</strong> {selectedPlano.titulo}</div>
                    <div><strong>Paciente:</strong> {pacientesMap.get(selectedPlano.paciente_id)?.nome_completo}</div>
                    <div><strong>Status:</strong> 
                      <Badge className={`ml-2 ${STATUS_CONFIG[selectedPlano.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_CONFIG[selectedPlano.status as keyof typeof STATUS_CONFIG]?.label || selectedPlano.status}
                      </Badge>
                    </div>
                    <div><strong>Data de Criação:</strong> {formatDate(selectedPlano.created_at)}</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Valores</h4>
                  <div className="space-y-2 text-sm">
                    {selectedPlano.valor_previsto && (
                      <div><strong>Valor Previsto:</strong> {formatCurrency(selectedPlano.valor_previsto)}</div>
                    )}
                    {selectedPlano.valor_pago && (
                      <div><strong>Valor Pago:</strong> {formatCurrency(selectedPlano.valor_pago)}</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedPlano.observacoes && (
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {selectedPlano.observacoes}
                  </p>
                </div>
              )}

              {selectedPlano.protocolo_pacote && (
                <div>
                  <h4 className="font-semibold mb-2">Protocolo/Pacote</h4>
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <strong>{selectedPlano.protocolo_pacote.nome}</strong>
                    {selectedPlano.protocolo_pacote.descricao && (
                      <p className="mt-1 text-muted-foreground">
                        {selectedPlano.protocolo_pacote.descricao}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
