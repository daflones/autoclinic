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
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuração do servidor
const app = express();
const PORT = Number(process.env.PORT) || 3000;

dotenv.config()
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =====================================================
// Evolution API Proxy (backend)
// - Frontend deve chamar /api/evolution/... (Vite faz proxy para :3000)
// - Nunca expor apikey no browser
// =====================================================

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || process.env.VITE_EVOLUTION_API_URL || '').replace(/\/+$/, '')
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.VITE_EVOLUTION_API_KEY || ''

// Supabase (service role) para persistir cache do WhatsApp e resolver clínica/instância
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Map of resolved env vars (supports both VITE_ prefixed and non-prefixed)
const RESOLVED_ENV = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
  VITE_SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
  EVOLUTION_API_URL: EVOLUTION_API_URL,
  EVOLUTION_API_KEY: EVOLUTION_API_KEY,
}

function requireBackendEnv(name) {
  const v = RESOLVED_ENV[name] || process.env[name]
  if (!v) {
    const err = new Error(`Missing environment variable: ${name}`)
    err.statusCode = 500
    throw err
  }
  return v
}

async function supabaseAuthUser(accessToken) {
  requireBackendEnv('VITE_SUPABASE_URL')
  requireBackendEnv('SUPABASE_SERVICE_ROLE_KEY')

  const url = `${SUPABASE_URL}/auth/v1/user`
  const res = await axios.get(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
    validateStatus: () => true,
  })

  if (res.status >= 200 && res.status < 300) return res.data
  throw new Error(res.data?.message || res.data?.error || 'Supabase user token invalid')
}

async function supabaseRest(endpoint, { method = 'GET', data, params } = {}) {
  requireBackendEnv('VITE_SUPABASE_URL')
  requireBackendEnv('SUPABASE_SERVICE_ROLE_KEY')

  const url = `${SUPABASE_URL}/rest/v1/${endpoint.replace(/^\/+/, '')}`

  // Build Prefer header: for upserts (POST with on_conflict), add resolution=merge-duplicates
  let prefer = 'return=representation'
  const queryParams = { ...params }
  if (method === 'POST' && queryParams?.on_conflict) {
    prefer = 'return=representation,resolution=merge-duplicates'
  }

  const res = await axios.request({
    url,
    method,
    params: queryParams,
    data,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    timeout: 60_000,
    validateStatus: () => true,
  })

  if (res.status === 204) return null
  if (res.status >= 200 && res.status < 300) return res.data
  const errMsg = typeof res.data === 'string' ? res.data : (res.data?.message || res.data?.error || res.data?.details || JSON.stringify(res.data))
  console.error(`[supabaseRest] ${method} ${endpoint} -> ${res.status}:`, errMsg)
  throw new Error(errMsg || 'Supabase REST error')
}

async function resolveClinicAdminAndInstance(accessToken) {
  const authUser = await supabaseAuthUser(accessToken)
  const authUserId = authUser?.id
  if (!authUserId) return { clinicAdminId: null, instanceName: null, profissionalClinicaId: null }

  // Perfil do usuário logado
  const profiles = await supabaseRest(`profiles?select=id,email,role,admin_profile_id&id=eq.${authUserId}`, { method: 'GET' })
  const userProfile = Array.isArray(profiles) ? profiles[0] : profiles
  if (!userProfile?.id) return { clinicAdminId: null, instanceName: null, profissionalClinicaId: null }

  const isClinicAdmin = userProfile.role === 'clinica' || (userProfile.role === 'admin' && (!userProfile.admin_profile_id || userProfile.admin_profile_id === userProfile.id))
  const clinicAdminId = isClinicAdmin ? userProfile.id : (userProfile.admin_profile_id || null)
  if (!clinicAdminId) return { clinicAdminId: null, instanceName: null, profissionalClinicaId: null }

  let instanceName = null
  try {
    const admins = await supabaseRest(`profiles?select=instancia_whatsapp&id=eq.${clinicAdminId}`, { method: 'GET' })
    const adminProfile = Array.isArray(admins) ? admins[0] : admins
    instanceName = adminProfile?.instancia_whatsapp || null
  } catch (e) {
    console.warn('[resolveClinicAdminAndInstance] Could not read instancia_whatsapp from profiles:', e?.message)
  }

  if (!instanceName) {
    console.warn(`[resolveClinicAdminAndInstance] Clínica ${clinicAdminId} não tem instancia_whatsapp configurada`)
  }

  // Resolver profissional_clinica_id pelo email do usuário
  let profissionalClinicaId = null
  if (!isClinicAdmin && userProfile.email) {
    try {
      const profs = await supabaseRest(
        `profissionais_clinica?select=id&admin_profile_id=eq.${clinicAdminId}&email=eq.${encodeURIComponent(userProfile.email)}&limit=1`,
        { method: 'GET' }
      )
      const prof = Array.isArray(profs) ? profs[0] : profs
      profissionalClinicaId = prof?.id || null
    } catch (e) {
      console.warn('[resolveClinicAdminAndInstance] Could not resolve profissional_clinica_id:', e?.message)
    }
  }

  return { clinicAdminId, instanceName, profissionalClinicaId }
}

function getBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader || typeof authHeader !== 'string') return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

app.use('/api/evolution', async (req, res) => {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return res.status(500).json({
        error: 'Evolution API não configurada no backend (EVOLUTION_API_URL/EVOLUTION_API_KEY)',
      })
    }

    // Proteção básica: exigir token do Supabase para não deixar o proxy público
    const token = getBearerToken(req)
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação ausente' })
    }

    const upstreamPath = req.originalUrl.replace(/^\/api\/evolution/, '')
    const upstreamUrl = `${EVOLUTION_API_URL}${upstreamPath}`
    const method = String(req.method || 'GET').toUpperCase()

    const upstreamResponse = await axios.request({
      url: upstreamUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      data: ['GET', 'HEAD'].includes(method) ? undefined : (req.body ?? {}),
      timeout: 60_000,
      validateStatus: () => true,
    })

    return res.status(upstreamResponse.status).send(upstreamResponse.data)
  } catch (error) {
    console.error('Erro no proxy Evolution:', error?.message || error)
    return res.status(500).json({ error: 'Erro interno do servidor', details: error?.message || String(error) })
  }
})

// =====================================================
// Endpoints WhatsApp Chat (backend enriched)
// - Fonte da verdade: Evolution API
// - Persistência/cache: Supabase (service role)
// =====================================================

async function evolutionRequest(pathname, { method = 'POST', body } = {}) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    const err = new Error('Evolution API não configurada no backend (EVOLUTION_API_URL/EVOLUTION_API_KEY)')
    err.statusCode = 500
    throw err
  }

  const url = `${EVOLUTION_API_URL}${pathname}`
  const res = await axios.request({
    url,
    method,
    data: body ?? {},
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    timeout: 60_000,
    validateStatus: () => true,
  })

  if (res.status >= 200 && res.status < 300) return res.data
  const err = new Error(typeof res.data === 'string' ? res.data : JSON.stringify(res.data))
  err.statusCode = res.status
  throw err
}

// Helper: Get the correct identifier to send messages via Evolution API
// LID contacts need full remoteJid, phone contacts just the number
function getNumberForEvolution(remoteJid) {
  if (!remoteJid) return ''
  // LID format: pass full remoteJid
  if (remoteJid.endsWith('@lid')) return remoteJid
  // Group: pass full remoteJid
  if (remoteJid.endsWith('@g.us')) return remoteJid
  // Phone: pass just the number part
  return remoteJid.split('@')[0]
}

// Helper: Extract text content from any Evolution message object
function extractMessageContent(msg) {
  if (!msg) return null
  // Direct conversation text
  if (typeof msg.conversation === 'string' && msg.conversation) return msg.conversation
  // Extended text
  if (typeof msg.extendedTextMessage?.text === 'string') return msg.extendedTextMessage.text
  // Image/video captions
  if (typeof msg.imageMessage?.caption === 'string') return msg.imageMessage.caption
  if (typeof msg.videoMessage?.caption === 'string') return msg.videoMessage.caption
  // Document with caption (nested)
  if (msg.documentWithCaptionMessage?.message?.documentMessage?.caption) return msg.documentWithCaptionMessage.message.documentMessage.caption
  // Document caption
  if (typeof msg.documentMessage?.caption === 'string') return msg.documentMessage.caption
  // Location
  if (msg.locationMessage) return msg.locationMessage.name || msg.locationMessage.address || '[Localização]'
  // Contact
  if (msg.contactMessage) return msg.contactMessage.displayName || '[Contato]'
  if (msg.contactsArrayMessage) return '[Contatos]'
  // Sticker
  if (msg.stickerMessage) return '[Sticker]'
  // Audio
  if (msg.audioMessage) return '[Áudio]'
  // Poll
  if (msg.pollCreationMessage) return msg.pollCreationMessage.name || '[Enquete]'
  // Buttons
  if (msg.buttonsResponseMessage) return msg.buttonsResponseMessage.selectedDisplayText || '[Resposta]'
  if (msg.listResponseMessage) return msg.listResponseMessage.title || '[Resposta Lista]'
  // Template
  if (msg.templateMessage) return msg.templateMessage.hydratedTemplate?.hydratedContentText || '[Template]'
  // Ephemeral wrapper - recurse
  if (msg.ephemeralMessage?.message) return extractMessageContent(msg.ephemeralMessage.message)
  // ViewOnce wrapper - recurse  
  if (msg.viewOnceMessage?.message) return extractMessageContent(msg.viewOnceMessage.message)
  if (msg.viewOnceMessageV2?.message) return extractMessageContent(msg.viewOnceMessageV2.message)
  return null
}

// Helper: Detect message type from Evolution message object
function detectMessageType(msg) {
  if (!msg) return 'unknown'
  if (msg.conversation || msg.extendedTextMessage) return 'text'
  if (msg.imageMessage) return 'image'
  if (msg.videoMessage) return 'video'
  if (msg.audioMessage) return 'audio'
  if (msg.documentMessage || msg.documentWithCaptionMessage) return 'document'
  if (msg.locationMessage || msg.liveLocationMessage) return 'location'
  if (msg.stickerMessage) return 'sticker'
  if (msg.contactMessage || msg.contactsArrayMessage) return 'contact'
  if (msg.reactionMessage) return 'reaction'
  if (msg.protocolMessage) return 'protocol'
  if (msg.pollCreationMessage || msg.pollUpdateMessage) return 'poll'
  if (msg.buttonsResponseMessage || msg.listResponseMessage) return 'buttons'
  if (msg.ephemeralMessage?.message) return detectMessageType(msg.ephemeralMessage.message)
  if (msg.viewOnceMessage?.message) return detectMessageType(msg.viewOnceMessage.message)
  if (msg.viewOnceMessageV2?.message) return detectMessageType(msg.viewOnceMessageV2.message)
  return 'unknown'
}

// Helper: Extract media info (url, mimetype, filename) from Evolution message
function extractMediaInfo(m, msg) {
  let media_url = null, media_mimetype = null, media_filename = null

  // Evolution may provide a top-level mediaUrl (cached/downloaded)
  if (m?.mediaUrl) media_url = m.mediaUrl

  // Check each media message type for inner URLs and metadata
  const mediaTypes = [
    { key: 'imageMessage', fallbackMime: 'image/jpeg' },
    { key: 'videoMessage', fallbackMime: 'video/mp4' },
    { key: 'audioMessage', fallbackMime: 'audio/ogg' },
    { key: 'stickerMessage', fallbackMime: 'image/webp' },
    { key: 'documentMessage', fallbackMime: 'application/octet-stream' },
  ]

  for (const { key, fallbackMime } of mediaTypes) {
    const inner = msg?.[key]
    if (!inner) continue
    if (!media_url && inner.url) media_url = inner.url
    media_mimetype = inner.mimetype || fallbackMime
    if (inner.fileName) media_filename = inner.fileName
    break
  }

  // DocumentWithCaption wrapper
  const docCaption = msg?.documentWithCaptionMessage?.message?.documentMessage
  if (docCaption) {
    if (!media_url && docCaption.url) media_url = docCaption.url
    if (!media_mimetype) media_mimetype = docCaption.mimetype || 'application/octet-stream'
    if (!media_filename && docCaption.fileName) media_filename = docCaption.fileName
  }

  // Ephemeral/viewOnce wrappers - recurse
  if (!media_url && msg?.ephemeralMessage?.message) {
    return extractMediaInfo(m, msg.ephemeralMessage.message)
  }
  if (!media_url && msg?.viewOnceMessage?.message) {
    return extractMediaInfo(m, msg.viewOnceMessage.message)
  }
  if (!media_url && msg?.viewOnceMessageV2?.message) {
    return extractMediaInfo(m, msg.viewOnceMessageV2.message)
  }

  return { media_url, media_mimetype, media_filename }
}

// Status priority for preventing downgrade
const STATUS_PRIORITY = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 }

// Helper: Map Evolution status codes to readable strings
function mapMessageStatus(rawStatus) {
  if (rawStatus === 'READ' || rawStatus === 4 || rawStatus === 'PLAYED') return 'READ'
  if (rawStatus === 'DELIVERY_ACK' || rawStatus === 3) return 'DELIVERED'
  if (rawStatus === 'SERVER_ACK' || rawStatus === 2) return 'SENT'
  if (rawStatus === 1) return 'SENT'
  if (rawStatus === 0) return 'PENDING'
  if (typeof rawStatus === 'string' && rawStatus.length > 0) return rawStatus
  return 'PENDING'
}

function extractLastMessagePreview(lastMessage) {
  try {
    if (!lastMessage) return null
    const msg = lastMessage?.message
    if (!msg) return null
    if (typeof msg?.conversation === 'string') return msg.conversation
    if (typeof msg?.extendedTextMessage?.text === 'string') return msg.extendedTextMessage.text
    if (typeof msg?.imageMessage?.caption === 'string') return msg.imageMessage.caption
    if (typeof msg?.videoMessage?.caption === 'string') return msg.videoMessage.caption
    return '[Mídia]'
  } catch {
    return null
  }
}

// Rate limit caches
const findChatsCache = new Map() // adminId -> { timestamp, result }
const FIND_CHATS_COOLDOWN_MS = 30_000
const findMessagesCache = new Map() // adminId+remoteJid -> timestamp
const FIND_MESSAGES_COOLDOWN_MS = 8_000

// =====================================================
// LID ↔ PHONE MAPPING SYSTEM
// Maps LID JIDs to their phone-based counterparts
// =====================================================
const lidToPhoneMap = new Map() // lid@lid -> phone@s.whatsapp.net
const phoneToLidMap = new Map() // phone@s.whatsapp.net -> lid@lid
const LID_MAPPINGS_FILE = path.join(__dirname, '.lid-mappings.json')

// Load persisted mappings on startup
try {
  const raw = fs.readFileSync(LID_MAPPINGS_FILE, 'utf-8')
  const data = JSON.parse(raw)
  for (const [lid, phone] of Object.entries(data)) {
    if (lid && phone) {
      lidToPhoneMap.set(lid, phone)
      phoneToLidMap.set(phone, lid)
    }
  }
  console.log(`[JID-MAP] Loaded ${Object.keys(data).length} persisted mappings from file`)
} catch (_) { /* first run or file missing */ }

function persistLidMappings() {
  try {
    const data = {}
    for (const [lid, phone] of lidToPhoneMap.entries()) data[lid] = phone
    fs.writeFileSync(LID_MAPPINGS_FILE, JSON.stringify(data, null, 2))
  } catch (e) {
    console.warn('[JID-MAP] Failed to persist mappings:', e?.message)
  }
}

function registerLidPhoneMapping(lidJid, phoneJid) {
  if (!lidJid || !phoneJid || lidJid === phoneJid) return
  if (!lidJid.endsWith('@lid') || !phoneJid.endsWith('@s.whatsapp.net')) return
  const isNew = !lidToPhoneMap.has(lidJid)
  lidToPhoneMap.set(lidJid, phoneJid)
  phoneToLidMap.set(phoneJid, lidJid)
  if (isNew) {
    console.log(`[JID-MAP] Registered: ${lidJid} ↔ ${phoneJid}`)
    persistLidMappings()
  }
}

function getCanonicalJid(jid) {
  // If it's a LID and we have a phone mapping, return the phone JID
  if (jid?.endsWith('@lid') && lidToPhoneMap.has(jid)) {
    return lidToPhoneMap.get(jid)
  }
  return jid
}

function getLidForPhone(phoneJid) {
  return phoneToLidMap.get(phoneJid) || null
}

// POST /api/chat/findChats
// Busca chats na Evolution e faz upsert em whatsapp_conversas
app.post('/api/chat/findChats', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Não foi possível resolver instância WhatsApp da clínica para o usuário' })
    }

    // Rate limit
    const cached = findChatsCache.get(clinicAdminId)
    if (cached && (Date.now() - cached.timestamp) < FIND_CHATS_COOLDOWN_MS) {
      return res.json(cached.result)
    }

    console.log('[findChats] instance:', instanceName, 'admin:', clinicAdminId)

    // 1. Fetch chats from Evolution
    const chats = await evolutionRequest(`/chat/findChats/${encodeURIComponent(instanceName)}`, { method: 'POST', body: req.body ?? {} })
    const list = Array.isArray(chats) ? chats : []

    // 2. Fetch contacts for names
    let contactsMap = {}
    try {
      const contacts = await evolutionRequest(`/chat/findContacts/${encodeURIComponent(instanceName)}`, { method: 'POST', body: {} })
      const contactList = Array.isArray(contacts) ? contacts : []
      for (const ct of contactList) {
        const cid = ct?.id || ct?.remoteJid || ''
        if (cid) contactsMap[cid] = ct
      }
    } catch (e) {
      console.warn('[findChats] could not fetch contacts:', e?.message)
    }

    console.log(`[findChats] Evolution returned ${list.length} chats, ${Object.keys(contactsMap).length} contacts`)

    // 3. Filter out groups, broadcasts, newsletters
    const filteredList = list.filter(c => {
      const jid = String(c?.remoteJid || c?.id || '')
      return jid && !jid.endsWith('@g.us') && !jid.includes('status@broadcast') && !jid.includes('@newsletter')
    })

    // 4. Separate LID and phone chats, build mapping by profilePicUrl
    const lidChats = []
    const phoneChats = []
    for (const c of filteredList) {
      const jid = String(c?.remoteJid || c?.id || '').trim()
      if (jid.endsWith('@lid')) lidChats.push(c)
      else phoneChats.push(c)
    }

    // Build profilePicUrl → phone JID index for matching
    const picToPhoneJid = {}
    for (const c of phoneChats) {
      const pic = c?.profilePicUrl
      if (pic && typeof pic === 'string' && pic.length > 10) {
        picToPhoneJid[pic] = String(c.remoteJid || c.id || '')
      }
    }

    // Match LID → phone by profilePicUrl
    for (const c of lidChats) {
      const lidJid = String(c?.remoteJid || c?.id || '').trim()
      if (lidToPhoneMap.has(lidJid)) continue // already mapped
      const pic = c?.profilePicUrl
      if (pic && picToPhoneJid[pic]) {
        registerLidPhoneMapping(lidJid, picToPhoneJid[pic])
      }
    }

    // Secondary matching: for unmatched LIDs, fetch profile picture via API
    // Compare using base URL path (without query params) for robust matching
    function picBasePath(url) {
      if (!url || typeof url !== 'string') return null
      try { return new URL(url).pathname } catch { return url.split('?')[0] }
    }

    for (const c of lidChats) {
      const lidJid = String(c?.remoteJid || c?.id || '').trim()
      if (lidToPhoneMap.has(lidJid)) continue
      try {
        const picRes = await evolutionRequest(`/chat/fetchProfilePictureUrl/${encodeURIComponent(instanceName)}`, {
          method: 'POST',
          body: { number: lidJid },
        })
        const lidPic = picRes?.profilePictureUrl
        const lidPicBase = picBasePath(lidPic)
        if (!lidPicBase) continue

        // Match against phone chat pics (from findChats data first, then API)
        for (const pc of phoneChats) {
          const phoneJid = String(pc?.remoteJid || pc?.id || '').trim()
          if (!phoneJid || phoneJid === '0@s.whatsapp.net') continue
          // Skip phones already mapped to another LID
          if (phoneToLidMap.has(phoneJid)) continue
          // Compare with findChats profilePicUrl
          const chatPicBase = picBasePath(pc?.profilePicUrl)
          if (chatPicBase && lidPicBase === chatPicBase) {
            registerLidPhoneMapping(lidJid, phoneJid)
            break
          }
          // Fetch phone pic via API for more reliable comparison
          try {
            const phonePicRes = await evolutionRequest(`/chat/fetchProfilePictureUrl/${encodeURIComponent(instanceName)}`, {
              method: 'POST',
              body: { number: phoneJid },
            })
            const phonePicBase = picBasePath(phonePicRes?.profilePictureUrl)
            if (phonePicBase && lidPicBase === phonePicBase) {
              registerLidPhoneMapping(lidJid, phoneJid)
              break
            }
          } catch (_) {}
        }
      } catch (e) {
        console.warn('[findChats] secondary LID match error:', e?.message)
      }
    }

    console.log(`[findChats] LID mappings: ${lidToPhoneMap.size} pairs`)

    // 5. Upsert only phone-based conversations (canonical)
    // For LID chats with no phone mapping, still create them
    const upserted = []
    const processedPhoneJids = new Set()

    for (const c of phoneChats) {
      const remoteJid = String(c?.remoteJid || c?.id || '').trim()
      if (!remoteJid) continue
      processedPhoneJids.add(remoteJid)

      const lastTs = c?.lastMessage?.messageTimestamp
      const lastTimestamp = lastTs ? Number(lastTs) : null

      const contact = contactsMap[remoteJid]
      let contactName = contact?.pushName || contact?.profileName || c?.pushName || c?.name || null
      let profilePicUrl = contact?.profilePicUrl || c?.profilePicUrl || null

      // Enrich from mapped LID chat (get name if phone doesn't have it)
      const mappedLid = getLidForPhone(remoteJid)
      if (mappedLid) {
        const lidChat = lidChats.find(lc => String(lc?.remoteJid || lc?.id || '') === mappedLid)
        const lidContact = contactsMap[mappedLid]
        if (!contactName) contactName = lidContact?.pushName || lidContact?.profileName || lidChat?.pushName || lidChat?.name || null
        if (!profilePicUrl) profilePicUrl = lidContact?.profilePicUrl || lidChat?.profilePicUrl || null

        // Use the most recent lastMessage from either
        const lidTs = lidChat?.lastMessage?.messageTimestamp ? Number(lidChat.lastMessage.messageTimestamp) : null
        if (lidTs && (!lastTimestamp || lidTs > lastTimestamp)) {
          // LID has newer message
        }
      }

      // Only include nome_contato/foto_perfil_url if non-null to avoid overwriting good data
      const payload = {
        admin_profile_id: clinicAdminId,
        remote_jid: remoteJid,
        numero_telefone: remoteJid.split('@')[0] || null,
        ultima_mensagem: extractLastMessagePreview(c?.lastMessage) || null,
        ultima_mensagem_timestamp: Number.isFinite(lastTimestamp) ? lastTimestamp : null,
        mensagens_nao_lidas: Number(c?.unreadCount || 0) || 0,
        updated_at: new Date().toISOString(),
      }
      if (contactName) payload.nome_contato = contactName
      if (profilePicUrl) payload.foto_perfil_url = profilePicUrl

      try {
        const row = await supabaseRest('whatsapp_conversas', {
          method: 'POST',
          data: payload,
          params: { on_conflict: 'admin_profile_id,remote_jid' },
        })
        if (Array.isArray(row) && row[0]) upserted.push(row[0])
        else if (row) upserted.push(row)
      } catch (upsertErr) {
        console.error('[findChats] upsert error for', remoteJid, upsertErr?.message)
      }
    }

    // Process LID chats that have NO phone mapping (orphan LIDs - still need to show)
    for (const c of lidChats) {
      const lidJid = String(c?.remoteJid || c?.id || '').trim()
      if (!lidJid) continue
      if (lidToPhoneMap.has(lidJid)) continue

      const lastTs = c?.lastMessage?.messageTimestamp
      const lastTimestamp = lastTs ? Number(lastTs) : null
      const contact = contactsMap[lidJid]
      const contactName = contact?.pushName || contact?.profileName || c?.pushName || c?.name || null
      const profilePicUrl = contact?.profilePicUrl || c?.profilePicUrl || null

      const payload = {
        admin_profile_id: clinicAdminId,
        remote_jid: lidJid,
        numero_telefone: null,
        ultima_mensagem: extractLastMessagePreview(c?.lastMessage) || null,
        ultima_mensagem_timestamp: Number.isFinite(lastTimestamp) ? lastTimestamp : null,
        mensagens_nao_lidas: Number(c?.unreadCount || 0) || 0,
        updated_at: new Date().toISOString(),
      }
      if (contactName) payload.nome_contato = contactName
      if (profilePicUrl) payload.foto_perfil_url = profilePicUrl

      try {
        const row = await supabaseRest('whatsapp_conversas', {
          method: 'POST',
          data: payload,
          params: { on_conflict: 'admin_profile_id,remote_jid' },
        })
        if (Array.isArray(row) && row[0]) upserted.push(row[0])
        else if (row) upserted.push(row)
      } catch (upsertErr) {
        console.error('[findChats] upsert error for', lidJid, upsertErr?.message)
      }
    }

    // 6. MERGE: Delete LID conversations that now have a phone mapping
    //    Move their messages to the phone conversation and delete the LID conversa
    for (const [lidJid, phoneJid] of lidToPhoneMap.entries()) {
      try {
        // Find both conversations
        const lidConvRes = await supabaseRest(
          `whatsapp_conversas?select=id,nome_contato,foto_perfil_url&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(lidJid)}`,
          { method: 'GET' }
        )
        const lidConv = Array.isArray(lidConvRes) ? lidConvRes[0] : null
        if (!lidConv) continue

        const phoneConvRes = await supabaseRest(
          `whatsapp_conversas?select=id,nome_contato,foto_perfil_url&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(phoneJid)}`,
          { method: 'GET' }
        )
        const phoneConv = Array.isArray(phoneConvRes) ? phoneConvRes[0] : null
        if (!phoneConv) continue

        console.log(`[findChats] MERGING LID ${lidJid} → phone ${phoneJid}`)

        // Copy name/pic from LID to phone if phone is missing them
        // Skip nome_contato if it's just a number (LID number used as pushName)
        const updates = {}
        if (!phoneConv.nome_contato && lidConv.nome_contato && !/^\d+$/.test(lidConv.nome_contato.trim())) {
          updates.nome_contato = lidConv.nome_contato
        }
        if (!phoneConv.foto_perfil_url && lidConv.foto_perfil_url) updates.foto_perfil_url = lidConv.foto_perfil_url
        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString()
          await supabaseRest(`whatsapp_conversas?id=eq.${phoneConv.id}`, { method: 'PATCH', data: updates })
        }

        // Move messages from LID conversa to phone conversa
        await supabaseRest(
          `whatsapp_mensagens?admin_profile_id=eq.${clinicAdminId}&conversa_id=eq.${lidConv.id}`,
          { method: 'PATCH', data: { conversa_id: phoneConv.id, remote_jid: phoneJid, updated_at: new Date().toISOString() } }
        )

        // Delete the LID conversation
        await supabaseRest(
          `whatsapp_conversas?id=eq.${lidConv.id}`,
          { method: 'DELETE' }
        )

        console.log(`[findChats] MERGED: LID conv ${lidConv.id} → phone conv ${phoneConv.id}`)
      } catch (mergeErr) {
        console.error('[findChats] merge error:', mergeErr?.message)
      }
    }

    const result = { ok: true, instanceName, total: filteredList.length, upserted: upserted.length, mergedLids: lidToPhoneMap.size }
    findChatsCache.set(clinicAdminId, { timestamp: Date.now(), result })
    return res.json(result)
  } catch (e) {
    console.error('[findChats] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao buscar chats', details: e?.message || String(e) })
  }
})

// POST /api/chat/findMessages
// Body: { remoteJid }
app.post('/api/chat/findMessages', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Não foi possível resolver instância WhatsApp da clínica para o usuário' })
    }

    let remoteJid = String(req.body?.remoteJid || '').trim()
    if (!remoteJid) return res.status(400).json({ error: 'remoteJid é obrigatório' })

    // If this is a LID with a known phone mapping, redirect to phone conversation
    const canonical = getCanonicalJid(remoteJid)
    if (canonical !== remoteJid) {
      console.log(`[findMessages] Redirecting LID ${remoteJid} → phone ${canonical}`)
      remoteJid = canonical
    }

    // Rate limit: skip if called too recently for same conversation
    const msgCacheKey = `${clinicAdminId}:${remoteJid}`
    const lastMsgSync = findMessagesCache.get(msgCacheKey)
    if (lastMsgSync && (Date.now() - lastMsgSync) < FIND_MESSAGES_COOLDOWN_MS) {
      return res.json({ ok: true, cached: true, remoteJid })
    }
    findMessagesCache.set(msgCacheKey, Date.now())

    console.log('[findMessages] instance:', instanceName, 'remoteJid:', remoteJid)

    // Garantir conversa existe — usar query params corretos
    let conversaId = null
    try {
      const convUrl = `whatsapp_conversas?select=id&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(remoteJid)}`
      const conv = await supabaseRest(convUrl, { method: 'GET' })
      conversaId = Array.isArray(conv) && conv[0]?.id ? conv[0].id : null
    } catch (lookupErr) {
      console.error('[findMessages] conversa lookup error:', lookupErr?.message)
    }

    if (!conversaId) {
      try {
        const created = await supabaseRest('whatsapp_conversas', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            remote_jid: remoteJid,
            nome_contato: null,
            numero_telefone: remoteJid.split('@')[0] || null,
            mensagens_nao_lidas: 0,
          },
          params: { on_conflict: 'admin_profile_id,remote_jid' },
        })
        const row = Array.isArray(created) ? created[0] : created
        conversaId = row?.id || null
      } catch (createErr) {
        console.error('[findMessages] conversa create error:', createErr?.message)
      }
    }

    if (!conversaId) {
      return res.status(500).json({ error: 'Não foi possível criar/encontrar conversa no banco' })
    }

    // Fetch messages from Evolution - for phone JIDs, also fetch from mapped LID
    const jidsToFetch = [remoteJid]
    const mappedLid = getLidForPhone(remoteJid)
    if (mappedLid) jidsToFetch.push(mappedLid)
    // If this IS a LID and has a phone mapping, redirect to phone
    const canonicalJid = getCanonicalJid(remoteJid)
    if (canonicalJid !== remoteJid && !jidsToFetch.includes(canonicalJid)) {
      jidsToFetch.unshift(canonicalJid)
    }

    let list = []
    for (const jid of jidsToFetch) {
      try {
        const rawMessages = await evolutionRequest(`/chat/findMessages/${encodeURIComponent(instanceName)}`, {
          method: 'POST',
          body: { where: { key: { remoteJid: jid } } },
        })
        let batch = []
        if (Array.isArray(rawMessages)) batch = rawMessages
        else if (rawMessages?.messages?.records && Array.isArray(rawMessages.messages.records)) batch = rawMessages.messages.records
        else if (Array.isArray(rawMessages?.messages)) batch = rawMessages.messages
        list.push(...batch)
      } catch (fetchErr) {
        console.warn(`[findMessages] fetch error for ${jid}:`, fetchErr?.message)
      }
    }

    // Deduplicate by message ID
    const seen = new Set()
    list = list.filter(m => {
      const mid = m?.key?.id
      if (!mid || seen.has(mid)) return false
      seen.add(mid)
      return true
    })

    console.log(`[findMessages] Evolution returned ${list.length} messages for ${remoteJid}${mappedLid ? ' (+LID ' + mappedLid + ')' : ''}`)

    // Also update contact name on the conversation from pushName in messages
    let pushNameForConv = null

    // Batch-fetch existing message statuses to prevent downgrade
    const existingStatusMap = new Map()
    try {
      const msgIds = list.map(m => String(m?.key?.id || '').trim()).filter(Boolean)
      if (msgIds.length > 0) {
        const existingMsgs = await supabaseRest(
          `whatsapp_mensagens?select=message_id,status,media_url&admin_profile_id=eq.${clinicAdminId}&message_id=in.(${msgIds.map(encodeURIComponent).join(',')})`,
          { method: 'GET' }
        )
        if (Array.isArray(existingMsgs)) {
          for (const em of existingMsgs) {
            existingStatusMap.set(em.message_id, { status: em.status, media_url: em.media_url })
          }
        }
      }
    } catch (_) {}

    const upserted = []
    for (const m of list) {
      const messageId = String(m?.key?.id || '').trim()
      // Always use canonical (phone) JID for storage, not LID
      const rawRjid = String(m?.key?.remoteJid || remoteJid).trim()
      const rjid = getCanonicalJid(rawRjid) || remoteJid
      if (!messageId) continue

      const ts = m?.messageTimestamp
      const timestampMsg = Number(ts) || null
      const msg = m?.message || {}

      // Use improved helpers for content extraction and type detection
      const text = extractMessageContent(msg)
      let tipo = detectMessageType(msg)

      // Also check messageType from Evolution if our detection fails
      if (tipo === 'unknown' && m?.messageType) {
        tipo = String(m.messageType).toLowerCase()
      }

      // Skip protocol and reaction messages (Evolution may return messageType as 'reactionMessage')
      if (tipo === 'protocol' || tipo === 'reaction' || tipo === 'reactionmessage' || tipo === 'protocolmessage') continue

      const newStatusStr = mapMessageStatus(m?.status)

      // Capture pushName for contact name update (skip if it's just a number/LID)
      if (m?.pushName && !m?.key?.fromMe && m.pushName !== 'Você') {
        const pn = m.pushName.trim()
        if (pn && !/^\d+$/.test(pn)) {
          pushNameForConv = pn
        }
      }

      // Extract media info
      const mediaInfo = extractMediaInfo(m, msg)

      // Prevent status downgrade using batch-fetched data
      let statusStr = newStatusStr
      const existingData = existingStatusMap.get(messageId)
      if (existingData?.status && (STATUS_PRIORITY[existingData.status] || 0) > (STATUS_PRIORITY[newStatusStr] || 0)) {
        statusStr = existingData.status
      }

      const payload = {
        admin_profile_id: clinicAdminId,
        conversa_id: conversaId,
        message_id: messageId,
        remote_jid: rjid,
        conteudo: text,
        tipo_mensagem: tipo,
        from_me: Boolean(m?.key?.fromMe),
        timestamp_msg: Number.isFinite(timestampMsg) ? timestampMsg : Math.floor(Date.now() / 1000),
        status: statusStr,
        caption: msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentWithCaptionMessage?.message?.documentMessage?.caption || null,
        latitude: msg?.locationMessage?.degreesLatitude || null,
        longitude: msg?.locationMessage?.degreesLongitude || null,
        location_name: msg?.locationMessage?.name || null,
        location_address: msg?.locationMessage?.address || null,
        metadata: {},
        updated_at: new Date().toISOString(),
      }
      // Only include media fields if non-null, and never overwrite a cached data: URI with an encrypted URL
      const existingMediaUrl = existingData?.media_url || ''
      const hasValidCache = existingMediaUrl.startsWith('data:')
      if (mediaInfo.media_url && !hasValidCache) payload.media_url = mediaInfo.media_url
      if (mediaInfo.media_mimetype) payload.media_mimetype = mediaInfo.media_mimetype
      if (mediaInfo.media_filename) payload.media_filename = mediaInfo.media_filename

      try {
        const row = await supabaseRest('whatsapp_mensagens', {
          method: 'POST',
          data: payload,
          params: { on_conflict: 'admin_profile_id,message_id' },
        })
        if (Array.isArray(row) && row[0]) upserted.push(row[0])
        else if (row) upserted.push(row)
      } catch (upsertErr) {
        console.error('[findMessages] msg upsert error for', messageId, upsertErr?.message)
      }
    }

    // Update conversation with pushName if found and conversation has no name
    if (pushNameForConv && conversaId) {
      try {
        // Only update if name is currently null
        const convCheck = await supabaseRest(`whatsapp_conversas?select=nome_contato&id=eq.${conversaId}`, { method: 'GET' })
        const currentName = Array.isArray(convCheck) ? convCheck[0]?.nome_contato : convCheck?.nome_contato
        if (!currentName) {
          await supabaseRest(`whatsapp_conversas?id=eq.${conversaId}`, {
            method: 'PATCH',
            data: { nome_contato: pushNameForConv, updated_at: new Date().toISOString() },
          })
        }
      } catch (_) {}
    }

    console.log(`[findMessages] upserted ${upserted.length} messages`)
    return res.json({ ok: true, instanceName, remoteJid, total: list.length, upserted: upserted.length })
  } catch (e) {
    console.error('[findMessages] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao buscar mensagens', details: e?.message || String(e) })
  }
})

// POST /api/chat/sendText
// Body: { remoteJid, text, quotedMessageId?, profissionalId? }
app.post('/api/chat/sendText', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName, profissionalClinicaId } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const remoteJid = String(req.body?.remoteJid || '').trim()
    const text = String(req.body?.text || '').trim()
    const quotedMessageId = req.body?.quotedMessageId || null
    // Priorizar o profissionalId resolvido pelo backend (via token), fallback para o enviado pelo frontend
    const profissionalId = profissionalClinicaId || req.body?.profissionalId || null

    if (!remoteJid || !text) {
      return res.status(400).json({ error: 'remoteJid e text são obrigatórios' })
    }

    const number = getNumberForEvolution(remoteJid)
    const payload = {
      number,
      text,
      delay: 500,
      linkPreview: true,
    }
    if (quotedMessageId) {
      payload.quoted = { key: { id: quotedMessageId }, message: { conversation: '' } }
    }

    console.log('[sendText] instance:', instanceName, 'to:', number)

    const response = await evolutionRequest(`/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: payload,
    })

    // Persist sent message
    const messageId = response?.key?.id
    const responseJid = response?.key?.remoteJid || remoteJid
    const ts = Number(response?.messageTimestamp) || Math.floor(Date.now() / 1000)

    // Track LID↔phone mapping from response
    if (responseJid !== remoteJid) {
      if (responseJid.endsWith('@lid') && remoteJid.endsWith('@s.whatsapp.net')) {
        registerLidPhoneMapping(responseJid, remoteJid)
      } else if (remoteJid.endsWith('@lid') && responseJid.endsWith('@s.whatsapp.net')) {
        registerLidPhoneMapping(remoteJid, responseJid)
      }
    }

    // Always persist under the canonical (phone) JID
    const canonicalJid = getCanonicalJid(remoteJid) || remoteJid
    const storageJid = canonicalJid

    // Find conversa by canonical JID
    let conversaId = null
    try {
      const conv = await supabaseRest(`whatsapp_conversas?select=id&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(storageJid)}`, { method: 'GET' })
      conversaId = Array.isArray(conv) && conv[0]?.id ? conv[0].id : null
    } catch (_) {}

    if (!conversaId) {
      try {
        const created = await supabaseRest('whatsapp_conversas', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            remote_jid: storageJid,
            numero_telefone: storageJid.endsWith('@lid') ? null : storageJid.split('@')[0],
            mensagens_nao_lidas: 0,
          },
          params: { on_conflict: 'admin_profile_id,remote_jid' },
        })
        const row = Array.isArray(created) ? created[0] : created
        conversaId = row?.id || null
      } catch (_) {}
    }

    if (messageId && conversaId) {
      try {
        await supabaseRest('whatsapp_mensagens', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            conversa_id: conversaId,
            message_id: messageId,
            remote_jid: storageJid,
            conteudo: text,
            tipo_mensagem: 'text',
            from_me: true,
            timestamp_msg: ts,
            status: 'SENT',
            profissional_id: profissionalId || null,
            quoted_message_id: quotedMessageId || null,
            metadata: {},
          },
          params: { on_conflict: 'admin_profile_id,message_id' },
        })
      } catch (e) {
        console.error('[sendText] persist error:', e?.message)
      }
    }

    // Update conversation preview
    if (conversaId) {
      try {
        await supabaseRest(`whatsapp_conversas?id=eq.${conversaId}`, {
          method: 'PATCH',
          data: { ultima_mensagem: text, ultima_mensagem_timestamp: ts, updated_at: new Date().toISOString() },
        })
      } catch (_) {}
    }

    return res.json({ ok: true, response, conversaId })
  } catch (e) {
    console.error('[sendText] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao enviar mensagem', details: e?.message || String(e) })
  }
})

// POST /api/chat/sendReaction
// Body: { remoteJid, messageId, fromMe, emoji }
app.post('/api/chat/sendReaction', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, messageId, fromMe, emoji } = req.body || {}
    if (!remoteJid || !messageId || !emoji) {
      return res.status(400).json({ error: 'remoteJid, messageId e emoji são obrigatórios' })
    }

    console.log('[sendReaction] instance:', instanceName, 'msg:', messageId, 'emoji:', emoji)

    const response = await evolutionRequest(`/message/sendReaction/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: {
        key: {
          remoteJid,
          fromMe: Boolean(fromMe),
          id: messageId,
        },
        reaction: emoji,
      },
    })

    // Update reaction in DB
    try {
      await supabaseRest(
        `whatsapp_mensagens?admin_profile_id=eq.${clinicAdminId}&message_id=eq.${messageId}`,
        {
          method: 'PATCH',
          data: { reacao: emoji, updated_at: new Date().toISOString() },
        }
      )
    } catch (e) {
      console.error('[sendReaction] db update error:', e?.message)
    }

    return res.json({ ok: true, response })
  } catch (e) {
    console.error('[sendReaction] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao enviar reação', details: e?.message || String(e) })
  }
})

// POST /api/chat/markAsRead
// Body: { remoteJid, messages: [{ id, fromMe }] }
app.post('/api/chat/markAsRead', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, messages, conversaId } = req.body || {}
    if (!remoteJid) {
      return res.status(400).json({ error: 'remoteJid é obrigatório' })
    }

    const readMessages = (Array.isArray(messages) ? messages : [])
      .filter(m => !m.fromMe)
      .map(m => ({
        remoteJid,
        fromMe: false,
        id: m.id || m.messageId,
      }))

    if (readMessages.length > 0) {
      try {
        await evolutionRequest(`/chat/markMessageAsRead/${encodeURIComponent(instanceName)}`, {
          method: 'POST',
          body: { readMessages },
        })
      } catch (e) {
        console.error('[markAsRead] Evolution error:', e?.message)
      }
    }

    // Reset unread count in DB
    if (conversaId) {
      try {
        await supabaseRest(
          `whatsapp_conversas?id=eq.${conversaId}`,
          {
            method: 'PATCH',
            data: { mensagens_nao_lidas: 0, updated_at: new Date().toISOString() },
          }
        )
      } catch (e) {
        console.error('[markAsRead] db error:', e?.message)
      }
    }

    return res.json({ ok: true, read: readMessages.length })
  } catch (e) {
    console.error('[markAsRead] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao marcar como lido', details: e?.message || String(e) })
  }
})

// POST /api/chat/getMediaBase64
// Body: { messageId } - Downloads media from Evolution and returns base64
app.post('/api/chat/getMediaBase64', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { messageId } = req.body || {}
    if (!messageId) {
      return res.status(400).json({ error: 'messageId é obrigatório' })
    }

    // Look up message in DB to get full key (remoteJid, fromMe)
    let remoteJid = null
    let fromMe = false
    try {
      const msgs = await supabaseRest(
        `whatsapp_mensagens?select=remote_jid,from_me&admin_profile_id=eq.${clinicAdminId}&message_id=eq.${encodeURIComponent(messageId)}&limit=1`,
        { method: 'GET' }
      )
      if (Array.isArray(msgs) && msgs[0]) {
        remoteJid = msgs[0].remote_jid
        fromMe = msgs[0].from_me === true
      }
    } catch (_) {}

    // Build full key for Evolution — include remoteJid (try LID variant too) and fromMe
    const keyRemoteJid = remoteJid ? (phoneToLidMap.get(remoteJid) || remoteJid) : undefined
    const messageKey = { id: messageId }
    if (keyRemoteJid) messageKey.remoteJid = keyRemoteJid
    messageKey.fromMe = fromMe

    console.log('[getMediaBase64] messageId:', messageId, 'key:', JSON.stringify(messageKey))

    // Use AbortController for 30s timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    let response
    try {
      response = await evolutionRequest(`/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        body: { message: { key: messageKey }, convertToMp4: false },
      })
    } finally {
      clearTimeout(timeout)
    }

    if (response?.base64) {
      // Evolution sometimes returns string "false" or boolean false for mimetype
      let mimetype = response?.mimetype
      if (!mimetype || mimetype === 'false' || mimetype === false) {
        // Try to get mimetype from DB
        try {
          const dbMsg = await supabaseRest(
            `whatsapp_mensagens?select=media_mimetype&admin_profile_id=eq.${clinicAdminId}&message_id=eq.${encodeURIComponent(messageId)}&limit=1`,
            { method: 'GET' }
          )
          if (Array.isArray(dbMsg) && dbMsg[0]?.media_mimetype) mimetype = dbMsg[0].media_mimetype
        } catch (_) {}
      }
      if (!mimetype || mimetype === 'false' || mimetype === false) mimetype = 'application/octet-stream'

      const dataUri = `data:${mimetype};base64,${response.base64}`
      console.log('[getMediaBase64] SUCCESS messageId:', messageId, 'mimetype:', mimetype, 'size:', response.base64.length)

      // Cache in DB only if not too large (< 500KB base64 ≈ ~375KB file)
      if (response.base64.length < 500000) {
        try {
          await supabaseRest(
            `whatsapp_mensagens?admin_profile_id=eq.${clinicAdminId}&message_id=eq.${encodeURIComponent(messageId)}`,
            {
              method: 'PATCH',
              data: { media_url: dataUri, media_mimetype: mimetype, updated_at: new Date().toISOString() },
            }
          )
        } catch (_) {}
      }

      return res.json({ ok: true, base64: response.base64, mimetype, dataUri })
    }

    return res.status(404).json({ error: 'Mídia não encontrada' })
  } catch (e) {
    console.error('[getMediaBase64] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao baixar mídia', details: e?.message || String(e) })
  }
})

// POST /api/chat/updateMessage
// Body: { remoteJid, messageId, text }
app.post('/api/chat/updateMessage', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, messageId, text } = req.body || {}
    if (!remoteJid || !messageId || !text) {
      return res.status(400).json({ error: 'remoteJid, messageId e text são obrigatórios' })
    }

    const number = getNumberForEvolution(remoteJid)

    console.log('[updateMessage] instance:', instanceName, 'msg:', messageId)

    const response = await evolutionRequest(`/chat/updateMessage/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: {
        number,
        text,
        key: {
          remoteJid,
          fromMe: true,
          id: messageId,
        },
      },
    })

    // Update in DB
    try {
      await supabaseRest(
        `whatsapp_mensagens?admin_profile_id=eq.${clinicAdminId}&message_id=eq.${messageId}`,
        {
          method: 'PATCH',
          data: {
            conteudo: text,
            editado: true,
            editado_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }
      )
    } catch (e) {
      console.error('[updateMessage] db error:', e?.message)
    }

    return res.json({ ok: true, response })
  } catch (e) {
    console.error('[updateMessage] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao editar mensagem', details: e?.message || String(e) })
  }
})

// DELETE /api/chat/deleteMessage
// Body: { remoteJid, messageId }
// Deletes a message for everyone (only from_me messages)
app.post('/api/chat/deleteMessage', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, messageId } = req.body || {}
    if (!remoteJid || !messageId) {
      return res.status(400).json({ error: 'remoteJid e messageId são obrigatórios' })
    }

    // Resolve LID for the remoteJid
    const keyRemoteJid = phoneToLidMap.get(remoteJid) || remoteJid

    console.log('[deleteMessage] instance:', instanceName, 'msg:', messageId, 'remoteJid:', keyRemoteJid)

    const response = await evolutionRequest(`/chat/deleteMessageForEveryone/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
      body: {
        id: messageId,
        remoteJid: keyRemoteJid,
        fromMe: true,
      },
    })

    // Remove from DB
    try {
      await supabaseRest(
        `whatsapp_mensagens?admin_profile_id=eq.${clinicAdminId}&message_id=eq.${encodeURIComponent(messageId)}`,
        { method: 'DELETE' }
      )
    } catch (e) {
      console.error('[deleteMessage] db error:', e?.message)
    }

    return res.json({ ok: true, response })
  } catch (e) {
    console.error('[deleteMessage] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao deletar mensagem', details: e?.message || String(e) })
  }
})

// POST /api/chat/sendMedia
// Body: { remoteJid, mediatype, mimetype, media, caption?, fileName?, profissionalId? }
app.post('/api/chat/sendMedia', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName, profissionalClinicaId } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, mediatype, mimetype, media, caption, fileName, profissionalId: frontendProfId } = req.body || {}
    const profissionalId = profissionalClinicaId || frontendProfId || null
    if (!remoteJid || !mediatype || !media) {
      return res.status(400).json({ error: 'remoteJid, mediatype e media são obrigatórios' })
    }

    const number = getNumberForEvolution(remoteJid)

    // Strip data URI prefix if present — Evolution expects raw base64
    let mediaPayload = media
    if (typeof media === 'string' && media.startsWith('data:')) {
      const commaIdx = media.indexOf(',')
      if (commaIdx > -1) mediaPayload = media.substring(commaIdx + 1)
    }

    console.log('[sendMedia] instance:', instanceName, 'to:', number, 'type:', mediatype)

    const response = await evolutionRequest(`/message/sendMedia/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: { number, mediatype, mimetype, media: mediaPayload, caption: caption || '', fileName: fileName || '', delay: 500 },
    })

    // Persist
    const messageId = response?.key?.id
    const responseJid = response?.key?.remoteJid || remoteJid
    const ts = Number(response?.messageTimestamp) || Math.floor(Date.now() / 1000)

    // Track LID mapping
    if (responseJid !== remoteJid) {
      if (responseJid.endsWith('@lid') && remoteJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(responseJid, remoteJid)
      else if (remoteJid.endsWith('@lid') && responseJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(remoteJid, responseJid)
    }
    const storageJid = getCanonicalJid(remoteJid) || remoteJid

    let conversaId = null
    try {
      const conv = await supabaseRest(`whatsapp_conversas?select=id&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(storageJid)}`, { method: 'GET' })
      conversaId = Array.isArray(conv) && conv[0]?.id ? conv[0].id : null
    } catch (_) {}

    if (messageId && conversaId) {
      try {
        await supabaseRest('whatsapp_mensagens', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            conversa_id: conversaId,
            message_id: messageId,
            remote_jid: storageJid,
            conteudo: null,
            tipo_mensagem: mediatype,
            from_me: true,
            timestamp_msg: ts,
            status: 'SENT',
            media_url: media,
            media_mimetype: mimetype || null,
            media_filename: fileName || null,
            caption: caption || null,
            profissional_id: profissionalId || null,
            metadata: {},
          },
          params: { on_conflict: 'admin_profile_id,message_id' },
        })
      } catch (e) {
        console.error('[sendMedia] persist error:', e?.message)
      }
    }

    return res.json({ ok: true, response, conversaId })
  } catch (e) {
    console.error('[sendMedia] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao enviar mídia', details: e?.message || String(e) })
  }
})

// POST /api/chat/sendAudio
// Body: { remoteJid, audio, profissionalId? }
app.post('/api/chat/sendAudio', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName, profissionalClinicaId } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, audio, profissionalId: frontendProfId } = req.body || {}
    const profissionalId = profissionalClinicaId || frontendProfId || null
    if (!remoteJid || !audio) {
      return res.status(400).json({ error: 'remoteJid e audio são obrigatórios' })
    }

    const number = getNumberForEvolution(remoteJid)

    // Strip data URI prefix if present — Evolution expects raw base64
    let audioPayload = audio
    if (typeof audio === 'string' && audio.startsWith('data:')) {
      const commaIdx = audio.indexOf(',')
      if (commaIdx > -1) audioPayload = audio.substring(commaIdx + 1)
    }

    console.log('[sendAudio] instance:', instanceName, 'to:', number)

    const response = await evolutionRequest(`/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: { number, audio: audioPayload, delay: 500 },
    })

    const messageId = response?.key?.id
    const responseJid = response?.key?.remoteJid || remoteJid
    const ts = Number(response?.messageTimestamp) || Math.floor(Date.now() / 1000)

    // Track LID mapping
    if (responseJid !== remoteJid) {
      if (responseJid.endsWith('@lid') && remoteJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(responseJid, remoteJid)
      else if (remoteJid.endsWith('@lid') && responseJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(remoteJid, responseJid)
    }
    const storageJid = getCanonicalJid(remoteJid) || remoteJid

    let conversaId = null
    try {
      const conv = await supabaseRest(`whatsapp_conversas?select=id&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(storageJid)}`, { method: 'GET' })
      conversaId = Array.isArray(conv) && conv[0]?.id ? conv[0].id : null
    } catch (_) {}

    if (messageId && conversaId) {
      try {
        await supabaseRest('whatsapp_mensagens', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            conversa_id: conversaId,
            message_id: messageId,
            remote_jid: storageJid,
            conteudo: null,
            tipo_mensagem: 'audio',
            from_me: true,
            timestamp_msg: ts,
            status: 'SENT',
            media_url: audio,
            media_mimetype: 'audio/ogg',
            profissional_id: profissionalId || null,
            metadata: {},
          },
          params: { on_conflict: 'admin_profile_id,message_id' },
        })
      } catch (e) {
        console.error('[sendAudio] persist error:', e?.message)
      }
    }

    return res.json({ ok: true, response, conversaId })
  } catch (e) {
    console.error('[sendAudio] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao enviar áudio', details: e?.message || String(e) })
  }
})

// POST /api/chat/sendLocation
// Body: { remoteJid, latitude, longitude, name, address, profissionalId? }
app.post('/api/chat/sendLocation', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token de autenticação ausente' })

    const { clinicAdminId, instanceName, profissionalClinicaId } = await resolveClinicAdminAndInstance(token)
    if (!clinicAdminId || !instanceName) {
      return res.status(400).json({ error: 'Instância WhatsApp não encontrada' })
    }

    const { remoteJid, latitude, longitude, name, address, profissionalId: frontendProfId } = req.body || {}
    const profissionalId = profissionalClinicaId || frontendProfId || null
    if (!remoteJid || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'remoteJid, latitude e longitude são obrigatórios' })
    }

    const number = getNumberForEvolution(remoteJid)

    const response = await evolutionRequest(`/message/sendLocation/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: { number, latitude, longitude, name: name || '', address: address || '', delay: 500 },
    })

    const messageId = response?.key?.id
    const responseJid = response?.key?.remoteJid || remoteJid
    const ts = Number(response?.messageTimestamp) || Math.floor(Date.now() / 1000)

    // Track LID mapping
    if (responseJid !== remoteJid) {
      if (responseJid.endsWith('@lid') && remoteJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(responseJid, remoteJid)
      else if (remoteJid.endsWith('@lid') && responseJid.endsWith('@s.whatsapp.net')) registerLidPhoneMapping(remoteJid, responseJid)
    }
    const storageJid = getCanonicalJid(remoteJid) || remoteJid

    let conversaId = null
    try {
      const conv = await supabaseRest(`whatsapp_conversas?select=id&admin_profile_id=eq.${clinicAdminId}&remote_jid=eq.${encodeURIComponent(storageJid)}`, { method: 'GET' })
      conversaId = Array.isArray(conv) && conv[0]?.id ? conv[0].id : null
    } catch (_) {}

    if (messageId && conversaId) {
      try {
        await supabaseRest('whatsapp_mensagens', {
          method: 'POST',
          data: {
            admin_profile_id: clinicAdminId,
            conversa_id: conversaId,
            message_id: messageId,
            remote_jid: storageJid,
            conteudo: null,
            tipo_mensagem: 'location',
            from_me: true,
            timestamp_msg: ts,
            status: 'SENT',
            latitude,
            longitude,
            location_name: name || null,
            location_address: address || null,
            profissional_id: profissionalId || null,
            metadata: {},
          },
          params: { on_conflict: 'admin_profile_id,message_id' },
        })
      } catch (e) {
        console.error('[sendLocation] persist error:', e?.message)
      }
    }

    return res.json({ ok: true, response, conversaId })
  } catch (e) {
    console.error('[sendLocation] error:', e?.message || e)
    const status = e?.statusCode && Number.isFinite(e.statusCode) ? e.statusCode : 500
    return res.status(status).json({ error: 'Falha ao enviar localização', details: e?.message || String(e) })
  }
})

const distDir = path.resolve(__dirname, 'dist')

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

function safeParseTime(value) {
  if (!value) return null
  const d = new Date(value)
  const t = d.getTime()
  if (!Number.isFinite(t)) return null
  return t
}

function getDisparosStatsForJobs(jobs) {
  const now = Date.now()
  const todayKey = getDateKeySaoPaulo(now)
  const weekStart = now - 7 * 24 * 60 * 60 * 1000
  const monthStart = now - 30 * 24 * 60 * 60 * 1000

  const agg = {
    total: { scheduled: 0, running: 0, sent: 0, failed: 0, canceled: 0 },
    hoje: { sent: 0, failed: 0, unique: 0 },
    semana: { sent: 0, failed: 0, unique: 0 },
    mes: { sent: 0, failed: 0, unique: 0 },
  }

  const uniqueHoje = new Set()
  const uniqueSemana = new Set()
  const uniqueMes = new Set()

  for (const job of jobs) {
    const status = job?.status
    if (status && Object.prototype.hasOwnProperty.call(agg.total, status)) {
      agg.total[status] += 1
    }

    if (status !== 'sent' && status !== 'failed') continue
    const finishedTs = safeParseTime(job.finishedAt) ?? safeParseTime(job.startedAt) ?? safeParseTime(job.createdAt)
    if (!finishedTs) continue

    const recipientKey =
      normalizeSendNumberDigits(job.sendNumberDigits || job.sendNumber || job.numberForSend || job.number) ||
      String(job.number || '')

    const isToday = getDateKeySaoPaulo(finishedTs) === todayKey
    const isWeek = finishedTs >= weekStart
    const isMonth = finishedTs >= monthStart

    if (isToday) {
      agg.hoje[status] += 1
      if (recipientKey) uniqueHoje.add(recipientKey)
    }
    if (isWeek) {
      agg.semana[status] += 1
      if (recipientKey) uniqueSemana.add(recipientKey)
    }
    if (isMonth) {
      agg.mes[status] += 1
      if (recipientKey) uniqueMes.add(recipientKey)
    }
  }

  agg.hoje.unique = uniqueHoje.size
  agg.semana.unique = uniqueSemana.size
  agg.mes.unique = uniqueMes.size

  return agg
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

function createJobsForInstance({ instanceName, items, minMinutes, maxMinutes, startAtMs }) {
  const createdAt = new Date().toISOString()
  const existingActiveNumbers = getActiveNumbersByInstance(instanceName)
  const skipped = []
  const seenInRequest = new Set()
  const jobIds = []

  const baseStartAtMs = Number.isFinite(Number(startAtMs)) ? Number(startAtMs) : Date.now()
  let cumulativeDelayMinutes = 0

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
    cumulativeDelayMinutes += delayMinutes
    const scheduledAt = baseStartAtMs + cumulativeDelayMinutes * 60_000
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
      delayMinutes: cumulativeDelayMinutes,
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
    const { jobIds, skipped, createdAt } = createJobsForInstance({ instanceName, items, minMinutes, maxMinutes, startAtMs: Date.now() })

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

    const lastScheduledAt = (batch.jobIds || [])
      .map((id) => disparosJobs.get(id))
      .filter(Boolean)
      .map((j) => Number(j.scheduledAt || 0))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((acc, n) => Math.max(acc, n), 0)

    const startAtMs = Math.max(Date.now(), lastScheduledAt || 0)
    const { jobIds, skipped } = createJobsForInstance({ instanceName, items, minMinutes, maxMinutes, startAtMs })

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

    return res.json({ ok: true, batch: summarizeBatch(updated), appendedJobIds: jobIds, skipped })
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

app.get('/api/disparos/stats', (req, res) => {
  const instanceName = String(req.query.instanceName || '').trim()
  const jobs = Array.from(disparosJobs.values())
    .filter((j) => {
      if (!instanceName) return true
      return j?.instanceName === instanceName
    })
    .map((j) => {
      const { timeoutId, ...safe } = j || {}
      return safe
    })

  const stats = getDisparosStatsForJobs(jobs)
  return res.json({ instanceName: instanceName || null, stats })
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

// POST /api/admin/createUser
// Cria um usuário Auth + row em profiles (para cadastro de profissionais pela clínica)
// Body: { email, password, fullName, role, adminProfileId }
app.post('/api/admin/createUser', async (req, res) => {
  try {
    const token = getBearerToken(req)
    if (!token) return res.status(401).json({ error: 'Token não fornecido' })

    // Verificar se quem está chamando é admin/clinica
    const authUser = await supabaseAuthUser(token)
    if (!authUser?.id) return res.status(401).json({ error: 'Token inválido' })

    const callerProfiles = await supabaseRest(`profiles?select=id,role,admin_profile_id&id=eq.${authUser.id}`, { method: 'GET' })
    const callerProfile = Array.isArray(callerProfiles) ? callerProfiles[0] : callerProfiles
    if (!callerProfile) return res.status(403).json({ error: 'Perfil não encontrado' })

    const callerRole = callerProfile.role
    if (callerRole !== 'clinica' && callerRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar usuários' })
    }

    const clinicAdminId = callerProfile.admin_profile_id || callerProfile.id

    // Buscar perfil completo da clínica para copiar campos
    const clinicProfiles = await supabaseRest(
      `profiles?select=instancia_whatsapp,status,plano_ativo,plano_expira_em,whatsapp_status,whatsapp_instance_id,whatsapp_connected_at,total_tokens,tokens_count&id=eq.${clinicAdminId}`,
      { method: 'GET' }
    )
    const clinicProfile = Array.isArray(clinicProfiles) ? clinicProfiles[0] : clinicProfiles

    const { email, password, fullName, role } = req.body || {}
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'email, password, fullName e role são obrigatórios' })
    }

    const allowedRoles = ['admin', 'profissional', 'recepcao', 'gestor']
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Role inválida. Permitidas: ${allowedRoles.join(', ')}` })
    }

    // 1. Criar usuário no Supabase Auth (service role — não muda sessão do admin)
    // app_metadata vai no JWT → app_admin_profile_id() do RLS funciona para o profissional
    const authRes = await axios.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
      app_metadata: { admin_profile_id: clinicAdminId },
    }, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
      validateStatus: () => true,
    })

    if (authRes.status >= 300) {
      const errMsg = authRes.data?.msg || authRes.data?.message || authRes.data?.error || JSON.stringify(authRes.data)
      console.error('[createUser] Auth error:', errMsg)
      return res.status(400).json({ error: `Erro ao criar usuário: ${errMsg}` })
    }

    const newUserId = authRes.data?.id
    if (!newUserId) {
      return res.status(500).json({ error: 'Usuário criado mas ID não retornado' })
    }

    // 2. Criar row em profiles copiando campos da clínica
    const profileData = {
      id: newUserId,
      email,
      full_name: fullName,
      role,
      admin_profile_id: clinicAdminId,
      status: clinicProfile?.status || 'ativo',
      instancia_whatsapp: clinicProfile?.instancia_whatsapp || null,
      plano_ativo: clinicProfile?.plano_ativo || null,
      plano_expira_em: clinicProfile?.plano_expira_em || null,
      whatsapp_status: clinicProfile?.whatsapp_status || null,
      whatsapp_instance_id: clinicProfile?.whatsapp_instance_id || null,
      whatsapp_connected_at: clinicProfile?.whatsapp_connected_at || null,
      total_tokens: clinicProfile?.total_tokens || null,
      tokens_count: clinicProfile?.tokens_count || null,
    }

    try {
      await supabaseRest('profiles', {
        method: 'POST',
        data: profileData,
        params: { on_conflict: 'id' },
      })
    } catch (profileErr) {
      console.error('[createUser] Profile upsert error:', profileErr?.message)
      // Profile pode já existir via trigger — tentar update
      try {
        const { id, ...patchData } = profileData
        await supabaseRest(`profiles?id=eq.${newUserId}`, {
          method: 'PATCH',
          data: patchData,
        })
      } catch (patchErr) {
        console.error('[createUser] Profile patch error:', patchErr?.message)
      }
    }

    console.log(`[createUser] Usuário ${email} criado com role=${role} para clínica ${clinicAdminId}`)

    res.json({ ok: true, userId: newUserId, clinicAdminId })
  } catch (err) {
    console.error('[createUser] Error:', err?.message || err)
    res.status(500).json({ error: err?.message || 'Erro interno' })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir frontend (Vite build) no mesmo host/porta.
// - Rotas /api/* continuam funcionando normalmente.
// - Qualquer outra rota retorna o index.html para suportar SPA (React Router).
app.use(express.static(distDir))

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// Iniciar servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
  console.log(`WebSocket rodando em /whatsapp-web`);
  console.log('Servidor WhatsApp Web pronto. Aguardando conexões...');
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
