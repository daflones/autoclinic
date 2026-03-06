import { useEffect, useState } from 'react'
import {
  Instagram, LogIn, Grid3x3, MessageCircle, Heart, MessageSquare,
  LayoutGrid, RefreshCw, Lock, LogOut, Loader2, AlertCircle, ExternalLink,
  Send, ChevronLeft, X, Plus, Trash2, Edit2, ImageOff, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

type Tab = 'feed' | 'posts' | 'comentarios' | 'reacoes' | 'dm'

interface IGStatus { connected: boolean; username?: string; userId?: string; expiresAt?: string; appConfigured?: boolean }

interface IGMediaChild { id: string; media_type: string; media_url?: string; thumbnail_url?: string }
interface IGMedia {
  id: string; caption?: string; media_type: string; media_url?: string
  thumbnail_url?: string; timestamp: string; like_count?: number
  comments_count?: number; permalink?: string
  children?: { data: IGMediaChild[] }
}

interface IGComment {
  id: string; text: string; username: string; timestamp: string
  post_id?: string; post_caption?: string
  replies?: { data: Array<{ id: string; text: string; username: string; timestamp: string }> }
}

interface IGParticipant { id: string; username?: string; name?: string; profile_pic?: string }
interface IGMessage { id: string; from: { id: string; username?: string; name?: string; profile_pic?: string }; message: string; created_time: string }
interface IGConversation { id: string; participants: { data: IGParticipant[] }; updated_time: string; messages?: { data: IGMessage[] } }

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(opts.headers || {}),
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro na requisição')
  return json
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(ts).toLocaleDateString('pt-BR')
}

function IGAvatar({ username, name, profilePic, size = 'md' }: { username?: string; name?: string; profilePic?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const [err, setErr] = useState(false)
  const src = !err ? (profilePic || (username ? `https://unavatar.io/instagram/${encodeURIComponent(username)}` : null)) : null
  const cls = size === 'xs' ? 'h-5 w-5 text-[8px]' : size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs'
  return src
    ? <img src={src} alt={username || name || ''} onError={() => setErr(true)} className={cn('flex-shrink-0 rounded-full object-cover bg-neutral-200', cls)} />
    : <div className={cn('flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 font-bold text-white', cls)}>{initials(username || name)}</div>
}

function initials(name?: string) {
  if (!name) return 'U'
  return name.replace('@', '').split(/[\s_]/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
}

function proxyImg(url?: string) {
  if (!url) return undefined
  return `/api/instagram/image-proxy?url=${encodeURIComponent(url)}`
}

function isVideo(post: IGMedia) {
  if (post.media_type === 'VIDEO' || post.media_type === 'REELS') return true
  if (post.media_type === 'CAROUSEL_ALBUM') {
    return post.children?.data?.some(c => c.media_type === 'VIDEO') ?? false
  }
  return false
}

function getVideoSrc(post: IGMedia): string | undefined {
  if (post.media_type === 'VIDEO' || post.media_type === 'REELS') return post.media_url
  if (post.media_type === 'CAROUSEL_ALBUM') {
    const videoChild = post.children?.data?.find(c => c.media_type === 'VIDEO')
    return videoChild?.media_url
  }
  return undefined
}

function getThumb(post: IGMedia): string | undefined {
  if (post.thumbnail_url) return post.thumbnail_url
  const videoChild = post.children?.data?.find(c => c.media_type === 'VIDEO')
  return videoChild?.thumbnail_url || post.media_url
}

function MediaImg({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [error, setError] = useState(false)
  if (!src || error) {
    return (
      <div className={cn('flex items-center justify-center bg-neutral-100 dark:bg-neutral-800', className)}>
        <ImageOff className="h-5 w-5 text-neutral-300 dark:text-neutral-600" />
      </div>
    )
  }
  return <img src={proxyImg(src)} alt={alt} className={className} onError={() => setError(true)} />
}

function ConnectInstagramScreen({ appConfigured }: { appConfigured: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!appConfigured) {
      toast.error('INSTAGRAM_APP_ID não configurado no servidor. Adicione no .env e reinicie.')
      return
    }
    setLoading(true)
    try {
      const { url } = await apiFetch('/api/instagram/auth-url')
      window.location.href = url
    } catch (err: any) {
      toast.error(err.message || 'Erro ao obter URL de autorização')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 shadow-xl">
        <Instagram className="h-12 w-12 text-white" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">Conectar Instagram</h2>
      <p className="mb-8 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
        Conecte sua conta do Instagram para gerenciar posts, comentários, reações e mensagens diretas diretamente pela AutomaClinic.
      </p>

      <div className="mb-8 grid w-full max-w-sm gap-3">
        {[
          { icon: Grid3x3, label: 'Visualizar e publicar posts' },
          { icon: MessageSquare, label: 'Responder comentários' },
          { icon: Heart, label: 'Gerenciar reações' },
          { icon: MessageCircle, label: 'Chat de DMs (Mensagens Diretas)' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-white/40 bg-white/60 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 text-white">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
          </div>
        ))}
      </div>

      {!appConfigured && (
        <div className="mb-4 w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left dark:border-amber-800/40 dark:bg-amber-900/20">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            App ID não configurado
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-300">
            Adicione <code className="rounded bg-amber-100 px-1 dark:bg-amber-800/40">INSTAGRAM_APP_ID</code> e <code className="rounded bg-amber-100 px-1 dark:bg-amber-800/40">INSTAGRAM_APP_SECRET</code> no arquivo <code className="rounded bg-amber-100 px-1 dark:bg-amber-800/40">.env</code> e reinicie o servidor.
          </p>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
          >
            <ExternalLink className="h-3 w-3" />
            Criar App no Meta Developer
          </a>
        </div>
      )}

      <Button
        size="lg"
        disabled={loading || !appConfigured}
        onClick={handleConnect}
        className={cn(
          'gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg hover:opacity-90',
          !appConfigured && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {loading ? 'Redirecionando...' : 'Entrar com Instagram'}
      </Button>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-400">
        <Lock className="h-3 w-3" />
        Conexão segura via OAuth 2.0
      </div>
    </div>
  )
}

function FeedTab({ posts, loading, onRefresh, onPostClick }: {
  posts: IGMedia[]; loading: boolean; onRefresh: () => void; onPostClick: (post: IGMedia) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-800 dark:text-white">Feed da Clínica</h3>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div>}
      {!loading && posts.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhum post encontrado.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {posts.map((post) => (
          <button
            key={post.id}
            onClick={() => onPostClick(post)}
            className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-sm transition-all hover:shadow-md text-left dark:border-white/10 dark:bg-neutral-800/60"
          >
            <div className="relative">
              <MediaImg src={getThumb(post) || post.media_url} alt="Post" className="h-40 w-full object-cover" />
              {isVideo(post) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Play className="h-5 w-5 text-neutral-800 fill-current ml-0.5" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">{post.caption || '—'}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count ?? 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count ?? 0}</span>
                <span className="ml-auto">{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PostsTab({ posts, loading, onDelete, onNewPost, onPostClick }: {
  posts: IGMedia[]; loading: boolean
  onDelete: (id: string) => void; onNewPost: () => void; onPostClick: (post: IGMedia) => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este post do Instagram? Esta ação é irreversível.')) return
    setDeleting(id)
    try {
      await apiFetch(`/api/instagram/media/${id}`, { method: 'DELETE' })
      toast.success('Post excluído com sucesso!')
      onDelete(id)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir post')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-800 dark:text-white">Gerenciar Posts</h3>
        <Button size="sm" onClick={onNewPost} className="gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-xs text-white hover:opacity-90">
          <Plus className="h-3.5 w-3.5" />
          Novo Post
        </Button>
      </div>
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div>}
      {!loading && posts.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhum post encontrado.</p>}
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-3 rounded-2xl border border-white/40 bg-white/60 p-3 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <button onClick={() => onPostClick(post)} className="relative flex-shrink-0">
              <MediaImg src={getThumb(post) || post.media_url} alt="Post" className="h-16 w-16 rounded-xl object-cover" />
              {isVideo(post) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/25">
                  <Play className="h-4 w-4 text-white fill-current ml-0.5" />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-200">{post.caption || '—'}</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count ?? 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count ?? 0}</span>
                <span>{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                onClick={() => toast.info('A API do Instagram não permite editar legendas de posts publicados.')}>
                <Edit2 className="h-3 w-3 mr-1" />Editar
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                disabled={deleting === post.id} onClick={() => handleDelete(post.id)}>
                {deleting === post.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComentariosTab() {
  const [comments, setComments] = useState<IGComment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    apiFetch('/api/instagram/comments')
      .then(d => setComments(d.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [])

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await apiFetch(`/api/instagram/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      })
      toast.success('Resposta enviada!')
      setReplyText('')
      setReplyingTo(null)
      const d = await apiFetch('/api/instagram/comments')
      setComments(d.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Erro ao responder comentário')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Comentários Recentes</h3>
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div>}
      {!loading && comments.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhum comentário encontrado.</p>}
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <div className="mb-2 flex items-start gap-3">
              <IGAvatar username={c.username} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-white">@{c.username || 'Usuário'}</span>
                  <span className="text-xs text-neutral-400">{timeAgo(c.timestamp)}</span>
                  {c.post_caption && (
                    <Badge variant="outline" className="ml-auto max-w-[120px] truncate text-[10px]">{c.post_caption}</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{c.text}</p>
              </div>
            </div>
            {c.replies?.data?.length ? (
              <div className="ml-11 mb-2 space-y-1">
                {c.replies.data.map(r => (
                  <div key={r.id} className="rounded-lg bg-neutral-50 px-2 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">@{r.username}</span>: {r.text}
                  </div>
                ))}
              </div>
            ) : null}
            {replyingTo === c.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none placeholder:text-neutral-400 dark:border-white/10 dark:bg-neutral-700 dark:text-white"
                  placeholder={`Responder @${c.username || 'Usuário'}...`}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReply(c.id)}
                />
                <Button size="sm" className="h-7 px-2 text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                  disabled={sending} onClick={() => handleReply(c.id)}>
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                  onClick={() => { setReplyingTo(null); setReplyText('') }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setReplyingTo(c.id); setReplyText('') }}
                className="mt-1 text-xs text-pink-500 hover:underline"
              >
                Responder
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ReacoesTab({ posts = [] }: { posts?: IGMedia[] }) {
  const totalLikes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0)
  const sorted = [...posts].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Engajamento dos Posts</h3>
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-neutral-800/60">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="text-neutral-700 dark:text-neutral-200">{totalLikes} curtidas totais</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-neutral-800/60">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span className="text-neutral-700 dark:text-neutral-200">{totalComments} comentários totais</span>
        </div>
      </div>
      {sorted.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhum post para mostrar.</p>}
      <div className="space-y-2">
        {sorted.map((post) => (
          <div key={post.id} className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <MediaImg src={post.thumbnail_url || post.media_url} alt="Post" className="h-12 w-12 flex-shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm text-neutral-700 dark:text-neutral-200">{post.caption || '—'}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{post.like_count ?? 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-400" />{post.comments_count ?? 0}</span>
              </div>
            </div>
            <span className="text-xs text-neutral-400">{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DMTab({ myUserId: myUserIdProp }: { myUserId?: string }) {
  const [conversations, setConversations] = useState<IGConversation[]>([])
  const [myUserId, setMyUserId] = useState<string | undefined>(myUserIdProp)
  const [myUsername, setMyUsername] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState<IGConversation | null>(null)
  const [messages, setMessages] = useState<IGMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    apiFetch('/api/instagram/conversations')
      .then(d => {
        setConversations(d.data || [])
        if (d.myUserId) setMyUserId(d.myUserId)
        if (d.myUsername) setMyUsername(d.myUsername)
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [])

  const openConversation = async (conv: IGConversation) => {
    setSelectedConv(conv)
    setMsgsLoading(true)
    try {
      const d = await apiFetch(`/api/instagram/conversations/${conv.id}/messages`)
      setMessages([...(d.data || [])].reverse())
      if (d.myUserId) setMyUserId(d.myUserId)
      if (d.myUsername) setMyUsername(d.myUsername)
    } catch {
      setMessages([])
    } finally {
      setMsgsLoading(false)
    }
  }

  const isMyParticipant = (p: IGParticipant) => {
    if (myUserId && p.id === myUserId) return true
    if (myUsername && p.username && p.username === myUsername) return true
    return false
  }

  const getOtherParticipant = (data: IGParticipant[]) =>
    data.find(p => !p.username) ||
    data.find(p => !isMyParticipant(p)) ||
    data[0]

  const sendMessage = async () => {
    if (!msgText.trim() || !selectedConv) return
    const other = getOtherParticipant(selectedConv.participants.data)
    if (!other) { toast.error('Destinatário não encontrado'); return }
    setSending(true)
    try {
      await apiFetch('/api/instagram/messages/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId: other.id, message: msgText }),
      })
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        from: { id: myUserId || '', username: 'Você' },
        message: msgText,
        created_time: new Date().toISOString(),
      }])
      setMsgText('')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div>

  if (selectedConv) {
    const other = getOtherParticipant(selectedConv.participants.data)
    const firstMsgFrom = messages.find(m => m.from.id !== (myUserId || '') && m.from.username !== (myUsername || '!!NOMATCH!!'))?.from
    const otherName = firstMsgFrom?.username || firstMsgFrom?.name || other?.username || other?.name || other?.id || 'Usuário'
    return (
      <div className="flex h-[520px] flex-col rounded-2xl border border-white/40 bg-white/60 shadow-sm dark:border-white/10 dark:bg-neutral-800/60 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/30 px-4 py-3 dark:border-white/10">
          <button onClick={() => setSelectedConv(null)} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600">
            <ChevronLeft className="h-3.5 w-3.5" />Voltar
          </button>
          <IGAvatar username={other?.username} name={otherName} profilePic={other?.profile_pic} size="md" />
          <span className="font-semibold text-sm text-neutral-800 dark:text-white">@{otherName}</span>
          <Badge className="ml-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white text-[10px]">Instagram DM</Badge>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgsLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-pink-500" /></div>}
          {messages.map((msg) => {
            const isMe = (myUserId && msg.from.id === myUserId) || (myUsername && msg.from.username === myUsername)
            return (
              <div key={msg.id} className={cn('flex items-end gap-2', isMe ? 'justify-end' : 'justify-start')}>
                {!isMe && <IGAvatar username={msg.from.username} name={msg.from.name} profilePic={msg.from.profile_pic} size="sm" />}
                <div className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                  isMe
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'border border-white/40 bg-white/80 text-neutral-800 dark:border-white/10 dark:bg-neutral-700/60 dark:text-white'
                )}>
                  {msg.message}
                  <div className={cn('mt-0.5 text-[10px]', isMe ? 'text-white/60' : 'text-neutral-400')}>{timeAgo(msg.created_time)}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 border-t border-white/30 p-3 dark:border-white/10">
          <input
            className="flex-1 rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 dark:border-white/10 dark:bg-neutral-700/60 dark:text-white"
            placeholder="Escreva uma mensagem..."
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <Button size="sm" disabled={sending} onClick={sendMessage} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Mensagens Diretas (DM)</h3>
      {conversations.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhuma conversa encontrada.</p>}
      <div className="space-y-2">
        {conversations.map((conv) => {
          const other = getOtherParticipant(conv.participants.data)
          const lastFrom = conv.messages?.data?.[0]?.from
          const altName = lastFrom && lastFrom.username !== myUsername ? (lastFrom.username || lastFrom.name) : undefined
          const otherName = altName || other?.username || other?.name || other?.id || 'Usuário'
          const lastMsg = conv.messages?.data?.[0]
          return (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-left shadow-sm transition-all hover:bg-white/80 dark:border-white/10 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/60"
            >
              <IGAvatar username={other?.username} name={otherName} profilePic={other?.profile_pic} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-white">@{otherName}</span>
                  <span className="text-xs text-neutral-400">{timeAgo(conv.updated_time)}</span>
                </div>
                <p className="truncate text-xs text-neutral-400">{lastMsg?.message || 'Toque para ver a conversa'}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PostDetailModal({ post, onClose }: { post: IGMedia; onClose: () => void }) {
  const [comments, setComments] = useState<IGComment[]>([])
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const [liking, setLiking] = useState<string | null>(null)

  useEffect(() => {
    apiFetch(`/api/instagram/media/${post.id}/comments`)
      .then(d => setComments(d.data || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [post.id])

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await apiFetch(`/api/instagram/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      })
      toast.success('Resposta enviada!')
      setReplyText('')
      setReplyingTo(null)
      const d = await apiFetch(`/api/instagram/media/${post.id}/comments`)
      setComments(d.data || [])
    } catch (err: any) {
      toast.error(err.message || 'Erro ao responder')
    } finally {
      setSending(false)
    }
  }

  const handleLike = async (commentId: string) => {
    if (liking) return
    setLiking(commentId)
    try {
      await apiFetch(`/api/instagram/comments/${commentId}/like`, { method: 'POST' })
      setLikedComments(prev => new Set([...prev, commentId]))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao curtir')
    } finally {
      setLiking(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 dark:border-white/10">
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
          <span className="font-semibold text-neutral-800 dark:text-white">Detalhes do Post</span>
          {post.permalink && (
            <a href={post.permalink} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs text-neutral-400 hover:text-pink-500">
              <ExternalLink className="h-3.5 w-3.5" />Ver no Instagram
            </a>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isVideo(post) ? (
            <div className="w-full bg-black">
              <video
                src={getVideoSrc(post)}
                poster={getThumb(post) ? proxyImg(getThumb(post)) : undefined}
                controls
                playsInline
                controlsList="nodownload"
                className="w-full max-h-[480px] object-contain"
              />
            </div>
          ) : (
            <MediaImg src={post.thumbnail_url || post.media_url} alt="Post" className="h-64 w-full object-cover" />
          )}
          {post.caption && (
            <div className="border-b border-neutral-100 px-4 py-3 text-sm text-neutral-700 dark:border-white/10 dark:text-neutral-200">
              {post.caption}
            </div>
          )}
          <div className="flex items-center gap-4 border-b border-neutral-100 px-4 py-2 text-xs text-neutral-400 dark:border-white/10">
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-400" />{post.like_count ?? 0} curtidas</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-blue-400" />{post.comments_count ?? 0} comentários</span>
            <span className="ml-auto">{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="space-y-3 px-4 py-3">
            <h4 className="text-sm font-semibold text-neutral-800 dark:text-white">Comentários</h4>
            {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-pink-500" /></div>}
            {!loading && comments.length === 0 && <p className="py-2 text-xs text-neutral-400">Nenhum comentário ainda.</p>}
            {comments.map(c => (
              <div key={c.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-white/10 dark:bg-neutral-800/60">
                <div className="mb-1 flex items-center gap-2">
                  <IGAvatar username={c.username} size="sm" />
                  <span className="text-xs font-semibold text-neutral-800 dark:text-white">@{c.username || 'Usuário'}</span>
                  <span className="ml-auto text-[10px] text-neutral-400">{timeAgo(c.timestamp)}</span>
                </div>
                <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-300">{c.text}</p>
                {c.replies?.data?.length ? (
                  <div className="mb-2 ml-4 space-y-1">
                    {c.replies.data.map(r => (
                      <div key={r.id} className="text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-200">@{r.username || 'Usuário'}</span>: {r.text}
                      </div>
                    ))}
                  </div>
                ) : null}
                {replyingTo === c.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs outline-none placeholder:text-neutral-400 dark:border-white/10 dark:bg-neutral-700 dark:text-white"
                      placeholder={`Responder @${c.username || 'Usuário'}...`}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReply(c.id)}
                    />
                    <Button size="sm" className="h-6 px-2 text-[10px] bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      disabled={sending} onClick={() => handleReply(c.id)}>
                      {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                      onClick={() => { setReplyingTo(null); setReplyText('') }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setReplyingTo(c.id); setReplyText('') }}
                      className="text-[10px] text-pink-500 hover:underline">
                      Responder
                    </button>
                    <button
                      onClick={() => handleLike(c.id)}
                      disabled={liking === c.id}
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] transition-colors',
                        likedComments.has(c.id) ? 'text-red-500' : 'text-neutral-400 hover:text-red-400'
                      )}
                    >
                      {liking === c.id
                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        : <Heart className={cn('h-2.5 w-2.5', likedComments.has(c.id) && 'fill-current')} />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NewPostModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const handleSubmit = async () => {
    if (!imageUrl.trim()) { toast.error('URL da imagem é obrigatória'); return }
    setLoading(true)
    try {
      await apiFetch('/api/instagram/media/create', {
        method: 'POST',
        body: JSON.stringify({ image_url: imageUrl, caption }),
      })
      toast.success('Post publicado com sucesso!')
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao publicar post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-white/10">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-500">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-neutral-800 dark:text-white">Novo Post</span>
          <button onClick={onClose} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300">URL da Imagem *</label>
            <input
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-pink-400 dark:border-white/10 dark:bg-neutral-800 dark:text-white"
              placeholder="https://..."
              value={imageUrl}
              onChange={e => { setImageUrl(e.target.value); setPreviewError(false) }}
            />
            <p className="mt-1 text-[10px] text-neutral-400">A imagem deve ser acessível publicamente via URL.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300">Legenda</label>
            <textarea
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-pink-400 dark:border-white/10 dark:bg-neutral-800 dark:text-white"
              placeholder="Escreva uma legenda..."
              rows={3}
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </div>
          {imageUrl && !previewError && (
            <div className="overflow-hidden rounded-xl border border-neutral-100 dark:border-white/10">
              <img src={imageUrl} alt="Preview" className="h-40 w-full object-cover" onError={() => setPreviewError(true)} />
            </div>
          )}
          <Button className="w-full gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
            disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? 'Publicando...' : 'Publicar no Instagram'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InstagramPage() {
  const [status, setStatus] = useState<IGStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [media, setMedia] = useState<IGMedia[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('feed')
  const [disconnecting, setDisconnecting] = useState(false)
  const [selectedPost, setSelectedPost] = useState<IGMedia | null>(null)
  const [showNewPost, setShowNewPost] = useState(false)

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/api/instagram/status')
      setStatus(data)
      if (data.connected) fetchMedia()
    } catch {
      setStatus({ connected: false, appConfigured: false })
    } finally {
      setStatusLoading(false)
    }
  }

  const fetchMedia = async () => {
    setMediaLoading(true)
    try {
      const data = await apiFetch('/api/instagram/media')
      setMedia(data.data || [])
    } catch {
      setMedia([])
    } finally {
      setMediaLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await apiFetch('/api/instagram/disconnect', { method: 'DELETE' })
      toast.success('Instagram desconectado')
      setStatus({ connected: false, appConfigured: status?.appConfigured })
      setMedia([])
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  useEffect(() => { fetchStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isConnected = status?.connected ?? false

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'feed', label: 'Feed', icon: LayoutGrid },
    { id: 'posts', label: 'Posts', icon: Grid3x3 },
    { id: 'comentarios', label: 'Comentários', icon: MessageSquare },
    { id: 'reacoes', label: 'Reações', icon: Heart },
    { id: 'dm', label: 'Chat DM', icon: MessageCircle },
  ]

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {showNewPost && <NewPostModal onClose={() => setShowNewPost(false)} onCreated={fetchMedia} />}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 shadow-md">
          <Instagram className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Instagram</h1>
          {isConnected
            ? <p className="text-xs text-neutral-500">@{status?.username}</p>
            : <p className="text-xs text-neutral-500">Gerencie sua presença no Instagram</p>
          }
        </div>
        {isConnected && (
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Conectado</Badge>
            <Button
              variant="ghost"
              size="sm"
              disabled={disconnecting}
              onClick={handleDisconnect}
              className="gap-1.5 text-xs text-red-500 hover:text-red-600"
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Desconectar
            </Button>
          </div>
        )}
      </div>

      {!isConnected ? (
        <ConnectInstagramScreen appConfigured={status?.appConfigured ?? false} />
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/40 bg-white/50 p-1.5 shadow-sm dark:border-white/10 dark:bg-neutral-800/50">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md'
                      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div>
            {activeTab === 'feed' && <FeedTab posts={media} loading={mediaLoading} onRefresh={fetchMedia} onPostClick={setSelectedPost} />}
            {activeTab === 'posts' && <PostsTab posts={media} loading={mediaLoading} onDelete={id => setMedia(prev => prev.filter(p => p.id !== id))} onNewPost={() => setShowNewPost(true)} onPostClick={setSelectedPost} />}
            {activeTab === 'comentarios' && <ComentariosTab />}
            {activeTab === 'reacoes' && <ReacoesTab posts={media} />}
            {activeTab === 'dm' && <DMTab myUserId={status?.userId} />}
          </div>
        </>
      )}
    </div>
  )
}
