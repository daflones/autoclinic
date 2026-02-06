import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useWhatsAppInstanceCheck,
  useWhatsAppConversas,
  useWhatsAppMensagens,
  useSyncConversas,
  useSyncMensagens,
  useSendTextMessage,
  useSendMediaMessage,
  useSendAudioMessage,
  useSendLocationMessage,
  useSendReaction,
  useEditMessage,
  useDeleteMessage,
  useMarkAsRead,
  useUpdateConversa,
  type WhatsAppConversa,
  type WhatsAppMensagem,
} from '@/hooks/useWhatsAppChat'
import { getMediaBase64 } from '@/services/api/whatsapp-chat'
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Pause,
  Play,
  Image as ImageIcon,
  FileText,
  MapPin,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Archive,
  Pin,
  BellOff,
  Bell,
  Edit,
  Reply,
  X,
  Loader2,
  User,
  ChevronDown,
  Download,
  Volume2,
  Trash2,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']
const EMOJI_LIST = ['😀','😃','😄','😁','😆','🤣','😂','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤯','😳','😱','😨','😰','�','🤗','🤔','🤭','🤫','😶','😐','😑','😬','🙄','😯','😲','🥱','😴','🤤','😪','🤐','🥴','🤢','🤧','😷','👋','🤚','✋','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍','👎','👏','🙌','🤝','�','💪','❤️','🧡','💛','💚','💙','💜','🖤','💯','🔥','⭐','✨','💫','🎉','🎊','💐','🌹']

export function ChatPage() {
  const navigate = useNavigate()
  const instanceCheck = useWhatsAppInstanceCheck()
  const { user } = useAuthStore()
  const profissionalId = user?.profissional_clinica_id || undefined
  const [selectedConversa, setSelectedConversa] = useState<WhatsAppConversa | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all')
  const [messageText, setMessageText] = useState('')
  const [editingMessage, setEditingMessage] = useState<WhatsAppMensagem | null>(null)
  const [replyingTo, setReplyingTo] = useState<WhatsAppMensagem | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editText, setEditText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null)
  const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({})
  const [loadedMedia, setLoadedMedia] = useState<Record<string, string>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const conversasQuery = useWhatsAppConversas()
  const mensagensQuery = useWhatsAppMensagens(selectedConversa?.id || null)
  
  const syncConversas = useSyncConversas()
  const syncMensagens = useSyncMensagens()
  const sendText = useSendTextMessage()
  const sendMedia = useSendMediaMessage()
  const sendAudio = useSendAudioMessage()
  const sendLocation = useSendLocationMessage()
  const sendReaction = useSendReaction()
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()
  const markAsRead = useMarkAsRead()
  const updateConversa = useUpdateConversa()

  const conversas = conversasQuery.data ?? []
  const mensagens = mensagensQuery.data ?? []

  // Keep selectedConversa in sync with latest data from query (e.g. after contact name updates)
  useEffect(() => {
    if (selectedConversa && conversas.length > 0) {
      const updated = conversas.find(c => c.id === selectedConversa.id)
      if (updated && (updated.nome_contato !== selectedConversa.nome_contato || updated.foto_perfil_url !== selectedConversa.foto_perfil_url)) {
        setSelectedConversa(updated)
      }
    }
  }, [conversas])

  // Track sync state
  const conversasSyncAttempted = useRef(false)
  const lastMsgSyncRef = useRef<string | null>(null)
  const bgSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastConvSyncTime = useRef(0)

  // Initial conversas sync (once on load)
  useEffect(() => {
    if (conversasQuery.isLoading) return
    if (conversasSyncAttempted.current) return
    conversasSyncAttempted.current = true
    lastConvSyncTime.current = Date.now()
    syncConversas.mutate()
  }, [conversasQuery.isLoading])

  // Periodic conversas sync (every 60s for contact names and new chats)
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastConvSyncTime.current
      if (elapsed >= 55_000) {
        lastConvSyncTime.current = Date.now()
        syncConversas.mutate()
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const filteredConversas = useMemo(() => {
    let result = [...conversas]

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.nome_contato?.toLowerCase().includes(query) ||
          c.numero_telefone?.includes(query) ||
          c.ultima_mensagem?.toLowerCase().includes(query)
      )
    }

    // Filter tabs
    switch (sidebarFilter) {
      case 'unread':
        result = result.filter((c) => c.mensagens_nao_lidas > 0)
        break
      case 'pinned':
        result = result.filter((c) => c.fixado)
        break
      case 'archived':
        result = result.filter((c) => c.arquivado)
        break
      default:
        // Hide archived by default
        result = result.filter((c) => !c.arquivado)
        break
    }

    // Sort: pinned first, then by last message timestamp
    result.sort((a, b) => {
      if (a.fixado && !b.fixado) return -1
      if (!a.fixado && b.fixado) return 1
      const ta = a.ultima_mensagem_timestamp ? new Date(a.ultima_mensagem_timestamp).getTime() : 0
      const tb = b.ultima_mensagem_timestamp ? new Date(b.ultima_mensagem_timestamp).getTime() : 0
      return tb - ta
    })

    return result
  }, [conversas, searchQuery, sidebarFilter])

  // Count badges for filter tabs
  const unreadCount = useMemo(() => conversas.filter(c => c.mensagens_nao_lidas > 0 && !c.arquivado).length, [conversas])
  const pinnedCount = useMemo(() => conversas.filter(c => c.fixado).length, [conversas])
  const archivedCount = useMemo(() => conversas.filter(c => c.arquivado).length, [conversas])

  // Auto-scroll to bottom when messages load or conversation changes
  useEffect(() => {
    const scrollToBottom = () => {
      const root = messagesContainerRef.current
      if (root) {
        const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight
        }
      }
    }
    // Immediate + delayed scroll to handle DOM rendering lag
    scrollToBottom()
    const timer = setTimeout(scrollToBottom, 150)
    return () => clearTimeout(timer)
  }, [mensagens.length, selectedConversa?.id])

  // Mark as read when opening conversation
  useEffect(() => {
    if (selectedConversa && mensagens.length > 0 && selectedConversa.mensagens_nao_lidas > 0) {
      const unreadMessages = mensagens
        .filter((m) => !m.from_me)
        .slice(-20)
        .map((m) => ({ messageId: m.message_id, fromMe: m.from_me }))
      
      if (unreadMessages.length > 0) {
        markAsRead.mutate({
          conversaId: selectedConversa.id,
          remoteJid: selectedConversa.remote_jid,
          messages: unreadMessages,
        })
      }
    }
  }, [selectedConversa?.id])

  // Sync messages from Evolution when selecting a conversation + periodic background sync
  useEffect(() => {
    if (!selectedConversa) {
      if (bgSyncIntervalRef.current) {
        clearInterval(bgSyncIntervalRef.current)
        bgSyncIntervalRef.current = null
      }
      return
    }

    // Initial sync on conversation select
    if (lastMsgSyncRef.current !== selectedConversa.id) {
      lastMsgSyncRef.current = selectedConversa.id
      syncMensagens.mutate({ conversaId: selectedConversa.id, remoteJid: selectedConversa.remote_jid })
    }

    // Periodic background sync every 10s for real-time incoming messages
    if (bgSyncIntervalRef.current) clearInterval(bgSyncIntervalRef.current)
    bgSyncIntervalRef.current = setInterval(() => {
      if (!syncMensagens.isPending) {
        syncMensagens.mutate({ conversaId: selectedConversa.id, remoteJid: selectedConversa.remote_jid })
      }
    }, 10_000)

    return () => {
      if (bgSyncIntervalRef.current) {
        clearInterval(bgSyncIntervalRef.current)
        bgSyncIntervalRef.current = null
      }
    }
  }, [selectedConversa?.id])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversa) return

    try {
      await sendText.mutateAsync({
        conversaId: selectedConversa.id,
        remoteJid: selectedConversa.remote_jid,
        text: messageText,
        profissionalId,
        quotedMessageId: replyingTo?.message_id,
      })
      setMessageText('')
      setReplyingTo(null)
      inputRef.current?.focus()
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error?.message || error)
      alert('Erro ao enviar: ' + (error?.message || 'Erro desconhecido'))
    }
  }

  const handleReaction = async (mensagem: WhatsAppMensagem, emoji: string) => {
    if (!selectedConversa) return

    try {
      await sendReaction.mutateAsync({
        conversaId: selectedConversa.id,
        remoteJid: selectedConversa.remote_jid,
        messageId: mensagem.message_id,
        fromMe: mensagem.from_me,
        emoji,
      })
      setShowReactionPicker(null)
    } catch (error: any) {
      console.error('Erro ao enviar reação:', error?.message || error)
    }
  }

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim() || !selectedConversa) return

    try {
      await editMessage.mutateAsync({
        conversaId: selectedConversa.id,
        remoteJid: selectedConversa.remote_jid,
        messageId: editingMessage.message_id,
        newText: editText,
      })
      setShowEditDialog(false)
      setEditingMessage(null)
      setEditText('')
    } catch (error: any) {
      console.error('Erro ao editar mensagem:', error?.message || error)
      alert('Erro ao editar: ' + (error?.message || 'Erro desconhecido'))
    }
  }

  const handleArchiveConversa = async (conversa: WhatsAppConversa) => {
    try {
      await updateConversa.mutateAsync({
        id: conversa.id,
        data: { arquivado: !conversa.arquivado },
      })
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error)
    }
  }

  const handlePinConversa = async (conversa: WhatsAppConversa) => {
    try {
      await updateConversa.mutateAsync({
        id: conversa.id,
        data: { fixado: !conversa.fixado },
      })
    } catch (error) {
      console.error('Erro ao fixar conversa:', error)
    }
  }

  const handleMuteConversa = async (conversa: WhatsAppConversa) => {
    try {
      await updateConversa.mutateAsync({
        id: conversa.id,
        data: { silenciado: !conversa.silenciado },
      })
    } catch (error) {
      console.error('Erro ao silenciar conversa:', error)
    }
  }

  // File upload handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'document') => {
    const file = e.target.files?.[0]
    if (!file || !selectedConversa) return
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUri = reader.result as string
        await sendMedia.mutateAsync({
          conversaId: selectedConversa.id,
          remoteJid: selectedConversa.remote_jid,
          mediaType,
          mediaUrl: dataUri,
          mimetype: file.type,
          caption: '',
          fileName: file.name,
          profissionalId,
        })
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      alert('Erro ao enviar arquivo: ' + (error?.message || 'Erro desconhecido'))
    }
    e.target.value = ''
  }

  // Audio recording handlers
  const formatRecTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start(100)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      alert('Não foi possível acessar o microfone')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    audioChunksRef.current = []
  }

  const sendRecording = async () => {
    if (!selectedConversa || !mediaRecorderRef.current) return
    const recorder = mediaRecorderRef.current
    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)

    // Wait for final data
    await new Promise(r => setTimeout(r, 200))

    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        await sendAudio.mutateAsync({
          conversaId: selectedConversa.id,
          remoteJid: selectedConversa.remote_jid,
          audioUrl: reader.result as string,
          profissionalId,
        })
      } catch (error: any) {
        alert('Erro ao enviar áudio: ' + (error?.message || 'Erro desconhecido'))
      }
    }
    reader.readAsDataURL(blob)

    setIsRecording(false)
    setIsPaused(false)
    setRecordingTime(0)
    audioChunksRef.current = []
    mediaRecorderRef.current = null
  }

  // Media download on demand — one at a time to avoid flooding
  const mediaQueueRef = useRef<string[]>([])
  const mediaLoadingRef = useRef(false)
  const attemptedMediaRef = useRef<Set<string>>(new Set())

  const processMediaQueue = async () => {
    if (mediaLoadingRef.current) return
    // Find next un-attempted message
    const next = mediaQueueRef.current.find(id => !attemptedMediaRef.current.has(id))
    if (!next) return
    attemptedMediaRef.current.add(next)
    mediaLoadingRef.current = true
    setLoadingMedia(prev => ({ ...prev, [next]: true }))
    try {
      const result = await getMediaBase64(next)
      setLoadedMedia(prev => ({ ...prev, [next]: result?.dataUri || '' }))
    } catch {
      setLoadedMedia(prev => ({ ...prev, [next]: '' }))
    }
    setLoadingMedia(prev => ({ ...prev, [next]: false }))
    mediaLoadingRef.current = false
    // Continue processing queue after a short delay
    setTimeout(processMediaQueue, 300)
  }

  const handleLoadMedia = (messageId: string) => {
    if (attemptedMediaRef.current.has(messageId)) return
    if (!mediaQueueRef.current.includes(messageId)) {
      mediaQueueRef.current.push(messageId)
    }
    processMediaQueue()
  }

  // Trigger queue processing after render when new messages arrive
  useEffect(() => {
    if (mediaQueueRef.current.length > 0 && !mediaLoadingRef.current) {
      processMediaQueue()
    }
  }, [mensagens])

  const getMediaUrl = (mensagem: WhatsAppMensagem) => {
    const loaded = loadedMedia[mensagem.message_id]
    if (loaded) return loaded
    // Only use cached data URIs — raw WhatsApp URLs are encrypted/temporary
    if (mensagem.media_url && mensagem.media_url.startsWith('data:')) return mensagem.media_url
    return null
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    }
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'SENT':
        return <Check className="h-3 w-3 text-gray-400" />
      default:
        return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const renderMessageContent = (mensagem: WhatsAppMensagem) => {
    const mediaUrl = getMediaUrl(mensagem)
    const isMediaLoading = loadingMedia[mensagem.message_id]
    const mediaTypes = ['image', 'imageMessage', 'video', 'videoMessage', 'audio', 'audioMessage', 'document', 'documentMessage', 'documentWithCaptionMessage', 'sticker', 'stickerMessage']
    const isMediaType = mediaTypes.includes(mensagem.tipo_mensagem)

    // Queue media for loading if not already attempted
    if (isMediaType && !mediaUrl && !attemptedMediaRef.current.has(mensagem.message_id)) {
      if (!mediaQueueRef.current.includes(mensagem.message_id)) {
        mediaQueueRef.current.push(mensagem.message_id)
      }
    }

    switch (mensagem.tipo_mensagem) {
      case 'image':
      case 'imageMessage':
        return (
          <div className="space-y-1">
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt="Imagem"
                className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => setShowImagePreview(mediaUrl)}
              />
            ) : (
              <button
                onClick={() => handleLoadMedia(mensagem.message_id)}
                className="flex items-center gap-2 p-3 bg-black/5 rounded-lg min-w-[200px] hover:bg-black/10"
              >
                {isMediaLoading ? <Loader2 className="h-8 w-8 text-gray-400 animate-spin" /> : <ImageIcon className="h-8 w-8 text-gray-400" />}
                <div className="text-left">
                  <p className="text-sm font-medium">Imagem</p>
                  <p className="text-xs text-gray-400">{isMediaLoading ? 'Carregando...' : 'Clique para carregar'}</p>
                </div>
              </button>
            )}
            {(mensagem.caption || mensagem.conteudo) && <p className="text-sm">{mensagem.caption || mensagem.conteudo}</p>}
          </div>
        )
      case 'video':
      case 'videoMessage':
        return (
          <div className="space-y-1">
            {mediaUrl ? (
              <video src={mediaUrl} controls className="max-w-[280px] rounded-lg" />
            ) : (
              <button
                onClick={() => handleLoadMedia(mensagem.message_id)}
                className="flex items-center gap-2 p-3 bg-black/5 rounded-lg min-w-[200px] hover:bg-black/10"
              >
                {isMediaLoading ? <Loader2 className="h-8 w-8 text-gray-400 animate-spin" /> : <Play className="h-8 w-8 text-gray-400" />}
                <div className="text-left">
                  <p className="text-sm font-medium">Vídeo</p>
                  <p className="text-xs text-gray-400">{isMediaLoading ? 'Carregando...' : 'Clique para carregar'}</p>
                </div>
              </button>
            )}
            {(mensagem.caption || mensagem.conteudo) && <p className="text-sm">{mensagem.caption || mensagem.conteudo}</p>}
          </div>
        )
      case 'audio':
      case 'audioMessage':
        return mediaUrl ? (
          <audio src={mediaUrl} controls className="max-w-[250px]" />
        ) : (
          <button
            onClick={() => handleLoadMedia(mensagem.message_id)}
            className="flex items-center gap-2 p-3 bg-black/5 rounded-lg min-w-[200px] hover:bg-black/10"
          >
            {isMediaLoading ? <Loader2 className="h-6 w-6 text-gray-400 animate-spin" /> : <Volume2 className="h-6 w-6 text-gray-400" />}
            <div className="text-left">
              <p className="text-sm">Áudio</p>
              <p className="text-xs text-gray-400">{isMediaLoading ? 'Carregando...' : 'Clique para carregar'}</p>
            </div>
          </button>
        )
      case 'document':
      case 'documentMessage':
      case 'documentWithCaptionMessage': {
        const docUrl = mediaUrl
        return (
          <a
            href={docUrl || '#'}
            target={docUrl && !docUrl.startsWith('data:') ? '_blank' : undefined}
            rel="noopener noreferrer"
            download={docUrl ? (mensagem.media_filename || 'documento') : undefined}
            className="flex items-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 min-w-[200px]"
            onClick={docUrl ? undefined : (e) => { e.preventDefault(); handleLoadMedia(mensagem.message_id) }}
          >
            {isMediaLoading ? <Loader2 className="h-8 w-8 text-gray-400 animate-spin flex-shrink-0" /> : <FileText className="h-8 w-8 text-gray-500 flex-shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{mensagem.media_filename || 'Documento'}</p>
              <p className="text-xs text-gray-400">{docUrl ? (mensagem.media_mimetype || 'Documento') : (isMediaLoading ? 'Carregando...' : 'Clique para carregar')}</p>
            </div>
            {docUrl && <Download className="h-4 w-4 text-gray-400 flex-shrink-0" />}
          </a>
        )
      }
      case 'location':
      case 'locationMessage':
        return (
          <a
            href={`https://maps.google.com/?q=${mensagem.latitude},${mensagem.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10"
          >
            <MapPin className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-medium">{mensagem.location_name || 'Localização'}</p>
              {mensagem.location_address && (
                <p className="text-xs text-gray-400">{mensagem.location_address}</p>
              )}
            </div>
          </a>
        )
      case 'sticker':
      case 'stickerMessage':
        return mensagem.media_url ? (
          <img src={mensagem.media_url} alt="Sticker" className="max-w-[150px]" />
        ) : (
          <p className="text-sm italic text-gray-500">[Sticker]</p>
        )
      case 'contact':
      case 'contactMessage':
        return <p className="text-sm italic text-gray-500">[Contato]</p>
      case 'poll':
      case 'pollCreationMessage':
        return <p className="text-sm italic text-gray-500">[Enquete]</p>
      default:
        if (!mensagem.conteudo && !mensagem.caption) {
          return <p className="text-sm italic text-gray-400">[{mensagem.tipo_mensagem || 'Mensagem'}]</p>
        }
        return <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo || mensagem.caption}</p>
    }
  }

  // Se a clínica não tem instância WhatsApp configurada, mostrar prompt
  if (instanceCheck.data && !instanceCheck.data.configured) {
    return (
      <div className="flex h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-12rem)] items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center max-w-md px-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <MessageSquare className="h-10 w-10 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Nenhuma instância WhatsApp configurada
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Configure uma instância do WhatsApp para começar a receber e enviar mensagens pelo Chat.
          </p>
          <Button
            onClick={() => navigate('/app/whatsapp?autoConfigure=1')}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Configurar WhatsApp
          </Button>
          <p className="text-xs text-gray-400 mt-4">
            Acesse Automação &amp; Disparos para criar e conectar sua instância WhatsApp Business.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] sm:h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-12rem)] bg-gray-100 dark:bg-gray-900 overflow-hidden rounded-lg">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Chat WhatsApp
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => syncConversas.mutate()}
              disabled={syncConversas.isPending}
            >
              <RefreshCw className={cn("h-5 w-5", syncConversas.isPending && "animate-spin")} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setSidebarFilter('all')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-medium transition-colors",
                sidebarFilter === 'all'
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setSidebarFilter('unread')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1",
                sidebarFilter === 'unread'
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <Mail className="h-3 w-3" />
              Não lidas
              {unreadCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0 text-[10px] bg-purple-500 text-white rounded-full leading-4">{unreadCount}</span>
              )}
            </button>
            <button
              onClick={() => setSidebarFilter('pinned')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1",
                sidebarFilter === 'pinned'
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <Pin className="h-3 w-3" />
              Fixadas
              {pinnedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0 text-[10px] bg-yellow-500 text-white rounded-full leading-4">{pinnedCount}</span>
              )}
            </button>
            <button
              onClick={() => setSidebarFilter('archived')}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1",
                sidebarFilter === 'archived'
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <Archive className="h-3 w-3" />
              {archivedCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0 text-[10px] bg-gray-400 text-white rounded-full leading-4">{archivedCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Lista de Conversas */}
        <ScrollArea className="flex-1">
          {conversasQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredConversas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhuma conversa encontrada</p>
              <Button
                variant="link"
                onClick={() => syncConversas.mutate()}
                className="mt-2"
              >
                Sincronizar conversas
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredConversas.map((conversa) => (
                <div
                  key={conversa.id}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                    selectedConversa?.id === conversa.id && "bg-purple-50 dark:bg-purple-900/20",
                    conversa.fixado && "bg-yellow-50/50 dark:bg-yellow-900/10"
                  )}
                  onClick={() => setSelectedConversa(conversa)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversa.foto_perfil_url || ''} />
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      {getInitials(conversa.nome_contato || conversa.numero_telefone)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                        {conversa.nome_contato || conversa.numero_telefone || conversa.remote_jid?.split('@')[0] || 'Desconhecido'}
                      </p>
                      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                        {conversa.fixado && <Pin className="h-3 w-3 text-yellow-500" />}
                        {conversa.silenciado && <BellOff className="h-3 w-3 text-gray-400" />}
                        <span className="text-[10px] text-gray-400">
                          {conversa.ultima_mensagem_timestamp
                            ? formatTimestamp(conversa.ultima_mensagem_timestamp)
                            : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate max-w-[160px]">
                        {(() => {
                          const msg = conversa.ultima_mensagem || 'Sem mensagens'
                          return msg.length > 30 ? msg.slice(0, 30) + '...' : msg
                        })()}
                      </p>
                      <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                        {conversa.arquivado && <Archive className="h-3 w-3 text-gray-400" />}
                        {conversa.mensagens_nao_lidas > 0 && (
                          <span className="px-1.5 py-0 text-[10px] font-medium bg-purple-500 text-white rounded-full leading-4">
                            {conversa.mensagens_nao_lidas}
                          </span>
                        )}
                      </div>
                    </div>
                    {conversa.paciente && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1 truncate">
                        <User className="h-3 w-3 flex-shrink-0" />
                        {conversa.paciente.nome_completo || conversa.paciente.nome_social}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-60 hover:opacity-100">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePinConversa(conversa)}>
                        <Pin className="h-4 w-4 mr-2" />
                        {conversa.fixado ? 'Desafixar' : 'Fixar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchiveConversa(conversa)}>
                        <Archive className="h-4 w-4 mr-2" />
                        {conversa.arquivado ? 'Desarquivar' : 'Arquivar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleMuteConversa(conversa)}>
                        {conversa.silenciado ? <Bell className="h-4 w-4 mr-2" /> : <BellOff className="h-4 w-4 mr-2" />}
                        {conversa.silenciado ? 'Ativar notificações' : 'Silenciar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversa ? (
          <>
            {/* Header do Chat */}
            <div className="h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversa.foto_perfil_url || ''} />
                  <AvatarFallback className="bg-purple-100 text-purple-600">
                    {getInitials(selectedConversa.nome_contato || selectedConversa.numero_telefone)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedConversa.nome_contato || selectedConversa.numero_telefone || selectedConversa.remote_jid?.split('@')[0] || 'Desconhecido'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedConversa.numero_telefone || selectedConversa.remote_jid?.split('@')[0]}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => syncMensagens.mutate({
                  conversaId: selectedConversa.id,
                  remoteJid: selectedConversa.remote_jid,
                })}
                disabled={syncMensagens.isPending}
              >
                <RefreshCw className={cn("h-5 w-5", syncMensagens.isPending && "animate-spin")} />
              </Button>
            </div>

            {/* Mensagens */}
            <ScrollArea ref={messagesContainerRef} className="flex-1 p-4 bg-[#e5ddd5] dark:bg-gray-900">
              <div className="space-y-4 max-w-4xl mx-auto">
                {mensagensQuery.isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  mensagens.map((mensagem) => {
                    const quotedMsg = mensagem.quoted_message_id
                      ? mensagens.find(m => m.message_id === mensagem.quoted_message_id)
                      : null
                    return (
                    <div
                      key={mensagem.id}
                      className={cn(
                        "flex",
                        mensagem.from_me ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "group relative max-w-md rounded-lg px-3 py-2 shadow-sm",
                          mensagem.from_me
                            ? "bg-[#dcf8c6] dark:bg-green-800"
                            : "bg-white dark:bg-gray-700"
                        )}
                      >
                        {/* Nome do remetente (profissional ou Admin) */}
                        {mensagem.from_me && (
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                            {mensagem.profissional?.nome || 'Admin'}
                          </p>
                        )}

                        {/* Mensagem citada (reply) */}
                        {quotedMsg && (
                          <div className="border-l-4 border-purple-400 bg-black/5 rounded px-2 py-1 mb-1 max-w-full">
                            <p className="text-xs font-medium text-purple-600">
                              {quotedMsg.from_me ? 'Você' : (selectedConversa?.nome_contato || 'Contato')}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {quotedMsg.conteudo || quotedMsg.caption || `[${quotedMsg.tipo_mensagem}]`}
                            </p>
                          </div>
                        )}

                        {/* Conteúdo da mensagem */}
                        {renderMessageContent(mensagem)}

                        {/* Rodapé: hora, status, editado */}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {mensagem.editado && (
                            <span className="text-[10px] text-gray-500 italic">editado</span>
                          )}
                          <span className="text-[10px] text-gray-500">
                            {formatMessageTime(mensagem.timestamp_msg)}
                          </span>
                          {mensagem.from_me && getStatusIcon(mensagem.status)}
                        </div>

                        {/* Reação */}
                        {mensagem.reacao && (
                          <div className="absolute -bottom-3 right-2 bg-white dark:bg-gray-600 rounded-full px-1.5 py-0.5 shadow-sm text-sm">
                            {mensagem.reacao}
                          </div>
                        )}

                        {/* Hover arrow for actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "absolute top-1 h-6 w-6 rounded-full flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                "bg-white/80 dark:bg-gray-600/80 hover:bg-white dark:hover:bg-gray-600 shadow-sm",
                                mensagem.from_me ? "left-1" : "right-1"
                              )}
                            >
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={mensagem.from_me ? "start" : "end"}>
                            <DropdownMenuItem onClick={() => { setReplyingTo(mensagem); inputRef.current?.focus() }}>
                              <Reply className="h-4 w-4 mr-2" />
                              Responder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowReactionPicker(mensagem.id)}>
                              <Smile className="h-4 w-4 mr-2" />
                              Reagir
                            </DropdownMenuItem>
                            {mensagem.from_me && mensagem.tipo_mensagem === 'text' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingMessage(mensagem)
                                  setEditText(mensagem.conteudo || '')
                                  setShowEditDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {mensagem.from_me && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  if (!selectedConversa) return
                                  if (!confirm('Apagar esta mensagem para todos?')) return
                                  deleteMessage.mutate({
                                    conversaId: selectedConversa.id,
                                    remoteJid: selectedConversa.remote_jid,
                                    messageId: mensagem.message_id,
                                  })
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Apagar para todos
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Picker de reações */}
                        {showReactionPicker === mensagem.id && (
                          <div className="absolute -top-10 left-0 bg-white dark:bg-gray-700 rounded-full shadow-lg px-2 py-1 flex gap-1 z-10">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                className="hover:scale-125 transition-transform text-lg"
                                onClick={() => handleReaction(mensagem, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              className="ml-1 text-gray-400 hover:text-gray-600"
                              onClick={() => setShowReactionPicker(null)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Área de resposta */}
            {replyingTo && (
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <div className="flex-1 border-l-4 border-purple-500 pl-3">
                  <p className="text-xs font-medium text-purple-600">
                    {replyingTo.from_me ? 'Você' : selectedConversa.nome_contato}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {replyingTo.conteudo || '[Mídia]'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 max-h-[200px] overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-xl hover:scale-125 transition-transform p-0.5"
                      onClick={() => {
                        setMessageText(prev => prev + emoji)
                        inputRef.current?.focus()
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'document')}
            />

            {/* Input de mensagem */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={cancelRecording} className="text-red-500 hover:text-red-600">
                    <X className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-full px-4 py-2">
                    <div className={cn("h-3 w-3 rounded-full bg-red-500", !isPaused && "animate-pulse")} />
                    <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400 min-w-[50px]">
                      {formatRecTime(recordingTime)}
                    </span>
                    <div className="flex-1 h-1 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${Math.min(recordingTime * 2, 100)}%` }} />
                    </div>
                  </div>
                  {isPaused ? (
                    <Button variant="ghost" size="icon" onClick={resumeRecording} className="text-gray-600">
                      <Play className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={pauseRecording} className="text-gray-600">
                      <Pause className="h-5 w-5" />
                    </Button>
                  )}
                  <Button onClick={sendRecording} className="bg-purple-600 hover:bg-purple-700 rounded-full h-10 w-10 p-0">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Imagem
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
                        <FileText className="h-4 w-4 mr-2" />
                        Documento
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (!selectedConversa) return
                        const lat = prompt('Latitude:')
                        const lng = prompt('Longitude:')
                        if (lat && lng) {
                          const name = prompt('Nome do local:') || ''
                          const address = prompt('Endereço:') || ''
                          sendLocation.mutate({
                            conversaId: selectedConversa.id,
                            remoteJid: selectedConversa.remote_jid,
                            latitude: Number(lat),
                            longitude: Number(lng),
                            name,
                            address,
                            profissionalId,
                          })
                        }
                      }}>
                        <MapPin className="h-4 w-4 mr-2" />
                        Localização
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Input
                    ref={inputRef}
                    placeholder="Digite uma mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="flex-1"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className={cn("h-5 w-5", showEmojiPicker && "text-purple-600")} />
                  </Button>

                  {messageText.trim() ? (
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendText.isPending}
                      className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                    >
                      {sendText.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={startRecording}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Estado vazio - nenhuma conversa selecionada */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <MessageSquare className="h-32 w-32 text-purple-300 dark:text-purple-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Chat WhatsApp
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Selecione uma conversa para começar a enviar mensagens ou sincronize suas conversas do WhatsApp.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar mensagem</DialogTitle>
            <DialogDescription>
              Edite o texto da sua mensagem abaixo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Digite a nova mensagem..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMessage} disabled={editMessage.isPending}>
              {editMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      {showImagePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowImagePreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setShowImagePreview(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={showImagePreview}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
