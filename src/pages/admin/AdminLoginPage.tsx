import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { toast } from '@/lib/toast'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas')
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_user', JSON.stringify(data.admin))
      toast.success('Acesso autorizado')
      navigate('/admin-page')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f7f4fb]">
      {/* ── LADO ESQUERDO — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-primary-900" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-secondary-400/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-primary-400/8 blur-2xl" />
          {/* Grid decorativo */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'linear-gradient(#C265A3 1px, transparent 1px), linear-gradient(90deg, #C265A3 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative">
          <img src="/Logo.jpg" alt="AutoClinic" className="h-12 w-auto object-contain" />
        </div>

        <div className="relative flex-1 flex flex-col justify-center py-12">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 text-xs font-semibold text-primary-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acesso restrito — Somente DEV
          </div>
          <h1 className="font-display mb-5 text-4xl xl:text-5xl font-bold leading-tight text-white">
            Painel de
            <span className="block bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
              Administração
            </span>
          </h1>
          <p className="mb-10 text-base leading-relaxed text-neutral-400">
            Controle completo sobre clínicas, planos, instâncias WhatsApp e configurações do sistema.
          </p>
          <div className="space-y-3">
            {[
              'Gestão de clínicas e planos',
              'Monitoramento de instâncias WhatsApp',
              'Controle de preços em tempo real',
              'Acesso aos chats das clínicas',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-neutral-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-500/20 border border-primary-500/30">
                  <ShieldCheck className="h-3 w-3 text-primary-400" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-neutral-600">© {new Date().getFullYear()} AutoClinic — Área administrativa restrita</p>
        </div>
      </div>

      {/* ── LADO DIREITO — Formulário ── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="mb-8 lg:hidden flex flex-col items-center">
          <img src="/Logo.jpg" alt="AutoClinic" className="h-12 w-auto object-contain" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              <ShieldCheck className="h-3 w-3" />
              Área Restrita
            </div>
            <h2 className="font-display text-3xl font-bold text-neutral-900">Acesso administrativo</h2>
            <p className="mt-1 text-sm text-neutral-500">Apenas usuários com cargo <span className="font-mono font-bold text-primary-600">dev</span></p>
          </div>

          <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-md">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@autoclinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-neutral-700">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neutral-800 to-neutral-900 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Autenticando...</> : 'Acessar painel'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Acesso protegido. Tentativas são registradas.
          </p>
        </div>
      </div>
    </div>
  )
}
