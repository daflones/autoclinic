import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  User,
  Edit,
  Trash2,
  Eye,
  Users,
  Shield,
  Loader2,
  Activity
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useSetores, useUpdateSetor, useToggleSetorStatus } from '@/hooks/useSetores'
import { Badge } from '@/components/ui/badge'
import type { Setor, SetorResponsavel } from '@/services/api/setores'
import { toast } from 'sonner'

type PrioridadeOptions = 'baixa' | 'media' | 'alta' | 'urgente'

interface ResponsavelForm extends SetorResponsavel {}

interface SetorFormData {
  nome: string
  descricao: string
  email: string
  telefone: string
  whatsapp: string
  cor_identificacao: string
  prioridade: PrioridadeOptions
  ativo: boolean
  notificacoes_ativas: boolean
  // Novos campos para IA
  instrucoes_ia: string
  contexto_uso: string
  palavras_chave: string
  horario_funcionamento: {
    [key: string]: {
      ativo: boolean
      periodos: Array<{
        inicio: string
        fim: string
      }>
    }
  }
  responsaveis: ResponsavelForm[]
}

const createDefaultHorario = () => ({
  segunda: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  terca: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  quarta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  quinta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  sexta: { ativo: true, periodos: [{ inicio: '08:00', fim: '18:00' }] },
  sabado: { ativo: false, periodos: [{ inicio: '08:00', fim: '12:00' }] },
  domingo: { ativo: false, periodos: [{ inicio: '08:00', fim: '12:00' }] },
})

const generateTempId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createEmptyResponsavel = (): ResponsavelForm => ({
  id: generateTempId(),
  nome: '',
  email: '',
  telefone: '',
  whatsapp: '',
  cargo: '',
})

const cloneResponsavelToForm = (responsavel: SetorResponsavel): ResponsavelForm => ({
  id: responsavel.id || generateTempId(),
  nome: responsavel.nome || '',
  email: responsavel.email || '',
  telefone: responsavel.telefone || '',
  whatsapp: responsavel.whatsapp || '',
  cargo: responsavel.cargo || '',
})

const prepareResponsaveisPayload = (responsaveis: ResponsavelForm[]): SetorResponsavel[] =>
  responsaveis
    .map((responsavel) => {
      const nome = responsavel.nome?.trim()
      if (!nome) {
        return null
      }

      return {
        id: responsavel.id || generateTempId(),
        nome,
        email: responsavel.email?.trim() || undefined,
        telefone: responsavel.telefone?.trim() || undefined,
        whatsapp: responsavel.whatsapp?.trim() || undefined,
        cargo: responsavel.cargo?.trim() || undefined,
      }
    })
    .filter(Boolean) as SetorResponsavel[]

const ensureResponsaveis = (responsaveis: ResponsavelForm[]): ResponsavelForm[] =>
  responsaveis.length > 0 ? responsaveis : [createEmptyResponsavel()]

const mapSetorToFormData = (setor: Setor): SetorFormData => ({
  nome: setor.nome || '',
  descricao: setor.descricao || '',
  email: setor.email || '',
  telefone: setor.telefone || '',
  whatsapp: setor.whatsapp || '',
  cor_identificacao: setor.cor_identificacao || '#6366f1',
  prioridade: (setor.prioridade as PrioridadeOptions) || 'media',
  ativo: setor.ativo,
  notificacoes_ativas: setor.notificacoes_ativas,
  instrucoes_ia: setor.instrucoes_ia || '',
  contexto_uso: setor.contexto_uso || '',
  palavras_chave: setor.palavras_chave?.join(', ') || '',
  horario_funcionamento: setor.horario_funcionamento
    ? JSON.parse(JSON.stringify(setor.horario_funcionamento))
    : createDefaultHorario(),
  responsaveis: ensureResponsaveis((setor.responsaveis || []).map(cloneResponsavelToForm)),
})

export default function SetoresAtendimentoPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null)
  const [formData, setFormData] = useState<SetorFormData>({
    nome: '',
    descricao: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cor_identificacao: '#6366f1',
    prioridade: 'media',
    ativo: true,
    notificacoes_ativas: true,
    // Novos campos para IA
    instrucoes_ia: '',
    contexto_uso: '',
    palavras_chave: '',
    horario_funcionamento: createDefaultHorario(),
    responsaveis: [createEmptyResponsavel()],
  })

  const { data: setores = [], isLoading, error } = useSetores()
  const updateSetor = useUpdateSetor()
  const toggleSetorStatus = useToggleSetorStatus()
  const [setorToggleId, setSetorToggleId] = useState<string | null>(null)

  const filteredSetores = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return setores.filter((setor) => {
      const matchesNome = setor.nome?.toLowerCase().includes(term)
      const matchesDescricao = setor.descricao?.toLowerCase().includes(term)
      const matchesResponsavelPrincipal = setor.responsavel?.toLowerCase().includes(term)
      const matchesResponsaveisLista = setor.responsaveis?.some((responsavel) =>
        responsavel.nome?.toLowerCase().includes(term)
      )

      return matchesNome || matchesDescricao || matchesResponsavelPrincipal || matchesResponsaveisLista
    })
  }, [setores, searchTerm])

  const totalSetores = setores.length
  const setoresAtivos = setores.filter((setor) => setor.ativo).length
  const percentualAtivos = totalSetores > 0 ? Math.round((setoresAtivos / totalSetores) * 100) : 0

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      email: '',
      telefone: '',
      whatsapp: '',
      cor_identificacao: '#6366f1',
      prioridade: 'media',
      ativo: true,
      notificacoes_ativas: true,
      // Novos campos para IA
      instrucoes_ia: '',
      contexto_uso: '',
      palavras_chave: '',
      horario_funcionamento: createDefaultHorario(),
      responsaveis: [createEmptyResponsavel()],
    })
  }

  const handleResponsavelFieldChange = <K extends keyof ResponsavelForm>(index: number, field: K, value: ResponsavelForm[K]) => {
    setFormData((prev) => {
      const responsaveis = [...prev.responsaveis]
      responsaveis[index] = {
        ...responsaveis[index],
        [field]: value,
      }
      return {
        ...prev,
        responsaveis,
      }
    })
  }

  const handleAddResponsavel = () => {
    setFormData((prev) => ({
      ...prev,
      responsaveis: [...prev.responsaveis, createEmptyResponsavel()],
    }))
  }

  const handleRemoveResponsavel = (index: number) => {
    setFormData((prev) => {
      const responsaveis = prev.responsaveis.filter((_, i) => i !== index)
      return {
        ...prev,
        responsaveis: ensureResponsaveis(responsaveis),
      }
    })
  }

  const handleToggleSetorStatus = async (setorId: string) => {
    try {
      setSetorToggleId(setorId)
      await toggleSetorStatus.mutateAsync(setorId)
    } catch (error: any) {
      console.error('Erro ao alternar status do setor:', error)
      toast.error(error?.message || 'Erro ao alterar status do setor')
    } finally {
      setSetorToggleId(null)
    }
  }

  const renderResponsaveisFields = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Responsáveis</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddResponsavel}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Adicionar responsável
        </Button>
      </div>

      <div className="space-y-3">
        {formData.responsaveis.map((responsavel, index) => (
          <div
            key={responsavel.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
          >
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Nome
                  </Label>
                  <Input
                    placeholder="Nome completo"
                    value={responsavel.nome}
                    onChange={(e) => handleResponsavelFieldChange(index, 'nome', e.target.value)}
                    required={index === 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Cargo
                  </Label>
                  <Input
                    placeholder="Cargo / Função"
                    value={responsavel.cargo || ''}
                    onChange={(e) => handleResponsavelFieldChange(index, 'cargo', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={responsavel.email || ''}
                    onChange={(e) => handleResponsavelFieldChange(index, 'email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Telefone
                  </Label>
                  <Input
                    placeholder="(11) 99999-8888"
                    value={responsavel.telefone || ''}
                    onChange={(e) => handleResponsavelFieldChange(index, 'telefone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    WhatsApp
                  </Label>
                  <Input
                    placeholder="(11) 99999-8888"
                    value={responsavel.whatsapp || ''}
                    onChange={(e) => handleResponsavelFieldChange(index, 'whatsapp', e.target.value)}
                  />
                </div>
              </div>

              {formData.responsaveis.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveResponsavel(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover responsável
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const handleUpdateSetor = async () => {
    if (!selectedSetor || !formData.nome.trim()) {
      toast.error('Nome do setor é obrigatório')
      return
    }

    try {
      const responsaveisPayload = prepareResponsaveisPayload(formData.responsaveis)

      await updateSetor.mutateAsync({
        id: selectedSetor.id,
        data: {
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || undefined,
          email: formData.email.trim() || undefined,
          telefone: formData.telefone.trim() || undefined,
          whatsapp: formData.whatsapp.trim() || undefined,
          responsaveis: responsaveisPayload,
          cor_identificacao: formData.cor_identificacao,
          prioridade: formData.prioridade,
          ativo: formData.ativo,
          notificacoes_ativas: formData.notificacoes_ativas,
          // Novos campos para IA
          instrucoes_ia: formData.instrucoes_ia.trim() || undefined,
          contexto_uso: formData.contexto_uso.trim() || undefined,
          palavras_chave: formData.palavras_chave
            ? formData.palavras_chave
                .split(',')
                .map(p => p.trim())
                .filter(p => p)
            : undefined,
          horario_funcionamento: formData.horario_funcionamento,
        },
      })

      setIsEditModalOpen(false)
      setSelectedSetor(null)
      resetForm()
    } catch (error: any) {
      console.error('Erro ao atualizar setor:', error)
      toast.error(error?.message || 'Erro ao atualizar setor')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando setores...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-red-600">Erro ao carregar setores</div>
        <div className="text-sm text-gray-600 max-w-md text-center">
          A tabela 'setores_atendimento' precisa ser criada no banco de dados. 
          Execute o script SQL fornecido no Supabase.
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="mt-4"
        >
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full h-full space-y-6">
      {/* Header */}
      <div className="w-full">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Setores de Atendimento</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Consulte os setores nativos e edite apenas as informações de responsáveis e configurações auxiliares.
          </p>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-500 p-6 text-white shadow-lg">
          <div className="absolute inset-x-0 -top-24 h-40 bg-white/10 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-white/80">Visão geral</p>
              <h2 className="mt-2 text-3xl font-semibold">{totalSetores} setores</h2>
              <p className="mt-2 max-w-xs text-sm text-white/80">
                {setoresAtivos} ativos ({percentualAtivos}% do total) garantindo disponibilidade das áreas essenciais.
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
              <Activity className="h-8 w-8" />
            </div>
          </div>

          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs font-medium">
              <span>Atividade geral</span>
              <span>{percentualAtivos}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-white"
                style={{ width: `${percentualAtivos}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/70">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Distribuição</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Total cadastrados</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Inclui setores nativos e personalizados</span>
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{totalSetores}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Setores ativos</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Em operação para receber atendimentos</span>
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">{setoresAtivos}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar setores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Setores List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Todos os Setores</h2>
        </div>

        {filteredSetores.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum setor encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comece adicionando um novo setor de atendimento.
            </p>
          </div>
        ) : (
          <div className="p-6 max-h-[650px] overflow-y-auto">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filteredSetores.map((setor) => {
                const isDefault = setor.is_sistema
                const isToggling = setorToggleId === setor.id && toggleSetorStatus.isPending

                return (
                  <div
                    key={setor.id}
                    className="relative flex flex-col gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-6 shadow-sm transition-all duration-200 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
                          style={{ backgroundColor: setor.cor_identificacao }}
                        >
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {setor.nome}
                            </h3>
                            {isDefault && (
                              <Badge className="flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                <Shield className="h-3 w-3" />
                                Nativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className={`h-2 w-2 rounded-full ${setor.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {setor.ativo ? 'Ativo' : 'Inativo'}
                            <span>• Prioridade {setor.prioridade}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Switch
                          checked={setor.ativo}
                          onCheckedChange={() => handleToggleSetorStatus(setor.id)}
                          disabled={isToggling}
                        />
                        {isToggling && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                      </div>
                    </div>

                    {setor.descricao && (
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {setor.descricao}
                      </p>
                    )}

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      {setor.responsaveis && setor.responsaveis.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="mt-1 h-4 w-4 text-primary-500" />
                          <div className="space-y-1">
                            <span className="font-medium text-gray-900 dark:text-white">Responsáveis</span>
                            <div className="flex flex-wrap gap-2">
                              {setor.responsaveis.slice(0, 3).map((responsavel) => (
                                <span
                                  key={responsavel.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                >
                                  <User className="h-3 w-3" />
                                  {responsavel.nome}
                                </span>
                              ))}
                              {setor.responsaveis.length > 3 && (
                                <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                  +{setor.responsaveis.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {setor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{setor.email}</span>
                          </div>
                        )}
                        {setor.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{setor.telefone}</span>
                          </div>
                        )}
                        {setor.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{setor.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Atualizado {new Date(setor.updated_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSetor(setor)
                            setIsViewModalOpen(true)
                          }}
                          className="text-gray-600 hover:text-primary-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSetor(setor)
                            setFormData(mapSetorToFormData(setor))
                            setIsEditModalOpen(true)
                          }}
                          className="text-gray-600 hover:text-primary-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizar Setor</DialogTitle>
            <DialogDescription>
              Informações detalhadas do setor de atendimento
            </DialogDescription>
          </DialogHeader>
          {selectedSetor && (
            <div className="py-4 space-y-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
                  style={{ backgroundColor: selectedSetor.cor_identificacao }}
                >
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedSetor.nome}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedSetor.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedSetor.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {selectedSetor.descricao && (
                <div>
                  <Label className="text-sm font-medium">Descrição</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedSetor.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedSetor.email && (
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-gray-600">{selectedSetor.email}</p>
                  </div>
                )}
                
                {selectedSetor.telefone && (
                  <div>
                    <Label className="text-sm font-medium">Telefone</Label>
                    <p className="text-sm text-gray-600">{selectedSetor.telefone}</p>
                  </div>
                )}
                
                {selectedSetor.responsaveis && selectedSetor.responsaveis.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Responsáveis</Label>
                    <div className="mt-2 space-y-2">
                      {selectedSetor.responsaveis.map((responsavel) => (
                        <div
                          key={responsavel.id}
                          className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                            <User className="h-4 w-4" />
                            <span>{responsavel.nome}</span>
                            {responsavel.cargo && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                • {responsavel.cargo}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                            {responsavel.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{responsavel.email}</span>
                              </div>
                            )}
                            {responsavel.telefone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{responsavel.telefone}</span>
                              </div>
                            )}
                            {responsavel.whatsapp && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                <span>{responsavel.whatsapp}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <Label className="text-sm font-medium">Prioridade</Label>
                  <p className="text-sm text-gray-600 capitalize">{selectedSetor.prioridade}</p>
                </div>
              </div>

              {selectedSetor.instrucoes_ia && (
                <div>
                  <Label className="text-sm font-medium">Instruções para IA</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedSetor.instrucoes_ia}</p>
                </div>
              )}

              {selectedSetor.contexto_uso && (
                <div>
                  <Label className="text-sm font-medium">Contexto de Uso</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedSetor.contexto_uso}</p>
                </div>
              )}

              {selectedSetor.palavras_chave && selectedSetor.palavras_chave.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Palavras-chave</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedSetor.palavras_chave.map((palavra, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {palavra}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Setor</DialogTitle>
            <DialogDescription>
              Atualize apenas a equipe responsável por cada setor nativo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            {selectedSetor && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow"
                      style={{ backgroundColor: selectedSetor.cor_identificacao }}
                    >
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedSetor.nome}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className={`h-2 w-2 rounded-full ${selectedSetor.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {selectedSetor.ativo ? 'Ativo' : 'Inativo'}
                        <span>• Prioridade {selectedSetor.prioridade}</span>
                      </div>
                    </div>
                  </div>
                  {selectedSetor.is_sistema && (
                    <Badge className="flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                      <Shield className="h-3 w-3" />
                      Nativo
                    </Badge>
                  )}
                </div>
                {selectedSetor.descricao && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{selectedSetor.descricao}</p>
                )}
              </div>
            )}

            {renderResponsaveisFields()}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateSetor} disabled={updateSetor.isPending}>
              {updateSetor.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
