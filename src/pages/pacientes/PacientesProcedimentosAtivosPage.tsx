import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Calendar,
  Clock,
  User,
  Sparkles,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { useAgendamentosClinica, useDeleteAgendamentoClinica } from '@/hooks/useAgendamentosClinica'
import { type AgendamentoClinica } from '@/services/api/agendamentos-clinica'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

type PeriodoFiltro = '30' | '60' | '90' | '365' | 'todos'

export function PacientesProcedimentosAtivosPage() {
  const navigate = useNavigate()
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('90')
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteAgendamentoId, setDeleteAgendamentoId] = useState<string | null>(null)

  const deleteAgendamento = useDeleteAgendamentoClinica()

  // Calcular data de início baseada no período
  const dataInicio = useMemo(() => {
    if (periodoFiltro === 'todos') return undefined
    const dias = parseInt(periodoFiltro)
    return format(subDays(new Date(), dias), 'yyyy-MM-dd')
  }, [periodoFiltro])

  // Buscar agendamentos concluídos com procedimentos
  const { data: agendamentos = [], isLoading } = useAgendamentosClinica({
    status: 'concluido',
    data_inicio: dataInicio,
    search: searchTerm.trim() || undefined,
    limit: 100,
  })

  // Filtrar apenas agendamentos que têm procedimentos e paciente
  const agendamentosComProcedimentos = useMemo(() => {
    return agendamentos.filter((agendamento: AgendamentoClinica) => {
      const temPaciente = Boolean(agendamento.paciente_id && agendamento.paciente)
      const temProcedimento = Boolean(
        agendamento.procedimento_id || 
        (Array.isArray(agendamento.procedimentos_ids) && agendamento.procedimentos_ids.length > 0)
      )
      return temPaciente && temProcedimento
    })
  }, [agendamentos])

  // Agrupar por paciente
  const pacientesComProcedimentos = useMemo(() => {
    const grupos = new Map()
    
    agendamentosComProcedimentos.forEach(agendamento => {
      const pacienteId = agendamento.paciente_id!
      if (!grupos.has(pacienteId)) {
        grupos.set(pacienteId, {
          paciente: agendamento.paciente!,
          agendamentos: []
        })
      }
      grupos.get(pacienteId).agendamentos.push(agendamento)
    })

    return Array.from(grupos.values()).sort((a, b) => 
      a.paciente.nome_completo.localeCompare(b.paciente.nome_completo)
    )
  }, [agendamentosComProcedimentos])

  const handleDeleteAgendamento = async () => {
    if (!deleteAgendamentoId) return
    
    try {
      await deleteAgendamento.mutateAsync(deleteAgendamentoId)
      setDeleteAgendamentoId(null)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleEditAgendamento = (agendamentoId: string) => {
    // Navegar para página de agendamentos com o ID selecionado
    navigate(`/app/agendamentos?edit=${agendamentoId}`)
  }

  const handleViewPaciente = (pacienteId: string) => {
    // Navegar para página de pacientes com o paciente selecionado
    navigate(`/app/pacientes?view=${pacienteId}`)
  }

  const formatDataHora = (dataStr: string) => {
    try {
      return format(new Date(dataStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dataStr
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Pacientes com Procedimentos Ativos
          </h1>
          <p className="text-muted-foreground mt-1">
            Pacientes com agendamentos concluídos que possuem procedimentos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo" className="text-sm">Período</Label>
              <Select value={periodoFiltro} onValueChange={(value: PeriodoFiltro) => setPeriodoFiltro(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="todos">Todos os períodos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm">Buscar paciente</Label>
              <Input
                id="search"
                placeholder="Nome do paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Pacientes</p>
                <p className="text-2xl font-bold">{pacientesComProcedimentos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-2xl font-bold">{agendamentosComProcedimentos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="text-lg font-semibold">
                  {periodoFiltro === 'todos' ? 'Todos' : `${periodoFiltro} dias`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pacientes */}
      <div className="space-y-4">
        {pacientesComProcedimentos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum paciente encontrado</h3>
              <p className="text-muted-foreground">
                Não há pacientes com procedimentos concluídos no período selecionado.
              </p>
            </CardContent>
          </Card>
        ) : (
          pacientesComProcedimentos.map(({ paciente, agendamentos }) => (
            <Card key={paciente.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{paciente.nome_completo}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {agendamentos.length} procedimento{agendamentos.length !== 1 ? 's' : ''} concluído{agendamentos.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPaciente(paciente.id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Paciente
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agendamentos.map((agendamento: AgendamentoClinica) => (
                    <div key={agendamento.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{agendamento.titulo}</h4>
                          <Badge variant="secondary">Concluído</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDataHora(agendamento.data_inicio)}
                          </div>
                          {agendamento.profissional && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {agendamento.profissional.nome}
                            </div>
                          )}
                        </div>
                        {agendamento.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {agendamento.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAgendamento(agendamento.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteAgendamentoId(agendamento.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteAgendamentoId(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAgendamento}
                                disabled={deleteAgendamento.isPending}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
