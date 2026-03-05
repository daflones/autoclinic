import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Building2, Wifi, CreditCard, MessageSquare,
  LogOut, RefreshCw, Trash2, Plus, Edit2, Check, X, Loader2,
  Eye, EyeOff, AlertTriangle, Zap,
  Sparkles, Crown, Activity, TrendingUp,
  Search, Save, WifiOff, Signal,
} from 'lucide-react'
import { toast } from '@/lib/toast'

/* ─────────────────────── tipos ─────────────────────── */

interface AdminUser { id: string; email: string; cargo: string; nome?: string; created_at?: string }
interface Clinica {
  id: string; full_name: string; email: string; role: string; status: string
  created_at: string; plano_ativo?: boolean; plano_expira_em?: string
  instancia_whatsapp?: string; whatsapp_status?: string
  tokens_count?: string; total_tokens?: string
}
interface PlanoFeature { text: string; highlight: boolean }
interface Plano {
  id: string; slug: string; nome: string; tagline: string; preco: number
  tokens: string; descricao: string; popular: boolean; ordem: number; ativo: boolean
  features: PlanoFeature[]; not_included: PlanoFeature[]
}
interface WhatsAppStatus {
  clinica_id: string; clinica_nome: string; instancia: string; estado: string
}

/* ─────────────────────── helpers ─────────────────────── */

function adminFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('admin_token') || ''
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers as Record<string, string> || {}),
    },
  })
}

function statusClinica(c: Clinica) {
  if (!c.plano_ativo) return 'sem_plano'
  if (c.plano_expira_em && new Date(c.plano_expira_em) < new Date()) return 'atrasado'
  return 'em_dia'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    em_dia:    { label: 'Em dia',    cls: 'bg-green-100 text-green-700 border-green-200' },
    atrasado:  { label: 'Em atraso', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    sem_plano: { label: 'Sem plano', cls: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
  }
  const s = map[status] ?? map.sem_plano
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function WaBadge({ estado }: { estado: string }) {
  const e = estado?.toLowerCase()
  if (e === 'open' || e === 'connected') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      <Signal className="h-3 w-3" /> Conectado
    </span>
  )
  if (e === 'connecting' || e === 'qr') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-200 px-2.5 py-0.5 text-xs font-semibold text-yellow-700">
      <Loader2 className="h-3 w-3 animate-spin" /> Aguardando QR
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-600">
      <WifiOff className="h-3 w-3" /> Desconectado
    </span>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-neutral-100 bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="font-display text-xl font-bold text-neutral-900 mb-2">Confirmar ação</h3>
        <p className="text-sm text-neutral-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 h-10 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 transition-colors">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── seção Admins ─────────────────────── */

function AdminsSection({ currentAdmin }: { currentAdmin: AdminUser }) {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '' })
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [confirm, setConfirm] = useState<{ id: string; email: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/admins')
      const data = await res.json()
      setAdmins(Array.isArray(data) ? data : [])
    } catch { toast.error('Erro ao carregar admins') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ ...form, cargo: 'dev' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Admin criado com sucesso')
      setForm({ email: '', password: '', nome: '' })
      setShowForm(false)
      load()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/admins/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Admin removido')
      setAdmins(prev => prev.filter(a => a.id !== id))
    } catch (err: any) { toast.error(err.message) }
    finally { setConfirm(null) }
  }

  return (
    <div className="space-y-6">
      {confirm && (
        <ConfirmModal
          message={`Remover admin "${confirm.email}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Gestão de Admins</h2>
          <p className="text-sm text-neutral-500">Usuários com acesso total ao painel</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4" />
          Novo Admin
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-6">
          <h3 className="font-display text-base font-bold text-neutral-900 mb-4">Criar novo admin</h3>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600">Nome</label>
              <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600">E-mail *</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@email.com"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-600">Senha *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 pr-9 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-3 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-white transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="h-9 px-5 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-400" /></div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">Nenhum admin encontrado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Admin</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Cargo</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Criado em</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-bold text-white shadow-sm">
                        {(admin.nome || admin.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{admin.nome || '—'}</p>
                        <p className="text-xs text-neutral-400">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-700 font-mono">{admin.cargo}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-neutral-500">
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {admin.id !== currentAdmin.id && (
                      <button onClick={() => setConfirm({ id: admin.id, email: admin.email })}
                        className="rounded-xl p-2 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {admin.id === currentAdmin.id && (
                      <span className="text-xs text-neutral-300 italic">você</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── Helpers compartilhados ─────────────────────── */

function InfoField({ label, value, edit, onChange, type = 'text', options }: {
  label: string; value: any; edit?: boolean
  onChange?: (v: string) => void; type?: string
  options?: { value: string; label: string }[]
}) {
  const display = value !== null && value !== undefined && value !== '' ? String(value) : '—'
  if (!edit) return (
    <div>
      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-neutral-900 break-words">{display}</p>
    </div>
  )
  if (options) return (
    <div>
      <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-0.5">{label}</label>
      <select value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        className="h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm focus:border-primary-400 focus:outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
  return (
    <div>
      <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-0.5">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
        className="h-8 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm focus:border-primary-400 focus:outline-none" />
    </div>
  )
}

/* Renderiza qualquer valor JSONB (objeto/array) de forma legível */
function JsonbView({ value }: { value: any }) {
  if (value === null || value === undefined) return <span className="text-neutral-300">—</span>
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sm text-neutral-800">{String(value)}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-neutral-300 text-sm italic">lista vazia</span>
    return (
      <div className="space-y-1">
        {value.map((item: any, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-400" />
            <JsonbView value={item} />
          </div>
        ))}
      </div>
    )
  }
  // objeto
  const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (entries.length === 0) return <span className="text-neutral-300 text-sm italic">vazio</span>
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mt-0.5 w-28 truncate">{k.replace(/_/g, ' ')}</span>
          <div className="min-w-0 flex-1">
            {(typeof v === 'object' && v !== null)
              ? <JsonbView value={v} />
              : <span className="text-sm text-neutral-800 break-words">{String(v)}</span>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

/* InfoField com suporte a JSONB: se value for objeto/array, exibe via JsonbView */
function JsonbInfoField({ label, value }: { label: string; value: any }) {
  const isComplex = value !== null && value !== undefined && typeof value === 'object'
  return (
    <div className={isComplex ? 'col-span-2' : ''}>
      <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">{label}</p>
      {isComplex
        ? <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2"><JsonbView value={value} /></div>
        : <p className="text-sm font-semibold text-neutral-900 break-words">{value !== null && value !== undefined && value !== '' ? String(value) : '—'}</p>
      }
    </div>
  )
}

function DrawerSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400">{title}</h4>
        {count !== undefined && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">{count}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return <p className="py-10 text-center text-sm text-neutral-400">{msg}</p>
}

function fmt(v?: string | null) {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString('pt-BR') } catch { return v }
}

function brl(v?: number | string | null) {
  if (v === null || v === undefined || v === '') return '—'
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

/* ─────────────────────── Modal editar tokens ─────────────────────── */

function TokensModal({ clinica, onClose, onSaved }: { clinica: Clinica; onClose: () => void; onSaved: () => void }) {
  const [totalTokens, setTotalTokens] = useState(String(clinica.total_tokens || ''))
  const [tokensCount, setTokensCount] = useState(String(clinica.tokens_count || ''))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/clinicas/${clinica.id}/tokens`, {
        method: 'PATCH',
        body: JSON.stringify({ total_tokens: totalTokens, tokens_count: tokensCount }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Tokens atualizados')
      onSaved()
      onClose()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-3xl border border-neutral-100 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-neutral-900">Editar tokens</h3>
            <p className="text-xs text-neutral-400 mt-0.5">{clinica.full_name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-600">Total de tokens</label>
            <input value={totalTokens} onChange={e => setTotalTokens(e.target.value)} placeholder="ex: 10000"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-neutral-600">Tokens usados</label>
            <input value={tokensCount} onChange={e => setTokensCount(e.target.value)} placeholder="ex: 2500"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 h-10 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Painel de contexto da clínica (inline) ─────────────────────── */

type ClinicaTab = 'dados' | 'pacientes' | 'procedimentos' | 'protocolos' | 'planos_tratamento' | 'agendamentos' | 'sessoes' | 'chats' | 'whatsapp' | 'ia_config'

const CLINICA_MENU: { key: ClinicaTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dados',            label: 'Dados',            icon: <Building2 className="h-4 w-4" /> },
  { key: 'pacientes',        label: 'Pacientes',        icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { key: 'procedimentos',    label: 'Procedimentos',    icon: <Activity className="h-4 w-4" /> },
  { key: 'protocolos',       label: 'Protocolos',       icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'planos_tratamento',label: 'Planos Trat.',     icon: <CreditCard className="h-4 w-4" /> },
  { key: 'agendamentos',     label: 'Agendamentos',     icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
  { key: 'sessoes',          label: 'Sessões',          icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { key: 'chats',            label: 'Chats',            icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'whatsapp',         label: 'WhatsApp',         icon: <Wifi className="h-4 w-4" /> },
  { key: 'ia_config',        label: 'Config IA',        icon: <Zap className="h-4 w-4" /> },
]

function ClinicaContextPanel({
  clinica, onClose, onDelete, onRefresh,
}: {
  clinica: Clinica; onClose: () => void; onDelete: () => void; onRefresh: () => void
}) {
  const [tab, setTab] = useState<ClinicaTab>('dados')
  const [data, setData] = useState<any[]>([])
  const [single, setSingle] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  // WhatsApp state
  const [waStatuses, setWaStatuses] = useState<WhatsAppStatus[]>([])
  const [waLoading, setWaLoading] = useState(false)
  const [waRestarting, setWaRestarting] = useState<string | null>(null)
  const [waDeleting, setWaDeleting] = useState<string | null>(null)
  const [waConfirmDelete, setWaConfirmDelete] = useState<WhatsAppStatus | null>(null)
  // Chats state
  const [conversas, setConversas] = useState<any[]>([])
  const [selConversa, setSelConversa] = useState<any>(null)
  const [mensagens, setMensagens] = useState<any[]>([])
  const [loadingConversas, setLoadingConversas] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchChat, setSearchChat] = useState('')
  // Dados (clinica edit)
  const [clinicaEdit, setClinicaEdit] = useState<Partial<Clinica>>({})
  const [editingDados, setEditingDados] = useState(false)
  const [savingDados, setSavingDados] = useState(false)
  const [showTokensModal, setShowTokensModal] = useState(false)

  const endpointMap: Record<ClinicaTab, string> = {
    dados:            `historico`,
    pacientes:        `pacientes`,
    procedimentos:    `procedimentos-full`,
    protocolos:       `protocolos`,
    planos_tratamento:`planos-tratamento`,
    agendamentos:     `agendamentos`,
    sessoes:          `sessoes`,
    ia_config:        `ia-config`,
    chats:            `chats`,
    whatsapp:         ``,
  }

  const patchMap: Record<string, string> = {
    pacientes:         `pacientes`,
    procedimentos:     `procedimentos`,
    protocolos:        `protocolos`,
    planos_tratamento: `planos-tratamento`,
    ia_config:         `ia-config`,
  }

  const load = useCallback(async (t: ClinicaTab) => {
    setData([]); setSingle(null); setEditId(null); setSelectedItem(null); setSearch('')
    if (t === 'whatsapp') {
      setWaLoading(true)
      try {
        const res = await adminFetch('/api/admin/whatsapp-status')
        const d = await res.json()
        const arr = Array.isArray(d) ? d : []
        setWaStatuses(arr.filter((s: WhatsAppStatus) => s.clinica_id === clinica.id))
      } catch { toast.error('Erro ao carregar WhatsApp') }
      finally { setWaLoading(false) }
      return
    }
    if (t === 'chats') {
      setLoadingConversas(true)
      try {
        const res = await adminFetch(`/api/admin/clinicas/${clinica.id}/chats`)
        const d = await res.json()
        setConversas(Array.isArray(d) ? d : [])
      } catch { toast.error('Erro ao carregar chats') }
      finally { setLoadingConversas(false) }
      return
    }
    setLoading(true)
    try {
      const ep = endpointMap[t]
      if (!ep) return
      const res = await adminFetch(`/api/admin/clinicas/${clinica.id}/${ep}`)
      const d = await res.json()
      if (Array.isArray(d)) setData(d)
      else setSingle(d)
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [clinica.id]) // eslint-disable-line

  useEffect(() => { load(tab) }, [tab]) // eslint-disable-line

  // polling chats 8s
  useEffect(() => {
    if (tab !== 'chats' || !selConversa) return
    const t = setInterval(async () => {
      try {
        const res = await adminFetch(`/api/admin/clinicas/${clinica.id}/chats/${selConversa.id}/mensagens`)
        const d = await res.json()
        if (Array.isArray(d)) setMensagens(d)
      } catch { /* silent */ }
    }, 8000)
    return () => clearInterval(t)
  }, [tab, selConversa, clinica.id])

  const loadMensagens = async (conv: any) => {
    setSelConversa(conv); setLoadingMsgs(true)
    try {
      const res = await adminFetch(`/api/admin/clinicas/${clinica.id}/chats/${conv.id}/mensagens`)
      const d = await res.json()
      setMensagens(Array.isArray(d) ? d : [])
    } catch { toast.error('Erro ao carregar mensagens') }
    finally { setLoadingMsgs(false) }
  }

  const handleSaveItem = async (id?: string) => {
    setSaving(true)
    try {
      const base = patchMap[tab]
      if (!base) return
      const url = `/api/admin/clinicas/${clinica.id}/${base}${id ? `/${id}` : ''}`
      // For ia_config, each field is a JSON string from a textarea — parse before sending
      let payload = { ...editBuf }
      if (tab === 'ia_config') {
        const iaKeys = ['identidade','posicionamento','politicas','prova_social','regras_internas','gatilhos_diferenciais','midias','profissionais','extra']
        for (const k of iaKeys) {
          if (payload[k] !== undefined) {
            const raw = payload[k]
            if (typeof raw === 'string') {
              const trimmed = raw.trim()
              if (trimmed === '' || trimmed === '{}' || trimmed === '[]') {
                payload[k] = k === 'profissionais' ? [] : {}
              } else {
                try { payload[k] = JSON.parse(trimmed) }
                catch { throw new Error(`JSON inválido em "${k}": corrija o formato e tente novamente`) }
              }
            }
          }
        }
      }
      const res = await adminFetch(url, { method: 'PATCH', body: JSON.stringify(payload) })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Salvo com sucesso')
      setEditId(null)
      setEditBuf({})
      setSelectedItem((prev: any) => prev ? { ...prev, ...payload } : prev)
      setData(prev => prev.map(item => item.id === id ? { ...item, ...payload } : item))
      if (single) setSingle((prev: any) => ({ ...prev, ...payload }))
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const handleSaveDados = async () => {
    setSavingDados(true)
    try {
      const res = await adminFetch(`/api/admin/clinicas/${clinica.id}`, {
        method: 'PATCH', body: JSON.stringify(clinicaEdit),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Clínica atualizada')
      setEditingDados(false); onRefresh()
    } catch (err: any) { toast.error(err.message) }
    finally { setSavingDados(false) }
  }

  const handleWaRestart = async (instancia: string) => {
    setWaRestarting(instancia)
    try {
      const res = await adminFetch(`/api/admin/whatsapp-restart/${encodeURIComponent(instancia)}`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Instância reiniciada')
      setTimeout(() => load('whatsapp'), 2000)
    } catch (err: any) { toast.error(err.message) }
    finally { setWaRestarting(null) }
  }

  const handleWaDelete = async (instancia: string) => {
    setWaDeleting(instancia)
    try {
      const res = await adminFetch(`/api/admin/whatsapp-instance/${encodeURIComponent(instancia)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Instância deletada')
      setWaStatuses(prev => prev.filter(s => s.instancia !== instancia))
    } catch (err: any) { toast.error(err.message) }
    finally { setWaDeleting(null); setWaConfirmDelete(null) }
  }

  const filtered = data.filter(item => {
    if (!search) return true
    return JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  })

  const fmtTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts < 1e12 ? ts * 1000 : ts)
    const hoje = new Date()
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  const filteredConversas = conversas.filter(c => {
    if (!searchChat) return true
    const q = searchChat.toLowerCase()
    return (c.nome_contato || '').toLowerCase().includes(q) || (c.numero_telefone || '').includes(q) || c.remote_jid.includes(q)
  })

  return (
    <div className="bg-neutral-50/80 border-t border-neutral-100">
      {waConfirmDelete && (
        <ConfirmModal
          message={`Deletar instância "${waConfirmDelete.instancia}"? Esta ação desconectará o WhatsApp desta clínica.`}
          onConfirm={() => handleWaDelete(waConfirmDelete.instancia)}
          onCancel={() => setWaConfirmDelete(null)}
        />
      )}

      <div className="flex" style={{ minHeight: 480 }}>
        {/* Sidebar */}
        <div className="w-48 shrink-0 border-r border-neutral-200 bg-white flex flex-col py-3">
          {/* Clinic badge */}
          <div className="px-4 pb-3 border-b border-neutral-100 mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white text-xs font-bold">
                {(clinica.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <p className="text-xs font-bold text-neutral-900 truncate">{clinica.full_name}</p>
            </div>
          </div>
          {/* Menu items */}
          {CLINICA_MENU.map(m => (
            <button key={m.key} onClick={() => setTab(m.key)}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors text-left ${
                tab === m.key
                  ? 'bg-primary-50 text-primary-700 font-semibold border-r-2 border-primary-500'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`}>
              <span className={tab === m.key ? 'text-primary-500' : 'text-neutral-400'}>{m.icon}</span>
              {m.label}
            </button>
          ))}
          {/* Ações */}
          <div className="mt-auto px-3 pt-3 border-t border-neutral-100 space-y-1.5">
            <button onClick={onDelete}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Deletar clínica
            </button>
            <button onClick={onClose}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 transition-colors">
              <X className="h-3.5 w-3.5" /> Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── DADOS ── */}
          {tab === 'dados' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">Dados da Clínica</h3>
                <div className="flex gap-2">
                  {editingDados ? (
                    <>
                      <button onClick={handleSaveDados} disabled={savingDados}
                        className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60">
                        {savingDados ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
                      </button>
                      <button onClick={() => { setEditingDados(false); setClinicaEdit({}) }}
                        className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingDados(true); setClinicaEdit({}) }}
                      className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-600">
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'full_name', label: 'Nome' },
                  { key: 'email',     label: 'E-mail' },
                  { key: 'role',      label: 'Role' },
                ].map(f => (
                  <InfoField key={f.key} label={f.label}
                    value={editingDados ? (clinicaEdit[f.key as keyof Clinica] ?? clinica[f.key as keyof Clinica]) : clinica[f.key as keyof Clinica]}
                    edit={editingDados}
                    onChange={v => setClinicaEdit(p => ({ ...p, [f.key]: v }))} />
                ))}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
              ) : single && (
                <div className="space-y-4">
                  <DrawerSection title="Plano atual">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Plano ativo',    value: single.plano_ativo ? 'Sim' : 'Não' },
                        { label: 'Expira em',       value: fmt(single.plano_expira_em) },
                        { label: 'Tokens totais',   value: single.total_tokens ? Number(single.total_tokens).toLocaleString('pt-BR') : '—' },
                        { label: 'Tokens usados',   value: single.tokens_count ? Number(single.tokens_count).toLocaleString('pt-BR') : '—' },
                        { label: 'Cadastrado em',   value: fmt(single.created_at) },
                        { label: 'Atualizado em',   value: fmt(single.updated_at) },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-white border border-neutral-100 p-3 shadow-sm">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">{item.label}</p>
                          <p className="text-sm font-bold text-neutral-900 mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </DrawerSection>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await adminFetch(`/api/admin/clinicas/${clinica.id}`, {
                            method: 'PATCH', body: JSON.stringify({ plano_ativo: !single.plano_ativo }),
                          })
                          if (!res.ok) throw new Error((await res.json()).error)
                          toast.success(single.plano_ativo ? 'Plano desativado' : 'Plano ativado')
                          load('dados'); onRefresh()
                        } catch (err: any) { toast.error(err.message) }
                      }}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold border transition-colors ${
                        single.plano_ativo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}>
                      <Activity className="h-4 w-4" />
                      {single.plano_ativo ? 'Desativar plano' : 'Ativar plano'}
                    </button>
                    <button
                      onClick={() => setShowTokensModal(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-600 transition-colors">
                      <Edit2 className="h-4 w-4" /> Editar tokens
                    </button>
                    {showTokensModal && (
                      <TokensModal
                        clinica={clinica}
                        onClose={() => setShowTokensModal(false)}
                        onSaved={() => { setShowTokensModal(false); load('dados'); onRefresh() }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LISTAS (Pacientes / Procedimentos / Protocolos / Planos Trat. / Agendamentos / Sessões) ── */}
          {['pacientes','procedimentos','protocolos','planos_tratamento','agendamentos','sessoes'].includes(tab) && (
            <>
              {/* Lista */}
              <div className={`flex flex-col overflow-y-auto ${selectedItem ? 'w-72 shrink-0 border-r border-neutral-200' : 'flex-1'}`}>
                {/* Search bar */}
                <div className="sticky top-0 z-10 border-b border-neutral-100 bg-white px-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar..."
                      className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs focus:border-primary-300 focus:outline-none" />
                  </div>
                </div>
                {loading ? (
                  <div className="flex flex-1 items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
                ) : filtered.length === 0 ? (
                  <EmptyState msg="Nenhum registro encontrado" />
                ) : (
                  <div className="divide-y divide-neutral-50 overflow-y-auto">
                    {filtered.map((item: any) => {
                      const title = item.nome_completo || item.nome || item.titulo || '—'
                      const sub = tab === 'pacientes' ? (item.telefone || item.email || '—')
                        : tab === 'procedimentos' ? brl(item.valor_base)
                        : tab === 'protocolos' ? brl(item.preco)
                        : tab === 'planos_tratamento' ? fmt(item.created_at)
                        : tab === 'agendamentos' ? `${fmt(item.data_inicio)} · ${brl(item.valor)}`
                        : `${fmt(item.inicio_previsto)} · ${item.duracao_minutos ? item.duracao_minutos + ' min' : '—'}`
                      const statusVal = item.status || (item.ativo === true ? 'ativo' : item.ativo === false ? 'inativo' : null)
                      const isClickable = ['pacientes','procedimentos','protocolos','planos_tratamento'].includes(tab)
                      const isSelected = selectedItem?.id === item.id
                      return (
                        <div key={item.id}
                          onClick={isClickable ? () => { setSelectedItem(item); setEditId(null); setEditBuf({}) } : undefined}
                          className={`px-4 py-3 ${isClickable ? 'cursor-pointer hover:bg-neutral-50' : ''} ${isSelected ? 'bg-primary-50' : ''} transition-colors`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary-700' : 'text-neutral-900'}`}>{title}</p>
                            {statusVal && (
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                ['ativo','confirmado','realizada','realizado'].includes(statusVal) ? 'bg-green-100 text-green-700' :
                                ['cancelado','cancelada','inativo'].includes(statusVal) ? 'bg-red-100 text-red-600' :
                                statusVal === 'concluido' ? 'bg-blue-100 text-blue-700' :
                                'bg-neutral-100 text-neutral-500'
                              }`}>{statusVal}</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5 truncate">{sub}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Detalhe */}
              {selectedItem && ['pacientes','procedimentos','protocolos','planos_tratamento'].includes(tab) && (
                <div className="flex-1 overflow-y-auto bg-white">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-5 py-3">
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {selectedItem.nome_completo || selectedItem.nome || selectedItem.titulo || 'Detalhe'}
                    </p>
                    <div className="flex items-center gap-2">
                      {editId === selectedItem.id ? (
                        <>
                          <button onClick={() => handleSaveItem(selectedItem.id)} disabled={saving}
                            className="flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-60">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
                          </button>
                          <button onClick={() => setEditId(null)} className="rounded-xl border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => { setEditId(selectedItem.id); setEditBuf({}) }}
                          className="flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-600">
                          <Edit2 className="h-3.5 w-3.5" /> Editar
                        </button>
                      )}
                      <button onClick={() => setSelectedItem(null)} className="rounded-xl border border-neutral-200 p-1.5 text-neutral-500 hover:bg-neutral-50">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    {tab === 'pacientes' && (
                      <>
                        <DrawerSection title="Dados pessoais">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'nome_completo',  label: 'Nome completo' },
                              { key: 'nome_social',    label: 'Nome social' },
                              { key: 'documento',      label: 'CPF/Documento' },
                              { key: 'data_nascimento',label: 'Nascimento', type: 'date' },
                              { key: 'sexo',           label: 'Sexo', options: [{value:'masculino',label:'Masculino'},{value:'feminino',label:'Feminino'},{value:'outro',label:'Outro'}] },
                              { key: 'status',         label: 'Status', options: [{value:'ativo',label:'Ativo'},{value:'inativo',label:'Inativo'},{value:'lead',label:'Lead'}] },
                            ].map(f => (
                              <InfoField key={f.key} label={f.label} type={(f as any).type}
                                value={editId === selectedItem.id ? (editBuf[f.key] ?? selectedItem[f.key]) : selectedItem[f.key]}
                                edit={editId === selectedItem.id} options={(f as any).options}
                                onChange={v => setEditBuf(p => ({ ...p, [f.key]: v }))} />
                            ))}
                          </div>
                        </DrawerSection>
                        <DrawerSection title="Contato">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'telefone', label: 'Telefone' },
                              { key: 'whatsapp', label: 'WhatsApp' },
                              { key: 'email',    label: 'E-mail' },
                              { key: 'origem',   label: 'Origem' },
                            ].map(f => (
                              <InfoField key={f.key} label={f.label}
                                value={editId === selectedItem.id ? (editBuf[f.key] ?? selectedItem[f.key]) : selectedItem[f.key]}
                                edit={editId === selectedItem.id}
                                onChange={v => setEditBuf(p => ({ ...p, [f.key]: v }))} />
                            ))}
                          </div>
                        </DrawerSection>
                        <DrawerSection title="Funil de vendas">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'status_conversao',       label: 'Status conversão' },
                              { key: 'nivel_interesse',        label: 'Nível interesse' },
                              { key: 'fase_conversao',         label: 'Fase conversão' },
                              { key: 'procedimento_interesse', label: 'Procedimento interesse' },
                            ].map(f => (
                              <InfoField key={f.key} label={f.label}
                                value={editId === selectedItem.id ? (editBuf[f.key] ?? selectedItem[f.key]) : selectedItem[f.key]}
                                edit={editId === selectedItem.id}
                                onChange={v => setEditBuf(p => ({ ...p, [f.key]: v }))} />
                            ))}
                          </div>
                        </DrawerSection>
                        <DrawerSection title="Datas">
                          <div className="grid grid-cols-2 gap-3">
                            <InfoField label="Cadastrado em" value={fmt(selectedItem.created_at)} />
                            <InfoField label="Atualizado em" value={fmt(selectedItem.updated_at)} />
                          </div>
                        </DrawerSection>
                        {selectedItem.observacoes && (
                          <DrawerSection title="Observações">
                            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{selectedItem.observacoes}</p>
                            </div>
                          </DrawerSection>
                        )}
                        {(() => {
                          const knownKeys = new Set(['id','nome_completo','nome_social','documento','data_nascimento','sexo','status','telefone','whatsapp','email','origem','status_conversao','nivel_interesse','fase_conversao','procedimento_interesse','created_at','updated_at','admin_profile_id','observacoes'])
                          const extras = Object.entries(selectedItem).filter(([k,v]) => !knownKeys.has(k) && v !== null && v !== undefined && v !== '')
                          if (!extras.length) return null
                          return (
                            <DrawerSection title="Campos adicionais">
                              <div className="grid grid-cols-2 gap-3">
                                {extras.map(([k, v]) => (
                                  <JsonbInfoField key={k} label={k.replace(/_/g,' ')} value={v} />
                                ))}
                              </div>
                            </DrawerSection>
                          )
                        })()}
                      </>
                    )}
                    {tab === 'procedimentos' && (
                      <>
                        <DrawerSection title="Informações gerais">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'nome',                 label: 'Nome' },
                              { key: 'categoria',            label: 'Categoria' },
                              { key: 'valor_base',           label: 'Valor base', type: 'number' },
                              { key: 'duracao_estimada_min', label: 'Duração (min)', type: 'number' },
                              { key: 'sessoes_previstas',    label: 'Sessões previstas', type: 'number' },
                              { key: 'ativo', label: 'Ativo', options: [{value:'true',label:'Sim'},{value:'false',label:'Não'}] },
                            ].map(f => (
                              <InfoField key={f.key} label={f.label} type={(f as any).type}
                                value={editId === selectedItem.id ? (editBuf[f.key] ?? selectedItem[f.key]) : selectedItem[f.key]}
                                edit={editId === selectedItem.id} options={(f as any).options}
                                onChange={v => setEditBuf(p => ({ ...p, [f.key]: v }))} />
                            ))}
                          </div>
                        </DrawerSection>
                        <DrawerSection title="Descrição">
                          {editId === selectedItem.id
                            ? <textarea rows={3} value={editBuf.descricao ?? selectedItem.descricao ?? ''}
                                onChange={e => setEditBuf(p => ({ ...p, descricao: e.target.value }))}
                                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm resize-none focus:border-primary-400 focus:outline-none" />
                            : <p className="text-sm text-neutral-700 whitespace-pre-wrap">{selectedItem.descricao || '—'}</p>
                          }
                        </DrawerSection>
                        {selectedItem.opcoes_marcadas && Array.isArray(selectedItem.opcoes_marcadas) && selectedItem.opcoes_marcadas.length > 0 && (
                          <DrawerSection title={`Opções marcadas (${selectedItem.opcoes_marcadas.length})`}>
                            <div className="space-y-1">
                              {selectedItem.opcoes_marcadas.map((op: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                                  {typeof op === 'string'
                                    ? <p className="text-sm text-neutral-800">{op}</p>
                                    : <JsonbView value={op} />
                                  }
                                </div>
                              ))}
                            </div>
                          </DrawerSection>
                        )}
                        {selectedItem.etapas && Array.isArray(selectedItem.etapas) && selectedItem.etapas.length > 0 && (
                          <DrawerSection title={`Etapas (${selectedItem.etapas.length})`}>
                            <div className="space-y-1.5">
                              {selectedItem.etapas.map((et: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 rounded-lg border border-neutral-100 bg-white px-3 py-2">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">{i+1}</span>
                                  <div className="min-w-0 flex-1">
                                    {typeof et === 'string'
                                      ? <p className="text-sm font-semibold text-neutral-900">{et}</p>
                                      : <JsonbView value={et} />
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DrawerSection>
                        )}
                        {(() => {
                          const r = selectedItem.resumo || {}
                          const s = selectedItem.sessoes || {}
                          const fields: [string, any][] = []
                          if (r.codigo) fields.push(['Código', r.codigo])
                          if (r.duracao_minutos) fields.push(['Duração (min)', r.duracao_minutos])
                          if (r.destaque !== undefined) fields.push(['Destaque', r.destaque ? 'Sim' : 'Não'])
                          if (r.cuidados_pre) fields.push(['Cuidados pré', r.cuidados_pre])
                          if (r.cuidados_durante) fields.push(['Cuidados durante', r.cuidados_durante])
                          if (r.cuidados_apos || r.cuidados_pos) fields.push(['Cuidados pós', r.cuidados_apos || r.cuidados_pos])
                          if (r.quebra_objecoes) fields.push(['Quebra objeções', r.quebra_objecoes])
                          if (r.contraindicacoes) fields.push(['Contraindicações', r.contraindicacoes])
                          if (r.observacoes) fields.push(['Observações', r.observacoes])
                          if (r.ia_informa_preco !== undefined) fields.push(['IA informa preço', r.ia_informa_preco ? 'Sim' : 'Não'])
                          if (r.ia_envia_imagens !== undefined) fields.push(['IA envia imagens', r.ia_envia_imagens ? 'Sim' : 'Não'])
                          if (r.requer_autorizacao) fields.push(['Requer autorização', r.requer_autorizacao])
                          if (r.valor_minimo) fields.push(['Valor mínimo', brl(r.valor_minimo)])
                          if (r.valor_maximo) fields.push(['Valor máximo', brl(r.valor_maximo)])
                          if (r.valor_promocional) fields.push(['Valor promocional', brl(r.valor_promocional)])
                          if (s.quantidade_recomendada) fields.push(['Sessões recomendadas', s.quantidade_recomendada])
                          if (s.intervalo) fields.push(['Intervalo entre sessões', `${s.intervalo} dias`])
                          if (!fields.length) return null
                          return (
                            <DrawerSection title="Detalhes adicionais">
                              <div className="grid grid-cols-2 gap-3">
                                {fields.map(([label, val]) => <InfoField key={label} label={label} value={String(val)} />)}
                              </div>
                            </DrawerSection>
                          )
                        })()}
                        {selectedItem.resumo?.midias && (() => {
                          const m = selectedItem.resumo.midias || selectedItem.midias || {}
                          const total = Object.values(m).reduce((acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
                          if (!total) return null
                          return (
                            <DrawerSection title={`Mídias (${total})`}>
                              <div className="space-y-1.5">
                                {Object.entries(m).map(([tipo, arquivos]: [string, any]) => Array.isArray(arquivos) && arquivos.length > 0 && (
                                  <div key={tipo} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                                    <span className="text-sm text-neutral-700 capitalize">{tipo.replace(/_/g,' ')}</span>
                                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">{arquivos.length}</span>
                                  </div>
                                ))}
                              </div>
                            </DrawerSection>
                          )
                        })()}
                        {(() => {
                          const knownKeys = new Set(['id','nome','categoria','valor_base','duracao_estimada_min','sessoes_previstas','ativo','descricao','opcoes_marcadas','etapas','resumo','sessoes','created_at','updated_at','admin_profile_id'])
                          const extras = Object.entries(selectedItem).filter(([k,v]) => !knownKeys.has(k) && v !== null && v !== undefined && v !== '' && !Array.isArray(v))
                          if (!extras.length) return null
                          return (
                            <DrawerSection title="Outros campos">
                              <div className="grid grid-cols-2 gap-3">
                                {extras.map(([k, v]) => <JsonbInfoField key={k} label={k.replace(/_/g,' ')} value={v} />)}
                              </div>
                            </DrawerSection>
                          )
                        })()}
                        <DrawerSection title="Datas">
                          <div className="grid grid-cols-2 gap-3">
                            <InfoField label="Cadastrado em" value={fmt(selectedItem.created_at)} />
                            <InfoField label="Atualizado em" value={fmt(selectedItem.updated_at)} />
                          </div>
                        </DrawerSection>
                      </>
                    )}
                    {tab === 'planos_tratamento' && (
                      <>
                        <DrawerSection title="Plano de tratamento">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'titulo',         label: 'Título' },
                              { key: 'status',         label: 'Status', options: [{value:'ativo',label:'Ativo'},{value:'pausado',label:'Pausado'},{value:'concluido',label:'Concluído'},{value:'cancelado',label:'Cancelado'}] },
                              { key: 'total_previsto', label: 'Total previsto', type: 'number' },
                              { key: 'total_pago',     label: 'Total pago', type: 'number' },
                              { key: 'validade_dias',  label: 'Validade (dias)', type: 'number' },
                              { key: 'criado_por',     label: 'Criado por' },
                            ].map(f => (
                              <InfoField key={f.key} label={f.label} type={(f as any).type}
                                value={editId === selectedItem.id ? (editBuf[f.key] ?? selectedItem[f.key]) : selectedItem[f.key]}
                                edit={editId === selectedItem.id} options={(f as any).options}
                                onChange={v => setEditBuf(p => ({ ...p, [f.key]: v }))} />
                            ))}
                          </div>
                        </DrawerSection>
                        {selectedItem.descricao && (
                          <DrawerSection title="Descrição">
                            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{selectedItem.descricao}</p>
                          </DrawerSection>
                        )}
                        {selectedItem.procedimentos && Array.isArray(selectedItem.procedimentos) && selectedItem.procedimentos.length > 0 && (
                          <DrawerSection title={`Procedimentos (${selectedItem.procedimentos.length})`}>
                            <div className="space-y-1.5">
                              {selectedItem.procedimentos.map((p: any, i: number) => (
                                <div key={i} className="rounded-lg border border-neutral-100 bg-white px-3 py-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">{i+1}</span>
                                    <p className="text-sm font-semibold text-neutral-900 truncate flex-1">
                                      {typeof p === 'string' ? p : (p.nome || p.procedimento_nome || `Procedimento ${i+1}`)}
                                    </p>
                                    {p.valor && <span className="text-xs font-semibold text-neutral-600 shrink-0">{brl(p.valor)}</span>}
                                  </div>
                                  {p.sessoes_realizadas !== undefined && (
                                    <p className="text-xs text-neutral-400 mb-1">{p.sessoes_realizadas}/{p.sessoes_totais || '?'} sessões</p>
                                  )}
                                  {typeof p === 'object' && p !== null && (() => {
                                    const sub = Object.entries(p).filter(([k,v]) => !['nome','procedimento_nome','valor','sessoes_realizadas','sessoes_totais'].includes(k) && v !== null && v !== undefined && v !== '')
                                    return sub.length > 0 ? <JsonbView value={Object.fromEntries(sub)} /> : null
                                  })()}
                                </div>
                              ))}
                            </div>
                          </DrawerSection>
                        )}
                        <DrawerSection title="Datas">
                          <div className="grid grid-cols-2 gap-3">
                            <InfoField label="Cadastrado em" value={fmt(selectedItem.created_at)} />
                            <InfoField label="Atualizado em" value={fmt(selectedItem.updated_at)} />
                            {selectedItem.paciente_id && <InfoField label="Paciente ID" value={selectedItem.paciente_id} />}
                          </div>
                        </DrawerSection>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── CHATS ── */}
          {tab === 'chats' && (
            <div className="flex flex-1 overflow-hidden">
              {/* conversas */}
              <div className="w-64 shrink-0 border-r border-neutral-200 flex flex-col overflow-hidden bg-white">
                <div className="border-b border-neutral-100 px-3 py-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                    <input value={searchChat} onChange={e => setSearchChat(e.target.value)} placeholder="Buscar..."
                      className="h-7 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs focus:border-primary-300 focus:outline-none" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-neutral-50">
                  {loadingConversas ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
                  ) : filteredConversas.length === 0 ? (
                    <EmptyState msg="Nenhuma conversa" />
                  ) : filteredConversas.map((conv: any) => (
                    <button key={conv.id} onClick={() => loadMensagens(conv)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${selConversa?.id === conv.id ? 'bg-primary-50' : 'hover:bg-neutral-50'}`}>
                      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold overflow-hidden">
                        {conv.foto_perfil_url ? <img src={conv.foto_perfil_url} alt="" className="h-full w-full object-cover" /> : (conv.nome_contato || '?').charAt(0).toUpperCase()}
                        {(conv.mensagens_nao_lidas ?? 0) > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary-500 text-[8px] font-bold text-white">{conv.mensagens_nao_lidas}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-neutral-900 truncate">{conv.nome_contato || conv.remote_jid.split('@')[0]}</p>
                          <span className="text-[10px] text-neutral-400 shrink-0 ml-1">{fmtTime(conv.ultima_mensagem_timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate">{conv.ultima_mensagem || '—'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {/* mensagens */}
              <div className="flex-1 flex flex-col overflow-hidden bg-neutral-50/40">
                {selConversa ? (
                  <>
                    <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-white px-4 py-2.5 shrink-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold overflow-hidden">
                        {selConversa.foto_perfil_url ? <img src={selConversa.foto_perfil_url} alt="" className="h-full w-full object-cover" /> : (selConversa.nome_contato || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-neutral-900">{selConversa.nome_contato || selConversa.remote_jid.split('@')[0]}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{selConversa.remote_jid}</p>
                      </div>
                      <button onClick={() => loadMensagens(selConversa)} className="ml-auto rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {loadingMsgs && mensagens.length === 0
                        ? <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
                        : mensagens.length === 0 ? <EmptyState msg="Nenhuma mensagem" />
                        : mensagens.map((msg: any) => (
                          <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${msg.from_me ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-white border border-neutral-100 text-neutral-900 rounded-bl-sm'}`}>
                              <p className="leading-snug whitespace-pre-wrap break-words">{msg.conteudo || msg.caption || `[${msg.tipo_mensagem}]`}</p>
                              <p className={`mt-0.5 text-[10px] text-right ${msg.from_me ? 'text-white/60' : 'text-neutral-400'}`}>{fmtTime(msg.timestamp_msg)}</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
                      <p className="text-sm text-neutral-400">Selecione uma conversa</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WHATSAPP ── */}
          {tab === 'whatsapp' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900">Instâncias WhatsApp</h3>
                <button onClick={() => load('whatsapp')} className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" /> Atualizar
                </button>
              </div>
              {waLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
              ) : waStatuses.length === 0 ? (
                <div className="rounded-2xl border border-neutral-100 bg-white p-8 text-center">
                  <WifiOff className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">Nenhuma instância configurada para esta clínica</p>
                  <p className="text-xs text-neutral-300 mt-1 font-mono">{clinica.instancia_whatsapp || 'sem instância'}</p>
                </div>
              ) : waStatuses.map(s => (
                <div key={s.instancia} className="rounded-2xl border border-neutral-100 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.estado?.toLowerCase() === 'open' ? 'bg-green-100' : 'bg-neutral-100'}`}>
                        <Wifi className={`h-5 w-5 ${s.estado?.toLowerCase() === 'open' ? 'text-green-600' : 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 font-mono">{s.instancia}</p>
                        <WaBadge estado={s.estado} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleWaRestart(s.instancia)} disabled={!!waRestarting || !!waDeleting}
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-60">
                        {waRestarting === s.instancia ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Reiniciar
                      </button>
                      <button onClick={() => setWaConfirmDelete(s)} disabled={!!waDeleting}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60">
                        {waDeleting === s.instancia ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Deletar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── CONFIG IA ── */}
          {tab === 'ia_config' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
              ) : !single ? (
                <EmptyState msg="Configuração IA não encontrada para esta clínica" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-neutral-900">Configuração de IA</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Atualizado: {fmt(single.updated_at)}</p>
                    </div>
                    {editId === 'ia' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveItem()} disabled={saving}
                          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
                        </button>
                        <button onClick={() => setEditId(null)} className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId('ia'); setEditBuf({}) }}
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-1.5 text-sm font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-600">
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                    )}
                  </div>
                  {([
                    { key: 'identidade',           label: 'Identidade',            desc: 'Nome, tom, personalidade da IA' },
                    { key: 'posicionamento',        label: 'Posicionamento',         desc: 'Proposta de valor, diferenciais da clínica' },
                    { key: 'politicas',             label: 'Políticas',              desc: 'Cancelamentos, reembolsos, agendamentos' },
                    { key: 'prova_social',          label: 'Prova social',           desc: 'Depoimentos, resultados, cases' },
                    { key: 'regras_internas',       label: 'Regras internas',        desc: 'O que a IA pode e não pode fazer' },
                    { key: 'gatilhos_diferenciais', label: 'Gatilhos / Diferenciais',desc: 'Frases de impacto, objeções e respostas' },
                    { key: 'midias',                label: 'Mídias configuradas',    desc: 'Imagens e vídeos que a IA pode enviar' },
                    { key: 'profissionais',         label: 'Profissionais',          desc: 'Equipe configurada na IA' },
                    { key: 'extra',                 label: 'Extra',                  desc: 'Dados adicionais' },
                  ] as { key: string; label: string; desc: string }[]).map(({ key, label, desc }) => {
                    const raw = single[key]
                    const isEmpty = !raw || (Array.isArray(raw) ? raw.length === 0 : Object.keys(raw).length === 0)
                    const prettyVal = isEmpty ? '' : JSON.stringify(raw, null, 2)
                    const editVal = editBuf[key] !== undefined ? editBuf[key] : prettyVal
                    return (
                      <DrawerSection key={key} title={label}>
                        <p className="text-xs text-neutral-400 mb-2">{desc}</p>
                        {editId === 'ia' ? (
                          <textarea rows={6} value={editVal}
                            onChange={e => setEditBuf(p => ({ ...p, [key]: e.target.value }))}
                            placeholder={`{}`}
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-mono resize-y focus:border-primary-400 focus:outline-none" />
                        ) : isEmpty ? (
                          <p className="text-sm text-neutral-300 italic">Não configurado</p>
                        ) : (
                          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                            <JsonbView value={raw} />
                          </div>
                        )}
                      </DrawerSection>
                    )
                  })}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── seção Clínicas ─────────────────────── */

function ClinicasSection() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'em_dia' | 'atrasado' | 'sem_plano'>('all')
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<Clinica | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/clinicas')
      const data = await res.json()
      setClinicas(Array.isArray(data) ? data : [])
    } catch { toast.error('Erro ao carregar clínicas') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = clinicas.filter(c => {
    const s = statusClinica(c)
    if (filter !== 'all' && s !== filter) return false
    if (search && !c.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !c.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/clinicas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Clínica removida')
      setClinicas(prev => prev.filter(c => c.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err: any) { toast.error(err.message) }
    finally { setConfirm(null) }
  }

  const counts = {
    all: clinicas.length,
    em_dia: clinicas.filter(c => statusClinica(c) === 'em_dia').length,
    atrasado: clinicas.filter(c => statusClinica(c) === 'atrasado').length,
    sem_plano: clinicas.filter(c => statusClinica(c) === 'sem_plano').length,
  }

  const formatExpira = (val?: string) => {
    if (!val) return <span className="text-neutral-400">—</span>
    const d = new Date(val)
    const diff = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
    const label = d.toLocaleDateString('pt-BR')
    if (diff < 0) return <span className="text-red-500 font-semibold text-xs">{label}</span>
    if (diff <= 7) return <span className="text-amber-600 font-semibold text-xs">{label} ({diff}d)</span>
    return <span className="text-xs text-neutral-600">{label}</span>
  }

  const fmtTokens = (count?: string, total?: string) => {
    const c = count ? Number(count).toLocaleString('pt-BR') : null
    const t = total ? Number(total).toLocaleString('pt-BR') : null
    if (!c && !t) return <span className="text-neutral-300">—</span>
    return <span className="font-mono text-xs">{c || '0'}{t ? <span className="text-neutral-300">/{t}</span> : ''}</span>
  }

  return (
    <div className="space-y-5">
      {confirm && (
        <ConfirmModal
          message={`Deletar clínica "${confirm.full_name}"? Todos os dados serão removidos permanentemente.`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Gestão de Clínicas</h2>
          <p className="text-sm text-neutral-500">{clinicas.length} clínicas cadastradas</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',      label: 'Todas',      count: counts.all },
            { key: 'em_dia',   label: 'Em dia',     count: counts.em_dia },
            { key: 'atrasado', label: 'Em atraso',  count: counts.atrasado },
            { key: 'sem_plano',label: 'Sem plano',  count: counts.sem_plano },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                filter === f.key ? 'bg-primary-500 text-white shadow-sm' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}>
              {f.label}
              <span className={`rounded-full px-1.5 text-[11px] ${filter === f.key ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none transition-all" />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">Nenhuma clínica encontrada</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Clínica</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Plano</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Expira</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Tokens</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400">WhatsApp</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isOpen = expandedId === c.id
                return (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => setExpandedId(isOpen ? null : c.id)}
                      className={`cursor-pointer border-b border-neutral-50 transition-colors ${isOpen ? 'bg-primary-50/60' : 'hover:bg-neutral-50/70'}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                            isOpen ? 'bg-primary-500 text-white' : 'bg-primary-100 text-primary-600'
                          }`}>
                            {(c.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900">{c.full_name}</p>
                            <p className="text-xs text-neutral-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={statusClinica(c)} /></td>
                      <td className="px-4 py-3.5">{formatExpira(c.plano_expira_em)}</td>
                      <td className="px-4 py-3.5">{fmtTokens(c.tokens_count, c.total_tokens)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${c.whatsapp_status === 'open' ? 'bg-green-400' : 'bg-neutral-300'}`} />
                          <span className="font-mono text-xs text-neutral-500 truncate max-w-[100px]">{c.instancia_whatsapp || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${c.id}-panel`}>
                        <td colSpan={6} className="p-0 border-b border-neutral-100">
                          <ClinicaContextPanel
                            clinica={c}
                            onClose={() => setExpandedId(null)}
                            onDelete={() => setConfirm(c)}
                            onRefresh={load}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── seção WhatsApp ─────────────────────── */

function WhatsAppSection() {
  const [statuses, setStatuses] = useState<WhatsAppStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<WhatsAppStatus | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/whatsapp-status')
      const data = await res.json()
      setStatuses(Array.isArray(data) ? data : [])
    } catch { toast.error('Erro ao carregar status WhatsApp') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleRestart = async (instancia: string) => {
    setRestarting(instancia)
    try {
      const res = await adminFetch(`/api/admin/whatsapp-restart/${encodeURIComponent(instancia)}`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Instância ${instancia} reiniciada`)
      setTimeout(load, 2000)
    } catch (err: any) { toast.error(err.message) }
    finally { setRestarting(null) }
  }

  const handleDelete = async (instancia: string) => {
    setDeleting(instancia)
    try {
      const res = await adminFetch(`/api/admin/whatsapp-instance/${encodeURIComponent(instancia)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Instância ${instancia} deletada`)
      setStatuses(prev => prev.filter(s => s.instancia !== instancia))
    } catch (err: any) { toast.error(err.message) }
    finally { setDeleting(null); setConfirmDelete(null) }
  }

  const connected = statuses.filter(s => ['open', 'connected'].includes(s.estado?.toLowerCase())).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Instâncias WhatsApp</h2>
          <p className="text-sm text-neutral-500">{connected}/{statuses.length} instâncias conectadas</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Conectadas', value: connected, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
          { label: 'Total', value: statuses.length, color: 'text-primary-600', bg: 'bg-primary-50 border-primary-100' },
          { label: 'Com problema', value: statuses.length - connected, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <p className={`font-display text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-neutral-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`Deletar instância "${confirmDelete.instancia}" da clínica "${confirmDelete.clinica_nome}"? Esta ação não pode ser desfeita e desconectará o WhatsApp dessa clínica.`}
          onConfirm={() => handleDelete(confirmDelete.instancia)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-400" /></div>
        ) : statuses.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">Nenhuma instância encontrada</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/80">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Clínica</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Instância</th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {statuses.map(s => (
                <tr key={s.clinica_id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-neutral-900">{s.clinica_nome}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-lg">{s.instancia}</span>
                  </td>
                  <td className="px-5 py-4"><WaBadge estado={s.estado} /></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleRestart(s.instancia)}
                        disabled={restarting === s.instancia || deleting === s.instancia}
                        className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
                      >
                        {restarting === s.instancia
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Reiniciando...</>
                          : <><RefreshCw className="h-3 w-3" /> Reiniciar</>
                        }
                      </button>
                      <button
                        onClick={() => setConfirmDelete(s)}
                        disabled={deleting === s.instancia}
                        className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60 transition-colors"
                      >
                        {deleting === s.instancia
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Deletando...</>
                          : <><Trash2 className="h-3 w-3" /> Deletar</>
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── seção Chats ─────────────────────── */

interface Conversa {
  id: string; remote_jid: string; nome_contato?: string; numero_telefone?: string
  foto_perfil_url?: string; ultima_mensagem?: string; ultima_mensagem_timestamp?: number
  mensagens_nao_lidas?: number; updated_at?: string
}
interface MsgChat {
  id: string; message_id: string; remote_jid: string; conteudo?: string
  tipo_mensagem: string; from_me: boolean; timestamp_msg: number; status?: string
  media_url?: string; caption?: string
}

function ChatsSection() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [selClinica, setSelClinica] = useState<Clinica | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selConversa, setSelConversa] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<MsgChat[]>([])
  const [loadingClinicas, setLoadingClinicas] = useState(true)
  const [loadingConversas, setLoadingConversas] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchConversa, setSearchConversa] = useState('')
  const msgsEndRef = useCallback((el: HTMLDivElement | null) => { el?.scrollIntoView({ behavior: 'smooth' }) }, [])

  useEffect(() => {
    adminFetch('/api/admin/clinicas')
      .then(r => r.json())
      .then(d => setClinicas(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Erro ao carregar clínicas'))
      .finally(() => setLoadingClinicas(false))
  }, [])

  const loadConversas = useCallback(async (c: Clinica) => {
    setSelClinica(c); setSelConversa(null); setMensagens([]); setLoadingConversas(true)
    try {
      const res = await adminFetch(`/api/admin/clinicas/${c.id}/chats`)
      const d = await res.json()
      setConversas(Array.isArray(d) ? d : [])
    } catch { toast.error('Erro ao carregar conversas') }
    finally { setLoadingConversas(false) }
  }, [])

  const loadMensagens = useCallback(async (conv: Conversa) => {
    if (!selClinica) return
    setSelConversa(conv); setLoadingMsgs(true)
    try {
      const res = await adminFetch(`/api/admin/clinicas/${selClinica.id}/chats/${conv.id}/mensagens`)
      const d = await res.json()
      setMensagens(Array.isArray(d) ? d : [])
    } catch { toast.error('Erro ao carregar mensagens') }
    finally { setLoadingMsgs(false) }
  }, [selClinica])

  // polling a cada 8s quando há conversa selecionada
  useEffect(() => {
    if (!selConversa || !selClinica) return
    const t = setInterval(() => { loadMensagens(selConversa) }, 8000)
    return () => clearInterval(t)
  }, [selConversa, selClinica, loadMensagens])

  const filteredConversas = conversas.filter(c => {
    if (!searchConversa) return true
    const q = searchConversa.toLowerCase()
    return (c.nome_contato || '').toLowerCase().includes(q) ||
           (c.numero_telefone || '').includes(q) ||
           c.remote_jid.includes(q)
  })

  const fmtTime = (ts?: number) => {
    if (!ts) return ''
    const d = new Date(ts < 1e12 ? ts * 1000 : ts)
    const hoje = new Date()
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">Chats das Clínicas</h2>
        <p className="text-sm text-neutral-500">Visualize conversas de qualquer clínica em tempo real (somente leitura)</p>
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>
        {/* Coluna 1: lista de clínicas */}
        <div className="col-span-3 flex flex-col rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Clínicas</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingClinicas ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
            ) : clinicas.length === 0 ? (
              <p className="p-4 text-xs text-neutral-400 text-center">Nenhuma clínica</p>
            ) : (
              clinicas.filter(c => c.instancia_whatsapp).map(c => (
                <button
                  key={c.id}
                  onClick={() => loadConversas(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-neutral-50 last:border-0 ${
                    selClinica?.id === c.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
                    {(c.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${selClinica?.id === c.id ? 'text-primary-700' : 'text-neutral-900'}`}>
                      {c.full_name}
                    </p>
                    <p className="text-xs text-neutral-400 truncate font-mono">{c.instancia_whatsapp}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Coluna 2: lista de conversas */}
        <div className="col-span-3 flex flex-col rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {selClinica ? `${selClinica.full_name} — ${conversas.length} chats` : 'Selecione uma clínica'}
            </p>
            {selClinica && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  value={searchConversa}
                  onChange={e => setSearchConversa(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-xs focus:border-primary-300 focus:outline-none"
                />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversas ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary-400" /></div>
            ) : !selClinica ? (
              <p className="p-4 text-xs text-neutral-400 text-center">Selecione uma clínica ao lado</p>
            ) : filteredConversas.length === 0 ? (
              <p className="p-4 text-xs text-neutral-400 text-center">Nenhuma conversa</p>
            ) : (
              filteredConversas.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadMensagens(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-neutral-50 last:border-0 transition-colors ${
                    selConversa?.id === conv.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-sm font-bold overflow-hidden">
                    {conv.foto_perfil_url
                      ? <img src={conv.foto_perfil_url} alt="" className="h-full w-full object-cover" />
                      : (conv.nome_contato || conv.remote_jid).charAt(0).toUpperCase()
                    }
                    {(conv.mensagens_nao_lidas ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
                        {conv.mensagens_nao_lidas}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-semibold truncate ${selConversa?.id === conv.id ? 'text-primary-700' : 'text-neutral-900'}`}>
                        {conv.nome_contato || conv.numero_telefone || conv.remote_jid.split('@')[0]}
                      </p>
                      <span className="text-[10px] text-neutral-400 shrink-0">{fmtTime(conv.ultima_mensagem_timestamp)}</span>
                    </div>
                    <p className="text-xs text-neutral-400 truncate">{conv.ultima_mensagem || '—'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Coluna 3: mensagens */}
        <div className="col-span-6 flex flex-col rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden">
          {/* Header conversa */}
          {selConversa ? (
            <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-sm font-bold overflow-hidden">
                {selConversa.foto_perfil_url
                  ? <img src={selConversa.foto_perfil_url} alt="" className="h-full w-full object-cover" />
                  : (selConversa.nome_contato || selConversa.remote_jid).charAt(0).toUpperCase()
                }
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">
                  {selConversa.nome_contato || selConversa.numero_telefone || selConversa.remote_jid.split('@')[0]}
                </p>
                <p className="text-xs text-neutral-400 font-mono">{selConversa.remote_jid}</p>
              </div>
              <button onClick={() => loadMensagens(selConversa)} className="ml-auto rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="border-b border-neutral-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Mensagens</p>
            </div>
          )}

          {/* Lista mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-50/40">
            {!selConversa ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Signal className="h-10 w-10 text-neutral-200 mx-auto mb-2" />
                  <p className="text-sm text-neutral-400">Selecione uma conversa</p>
                </div>
              </div>
            ) : loadingMsgs && mensagens.length === 0 ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary-400" /></div>
            ) : mensagens.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-400">Nenhuma mensagem</p>
              </div>
            ) : (
              <>
                {mensagens.map(msg => (
                  <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm ${
                      msg.from_me
                        ? 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-white border border-neutral-100 text-neutral-900 rounded-bl-sm'
                    }`}>
                      {msg.media_url && (
                        <div className="mb-1.5">
                          {msg.tipo_mensagem === 'image' ? (
                            <img src={msg.media_url} alt="" className="max-h-40 rounded-xl object-cover" />
                          ) : (
                            <a href={msg.media_url} target="_blank" rel="noreferrer"
                              className={`text-xs underline ${msg.from_me ? 'text-white/80' : 'text-primary-500'}`}>
                              📎 {msg.tipo_mensagem}
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                        {msg.conteudo || msg.caption || `[${msg.tipo_mensagem}]`}
                      </p>
                      <p className={`mt-0.5 text-[10px] text-right ${msg.from_me ? 'text-white/60' : 'text-neutral-400'}`}>
                        {fmtTime(msg.timestamp_msg)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={msgsEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── seção Planos ─────────────────────── */

const PLAN_ICONS: Record<string, React.ReactNode> = {
  essential:  <Zap className="h-5 w-5" />,
  clinica_pro: <Sparkles className="h-5 w-5" />,
  elite_ia:   <Crown className="h-5 w-5" />,
}

function PlanosSection() {
  const [planos, setPlanos] = useState<Plano[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Plano>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/planos')
      const data = await res.json()
      setPlanos(Array.isArray(data) ? data : [])
    } catch { toast.error('Erro ao carregar planos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/planos/${id}`, {
        method: 'PATCH', body: JSON.stringify(editData),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Plano atualizado — refletirá na landing page e página de planos')
      setEditId(null)
      load()
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-neutral-900">Gestão de Planos</h2>
          <p className="text-sm text-neutral-500">Alterações refletem automaticamente na landing page e página de preços</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 flex items-start gap-3">
        <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          Edite o nome, preço, descrição ou features de cada plano. As mudanças são refletidas em tempo real no frontend.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary-400" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {planos.map(plan => (
            <div key={plan.id} className={`relative rounded-3xl border bg-white shadow-sm transition-all hover:shadow-md ${plan.popular ? 'border-primary-200 ring-2 ring-primary-100' : 'border-neutral-100'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-primary-500 to-secondary-600 px-3 py-1 text-xs font-bold text-white shadow">
                    MAIS POPULAR
                  </span>
                </div>
              )}
              <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-sm">
                    {PLAN_ICONS[plan.slug] ?? <Zap className="h-5 w-5" />}
                  </div>
                  <div>
                    {editId === plan.id ? (
                      <input
                        value={editData.nome ?? plan.nome}
                        onChange={e => setEditData(p => ({ ...p, nome: e.target.value }))}
                        className="h-7 rounded-lg border border-primary-300 px-2 text-sm font-bold w-36 focus:outline-none"
                      />
                    ) : (
                      <h3 className="font-display text-lg font-bold text-neutral-900">{plan.nome}</h3>
                    )}
                    <p className="text-xs text-neutral-400">{editData.tokens ?? plan.tokens} tokens/mês</p>
                  </div>
                </div>

                {/* Preço editável */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Preço mensal</label>
                  {editId === plan.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-neutral-500">R$</span>
                      <input
                        type="number"
                        value={editData.preco ?? plan.preco}
                        onChange={e => setEditData(p => ({ ...p, preco: Number(e.target.value) }))}
                        className="h-10 w-full rounded-xl border border-primary-300 px-3 text-2xl font-extrabold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                  ) : (
                    <p className="font-display text-3xl font-extrabold text-neutral-900">
                      R$ {Number(plan.preco).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      <span className="text-sm font-normal text-neutral-400">/mês</span>
                    </p>
                  )}
                </div>

                {/* Descrição editável */}
                <div className="mb-5">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Descrição</label>
                  {editId === plan.id ? (
                    <textarea
                      rows={3}
                      value={editData.descricao ?? plan.descricao}
                      onChange={e => setEditData(p => ({ ...p, descricao: e.target.value }))}
                      className="w-full rounded-xl border border-primary-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  ) : (
                    <p className="text-sm text-neutral-500 leading-relaxed">{plan.descricao}</p>
                  )}
                </div>

                {/* Tokens editável */}
                {editId === plan.id ? (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Tokens/mês</label>
                    <input
                      value={editData.tokens ?? plan.tokens}
                      onChange={e => setEditData(p => ({ ...p, tokens: e.target.value }))}
                      placeholder="ex: 5.000"
                      className="h-9 w-full rounded-xl border border-primary-300 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                ) : null}

                {/* Tagline editável */}
                {editId === plan.id ? (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Tagline</label>
                    <input
                      value={editData.tagline ?? plan.tagline}
                      onChange={e => setEditData(p => ({ ...p, tagline: e.target.value }))}
                      placeholder="ex: O preferido das clínicas"
                      className="h-9 w-full rounded-xl border border-primary-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </div>
                ) : (
                  <p className="mb-2 text-xs text-primary-500 font-semibold">{plan.tagline}</p>
                )}

                {/* Features editável */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Features incluídas ({(editData.features ?? plan.features).length})</label>
                  {editId === plan.id ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(editData.features ?? plan.features).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const arr = [...(editData.features ?? plan.features)]
                              arr[i] = { ...arr[i], highlight: !arr[i].highlight }
                              setEditData(p => ({ ...p, features: arr }))
                            }}
                            className={`shrink-0 h-5 w-5 rounded flex items-center justify-center border transition-colors ${
                              f.highlight ? 'bg-primary-500 border-primary-500 text-white' : 'border-neutral-300 text-transparent'
                            }`}
                            title="Destacar"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <input
                            value={f.text}
                            onChange={e => {
                              const arr = [...(editData.features ?? plan.features)]
                              arr[i] = { ...arr[i], text: e.target.value }
                              setEditData(p => ({ ...p, features: arr }))
                            }}
                            className="h-7 flex-1 rounded-lg border border-neutral-200 px-2 text-xs focus:border-primary-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const arr = (editData.features ?? plan.features).filter((_, idx) => idx !== i)
                              setEditData(p => ({ ...p, features: arr }))
                            }}
                            className="shrink-0 text-neutral-300 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [...(editData.features ?? plan.features), { text: '', highlight: false }]
                          setEditData(p => ({ ...p, features: arr }))
                        }}
                        className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 font-semibold mt-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar feature
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-neutral-500">
                          <Check className={`h-3 w-3 shrink-0 ${f.highlight ? 'text-primary-500' : 'text-neutral-300'}`} />
                          {f.text}
                        </div>
                      ))}
                      {plan.features.length > 4 && (
                        <p className="text-xs text-neutral-400">+{plan.features.length - 4} mais features</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Not included editável */}
                {editId === plan.id && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Não incluído ({(editData.not_included ?? plan.not_included ?? []).length})</label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {(editData.not_included ?? plan.not_included ?? []).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            value={f.text}
                            onChange={e => {
                              const arr = [...(editData.not_included ?? plan.not_included ?? [])]
                              arr[i] = { ...arr[i], text: e.target.value }
                              setEditData(p => ({ ...p, not_included: arr }))
                            }}
                            className="h-7 flex-1 rounded-lg border border-neutral-200 px-2 text-xs focus:border-primary-300 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const arr = (editData.not_included ?? plan.not_included ?? []).filter((_, idx) => idx !== i)
                              setEditData(p => ({ ...p, not_included: arr }))
                            }}
                            className="shrink-0 text-neutral-300 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const arr = [...(editData.not_included ?? plan.not_included ?? []), { text: '', highlight: false }]
                          setEditData(p => ({ ...p, not_included: arr }))
                        }}
                        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 font-semibold mt-1"
                      >
                        <Plus className="h-3 w-3" /> Adicionar item
                      </button>
                    </div>
                  </div>
                )}

                {editId === plan.id ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(plan.id)} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Salvar
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditId(plan.id); setEditData({}) }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-2 text-sm font-semibold text-neutral-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar plano
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── COMPONENTE PRINCIPAL ─────────────────────── */

const SECTIONS = [
  { key: 'clinicas',  label: 'Clínicas',      icon: Building2 },
  { key: 'planos',    label: 'Planos',         icon: CreditCard },
  { key: 'admins',    label: 'Admins',         icon: ShieldCheck },
] as const

type SectionKey = typeof SECTIONS[number]['key']

export default function AdminPage() {
  const navigate = useNavigate()
  const [section, setSection] = useState<SectionKey>('clinicas')
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const user = localStorage.getItem('admin_user')
    if (!token || !user) { navigate('/admin-login'); return }

    adminFetch('/api/admin/me')
      .then(r => {
        if (!r.ok) throw new Error('Unauthorized')
        return r.json()
      })
      .then(data => { setAdminUser(data.admin); setVerifying(false) })
      .catch(() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_user'); navigate('/admin-login') })
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/admin-login')
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f4fb]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f4fb] font-sans">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <img src="/Logo.jpg" alt="AutoClinic" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block h-5 w-px bg-neutral-200" />
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <ShieldCheck className="h-3 w-3" />
              Painel Admin
            </div>
          </div>

          {/* Nav central */}
          <nav className="hidden md:flex items-center gap-1">
            {SECTIONS.map(s => {
              const Icon = s.icon
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    section === s.key
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  }`}>
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              )
            })}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            {adminUser && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-neutral-600">
                  {(adminUser.nome || adminUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-xs font-semibold text-neutral-900 leading-tight">{adminUser.nome || adminUser.email}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">{adminUser.cargo}</p>
                </div>
              </div>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {section === 'clinicas' && <ClinicasSection />}
        {section === 'planos'   && <PlanosSection />}
        {section === 'admins'   && adminUser && <AdminsSection currentAdmin={adminUser} />}
      </main>
    </div>
  )
}