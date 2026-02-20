import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, Check, Loader2 } from 'lucide-react'
import { useClinicaIAConfig, useUpdateClinicaIAConfig } from '@/hooks/useClinicaIAConfig'

const defaultHorarios = {
  segunda: { ativo: true, inicio: '08:00', fim: '18:00' },
  terca: { ativo: true, inicio: '08:00', fim: '18:00' },
  quarta: { ativo: true, inicio: '08:00', fim: '18:00' },
  quinta: { ativo: true, inicio: '08:00', fim: '18:00' },
  sexta: { ativo: true, inicio: '08:00', fim: '18:00' },
  sabado: { ativo: false, inicio: '08:00', fim: '12:00' },
  domingo: { ativo: false, inicio: '08:00', fim: '12:00' },
}

type TomDeVoz =
  | 'humanizado'
  | 'acolhedor'
  | 'tecnico_especialista'
  | 'direto_objetivo'
  | 'vendedor_conversor'
  | 'sofisticado'

type EstiloComunicacao = 'curto' | 'medio' | 'detalhado'

type PosicionamentoMarca = 'economico' | 'acessivel' | 'intermediario' | 'premium' | 'luxo'

type Nicho = 'facial' | 'corporal' | 'capilar' | 'multiestetica'

interface ProfissionalJSON {
  id: string
  nome: string
  cargo?: string
  especialidades?: string
  experiencia?: string
  certificacoes?: string
  bio?: string
  foto_url?: string
  procedimentos?: string
}

export function IAConfigPage() {
  const { data: clinicaConfig, isLoading } = useClinicaIAConfig()
  const updateClinicaConfig = useUpdateClinicaIAConfig()

  const [identidade, setIdentidade] = useState<Record<string, any>>({
    nome_clinica: '',
    nome_fantasia: '',
    cnpj: '',
    endereco_completo: '',
    bairro: '',
    cidade_estado: '',
    telefone_principal: '',
    telefone_recepcao: '',
    site: '',
    redes_sociais: [],
    horarios_funcionamento: defaultHorarios,
  })

  const [posicionamento, setPosicionamento] = useState<Record<string, any>>({
    nicho: 'multiestetica' as Nicho,
    posicionamento_marca: 'intermediario' as PosicionamentoMarca,
    tom_voz_ia: 'acolhedor' as TomDeVoz,
    estilo_comunicacao: 'medio' as EstiloComunicacao,
    persona_marca: '',
    slogan: '',
  })

  const [profissionais, setProfissionais] = useState<ProfissionalJSON[]>([])

  const [politicas, setPoliticas] = useState<Record<string, any>>({
    avaliacao: {
      obrigatoria: false,
      gratuita: true,
      valor: null,
      ia_pode_agendar: false,
    },
    agendamento: {
      ia_pode_agendar_procedimentos: false,
      exige_pagamento_antecipado: false,
      exige_sinal: false,
      valor_sinal: null,
      enviar_pagamento_antes: false,
    },
    valores: {
      ia_pode_informar: 'nao' as 'exato' | 'faixa' | 'nao',
      texto_padrao: '',
    },
    cancelamento_no_show: {
      regra_atrasos: '',
      regra_remarcacoes: '',
      penalidades_ausencia: '',
      texto_padrao_ia: '',
    },
  })

  const [provaSocial, setProvaSocial] = useState<Record<string, any>>({
    clientes_atendidos: null,
    procedimentos_realizados: null,
    premios_reconhecimentos: [],
    avaliacoes_google_total: null,
    google_nota_media: null,
    depoimentos: [],
    cases: [],
    fotos_clinica: [],
  })

  const [midias, setMidias] = useState<Record<string, any>>({
    imagem_apresentacao: '',
    foto_fachada: '',
    fotos_salas: [],
    video_institucional: '',
    antes_depois_genericos: [],
  })

  const [regrasInternas, setRegrasInternas] = useState<Record<string, any>>({
    tempo_medio_resposta_humana: '',
    mensagens_proibidas: '',
    informacoes_sensiveis: '',
    dias_sem_atendimento: '',
    quando_transferir_humano: '',
  })

  const [gatilhos, setGatilhos] = useState<Record<string, any>>({
    diferenciais: '',
    o_que_importa_para_cliente: '',
    motivos_para_escolher: '',
    garantias: '',
  })

  // Atualizar estado local quando os dados chegarem
  useEffect(() => {
    if (clinicaConfig) {
      setIdentidade({
        ...identidade,
        ...(clinicaConfig.identidade || {}),
        horarios_funcionamento: (clinicaConfig.identidade as any)?.horarios_funcionamento || defaultHorarios,
      })
      setPosicionamento({ ...posicionamento, ...(clinicaConfig.posicionamento || {}) })
      setProfissionais((clinicaConfig.profissionais as any[]) || [])
      setPoliticas({ ...politicas, ...(clinicaConfig.politicas || {}) })
      setProvaSocial({ ...provaSocial, ...(clinicaConfig.prova_social || {}) })
      setMidias({ ...midias, ...(clinicaConfig.midias || {}) })
      setRegrasInternas({ ...regrasInternas, ...(clinicaConfig.regras_internas || {}) })
      setGatilhos({ ...gatilhos, ...(clinicaConfig.gatilhos_diferenciais || {}) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaConfig])

  const handleSaveConfig = () => {
    updateClinicaConfig.mutate({
      identidade,
      posicionamento,
      profissionais,
      politicas,
      prova_social: provaSocial,
      midias,
      regras_internas: regrasInternas,
      gatilhos_diferenciais: gatilhos,
    } as any)
  }

  const generateId = () => {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const addProfissional = () => {
    setProfissionais((prev) => [
      ...prev,
      {
        id: generateId(),
        nome: '',
        cargo: '',
        especialidades: '',
        experiencia: '',
        certificacoes: '',
        bio: '',
        foto_url: '',
        procedimentos: '',
      },
    ])
  }

  const updateProfissional = (id: string, patch: Partial<ProfissionalJSON>) => {
    setProfissionais((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const removeProfissional = (id: string) => {
    setProfissionais((prev) => prev.filter((p) => p.id !== id))
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Configurações de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure o comportamento e personalidade do assistente de IA da sua clínica
          </p>
        </div>
        <Button 
          onClick={handleSaveConfig}
          disabled={updateClinicaConfig.isPending}
        >
          {updateClinicaConfig.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* A) Identidade da Clínica */}
        <Card>
          <CardHeader>
            <CardTitle>Identidade da Clínica</CardTitle>
            <CardDescription>
              Informações básicas e operacionais da clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
<Label className="text-sm">Nome da clínica</Label>
                <Input value={identidade.nome_clinica || ''} onChange={(e) => setIdentidade({ ...identidade, nome_clinica: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Nome fantasia</Label>
                <Input value={identidade.nome_fantasia || ''} onChange={(e) => setIdentidade({ ...identidade, nome_fantasia: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">CNPJ (opcional)</Label>
                <Input value={identidade.cnpj || ''} onChange={(e) => setIdentidade({ ...identidade, cnpj: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Cidade / Estado</Label>
                <Input value={identidade.cidade_estado || ''} onChange={(e) => setIdentidade({ ...identidade, cidade_estado: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Endereço completo</Label>
                <Input value={identidade.endereco_completo || ''} onChange={(e) => setIdentidade({ ...identidade, endereco_completo: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Zona / Bairro</Label>
                <Input value={identidade.bairro || ''} onChange={(e) => setIdentidade({ ...identidade, bairro: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Telefone principal</Label>
                <Input value={identidade.telefone_principal || ''} onChange={(e) => setIdentidade({ ...identidade, telefone_principal: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Telefone da recepção</Label>
                <Input value={identidade.telefone_recepcao || ''} onChange={(e) => setIdentidade({ ...identidade, telefone_recepcao: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Site (opcional)</Label>
                <Input value={identidade.site || ''} onChange={(e) => setIdentidade({ ...identidade, site: e.target.value })} />
              </div>
              <div className="grid gap-2">
<Label className="text-sm">Redes sociais (uma por linha)</Label>
                <Textarea
                  value={(identidade.redes_sociais || []).join('\n')}
                  onChange={(e) => setIdentidade({ ...identidade, redes_sociais: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) })}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
<Label className="text-sm">Horário de funcionamento</Label>
              {Object.entries(identidade.horarios_funcionamento || defaultHorarios).map(([dia, config]: [string, any]) => (
                <div key={dia} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-24">
<Label className="text-sm">{dia}</Label>
                  </div>
                  <Switch
                    checked={config?.ativo || false}
                    onCheckedChange={(checked) => {
                      const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                      horarios[dia] = { ...config, ativo: checked }
                      setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                    }}
                  />
                  {config?.ativo ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={config?.inicio || '08:00'}
                        onChange={(e) => {
                          const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                          horarios[dia] = { ...config, inicio: e.target.value }
                          setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">às</span>
                      <Input
                        type="time"
                        value={config?.fim || '18:00'}
                        onChange={(e) => {
                          const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                          horarios[dia] = { ...config, fim: e.target.value }
                          setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                        }}
                        className="w-24"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Inativo</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Texto */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Texto</CardTitle>
            <CardDescription>
              Personalize como a IA estrutura suas respostas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="tamanho-textos" className="text-sm">Tamanho dos Textos</Label>
              <Select 
                value={iaConfig.tamanho_textos || 'medio'} 
                onValueChange={(value) => setIaConfig({...iaConfig, tamanho_textos: value as any})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tamanho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curto">Curto</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="longo">Longo</SelectItem>
                  <SelectItem value="detalhado">Detalhado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
<Label className="text-sm">Usar Emojis</Label>
                <p className="text-sm text-gray-500">
                  Permitir que a IA use emojis nas respostas.
                </p>
              </div>
              <Switch 
                checked={iaConfig.usar_emojis || false}
                onCheckedChange={(checked) => setIaConfig({...iaConfig, usar_emojis: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Agendamento e Envio de Materiais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Agendamento e Envio de Materiais</CardTitle>
            <CardDescription>
              Configure como a IA deve se comportar com agendamentos, os horários disponíveis e o envio de documentos aos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
<Label className="text-sm">IA enviará documentos?</Label>
                <p className="text-sm text-gray-500">
                  Quando ativado, a área de Arquivos IA ficará visível e funcional.
                </p>
              </div>
              <Switch 
                checked={iaConfig.envia_documento || false}
                onCheckedChange={(checked) => setIaConfig({...iaConfig, envia_documento: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
<Label className="text-sm">Agendamentos com IA?</Label>
                <p className="text-sm text-gray-500">
                  Permitir que a IA realize agendamentos automaticamente.
                </p>
              </div>
              <Switch 
                checked={iaConfig.agendamento_ia || false}
                onCheckedChange={(checked) => setIaConfig({...iaConfig, agendamento_ia: checked})}
              />
            </div>

            {iaConfig.agendamento_ia && (
              <>
                <div className="space-y-3">
<Label className="text-sm">Vendedores e Horários Disponíveis</Label>
                  <p className="text-sm text-gray-500">
                    Horários dos vendedores que a IA pode usar para agendamentos.
                  </p>
                  {vendedores.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <p>Nenhum vendedor cadastrado</p>
                    </div>
                  ) : (
                    vendedores.map((vendedor) => {
                      const horariosAtivos = vendedor.horarios_vendedor ? 
                        ordenarDiasDaSemana(vendedor.horarios_vendedor)
                          .filter(([_, config]: [string, any]) => config?.ativo === true)
                          .map(([dia, config]: [string, any]) => {
                            const diaFormatado = dia.charAt(0).toUpperCase() + dia.slice(1)
                            
                            // Suporte para nova estrutura de múltiplos períodos
                            if (config?.periodos && Array.isArray(config.periodos)) {
                              const periodosTexto = config.periodos
                                .map((periodo: any) => `${periodo.inicio}-${periodo.fim}`)
                                .join(', ')
                              return `${diaFormatado}: ${periodosTexto}`
                            }
                            // Compatibilidade com estrutura antiga
                            else if (config?.inicio && config?.fim) {
                              return `${diaFormatado}: ${config.inicio}-${config.fim}`
                            }
                            return null
                          })
                          .filter(Boolean)
                        : [];
                      
                      return (
                        <div key={vendedor.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {vendedor.nome || vendedor.full_name || 'Nome não informado'}
                              </h4>
                            </div>
                          </div>
                          
                          {horariosAtivos.length > 0 ? (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horários disponíveis:</p>
                              <div className="flex flex-wrap gap-2">
                                {horariosAtivos.map((horario, index) => (
                                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                                    {horario}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 mt-2">Nenhum horário disponível configurado</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Configurações de Qualificação */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Qualificação</CardTitle>
            <CardDescription>
              Configure quais informações a IA deve coletar para qualificar os leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campos Obrigatórios (Apenas Leitura) */}
            <div className="space-y-3">
<Label className="text-sm">Campos Obrigatórios</Label>
              <p className="text-sm text-gray-500">
                Estes campos são sempre obrigatórios na qualificação de leads.
              </p>
              <div className="grid gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {[
                  { label: 'Nome', key: 'nome' },
                  { label: 'Telefone', key: 'telefone' },
                  { label: 'Produto de Interesse', key: 'produto_interesse' },
                  { label: 'Motivação', key: 'motivacao' },
                  { label: 'Expectativa', key: 'expectativa' },
                  { label: 'Análise do Cliente', key: 'analise_cliente' }
                ].map(({ label, key }) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border">
<Label className="text-sm">{label}</Label>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-gray-500">Obrigatório</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campos Opcionais Configuráveis */}
            <div className="space-y-4 pt-4 border-t">
<Label className="text-sm">Campos Opcionais</Label>
              <p className="text-sm text-gray-500">
                Configure quais campos adicionais a IA deve coletar.
              </p>

              {/* Nome da Empresa */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">Nome da Empresa</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar nome da empresa do lead.
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.nome_empresa || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      nome_empresa: checked
                    }
                  })}
                />
              </div>

              {/* CPF */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">CPF</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar CPF do lead (pessoa física).
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.cpf || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      cpf: checked
                    }
                  })}
                />
              </div>

              {/* CNPJ */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">CNPJ</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar CNPJ do lead (pessoa jurídica).
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.cnpj || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      cnpj: checked
                    }
                  })}
                />
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">Email</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar endereço de email do lead.
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.email || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      email: checked
                    }
                  })}
                />
              </div>

              {/* Segmento */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">Segmento</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar segmento de atuação do lead.
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.segmento || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      segmento: checked
                    }
                  })}
                />
              </div>

              {/* Volume Mensal */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
<Label className="text-sm">Volume Mensal</Label>
                  <p className="text-sm text-gray-500">
                    Solicitar volume mensal estimado do lead.
                  </p>
                </div>
                <Switch
                  checked={iaConfig.regras_qualificacao?.volume_mensal || false}
                  onCheckedChange={(checked) => setIaConfig({
                    ...iaConfig,
                    regras_qualificacao: {
                      ...iaConfig.regras_qualificacao!,
                      volume_mensal: checked
                    }
                  })}
                />
              </div>

              {/* Endereço */}
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
<Label className="text-sm">Endereço</Label>
                    <p className="text-sm text-gray-500">
                      Solicitar endereço completo do lead.
                    </p>
                  </div>
                  <Switch
                    checked={iaConfig.regras_qualificacao?.endereco?.ativo || false}
                    onCheckedChange={(checked) => setIaConfig({
                      ...iaConfig,
                      regras_qualificacao: {
                        ...iaConfig.regras_qualificacao!,
                        endereco: {
                          ...iaConfig.regras_qualificacao!.endereco,
                          ativo: checked
                        }
                      }
                    })}
                  />
                </div>

                {/* Sub-campos de Endereço */}
                {iaConfig.regras_qualificacao?.endereco?.ativo && (
                  <div className="ml-4 space-y-2 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Campos do endereço:</p>
                    
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
<Label className="text-sm">Rua</Label>
                      <Switch
                        checked={iaConfig.regras_qualificacao?.endereco?.rua || false}
                        onCheckedChange={(checked) => setIaConfig({
                          ...iaConfig,
                          regras_qualificacao: {
                            ...iaConfig.regras_qualificacao!,
                            endereco: {
                              ...iaConfig.regras_qualificacao!.endereco,
                              rua: checked
                            }
                          }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
<Label className="text-sm">Número</Label>
                      <Switch
                        checked={iaConfig.regras_qualificacao?.endereco?.numero || false}
                        onCheckedChange={(checked) => setIaConfig({
                          ...iaConfig,
                          regras_qualificacao: {
                            ...iaConfig.regras_qualificacao!,
                            endereco: {
                              ...iaConfig.regras_qualificacao!.endereco,
                              numero: checked
                            }
                          }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
<Label className="text-sm">Cidade</Label>
                      <Switch
                        checked={iaConfig.regras_qualificacao?.endereco?.cidade || false}
                        onCheckedChange={(checked) => setIaConfig({
                          ...iaConfig,
                          regras_qualificacao: {
                            ...iaConfig.regras_qualificacao!,
                            endereco: {
                              ...iaConfig.regras_qualificacao!.endereco,
                              cidade: checked
                            }
                          }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
<Label className="text-sm">CEP</Label>
                      <Switch
                        checked={iaConfig.regras_qualificacao?.endereco?.cep || false}
                        onCheckedChange={(checked) => setIaConfig({
                          ...iaConfig,
                          regras_qualificacao: {
                            ...iaConfig.regras_qualificacao!,
                            endereco: {
                              ...iaConfig.regras_qualificacao!.endereco,
                              cep: checked
                            }
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Horários de Funcionamento</CardTitle>
            <CardDescription>
              Configure os horários em que a IA estará ativa para atendimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(iaConfig.horarios_funcionamento || {}).map(([dia, config]: [string, any]) => (
              <div key={dia} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="w-20">
<Label className="text-sm">{dia}</Label>
                </div>
                <Switch
                  checked={config?.ativo || false}
                  onCheckedChange={(checked) => {
                    const newHorarios = { ...iaConfig.horarios_funcionamento }
                    newHorarios[dia] = { ...config, ativo: checked }
                    setIaConfig({ ...iaConfig, horarios_funcionamento: newHorarios })
                  }}
                />
                {config?.ativo && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={config?.inicio || '08:00'}
                        onChange={(e) => {
                          const newHorarios = { ...iaConfig.horarios_funcionamento }
                          newHorarios[dia] = { ...config, inicio: e.target.value }
                          setIaConfig({ ...iaConfig, horarios_funcionamento: newHorarios })
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">às</span>
                      <Input
                        type="time"
                        value={config?.fim || '18:00'}
                        onChange={(e) => {
                          const newHorarios = { ...iaConfig.horarios_funcionamento }
                          newHorarios[dia] = { ...config, fim: e.target.value }
                          setIaConfig({ ...iaConfig, horarios_funcionamento: newHorarios })
                        }}
                        className="w-24"
                      />
                    </div>
                  </>
                )}
                {!config?.ativo && (
                  <span className="text-sm text-gray-400">Inativo</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tempo de Resposta e Mensagem de Ausência */}
        <Card>
          <CardHeader>
            <CardTitle>Tempo de Resposta e Mensagem de Ausência</CardTitle>
            <CardDescription>
              Configure o tempo que a IA leva para responder e a mensagem exibida quando o atendimento estiver indisponível fora do horário de funcionamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="tempo-resposta" className="text-sm">Tempo de Resposta (segundos)</Label>
              <Input
                id="tempo-resposta"
                type="number"
                min="1"
                max="30"
                value={Math.round((iaConfig.tempo_resposta_ms || 2000) / 1000)}
                onChange={(e) => setIaConfig({...iaConfig, tempo_resposta_ms: (parseInt(e.target.value) || 2) * 1000})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mensagem-ausencia" className="text-sm">Mensagem de Ausência</Label>
              <Textarea
                id="mensagem-ausencia"
                placeholder="Mensagem exibida fora do horário de atendimento..."
                value={iaConfig.mensagem_ausencia || ''}
                onChange={(e) => setIaConfig({...iaConfig, mensagem_ausencia: e.target.value})}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>
              Dados sobre a empresa que a IA pode usar nas conversas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="sobre-empresa" className="text-sm">Sobre a empresa</Label>
              <Textarea
                id="sobre-empresa"
                placeholder="Descreva a empresa, sua história e propósito..."
                value={iaConfig.detalhes_empresa?.sobre_empresa || ''}
                onChange={(e) => updateDetalhesEmpresa('sobre_empresa', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="diferenciais-competitivos" className="text-sm">Diferenciais competitivos</Label>
              <Textarea
                id="diferenciais-competitivos"
                placeholder="Quais são os principais diferenciais da empresa no mercado?"
                value={iaConfig.detalhes_empresa?.diferenciais_competitivos || ''}
                onChange={(e) => updateDetalhesEmpresa('diferenciais_competitivos', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="portfolio-produtos-servicos" className="text-sm">Portfólio: Produtos e Serviços</Label>
              <Textarea
                id="portfolio-produtos-servicos"
                placeholder="Descreva todos os produtos e serviços oferecidos pela empresa..."
                value={iaConfig.detalhes_empresa?.portfolio_produtos_servicos || ''}
                onChange={(e) => updateDetalhesEmpresa('portfolio_produtos_servicos', e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="principais-clientes" className="text-sm">Principais Clientes</Label>
              <Textarea
                id="principais-clientes"
                placeholder="Descreva os principais tipos de clientes ou segmentos que a empresa atende..."
                value={iaConfig.detalhes_empresa?.principais_clientes || ''}
                onChange={(e) => updateDetalhesEmpresa('principais_clientes', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="produtos-servicos-mais-vendidos" className="text-sm">Produtos ou Serviços mais vendidos</Label>
              <Textarea
                id="produtos-servicos-mais-vendidos"
                placeholder="Liste os produtos ou serviços que mais vendem e suas características..."
                value={iaConfig.detalhes_empresa?.produtos_servicos_mais_vendidos || ''}
                onChange={(e) => updateDetalhesEmpresa('produtos_servicos_mais_vendidos', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Diretrizes para IA */}
        <Card>
          <CardHeader>
            <CardTitle>Diretrizes para IA</CardTitle>
            <CardDescription>
              Defina o que a IA pode ou não pode fazer durante as conversas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="informacoes-ia-pode-fornecer" className="text-sm">Informações que a IA pode fornecer</Label>
              <Textarea
                id="informacoes-ia-pode-fornecer"
                placeholder="Descreva quais informações a IA está autorizada a fornecer aos clientes..."
                value={iaConfig.detalhes_empresa?.informacoes_ia_pode_fornecer || ''}
                onChange={(e) => updateDetalhesEmpresa('informacoes_ia_pode_fornecer', e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="informacoes-ia-nao-pode-fornecer" className="text-sm">Informações que a IA não pode fornecer</Label>
              <Textarea
                id="informacoes-ia-nao-pode-fornecer"
                placeholder="Descreva quais informações a IA NÃO deve fornecer ou temas que deve evitar..."
                value={iaConfig.detalhes_empresa?.informacoes_ia_nao_pode_fornecer || ''}
                onChange={(e) => updateDetalhesEmpresa('informacoes_ia_nao_pode_fornecer', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estratégias Comerciais */}
        <Card>
          <CardHeader>
            <CardTitle>Estratégias Comerciais</CardTitle>
            <CardDescription>
              Configure como a IA deve abordar vendas e objeções dos clientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="argumentos-venda-por-perfil" className="text-sm">Argumentos de venda por perfil</Label>
              <Textarea
                id="argumentos-venda-por-perfil"
                placeholder="Descreva os argumentos de venda específicos para diferentes perfis de clientes..."
                value={iaConfig.detalhes_empresa?.argumentos_venda_por_perfil || ''}
                onChange={(e) => updateDetalhesEmpresa('argumentos_venda_por_perfil', e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="objecoes-comuns-respostas" className="text-sm">Objeções comuns e respostas</Label>
              <Textarea
                id="objecoes-comuns-respostas"
                placeholder="Liste as objeções mais comuns dos clientes e como a IA deve responder..."
                value={iaConfig.detalhes_empresa?.objecoes_comuns_respostas || ''}
                onChange={(e) => updateDetalhesEmpresa('objecoes_comuns_respostas', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-4">
          <Button 
            onClick={handleSaveConfig}
            disabled={updateIAConfig.isPending}
            className="flex-1"
          >
            {updateIAConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
