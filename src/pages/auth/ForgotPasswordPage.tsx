import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, Loader2, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { toast } from '@/lib/toast'

const TURNSTILE_SITE_KEY = '0x4AAAAAAClGLg91CsyHG0lg'

export function ForgotPasswordPage() {
  const { resetPassword, loading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
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
    if (!email) {
      toast.error('Por favor, informe seu e-mail')
      return
    }
    if (!captchaToken) {
      toast.error('Por favor, complete a verificação de segurança')
      return
    }
    try {
      await resetPassword(email)
      setEmailSent(true)
      toast.success('E-mail de recuperação enviado!')
    } catch (error: any) {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
        setCaptchaToken('')
      }
      toast.error(error.message || 'Erro ao enviar e-mail de recuperação')
    }
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* ── LADO ESQUERDO — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-500" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-secondary-300/20 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-64 w-64 rounded-full bg-primary-300/15 blur-2xl" />
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
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display mb-5 text-4xl xl:text-5xl font-bold leading-tight text-white">
            Recupere seu
            <span className="block text-primary-100"> acesso com segurança</span>
          </h1>
          <p className="mb-10 text-base leading-relaxed text-white/80">
            Seus dados estão protegidos. O link de recuperação será enviado
            apenas para o e-mail cadastrado em sua conta.
          </p>

          <div className="rounded-2xl bg-white/10 p-6 space-y-4">
            {[
              'Link válido e seguro enviado ao seu e-mail',
              'Nenhuma informação sensível é exposta',
              'Redefina sua senha em poucos cliques',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-white/90">{item}</span>
              </div>
            ))}
          </div>
        </div>

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
          {/* Cabeçalho */}
          <div className="mb-8 flex items-center gap-3">
            <Link
              to="/login"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50 shadow-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="font-display text-3xl font-bold text-neutral-900">Recuperar senha</h2>
              <p className="text-sm text-neutral-500">
                {emailSent ? 'E-mail enviado com sucesso' : 'Informe seu e-mail para continuar'}
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-md">
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                    E-mail cadastrado
                  </label>
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
                  <p className="text-xs text-neutral-400">
                    Enviaremos um link para redefinir sua senha neste e-mail.
                  </p>
                </div>

                <div ref={turnstileRef} className="flex justify-center" />

                <button
                  type="submit"
                  disabled={loading || !captchaToken}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-200 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
                >
                  {loading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                    : <><Mail className="h-4 w-4" /> Enviar link de recuperação</>}
                </button>
              </form>
            ) : (
              /* Estado de sucesso */
              <div className="py-4 text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-neutral-900">E-mail enviado!</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                    Enviamos um link de recuperação para{' '}
                    <strong className="text-neutral-700">{email}</strong>.
                    Verifique sua caixa de entrada e spam.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao login
                </Link>
              </div>
            )}
          </div>

          {!emailSent && (
            <p className="mt-6 text-center text-sm text-neutral-500">
              Lembrou a senha?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Faça login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
