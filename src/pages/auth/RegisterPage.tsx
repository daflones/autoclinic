import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Eye, EyeOff, ArrowLeft, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

const TURNSTILE_SITE_KEY = '0x4AAAAAAClGLg91CsyHG0lg'

type Step = 'form' | 'otp' | 'done'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, loading } = useAuthStore()

  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.fullName.trim()) { toast.error('Nome completo e obrigatorio'); return false }
    if (!formData.email) { toast.error('E-mail e obrigatorio'); return false }
    if (formData.password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return false }
    if (formData.password !== formData.confirmPassword) { toast.error('Senhas nao coincidem'); return false }
    return true
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (!captchaToken) {
      toast.error('Por favor, complete a verificação de segurança')
      return
    }
    setStep('otp')
  }

  const handleSendOtp = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 11) {
      toast.error('Informe um numero de telefone valido com DDD (ex: 11999999999)')
      return
    }
    setOtpLoading(true)
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar codigo')
      setOtpSent(true)
      toast.success('Codigo enviado! Verifique seu WhatsApp.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar codigo OTP')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyAndCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) { toast.error('Digite o codigo de 6 digitos'); return }
    setOtpLoading(true)
    try {
      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: otpCode }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Codigo invalido')
      await signUp(formData.email, formData.password, formData.fullName)
      setStep('done')
      toast.success('Conta criada! Verifique seu e-mail para confirmar o acesso.')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao verificar codigo')
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex">

      {/* LADO ESQUERDO - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-primary-500 to-primary-700" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary-300/20 blur-3xl" />
          <div className="absolute top-1/2 right-1/3 h-64 w-64 rounded-full bg-secondary-300/15 blur-2xl" />
        </div>

        <div className="relative">
          <img src="/Logo.jpg" alt="AutoClinic" className="h-14 w-auto max-w-[160px] object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        </div>

        <div className="relative flex-1 flex flex-col justify-center py-12">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
            <Sparkles className="h-3 w-3" />
            Comece agora mesmo
          </div>
          <h1 className="font-display mb-5 text-4xl xl:text-5xl font-bold leading-tight text-white">
            Sua clinica merece crescer
            <span className="block text-secondary-200"> com inteligencia</span>
          </h1>
          <p className="mb-10 text-base leading-relaxed text-white/80">
            Cadastre-se e tenha acesso ao CRM com IA mais completo para clinicas de estetica.
            Automatize o WhatsApp e comece a converter mais pacientes hoje.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Atendimento 24/7', desc: 'IA responde enquanto voce atende' },
              { label: 'Mais agendamentos', desc: 'Converte leads automaticamente' },
              { label: 'Menos no-shows', desc: 'Lembretes e confirmacoes auto' },
              { label: 'Faturamento maior', desc: 'Upsell e retorno automaticos' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-white/70">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-white/50">{'\u00a9'} {new Date().getFullYear()} AutoClinic {'\u2014'} Todos os direitos reservados</p>
        </div>
      </div>

      {/* LADO DIREITO - Formulario */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-[#f7f4fb] px-6 py-12 sm:px-12 overflow-y-auto">

        {/* Logo mobile */}
        <div className="mb-6 flex flex-col items-center lg:hidden">
          <img src="/Logo.jpg" alt="AutoClinic" className="h-12 w-auto max-w-[140px] object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <p className="mt-3 text-sm text-neutral-500">CRM com IA para clinicas de estetica</p>
        </div>

        <div className="w-full max-w-md">

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="mb-6 flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${step === 'form' ? 'bg-primary-600 text-white shadow-md' : 'bg-primary-100 text-primary-600'}`}>
                {step === 'otp' ? <CheckCircle2 className="h-4 w-4" /> : '1'}
              </div>
              <span className={`text-xs font-medium ${step === 'form' ? 'text-neutral-800' : 'text-neutral-400'}`}>Dados da conta</span>
              <div className="h-px w-8 bg-neutral-300" />
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${step === 'otp' ? 'bg-primary-600 text-white shadow-md' : 'bg-neutral-200 text-neutral-400'}`}>
                2
              </div>
              <span className={`text-xs font-medium ${step === 'otp' ? 'text-neutral-800' : 'text-neutral-400'}`}>Verificacao WhatsApp</span>
            </div>
          )}

          {/* STEP 1: Dados da conta */}
          {step === 'form' && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <Link to="/login" className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50 shadow-sm transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <h2 className="font-display text-3xl font-bold text-neutral-900">Criar conta</h2>
                  <p className="text-sm text-neutral-500">Preencha os dados para comecar</p>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-md">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">Nome completo</label>
                    <input id="fullName" type="text" placeholder="Dra. Maria Silva"
                      value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)}
                      disabled={loading} required
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700">E-mail</label>
                    <input id="email" type="email" placeholder="seu@email.com"
                      value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)}
                      disabled={loading} required
                      className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700">Senha</label>
                    <div className="relative">
                      <input id="password" type={showPassword ? 'text' : 'password'} placeholder="Minimo 6 caracteres"
                        value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)}
                        disabled={loading} required
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">Confirmar senha</label>
                    <div className="relative">
                      <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Repita a senha"
                        value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        disabled={loading} required
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50" />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div ref={turnstileRef} className="flex justify-center" />

                  <button type="submit" disabled={loading || !captchaToken}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-200 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60 mt-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</> : 'Continuar'}
                  </button>
                </form>
              </div>

              <p className="mt-6 text-center text-sm text-neutral-500">
                Ja tem uma conta?{' '}
                <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">Faca login</Link>
              </p>
            </>
          )}

          {/* STEP 2: Verificacao WhatsApp */}
          {step === 'otp' && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <button type="button" onClick={() => setStep('form')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50 shadow-sm transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h2 className="font-display text-3xl font-bold text-neutral-900">Verificar WhatsApp</h2>
                  <p className="text-sm text-neutral-500">Confirme que o numero e seu</p>
                </div>
              </div>

              <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-md space-y-5">
                {/* Campo telefone + botao enviar */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                    Numero do WhatsApp
                  </label>
                  <div className="flex gap-2">
                    <input id="phone" type="tel" placeholder="11999999999"
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      disabled={otpSent}
                      className="h-11 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all disabled:opacity-50" />
                    <button type="button" onClick={handleSendOtp} disabled={otpLoading || otpSent}
                      className="h-11 px-4 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                      {otpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {otpSent ? 'Enviado' : 'Enviar'}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">Formato: DDD + numero, sem espacos (ex: 11999999999)</p>
                </div>

                {/* Campo codigo OTP */}
                {otpSent && (
                  <form onSubmit={handleVerifyAndCreate} className="space-y-4">
                    <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                      Codigo enviado para o seu WhatsApp! Valido por 5 minutos.
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="otpCode" className="block text-sm font-medium text-neutral-700">
                        Codigo de verificacao
                      </label>
                      <input id="otpCode" type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                        value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-center text-xl font-bold tracking-[0.5em] text-neutral-900 placeholder:text-neutral-300 placeholder:tracking-normal focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition-all" />
                    </div>
                    <button type="submit" disabled={otpLoading || loading || otpCode.length !== 6}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-200 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60">
                      {(otpLoading || loading) ? <><Loader2 className="h-4 w-4 animate-spin" /> Verificando...</> : 'Verificar e criar conta'}
                    </button>
                    <button type="button" onClick={() => { setOtpSent(false); setOtpCode('') }}
                      className="flex w-full items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors pt-1">
                      <RefreshCw className="h-3 w-3" />
                      Reenviar codigo
                    </button>
                  </form>
                )}
              </div>
            </>
          )}

          {/* STEP 3: Sucesso */}
          {step === 'done' && (
            <div className="rounded-3xl border border-neutral-100 bg-white p-10 shadow-md text-center space-y-5">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 border border-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-neutral-900">Conta criada!</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Enviamos um e-mail de confirmacao para <strong className="text-neutral-700">{formData.email}</strong>.
                  Verifique sua caixa de entrada e clique no link antes de fazer login.
                </p>
              </div>
              <button type="button" onClick={() => navigate('/login')}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 text-sm font-bold text-white shadow-md shadow-primary-200 transition-all hover:opacity-90">
                Ir para o login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
