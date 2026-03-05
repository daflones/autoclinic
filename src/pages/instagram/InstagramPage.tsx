import { useEffect, useState } from 'react'
import { Instagram, LogIn, Grid3x3, Image, MessageCircle, Heart, MessageSquare, LayoutGrid, RefreshCw, Lock, LogOut, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

type Tab = 'feed' | 'posts' | 'comentarios' | 'reacoes' | 'dm'

interface IGStatus {
  connected: boolean
  username?: string
  userId?: string
  expiresAt?: string
  appConfigured?: boolean
  configIdConfigured?: boolean
}

interface IGMedia {
  id: string
  caption?: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  permalink?: string
}

interface InstagramDM {
  id: string
  userName: string
  userAvatar: string
  lastMessage: string
  unread: number
  time: string
}

const MOCK_DMS: InstagramDM[] = [
  { id: '1', userName: 'Maria Silva', userAvatar: 'https://placehold.co/40x40/f0e6ff/9c4dcc?text=MS', lastMessage: 'Quero agendar uma consulta!', unread: 2, time: '10:32' },
  { id: '2', userName: 'Ana Costa', userAvatar: 'https://placehold.co/40x40/ffe6f0/cc4d7a?text=AC', lastMessage: 'Quanto custa o procedimento?', unread: 0, time: '09:15' },
  { id: '3', userName: 'Julia Mendes', userAvatar: 'https://placehold.co/40x40/e6f0ff/4d7acc?text=JM', lastMessage: 'Obrigada pelo atendimento 😊', unread: 1, time: 'Ontem' },
  { id: '4', userName: 'Carla Oliveira', userAvatar: 'https://placehold.co/40x40/f0ffe6/4dcc7a?text=CO', lastMessage: 'Vocês trabalham aos sábados?', unread: 0, time: 'Ontem' },
]

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

function ConnectInstagramScreen({ appConfigured, configIdConfigured }: { appConfigured: boolean; configIdConfigured: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    if (!appConfigured) {
      toast.error('INSTAGRAM_APP_ID não configurado no servidor. Adicione no .env e reinicie.')
      return
    }
    if (!configIdConfigured) {
      toast.error('INSTAGRAM_CONFIG_ID não configurado. Crie uma configuração no Meta Developer e adicione no .env.')
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

      {appConfigured && !configIdConfigured && (
        <div className="mb-4 w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-left dark:border-red-800/40 dark:bg-red-900/20">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            Config ID obrigatório (Facebook Login para Empresas)
          </div>
          <p className="text-xs text-red-600 dark:text-red-300">
            Seu app é do tipo <strong>Empresa</strong>. Você precisa criar uma <strong>Configuração</strong> no Meta Developer e adicionar o <code className="rounded bg-red-100 px-1 dark:bg-red-800/40">INSTAGRAM_CONFIG_ID</code> no <code className="rounded bg-red-100 px-1 dark:bg-red-800/40">.env</code>.
          </p>
          <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">
            Caminho: <strong>Meta Developer → Login do Facebook para Empresas → Configurações → Criar configuração</strong>
          </p>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline dark:text-red-300"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir Meta Developer Console
          </a>
        </div>
      )}

      <Button
        size="lg"
        disabled={loading || !appConfigured || !configIdConfigured}
        onClick={handleConnect}
        className={cn(
          'gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white shadow-lg hover:opacity-90',
          (!appConfigured || !configIdConfigured) && 'opacity-50 cursor-not-allowed'
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

function FeedTab({ posts, loading, onRefresh }: { posts: IGMedia[]; loading: boolean; onRefresh: () => void }) {
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
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noreferrer"
            className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/60 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-neutral-800/60"
          >
            <img src={post.media_url || post.thumbnail_url} alt="Post" className="h-40 w-full object-cover" />
            <div className="p-2.5">
              <p className="line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">{post.caption || '—'}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count ?? 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count ?? 0}</span>
                <span className="ml-auto">{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function PostsTab({ posts, loading }: { posts: IGMedia[]; loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-neutral-800 dark:text-white">Gerenciar Posts</h3>
        <Button size="sm" className="gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-xs text-white hover:opacity-90">
          <Image className="h-3.5 w-3.5" />
          Novo Post
        </Button>
      </div>
      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-pink-500" /></div>}
      {!loading && posts.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Nenhum post encontrado.</p>}
      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex gap-3 rounded-2xl border border-white/40 bg-white/60 p-3 shadow-sm dark:border-white/10 dark:bg-neutral-800/60"
          >
            <img src={post.media_url || post.thumbnail_url} alt="Post" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-neutral-700 dark:text-neutral-200">{post.caption || '—'}</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-neutral-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.like_count ?? 0}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comments_count ?? 0}</span>
                <span>{new Date(post.timestamp).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Editar</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600">Excluir</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ComentariosTab() {
  const comments = [
    { id: '1', post: 'Post sobre harmonização', user: 'Maria Silva', avatar: 'MS', text: 'Que resultado incrível! Quero marcar! 😍', time: '2h', liked: false },
    { id: '2', post: 'Post skincare', user: 'Ana Costa', avatar: 'AC', text: 'Vocês atendem em qual cidade?', time: '5h', liked: true },
    { id: '3', post: 'Nova técnica', user: 'Julia Mendes', avatar: 'JM', text: 'Amei! Já fiz e recomendo muito ❤️', time: '1d', liked: false },
    { id: '4', post: 'Post sobre harmonização', user: 'Carla Oliveira', avatar: 'CO', text: 'Quanto custa o procedimento completo?', time: '2d', liked: false },
  ]

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Comentários Recentes</h3>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-white/40 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <div className="mb-2 flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white">
                {c.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-800 dark:text-white">{c.user}</span>
                  <span className="text-xs text-neutral-400">{c.time}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{c.post}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{c.text}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                <MessageSquare className="h-3 w-3" />
                Responder
              </Button>
              <Button variant="ghost" size="sm" className={cn('h-7 gap-1 text-xs', c.liked && 'text-red-500')}>
                <Heart className={cn('h-3 w-3', c.liked && 'fill-red-500 text-red-500')} />
                Curtir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReacoesTab() {
  const reactions = [
    { id: '1', post: 'Post skincare', user: 'Maria Silva', avatar: 'MS', emoji: '❤️', time: '1h' },
    { id: '2', post: 'Nova técnica', user: 'João Souza', avatar: 'JS', emoji: '🔥', time: '3h' },
    { id: '3', post: 'Post harmonização', user: 'Ana Costa', avatar: 'AC', emoji: '😍', time: '5h' },
    { id: '4', post: 'Post skincare', user: 'Beatriz Lima', avatar: 'BL', emoji: '👏', time: '1d' },
    { id: '5', post: 'Nova técnica', user: 'Carla Oliveira', avatar: 'CO', emoji: '❤️', time: '1d' },
  ]

  const emojiCounts: Record<string, number> = {}
  reactions.forEach(r => { emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1 })

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Reações nos Posts</h3>
      <div className="flex gap-3 flex-wrap">
        {Object.entries(emojiCounts).map(([emoji, count]) => (
          <div key={emoji} className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm font-medium dark:border-white/10 dark:bg-neutral-800/60">
            <span className="text-lg">{emoji}</span>
            <span className="text-neutral-700 dark:text-neutral-200">{count}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {reactions.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-neutral-800/60">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white">
              {r.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-neutral-800 dark:text-white">{r.user}</span>
              <span className="mx-1.5 text-neutral-400">reagiu com</span>
              <span className="text-base">{r.emoji}</span>
              <span className="ml-2 text-xs text-neutral-400">no {r.post}</span>
            </div>
            <span className="text-xs text-neutral-400">{r.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DMTab({ dms }: { dms: InstagramDM[] }) {
  const [selectedDM, setSelectedDM] = useState<InstagramDM | null>(null)
  const [message, setMessage] = useState('')

  const messages = [
    { id: '1', from: 'them', text: selectedDM?.lastMessage || '', time: selectedDM?.time || '' },
    { id: '2', from: 'me', text: 'Olá! Obrigada pelo contato. Como posso te ajudar?', time: '10:33' },
  ]

  if (selectedDM) {
    return (
      <div className="flex h-[520px] flex-col rounded-2xl border border-white/40 bg-white/60 shadow-sm dark:border-white/10 dark:bg-neutral-800/60 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/30 px-4 py-3 dark:border-white/10">
          <button onClick={() => setSelectedDM(null)} className="text-xs text-neutral-400 hover:text-neutral-600">← Voltar</button>
          <img src={selectedDM.userAvatar} alt={selectedDM.userName} className="h-8 w-8 rounded-full object-cover" />
          <span className="font-semibold text-sm text-neutral-800 dark:text-white">{selectedDM.userName}</span>
          <Badge className="ml-auto bg-gradient-to-r from-pink-400 to-purple-500 text-white text-[10px]">Instagram DM</Badge>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex', msg.from === 'me' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                msg.from === 'me'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'border border-white/40 bg-white/80 text-neutral-800 dark:border-white/10 dark:bg-neutral-700/60 dark:text-white'
              )}>
                {msg.text}
                <div className={cn('mt-0.5 text-[10px]', msg.from === 'me' ? 'text-white/60' : 'text-neutral-400')}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-white/30 p-3 dark:border-white/10">
          <input
            className="flex-1 rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 dark:border-white/10 dark:bg-neutral-700/60 dark:text-white"
            placeholder="Escreva uma mensagem..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90">Enviar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-800 dark:text-white">Mensagens Diretas (DM)</h3>
      <div className="space-y-2">
        {dms.map((dm) => (
          <button
            key={dm.id}
            onClick={() => setSelectedDM(dm)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/40 bg-white/60 px-4 py-3 text-left shadow-sm transition-all hover:bg-white/80 dark:border-white/10 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/60"
          >
            <div className="relative flex-shrink-0">
              <img src={dm.userAvatar} alt={dm.userName} className="h-10 w-10 rounded-full object-cover" />
              {dm.unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-[9px] font-bold text-white">
                  {dm.unread}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-800 dark:text-white">{dm.userName}</span>
                <span className="text-xs text-neutral-400">{dm.time}</span>
              </div>
              <p className={cn('truncate text-xs', dm.unread > 0 ? 'font-medium text-neutral-700 dark:text-neutral-200' : 'text-neutral-400')}>{dm.lastMessage}</p>
            </div>
          </button>
        ))}
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
        <ConnectInstagramScreen appConfigured={status?.appConfigured ?? false} configIdConfigured={status?.configIdConfigured ?? false} />
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
            {activeTab === 'feed' && <FeedTab posts={media} loading={mediaLoading} onRefresh={fetchMedia} />}
            {activeTab === 'posts' && <PostsTab posts={media} loading={mediaLoading} />}
            {activeTab === 'comentarios' && <ComentariosTab />}
            {activeTab === 'reacoes' && <ReacoesTab />}
            {activeTab === 'dm' && <DMTab dms={MOCK_DMS} />}
          </div>
        </>
      )}
    </div>
  )
}
