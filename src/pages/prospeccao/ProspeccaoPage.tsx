import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Play, 
  Pause, 
  Square, 
  MapPin, 
  Phone, 
  MessageSquare,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { useProspeccao } from '../../hooks/useProspeccao'
import { useWhatsAppInstance } from '../../hooks/useWhatsApp'
import LogsProspeccaoTable from '../../components/prospeccao/LogsProspeccaoTable'
import { setProspeccaoLogCallback } from '../../services/api/prospeccao'

interface ProspeccaoConfig {
  tipo_estabelecimento: string
  cidade: string
  mensagem: string
  tempo_entre_disparos: number // em segundos
  limite_disparos_dia: number
}

interface EstabelecimentoProspectado {
  id: string
  nome: string
  telefone: string
  endereco: string
  place_id: string
  status: 'pendente' | 'validando' | 'whatsapp_valido' | 'whatsapp_invalido' | 'mensagem_enviada' | 'erro'
  jid?: string
  erro?: string
  data_processamento?: Date
}

interface ProspeccaoStatus {
  ativa: boolean
  pausada: boolean
  total_encontrados: number
  total_processados: number
  total_whatsapp_validos: number
  total_mensagens_enviadas: number
  disparos_hoje: number
  progresso: number
}

export default function ProspeccaoPage() {
  const [config, setConfig] = useState<ProspeccaoConfig>({
    tipo_estabelecimento: '',
    cidade: '',
    mensagem: 'Olá, tudo bem?',
    tempo_entre_disparos: 600, // 10 minutos fixo
    limite_disparos_dia: 100 // 100 disparos fixo
  })

  const [status, setStatus] = useState<ProspeccaoStatus>({
    ativa: false,
    pausada: false,
    total_encontrados: 0,
    total_processados: 0,
    total_whatsapp_validos: 0,
    total_mensagens_enviadas: 0,
    disparos_hoje: 0,
    progresso: 0
  })

  const [estabelecimentos, setEstabelecimentos] = useState<EstabelecimentoProspectado[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [tempoRestante, setTempoRestante] = useState<number>(0) // Tempo restante em segundos
  const [proximoPendenteId, setProximoPendenteId] = useState<string | null>(null)
  
  // Controle de pausa/parada em tempo real
  const prospeccaoControlRef = useRef({
    ativa: false,
    pausada: false
  })

  const {
    buscarEstabelecimentos,
    validarWhatsApp,
    enviarMensagem,
    salvarComoCliente,
    salvarLogProspeccao,
    obterDisparosHoje,
    isLoading
  } = useProspeccao()

  const { data: whatsappInstance } = useWhatsAppInstance()

  // Função para adicionar logs
  const adicionarLog = (mensagem: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${mensagem}`, ...prev.slice(0, 99)]) // Manter apenas 100 logs
  }

  // Configurar callback de logs do serviço
  useEffect(() => {
    setProspeccaoLogCallback(adicionarLog)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (tempoRestante <= 0) {
      setProximoPendenteId(null)
      return
    }

    const interval = setInterval(() => {
      setTempoRestante(prev => {
        if (prev <= 1) {
          setProximoPendenteId(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [tempoRestante])

  // Carregar disparos do dia atual
  useEffect(() => {
    const carregarDisparosHoje = async () => {
      try {
        const disparos = await obterDisparosHoje()
        setStatus(prev => ({ ...prev, disparos_hoje: disparos }))
      } catch (error) {
        console.error('Erro ao carregar disparos:', error)
      }
    }
    carregarDisparosHoje()
  }, [])

  // Avisar usuário ao tentar sair com prospecção ativa
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (status.ativa) {
        e.preventDefault()
        e.returnValue = 'A prospecção está em andamento. Se você sair, ela será interrompida. Deseja continuar?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [status.ativa])

  const continuarProspeccaoExistente = async () => {
    try {
      // Atualizar controle em tempo real
      prospeccaoControlRef.current = { ativa: true, pausada: false }
      setStatus(prev => ({ ...prev, ativa: true, pausada: false }))

      // Filtrar apenas estabelecimentos pendentes
      const estabelecimentosPendentes = estabelecimentos.filter(est => 
        est.status === 'pendente' || est.status === 'validando'
      )

      console.log('🔄 Continuando prospecção existente...')
      console.log(`📋 ${estabelecimentosPendentes.length} estabelecimentos pendentes`)

      // Processar estabelecimentos pendentes
      await processarFilaEstabelecimentos(estabelecimentosPendentes)
      
      console.log('✅ Continuação da prospecção finalizada!')

    } catch (error) {
      console.error('Erro ao continuar prospecção:', error)
      toast.error('Erro ao continuar prospecção')
      adicionarLog(`Erro: ${error}`)
      setStatus(prev => ({ ...prev, ativa: false }))
    }
  }

  const iniciarProspeccao = async () => {
    if (!config.tipo_estabelecimento || !config.cidade) {
      toast.error('Preencha o tipo de estabelecimento e cidade')
      return
    }

    if (!whatsappInstance?.instanceName) {
      toast.error('Nenhuma instância WhatsApp configurada. Configure na aba WhatsApp primeiro.')
      return
    }

    if (whatsappInstance.status !== 'open') {
      toast.error('Instância WhatsApp não está conectada. Verifique a conexão na aba WhatsApp.')
      return
    }

    // Verificar se já existem estabelecimentos pendentes
    const estabelecimentosPendentes = estabelecimentos.filter(est => 
      est.status === 'pendente' || est.status === 'validando'
    )

    if (estabelecimentosPendentes.length > 0) {
      const continuar = window.confirm(
        `Existe uma prospecção pendente com ${estabelecimentosPendentes.length} estabelecimentos não processados.\n\n` +
        `Deseja:\n` +
        `• OK: Continuar a prospecção existente\n` +
        `• Cancelar: Fazer nova busca (dados atuais serão perdidos)`
      )

      if (continuar) {
        // Continuar prospecção existente
        adicionarLog(`▶️ Retomando prospecção de ${estabelecimentosPendentes.length} estabelecimentos...`)
        await continuarProspeccaoExistente()
        return
      } else {
        // Limpar dados existentes para nova busca
        setEstabelecimentos([])
        adicionarLog('🔄 Iniciando nova busca...')
      }
    }

    try {
      // Atualizar controle em tempo real
      prospeccaoControlRef.current = { ativa: true, pausada: false }
      setStatus(prev => ({ ...prev, ativa: true, pausada: false }))
      adicionarLog('🚀 Iniciando nova prospecção...')

      // Buscar estabelecimentos no Google Maps
      adicionarLog(`🔍 Pesquisando ${config.tipo_estabelecimento} em ${config.cidade}...`)
      console.log('🔍 Iniciando busca de estabelecimentos...')
      
      const resultados = await buscarEstabelecimentos(config.tipo_estabelecimento, config.cidade)
      console.log('✅ Estabelecimentos encontrados:', resultados.length)
      
      const estabelecimentosEncontrados: EstabelecimentoProspectado[] = resultados.map(est => ({
        id: est.place_id,
        nome: est.nome,
        telefone: est.telefone || '',
        endereco: est.endereco,
        place_id: est.place_id,
        status: 'pendente'
      }))

      console.log('📋 Estabelecimentos mapeados:', estabelecimentosEncontrados.length)

      setEstabelecimentos(estabelecimentosEncontrados)
      setStatus(prev => ({ 
        ...prev, 
        total_encontrados: estabelecimentosEncontrados.length 
      }))

      adicionarLog(`✅ Encontrados ${estabelecimentosEncontrados.length} estabelecimentos na região`)
      console.log('🚀 Iniciando processamento da fila...')

      // Processar estabelecimentos em fila
      await processarFilaEstabelecimentos(estabelecimentosEncontrados)
      
      console.log('✅ Processamento da fila finalizado!')

    } catch (error) {
      console.error('Erro na prospecção:', error)
      toast.error('Erro ao iniciar prospecção')
      adicionarLog(`Erro: ${error}`)
      setStatus(prev => ({ ...prev, ativa: false }))
    }
  }

  const processarFilaEstabelecimentos = async (estabelecimentosList: EstabelecimentoProspectado[]) => {
    console.log('🚀 Iniciando processamento da fila:', estabelecimentosList.length, 'estabelecimentos')
    adicionarLog(`📋 Iniciando análise de ${estabelecimentosList.length} estabelecimentos...`)
    
    let processados = 0
    let whatsappValidos = 0
    let mensagensEnviadas = 0
    let disparosHoje = status.disparos_hoje

    console.log('📊 Status inicial:', { processados, whatsappValidos, mensagensEnviadas, disparosHoje })

    for (const estabelecimento of estabelecimentosList) {
      console.log(`🔄 Processando estabelecimento ${processados + 1}/${estabelecimentosList.length}:`, estabelecimento.nome)
      
      // Verificar se a prospecção foi pausada ou parada
      if (!prospeccaoControlRef.current.ativa) {
        adicionarLog('⏹️ Prospecção interrompida')
        break
      }

      // Aguardar enquanto pausada
      if (prospeccaoControlRef.current.pausada && prospeccaoControlRef.current.ativa) {
        adicionarLog('⏸️ Aguardando retomada...')
        
        while (prospeccaoControlRef.current.pausada && prospeccaoControlRef.current.ativa) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1 segundo
        }
        
        if (prospeccaoControlRef.current.ativa) {
          adicionarLog('▶️ Retomando prospecção...')
        }
      }

      // Verificar novamente se foi parada durante a pausa
      if (!prospeccaoControlRef.current.ativa) {
        adicionarLog('⏹️ Prospecção interrompida')
        break
      }

      // Verificar limite diário
      if (disparosHoje >= config.limite_disparos_dia) {
        adicionarLog('⚠️ Limite diário de 100 disparos atingido')
        break
      }

      console.log(`📞 Telefone do estabelecimento ${estabelecimento.nome}:`, estabelecimento.telefone)
      
      if (!estabelecimento.telefone) {
        console.log(`❌ Estabelecimento sem telefone: ${estabelecimento.nome}`)
        processados++
        setEstabelecimentos(prev => 
          prev.map((est: EstabelecimentoProspectado) => 
            est.id === estabelecimento.id 
              ? { ...est, status: 'erro', erro: 'Telefone não encontrado' }
              : est
          )
        )
        continue
      }

      // Declarar variáveis fora do try/catch para uso posterior
      let clienteId: string | null = null
      let mensagemEnviada = false
      let validacao: any = null

      try {
        // Atualizar status para validando
        setEstabelecimentos(prev => 
          prev.map((est: EstabelecimentoProspectado) => 
            est.id === estabelecimento.id 
              ? { ...est, status: 'validando' }
              : est
          )
        )

        adicionarLog(`📞 Verificando WhatsApp de ${estabelecimento.nome}...`)
        console.log(`🔍 Iniciando validação WhatsApp para: ${estabelecimento.nome}`)

        // Validar WhatsApp
        validacao = await validarWhatsApp(estabelecimento.telefone)
        console.log(`📋 Resultado validação:`, validacao)

        if (validacao.isWhatsApp && validacao.jid) {
          whatsappValidos++
          
          // Atualizar status para WhatsApp válido
          setEstabelecimentos(prev => 
            prev.map((est: EstabelecimentoProspectado) => 
              est.id === estabelecimento.id 
                ? { ...est, status: 'whatsapp_valido', jid: validacao.jid }
                : est
            )
          )

          adicionarLog(`✅ ${estabelecimento.nome} tem WhatsApp ativo`)

          // Salvar como cliente no banco de dados
          try {
            clienteId = await salvarComoCliente({
              place_id: estabelecimento.place_id,
              nome: estabelecimento.nome,
              endereco: estabelecimento.endereco,
              telefone: estabelecimento.telefone
            }, estabelecimento.telefone, validacao.jid)
            
            adicionarLog(`💾 ${estabelecimento.nome} adicionado como cliente`)
            toast.success(`Cliente ${estabelecimento.nome} salvo com sucesso!`)
          } catch (error) {
            console.error('Erro ao salvar cliente:', error)
            adicionarLog(`⚠️ Não foi possível salvar ${estabelecimento.nome} como cliente`)
          }

          // Enviar mensagem
          try {
            await enviarMensagem(validacao.jid, config.mensagem)
            mensagensEnviadas++
            disparosHoje++
            mensagemEnviada = true

            setEstabelecimentos(prev => 
              prev.map((est: EstabelecimentoProspectado) => 
                est.id === estabelecimento.id 
                  ? { ...est, status: 'mensagem_enviada', data_processamento: new Date() }
                  : est
              )
            )

            adicionarLog(`📨 Mensagem enviada para ${estabelecimento.nome}`)

            // Iniciar countdown para próximo pendente
            const proximoPendente = estabelecimentosList.find((est, idx) => 
              idx > estabelecimentosList.indexOf(estabelecimento) && 
              (est.status === 'pendente' || est.status === 'validando')
            )
            
            if (proximoPendente) {
              setProximoPendenteId(proximoPendente.id)
              setTempoRestante(config.tempo_entre_disparos)
            }

          } catch (error) {
            setEstabelecimentos(prev => 
              prev.map((est: EstabelecimentoProspectado) => 
                est.id === estabelecimento.id 
                  ? { ...est, status: 'erro', erro: 'Erro ao enviar mensagem' }
                  : est
              )
            )
            adicionarLog(`❌ Não foi possível enviar mensagem para ${estabelecimento.nome}`)
          }

        } else {
          setEstabelecimentos(prev => 
            prev.map((est: EstabelecimentoProspectado) => 
              est.id === estabelecimento.id 
                ? { ...est, status: 'whatsapp_invalido' }
                : est
            )
          )
          adicionarLog(`❌ ${estabelecimento.nome} não tem WhatsApp ativo`)
        }

        // Salvar log de prospecção no banco de dados (não interromper se falhar)
        try {
          await salvarLogProspeccao(
            {
              place_id: estabelecimento.place_id,
              nome: estabelecimento.nome,
              endereco: estabelecimento.endereco,
              telefone: estabelecimento.telefone
            },
            config.tipo_estabelecimento,
            config.cidade,
            validacao?.isWhatsApp || false,
            validacao?.jid,
            mensagemEnviada,
            !!clienteId,
            clienteId || undefined
          )
        } catch (logError) {
          console.error('Erro ao salvar log (continuando prospecção):', logError)
          // Log silencioso - não interromper usuário com detalhes técnicos
        }

      } catch (error) {
        setEstabelecimentos(prev => 
          prev.map((est: EstabelecimentoProspectado) => 
            est.id === estabelecimento.id 
              ? { ...est, status: 'erro', erro: `Erro na validação: ${error}` }
              : est
          )
        )
        adicionarLog(`⚠️ Erro ao processar ${estabelecimento.nome}`)
      }

      processados++
      console.log(`✅ Estabelecimento ${processados}/${estabelecimentosList.length} processado: ${estabelecimento.nome}`)
      
      // Determinar se houve sucesso ou erro baseado nas variáveis locais (mais confiável)
      const houveSucesso = mensagemEnviada
      const houveErro = !estabelecimento.telefone ||                    // Sem telefone
                       !validacao ||                                   // Erro na validação
                       (validacao && !validacao.isWhatsApp) ||         // WhatsApp inválido
                       (validacao?.isWhatsApp && !mensagemEnviada)     // WhatsApp válido mas erro no envio
      
      console.log(`📊 Status do processamento:`, {
        estabelecimento: estabelecimento.nome,
        telefone: estabelecimento.telefone,
        whatsappValido: validacao?.isWhatsApp,
        mensagemEnviada,
        houveSucesso,
        houveErro
      })
      
      // Atualizar status geral
      setStatus(prev => ({
        ...prev,
        total_processados: processados,
        total_whatsapp_validos: whatsappValidos,
        total_mensagens_enviadas: mensagensEnviadas,
        disparos_hoje: disparosHoje,
        progresso: (processados / estabelecimentosList.length) * 100
      }))

      // Aguardar tempo configurado apenas se houve sucesso (mensagem enviada)
      // Em caso de erro, pular para o próximo imediatamente
      if (processados < estabelecimentosList.length) {
        if (houveSucesso) {
          const minutos = Math.floor(config.tempo_entre_disparos / 60)
          adicionarLog(`⏱️ Aguardando ${minutos} minutos para próximo contato...`)
          console.log(`⏳ Aguardando ${config.tempo_entre_disparos} segundos (sucesso)`)
          await new Promise(resolve => setTimeout(resolve, config.tempo_entre_disparos * 1000))
        } else if (houveErro) {
          if (!estabelecimento.telefone) {
            adicionarLog(`➡️ Pulando para próximo (sem telefone cadastrado)`)
          } else if (!validacao) {
            adicionarLog(`➡️ Pulando para próximo (erro na verificação)`)
          } else if (!validacao.isWhatsApp) {
            adicionarLog(`➡️ Pulando para próximo (WhatsApp não encontrado)`)
          } else {
            adicionarLog(`➡️ Pulando para próximo (erro no envio)`)
          }
          console.log(`⚡ Pulando para próximo (erro detectado)`)
          // Aguardar apenas 1 segundo para não sobrecarregar o sistema
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          // Caso padrão - aguardar tempo normal
          const minutos = Math.floor(config.tempo_entre_disparos / 60)
          adicionarLog(`⏱️ Aguardando ${minutos} minutos...`)
          console.log(`⏳ Aguardando ${config.tempo_entre_disparos} segundos (padrão)`)
          await new Promise(resolve => setTimeout(resolve, config.tempo_entre_disparos * 1000))
        }
      }
    }

    console.log('📊 Estatísticas finais:', { processados, whatsappValidos, mensagensEnviadas })
    
    // Limpar controle em tempo real
    prospeccaoControlRef.current = { ativa: false, pausada: false }
    
    // Limpar timer ao finalizar
    setTempoRestante(0)
    setProximoPendenteId(null)
    
    setStatus(prev => ({ 
      ...prev, 
      ativa: false, 
      pausada: false,
      processados,
      whatsapp_validos: whatsappValidos,
      mensagens_enviadas: mensagensEnviadas
    }))
    adicionarLog(`🎉 Prospecção concluída! ${mensagensEnviadas} mensagens enviadas de ${processados} estabelecimentos analisados`)
    toast.success('Prospecção finalizada!')
  }

  const pausarProspeccao = () => {
    const novoPausado = !status.pausada
    
    // Atualizar controle em tempo real
    prospeccaoControlRef.current.pausada = novoPausado
    
    // Limpar timer ao pausar
    if (novoPausado) {
      setTempoRestante(0)
      setProximoPendenteId(null)
    }
    
    setStatus(prev => ({ ...prev, pausada: novoPausado }))
    adicionarLog(novoPausado ? '⏸️ Prospecção pausada' : '▶️ Prospecção retomada')
  }

  const pararProspeccao = () => {
    // Atualizar controle em tempo real
    prospeccaoControlRef.current.ativa = false
    prospeccaoControlRef.current.pausada = false
    
    // Limpar timer ao parar
    setTempoRestante(0)
    setProximoPendenteId(null)
    
    setStatus(prev => ({ 
      ...prev, 
      ativa: false, 
      pausada: false 
    }))
    adicionarLog('⏹️ Prospecção interrompida')
  }

  const getStatusIcon = (statusItem: string) => {
    switch (statusItem) {
      case 'pendente': return <Clock className="h-4 w-4 text-gray-500" />
      case 'validando': return <Search className="h-4 w-4 text-blue-500 animate-spin" />
      case 'whatsapp_valido': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'whatsapp_invalido': return <XCircle className="h-4 w-4 text-red-500" />
      case 'mensagem_enviada': return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'erro': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (statusItem: string) => {
    switch (statusItem) {
      case 'pendente': return 'bg-gray-100 text-gray-800'
      case 'validando': return 'bg-blue-100 text-blue-800'
      case 'whatsapp_valido': return 'bg-green-100 text-green-800'
      case 'whatsapp_invalido': return 'bg-red-100 text-red-800'
      case 'mensagem_enviada': return 'bg-green-100 text-green-800'
      case 'erro': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatarTempoRestante = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    return `${minutos}:${String(segs).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prospecção</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema automatizado de prospecção via WhatsApp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {status.disparos_hoje}/{config.limite_disparos_dia} disparos hoje
          </Badge>
          {whatsappInstance ? (
            <Badge 
              variant={whatsappInstance.status === 'open' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              WhatsApp: {whatsappInstance.status === 'open' ? 'Conectado' : 'Desconectado'}
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              WhatsApp: Não configurado
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prospeccao" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prospeccao" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Prospecção Ativa
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prospeccao" className="space-y-6">
          {/* Aviso Importante */}
          {status.ativa && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    ⚠️ Mantenha esta aba aberta
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    A prospecção está em andamento. <strong>Não feche esta aba</strong> ou a prospecção será interrompida. 
                    Você pode minimizar o navegador, mas a aba precisa permanecer aberta.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuração */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Configuração
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                <Label htmlFor="tipo_estabelecimento" className="text-sm">Tipo de Estabelecimento</Label>
                <Input
                  id="tipo_estabelecimento"
                  placeholder="Ex: restaurante, farmácia, loja de roupas"
                  value={config.tipo_estabelecimento}
                  onChange={(e) => setConfig(prev => ({ ...prev, tipo_estabelecimento: e.target.value }))}
                  disabled={status.ativa}
                />
              </div>

              <div>
                <Label htmlFor="cidade" className="text-sm">Cidade/Estado/País</Label>
                <Input
                  id="cidade"
                  placeholder="Ex: São Paulo, SP, Brasil"
                  value={config.cidade}
                  onChange={(e) => setConfig(prev => ({ ...prev, cidade: e.target.value }))}
                  disabled={status.ativa}
                />
              </div>

              <div>
                <Label htmlFor="mensagem" className="text-sm">Mensagem a Enviar</Label>
                <Textarea
                  id="mensagem"
                  placeholder="Mensagem fixa do sistema"
                  rows={2}
                  value={config.mensagem}
                  readOnly
                  disabled
                  className="bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Esta mensagem é enviada para atrair resposta do Lead e evitar mensagens de saudação automática.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tempo_disparos" className="text-sm">Tempo entre Disparos</Label>
                  <Input
                    id="tempo_disparos"
                    type="text"
                    value="10 minutos"
                    readOnly
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Tempo fixo para evitar bloqueios
                  </p>
                </div>

                <div>
                  <Label htmlFor="limite_disparos" className="text-sm">Limite Diário</Label>
                  <Input
                    id="limite_disparos"
                    type="text"
                    value="100 disparos"
                    readOnly
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Limite fixo por dia
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {!status.ativa ? (
                  <>
                    <Button 
                      onClick={iniciarProspeccao} 
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Prospecção
                    </Button>
                    
                    {/* Botão Resumir - aparece quando há estabelecimentos pendentes */}
                    {estabelecimentos.filter(est => est.status === 'pendente' || est.status === 'validando').length > 0 && (
                      <Button 
                        onClick={continuarProspeccaoExistente} 
                        disabled={isLoading}
                        variant="outline"
                        className="flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resumir ({estabelecimentos.filter(est => est.status === 'pendente' || est.status === 'validando').length})
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={pausarProspeccao}
                      variant="outline"
                      className="flex-1"
                    >
                      {status.pausada ? (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Retomar
                        </>
                      ) : (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pausar
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={pararProspeccao}
                      variant="destructive"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Parar
                    </Button>
                  </>
                )}
              </div>
                </CardContent>
              </Card>
            </div>

            {/* Status e Progresso */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cards de Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Encontrados</p>
                        <p className="text-2xl font-bold">{status.total_encontrados}</p>
                      </div>
                      <MapPin className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Processados</p>
                        <p className="text-2xl font-bold">{status.total_processados}</p>
                      </div>
                      <Search className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">WhatsApp Válidos</p>
                        <p className="text-2xl font-bold">{status.total_whatsapp_validos}</p>
                      </div>
                      <Phone className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Mensagens Enviadas</p>
                        <p className="text-2xl font-bold">{status.total_mensagens_enviadas}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Barra de Progresso */}
              {status.ativa && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progresso da Prospecção</span>
                        <span className="text-sm text-gray-600">{Math.round(status.progresso)}%</span>
                      </div>
                      <Progress value={status.progresso} className="h-2" />
                      {status.pausada && (
                        <p className="text-sm text-orange-600 flex items-center gap-1">
                          <Pause className="h-3 w-3" />
                          Prospecção pausada
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de Estabelecimentos */}
              {estabelecimentos.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Estabelecimentos Encontrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {estabelecimentos.map((estabelecimento) => (
                        <div 
                          key={estabelecimento.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(estabelecimento.status)}
                              <h4 className="font-medium">{estabelecimento.nome}</h4>
                            </div>
                            <p className="text-sm text-gray-600">{estabelecimento.endereco}</p>
                            {estabelecimento.telefone && (
                              <p className="text-sm text-gray-600">{estabelecimento.telefone}</p>
                            )}
                            {estabelecimento.erro && (
                              <p className="text-sm text-red-600">{estabelecimento.erro}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {estabelecimento.id === proximoPendenteId && tempoRestante > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-md text-sm font-medium shadow-sm">
                                <Clock className="h-3 w-3 animate-pulse" />
                                <span className="font-mono">{formatarTempoRestante(tempoRestante)}</span>
                              </div>
                            )}
                            <Badge className={getStatusColor(estabelecimento.status)}>
                              {estabelecimento.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Logs */}
              <Card>
                <CardHeader>
                  <CardTitle>Logs da Prospecção</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-3 rounded font-mono text-sm">
                    {logs.length === 0 ? (
                      <p className="text-gray-500">Nenhum log ainda...</p>
                    ) : (
                      logs.map((log, index) => (
                        <div key={index} className="text-gray-700 dark:text-gray-300">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <LogsProspeccaoTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
