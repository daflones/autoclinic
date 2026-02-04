import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ListEditor } from '@/components/ui/list-editor'
import { Bot, Check, Loader2 } from 'lucide-react'
import { useClinicaIAConfig, useUpdateClinicaIAConfig } from '@/hooks/useClinicaIAConfig'
import { deleteMidia, getSignedMidiaUrl, uploadMidia } from '@/services/api/storage-midias'
import { useProfissionaisClinica } from '@/hooks/useProfissionaisClinica'
import { useProtocolosPacotes } from '@/hooks/useProtocolosPacotes'
import { profissionalMidiasService } from '@/services/api/profissional-midias'

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

export function ClinicaIAConfigPage() {
  const { data: clinicaConfig, isLoading } = useClinicaIAConfig()
  const updateClinicaConfig = useUpdateClinicaIAConfig()
  const { data: profissionaisExistentes = [] } = useProfissionaisClinica({ status: 'ativo' })
  const { data: protocolosPacotes = [] } = useProtocolosPacotes({ status: 'ativo' })

  const formatDayLabel = (dia: string) => {
    return dia.charAt(0).toUpperCase() + dia.slice(1)
  }

  const normalizePeriods = (config: any) => {
    if (!config) return { ativo: false, periodos: [] }
    if (Array.isArray(config.periodos)) return config
    if (config.inicio && config.fim) {
      return {
        ...config,
        periodos: [{ inicio: config.inicio, fim: config.fim }],
      }
    }
    return { ...config, periodos: [] }
  }

  const normalizeDepoimentos = (arr: any) => {
    if (!Array.isArray(arr)) return []
    return arr
      .map((d) => {
        if (typeof d === 'string') return { nome: '', idade: null, depoimento: d }
        if (d && typeof d === 'object') {
          return {
            nome: typeof d.nome === 'string' ? d.nome : '',
            idade: typeof d.idade === 'number' ? d.idade : d.idade === null ? null : null,
            depoimento: typeof d.depoimento === 'string' ? d.depoimento : typeof d.texto === 'string' ? d.texto : '',
          }
        }
        return null
      })
      .filter(Boolean)
  }

  const reorder = <T,>(arr: T[], from: number, to: number) => {
    if (from === to) return arr
    const next = [...arr]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
  }

  const [identidade, setIdentidade] = useState<Record<string, any>>({
    nome_clinica: '',
    nome_fantasia: '',
    nome_agente: '',
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

  const [selectedProfissionalIds, setSelectedProfissionalIds] = useState<string[]>([])

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
      politica_agendamento: '',
    },
    valores: {
      ia_pode_informar: 'nao' as 'exato' | 'faixa' | 'nao',
      texto_padrao: '',
      texto_padrao_politicas: '',
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
    cases_midias: [],
    fotos_clinica_midias: [],
  })

  const [midias, setMidias] = useState<Record<string, any>>({
    imagem_apresentacao: '',
    foto_fachada: '',
    fotos_salas: [],
    video_institucional: '',
    antes_depois_genericos: [],
  })

  const [uploadingMidia, setUploadingMidia] = useState<string | null>(null)
  const [midiaUrls, setMidiaUrls] = useState<Record<string, string>>({})

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

  const [extra, setExtra] = useState<Record<string, any>>({})
  const [selectedPacoteIds, setSelectedPacoteIds] = useState<string[]>([])

  useEffect(() => {
    if (clinicaConfig) {
      setIdentidade({
        ...identidade,
        ...(clinicaConfig.identidade || {}),
        horarios_funcionamento: (clinicaConfig.identidade as any)?.horarios_funcionamento || defaultHorarios,
      })
      setPosicionamento({ ...posicionamento, ...(clinicaConfig.posicionamento || {}) })
      setPoliticas({ ...politicas, ...(clinicaConfig.politicas || {}) })
      setProvaSocial((prev) => {
        const next = { ...prev, ...(clinicaConfig.prova_social || {}) }
        next.depoimentos = normalizeDepoimentos(next.depoimentos)
        if (!Array.isArray(next.cases_midias)) next.cases_midias = []
        if (!Array.isArray(next.fotos_clinica_midias)) next.fotos_clinica_midias = []

        if (Array.isArray((next as any).cases)) {
          const legacy = (next as any).cases.filter((x: any) => typeof x === 'string' && x)
          next.cases_midias = Array.from(new Set([...(next.cases_midias || []), ...legacy]))
        }

        if (Array.isArray((next as any).fotos_clinica)) {
          const legacy = (next as any).fotos_clinica.filter((x: any) => typeof x === 'string' && x)
          next.fotos_clinica_midias = Array.from(new Set([...(next.fotos_clinica_midias || []), ...legacy]))
        }
        return next
      })
      setMidias({ ...midias, ...(clinicaConfig.midias || {}) })
      setRegrasInternas({ ...regrasInternas, ...(clinicaConfig.regras_internas || {}) })
      setGatilhos({ ...gatilhos, ...(clinicaConfig.gatilhos_diferenciais || {}) })
      setExtra({ ...(clinicaConfig.extra || {}) })

      const profissionaisSaved = Array.isArray((clinicaConfig as any)?.profissionais)
        ? ((clinicaConfig as any).profissionais as any[])
        : []
      const profissionalIdsFromColumn = profissionaisSaved
        .map((p: any) => {
          if (typeof p === 'string') return p
          if (p && typeof p === 'object' && typeof p.id === 'string') return p.id
          return null
        })
        .filter(Boolean) as string[]

      const profissionalIdsFromExtra = Array.isArray((clinicaConfig.extra as any)?.selected_profissional_ids)
        ? (((clinicaConfig.extra as any).selected_profissional_ids as any[]) as string[])
        : []

      setSelectedProfissionalIds(profissionalIdsFromColumn.length > 0 ? profissionalIdsFromColumn : profissionalIdsFromExtra)
      setSelectedPacoteIds(((clinicaConfig.extra as any)?.selected_pacote_ids as string[]) || [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaConfig])

  useEffect(() => {
    const run = async () => {
      const next: Record<string, string> = {}

      const maybePathKeys = ['imagem_apresentacao', 'foto_fachada'] as const
      for (const key of maybePathKeys) {
        const path = midias?.[key]
        if (typeof path === 'string' && path) {
          try {
            next[key] = await getSignedMidiaUrl({ bucket: 'clinica-midias', path })
          } catch {
            // ignore
          }
        }
      }

      const listKeys = ['fotos_salas', 'antes_depois_genericos'] as const
      for (const key of listKeys) {
        const arr = midias?.[key]
        if (Array.isArray(arr)) {
          for (const path of arr) {
            if (typeof path === 'string' && path) {
              try {
                next[path] = await getSignedMidiaUrl({ bucket: 'clinica-midias', path })
              } catch {
                // ignore
              }
            }
          }
        }
      }

      const provaSocialKeys = ['cases_midias', 'fotos_clinica_midias'] as const
      for (const key of provaSocialKeys) {
        const arr = provaSocial?.[key]
        if (Array.isArray(arr)) {
          for (const path of arr) {
            if (typeof path === 'string' && path) {
              try {
                next[path] = await getSignedMidiaUrl({ bucket: 'clinica-midias', path })
              } catch {
                // ignore
              }
            }
          }
        }
      }

      setMidiaUrls(next)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    midias?.imagem_apresentacao,
    midias?.foto_fachada,
    JSON.stringify(midias?.fotos_salas || []),
    JSON.stringify(midias?.antes_depois_genericos || []),
    JSON.stringify(provaSocial?.cases_midias || []),
    JSON.stringify(provaSocial?.fotos_clinica_midias || []),
  ])

  const uploadSingleMidia = async (key: 'imagem_apresentacao' | 'foto_fachada', file: File) => {
    setUploadingMidia(key)
    try {
      const uploaded = await uploadMidia({ bucket: 'clinica-midias', file, prefix: key })

      const prevPath = midias?.[key]
      if (typeof prevPath === 'string' && prevPath) {
        try {
          await deleteMidia({ bucket: 'clinica-midias', path: prevPath })
        } catch {
          // ignore
        }
      }

      setMidias((prev) => ({ ...prev, [key]: uploaded.path }))
    } finally {
      setUploadingMidia(null)
    }
  }

  const removeSingleMidia = async (key: 'imagem_apresentacao' | 'foto_fachada') => {
    const path = midias?.[key]
    if (typeof path !== 'string' || !path) return

    setUploadingMidia(key)
    try {
      await deleteMidia({ bucket: 'clinica-midias', path })
      setMidias((prev) => ({ ...prev, [key]: '' }))
    } finally {
      setUploadingMidia(null)
    }
  }

  const uploadMultiMidia = async (key: 'fotos_salas' | 'antes_depois_genericos', files: FileList) => {
    setUploadingMidia(key)
    try {
      const uploadedPaths: string[] = []
      for (const file of Array.from(files)) {
        const uploaded = await uploadMidia({ bucket: 'clinica-midias', file, prefix: key })
        uploadedPaths.push(uploaded.path)
      }

      setMidias((prev) => {
        const prevArr = Array.isArray(prev?.[key]) ? (prev[key] as any[]) : []
        const nextArr = [...prevArr, ...uploadedPaths]
        const unique = Array.from(new Set(nextArr.filter(Boolean)))
        return { ...prev, [key]: unique }
      })
    } finally {
      setUploadingMidia(null)
    }
  }

  const removeFromListMidia = async (key: 'fotos_salas' | 'antes_depois_genericos', path: string) => {
    setUploadingMidia(key)
    try {
      await deleteMidia({ bucket: 'clinica-midias', path })
      setMidias((prev) => {
        const prevArr = Array.isArray(prev?.[key]) ? (prev[key] as any[]) : []
        return { ...prev, [key]: prevArr.filter((p) => p !== path) }
      })
    } finally {
      setUploadingMidia(null)
    }
  }

  const uploadProvaSocialMidia = async (key: 'cases_midias' | 'fotos_clinica_midias', files: FileList) => {
    setUploadingMidia(key)
    try {
      const uploadedPaths: string[] = []
      for (const file of Array.from(files)) {
        const uploaded = await uploadMidia({ bucket: 'clinica-midias', file, prefix: key })
        uploadedPaths.push(uploaded.path)
      }

      setProvaSocial((prev) => {
        const prevArr = Array.isArray(prev?.[key]) ? (prev[key] as any[]) : []
        const nextArr = [...prevArr, ...uploadedPaths]
        const unique = Array.from(new Set(nextArr.filter(Boolean)))
        return { ...prev, [key]: unique }
      })
    } finally {
      setUploadingMidia(null)
    }
  }

  const removeFromProvaSocialMidia = async (key: 'cases_midias' | 'fotos_clinica_midias', path: string) => {
    setUploadingMidia(key)
    try {
      await deleteMidia({ bucket: 'clinica-midias', path })
      setProvaSocial((prev) => {
        const prevArr = Array.isArray(prev?.[key]) ? (prev[key] as any[]) : []
        return { ...prev, [key]: prevArr.filter((p) => p !== path) }
      })
    } finally {
      setUploadingMidia(null)
    }
  }

  const handleSaveConfig = async () => {
    const profissionaisPayload = (
      await Promise.all(
        selectedProfissionalIds.map(async (id) => {
          const prof = profissionaisExistentes.find((p) => p.id === id)
          if (!prof) return null
          let midiasDoProfissional: any[] = []
          try {
            midiasDoProfissional = await profissionalMidiasService.listByProfissionalId(id)
          } catch {
            midiasDoProfissional = []
          }
          return {
            ...prof,
            midias: midiasDoProfissional,
          }
        })
      )
    ).filter(Boolean)

    await updateClinicaConfig.mutateAsync({
      identidade,
      posicionamento,
      profissionais: profissionaisPayload,
      politicas,
      prova_social: provaSocial,
      midias,
      regras_internas: regrasInternas,
      gatilhos_diferenciais: gatilhos,
      extra: {
        ...extra,
        selected_profissional_ids: selectedProfissionalIds,
        selected_pacote_ids: selectedPacoteIds,
      },
    } as any)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Configurações de IA
          </h1>
          <p className="text-muted-foreground mt-1">Configure o comportamento e personalidade do assistente de IA da sua clínica</p>
        </div>
        <Button onClick={handleSaveConfig} disabled={updateClinicaConfig.isPending}>
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
        <Card>
          <CardHeader>
            <CardTitle>Identidade da Clínica</CardTitle>
            <CardDescription>Informações básicas e operacionais da clínica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nome da clínica</Label>
                <Input value={identidade.nome_clinica || ''} onChange={(e) => setIdentidade({ ...identidade, nome_clinica: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Nome fantasia</Label>
                <Input value={identidade.nome_fantasia || ''} onChange={(e) => setIdentidade({ ...identidade, nome_fantasia: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Nome do agente</Label>
                <Input value={identidade.nome_agente || ''} onChange={(e) => setIdentidade({ ...identidade, nome_agente: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>CNPJ (opcional)</Label>
                <Input value={identidade.cnpj || ''} onChange={(e) => setIdentidade({ ...identidade, cnpj: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Cidade / Estado</Label>
                <Input value={identidade.cidade_estado || ''} onChange={(e) => setIdentidade({ ...identidade, cidade_estado: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Endereço completo</Label>
                <Input value={identidade.endereco_completo || ''} onChange={(e) => setIdentidade({ ...identidade, endereco_completo: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Zona / Bairro</Label>
                <Input value={identidade.bairro || ''} onChange={(e) => setIdentidade({ ...identidade, bairro: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Telefone principal</Label>
                <Input value={identidade.telefone_principal || ''} onChange={(e) => setIdentidade({ ...identidade, telefone_principal: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Telefone da recepção</Label>
                <Input value={identidade.telefone_recepcao || ''} onChange={(e) => setIdentidade({ ...identidade, telefone_recepcao: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Site (opcional)</Label>
                <Input value={identidade.site || ''} onChange={(e) => setIdentidade({ ...identidade, site: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Redes sociais (uma por linha)</Label>
                <ListEditor
                  placeholder="Adicione redes sociais"
                  items={Array.isArray(identidade.redes_sociais) ? identidade.redes_sociais : []}
                  onChange={(items) => setIdentidade({ ...identidade, redes_sociais: items })}
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Horário de funcionamento</Label>
              {Object.entries(identidade.horarios_funcionamento || defaultHorarios).map(([dia, config]: [string, any]) => (
                <div key={dia} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-24">
                    <Label className="capitalize">{dia}</Label>
                  </div>
                  <Switch
                    checked={config?.ativo || false}
                    onCheckedChange={(checked) => {
                      const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                      const normalized = normalizePeriods(config)
                      if (checked && (!normalized.periodos || normalized.periodos.length === 0)) {
                        normalized.periodos = [{ inicio: normalized.inicio || '08:00', fim: normalized.fim || '18:00' }]
                      }
                      horarios[dia] = { ...normalized, ativo: checked }
                      setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                    }}
                  />
                  {config?.ativo ? (
                    <div className="flex-1">
                      <div className="space-y-2">
                        {(normalizePeriods(config).periodos || []).map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-14">{formatDayLabel(dia)} {idx + 1}</span>
                            <Input
                              type="time"
                              value={p?.inicio || '08:00'}
                              onChange={(e) => {
                                const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                                const normalized = normalizePeriods(config)
                                const nextPeriodos = Array.isArray(normalized.periodos) ? [...normalized.periodos] : []
                                nextPeriodos[idx] = { ...nextPeriodos[idx], inicio: e.target.value }
                                horarios[dia] = { ...normalized, periodos: nextPeriodos }
                                setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-500">às</span>
                            <Input
                              type="time"
                              value={p?.fim || '18:00'}
                              onChange={(e) => {
                                const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                                const normalized = normalizePeriods(config)
                                const nextPeriodos = Array.isArray(normalized.periodos) ? [...normalized.periodos] : []
                                nextPeriodos[idx] = { ...nextPeriodos[idx], fim: e.target.value }
                                horarios[dia] = { ...normalized, periodos: nextPeriodos }
                                setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                              }}
                              className="w-24"
                            />
                            {(normalizePeriods(config).periodos || []).length > 1 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9"
                                onClick={() => {
                                  const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                                  const normalized = normalizePeriods(config)
                                  const nextPeriodos = (Array.isArray(normalized.periodos) ? [...normalized.periodos] : []).filter((_: any, i: number) => i !== idx)
                                  horarios[dia] = { ...normalized, periodos: nextPeriodos }
                                  setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                                }}
                              >
                                Remover
                              </Button>
                            ) : null}
                          </div>
                        ))}

                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const horarios = { ...(identidade.horarios_funcionamento || defaultHorarios) }
                              const normalized = normalizePeriods(config)
                              const nextPeriodos = Array.isArray(normalized.periodos) ? [...normalized.periodos] : []
                              nextPeriodos.push({ inicio: '13:00', fim: '18:00' })
                              horarios[dia] = { ...normalized, periodos: nextPeriodos }
                              setIdentidade({ ...identidade, horarios_funcionamento: horarios })
                            }}
                          >
                            Adicionar intervalo
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Inativo</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfil e posicionamento</CardTitle>
            <CardDescription>Defina nicho, posicionamento e estilo de comunicação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nicho</Label>
                <Select value={(posicionamento.nicho as string) || 'multiestetica'} onValueChange={(value) => setPosicionamento({ ...posicionamento, nicho: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facial">Estética facial</SelectItem>
                    <SelectItem value="corporal">Estética corporal</SelectItem>
                    <SelectItem value="capilar">Estética capilar</SelectItem>
                    <SelectItem value="multiestetica">Multiestética</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Posicionamento da marca</Label>
                <Select
                  value={(posicionamento.posicionamento_marca as string) || 'intermediario'}
                  onValueChange={(value) => setPosicionamento({ ...posicionamento, posicionamento_marca: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economico">Econômico</SelectItem>
                    <SelectItem value="acessivel">Acessível</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="luxo">Luxo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Tom de voz da IA</Label>
                <Select value={(posicionamento.tom_voz_ia as string) || 'acolhedor'} onValueChange={(value) => setPosicionamento({ ...posicionamento, tom_voz_ia: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="humanizado">Humanizado</SelectItem>
                    <SelectItem value="acolhedor">Acolhedor</SelectItem>
                    <SelectItem value="tecnico_especialista">Técnico/Especialista</SelectItem>
                    <SelectItem value="direto_objetivo">Direto e objetivo</SelectItem>
                    <SelectItem value="vendedor_conversor">Vendedor/Conversor</SelectItem>
                    <SelectItem value="sofisticado">Sofisticado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Estilo de comunicação</Label>
                <Select value={(posicionamento.estilo_comunicacao as string) || 'medio'} onValueChange={(value) => setPosicionamento({ ...posicionamento, estilo_comunicacao: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="curto">Curto</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="detalhado">Detalhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Persona da marca (opcional)</Label>
                <Textarea value={posicionamento.persona_marca || ''} onChange={(e) => setPosicionamento({ ...posicionamento, persona_marca: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Slogan (opcional)</Label>
                <Textarea value={posicionamento.slogan || ''} onChange={(e) => setPosicionamento({ ...posicionamento, slogan: e.target.value })} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profissionais</CardTitle>
            <CardDescription>
              Selecione profissionais já cadastrados. A criação/edição fica na área de Profissionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Selecionar profissionais (IDs)</Label>
              <Select
                value=""
                onValueChange={(id) => {
                  setSelectedProfissionalIds((prev) => Array.from(new Set([...prev, id])))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profissionaisExistentes
                    .filter((p) => !selectedProfissionalIds.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProfissionalIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum profissional selecionado.</p>
            ) : (
              <div className="space-y-2">
                {selectedProfissionalIds.map((id) => {
                  const prof = profissionaisExistentes.find((p) => p.id === id)
                  return (
                    <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-sm">{prof?.nome || id}</div>
                      <Button variant="outline" onClick={() => setSelectedProfissionalIds((prev) => prev.filter((x) => x !== id))}>
                        Remover
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Políticas</CardTitle>
            <CardDescription>Regras que impactam a conversa e conversão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Avaliação</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Avaliação obrigatória?</Label>
                  <Switch checked={!!politicas.avaliacao?.obrigatoria} onCheckedChange={(checked) => setPoliticas({ ...politicas, avaliacao: { ...politicas.avaliacao, obrigatoria: checked } })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Avaliação gratuita?</Label>
                  <Switch checked={!!politicas.avaliacao?.gratuita} onCheckedChange={(checked) => setPoliticas({ ...politicas, avaliacao: { ...politicas.avaliacao, gratuita: checked } })} />
                </div>
                <div className="grid gap-2">
                  <Label>Valor (se houver)</Label>
                  <Input type="number" value={politicas.avaliacao?.valor ?? ''} onChange={(e) => setPoliticas({ ...politicas, avaliacao: { ...politicas.avaliacao, valor: e.target.value === '' ? null : Number(e.target.value) } })} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>IA pode agendar avaliação?</Label>
                  <Switch checked={!!politicas.avaliacao?.ia_pode_agendar} onCheckedChange={(checked) => setPoliticas({ ...politicas, avaliacao: { ...politicas.avaliacao, ia_pode_agendar: checked } })} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Agendamento</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>IA pode agendar procedimentos?</Label>
                  <Switch
                    checked={!!politicas.agendamento?.ia_pode_agendar_procedimentos}
                    onCheckedChange={(checked) =>
                      setPoliticas({
                        ...politicas,
                        agendamento: { ...politicas.agendamento, ia_pode_agendar_procedimentos: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Exige pagamento antecipado?</Label>
                  <Switch
                    checked={!!politicas.agendamento?.exige_pagamento_antecipado}
                    onCheckedChange={(checked) =>
                      setPoliticas({
                        ...politicas,
                        agendamento: { ...politicas.agendamento, exige_pagamento_antecipado: checked },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Exige sinal para reservar horário?</Label>
                  <Switch
                    checked={!!politicas.agendamento?.exige_sinal}
                    onCheckedChange={(checked) =>
                      setPoliticas({
                        ...politicas,
                        agendamento: { ...politicas.agendamento, exige_sinal: checked },
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Valor do sinal (se houver)</Label>
                  <Input
                    type="number"
                    value={politicas.agendamento?.valor_sinal ?? ''}
                    onChange={(e) =>
                      setPoliticas({
                        ...politicas,
                        agendamento: {
                          ...politicas.agendamento,
                          valor_sinal: e.target.value === '' ? null : Number(e.target.value),
                        },
                      })
                    }
                    disabled={!politicas.agendamento?.exige_sinal}
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Política de agendamento</Label>
                  <Textarea
                    value={politicas.agendamento?.politica_agendamento || ''}
                    onChange={(e) => setPoliticas({ ...politicas, agendamento: { ...politicas.agendamento, politica_agendamento: e.target.value } })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Valores</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>IA pode informar valores?</Label>
                  <Select value={politicas.valores?.ia_pode_informar || 'nao'} onValueChange={(value) => setPoliticas({ ...politicas, valores: { ...politicas.valores, ia_pode_informar: value } })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exato">Exato</SelectItem>
                      <SelectItem value="faixa">Faixa</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Texto padrão</Label>
                  <Textarea value={politicas.valores?.texto_padrao || ''} onChange={(e) => setPoliticas({ ...politicas, valores: { ...politicas.valores, texto_padrao: e.target.value } })} rows={3} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Texto padrão para políticas de valores</Label>
                  <Textarea
                    value={politicas.valores?.texto_padrao_politicas || ''}
                    onChange={(e) => setPoliticas({ ...politicas, valores: { ...politicas.valores, texto_padrao_politicas: e.target.value } })}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="text-base font-semibold">Cancelamento / no-show</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Regra de atrasos</Label>
                  <Textarea value={politicas.cancelamento_no_show?.regra_atrasos || ''} onChange={(e) => setPoliticas({ ...politicas, cancelamento_no_show: { ...politicas.cancelamento_no_show, regra_atrasos: e.target.value } })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label>Regra de remarcações</Label>
                  <Textarea value={politicas.cancelamento_no_show?.regra_remarcacoes || ''} onChange={(e) => setPoliticas({ ...politicas, cancelamento_no_show: { ...politicas.cancelamento_no_show, regra_remarcacoes: e.target.value } })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label>Penalidades</Label>
                  <Textarea value={politicas.cancelamento_no_show?.penalidades_ausencia || ''} onChange={(e) => setPoliticas({ ...politicas, cancelamento_no_show: { ...politicas.cancelamento_no_show, penalidades_ausencia: e.target.value } })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <Label>Texto padrão para IA</Label>
                  <Textarea value={politicas.cancelamento_no_show?.texto_padrao_ia || ''} onChange={(e) => setPoliticas({ ...politicas, cancelamento_no_show: { ...politicas.cancelamento_no_show, texto_padrao_ia: e.target.value } })} rows={2} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prova social / autoridade</CardTitle>
            <CardDescription>Dados para reforçar confiança.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Clientes atendidos (estimado)</Label>
                <Input type="number" value={provaSocial.clientes_atendidos ?? ''} onChange={(e) => setProvaSocial({ ...provaSocial, clientes_atendidos: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Procedimentos realizados</Label>
                <Input type="number" value={provaSocial.procedimentos_realizados ?? ''} onChange={(e) => setProvaSocial({ ...provaSocial, procedimentos_realizados: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Total de avaliações (Google)</Label>
                <Input type="number" value={provaSocial.avaliacoes_google_total ?? ''} onChange={(e) => setProvaSocial({ ...provaSocial, avaliacoes_google_total: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
              <div className="grid gap-2">
                <Label>Nota média (Google)</Label>
                <Input type="number" step="0.1" value={provaSocial.google_nota_media ?? ''} onChange={(e) => setProvaSocial({ ...provaSocial, google_nota_media: e.target.value === '' ? null : Number(e.target.value) })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Prêmios e reconhecimentos (um por linha)</Label>
                <ListEditor
                  placeholder="Adicione prêmios e reconhecimentos"
                  items={Array.isArray(provaSocial.premios_reconhecimentos) ? provaSocial.premios_reconhecimentos : []}
                  onChange={(items) => setProvaSocial({ ...provaSocial, premios_reconhecimentos: items })}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Depoimentos</Label>
                <div className="space-y-2">
                  {(Array.isArray(provaSocial.depoimentos) ? provaSocial.depoimentos : []).map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-3 space-y-2"
                      draggable
                      onDragStart={() => {
                        ;(window as any).__depoimento_drag_index__ = idx
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                      }}
                      onDrop={() => {
                        const from = (window as any).__depoimento_drag_index__
                        ;(window as any).__depoimento_drag_index__ = null
                        if (typeof from !== 'number') return
                        setProvaSocial((prev) => {
                          const arr = Array.isArray(prev.depoimentos) ? [...prev.depoimentos] : []
                          return { ...prev, depoimentos: reorder(arr, from, idx) }
                        })
                      }}
                    >
                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="grid gap-2">
                          <Label>Nome</Label>
                          <Input
                            value={d?.nome || ''}
                            onChange={(e) =>
                              setProvaSocial((prev) => {
                                const arr = Array.isArray(prev.depoimentos) ? [...prev.depoimentos] : []
                                arr[idx] = { ...arr[idx], nome: e.target.value }
                                return { ...prev, depoimentos: arr }
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Idade</Label>
                          <Input
                            type="number"
                            value={d?.idade ?? ''}
                            onChange={(e) =>
                              setProvaSocial((prev) => {
                                const arr = Array.isArray(prev.depoimentos) ? [...prev.depoimentos] : []
                                arr[idx] = { ...arr[idx], idade: e.target.value === '' ? null : Number(e.target.value) }
                                return { ...prev, depoimentos: arr }
                              })
                            }
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              setProvaSocial((prev) => {
                                const arr = Array.isArray(prev.depoimentos) ? [...prev.depoimentos] : []
                                return { ...prev, depoimentos: arr.filter((_: any, i: number) => i !== idx) }
                              })
                            }
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Depoimento</Label>
                        <Textarea
                          value={d?.depoimento || ''}
                          onChange={(e) =>
                            setProvaSocial((prev) => {
                              const arr = Array.isArray(prev.depoimentos) ? [...prev.depoimentos] : []
                              arr[idx] = { ...arr[idx], depoimento: e.target.value }
                              return { ...prev, depoimentos: arr }
                            })
                          }
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProvaSocial((prev) => ({ ...prev, depoimentos: [...(Array.isArray(prev.depoimentos) ? prev.depoimentos : []), { nome: '', idade: null, depoimento: '' }] }))}
                  >
                    Adicionar depoimento
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Cases (foto/vídeo)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="file:text-foreground file:bg-transparent file:border-0 file:mr-3"
                  disabled={!!uploadingMidia}
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length) uploadProvaSocialMidia('cases_midias', files)
                    e.currentTarget.value = ''
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  {(Array.isArray(provaSocial.cases_midias) ? provaSocial.cases_midias : []).map((path: string) => (
                    <div key={path} className="border rounded p-2 space-y-2">
                      {midiaUrls[path] ? (
                        path.toLowerCase().match(/\.(mp4|webm|ogg)$/) ? (
                          <video src={midiaUrls[path]} className="h-24 w-full object-cover rounded" controls />
                        ) : (
                          <img src={midiaUrls[path]} alt="Case" className="h-24 w-full object-cover rounded" />
                        )
                      ) : (
                        <div className="h-24 w-full rounded bg-muted" />
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={uploadingMidia === 'cases_midias'}
                        onClick={() => removeFromProvaSocialMidia('cases_midias', path)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Fotos da clínica (foto/vídeo)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="file:text-foreground file:bg-transparent file:border-0 file:mr-3"
                  disabled={!!uploadingMidia}
                  onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length) uploadProvaSocialMidia('fotos_clinica_midias', files)
                    e.currentTarget.value = ''
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  {(Array.isArray(provaSocial.fotos_clinica_midias) ? provaSocial.fotos_clinica_midias : []).map((path: string) => (
                    <div key={path} className="border rounded p-2 space-y-2">
                      {midiaUrls[path] ? (
                        path.toLowerCase().match(/\.(mp4|webm|ogg)$/) ? (
                          <video src={midiaUrls[path]} className="h-24 w-full object-cover rounded" controls />
                        ) : (
                          <img src={midiaUrls[path]} alt="Clínica" className="h-24 w-full object-cover rounded" />
                        )
                      ) : (
                        <div className="h-24 w-full rounded bg-muted" />
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={uploadingMidia === 'fotos_clinica_midias'}
                        onClick={() => removeFromProvaSocialMidia('fotos_clinica_midias', path)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mídias</CardTitle>
            <CardDescription>Faça upload e gerencie as mídias gerais da clínica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Imagem de apresentação</Label>
                <Input type="file" accept="image/*" className="file:text-foreground file:bg-transparent file:border-0 file:mr-3" disabled={!!uploadingMidia} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadSingleMidia('imagem_apresentacao', file)
                  e.currentTarget.value = ''
                }} />

                {midias?.imagem_apresentacao ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {midiaUrls.imagem_apresentacao ? (
                        <img src={midiaUrls.imagem_apresentacao} alt="Imagem de apresentação" className="h-16 w-16 object-cover rounded border" />
                      ) : (
                        <div className="h-16 w-16 rounded border bg-muted" />
                      )}
                      <div className="text-xs text-muted-foreground break-all">{midias.imagem_apresentacao}</div>
                    </div>
                    <Button variant="outline" disabled={uploadingMidia === 'imagem_apresentacao'} onClick={() => removeSingleMidia('imagem_apresentacao')}>
                      Remover
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Foto da fachada</Label>
                <Input type="file" accept="image/*" className="file:text-foreground file:bg-transparent file:border-0 file:mr-3" disabled={!!uploadingMidia} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadSingleMidia('foto_fachada', file)
                  e.currentTarget.value = ''
                }} />

                {midias?.foto_fachada ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {midiaUrls.foto_fachada ? (
                        <img src={midiaUrls.foto_fachada} alt="Foto da fachada" className="h-16 w-16 object-cover rounded border" />
                      ) : (
                        <div className="h-16 w-16 rounded border bg-muted" />
                      )}
                      <div className="text-xs text-muted-foreground break-all">{midias.foto_fachada}</div>
                    </div>
                    <Button variant="outline" disabled={uploadingMidia === 'foto_fachada'} onClick={() => removeSingleMidia('foto_fachada')}>
                      Remover
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label>Vídeo institucional</Label>
                <Input value={midias.video_institucional || ''} onChange={(e) => setMidias({ ...midias, video_institucional: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Fotos das salas</Label>
                <Input type="file" accept="image/*" multiple className="file:text-foreground file:bg-transparent file:border-0 file:mr-3" disabled={!!uploadingMidia} onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length) uploadMultiMidia('fotos_salas', files)
                  e.currentTarget.value = ''
                }} />

                <div className="grid grid-cols-3 gap-2">
                  {(Array.isArray(midias.fotos_salas) ? midias.fotos_salas : []).map((path: string) => (
                    <div key={path} className="border rounded p-2 space-y-2">
                      {midiaUrls[path] ? (
                        <img src={midiaUrls[path]} alt="Foto sala" className="h-24 w-full object-cover rounded" />
                      ) : (
                        <div className="h-24 w-full rounded bg-muted" />
                      )}
                      <Button variant="outline" className="w-full" disabled={uploadingMidia === 'fotos_salas'} onClick={() => removeFromListMidia('fotos_salas', path)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Antes/depois de paciente</Label>
                <Input type="file" accept="image/*" multiple className="file:text-foreground file:bg-transparent file:border-0 file:mr-3" disabled={!!uploadingMidia} onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length) uploadMultiMidia('antes_depois_genericos', files)
                  e.currentTarget.value = ''
                }} />

                <div className="grid grid-cols-3 gap-2">
                  {(Array.isArray(midias.antes_depois_genericos) ? midias.antes_depois_genericos : []).map((path: string) => (
                    <div key={path} className="border rounded p-2 space-y-2">
                      {midiaUrls[path] ? (
                        <img src={midiaUrls[path]} alt="Antes/depois" className="h-24 w-full object-cover rounded" />
                      ) : (
                        <div className="h-24 w-full rounded bg-muted" />
                      )}
                      <Button variant="outline" className="w-full" disabled={uploadingMidia === 'antes_depois_genericos'} onClick={() => removeFromListMidia('antes_depois_genericos', path)}>
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regras internas</CardTitle>
            <CardDescription>Restrições e diretrizes para a IA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tempo médio de resposta humana</Label>
                <Input value={regrasInternas.tempo_medio_resposta_humana || ''} onChange={(e) => setRegrasInternas({ ...regrasInternas, tempo_medio_resposta_humana: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Dias sem atendimento</Label>
                <Input value={regrasInternas.dias_sem_atendimento || ''} onChange={(e) => setRegrasInternas({ ...regrasInternas, dias_sem_atendimento: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Mensagens proibidas</Label>
                <Textarea value={regrasInternas.mensagens_proibidas || ''} onChange={(e) => setRegrasInternas({ ...regrasInternas, mensagens_proibidas: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Informações sensíveis</Label>
                <Textarea value={regrasInternas.informacoes_sensiveis || ''} onChange={(e) => setRegrasInternas({ ...regrasInternas, informacoes_sensiveis: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Quando transferir para humano</Label>
                <Textarea value={regrasInternas.quando_transferir_humano || ''} onChange={(e) => setRegrasInternas({ ...regrasInternas, quando_transferir_humano: e.target.value })} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diferenciais / gatilhos</CardTitle>
            <CardDescription>Pontos de valor e gatilhos de conversão.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Diferenciais</Label>
                <Textarea value={gatilhos.diferenciais || ''} onChange={(e) => setGatilhos({ ...gatilhos, diferenciais: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>O que importa para o cliente</Label>
                <Textarea value={gatilhos.o_que_importa_para_cliente || ''} onChange={(e) => setGatilhos({ ...gatilhos, o_que_importa_para_cliente: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Motivos para escolher</Label>
                <Textarea value={gatilhos.motivos_para_escolher || ''} onChange={(e) => setGatilhos({ ...gatilhos, motivos_para_escolher: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <Label>Garantias</Label>
                <Textarea value={gatilhos.garantias || ''} onChange={(e) => setGatilhos({ ...gatilhos, garantias: e.target.value })} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protocolos/Pacotes</CardTitle>
            <CardDescription>
              Selecione protocolos/pacotes já cadastrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Selecionar protocolo/pacote</Label>
              <Select
                value=""
                onValueChange={(id) => {
                  setSelectedPacoteIds((prev) => Array.from(new Set([...prev, id])))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {protocolosPacotes
                    .filter((p) => !selectedPacoteIds.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPacoteIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum protocolo/pacote selecionado.</p>
            ) : (
              <div className="space-y-2">
                {selectedPacoteIds.map((id) => {
                  const item = protocolosPacotes.find((p) => p.id === id)
                  return (
                    <div key={id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="text-sm">{item?.nome || id}</div>
                      <Button variant="outline" onClick={() => setSelectedPacoteIds((prev) => prev.filter((x) => x !== id))}>
                        Remover
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
