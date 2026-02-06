import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  checkWhatsAppInstance,
  getConversas,
  getConversaByRemoteJid,
  getMensagens,
  syncConversasFromEvolution,
  syncMensagensFromEvolution,
  sendTextMessage,
  sendMediaMessage,
  sendAudioMessage,
  sendLocationMessage,
  sendReaction,
  editMessage,
  deleteMessageForEveryone,
  markMessagesAsRead,
  vincularPacienteConversa,
  updateConversa,
  type WhatsAppConversa,
  type WhatsAppMensagem,
} from '@/services/api/whatsapp-chat'

// =====================================================
// HOOK: useWhatsAppInstanceCheck
// Verifica se a clínica tem instância WhatsApp configurada
// =====================================================

export function useWhatsAppInstanceCheck() {
  return useQuery({
    queryKey: ['whatsapp', 'instance-check'],
    queryFn: checkWhatsAppInstance,
    staleTime: 5 * 60 * 1000,
  })
}

// =====================================================
// HOOK: useWhatsAppConversas
// Lista todas as conversas
// =====================================================

export function useWhatsAppConversas() {
  return useQuery({
    queryKey: ['whatsapp', 'conversas'],
    queryFn: getConversas,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  })
}

// =====================================================
// HOOK: useWhatsAppConversa
// Busca uma conversa específica por remoteJid
// =====================================================

export function useWhatsAppConversa(remoteJid: string | null) {
  return useQuery({
    queryKey: ['whatsapp', 'conversa', remoteJid],
    queryFn: () => (remoteJid ? getConversaByRemoteJid(remoteJid) : null),
    enabled: !!remoteJid,
    staleTime: 30 * 1000,
  })
}

// =====================================================
// HOOK: useWhatsAppMensagens
// Lista mensagens de uma conversa
// =====================================================

export function useWhatsAppMensagens(conversaId: string | null) {
  return useQuery({
    queryKey: ['whatsapp', 'mensagens', conversaId],
    queryFn: () => (conversaId ? getMensagens(conversaId) : []),
    enabled: !!conversaId,
    staleTime: 3 * 1000,
    refetchInterval: 5 * 1000,
  })
}

// =====================================================
// HOOK: useSyncConversas
// Sincroniza conversas com Evolution API
// =====================================================

export function useSyncConversas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncConversasFromEvolution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useSyncMensagens
// Sincroniza mensagens de uma conversa com Evolution API
// =====================================================

export function useSyncMensagens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversaId, remoteJid }: { conversaId: string; remoteJid: string }) =>
      syncMensagensFromEvolution(conversaId, remoteJid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
    },
  })
}

// =====================================================
// HOOK: useSendTextMessage
// Envia mensagem de texto
// =====================================================

export function useSendTextMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversaId,
      remoteJid,
      text,
      profissionalId,
      quotedMessageId,
    }: {
      conversaId: string
      remoteJid: string
      text: string
      profissionalId?: string
      quotedMessageId?: string
    }) => sendTextMessage(conversaId, remoteJid, text, profissionalId, quotedMessageId),
    onSuccess: (_, variables) => {
      // Backend already persisted. Invalidate to refetch from DB.
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useSendMediaMessage
// Envia mensagem de mídia (imagem, vídeo, documento)
// =====================================================

export function useSendMediaMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversaId,
      remoteJid,
      mediaType,
      mediaUrl,
      mimetype,
      caption,
      fileName,
      profissionalId,
    }: {
      conversaId: string
      remoteJid: string
      mediaType: 'image' | 'video' | 'document'
      mediaUrl: string
      mimetype: string
      caption?: string
      fileName?: string
      profissionalId?: string
    }) => sendMediaMessage(conversaId, remoteJid, mediaType, mediaUrl, mimetype, caption, fileName, profissionalId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useSendAudioMessage
// Envia mensagem de áudio
// =====================================================

export function useSendAudioMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversaId,
      remoteJid,
      audioUrl,
      profissionalId,
    }: {
      conversaId: string
      remoteJid: string
      audioUrl: string
      profissionalId?: string
    }) => sendAudioMessage(conversaId, remoteJid, audioUrl, profissionalId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useSendLocationMessage
// Envia mensagem de localização
// =====================================================

export function useSendLocationMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversaId,
      remoteJid,
      latitude,
      longitude,
      name,
      address,
      profissionalId,
    }: {
      conversaId: string
      remoteJid: string
      latitude: number
      longitude: number
      name: string
      address: string
      profissionalId?: string
    }) => sendLocationMessage(conversaId, remoteJid, latitude, longitude, name, address, profissionalId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useSendReaction
// Envia reação a uma mensagem
// =====================================================

export function useSendReaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: {
      conversaId: string
      remoteJid: string
      messageId: string
      fromMe: boolean
      emoji: string
    }) => sendReaction(variables.remoteJid, variables.messageId, variables.fromMe, variables.emoji),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
    },
  })
}

// =====================================================
// HOOK: useEditMessage
// Edita uma mensagem enviada
// =====================================================

export function useEditMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: {
      conversaId: string
      remoteJid: string
      messageId: string
      newText: string
    }) => editMessage(variables.remoteJid, variables.messageId, variables.newText),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
    },
  })
}

// =====================================================
// HOOK: useDeleteMessage
// Deleta uma mensagem para todos
// =====================================================

export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: {
      conversaId: string
      remoteJid: string
      messageId: string
    }) => deleteMessageForEveryone(variables.remoteJid, variables.messageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'mensagens', variables.conversaId] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useMarkAsRead
// Marca mensagens como lidas
// =====================================================

export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      conversaId,
      remoteJid,
      messages,
    }: {
      conversaId: string
      remoteJid: string
      messages: Array<{ messageId: string; fromMe: boolean }>
    }) => markMessagesAsRead(conversaId, remoteJid, messages),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversa', variables.remoteJid] })
    },
  })
}

// =====================================================
// HOOK: useVincularPaciente
// Vincula um paciente a uma conversa
// =====================================================

export function useVincularPaciente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ conversaId, pacienteId }: { conversaId: string; pacienteId: string }) =>
      vincularPacienteConversa(conversaId, pacienteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// HOOK: useUpdateConversa
// Atualiza dados de uma conversa (arquivar, fixar, etc.)
// =====================================================

export function useUpdateConversa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WhatsAppConversa> }) =>
      updateConversa(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversas'] })
    },
  })
}

// =====================================================
// TIPOS EXPORTADOS
// =====================================================

export type { WhatsAppConversa, WhatsAppMensagem }
