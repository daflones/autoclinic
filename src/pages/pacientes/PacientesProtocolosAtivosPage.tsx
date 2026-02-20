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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Package,
  User,
  Edit,
  Trash2,
  ExternalLink,
  DollarSign,
  Calendar
} from 'lucide-react'
import { usePlanosTratamento, useUpdatePlanoTratamento, useDeletePlanoTratamento } from '@/hooks/usePlanosTratamento'
import { type StatusPlanoTratamento } from '@/services/api/planos-tratamento'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function PacientesProtocolosAtivosPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPlano, setEditingPlano] = useState<any>(null)
  const [editStatus, setEditStatus] = useState<StatusPlanoTratamento>('aprovado')
  const [editTotalPrevisto, setEditTotalPrevisto] = useState('')
  const [editTotalPago, setEditTotalPago] = useState('')
  const [deletePlanoId, setDeletePlanoId] = useState<string | null>(null)

  const updatePlano = useUpdatePlanoTratamento()
  const deletePlano = useDeletePlanoTratamento()

  // Buscar planos ativos com protocolo
  const { data: planos = [], isLoading } = usePlanosTratamento({
    search: searchTerm.trim() || undefined,
    limit: 100,
  })

  // Filtrar apenas planos ativos com protocolo_pacote_id
  const planosAtivos = useMemo(() => {
    return planos.filter(plano => {
      const temProtocolo = Boolean(plano.protocolo_pacote_id)
      const statusAtivo = plano.status === 'aprovado' || plano.status === 'em_execucao'
      return temProtocolo && statusAtivo
    })
  }, [planos])

  // Agrupar por paciente
  const pacientesComProtocolos = useMemo(() => {
    const grupos = new Map()
    
    planosAtivos.forEach(plano => {
      const pacienteId = plano.paciente_id
      if (!grupos.has(pacienteId)) {
        grupos.set(pacienteId, {
          paciente: plano.paciente!,
          planos: []
        })
      }
      grupos.get(pacienteId).planos.push(plano)
    })

    return Array.from(grupos.values()).sort((a, b) => 
      a.paciente.nome_completo.localeCompare(b.paciente.nome_completo)
    )
  }, [planosAtivos])

  const handleEditPlano = (plano: any) => {
    setEditingPlano(plano)
    setEditStatus(plano.status)
    setEditTotalPrevisto(String(plano.total_previsto || 0))
    setEditTotalPago(String(plano.total_pago || 0))
  }

  const handleSaveEdit = async () => {
    if (!editingPlano) return

    try {
      const totalPrevisto = parseFloat(editTotalPrevisto) || 0
      const totalPago = parseFloat(editTotalPago) || 0

      await updatePlano.mutateAsync({
        id: editingPlano.id,
        data: {
          status: editStatus,
          total_previsto: totalPrevisto,
          total_pago: totalPago,
        }
      })

      setEditingPlano(null)
      toast.success('Plano atualizado com sucesso!')
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDeletePlano = async () => {
    if (!deletePlanoId) return
    
    try {
      await deletePlano.mutateAsync(deletePlanoId)
      setDeletePlanoId(null)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleViewPaciente = (pacienteId: string) => {
    navigate(`/app/pacientes?view=${pacienteId}`)
  }

  const handleViewPlanoDetails = (planoId: string) => {
    navigate(`/app/planos-tratamento?view=${planoId}`)
  }

  const getStatusBadge = (status: StatusPlanoTratamento) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
      case 'em_execucao':
        return <Badge className="bg-blue-100 text-blue-800">Em Execução</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateStr
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
            <Package className="h-8 w-8 text-primary" />
            Pacientes com Protocolos Ativos
          </h1>
          <p className="text-muted-foreground mt-1">
            Pacientes com planos de tratamento ativos vinculados a protocolos/pacotes
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm">Buscar paciente</Label>
            <Input
              id="search"
              placeholder="Nome do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                <p className="text-2xl font-bold">{pacientesComProtocolos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Planos Ativos</p>
                <p className="text-2xl font-bold">{planosAtivos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(planosAtivos.reduce((sum, plano) => sum + (plano.total_previsto || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pacientes */}
      <div className="space-y-4">
        {pacientesComProtocolos.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum paciente encontrado</h3>
              <p className="text-muted-foreground">
                Não há pacientes com protocolos ativos no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          pacientesComProtocolos.map(({ paciente, planos }) => (
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
                        {planos.length} plano{planos.length !== 1 ? 's' : ''} ativo{planos.length !== 1 ? 's' : ''}
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
                  {planos.map((plano: any) => (
                    <div key={plano.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{plano.titulo}</h4>
                          {getStatusBadge(plano.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Criado em {formatDate(plano.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Previsto: {formatCurrency(plano.total_previsto || 0)}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Pago: {formatCurrency(plano.total_pago || 0)}
                          </div>
                        </div>
                        {plano.descricao && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {plano.descricao}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPlanoDetails(plano.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPlano(plano)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Plano</DialogTitle>
                              <DialogDescription>
                                Altere o status e valores do plano de tratamento.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
<Label className="text-sm">Status</Label>
                                <Select value={editStatus} onValueChange={(value: StatusPlanoTratamento) => setEditStatus(value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="aprovado">Aprovado</SelectItem>
                                    <SelectItem value="em_execucao">Em Execução</SelectItem>
                                    <SelectItem value="concluido">Concluído</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
<Label className="text-sm">Total Previsto (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editTotalPrevisto}
                                  onChange={(e) => setEditTotalPrevisto(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
<Label className="text-sm">Total Pago (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editTotalPago}
                                  onChange={(e) => setEditTotalPago(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingPlano(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleSaveEdit} disabled={updatePlano.isPending}>
                                Salvar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletePlanoId(plano.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este plano de tratamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeletePlanoId(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeletePlano}
                                disabled={deletePlano.isPending}
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
