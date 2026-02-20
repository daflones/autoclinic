import { useState, useMemo } from 'react'
import { Plus, Search, AlertCircle, Clock, CheckCircle2, Loader2, User, Building, Edit, Eye, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useTickets, useCreateTicket, useUpdateTicket, useDeleteTicket, useTicketStats } from '@/hooks/useTickets'
import { useClientes } from '@/hooks/useClientes'
import { useVendedores } from '@/hooks/useVendedores'
import { SetorService } from '@/services/api/setores'
import { useQuery } from '@tanstack/react-query'
import type { TicketSuporte, TicketCreateData, TicketUpdateData, StatusTicket, PrioridadeTicket } from '@/types/ticket'
import { STATUS_LABELS, PRIORIDADE_LABELS, STATUS_COLORS, PRIORIDADE_COLORS } from '@/types/ticket'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export function TicketsSuportePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusTicket | 'todos'>('todos')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<TicketSuporte | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [formData, setFormData] = useState<Partial<TicketCreateData>>({
    titulo: '', descricao: '', cliente_id: '', vendedor_id: null, setor_id: null, prioridade: 'media', status: 'aberto',
  })

  const { data: tickets = [], isLoading } = useTickets(statusFilter !== 'todos' ? { status: statusFilter } : undefined)
  const { data: stats } = useTicketStats()
  const { data: clientes = [] } = useClientes({ page: 1, limit: 1000 })
  const { data: vendedores = [] } = useVendedores()
  const { data: setores = [] } = useQuery({ queryKey: ['setores'], queryFn: () => SetorService.getSetoresAtivos() })
  const createTicket = useCreateTicket()
  const updateTicket = useUpdateTicket()
  const deleteTicket = useDeleteTicket()

  const filteredTickets = tickets.filter((ticket: TicketSuporte) =>
    ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.cliente?.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredClientesSelect = useMemo(() => {
    if (!clientes) return []

    const term = clienteSearch.trim().toLowerCase()

    return clientes
      // evita opções em branco no select
      .filter((cliente: any) => !!cliente.nome_contato)
      .filter((cliente: any) => {
        if (!term) return true
        const nome = (cliente.nome_contato || '').toLowerCase()
        const empresa = (cliente.nome_empresa || '').toLowerCase()
        return nome.includes(term) || empresa.includes(term)
      })
  }, [clientes, clienteSearch])

  const handleCreateClick = () => {
    setFormData({ titulo: '', descricao: '', cliente_id: '', vendedor_id: null, setor_id: null, prioridade: 'media', status: 'aberto' })
    setIsCreateModalOpen(true)
  }

  const handleEditClick = (ticket: TicketSuporte) => {
    setSelectedTicket(ticket)
    setFormData({ titulo: ticket.titulo, descricao: ticket.descricao, cliente_id: ticket.cliente_id, vendedor_id: ticket.vendedor_id, setor_id: ticket.setor_id, prioridade: ticket.prioridade, status: ticket.status })
    setIsEditModalOpen(true)
  }

  const handleSubmitCreate = () => {
    if (!formData.titulo || !formData.descricao || !formData.cliente_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    createTicket.mutate(formData as TicketCreateData, { onSuccess: (response) => { if (!response.error) setIsCreateModalOpen(false) } })
  }

  const handleSubmitEdit = () => {
    if (!selectedTicket || !formData.titulo || !formData.descricao) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    updateTicket.mutate({ id: selectedTicket.id, data: formData as TicketUpdateData }, { onSuccess: (response) => { if (!response.error) setIsEditModalOpen(false) } })
  }

  const handleQuickStatusChange = (ticket: TicketSuporte, newStatus: StatusTicket) => {
    updateTicket.mutate({
      id: ticket.id,
      data: { status: newStatus },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tickets de Suporte</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie os tickets de suporte dos clientes</p>
        </div>
        <Button onClick={handleCreateClick} className="bg-gradient-to-r from-blue-600 to-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-gray-500">Total</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div><p className="text-2xl font-bold">{stats.abertos}</p><p className="text-sm text-gray-500">Abertos</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div><p className="text-2xl font-bold">{stats.em_andamento}</p><p className="text-sm text-gray-500">Em Andamento</p></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div><p className="text-2xl font-bold">{stats.resolvidos}</p><p className="text-sm text-gray-500">Resolvidos</p></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input placeholder="Buscar tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusTicket | 'todos')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="fechado">Fechado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum ticket encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando um novo ticket de suporte.</p>
          <div className="mt-6"><Button onClick={handleCreateClick}><Plus className="mr-2 h-4 w-4" />Novo Ticket</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTickets.map((ticket: TicketSuporte) => (
            <div key={ticket.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg border hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Cabeçalho: Cliente em destaque */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-100">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {ticket.cliente?.nome_contato || 'Cliente não informado'}
                        </p>
                        {ticket.cliente?.nome_empresa && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {ticket.cliente.nome_empresa}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </div>

                  {/* Linha: título do ticket + prioridade + status rápido */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mr-auto">
                      {ticket.titulo}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge className={PRIORIDADE_COLORS[ticket.prioridade]}>{PRIORIDADE_LABELS[ticket.prioridade]}</Badge>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => handleQuickStatusChange(ticket, value as StatusTicket)}
                      >
                        <SelectTrigger className="h-7 px-2 text-xs border-gray-200">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberto">{STATUS_LABELS.aberto}</SelectItem>
                          <SelectItem value="em_andamento">{STATUS_LABELS.em_andamento}</SelectItem>
                          <SelectItem value="aguardando_cliente">{STATUS_LABELS.aguardando_cliente}</SelectItem>
                          <SelectItem value="resolvido">{STATUS_LABELS.resolvido}</SelectItem>
                          <SelectItem value="fechado">{STATUS_LABELS.fechado}</SelectItem>
                          <SelectItem value="cancelado">{STATUS_LABELS.cancelado}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Descrição do problema */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{ticket.descricao}</p>

                  {/* Info adicionais: vendedor e setor */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {ticket.vendedor && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{ticket.vendedor.nome}</span>
                      </div>
                    )}
                    {ticket.setor && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Building className="h-4 w-4" />
                        <span>{ticket.setor.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(ticket); setIsDetailModalOpen(true) }}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEditClick(ticket)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedTicket(ticket); setIsDeleteDialogOpen(true) }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Ticket de Suporte</DialogTitle>
            <DialogDescription>Crie um novo ticket de suporte para um cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
<Label className="text-sm">Cliente *</Label>
              <Select
                value={formData.cliente_id}
                onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <Input
                      placeholder="Buscar cliente pelo nome ou empresa..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  {filteredClientesSelect.map((cliente: any) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome_contato}
                      {cliente.nome_empresa && ` - ${cliente.nome_empresa}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm">Título *</Label><Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ex: Problema com acesso ao sistema" /></div>
            <div><Label className="text-sm">Descrição *</Label><Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descreva o problema..." rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm">Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(value) => setFormData({ ...formData, prioridade: value as PrioridadeTicket })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as StatusTicket })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem><SelectItem value="fechado">Fechado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-sm">Vendedor (Opcional)</Label>
              <Select value={formData.vendedor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{vendedores.map((v: any) => (<SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm">Setor (Opcional)</Label>
              <Select value={formData.setor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, setor_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{setores.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitCreate} disabled={createTicket.isPending}>
              {createTicket.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>) : 'Criar Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ticket</DialogTitle>
            <DialogDescription>Atualize as informações do ticket</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-sm">Título *</Label><Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} /></div>
            <div><Label className="text-sm">Descrição *</Label><Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm">Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(value) => setFormData({ ...formData, prioridade: value as PrioridadeTicket })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-sm">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as StatusTicket })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="em_andamento">Em Andamento</SelectItem><SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem><SelectItem value="resolvido">Resolvido</SelectItem><SelectItem value="fechado">Fechado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-sm">Vendedor</Label>
              <Select value={formData.vendedor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{vendedores.map((v: any) => (<SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-sm">Setor</Label>
              <Select value={formData.setor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, setor_id: value === 'none' ? null : value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nenhum</SelectItem>{setores.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitEdit} disabled={updateTicket.isPending}>
              {updateTicket.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do Ticket</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold">{selectedTicket.titulo}</h3>
                  <Badge className={STATUS_COLORS[selectedTicket.status]}>{STATUS_LABELS[selectedTicket.status]}</Badge>
                  <Badge className={PRIORIDADE_COLORS[selectedTicket.prioridade]}>{PRIORIDADE_LABELS[selectedTicket.prioridade]}</Badge>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Descrição</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.descricao}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedTicket.cliente && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><User className="h-4 w-4" />Cliente</h4>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTicket.cliente.nome_contato}</p>
                    {selectedTicket.cliente.nome_empresa && (<p className="text-sm text-gray-500">{selectedTicket.cliente.nome_empresa}</p>)}
                  </div>
                )}
                {selectedTicket.vendedor && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><User className="h-4 w-4" />Vendedor</h4>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTicket.vendedor.nome}</p>
                  </div>
                )}
                {selectedTicket.setor && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Building className="h-4 w-4" />Setor</h4>
                    <p className="text-gray-700 dark:text-gray-300">{selectedTicket.setor.nome}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsDetailModalOpen(false)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja deletar este ticket? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (selectedTicket) deleteTicket.mutate(selectedTicket.id, { onSuccess: (response) => { if (!response.error) { setIsDeleteDialogOpen(false); setSelectedTicket(null) } } }) }} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
