import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = '0x4AAAAAAClGLg91CsyHG0lg'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    const render = () => {
      if (!turnstileRef.current || !window.turnstile) return
      if (widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken(''),
      })
    }
    if (window.turnstile) {
      render()
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) { clearInterval(interval); render() }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Por favor, preencha todos os campos')
      return
    }
    if (!captchaToken) {
      toast.error('Por favor, complete a verificação de segurança')
      return
    }
    try {
      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
      navigate('/app/dashboard')
    } catch (error: any) {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
        setCaptchaToken('')
      }
      toast.error(error.message || 'Erro ao fazer login')
    }
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── LADO ESQUERDO — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Background gradient no estilo do projeto */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-secondary-400/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-primary-300/15 blur-2xl" />
        </div>

        {/* Logo */}
        <div className="relative">
          <img
            src="/Logo.jpg"
            alt="AutoClinic"
            className="h-14 w-auto max-w-[160px] object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Conteúdo central */}
        <div className="relative flex-1 flex flex-col justify-center py-12">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
            ✦ CRM com IA para clínicas de estética
          </div>
          <h1 className="font-display mb-5 text-4xl xl:text-5xl font-bold leading-tight text-white">
            Transforme cada conversa em
            <span className="block text-primary-100"> faturamento</span>
          </h1>
          <p className="mb-10 text-base leading-relaxed text-white/80">
            Um sistema inteligente que responde, converte, agenda e acompanha
            o paciente — tudo automaticamente no WhatsApp.
          </p>

          <ul className="space-y-3">
            {[
              'Mais agendamentos sem esforço da equipe',
              'Menos faltas e no-shows',
              'Pacientes retornando automaticamente',
              'Faturamento previsível e crescente',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3 w-3 text-white" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer branding */}
        <div className="relative">
          <p className="text-xs text-white/50">© {new Date().getFullYear()} AutoClinic — Todos os direitos reservados</p>
        </div>
      </div>

      {/* ── LADO DIREITO — Formulário ── */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-[#f7f4fb] px-6 py-12 sm:px-12">
        {/* Logo mobile */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <img
            src="/Logo.jpg"
            alt="AutoClinic"
            className="h-12 w-auto max-w-[140px] object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <p className="mt-3 text-sm text-neutral-500">CRM com IA para clínicas de estética</p>
        </div>

        <div className="w-full max-w-md">
          {/* Cabeçalho do form */}
          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-neutral-900">Bem-vinda de volta</h2>
            <p className="mt-1 text-sm text-neutral-500">Acesse sua conta para continuar</p>
          </div>

          {/* Card do formulário */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-md">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">E-mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>

              <div ref={turnstileRef} className="flex justify-center" />

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-200 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar na conta'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Não tem uma conta?{' '}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
