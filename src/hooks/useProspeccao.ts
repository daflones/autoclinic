import { useState } from 'react'
import { toast } from '@/lib/toast'
import { useWhatsAppInstance } from './useWhatsApp'
import { prospeccaoService } from '../services/api/prospeccao'
import { clientesService } from '../services/api/clientes'
import { prospeccaoLogsService } from '../services/api/prospeccao-logs'

// Interfaces
interface EstabelecimentoGoogleMaps {
  place_id: string
  nome: string
  endereco: string
  telefone?: string
}

interface ValidacaoWhatsApp {
  isWhatsApp: boolean
  jid?: string
  number?: string
}

interface DisparoProspeccao {
  id: string
  telefone: string
  jid: string
  mensagem: string
  data_envio: Date
  estabelecimento_nome: string
  status: 'enviado' | 'erro'
}

// Configurações das APIs
const EVOLUTION_API_BASE_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'https://evolutionapi.agenciagvcompany.com.br/'
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '3fkUb5AJcvYfXa3eduZLFAhlbkwM6pYB'

export const useProspeccao = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { data: whatsappInstance } = useWhatsAppInstance()

  // Buscar estabelecimentos no Google Maps (com verificação de duplicatas e paginação automática)
  const buscarEstabelecimentos = async (
    tipoEstabelecimento: string, 
    cidade: string,
    minEstabelecimentos: number = 10
  ): Promise<EstabelecimentoGoogleMaps[]> => {
    setIsLoading(true)
    
    try {
      console.log('🔍 Buscando estabelecimentos e verificando duplicatas...')
      
      const estabelecimentosFiltrados: EstabelecimentoGoogleMaps[] = []
      let duplicatasEncontradas = 0
      let nextPageToken: string | undefined
      let tentativas = 0
      const maxTentativas = 3 // Máximo 3 páginas (60 estabelecimentos)
      
      do {
        tentativas++
        console.log(`📄 Buscando página ${tentativas}${nextPageToken ? ` (token: ${nextPageToken.substring(0, 10)}...)` : ''}`)
        
        const resultado = await prospeccaoService.buscarEstabelecimentos(tipoEstabelecimento, cidade, nextPageToken)
        const estabelecimentosBrutos = resultado.estabelecimentos
        nextPageToken = resultado.nextPageToken
        
        console.log(`📋 Página ${tentativas}: ${estabelecimentosBrutos.length} estabelecimentos encontrados`)
        
        // Filtrar estabelecimentos já prospectados desta página
        for (const estabelecimento of estabelecimentosBrutos) {
          const jaProspectado = await prospeccaoLogsService.verificarJaProspectado(estabelecimento.place_id)
          
          if (jaProspectado) {
            console.log(`⏭️ Pulando ${estabelecimento.nome} - já prospectado anteriormente`)
            duplicatasEncontradas++
          } else {
            estabelecimentosFiltrados.push(estabelecimento)
          }
        }
        
        console.log(`📊 Após página ${tentativas}: ${estabelecimentosFiltrados.length} novos, ${duplicatasEncontradas} já prospectados`)
        
        // Aguardar 2 segundos entre páginas para respeitar rate limits
        if (nextPageToken && estabelecimentosFiltrados.length < minEstabelecimentos && tentativas < maxTentativas) {
          console.log('⏳ Aguardando 2 segundos antes da próxima página...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
      } while (
        nextPageToken && 
        estabelecimentosFiltrados.length < minEstabelecimentos && 
        tentativas < maxTentativas
      )
      
      console.log(`🎯 Busca finalizada: ${estabelecimentosFiltrados.length} novos estabelecimentos em ${tentativas} página(s)`)
      
      if (duplicatasEncontradas > 0) {
        toast.info(`${duplicatasEncontradas} estabelecimentos já foram prospectados anteriormente e foram pulados`)
      }
      
      if (estabelecimentosFiltrados.length === 0) {
        toast.warning('Todos os estabelecimentos encontrados já foram prospectados. Tente uma busca diferente.')
      }
      
      return estabelecimentosFiltrados

    } catch (error) {
      console.error('Erro ao buscar estabelecimentos:', error)
      toast.error('Erro ao buscar estabelecimentos no Google Maps')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Validar se um número é WhatsApp usando Evolution API
  const validarWhatsApp = async (telefone: string): Promise<ValidacaoWhatsApp> => {
    try {
      console.log('🔍 Validando WhatsApp para:', telefone)
      console.log('📱 Instância WhatsApp:', whatsappInstance)
      
      // Verificar se existe instância WhatsApp configurada
      if (!whatsappInstance?.instanceName) {
        console.error('❌ Nenhuma instância WhatsApp configurada')
        throw new Error('Nenhuma instância WhatsApp configurada. Configure na aba WhatsApp primeiro.')
      }

      console.log('✅ Instância encontrada:', whatsappInstance.instanceName)

      // Limpar e formatar o número
      const numeroLimpo = telefone.replace(/\D/g, '')
      
      // Se não começar com código do país, assumir Brasil (+55)
      const numeroFormatado = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`

      // URL correta conforme documentação: /chat/whatsappNumbers/{instance}
      const url = `${EVOLUTION_API_BASE_URL}chat/whatsappNumbers/${whatsappInstance.instanceName}`
      
      console.log('🌐 Fazendo requisição para Evolution API:', url)
      console.log('📞 Número formatado:', numeroFormatado)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          numbers: [numeroFormatado]
        })
      })

      console.log('📡 Resposta Evolution API status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Evolution API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('📋 Resposta Evolution API data:', data)
      
      // Verificar se o número é WhatsApp válido
      // Resposta esperada: [{ "exists": true, "jid": "553198296801@s.whatsapp.net", "number": "553198296801" }]
      if (data && Array.isArray(data) && data.length > 0) {
        const resultado = data[0]
        console.log('✅ Resultado validação:', resultado)
        return {
          isWhatsApp: resultado.exists === true,
          jid: resultado.jid,
          number: resultado.number
        }
      }

      console.log('❌ Número não é WhatsApp válido')
      return { isWhatsApp: false }

    } catch (error) {
      console.error('Erro ao validar WhatsApp:', error)
      return { isWhatsApp: false }
    }
  }

  // Enviar mensagem via Evolution API
  const enviarMensagem = async (numeroOuJid: string, mensagem: string): Promise<void> => {
    try {
      console.log('📤 Enviando mensagem para:', numeroOuJid)
      console.log('💬 Mensagem:', mensagem)
      
      // Verificar se existe instância WhatsApp configurada
      if (!whatsappInstance?.instanceName) {
        console.error('❌ Nenhuma instância WhatsApp configurada para envio')
        throw new Error('Nenhuma instância WhatsApp configurada. Configure na aba WhatsApp primeiro.')
      }

      console.log('✅ Instância para envio:', whatsappInstance.instanceName)

      // URL correta conforme documentação: /message/sendText/{instance}
      const url = `${EVOLUTION_API_BASE_URL}message/sendText/${whatsappInstance.instanceName}`
      
      // Extrair apenas o número do JID se necessário
      // JID formato: "553198296801@s.whatsapp.net" -> número: "553198296801"
      const numero = numeroOuJid.includes('@') ? numeroOuJid.split('@')[0] : numeroOuJid
      
      console.log('🌐 URL de envio:', url)
      console.log('📱 Número final:', numero)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          number: numero,
          text: mensagem
        })
      })

      console.log('📡 Status resposta envio:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erro no envio:', errorText)
        throw new Error(`Evolution API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('📋 Resposta envio:', data)
      
      // Resposta esperada: { "key": { "remoteJid": "553198296801@s.whatsapp.net", "fromMe": true, "id": "BAE594145F4C59B4" }, ... }
      if (!data.key || !data.key.id) {
        console.error('❌ Resposta inválida do envio:', data)
        throw new Error('Falha ao enviar mensagem - resposta inválida')
      }

      console.log('✅ Mensagem enviada com sucesso! ID:', data.key.id)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      throw error
    }
  }

  // Obter quantidade de disparos do dia atual
  const obterDisparosHoje = async (): Promise<number> => {
    try {
      const hoje = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const inicioHoje = `${hoje}T00:00:00.000Z`
      const fimHoje = `${hoje}T23:59:59.999Z`
      
      console.log('📊 Buscando disparos do dia:', { hoje, inicioHoje, fimHoje })
      
      // Buscar logs de prospecção do dia atual onde mensagem foi enviada
      const { data } = await prospeccaoLogsService.buscarLogs({
        data_inicio: inicioHoje,
        data_fim: fimHoje,
        mensagem_enviada: true,
        limit: 1000 // Limite alto para contar todos
      })
      
      const totalDisparos = data?.length || 0
      console.log('📊 Total de disparos hoje:', totalDisparos)
      
      return totalDisparos
    } catch (error) {
      console.error('Erro ao obter disparos do banco:', error)
      return 0
    }
  }


  // Obter histórico de disparos
  const obterHistoricoDisparos = async (dias: number = 7): Promise<DisparoProspeccao[]> => {
    try {
      const disparos: DisparoProspeccao[] = []
      const hoje = new Date()
      
      for (let i = 0; i < dias; i++) {
        const data = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000)
        const dataString = data.toISOString().split('T')[0]
        const chave = `disparos_prospeccao_${dataString}`
        
        const disparosDia = JSON.parse(localStorage.getItem(chave) || '[]')
        disparos.push(...disparosDia)
      }
      
      return disparos.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime())
    } catch (error) {
      console.error('Erro ao obter histórico:', error)
      return []
    }
  }

  // Salvar estabelecimento como cliente no banco de dados
  const salvarComoCliente = async (estabelecimento: EstabelecimentoGoogleMaps, telefoneWhatsApp: string, jid?: string): Promise<string | null> => {
    try {
      console.log('💾 Salvando estabelecimento como cliente:', estabelecimento.nome)
      
      // Extrair cidade e estado do endereço (formato: "Rua, Cidade - Estado, CEP")
      const enderecoPartes = estabelecimento.endereco.split(',')
      let cidade = 'Não informado'
      let estado = 'Não informado'
      
      if (enderecoPartes.length >= 2) {
        const cidadeEstado = enderecoPartes[enderecoPartes.length - 2].trim()
        const cidadeEstadoPartes = cidadeEstado.split(' - ')
        
        if (cidadeEstadoPartes.length >= 2) {
          cidade = cidadeEstadoPartes[0].trim()
          estado = cidadeEstadoPartes[1].trim()
        } else {
          cidade = cidadeEstado
        }
      }

      const clienteData = {
        // Dados básicos do contato
        nome_contato: estabelecimento.nome,
        email: '', // Será preenchido posteriormente se necessário
        whatsapp: telefoneWhatsApp,
        remotejid: jid || '', // JID do WhatsApp para envio de mensagens
        
        // Dados da empresa
        nome_empresa: estabelecimento.nome,
        razao_social: estabelecimento.nome, // Usar o mesmo nome inicialmente
        
        // Endereço
        endereco: estabelecimento.endereco,
        cidade: cidade,
        estado: estado,
        cep: '',
        pais: 'Brasil',
        
        // Classificação e pipeline
        etapa_pipeline: 'novo',
        classificacao: 'frio', // Usar 'frio' conforme constraint do banco
        origem: 'Prospecção',
        fonte_detalhada: 'Google Maps - Prospecção Automatizada',
        
        // Segmentação
        segmento_cliente: 'Não informado',
        
        // Qualificação inicial
        qualificacao_score: 0,
        qualificacao_completa: false,
        probabilidade: 0,
        valor_estimado: 0,
        
        // Critérios de qualificação (JSONB)
        criterios_qualificacao: {
          dados_completos: false,
          timeline_definida: false,
          autoridade_decisao: false,
          orcamento_definido: false,
          necessidade_urgente: false
        },
        
        // Informações faltantes
        informacoes_faltantes: ['email', 'telefone_empresa', 'segmento_cliente', 'produtos_interesse'],
        
        // Datas importantes
        primeiro_contato_em: new Date().toISOString(),
        data_ultima_etapa: new Date().toISOString(),
        
        // Observações e análise
        observacoes: `Cliente prospectado pelo sistema de prospecção automatizada via Google Maps. Place ID: ${estabelecimento.place_id}. Telefone WhatsApp validado. Este cliente será trabalhado pelo agente de prospecção para qualificação e desenvolvimento comercial.`,
        analise_cliente: 'Cliente prospectado em fase de conversão. Lead gerado automaticamente pelo sistema de prospecção, necessita abordagem comercial para qualificação e desenvolvimento da oportunidade.',
        
        // Controle de follow-up
        follow_up: true, // Marcar para follow-up automático
        respondeu_fup: false,
        
        // Configurações iniciais
        numero_pedidos: 0,
        proposta_enviada: false,
        formulario_site: false,
        cadastrado_rp: false
      }

      console.log('📋 Dados do cliente a serem salvos:', clienteData)

      const novoCliente = await clientesService.create(clienteData)
      
      console.log('✅ Cliente salvo com sucesso:', novoCliente.id)
      
      return novoCliente.id
      
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error)
      toast.error(`Erro ao salvar cliente ${estabelecimento.nome}`)
      throw error
    }
  }

  // Salvar log de prospecção no banco de dados
  const salvarLogProspeccao = async (
    estabelecimento: EstabelecimentoGoogleMaps,
    tipoEstabelecimento: string,
    cidade: string,
    whatsappValido: boolean,
    jid?: string,
    mensagensEnviada: boolean = false,
    clienteSalvo: boolean = false,
    clienteId?: string
  ): Promise<void> => {
    try {
      console.log('📝 Salvando log de prospecção:', estabelecimento.nome)
      
      // Criar observação detalhada baseada no resultado
      let observacoes = 'Prospectado automaticamente via Google Maps'
      
      if (!estabelecimento.telefone) {
        observacoes = 'Prospectado - Sem telefone cadastrado'
      } else if (!whatsappValido) {
        observacoes = 'Prospectado - WhatsApp inválido ou não encontrado'
      } else if (whatsappValido && !mensagensEnviada) {
        observacoes = 'Prospectado - WhatsApp válido, mas mensagem não foi enviada'
      } else if (whatsappValido && mensagensEnviada && clienteSalvo) {
        observacoes = 'Prospectado - Mensagem enviada com sucesso e salvo como cliente'
      } else if (whatsappValido && mensagensEnviada) {
        observacoes = 'Prospectado - Mensagem enviada com sucesso'
      }
      
      await prospeccaoLogsService.salvarLog({
        place_id: estabelecimento.place_id,
        nome_estabelecimento: estabelecimento.nome,
        endereco: estabelecimento.endereco,
        telefone: estabelecimento.telefone,
        whatsapp_valido: whatsappValido,
        jid: jid,
        mensagem_enviada: mensagensEnviada,
        cliente_salvo: clienteSalvo,
        cliente_id: clienteId,
        tipo_estabelecimento: tipoEstabelecimento,
        cidade: cidade,
        observacoes: observacoes
      })
      
      console.log('✅ Log de prospecção salvo com sucesso')
      
    } catch (error) {
      console.error('❌ Erro ao salvar log de prospecção:', error)
      // Não interromper o fluxo por erro no log
    }
  }

  return {
    buscarEstabelecimentos,
    validarWhatsApp,
    enviarMensagem,
    salvarComoCliente,
    salvarLogProspeccao,
    obterDisparosHoje,
    obterHistoricoDisparos,
    // Funções de logs
    buscarLogsProspeccao: prospeccaoLogsService.buscarLogs,
    obterEstatisticasProspeccao: prospeccaoLogsService.obterEstatisticas,
    isLoading
  }
}
