import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal'
import express from 'express'
import { WebSocketServer } from 'ws'
import http from 'http'
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv'
import axios from 'axios'

// Configuração do servidor
const app = express();
const PORT = 3001;

dotenv.config()

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Criar servidor HTTP
const server = createServer(app);

// Criar servidor WebSocket no mesmo servidor HTTP
const wss = new WebSocketServer({ 
  server,
  path: '/whatsapp-web'
});

// Instância do WhatsApp
let whatsappClient = null;
let isClientReady = false;
let connectedClients = new Set();

const disparosBatches = new Map();
const disparosJobs = new Map();

const DISPAROS_MAX_PER_BATCH = 30
const dailySentBySendNumber = new Map() // sendNumberDigits -> YYYY-MM-DD (America/Sao_Paulo)

function getDateKeySaoPaulo(ts) {
  const d = new Date(typeof ts === 'number' ? ts : Date.now())
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const da = parts.find((p) => p.type === 'day')?.value
  if (!y || !m || !da) return d.toISOString().slice(0, 10)
  return `${y}-${m}-${da}`
}

function normalizeSendNumberDigits(sendNumber) {
  const raw = String(sendNumber || '').trim()
  if (!raw) return ''
  const clean = raw.replace(/\D/g, '')
  if (!clean) return ''
  return clean.startsWith('55') ? clean : `55${clean}`
}

function isPendingStatus(status) {
  return status === 'scheduled' || status === 'running'
}

function getActiveNumbersByInstance(instanceName) {
  const active = new Set()
  for (const job of disparosJobs.values()) {
    if (job.instanceName !== instanceName) continue
    if (!isPendingStatus(job.status)) continue
    if (job.number) active.add(job.number)
  }
  return active
}

function summarizeBatch(batch) {
  const jobs = (batch.jobIds || []).map((id) => disparosJobs.get(id)).filter(Boolean)
  const counts = jobs.reduce(
    (acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1
      return acc
    },
    { scheduled: 0, running: 0, sent: 0, failed: 0, canceled: 0 }
  )
  return {
    ...batch,
    counts,
    total: jobs.length,
  }
}

function createJobsForInstance({ instanceName, items, minMinutes, maxMinutes }) {
  const createdAt = new Date().toISOString()
  const existingActiveNumbers = getActiveNumbersByInstance(instanceName)
  const skipped = []
  const seenInRequest = new Set()
  const jobIds = []

  if (items.length > DISPAROS_MAX_PER_BATCH) {
    throw new Error(`Máximo de ${DISPAROS_MAX_PER_BATCH} pacientes por sessão/batch`)
  }

  for (const it of items) {
    const number = typeof it?.number === 'string' ? it.number : String(it?.number ?? '')
    const sendNumber =
      typeof it?.sendNumber === 'string'
        ? it.sendNumber
        : typeof it?.send_number === 'string'
          ? it.send_number
          : ''
    const baseText = String(it?.text ?? '').trim()
    const patientName = String(it?.patientName ?? it?.patient_name ?? '').trim()
    if (!number || !baseText) continue
    if (!String(sendNumber).trim()) {
      skipped.push({ number, reason: 'missing_send_number' })
      continue
    }

    if (seenInRequest.has(number)) {
      skipped.push({ number, reason: 'duplicate_in_request' })
      continue
    }
    seenInRequest.add(number)

    if (existingActiveNumbers.has(number)) {
      skipped.push({ number, reason: 'already_pending' })
      continue
    }

    const sendNumberDigits = normalizeSendNumberDigits(sendNumber)
    const todayKey = getDateKeySaoPaulo(Date.now())
    if (sendNumberDigits && dailySentBySendNumber.get(sendNumberDigits) === todayKey) {
      skipped.push({ number, reason: 'already_sent_today', date: todayKey })
      continue
    }

    const delayMinutes = randomIntInclusive(minMinutes, maxMinutes)
    const scheduledAt = Date.now() + delayMinutes * 60_000
    const jobId = createJobId()

    const media = it.media
      ? {
          mediatype: String(it.media.mediatype || '').trim(),
          mimetype: String(it.media.mimetype || '').trim(),
          media: String(it.media.media || '').trim(),
          fileName: String(it.media.fileName || '').trim() || 'file',
          url: typeof it.media.url === 'string' ? String(it.media.url).trim() : '',
        }
      : null

    const job = {
      id: jobId,
      batchId: null,
      instanceName,
      number,
      sendNumber,
      sendNumberDigits,
      patientName,
      baseText,
      media,
      status: 'scheduled',
      aiStatus: 'pending',
      aiStage: null,
      createdAt,
      scheduledAt,
      delayMinutes,
      startedAt: null,
      finishedAt: null,
      variedText: null,
      imageDescription: null,
      aiGeneratedAt: null,
      error: null,
      timeoutId: null,
    }

    const timeoutId = scheduleDisparoJob(job)
    disparosJobs.set(jobId, { ...job, timeoutId })
    jobIds.push(jobId)
  }

  return { jobIds, skipped, createdAt }
}

function randomIntInclusive(min, max) {
  const a = Math.ceil(min)
  const b = Math.floor(max)
  return Math.floor(Math.random() * (b - a + 1)) + a
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    const err = new Error(`Missing environment variable: ${name}`)
    err.statusCode = 500
    throw err
  }
  return v
}

function parseMaxChars(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n <= 0) return null
  return Math.min(500, Math.floor(n))
}

function getVariationBasePrompt() {
  return (
    'Você é um redator especializado em WhatsApp para clínicas. Sua tarefa é gerar uma VARIAÇÃO humana e única da mensagem base, mantendo o mesmo significado e todas as informações essenciais.\n\n' +
    'Saída:\n' +
    '- Retorne APENAS o texto final pronto para enviar no WhatsApp (sem aspas, sem títulos, sem explicações).\n\n' +
    'Regras obrigatórias (não viole):\n' +
    '- Preserve exatamente fatos, valores, datas, horários, locais, links, telefones, nomes próprios, percentuais, condições e chamadas para ação.\n' +
    '- Não invente detalhes, descontos, prazos, garantias, procedimentos ou resultados que não estejam na mensagem base.\n' +
    '- Não adicione informações médicas não citadas.\n' +
    '- Evite linguagem genérica de massa. Esta mensagem é 1:1 (para uma pessoa).\n\n' +
    'Personalização por paciente:\n' +
    '- Se o nome do paciente for fornecido nas configurações, a mensagem DEVE cumprimentar e mencionar o nome (ex: "Olá, Maria," / "Oi, João,").\n' +
    '- Não use saudações genéricas/plurais como "oi pessoal", "olá galera", "fala meu povo", "gente", "turma".\n\n' +
    'Configurações (fornecidas pelo sistema e devem ser obedecidas):\n' +
    '- Tom de fala: siga exatamente o tom informado.\n' +
    '- Emojis: se for informado que NÃO é permitido, não use nenhum emoji.\n' +
    '- Tamanho máximo: se houver limite de caracteres, obedeça estritamente.\n\n' +
    'Estilo:\n' +
    '- Seja natural, educado e direto.\n' +
    '- Varie a forma sem mudar o conteúdo (troque abertura, conectivos, ordem de frases quando seguro).\n' +
    '- Escreva de forma CONVERTEDORA: deixe claro o benefício, destaque o principal, reduza atrito e finalize com uma chamada para ação (CTA) coerente com a mensagem base.\n' +
    '- Se a mensagem base sugerir urgência, vagas, datas ou condição, dê ênfase (sem inventar nada novo).\n' +
    '- Se houver limite de caracteres, obedeça estritamente.\n' +
    '- Respeite as preferências de emojis (se NÃO permitido, não use nenhum).\n' +
    '- Respeite o tom de fala especificado.\n\n' +
    'Quando houver descrição de imagem:\n' +
    '- Use a descrição APENAS para adaptar a legenda e dar ênfase ao que aparece na imagem (ex: procedimento/oferta/antes-depois/texto visível), de forma coerente com o conteúdo visual.\n' +
    '- Não descreva algo que não esteja explicitamente na descrição.\n'
  )
}

function formatEvolutionNumber(numberOrRemoteJid) {
  const raw = String(numberOrRemoteJid || '').trim()
  if (!raw) return ''
  const beforeAt = raw.includes('@') ? raw.split('@')[0] : raw
  const clean = beforeAt.replace(/\D/g, '')
  if (!clean) return ''
  return clean.startsWith('55') ? clean : `55${clean}`
}

async function openaiVaryText({ text, kind, aiOptions }) {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const basePrompt = getVariationBasePrompt()
  const allowEmojis = aiOptions?.allowEmojis
  const tone = typeof aiOptions?.tone === 'string' ? aiOptions.tone.trim() : ''
  const maxChars = parseMaxChars(aiOptions?.maxChars)
  const imageDescription = typeof aiOptions?.imageDescription === 'string' ? aiOptions.imageDescription.trim() : ''
  const patientName = typeof aiOptions?.patientName === 'string' ? aiOptions.patientName.trim() : ''

  const directives = [
    `Tipo: ${kind === 'caption' ? 'legenda' : 'mensagem'}.`,
    patientName ? `Paciente: ${patientName}.` : null,
    typeof allowEmojis === 'boolean'
      ? allowEmojis
        ? 'Emojis: permitido.'
        : 'Emojis: NÃO permitido (não use emojis).'
      : null,
    tone ? `Tom de fala: ${tone}.` : null,
    maxChars ? `Limite: no máximo ${maxChars} caracteres.` : null,
    imageDescription ? `Descrição da imagem (para orientar a legenda): ${imageDescription}` : null,
  ].filter(Boolean)

  const instructions =
    `${basePrompt}` +
    `\n\nConfigurações (Supabase):\n- ${directives.join('\n- ')}` +
    (patientName
      ? `\n\nRegras obrigatórias adicionais:\n- A mensagem DEVE mencionar o nome "${patientName}" no cumprimento (ex: "Olá, ${patientName}, ...").\n- NÃO use saudações genéricas/plurais ("oi pessoal", "olá galera", "fala meu povo", etc).`
      : '')
  const input = String(text || '').trim()

  const payload = {
    model,
    instructions,
    input,
  }

  if (String(model).startsWith('gpt-5') || String(model).startsWith('o')) {
    payload.reasoning = { effort: 'low' }
  }

  const res = await axios.post('https://api.openai.com/v1/responses', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 90_000,
  })

  const out = (extractOpenAIOutputText(res?.data) || '').trim()
  let finalText = out || input

  if (patientName) {
    const normalizedFinal = String(finalText).toLowerCase()
    const normalizedName = patientName.toLowerCase()

    // Se a IA vier com cumprimento genérico/plural, substitui pelo nome.
    const genericGreetingRe = /^(\s*)(oi|ol[áa])\s*[,!\-—]*\s*(pessoal|galera|meu\s+povo|gente|turma)\b\s*[,!\-—]*/i
    if (genericGreetingRe.test(finalText)) {
      finalText = finalText.replace(genericGreetingRe, `$1Olá, ${patientName}, `)
    }

    // Garantia: se não mencionar o nome em nenhum lugar, prefixar.
    if (!normalizedFinal.includes(normalizedName)) {
      finalText = `Olá, ${patientName}, ${String(finalText).replace(/^\s*/, '')}`
    }
  }

  return String(finalText).trim() || input
}

function extractOpenAIOutputText(response) {
  if (!response) return ''
  if (typeof response.output_text === 'string') return response.output_text
  const out = Array.isArray(response.output) ? response.output : []
  const texts = []
  for (const item of out) {
    if (item?.type !== 'message') continue
    const content = Array.isArray(item?.content) ? item.content : []
    for (const c of content) {
      if (c?.type === 'output_text' && typeof c?.text === 'string') {
        texts.push(c.text)
      }
    }
  }
  return texts.join('\n').trim()
}

function normalizeImageMimeType(mimetype) {
  const raw = String(mimetype || '').trim().toLowerCase()
  if (!raw) return 'image/jpeg'
  if (raw === 'image/jfif') return 'image/jpeg'
  return raw
}

async function openaiDescribeImage({ imageUrl, imageDataUrl }) {
  const apiKey = requireEnv('OPENAI_API_KEY')
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1'
  const imageInputUrl = String(imageDataUrl || '').trim() || String(imageUrl || '').trim()
  if (!imageInputUrl) return ''
  const payload = {
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: "what's in this image?" },
          { type: 'input_image', image_url: imageInputUrl, detail: 'high' },
        ],
      },
    ],
  }

  const res = await axios.post('https://api.openai.com/v1/responses', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 90_000,
  })

  return extractOpenAIOutputText(res?.data)
}

async function evolutionSendText({ instanceName, number, text }) {
  const baseUrl = (process.env.VITE_EVOLUTION_API_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.VITE_EVOLUTION_API_KEY || ''
  if (!baseUrl || !apiKey) {
    const err = new Error('Evolution API não configurada (VITE_EVOLUTION_API_URL / VITE_EVOLUTION_API_KEY)')
    err.statusCode = 500
    throw err
  }

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`
  const payload = { number, text, delay: 4000, linkPreview: true }
  const res = await axios.post(url, payload, {
    headers: { apikey: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 60_000,
  })
  return res.data
}

async function evolutionSendMedia({ instanceName, number, mediatype, mimetype, caption, media, fileName }) {
  const baseUrl = (process.env.VITE_EVOLUTION_API_URL || '').replace(/\/+$/, '')
  const apiKey = process.env.VITE_EVOLUTION_API_KEY || ''
  if (!baseUrl || !apiKey) {
    const err = new Error('Evolution API não configurada (VITE_EVOLUTION_API_URL / VITE_EVOLUTION_API_KEY)')
    err.statusCode = 500
    throw err
  }

  const url = `${baseUrl}/message/sendMedia/${encodeURIComponent(instanceName)}`
  const payload = {
    number,
    mediatype,
    mimetype,
    caption,
    media,
    fileName,
    delay: 4000,
  }
  const res = await axios.post(url, payload, {
    headers: { apikey: apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 120_000,
  })
  return res.data
}

function createBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function createJobId() {
  return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function preGenerateJobAI(jobId) {
  const current = disparosJobs.get(jobId)
  if (!current) return
  if (current.aiStatus === 'running' || current.aiStatus === 'done') return

  disparosJobs.set(jobId, {
    ...current,
    aiStatus: 'running',
    aiStage: current.media && current.media.mediatype === 'image' ? 'openai_vision' : 'openai_variation',
    aiError: null,
  })

  try {
    let imageDescription = ''
    if (current.media && current.media.mediatype === 'image') {
      const mimetype = normalizeImageMimeType(current.media.mimetype)
      const base64 = String(current.media.media || '').trim()
      const imageDataUrl = base64 ? `data:${mimetype};base64,${base64}` : ''
      const imageUrl = typeof current.media.url === 'string' ? current.media.url.trim() : ''
      imageDescription = await openaiDescribeImage({ imageUrl, imageDataUrl })
    }

    const variedText = await openaiVaryText({
      text: current.baseText,
      kind: current.media ? 'caption' : 'text',
      aiOptions: { ...(current.aiOptions || {}), imageDescription, patientName: current.patientName },
    })

    const updated = disparosJobs.get(jobId)
    if (!updated) return
    disparosJobs.set(jobId, {
      ...updated,
      variedText,
      imageDescription: imageDescription || null,
      aiStatus: 'done',
      aiStage: 'openai_done',
      aiGeneratedAt: new Date().toISOString(),
      aiError: null,
    })
  } catch (e) {
    const updated = disparosJobs.get(jobId)
    if (!updated) return

    let errorDetails = null
    try {
      if (e?.response?.data) errorDetails = e.response.data
      else if (e?.message) errorDetails = { message: e.message }
      else errorDetails = { error: String(e) }
    } catch {
      errorDetails = { error: String(e) }
    }

    console.error('[DISPAROS] Falha ao pré-gerar IA', {
      jobId,
      url: e?.config?.url,
      status: e?.response?.status,
      error: e?.message || String(e),
      errorDetails,
    })

    disparosJobs.set(jobId, {
      ...updated,
      aiStatus: 'failed',
      aiStage: 'openai_failed',
      aiError: e?.message || String(e),
      aiErrorDetails: errorDetails,
    })
  }
}

function scheduleDisparoJob(job) {
  const delayMs = Math.max(0, job.scheduledAt - Date.now())
  const timeoutId = setTimeout(async () => {
    const current = disparosJobs.get(job.id)
    if (!current) return
    if (current.status !== 'scheduled') return

    disparosJobs.set(job.id, { ...current, status: 'running', startedAt: new Date().toISOString() })

    try {
      let stage = 'openai'
      let imageDescription = String(current.imageDescription || '').trim()
      let variedText = String(current.variedText || '').trim()

      // Se ainda não foi pré-gerado, gerar agora como fallback
      if (!variedText) {
        if (current.media && current.media.mediatype === 'image' && !imageDescription) {
          stage = 'openai_vision'
          const mimetype = normalizeImageMimeType(current.media.mimetype)
          const base64 = String(current.media.media || '').trim()
          const imageDataUrl = base64 ? `data:${mimetype};base64,${base64}` : ''
          const imageUrl = typeof current.media.url === 'string' ? current.media.url.trim() : ''
          imageDescription = await openaiDescribeImage({ imageUrl, imageDataUrl })
        }

        stage = 'openai_variation'
        variedText = await openaiVaryText({
          text: current.baseText,
          kind: current.media ? 'caption' : 'text',
          aiOptions: { ...(current.aiOptions || {}), imageDescription, patientName: current.patientName },
        })
      }

      console.log('[DISPAROS] OpenAI', {
        jobId: current.id,
        kind: current.media ? 'caption' : 'text',
        baseTextPreview: String(current.baseText || '').slice(0, 140),
        imageDescriptionPreview: String(imageDescription || '').slice(0, 140),
        variedTextPreview: String(variedText || '').slice(0, 140),
      })

      let evolutionResponse = null

      const numberForSend = formatEvolutionNumber(current.sendNumber || current.number)
      if (!numberForSend) {
        const err = new Error('Número inválido para envio (vazio após formatação)')
        err.statusCode = 400
        throw err
      }

      console.log('[DISPAROS] Enviando', {
        jobId: current.id,
        instanceName: current.instanceName,
        numberRaw: current.number,
        numberForSend,
        hasMedia: Boolean(current.media),
      })

      stage = 'evolution_send'
      if (current.media) {
        evolutionResponse = await evolutionSendMedia({
          instanceName: current.instanceName,
          number: numberForSend,
          mediatype: current.media.mediatype,
          mimetype: current.media.mimetype,
          caption: variedText,
          media: current.media.media,
          fileName: current.media.fileName,
        })
      } else {
        evolutionResponse = await evolutionSendText({ instanceName: current.instanceName, number: numberForSend, text: variedText })
      }

      console.log('[DISPAROS] Evolution response', {
        jobId: current.id,
        numberForSend,
        evolutionResponse,
      })

      const hasConfirmation =
        (evolutionResponse?.status === 'PENDING' && Boolean(evolutionResponse?.key?.id)) ||
        evolutionResponse?.ok === true ||
        Boolean(evolutionResponse?.messageId) ||
        Boolean(evolutionResponse?.id)
      if (!hasConfirmation) {
        const err = new Error('Evolution respondeu sem confirmação de envio (esperado status=PENDING e key.id)')
        err.statusCode = 502
        throw err
      }

      disparosJobs.set(job.id, {
        ...current,
        status: 'sent',
        finishedAt: new Date().toISOString(),
        variedText,
        evolutionResponse,
        numberForSend,
        imageDescription: imageDescription || null,
        aiStatus: current.aiStatus === 'done' ? 'done' : 'done',
        aiStage: current.aiStatus === 'done' ? current.aiStage : 'openai_done',
        aiGeneratedAt: current.aiGeneratedAt || new Date().toISOString(),
      })

      const sentKey = getDateKeySaoPaulo(Date.now())
      const sendDigits = normalizeSendNumberDigits(current.sendNumberDigits || current.sendNumber)
      if (sendDigits) dailySentBySendNumber.set(sendDigits, sentKey)
    } catch (e) {
      let errorDetails = null
      try {
        if (e?.response?.data) errorDetails = e.response.data
        else if (e?.message) errorDetails = { message: e.message }
        else errorDetails = { error: String(e) }
      } catch {
        errorDetails = { error: String(e) }
      }

      console.error('[DISPAROS] Falha ao enviar', {
        stage,
        jobId: current?.id,
        numberRaw: current?.number,
        numberForSend: current?.numberForSend,
        url: e?.config?.url,
        status: e?.response?.status,
        error: e?.message || String(e),
        errorDetails,
      })
      disparosJobs.set(job.id, {
        ...current,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: e?.message || String(e),
        errorDetails,
        stage,
      })
    }
  }, delayMs)

  return timeoutId
}

// Configurar cliente WhatsApp
function initializeWhatsAppClient() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: 'crm-nanosync',
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true, // Voltar para true - roda em background
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run'
      ]
    },
    webVersionCache: {
      type: 'local'
    }
  });

  // Eventos do WhatsApp
  whatsappClient.on('qr', (qr) => {
    console.log('QR Code recebido');
    broadcastToClients({ type: 'qr', qr });
  });

  whatsappClient.on('ready', async () => {
    console.log('WhatsApp Web está pronto!');
    isClientReady = true;
    
    // Aguardar um pouco para garantir que tudo está carregado
    setTimeout(async () => {
      try {
        console.log('Buscando contatos e chats...');
        const contacts = await whatsappClient.getContacts();
        const chats = await whatsappClient.getChats();
        
        console.log(`Encontrados ${contacts.length} contatos e ${chats.length} chats`);
        
        // Formatar e deduplificar contatos
        const formattedContacts = contacts.map(formatContact);
        const uniqueContacts = deduplicateContacts(formattedContacts);
        
        console.log(`Contatos processados: ${contacts.length} -> ${uniqueContacts.length} (após deduplicação)`);
        
        broadcastToClients({ 
          type: 'ready',
          contacts: uniqueContacts,
          chats: chats.map(formatChat)
        });
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error);
        // Mesmo com erro, notificar que está pronto
        broadcastToClients({ type: 'ready' });
      }
    }, 3000);
  });

  whatsappClient.on('authenticated', () => {
    console.log('WhatsApp autenticado');
    broadcastToClients({ type: 'authenticated' });
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
    broadcastToClients({ type: 'auth_failure', message: msg });
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp desconectado:', reason);
    isClientReady = false;
    broadcastToClients({ type: 'disconnected', reason });
  });

  // Tratar erros do Puppeteer
  whatsappClient.on('error', (error) => {
    console.error('Erro no WhatsApp Client:', error);
    if (error.message.includes('Execution context was destroyed')) {
      console.log('Contexto destruído, reiniciando cliente...');
      setTimeout(() => {
        initializeWhatsAppClient();
      }, 5000);
    }
  });

  whatsappClient.on('message', async (message) => {
    console.log('Nova mensagem recebida:', message.body);
    
    try {
      const chat = await message.getChat();
      const contact = await message.getContact();
      
      broadcastToClients({ 
        type: 'message', 
        message: formatMessage(message, chat, contact)
      });
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  whatsappClient.on('message_ack', (message, ack) => {
    console.log('📨 Acknowledgment recebido no servidor:', {
      messageId: message.id._serialized,
      ack: ack,
      body: message.body ? message.body.substring(0, 50) : 'sem body'
    });
    
    broadcastToClients({ 
      type: 'message_ack', 
      id: message.id._serialized,
      ack 
    });
  });

  // Inicializar cliente com delay
  setTimeout(() => {
    whatsappClient.initialize().catch(error => {
      console.error('Erro ao inicializar WhatsApp:', error);
      // Tentar novamente após 10 segundos
      setTimeout(() => {
        console.log('Tentando reinicializar WhatsApp...');
        initializeWhatsAppClient();
      }, 10000);
    });
  }, 2000);
}

// Função para deduplificar contatos
function deduplicateContacts(contacts) {
  const contactMap = new Map();
  
  contacts.forEach(contact => {
    // Usar o número limpo como chave principal
    const key = contact.number || contact.id;
    
    if (!contactMap.has(key)) {
      contactMap.set(key, contact);
    } else {
      // Se já existe, manter o que tem mais informações
      const existing = contactMap.get(key);
      
      // Priorizar contatos com nome real sobre pushname
      const shouldReplace = (
        (!existing.name || existing.name.startsWith('+')) && 
        (contact.name && !contact.name.startsWith('+'))
      ) || (
        existing.name === existing.pushname && 
        contact.verifiedName
      ) || (
        contact.isMyContact && !existing.isMyContact
      );
      
      if (shouldReplace) {
        // Combinar informações dos dois contatos
        contactMap.set(key, {
          ...existing,
          ...contact,
          name: contact.verifiedName || contact.name || existing.name,
          // Manter o melhor número para exibição
          displayNumber: contact.verifiedName ? contact.displayNumber : existing.displayNumber
        });
      }
    }
  });
  
  return Array.from(contactMap.values())
    .filter(contact => !contact.isGroup) // Filtrar grupos da lista de contatos
    .sort((a, b) => {
      // Ordenar: Meus contatos primeiro, depois por nome
      if (a.isMyContact && !b.isMyContact) return -1;
      if (!a.isMyContact && b.isMyContact) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
}

// Formatadores de dados
function formatContact(contact) {
  // Limpar e formatar o número
  const cleanNumber = contact.number ? contact.number.replace(/\D/g, '') : '';
  
  return {
    id: contact.id._serialized,
    name: contact.name || contact.pushname || contact.verifiedName || `+${cleanNumber}` || 'Sem nome',
    number: cleanNumber,
    displayNumber: contact.number, // Número original para exibição
    isMyContact: contact.isMyContact,
    isGroup: contact.isGroup,
    isBlocked: contact.isBlocked,
    profilePicUrl: contact.profilePicUrl,
    // Adicionar campos para melhor identificação
    pushname: contact.pushname,
    verifiedName: contact.verifiedName,
    isWAContact: contact.isWAContact,
    isBusiness: contact.isBusiness
  };
}

function formatChat(chat) {
  // Usar nome básico sem busca assíncrona para evitar erros
  let displayName = chat.name || 'Contato sem nome';
  
  // Para chats individuais, usar informações já disponíveis
  if (!chat.isGroup && chat.id && chat.id.user) {
    // Extrair número do ID para mostrar como fallback
    const phoneNumber = chat.id.user;
    if (phoneNumber && !displayName.includes('Contato sem nome')) {
      displayName = displayName || `+${phoneNumber}`;
    } else if (phoneNumber) {
      displayName = `+${phoneNumber}`;
    }
  }
  
  return {
    id: chat.id._serialized,
    name: displayName,
    isGroup: chat.isGroup || false,
    isReadOnly: chat.isReadOnly || false,
    unreadCount: chat.unreadCount || 0,
    timestamp: chat.timestamp || Date.now(),
    lastMessage: chat.lastMessage ? {
      body: chat.lastMessage.body || '',
      timestamp: chat.lastMessage.timestamp || Date.now(),
      fromMe: chat.lastMessage.fromMe || false,
      type: chat.lastMessage.type || 'chat',
      hasMedia: chat.lastMessage.hasMedia || false
    } : null
  };
}

function formatMessage(message, chat, contact) {
  return {
    id: message.id._serialized,
    body: message.body,
    from: message.from,
    to: message.to,
    fromMe: message.fromMe,
    timestamp: message.timestamp * 1000, // Converter para milliseconds
    type: message.type,
    hasMedia: message.hasMedia,
    ack: message.ack,
    author: message.author || null,
    chatName: chat.name,
    contactName: contact.name || contact.pushname
  };
}

// Broadcast para todos os clientes conectados
function broadcastToClients(data) {
  const message = JSON.stringify(data);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Configurar WebSocket
wss.on('connection', (ws) => {
  console.log('Cliente conectado ao WebSocket');
  connectedClients.add(ws);

  // Enviar status atual
  if (isClientReady) {
    ws.send(JSON.stringify({ type: 'ready' }));
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleClientMessage(ws, data);
    } catch (error) {
      console.error('Erro ao processar mensagem do cliente:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Erro ao processar comando' 
      }));
    }
  });

  ws.on('close', () => {
    console.log('Cliente desconectado do WebSocket');
    connectedClients.delete(ws);
  });
});

// Lidar com mensagens dos clientes
async function handleClientMessage(ws, data) {
  console.log('Comando recebido:', data.type, data);
  
  switch (data.type) {
    case 'get_status':
      // Enviar status atual
      if (isClientReady && whatsappClient) {
        try {
          // Buscar contatos e chats se estiver pronto
          const contacts = await whatsappClient.getContacts();
          const chats = await whatsappClient.getChats();
          
          // Formatar e deduplificar contatos
          const formattedContacts = contacts.map(formatContact);
          const uniqueContacts = deduplicateContacts(formattedContacts);
          
          console.log(`Status request - Contatos processados: ${contacts.length} -> ${uniqueContacts.length} (após deduplicação)`);
          
          broadcastToClients({ 
            type: 'ready',
            contacts: uniqueContacts,
            chats: chats.map(formatChat)
          });
        } catch (error) {
          console.error('Erro ao buscar dados:', error);
          ws.send(JSON.stringify({ type: 'ready' }));
        }
      } else if (whatsappClient) {
        ws.send(JSON.stringify({ type: 'connecting' }));
      } else {
        ws.send(JSON.stringify({ type: 'disconnected' }));
      }
      break;

    case 'connect':
      try {
        console.log('Solicitação de conexão recebida');
        
        // Se já existe um cliente, destruir primeiro
        if (whatsappClient) {
          console.log('Destruindo cliente existente...');
          try {
            await whatsappClient.destroy();
          } catch (error) {
            console.log('Erro ao destruir cliente existente:', error.message);
          }
          whatsappClient = null;
          isClientReady = false;
        }
        
        // Criar novo cliente
        console.log('Criando novo cliente WhatsApp...');
        initializeWhatsAppClient();
        
      } catch (error) {
        console.error('Erro ao conectar:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Erro ao conectar: ' + error.message 
        }));
      }
      break;

    case 'disconnect':
      if (whatsappClient) {
        try {
          console.log('Desconectando WhatsApp...');
          await whatsappClient.logout();
          await whatsappClient.destroy();
          whatsappClient = null;
          isClientReady = false;
          
          // Notificar todos os clientes sobre a desconexão
          broadcastToClients({ type: 'disconnected', reason: 'USER_LOGOUT' });
          
          console.log('WhatsApp desconectado com sucesso');
        } catch (error) {
          console.error('Erro ao desconectar:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro ao desconectar: ' + error.message 
          }));
        }
      }
      break;

    case 'send_message':
      if (whatsappClient && isClientReady) {
        try {
          console.log(`Enviando mensagem para ${data.to}: ${data.message}`);
          
          // Verificar se o número está no formato correto
          let chatId = data.to;
          if (!chatId.includes('@')) {
            // Se não tem @, assumir que é um número e adicionar @c.us
            chatId = chatId.replace(/\D/g, '') + '@c.us';
          }
          
          const sentMessage = await whatsappClient.sendMessage(chatId, data.message);
          console.log('Mensagem enviada com sucesso');
          
          ws.send(JSON.stringify({ 
            type: 'message_sent', 
            success: true,
            messageId: sentMessage.id._serialized
          }));
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro ao enviar mensagem: ' + error.message 
          }));
        }
      } else {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'WhatsApp não está conectado' 
        }));
      }
      break;

    case 'get_contacts':
      if (whatsappClient && isClientReady) {
        try {
          const contacts = await whatsappClient.getContacts();
          const formattedContacts = contacts.map(formatContact);
          const uniqueContacts = deduplicateContacts(formattedContacts);
          
          ws.send(JSON.stringify({ 
            type: 'contacts', 
            contacts: uniqueContacts
          }));
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro ao buscar contatos: ' + error.message 
          }));
        }
      }
      break;

    case 'get_chats':
      if (whatsappClient && isClientReady) {
        try {
          const chats = await whatsappClient.getChats();
          const formattedChats = chats.map(formatChat);
          ws.send(JSON.stringify({ 
            type: 'chats', 
            chats: formattedChats
          }));
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro ao buscar conversas: ' + error.message 
          }));
        }
      }
      break;

    case 'get_messages':
      if (whatsappClient && isClientReady) {
        try {
          console.log('Buscando mensagens para chat:', data.chatId);
          
          if (!data.chatId) {
            throw new Error('ChatId não fornecido');
          }
          
          const chat = await whatsappClient.getChatById(data.chatId);
          const messages = await chat.fetchMessages({ limit: 200 }); // Aumentar limite para mais mensagens
          
          // Marcar chat como lido
          try {
            await chat.sendSeen();
            console.log('Chat marcado como lido:', data.chatId);
          } catch (seenError) {
            console.log('Não foi possível marcar como lido:', seenError.message);
          }
          
          console.log(`Encontradas ${messages.length} mensagens`);
          
          const formattedMessages = await Promise.all(messages.map(async (msg) => {
            try {
              const baseMessage = {
                id: msg.id?._serialized || `msg_${Date.now()}_${Math.random()}`,
                body: msg.body || '',
                from: msg.from || '',
                to: msg.to || '',
                fromMe: msg.fromMe || false,
                timestamp: (msg.timestamp || Date.now() / 1000) * 1000,
                type: msg.type || 'chat',
                hasMedia: msg.hasMedia || false,
                ack: msg.ack || 0,
                author: msg.author || null
              };

              // Se a mensagem tem mídia, tentar obter a URL
              if (msg.hasMedia) {
                try {
                  const media = await msg.downloadMedia();
                  if (media) {
                    // Criar data URL para exibir a mídia
                    const mediaUrl = `data:${media.mimetype};base64,${media.data}`;
                    
                    // Adicionar duração para áudios
                    const mediaData = {
                      ...baseMessage,
                      mediaUrl,
                      filename: media.filename,
                      filesize: media.filesize,
                      mimetype: media.mimetype
                    };
                    
                    // Para mensagens de áudio, incluir duração se disponível
                    if (msg.type === 'ptt' || msg.type === 'audio') {
                      mediaData.duration = msg.duration || 0;
                    }
                    
                    return mediaData;
                  }
                } catch (mediaError) {
                  console.log('Erro ao baixar mídia:', mediaError.message);
                  // Continuar sem a mídia
                }
              }

              return baseMessage;
            } catch (error) {
              console.error('Erro ao formatar mensagem:', error);
              return null;
            }
          }));

          const validMessages = formattedMessages.filter(msg => msg !== null);
          
          ws.send(JSON.stringify({ 
            type: 'chat_messages', 
            chatId: data.chatId,
            messages: validMessages
          }));
          
          // Notificar que o chat foi marcado como lido
          broadcastToClients({
            type: 'chat_read',
            chatId: data.chatId
          });
        } catch (error) {
          console.error('Erro ao buscar mensagens para chat', data.chatId, ':', error.message);
          
          // Se o chat não existe, retornar array vazio em vez de erro
          if (error.message.includes('Chat not found') || error.message.includes('Cannot read properties')) {
            ws.send(JSON.stringify({ 
              type: 'chat_messages', 
              chatId: data.chatId,
              messages: []
            }));
          } else {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Erro ao buscar mensagens: ' + error.message 
            }));
          }
        }
      }
      break;

    case 'send_media':
      if (whatsappClient && isClientReady) {
        try {
          console.log('Enviando mídia para:', data.to);
          console.log('Dados da mídia:', {
            mimetype: data.media.mimetype,
            filename: data.media.filename,
            filesize: data.media.filesize,
            caption: data.media.caption,
            dataLength: data.media.data ? data.media.data.length : 0
          });
          
          // MessageMedia já importado no topo do arquivo
          
          // Validar dados de mídia
          if (!data.media.data || !data.media.mimetype) {
            throw new Error('Dados de mídia inválidos');
          }
          
          // Para áudios WebM, converter mimetype para compatibilidade
          let mimetype = data.media.mimetype;
          if (mimetype.includes('webm')) {
            mimetype = 'audio/ogg; codecs=opus';
          }
          
          // Criar MessageMedia com os dados corretos
          const media = new MessageMedia(
            mimetype,
            data.media.data,
            data.media.filename,
            data.media.filesize
          );
          
          // Enviar mídia primeiro
          const sentMessage = await whatsappClient.sendMessage(data.to, media);
          
          console.log('Mídia enviada com sucesso:', sentMessage.id._serialized);
          
          // Se há legenda, enviar como mensagem de texto separada
          let captionMessageId = null;
          console.log('Verificando legenda:', {
            hasCaption: !!data.media.caption,
            caption: data.media.caption,
            captionTrimmed: data.media.caption ? data.media.caption.trim() : null,
            captionLength: data.media.caption ? data.media.caption.trim().length : 0
          });
          
          if (data.media.caption && data.media.caption.trim()) {
            console.log('Enviando legenda como texto:', data.media.caption.trim());
            try {
              const captionMessage = await whatsappClient.sendMessage(data.to, data.media.caption.trim());
              captionMessageId = captionMessage.id._serialized;
              console.log('Legenda enviada com sucesso:', captionMessageId);
            } catch (captionError) {
              console.error('Erro ao enviar legenda:', captionError);
            }
          } else {
            console.log('Nenhuma legenda para enviar');
          }
          
          // Confirmar envio
          ws.send(JSON.stringify({ 
            type: 'message_sent', 
            messageId: sentMessage.id._serialized,
            captionMessageId: captionMessageId,
            tempId: data.tempId,
            chatId: data.to
          }));
          
        } catch (error) {
          console.error('Erro ao enviar mídia:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Erro ao enviar mídia: ' + error.message 
          }));
        }
      } else {
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'WhatsApp não está conectado' 
        }));
      }
      break;

    default:
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Comando não reconhecido' 
      }));
  }
}

// Rotas HTTP para status
app.get('/status', (req, res) => {
  res.json({
    whatsappReady: isClientReady,
    connectedClients: connectedClients.size,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/disparos/enqueue', async (req, res) => {
  try {
    const body = req.body || {}
    const instanceName = String(body.instanceName || '').trim()
    const items = Array.isArray(body.items) ? body.items : []
    const minMinutes = Number(body.minMinutes ?? 5)
    const maxMinutes = Number(body.maxMinutes ?? 30)
    const aiOptions = body.aiOptions || null

    if (!instanceName) {
      return res.status(400).json({ error: 'instanceName é obrigatório' })
    }
    if (!items.length) {
      return res.status(400).json({ error: 'items é obrigatório' })
    }
    if (items.length > DISPAROS_MAX_PER_BATCH) {
      return res.status(400).json({ error: `Máximo de ${DISPAROS_MAX_PER_BATCH} pacientes por sessão/batch` })
    }
    if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes) || minMinutes < 1 || maxMinutes < minMinutes) {
      return res.status(400).json({ error: 'minMinutes/maxMinutes inválidos' })
    }

    const batchId = createBatchId()
    const { jobIds, skipped, createdAt } = createJobsForInstance({ instanceName, items, minMinutes, maxMinutes })

    // Amarrar jobs ao batch
    jobIds.forEach((id) => {
      const j = disparosJobs.get(id)
      if (j) disparosJobs.set(id, { ...j, batchId, aiOptions })
    })

    // Pré-gerar variações imediatamente (não bloquear resposta)
    jobIds.forEach((id) => {
      setTimeout(() => {
        void preGenerateJobAI(id)
      }, 0)
    })

    const batch = {
      id: batchId,
      instanceName,
      createdAt,
      minMinutes,
      maxMinutes,
      jobIds,
      status: 'scheduled',
    }
    disparosBatches.set(batchId, batch)

    return res.json({ batch, skipped })
  } catch (e) {
    const status = e?.statusCode || 500
    return res.status(status).json({ error: e?.message || String(e) })
  }
})

app.post('/api/disparos/:batchId/append', async (req, res) => {
  try {
    const batchId = req.params.batchId
    const batch = disparosBatches.get(batchId)
    if (!batch) return res.status(404).json({ error: 'Batch não encontrado' })

    const body = req.body || {}
    const instanceName = String(body.instanceName || '').trim() || batch.instanceName
    if (instanceName !== batch.instanceName) {
      return res.status(400).json({ error: 'instanceName não corresponde ao batch' })
    }

    const items = Array.isArray(body.items) ? body.items : []
    const minMinutes = Number(body.minMinutes ?? batch.minMinutes ?? 5)
    const maxMinutes = Number(body.maxMinutes ?? batch.maxMinutes ?? 30)
    const aiOptions = body.aiOptions || null
    if (!items.length) return res.status(400).json({ error: 'items é obrigatório' })
    const currentCount = Array.isArray(batch.jobIds) ? batch.jobIds.length : 0
    if (currentCount + items.length > DISPAROS_MAX_PER_BATCH) {
      return res.status(400).json({ error: `Esta sessão já possui ${currentCount} pacientes. Máximo de ${DISPAROS_MAX_PER_BATCH} por sessão/batch.` })
    }
    if (!Number.isFinite(minMinutes) || !Number.isFinite(maxMinutes) || minMinutes < 1 || maxMinutes < minMinutes) {
      return res.status(400).json({ error: 'minMinutes/maxMinutes inválidos' })
    }

    const { jobIds, skipped } = createJobsForInstance({ instanceName, items, minMinutes, maxMinutes })

    jobIds.forEach((id) => {
      const j = disparosJobs.get(id)
      if (j) disparosJobs.set(id, { ...j, batchId, aiOptions })
    })

    // Pré-gerar variações imediatamente (não bloquear resposta)
    jobIds.forEach((id) => {
      setTimeout(() => {
        void preGenerateJobAI(id)
      }, 0)
    })

    const updated = {
      ...batch,
      minMinutes,
      maxMinutes,
      jobIds: [...(batch.jobIds || []), ...jobIds],
    }
    disparosBatches.set(batchId, updated)

    return res.json({ batch: summarizeBatch(updated), appendedJobIds: jobIds, skipped })
  } catch (e) {
    const status = e?.statusCode || 500
    return res.status(status).json({ error: e?.message || String(e) })
  }
})

app.get('/api/disparos', (req, res) => {
  const instanceName = String(req.query.instanceName || '').trim()
  if (!instanceName) return res.status(400).json({ error: 'instanceName é obrigatório' })

  const batches = Array.from(disparosBatches.values())
    .filter((b) => b.instanceName === instanceName)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map(summarizeBatch)

  return res.json({ batches })
})

app.get('/api/disparos/activeNumbers', (req, res) => {
  const instanceName = String(req.query.instanceName || '').trim()
  if (!instanceName) return res.status(400).json({ error: 'instanceName é obrigatório' })
  const activeNumbers = Array.from(getActiveNumbersByInstance(instanceName))
  return res.json({ activeNumbers })
})

app.get('/api/disparos/:batchId', (req, res) => {
  const batchId = req.params.batchId
  const batch = disparosBatches.get(batchId)
  if (!batch) return res.status(404).json({ error: 'Batch não encontrado' })

  const jobs = batch.jobIds
    .map((id) => {
      const j = disparosJobs.get(id)
      if (!j) return null
      const { timeoutId, ...safe } = j
      return safe
    })
    .filter(Boolean)

  return res.json({ batch, jobs })
})

app.post('/api/disparos/:batchId/cancel', (req, res) => {
  const batchId = req.params.batchId
  const batch = disparosBatches.get(batchId)
  if (!batch) return res.status(404).json({ error: 'Batch não encontrado' })

  for (const id of batch.jobIds) {
    const job = disparosJobs.get(id)
    if (!job) continue
    if (job.status !== 'scheduled') continue
    if (job.timeoutId) {
      clearTimeout(job.timeoutId)
    }
    disparosJobs.set(id, { ...job, status: 'canceled', finishedAt: new Date().toISOString(), timeoutId: null })
  }

  disparosBatches.set(batchId, { ...batch, status: 'canceled' })
  return res.json({ ok: true })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
  console.log(`WebSocket rodando em ws://localhost:${PORT}/whatsapp-web`);
  console.log('Servidor WhatsApp Web pronto. Aguardando conexões...');
  
  // NÃO inicializar automaticamente - aguardar comando do frontend
});

// Lidar com sinais de encerramento
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  
  if (whatsappClient && isClientReady) {
    try {
      await whatsappClient.destroy();
    } catch (error) {
      console.error('Erro ao encerrar WhatsApp:', error);
    }
  }
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Encerrando servidor...');
  
  if (whatsappClient && isClientReady) {
    try {
      await whatsappClient.destroy();
    } catch (error) {
      console.error('Erro ao encerrar WhatsApp:', error);
    }
  }
  
  process.exit(0);
});
