import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileUploadButton } from '@/components/ui/file-upload-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  MessageCircle, 
  QrCode, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2,
  RefreshCw,
  AlertTriangle,
  Send
} from 'lucide-react'
import { 
  useWhatsAppInstance, 
  useCreateWhatsAppInstance, 
  useWhatsAppStatus,
  useWhatsAppQRCode,
  useDeleteWhatsAppInstance
} from '@/hooks/useWhatsApp'
import { useProfile } from '@/hooks/useConfiguracoes'
import { useClinicaIAConfig, useUpdateClinicaIAConfig } from '@/hooks/useClinicaIAConfig'
import { QRCodeDisplay } from '@/components/whatsapp/QRCodeDisplay'
import { usePacientes } from '@/hooks/usePacientes'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { uploadMidia } from '@/services/api/storage-midias'
import { supabase } from '@/lib/supabase'
import { useUpdatePaciente } from '@/hooks/usePacientes'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function getWhatsAppServerBaseUrl() {
  const raw = String((import.meta as any)?.env?.VITE_WHATSAPP_SERVER_URL ?? '').trim()
  return raw ? raw.replace(/\/+$/, '') : ''
}

function formatConnectionName(raw?: string | null) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ')
}

function formatConnectedNumber(raw?: string | null) {
  const stripped = String(raw || '').replace(/@s\.whatsapp\.net$/i, '').trim()
  const digits = stripped.replace(/\D/g, '')
  if (!digits) return ''

  // Brasil: +55 (DD) 9XXXX-XXXX
  if (digits.length === 13 && digits.startsWith('55')) {
    const cc = digits.slice(0, 2)
    const ddd = digits.slice(2, 4)
    const part1 = digits.slice(4, 9)
    const part2 = digits.slice(9)
    return `+${cc} (${ddd}) ${part1}-${part2}`
  }

  if (digits.length === 12 && digits.startsWith('55')) {
    const cc = digits.slice(0, 2)
    const ddd = digits.slice(2, 4)
    const part1 = digits.slice(4, 8)
    const part2 = digits.slice(8)
    return `+${cc} (${ddd}) ${part1}-${part2}`
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2)
    const part1 = digits.slice(2, 7)
    const part2 = digits.slice(7)
    return `(${ddd}) ${part1}-${part2}`
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2)
    const part1 = digits.slice(2, 6)
    const part2 = digits.slice(6)
    return `(${ddd}) ${part1}-${part2}`
  }

  return digits
}

export default function WhatsAppPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [instanceName, setInstanceName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'status' | 'disparos'>('status')

  const [disparosType, setDisparosType] = useState<'text' | 'media'>('text')
  const [disparosMessage, setDisparosMessage] = useState('')
  const [disparosCaption, setDisparosCaption] = useState('')
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const [mediaBase64, setMediaBase64] = useState<string | null>(null)
  const [mediaMimeType, setMediaMimeType] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [mediaFileName, setMediaFileName] = useState<string | null>(null)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [selectedPacienteIds, setSelectedPacienteIds] = useState<Record<string, boolean>>({})
  const [disparosBatchId, setDisparosBatchId] = useState<string | null>(null)
  const [disparosBatchData, setDisparosBatchData] = useState<any>(null)
  const [disparosBatches, setDisparosBatches] = useState<any[]>([])
  const [activeDisparoNumbers, setActiveDisparoNumbers] = useState<Set<string>>(new Set())
  const [isEnqueueing, setIsEnqueueing] = useState(false)
  const [nowTick, setNowTick] = useState(Date.now())
  const [disparosKanbanFilters, setDisparosKanbanFilters] = useState<string[]>([])

  const [disparosAllowEmojis, setDisparosAllowEmojis] = useState(true)
  const [disparosTone, setDisparosTone] = useState<'Casual' | 'Formal' | 'Profissional' | 'Extrovertido'>('Profissional')
  const [disparosMaxChars, setDisparosMaxChars] = useState<string>('')

  const [editPacienteOpen, setEditPacienteOpen] = useState(false)
  const [editingPaciente, setEditingPaciente] = useState<any | null>(null)
  const [editNomeCompleto, setEditNomeCompleto] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')

  const { data: instance, isLoading: instanceLoading } = useWhatsAppInstance()
  const { data: profile } = useProfile()
  const { data: clinicaIAConfig } = useClinicaIAConfig()
  const updateClinicaIAConfig = useUpdateClinicaIAConfig()

  const updatePaciente = useUpdatePaciente()

  const { data: pacientes, isLoading: pacientesLoading } = usePacientes({ limit: 1000 })
  
  // Determinar se deve fazer polling baseado no status da instância
  const shouldPoll = Boolean(instance?.instanceName && (!instance.status || instance.status !== 'open'))
  
  const { data: status, isLoading: statusLoading } = useWhatsAppStatus(instance?.instanceName || undefined, shouldPoll)
  const { data: qrCode, isLoading: qrLoading } = useWhatsAppQRCode(instance?.instanceName || undefined, status?.status)

  useEffect(() => {
    if (searchParams.get('autoConfigure') !== '1') return
    setShowCreateForm(true)

    const next = new URLSearchParams(searchParams)
    next.delete('autoConfigure')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const section = String(searchParams.get('section') || '').trim().toLowerCase()
    if (section === 'disparos') setActiveSection('disparos')
    else setActiveSection('status')
  }, [searchParams])

  useEffect(() => {
    const saved = (clinicaIAConfig as any)?.extra?.disparos_ai_options
    if (!saved) return

    if (typeof saved.allowEmojis === 'boolean') {
      setDisparosAllowEmojis(saved.allowEmojis)
    }
    if (typeof saved.tone === 'string' && ['Casual', 'Formal', 'Profissional', 'Extrovertido'].includes(saved.tone)) {
      setDisparosTone(saved.tone)
    }
    if (typeof saved.maxChars === 'number' && Number.isFinite(saved.maxChars) && saved.maxChars > 0) {
      setDisparosMaxChars(String(Math.min(500, Math.floor(saved.maxChars))))
    } else {
      setDisparosMaxChars('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaIAConfig?.id])
  
  const createInstance = useCreateWhatsAppInstance()
  const deleteInstance = useDeleteWhatsAppInstance()

  // Função para gerar nome da instância baseado no nome da empresa
  const generateInstanceName = (companyName: string) => {
    return companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens no início e fim
  }

  const kanbanOptions = [
    { value: 'novos', label: 'Novos' },
    { value: 'agendado', label: 'Agendado' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'arquivado', label: 'Arquivado' },
  ]

  const kanbanFilterLabel = () => {
    if (disparosKanbanFilters.length === 0) return 'Todos os status'
    const labels = kanbanOptions
      .filter((o) => disparosKanbanFilters.includes(o.value))
      .map((o) => o.label)
    if (labels.length <= 2) return labels.join(', ')
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }

  const statusToPtBR = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return 'agendado'
      case 'running':
        return 'enviando'
      case 'sent':
        return 'enviado'
      case 'failed':
        return 'falhou'
      case 'canceled':
        return 'cancelado'
      default:
        return status || ''
    }
  }

  // Atualizar nome da instância quando o perfil carregar
  useEffect(() => {
    if (profile?.full_name && !instanceName) {
      const generatedName = generateInstanceName(profile.full_name)
      setInstanceName(generatedName)
    }
  }, [profile?.full_name, instanceName])

  const handleCreateInstance = async () => {
    if (!instanceName.trim() || !phoneNumber.trim()) return
    
    try {
      await createInstance.mutateAsync({ 
        instanceName: instanceName.trim(), 
        number: phoneNumber.trim() 
      })
      setInstanceName('')
      setPhoneNumber('')
      setShowCreateForm(false)
    } catch (error) {
      // Error handled by hook
    }
  }


  const handleDelete = async () => {
    if (!instance?.instanceName) return
    
    try {
      await deleteInstance.mutateAsync(instance.instanceName)
      // Forçar reset do estado local após delete bem-sucedido
      setShowCreateForm(false)
      setInstanceName('')
      setPhoneNumber('')
      setDeleteDialogOpen(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const getStatusBadge = (currentStatus?: string) => {
    switch (currentStatus) {
      case 'open':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Conectando</Badge>
      case 'close':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Desconectado</Badge>
      default:
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Verificando...</Badge>
    }
  }

  const shouldShowQRCode = instance?.instanceName && (status?.status === 'connecting' || status?.status === 'close' || !status?.status)

  const isConnected = Boolean(instance?.instanceName && status?.status === 'open')

  const localStorageBatchKey = instance?.instanceName ? `disparos:lastBatch:${instance.instanceName}` : null

  const resetDisparosSession = () => {
    setDisparosBatchId(null)
    setDisparosBatchData(null)
    setSelectedPacienteIds({})
    if (localStorageBatchKey) window.localStorage.removeItem(localStorageBatchKey)
  }

  // Build a valid remoteJid from patient data: use remotejid if available, otherwise format whatsapp/telefone field
  const formatPhoneToRemoteJid = (phone: string): string => {
    if (!phone) return ''
    // Remove non-digit characters
    let digits = phone.replace(/\D/g, '')
    if (!digits) return ''
    // Add country code (55 for Brazil) if not already present
    if (digits.length <= 11) {
      digits = '55' + digits
    }
    return digits + '@s.whatsapp.net'
  }

  const getRemoteJid = (p: any): string => {
    const existing = String(p?.remotejid ?? p?.remoteJid ?? '').trim()
    if (existing) return existing

    // Fallback: build from whatsapp field
    const whatsapp = String(p?.whatsapp ?? '').trim()
    if (whatsapp) return formatPhoneToRemoteJid(whatsapp)

    // Fallback: build from telefone field
    const telefone = String(p?.telefone ?? '').trim()
    if (telefone) return formatPhoneToRemoteJid(telefone)

    return ''
  }

  // Display formatter: strip @s.whatsapp.net and country code, show clean phone number
  const formatWhatsAppDisplay = (remoteJid: string): string => {
    if (!remoteJid) return ''
    // Remove @s.whatsapp.net or @lid suffix
    let number = remoteJid.replace(/@.*$/, '')
    // Remove country code (55) for display if present
    if (number.startsWith('55') && number.length >= 12) {
      number = number.slice(2)
    }
    // Format as (XX) XXXXX-XXXX or (XX) XXXX-XXXX
    if (number.length === 11) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`
    } else if (number.length === 10) {
      return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`
    }
    return number
  }

  const pacientesComRemoteJid = (pacientes || []).filter((p: any) => {
    return Boolean(getRemoteJid(p))
  })

  const passesKanbanFilter = (p: any) => {
    const kanban = String((p as any)?.status_detalhado ?? '').trim().toLowerCase()
    return disparosKanbanFilters.length === 0 ? true : disparosKanbanFilters.includes(kanban)
  }

  const hiddenByPendingCount = pacientesComRemoteJid.filter((p: any) => {
    const remotejid = getRemoteJid(p)
    return remotejid && activeDisparoNumbers.has(remotejid)
  }).length

  const hiddenByKanbanCount = pacientesComRemoteJid.filter((p: any) => {
    const remotejid = getRemoteJid(p)
    if (!remotejid) return false
    if (activeDisparoNumbers.has(remotejid)) return false
    return !passesKanbanFilter(p)
  }).length

  const pacientesDisponiveisParaDisparo = pacientesComRemoteJid.filter((p: any) => {
    const remotejid = getRemoteJid(p)
    return remotejid && !activeDisparoNumbers.has(remotejid) && passesKanbanFilter(p)
  })

  const remoteJidToWhatsApp = new Map<string, string>()
  const remoteJidToPacienteNome = new Map<string, string>()
  pacientesComRemoteJid.forEach((p: any) => {
    const remotejid = getRemoteJid(p)
    const nome = String((p as any)?.nome_completo ?? '').trim()
    if (remotejid) {
      remoteJidToWhatsApp.set(remotejid, formatWhatsAppDisplay(remotejid))
      remoteJidToPacienteNome.set(remotejid, nome)
    }
  })

  const selectedCount = Object.values(selectedPacienteIds).filter(Boolean).length

  const toggleSelectAllPacientes = () => {
    const allSelected =
      pacientesDisponiveisParaDisparo.length > 0 &&
      pacientesDisponiveisParaDisparo.every((p: any) => selectedPacienteIds[p.id])
    if (allSelected) {
      setSelectedPacienteIds({})
      return
    }
    const next: Record<string, boolean> = {}
    pacientesDisponiveisParaDisparo.forEach((p: any) => {
      next[p.id] = true
    })
    setSelectedPacienteIds(next)
  }

  const refreshDisparosMeta = async () => {
    if (!instance?.instanceName) return

    try {
      const baseUrl = getWhatsAppServerBaseUrl()
      const batchesUrl = baseUrl
        ? `${baseUrl}/api/disparos?instanceName=${encodeURIComponent(instance.instanceName)}`
        : `/api/disparos?instanceName=${encodeURIComponent(instance.instanceName)}`
      const activeUrl = baseUrl
        ? `${baseUrl}/api/disparos/activeNumbers?instanceName=${encodeURIComponent(instance.instanceName)}`
        : `/api/disparos/activeNumbers?instanceName=${encodeURIComponent(instance.instanceName)}`

      const [batchesRes, activeRes] = await Promise.all([
        fetch(batchesUrl),
        fetch(activeUrl),
      ])

      const batchesRaw = await batchesRes.text()
      const activeRaw = await activeRes.text()

      const batchesJson = batchesRaw ? JSON.parse(batchesRaw) : null
      const activeJson = activeRaw ? JSON.parse(activeRaw) : null

      setDisparosBatches(Array.isArray(batchesJson?.batches) ? batchesJson.batches : [])
      setActiveDisparoNumbers(new Set(Array.isArray(activeJson?.activeNumbers) ? activeJson.activeNumbers : []))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isConnected || activeSection !== 'disparos') return
    void refreshDisparosMeta()
    const t = setInterval(() => {
      void refreshDisparosMeta()
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, activeSection, instance?.instanceName])

  useEffect(() => {
    if (!isConnected || activeSection !== 'disparos') return
    if (!localStorageBatchKey) return
    if (disparosBatchId) return

    const saved = window.localStorage.getItem(localStorageBatchKey)
    if (saved) {
      setDisparosBatchId(saved)
    }
  }, [isConnected, activeSection, localStorageBatchKey, disparosBatchId])

  useEffect(() => {
    if (!mediaPreviewUrl) return
    return () => {
      try {
        URL.revokeObjectURL(mediaPreviewUrl)
      } catch {
        // ignore
      }
    }
  }, [mediaPreviewUrl])

  useEffect(() => {
    if (!editPacienteOpen) return
    if (!editingPaciente) return
    setEditNomeCompleto(String((editingPaciente as any)?.nome_completo ?? '').trim())
    setEditWhatsapp(String((editingPaciente as any)?.whatsapp ?? '').trim())
  }, [editPacienteOpen, editingPaciente])

  const openEditPaciente = (p: any) => {
    setEditingPaciente(p)
    setEditPacienteOpen(true)
  }

  const savePacienteEdits = async () => {
    const p = editingPaciente
    if (!p?.id) return
    const nome = editNomeCompleto.trim()
    if (!nome) {
      toast.error('Nome completo é obrigatório')
      return
    }
    const whatsapp = editWhatsapp.trim() || null

    await updatePaciente.mutateAsync({
      id: String(p.id),
      data: {
        nome_completo: nome,
        whatsapp,
      },
    })

    setEditPacienteOpen(false)
    setEditingPaciente(null)
  }

  const handleMediaFileChange = async (file: File | null) => {
    setMediaBase64(null)
    setMediaMimeType(null)
    setMediaType(null)
    setMediaFileName(null)
    setMediaUrl(null)

    if (!file) {
      setMediaPreviewUrl(null)
      return
    }

    const isJfif =
      String(file.type || '').toLowerCase() === 'image/jfif' ||
      String(file.name || '').toLowerCase().endsWith('.jfif')
    if (isJfif) {
      setMediaPreviewUrl(null)
      toast.error('Arquivo .JFIF não é suportado pela Evolution. Remova/Converta para JPG ou PNG para enviar mídia.')
      return
    }

    const nextPreview = URL.createObjectURL(file)
    setMediaPreviewUrl(nextPreview)
    setMediaMimeType(file.type)
    setMediaFileName(file.name)

    if (file.type.startsWith('image/')) setMediaType('image')
    else if (file.type.startsWith('video/')) setMediaType('video')

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
      reader.onload = () => resolve(String(reader.result || ''))
      reader.readAsDataURL(file)
    })

    const stripped = base64.includes('base64,') ? base64.split('base64,')[1] : base64
    setMediaBase64(stripped)

    try {
      if (file.type.startsWith('image/')) {
        const uploaded = await uploadMidia({ bucket: 'clinica-midias', file, prefix: 'disparos' })
        const { data } = supabase.storage.from(uploaded.bucket).getPublicUrl(uploaded.path)
        setMediaUrl(data.publicUrl || null)
      }
    } catch (e: any) {
      setMediaUrl(null)
      toast.message('Não foi possível gerar URL pública da imagem para análise. O envio continuará sem análise de imagem.')
    }
  }

  useEffect(() => {
    if (!disparosBatchId) return
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [disparosBatchId])

  const formatRemaining = (ms: number) => {
    if (ms <= 0) return '0s'
    const totalSeconds = Math.floor(ms / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    if (m <= 0) return `${s}s`
    return `${m}m ${s}s`
  }

  const calcProgress = (job: any) => {
    const createdAt = job?.createdAt ? new Date(job.createdAt).getTime() : null
    const scheduledAt = typeof job?.scheduledAt === 'number' ? job.scheduledAt : null
    if (!createdAt || !scheduledAt || scheduledAt <= createdAt) return 0
    const pct = ((nowTick - createdAt) / (scheduledAt - createdAt)) * 100
    return Math.max(0, Math.min(100, pct))
  }

  const enqueueDisparos = async () => {
    if (!instance?.instanceName) return
    if (!isConnected) return
    if (disparosType === 'text' && !disparosMessage.trim()) return
    if (disparosType === 'media' && !disparosCaption.trim()) return
    if (disparosType === 'media' && (!mediaBase64 || !mediaType || !mediaMimeType || !mediaFileName)) {
      toast.error('Selecione uma mídia (imagem ou vídeo) para enviar')
      return
    }

    const selectedPacientes = pacientesDisponiveisParaDisparo.filter((p: any) => selectedPacienteIds[p.id])
    if (selectedPacientes.length === 0) return

    const maxCharsNum = disparosMaxChars.trim() ? Number(disparosMaxChars) : null
    const aiOptions = {
      allowEmojis: Boolean(disparosAllowEmojis),
      tone: disparosTone,
      maxChars:
        typeof maxCharsNum === 'number' && Number.isFinite(maxCharsNum) && maxCharsNum > 0
          ? Math.min(500, Math.floor(maxCharsNum))
          : null,
    }

    setIsEnqueueing(true)
    try {
      const baseUrl = getWhatsAppServerBaseUrl()
      const items = selectedPacientes
        .map((p: any) => {
          const number = getRemoteJid(p)
          const sendNumber = number.replace(/@.*$/, '')
          const patientName = String(
            (p as any)?.nome_completo ?? (p as any)?.nome ?? (p as any)?.name ?? (p as any)?.full_name ?? ''
          ).trim()
          return {
            number,
            sendNumber,
            patientName,
            text: (disparosType === 'media' ? disparosCaption.trim() : disparosMessage.trim()),
            media:
              disparosType === 'media'
                ? {
                    mediatype: mediaType,
                    mimetype: mediaMimeType,
                    media: mediaBase64,
                    fileName: mediaFileName,
                    url: mediaUrl,
                  }
                : undefined,
          }
        })
        .filter((it: any) => Boolean(it.number && it.text))

      const endpointPath = disparosBatchId ? `/api/disparos/${disparosBatchId}/append` : '/api/disparos/enqueue'
      const endpoint = baseUrl ? `${baseUrl}${endpointPath}` : endpointPath

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: instance.instanceName,
          minMinutes: 1,
          maxMinutes: 1,
          items,
          aiOptions,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Endpoint de disparos não encontrado (404). Reinicie o servidor WhatsApp (node whatsapp-server.js).')
        }
        throw new Error(json?.error || raw || 'Erro ao iniciar disparos')
      }

      const newBatchId = json?.batch?.id || disparosBatchId || null
      setDisparosBatchId(newBatchId)
      setDisparosBatchData({ batch: json?.batch, jobs: [] })
      if (newBatchId && localStorageBatchKey) {
        window.localStorage.setItem(localStorageBatchKey, newBatchId)
      }
      if (Array.isArray(json?.skipped) && json.skipped.length > 0) {
        toast.message(`Alguns números foram ignorados: ${json.skipped.length}`)
      }
      toast.success(disparosBatchId ? 'Destinatários adicionados à sessão!' : 'Fila de disparos iniciada!')

      // Atualizar metadados (batches/números pendentes) para refletir imediatamente
      void refreshDisparosMeta()
    } finally {
      setIsEnqueueing(false)
    }
  }

  const cancelDisparos = async () => {
    if (!disparosBatchId) return
    const baseUrl = getWhatsAppServerBaseUrl()
    const url = baseUrl ? `${baseUrl}/api/disparos/${disparosBatchId}/cancel` : `/api/disparos/${disparosBatchId}/cancel`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const raw = await res.text()
    let json: any = null
    try {
      json = raw ? JSON.parse(raw) : null
    } catch {
      json = null
    }
    if (!res.ok) {
      throw new Error(json?.error || raw || 'Erro ao cancelar disparos')
    }
    toast.success('Fila cancelada!')

    // Atualizar metadados para liberar números
    void refreshDisparosMeta()
  }

  useEffect(() => {
    if (!disparosBatchId) return
    let cancelled = false

    async function poll() {
      try {
        const baseUrl = getWhatsAppServerBaseUrl()
        const url = baseUrl ? `${baseUrl}/api/disparos/${disparosBatchId}` : `/api/disparos/${disparosBatchId}`
        const res = await fetch(url)
        if (res.status === 404) {
          if (!cancelled) {
            toast.message('Sessão de disparos não encontrada no servidor. A fila pode ter sido reiniciada. Criando nova sessão.')
            resetDisparosSession()
          }
          return
        }

        const raw = await res.text()
        let json: any = null
        try {
          json = raw ? JSON.parse(raw) : null
        } catch {
          json = null
        }

        if (!res.ok) {
          return
        }

        if (!cancelled) setDisparosBatchData(json)
      } catch {
        // ignore
      }
    

    poll()
    const t = setInterval(poll, 3000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [disparosBatchId])
  
  // Debug logs (removido para reduzir spam no console)
  // console.log('Debug WhatsApp Page:', {
  //   instanceName: instance?.instanceName,
  //   status: status?.status,
  //   shouldShowQRCode,
  //   qrCode: qrCode?.base64 ? 'QR code received' : 'No QR code',
  //   qrLoading
  // })

  if (instanceLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" />
            WhatsApp/Automação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e gerencie a integração do WhatsApp com automação inteligente.
          </p>
        </div>
      </div>

      {!instance?.instanceName ? (
        // Nenhuma instância configurada
        <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Configurar WhatsApp</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Configure uma instância do WhatsApp Business para sua empresa
          </p>
          <div className="space-y-4">
            {!showCreateForm ? (
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma instância configurada</h3>
                <p className="text-muted-foreground mb-4">
                  Configure uma instância do WhatsApp para começar a receber e enviar mensagens
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  Configurar WhatsApp
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instanceName">Nome da Conexão</Label>
                  <Input
                    id="instanceName"
                    placeholder="Nome gerado automaticamente"
                    value={instanceName}
                    readOnly
                    disabled
                    className="mt-1 bg-muted"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Nome gerado automaticamente baseado no nome da empresa configurado no perfil.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="phoneNumber">Número do WhatsApp</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="Ex: 5511999999999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Digite o número com código do país (ex: 55 para Brasil). Apenas números.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateInstance}
                    disabled={!instanceName.trim() || !phoneNumber.trim() || createInstance.isPending}
                  >
                    {createInstance.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Instância'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false)
                      setInstanceName('')
                      setPhoneNumber('')
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeSection === 'disparos' && isConnected ? (
        <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Disparos</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            A mensagem será sempre variada automaticamente pela IA antes do envio. Os envios são agendados em intervalos aleatórios entre 5 e 30 minutos.
          </p>
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Sessão</div>
                <Select
                  value={disparosBatchId || 'new'}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      resetDisparosSession()
                      return
                    }

                    setDisparosBatchId(value)
                    setDisparosBatchData(null)
                    setSelectedPacienteIds({})
                    if (localStorageBatchKey) {
                      window.localStorage.setItem(localStorageBatchKey, value)
                    }
                  }}
                >
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nova sessão</SelectItem>
                    {disparosBatches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {new Date(b.createdAt).toLocaleString('pt-BR')} ({b.total || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDisparosSession()
                }}
              >
                Nova sessão
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={disparosType === 'text' ? 'default' : 'outline'}
                onClick={() => setDisparosType('text')}
              >
                Apenas texto
              </Button>
              <Button
                type="button"
                size="sm"
                variant={disparosType === 'media' ? 'default' : 'outline'}
                onClick={() => setDisparosType('media')}
              >
                Com mídia
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disparos-message">{disparosType === 'media' ? 'Legenda base' : 'Mensagem base'}</Label>
              <Textarea
                id="disparos-message"
                value={disparosType === 'media' ? disparosCaption : disparosMessage}
                onChange={(e) => (disparosType === 'media' ? setDisparosCaption(e.target.value) : setDisparosMessage(e.target.value))}
                placeholder={disparosType === 'media' ? 'Digite a legenda base...' : 'Digite a mensagem base...'}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Você escreve o texto base. O sistema vai gerar uma variação obrigatória antes de cada envio.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Configuração da IA</div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updateClinicaIAConfig.isPending}
                  onClick={async () => {
                    const maxCharsNum = disparosMaxChars.trim() ? Number(disparosMaxChars) : null
                    const payload = {
                      allowEmojis: Boolean(disparosAllowEmojis),
                      tone: disparosTone,
                      maxChars:
                        typeof maxCharsNum === 'number' && Number.isFinite(maxCharsNum) && maxCharsNum > 0
                          ? Math.min(500, Math.floor(maxCharsNum))
                          : null,
                    }

                    const currentExtra = ((clinicaIAConfig as any)?.extra as Record<string, any>) || {}
                    await updateClinicaIAConfig.mutateAsync({
                      extra: {
                        ...currentExtra,
                        disparos_ai_options: payload,
                      },
                    } as any)
                  }}
                >
                  Salvar preferências
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm">Permitir emojis</div>
                  <div className="text-xs text-muted-foreground">
                    Se desativado, a IA não vai usar emojis na variação.
                  </div>
                </div>
                <Switch checked={disparosAllowEmojis} onCheckedChange={setDisparosAllowEmojis} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tom de fala</Label>
                  <Select value={disparosTone} onValueChange={(v) => setDisparosTone(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Formal">Formal</SelectItem>
                      <SelectItem value="Profissional">Profissional</SelectItem>
                      <SelectItem value="Extrovertido">Extrovertido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limite de caracteres (opcional)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={500}
                    value={disparosMaxChars}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) {
                        setDisparosMaxChars('')
                        return
                      }
                      const n = Number(v)
                      if (!Number.isFinite(n)) return
                      setDisparosMaxChars(String(Math.min(500, Math.max(1, Math.floor(n)))))
                    }}
                    placeholder="Ex: 280"
                  />
                  <div className="text-xs text-muted-foreground">Máximo: 500 caracteres</div>
                </div>
              </div>
            </div>

            {disparosType === 'media' && (
              <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
                <div>
                  <Label htmlFor="disparos-media">Mídia (imagem ou vídeo)</Label>
                  <FileUploadButton
                    label="Selecionar mídia"
                    accept="image/*,video/*"
                    onFiles={(files) => {
                      const f = files[0] || null
                      void handleMediaFileChange(f)
                    }}
                  />
                </div>

                {mediaPreviewUrl && mediaType === 'image' && (
                  <div className="rounded-md border border-border/60 p-3 bg-muted/10">
                    <img src={mediaPreviewUrl} alt="Pré-visualização" className="max-h-[260px] w-auto rounded" />
                  </div>
                )}
                {mediaPreviewUrl && mediaType === 'video' && (
                  <div className="rounded-md border border-border/60 p-3 bg-muted/10">
                    <video src={mediaPreviewUrl} controls className="max-h-[260px] w-full rounded" />
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Destinatários</div>
                  <div className="text-xs text-muted-foreground">
                    Selecionados: <span className="font-medium">{selectedCount}</span> / {pacientesDisponiveisParaDisparo.length}
                  </div>
                  {hiddenByPendingCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Ocultos por já estarem com disparo pendente: <span className="font-medium">{hiddenByPendingCount}</span>
                    </div>
                  )}
                  {hiddenByKanbanCount > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Ocultos pelo filtro de status: <span className="font-medium">{hiddenByKanbanCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        {kanbanFilterLabel()}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Status do Kanban</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={disparosKanbanFilters.length === 0}
                        onCheckedChange={() => {
                          setSelectedPacienteIds({})
                          setDisparosKanbanFilters([])
                        }}
                      >
                        Todos os status
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {kanbanOptions.map((opt) => (
                        <DropdownMenuCheckboxItem
                          key={opt.value}
                          checked={disparosKanbanFilters.includes(opt.value)}
                          onCheckedChange={(checked) => {
                            setSelectedPacienteIds({})
                            setDisparosKanbanFilters((prev) => {
                              const next = new Set(prev)
                              if (checked) next.add(opt.value)
                              else next.delete(opt.value)
                              return Array.from(next)
                            })
                          }}
                        >
                          {opt.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllPacientes}>
                    {pacientesDisponiveisParaDisparo.length > 0 &&
                    pacientesDisponiveisParaDisparo.every((p: any) => selectedPacienteIds[p.id])
                      ? 'Desmarcar todos'
                      : 'Selecionar todos'}
                  </Button>
                </div>
              </div>

              <div className="max-h-[320px] overflow-auto rounded-md border border-border/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium w-10"> </th>
                      <th className="px-3 py-2 text-left font-medium">Paciente</th>
                      <th className="px-3 py-2 text-left font-medium">WhatsApp</th>
                      <th className="px-3 py-2 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pacientesDisponiveisParaDisparo.map((p: any) => {
                      const remotejid = getRemoteJid(p)
                      const display = formatWhatsAppDisplay(remotejid)
                      const checked = Boolean(selectedPacienteIds[p.id])
                      return (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedPacienteIds((prev) => ({ ...prev, [p.id]: e.target.checked }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium text-foreground">{p.nome_completo}</div>
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">{display}</td>
                          <td className="px-3 py-2 align-top text-right">
                            <Button type="button" size="sm" variant="outline" onClick={() => openEditPaciente(p)}>
                              Editar
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!pacientesLoading && (pacientes || []).length > 0 && pacientesComRemoteJid.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  Nenhum paciente com <code>remotejid</code> encontrado. Total de pacientes carregados: {(pacientes || []).length}.
                </div>
              )}

              {pacientesLoading && (
                <div className="text-xs text-muted-foreground">Carregando pacientes...</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={enqueueDisparos}
                disabled={
                  isEnqueueing ||
                  selectedCount === 0 ||
                  selectedCount > 30 ||
                  (disparosType === 'text' ? !disparosMessage.trim() : !disparosCaption.trim()) ||
                  (disparosType === 'media' && (!mediaBase64 || !mediaType || !mediaMimeType || !mediaFileName))
                }
                className="gap-2"
              >
                {isEnqueueing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {disparosBatchId ? 'Adicionar pacientes' : 'Iniciar disparos'}
              </Button>
              {disparosBatchId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await cancelDisparos()
                  }}
                >
                  Cancelar fila
                </Button>
              )}
            </div>

            {disparosBatchData?.batch && (
              <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Fila atual</div>
                  </div>
                </div>

                {(() => {
                  const jobs = disparosBatchData?.jobs || []
                  const counts = jobs.reduce(
                    (acc: any, j: any) => {
                      acc[j.status] = (acc[j.status] || 0) + 1
                      return acc
                    },
                    { scheduled: 0, running: 0, sent: 0, failed: 0, canceled: 0 }
                  )
                  return (
                    <div className="grid gap-2 sm:grid-cols-5">
                      <div className="rounded-md border border-border/60 p-2">
                        <div className="text-xs text-muted-foreground">Agendados</div>
                        <div className="text-lg font-semibold">{counts.scheduled || 0}</div>
                      </div>
                      <div className="rounded-md border border-border/60 p-2">
                        <div className="text-xs text-muted-foreground">Enviando</div>
                        <div className="text-lg font-semibold">{counts.running || 0}</div>
                      </div>
                      <div className="rounded-md border border-border/60 p-2">
                        <div className="text-xs text-muted-foreground">Enviados</div>
                        <div className="text-lg font-semibold">{counts.sent || 0}</div>
                      </div>
                      <div className="rounded-md border border-border/60 p-2">
                        <div className="text-xs text-muted-foreground">Falhas</div>
                        <div className="text-lg font-semibold">{counts.failed || 0}</div>
                      </div>
                      <div className="rounded-md border border-border/60 p-2">
                        <div className="text-xs text-muted-foreground">Cancelados</div>
                        <div className="text-lg font-semibold">{counts.canceled || 0}</div>
                      </div>
                    </div>
                  )
                })()}

                <div className="max-h-[320px] overflow-auto rounded-md border border-border/60">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Paciente</th>
                        <th className="px-3 py-2 text-left font-medium">Número</th>
                        <th className="px-3 py-2 text-left font-medium">Mensagem (IA)</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-left font-medium">Tempo</th>
                        <th className="px-3 py-2 text-left font-medium">Progresso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(disparosBatchData?.jobs || []).map((j: any) => {
                        const scheduledAt = typeof j.scheduledAt === 'number' ? j.scheduledAt : null
                        const remaining = scheduledAt ? Math.max(0, scheduledAt - nowTick) : null
                        const pct = j.status === 'scheduled' ? calcProgress(j) : j.status === 'running' ? 95 : 100
                        const pacienteNome = remoteJidToPacienteNome.get(String(j.number || '')) || '-'
                        const displayNumber = remoteJidToWhatsApp.get(String(j.number || '')) || String(j.number || '')
                        const messageForDisplay = String(j.variedText || '').trim()
                        const messagePlaceholder =
                          !messageForDisplay && j.status === 'running' ? 'Gerando...' : !messageForDisplay ? '' : messageForDisplay
                        const timeLabel =
                          j.status === 'scheduled' && remaining != null
                            ? `Falta ${formatRemaining(remaining)}`
                            : j.status === 'running'
                              ? 'Enviando agora'
                              : j.status === 'sent'
                                ? 'Enviado'
                                : j.status === 'failed'
                                  ? 'Falhou'
                                  : j.status === 'canceled'
                                    ? 'Cancelado'
                                    : '-'

                        return (
                          <tr key={j.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2">{pacienteNome}</td>
                            <td className="px-3 py-2">{displayNumber}</td>
                            <td className="px-3 py-2 max-w-[420px]">
                              <div className="line-clamp-3 whitespace-pre-wrap" title={messageForDisplay || ''}>
                                {messagePlaceholder}
                              </div>
                            </td>
                            <td className="px-3 py-2">{statusToPtBR(j.status)}</td>
                            <td className="px-3 py-2">{timeLabel}</td>
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                <Progress value={pct} />
                                {j.status === 'scheduled' && scheduledAt && (
                                  <div className="text-[10px] text-muted-foreground">
                                    Previsto: {new Date(scheduledAt).toLocaleTimeString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        // Instância configurada
        <div className={`grid gap-6 ${status?.status === 'open' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
          {/* Status da Instância */}
          <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Status de Conexão</h2>
              </div>
              {status?.status === 'open' && (
                <Badge className="bg-green-100 text-green-800">
                  Conectado
                </Badge>
              )}
            </div>
            <div className="space-y-6">
              {/* Nome do Perfil */}
              {status?.profileName && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                    {status.profileName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nome</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{status.profileName}</p>
                  </div>
                </div>
              )}

              {/* Status e Conectado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {status?.status === 'open' ? 'Ativo' : status?.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Conexão</p>
                  <p className="font-semibold text-green-900 dark:text-green-100">
                    {status?.status === 'open' ? 'Conectado' : 'Aguardando'}
                  </p>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nome da Conexão</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatConnectionName(instance.instanceName)}</span>
                </div>
                {status?.owner && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Número</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatConnectedNumber(status.owner)}</span>
                    </div>
                  </>
                )}
                {instance.connectedAt && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Conectado em</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(instance.connectedAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteInstance.isPending}
                    >
                      {deleteInstance.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Desativar Conexão
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desativar conexão do WhatsApp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja desativar esta conexão? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteInstance.isPending}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction disabled={deleteInstance.isPending} onClick={handleDelete}>
                        Desativar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {/* QR Code - Ocultar quando conectado */}
          {status?.status !== 'open' && (
            <div className="rounded-3xl border border-border/60 bg-background/80 p-6 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Conexão WhatsApp</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Escaneie o QR Code com seu WhatsApp
              </p>
              <div>
                {shouldShowQRCode ? (
                  <QRCodeDisplay 
                    instanceName={instance.instanceName}
                    qrCode={qrCode?.base64}
                    pairingCode={qrCode?.pairingCode}
                    isLoading={qrLoading}
                  />
                ) : (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Verificando status da conexão...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={editPacienteOpen} onOpenChange={setEditPacienteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar paciente</DialogTitle>
            <DialogDescription>Atualize as informações do paciente.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome completo</Label>
              <Input value={editNomeCompleto} onChange={(e) => setEditNomeCompleto(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>WhatsApp</Label>
              <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditPacienteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void savePacienteEdits()} disabled={updatePaciente.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
