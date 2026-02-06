import { useState, useEffect, useRef, useMemo } from 'react'
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
  useWhatsAppConversas,
  useWhatsAppMensagens,
  useSyncConversas,
  useSyncMensagens,
  useSendTextMessage,
  useSendReaction,
  useEditMessage,
  useMarkAsRead,
  useUpdateConversa,
  type WhatsAppConversa,
  type WhatsAppMensagem,
} from '@/hooks/useWhatsAppChat'
import {
  MessageSquare,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Mic,
  Image,
  FileText,
  MapPin,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  Archive,
  Pin,
  BellOff,
  Edit,
  Reply,
  X,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export function ChatPage() {
  const [selectedConversa, setSelectedConversa] = useState<WhatsAppConversa | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [messageText, setMessageText] = useState('')
  const [editingMessage, setEditingMessage] = useState<WhatsAppMensagem | null>(null)
  const [replyingTo, setReplyingTo] = useState<WhatsAppMensagem | null>(null)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editText, setEditText] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const conversasQuery = useWhatsAppConversas()
  const mensagensQuery = useWhatsAppMensagens(selectedConversa?.id || null)
  
  const syncConversas = useSyncConversas()
  const syncMensagens = useSyncMensagens()
  const sendText = useSendTextMessage()
  const sendReaction = useSendReaction()
  const editMessage = useEditMessage()
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
    if (!searchQuery.trim()) return conversas
    const query = searchQuery.toLowerCase()
    return conversas.filter(
      (c) =>
        c.nome_contato?.toLowerCase().includes(query) ||
        c.numero_telefone?.includes(query) ||
        c.ultima_mensagem?.toLowerCase().includes(query)
    )
  }, [conversas, searchQuery])

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

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
    switch (mensagem.tipo_mensagem) {
      case 'image':
        return (
          <div className="space-y-1">
            {mensagem.media_url && (
              <img
                src={mensagem.media_url}
                alt="Imagem"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
              />
            )}
            {mensagem.caption && <p className="text-sm">{mensagem.caption}</p>}
          </div>
        )
      case 'video':
        return (
          <div className="space-y-1">
            {mensagem.media_url && (
              <video
                src={mensagem.media_url}
                controls
                className="max-w-xs rounded-lg"
              />
            )}
            {mensagem.caption && <p className="text-sm">{mensagem.caption}</p>}
          </div>
        )
      case 'audio':
        return (
          <audio src={mensagem.media_url || ''} controls className="max-w-xs" />
        )
      case 'document':
        return (
          <a
            href={mensagem.media_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20"
          >
            <FileText className="h-8 w-8" />
            <div>
              <p className="text-sm font-medium">{mensagem.media_filename || 'Documento'}</p>
              <p className="text-xs opacity-70">{mensagem.media_mimetype}</p>
            </div>
          </a>
        )
      case 'location':
        return (
          <a
            href={`https://maps.google.com/?q=${mensagem.latitude},${mensagem.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20"
          >
            <MapPin className="h-8 w-8" />
            <div>
              <p className="text-sm font-medium">{mensagem.location_name || 'Localização'}</p>
              {mensagem.location_address && (
                <p className="text-xs opacity-70">{mensagem.location_address}</p>
              )}
            </div>
          </a>
        )
      case 'sticker':
        return <p className="text-sm italic text-gray-500">[Sticker]</p>
      case 'contact':
        return <p className="text-sm italic text-gray-500">[Contato]</p>
      case 'poll':
        return <p className="text-sm italic text-gray-500">[Enquete]</p>
      default:
        if (!mensagem.conteudo && !mensagem.caption) {
          return <p className="text-sm italic text-gray-400">[{mensagem.tipo_mensagem || 'Mensagem'}]</p>
        }
        return <p className="text-sm whitespace-pre-wrap">{mensagem.conteudo || mensagem.caption}</p>
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
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
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {conversa.nome_contato || conversa.numero_telefone || conversa.remote_jid?.split('@')[0] || 'Desconhecido'}
                      </p>
                      <span className="text-xs text-gray-500">
                        {conversa.ultima_mensagem_timestamp
                          ? formatTimestamp(conversa.ultima_mensagem_timestamp)
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-500 truncate">
                        {conversa.ultima_mensagem || 'Sem mensagens'}
                      </p>
                      {conversa.mensagens_nao_lidas > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                          {conversa.mensagens_nao_lidas}
                        </span>
                      )}
                    </div>
                    {conversa.paciente && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {conversa.paciente.nome_completo || conversa.paciente.nome_social}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      <DropdownMenuItem>
                        <BellOff className="h-4 w-4 mr-2" />
                        Silenciar
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
              <div className="flex items-center gap-2">
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
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea className="flex-1 p-4 bg-[#e5ddd5] dark:bg-gray-900">
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
                  mensagens.map((mensagem) => (
                    <div
                      key={mensagem.id}
                      className={cn(
                        "flex",
                        mensagem.from_me ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "relative max-w-md rounded-lg px-4 py-2 shadow-sm",
                          mensagem.from_me
                            ? "bg-[#dcf8c6] dark:bg-green-800"
                            : "bg-white dark:bg-gray-700"
                        )}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setShowReactionPicker(mensagem.id)
                        }}
                      >
                        {/* Nome do profissional (se enviado pela clínica) */}
                        {mensagem.from_me && mensagem.profissional && (
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                            {mensagem.profissional.nome}
                          </p>
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

                        {/* Menu de ações */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-600 shadow-sm"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setReplyingTo(mensagem)}>
                              <Reply className="h-4 w-4 mr-2" />
                              Responder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowReactionPicker(mensagem.id)}>
                              <Smile className="h-4 w-4 mr-2" />
                              Reagir
                            </DropdownMenuItem>
                            {mensagem.from_me && (
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
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Picker de reações */}
                        {showReactionPicker === mensagem.id && (
                          <div className="absolute -top-10 left-0 bg-white dark:bg-gray-700 rounded-full shadow-lg px-2 py-1 flex gap-1">
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
                  ))
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

            {/* Input de mensagem */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <Image className="h-4 w-4 mr-2" />
                      Imagem
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="h-4 w-4 mr-2" />
                      Documento
                    </DropdownMenuItem>
                    <DropdownMenuItem>
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

                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>

                {messageText.trim() ? (
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendText.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {sendText.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon">
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </div>
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
    </div>
  )
}
