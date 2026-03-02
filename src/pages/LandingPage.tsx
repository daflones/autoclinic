import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Check, ChevronRight, Star, ArrowRight, MessageSquare,
  Calendar, BarChart3, RefreshCw, Zap, Sparkles, Crown,
  Mic, Image, Volume2, ChevronDown, Menu, X, TrendingUp,
  Users, Clock, ShieldCheck, Play, ChevronLeft,
} from 'lucide-react'

/* ─────────────────────────── DADOS ESTÁTICOS ─────────────────────────── */

const heroSlides = [
  {
    id: 1,
    image: '/hero-1.jpg',
    alt: 'Clínica de estética moderna',
  },
  {
    id: 2,
    image: '/hero-2.jpg',
    alt: 'Atendimento via WhatsApp automatizado',
  },
  {
    id: 3,
    image: '/hero-3.jpg',
    alt: 'Dashboard de gestão da clínica',
  },
]

const problems = [
  'Leads chegam pelo WhatsApp e não recebem resposta rápida',
  'A conversa morre antes do agendamento',
  'Pacientes somem depois da avaliação',
  'Quem faz um procedimento não retorna',
  'A recepção não consegue acompanhar tudo',
  'O WhatsApp vira bagunça',
  'A agenda tem buracos invisíveis',
]

const howItWorks = [
  { step: '1', icon: MessageSquare, title: 'Lead chama no WhatsApp', desc: 'A IA responde instantaneamente, 24h por dia, 7 dias por semana' },
  { step: '2', icon: Sparkles, title: 'Entende a intenção', desc: 'Analisa mensagens, imagens e áudios para entender o que o paciente precisa' },
  { step: '3', icon: Star, title: 'Apresenta o procedimento ideal', desc: 'Sugere o tratamento certo com argumentos persuasivos e informações reais da clínica' },
  { step: '4', icon: Calendar, title: 'Agenda automaticamente', desc: 'Marca o horário respeitando sua disponibilidade, sem precisar da recepção' },
  { step: '5', icon: Check, title: 'Confirma a presença', desc: 'Envia lembretes estratégicos e reduz faltas drasticamente' },
  { step: '6', icon: RefreshCw, title: 'Ativa retorno e upsell', desc: 'Após o atendimento, faz follow-up e oferece manutenção e novos procedimentos' },
]

const benefits = [
  { icon: TrendingUp, text: 'Mais leads convertidos em agendamentos' },
  { icon: Users, text: 'Menos pacientes que somem no meio da conversa' },
  { icon: Calendar, text: 'Redução de faltas e no-show' },
  { icon: BarChart3, text: 'Agenda mais cheia e previsível' },
  { icon: RefreshCw, text: 'Pacientes retornando automaticamente' },
  { icon: Zap, text: 'Ticket médio maior com pacotes e upsell' },
  { icon: Clock, text: 'Menos dependência da recepção' },
  { icon: ShieldCheck, text: 'Atendimento padronizado e profissional' },
]

const differentials = [
  { title: 'Não usa mensagens genéricas', desc: 'Cada resposta é personalizada com base no contexto real da conversa' },
  { title: 'Não depende de scripts engessados', desc: 'A IA adapta a linguagem ao perfil e intenção de cada paciente' },
  { title: 'Não trata todos os pacientes iguais', desc: 'Cada pessoa recebe uma jornada única, do interesse ao agendamento' },
  { title: 'Alimentada com dados reais da clínica', desc: 'Procedimentos, preços, objeções, políticas e estratégias de retorno' },
  { title: 'Conversas humanas e persuasivas', desc: 'Natural o suficiente para gerar confiança, estratégico o suficiente para converter' },
  { title: 'CRM completo integrado', desc: 'Toda jornada do paciente registrada, organizada e mensurável' },
]

const forWho = [
  'Clínicas de estética facial e corporal',
  'Clínicas premium ou em crescimento',
  'Clínicas com alto volume de WhatsApp',
  'Clínicas que querem aumentar ticket médio',
  'Clínicas que querem previsibilidade',
  'Clínicas cansadas de perder pacientes',
]

const testimonials = [
  {
    name: 'Dra. Amanda Costa',
    role: 'Clínica de Estética — São Paulo, SP',
    text: 'Aumentamos em 40% os agendamentos no primeiro mês. A IA responde os pacientes enquanto estou em pleno atendimento. Nunca mais perdi um lead por falta de resposta.',
    stars: 5,
    initials: 'AC',
    result: '+40% agendamentos',
  },
  {
    name: 'Dra. Renata Mello',
    role: 'Clínica Facial — Rio de Janeiro, RJ',
    text: 'Antes eu perdia pacientes por demora no WhatsApp. Agora a IA responde na hora, qualifica e já agenda. Minha recepção ficou livre para focar no atendimento presencial.',
    stars: 5,
    initials: 'RM',
    result: 'Recepção 100% focada',
  },
  {
    name: 'Dra. Fernanda Lima',
    role: 'Estética Avançada — Belo Horizonte, MH',
    text: 'O retorno de pacientes foi o que mais me surpreendeu. O sistema faz follow-up automaticamente e os pacientes voltam sem eu precisar ligar. O ticket médio subiu muito.',
    stars: 5,
    initials: 'FL',
    result: 'Ticket médio +35%',
  },
]

const plans = [
  {
    id: 'essential',
    name: 'Essential',
    tagline: 'Comece a converter',
    priceLabel: 'R$ 197',
    period: '/mês',
    tokens: '1.000',
    icon: Zap,
    popular: false,
    features: ['1.000 tokens/mês', 'IA lê imagens', 'IA transcreve áudios', 'Atendimento WhatsApp 24/7', 'CRM completo', 'Agendamento automático'],
    cta: 'Começar com Essential',
  },
  {
    id: 'clinica_pro',
    name: 'Clínica Pro',
    tagline: 'O preferido das clínicas',
    priceLabel: 'R$ 347',
    period: '/mês',
    tokens: '2.000',
    icon: Sparkles,
    popular: true,
    features: ['2.000 tokens/mês', 'IA lê imagens', 'IA transcreve áudios', 'Atendimento WhatsApp 24/7', 'CRM completo', 'Agendamento automático'],
    cta: 'Quero o Clínica Pro',
  },
  {
    id: 'elite_ia',
    name: 'Elite IA',
    tagline: 'Experiência total com IA',
    priceLabel: 'R$ 547',
    period: '/mês',
    tokens: '2.500',
    icon: Crown,
    popular: false,
    features: ['2.500 tokens/mês', 'IA lê imagens', 'IA transcreve áudios', 'IA envia áudios personalizados', 'Atendimento WhatsApp 24/7', 'CRM completo', 'Agendamento automático'],
    cta: 'Quero o Elite IA',
  },
]

const faq = [
  { q: 'O AutomaClinic funciona para qualquer tipo de clínica?', a: 'Sim. O sistema é ideal para clínicas de estética facial, corporal, laser, harmonização e áreas afins. É configurado com os dados reais da sua clínica, então a IA fala especificamente sobre seus procedimentos.' },
  { q: 'Preciso ter experiência com tecnologia para usar?', a: 'Não. O AutomaClinic foi criado para ser simples. Você acessa o painel, visualiza os resultados e acompanha os pacientes.' },
  { q: 'O que são tokens e como funcionam?', a: 'Tokens são as unidades que a IA usa para processar cada mensagem ou ação — resposta de texto, leitura de imagem, transcrição de áudio, agendamento, etc. Cada interação consome 1 token. Os tokens se renovam automaticamente todo mês.' },
  { q: 'A IA realmente consegue agendar automaticamente?', a: 'Sim. A IA identifica a intenção do paciente, verifica a disponibilidade configurada por você e marca o horário sem precisar da recepção. Tudo registrado no CRM.' },
  { q: 'Posso personalizar as respostas da IA com informações da minha clínica?', a: 'Sim, e isso é o diferencial. Você alimenta a IA com seus procedimentos, valores, diferenciais, políticas e estratégias de conversão. Ela fala como se fosse parte da sua equipe.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Não há fidelidade ou multa. Você pode cancelar ou trocar de plano a qualquer momento diretamente pelo painel.' },
]

/* ─────────────────────────── COMPONENTES MENORES ─────────────────────── */

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-600 mb-4">
      <Sparkles className="h-3 w-3" />
      {children}
    </div>
  )
}

function FaqItem({ item, open, onToggle }: { item: typeof faq[0]; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left text-sm font-semibold text-neutral-900 transition-colors hover:bg-primary-50/50"
        onClick={onToggle}
      >
        <span>{item.q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-primary-500 transition-transform duration-300 ml-4 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="border-t border-neutral-50 px-6 py-4 text-sm leading-relaxed text-neutral-600">
            {item.a}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── COMPONENTE PRINCIPAL ────────────────────── */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [headerScrolled, setHeaderScrolled] = useState(false)
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  /* Auto-avanço do carrossel */
  useEffect(() => {
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
    return () => { if (slideInterval.current) clearInterval(slideInterval.current) }
  }, [])

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx)
    if (slideInterval.current) clearInterval(slideInterval.current)
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
  }

  /* Header sombra ao rolar */
  useEffect(() => {
    const handler = () => setHeaderScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f4fb] font-sans">

      {/* ══════════════════════ HEADER ══════════════════════ */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${headerScrolled ? 'bg-white/95 backdrop-blur-xl shadow-md shadow-primary-100/50' : 'bg-white/70 backdrop-blur-md'} border-b border-primary-50`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/Logo.jpg"
              alt="AutoClinic"
              className="h-10 w-auto rounded-xl object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="hidden sm:block">
              <span className="font-display text-lg font-bold text-neutral-900">AutoClinic</span>
              <span className="ml-1.5 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-600">IA</span>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            {[
              { label: 'Problema', href: '#problema' },
              { label: 'Como funciona', href: '#como-funciona' },
              { label: 'Benefícios', href: '#beneficios' },
              { label: 'Planos', href: '#planos' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <a key={item.href} href={item.href} className="hover:text-primary-600 transition-colors">
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTAs desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-all"
            >
              Já tenho conta
            </Link>
            <Link
              to="/planos"
              className="rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-5 py-2 text-sm font-bold text-white shadow-md shadow-primary-200 hover:opacity-90 transition-opacity"
            >
              Ver Planos
            </Link>
          </div>

          {/* Menu mobile */}
          <button
            className="md:hidden rounded-xl p-2 text-neutral-600 hover:bg-neutral-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-100 bg-white px-6 py-4 space-y-3">
            {[
              { label: 'Problema', href: '#problema' },
              { label: 'Como funciona', href: '#como-funciona' },
              { label: 'Benefícios', href: '#beneficios' },
              { label: 'Planos', href: '#planos' },
              { label: 'FAQ', href: '#faq' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block text-sm font-medium text-neutral-700 hover:text-primary-600 py-1 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-neutral-100">
              <Link to="/login" className="rounded-xl border border-neutral-200 px-4 py-2.5 text-center text-sm font-semibold text-neutral-700">
                Já tenho conta
              </Link>
              <Link to="/planos" className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-700 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md">
                Ver Planos
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary-200/30 blur-3xl" />
          <div className="absolute left-0 top-1/3 h-72 w-72 rounded-full bg-secondary-200/40 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-80 w-80 rounded-full bg-primary-100/50 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-0 lg:pt-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Coluna de texto */}
            <div className="text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-600">
                <Sparkles className="h-3.5 w-3.5" />
                CRM com IA para clínicas de estética
              </div>

              <h1 className="font-display mb-6 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl lg:text-6xl">
                Transforme cada conversa no WhatsApp em{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-primary-500 to-secondary-600 bg-clip-text text-transparent">
                    faturamento
                  </span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-primary-100 rounded-full -z-0 opacity-60" />
                </span>
                {' '}para sua clínica.
              </h1>

              <p className="mb-8 text-lg leading-relaxed text-neutral-600 max-w-xl lg:max-w-none">
                Um sistema inteligente que responde, converte, agenda, acompanha e traz o paciente de volta
                — tudo de forma automática.
              </p>

              <div className="mb-8 grid grid-cols-2 gap-3 max-w-md mx-auto lg:mx-0">
                {[
                  'Mais agendamentos',
                  'Mais comparecimentos',
                  'Mais retorno de pacientes',
                  'Mais faturamento',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-neutral-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <Check className="h-3 w-3 text-primary-600" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  to="/planos"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-7 py-4 text-base font-bold text-white shadow-xl shadow-primary-200 hover:opacity-90 hover:shadow-2xl transition-all"
                >
                  Quero minha clínica faturando mais
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-7 py-4 text-base font-semibold text-neutral-700 hover:border-primary-300 hover:text-primary-600 transition-all shadow-sm"
                >
                  <Play className="h-4 w-4" />
                  Ver como funciona
                </a>
              </div>

              {/* Social proof inline */}
              <div className="mt-8 flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {['AC', 'RM', 'FL', 'JS'].map((i) => (
                    <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-400 to-secondary-500 text-[10px] font-bold text-white shadow">
                      {i}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">+50 clínicas já usam o AutoClinic</p>
                </div>
              </div>
            </div>

            {/* Carrossel */}
            <div className="relative">
              {/* Container do carrossel */}
              <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-primary-200/40 aspect-[4/3] lg:aspect-auto lg:h-[480px]">
                {heroSlides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      idx === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.alt}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement
                        el.style.display = 'none'
                        const parent = el.parentElement
                        if (parent) {
                          parent.style.background = 'linear-gradient(135deg, #f8e1ef 0%, #d8c5ff 100%)'
                          parent.innerHTML = `<div class="h-full w-full flex flex-col items-center justify-center gap-4 p-8 text-center"><div class="text-6xl">✨</div><p class="font-display text-xl font-bold text-primary-700">Sua imagem aqui</p><p class="text-sm text-primary-500">Adicione o arquivo <strong>${slide.image}</strong></p></div>`
                        }
                      }}
                    />
                    {/* Overlay gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/40 via-transparent to-transparent" />
                  </div>
                ))}

                {/* Controles do carrossel */}
                <button
                  onClick={() => goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-neutral-700 shadow hover:bg-white transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goToSlide((currentSlide + 1) % heroSlides.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-neutral-700 shadow hover:bg-white transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Indicadores */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToSlide(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        idx === currentSlide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Card flutuante */}
              <div className="absolute -bottom-6 -left-6 hidden lg:flex items-center gap-3 rounded-2xl bg-white border border-neutral-100 shadow-xl p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
                  <Zap className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">IA respondendo agora</p>
                  <p className="text-xs text-neutral-500">24h por dia, 7 dias por semana</p>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 hidden lg:flex items-center gap-3 rounded-2xl bg-white border border-neutral-100 shadow-xl p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">+40% agendamentos</p>
                  <p className="text-xs text-neutral-500">média das clínicas clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onda decorativa */}
        <div className="relative mt-16 h-16 overflow-hidden">
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full">
            <path d="M0 32L60 26.7C120 21.3 240 10.7 360 16C480 21.3 600 42.7 720 48C840 53.3 960 42.7 1080 37.3C1200 32 1320 32 1380 32L1440 32V64H1380C1320 64 1200 64 1080 64C960 64 840 64 720 64C600 64 480 64 360 64C240 64 120 64 60 64H0V32Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ══════════════════════ PROBLEMA ══════════════════════ */}
      <section id="problema" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <SectionBadge>O problema real</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Sua clínica perde dinheiro todos os dias
              <span className="block text-primary-600">— mesmo com agenda vazia.</span>
            </h2>
            <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
              A maioria das clínicas tem o mesmo problema:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
            {problems.map((problem, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-red-50 bg-red-50/50 p-4">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 mt-0.5">
                  <X className="h-3 w-3 text-red-500" />
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">{problem}</p>
              </div>
            ))}
          </div>

          {/* Resultado dos problemas */}
          <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-8 sm:p-10 text-center">
            <p className="font-display text-2xl sm:text-3xl font-bold text-white mb-4">
              Resultado?
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              {['Muito esforço', 'Pouca previsibilidade', 'Faturamento instável'].map((item) => (
                <span key={item} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  {item}
                </span>
              ))}
            </div>
            <p className="text-neutral-300 text-base mb-2">Não é falta de pacientes.</p>
            <p className="font-display text-xl font-bold text-primary-300">
              É falta de um processo inteligente de conversão e retorno.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════ A VIRADA ══════════════════════ */}
      <section className="bg-[#f7f4fb] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionBadge>O mecanismo único</SectionBadge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-5">
                O problema não é o atendimento.
                <span className="block text-primary-600 mt-1">É a falta de um sistema que saiba vender.</span>
              </h2>
              <p className="text-neutral-600 text-base leading-relaxed mb-8">
                O AutomaClinic não é um CRM comum. Ele foi criado para{' '}
                <strong className="text-neutral-900">pensar como uma vendedora experiente</strong>, que:
              </p>
              <ul className="space-y-3">
                {[
                  'Entende o que o paciente quer',
                  'Responde no tempo certo',
                  'Constrói confiança',
                  'Quebra objeções',
                  'Conduz para o agendamento',
                  'Confirma presença',
                  'Acompanha o tratamento',
                  'Oferece retorno, manutenção e novos procedimentos',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-neutral-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <Check className="h-3 w-3 text-primary-600" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-600 p-8 text-white shadow-xl shadow-primary-200/50">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold mb-3">
                  Um sistema que trabalha pela sua clínica 24h por dia
                </h3>
                <p className="text-primary-100 text-sm leading-relaxed">
                  Enquanto sua equipe cuida dos atendimentos, o sistema cuida do faturamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: MessageSquare, label: 'WhatsApp 24/7', desc: 'Nenhum lead sem resposta' },
                  { icon: Calendar, label: 'Agendamento auto', desc: 'Sem precisar da recepção' },
                  { icon: BarChart3, label: 'CRM completo', desc: 'Tudo registrado e organizado' },
                  { icon: RefreshCw, label: 'Retorno ativo', desc: 'Pacientes voltam sempre' },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                        <Icon className="h-4 w-4 text-primary-600" />
                      </div>
                      <p className="text-sm font-bold text-neutral-900">{item.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ COMO FUNCIONA ══════════════════════ */}
      <section id="como-funciona" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <SectionBadge>Passo a passo</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Como o AutomaClinic aumenta seu faturamento
            </h2>
            <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
              Da primeira mensagem ao retorno do paciente — tudo automatizado, tudo registrado
            </p>
          </div>

          {/* Linha do tempo */}
          <div className="relative">
            {/* Linha conectora desktop */}
            <div className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-200 to-transparent mx-16" />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {howItWorks.map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="relative flex flex-col rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm hover:border-primary-200 hover:shadow-md transition-all group">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md group-hover:shadow-primary-200 transition-shadow">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-bold tracking-widest text-neutral-400 uppercase">Passo {item.step}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-neutral-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-neutral-600">
            {['Tudo registrado no CRM', 'Tudo organizado', 'Tudo mensurável'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-4 py-2 font-medium text-primary-700">
                <Check className="h-3.5 w-3.5" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ BENEFÍCIOS ══════════════════════ */}
      <section id="beneficios" className="bg-[#f7f4fb] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <SectionBadge>Resultados reais</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              O que muda na prática quando sua clínica usa o AutomaClinic
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            {benefits.map((b, i) => {
              const Icon = b.icon
              return (
                <div key={i} className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm hover:border-primary-100 hover:shadow-md transition-all">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                    <Icon className="h-4 w-4 text-primary-600" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700 leading-relaxed">{b.text}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-secondary-50 p-8 sm:p-10 text-center">
            <p className="text-neutral-600 text-base mb-2">Não é sobre atender mais pessoas.</p>
            <p className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">
              É sobre{' '}
              <span className="text-primary-600">extrair mais valor de cada contato.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════ DIFERENCIAL ══════════════════════ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <SectionBadge>Por que não é só mais um CRM</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Aqui não existem respostas prontas.
              <span className="block text-primary-600">Existe inteligência de conversão.</span>
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {differentials.map((d, i) => (
              <div key={i} className="group rounded-2xl border border-neutral-100 bg-[#f7f4fb] p-6 hover:border-primary-200 hover:bg-white hover:shadow-md transition-all">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 group-hover:bg-primary-500 transition-colors">
                  <Check className="h-4 w-4 text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display text-base font-bold text-neutral-900 mb-2">{d.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>

          {/* IA capabilities */}
          <div className="mt-10 rounded-3xl border border-primary-100 bg-gradient-to-r from-primary-500 to-secondary-600 p-8 sm:p-10">
            <p className="font-display text-xl font-bold text-white text-center mb-6">A IA é alimentada com:</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: Image, label: 'Lê e interpreta imagens' },
                { icon: Mic, label: 'Transcreve e entende áudios' },
                { icon: Volume2, label: 'Envia áudios personalizados (Elite IA)' },
                { icon: MessageSquare, label: 'Responde textos naturais' },
                { icon: BarChart3, label: 'Usa dados reais da clínica' },
                { icon: ShieldCheck, label: 'Quebra objeções com informações reais' },
              ].map((cap) => {
                const Icon = cap.icon
                return (
                  <div key={cap.label} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                    <Icon className="h-4 w-4 text-primary-100 shrink-0" />
                    <span className="text-sm text-white/90 font-medium">{cap.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ PARA QUEM É ══════════════════════ */}
      <section className="bg-[#f7f4fb] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionBadge>Para quem é</SectionBadge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-5">
                Ideal para clínicas que querem crescer de forma inteligente
              </h2>
              <div className="space-y-3">
                {forWho.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-primary-50 bg-white p-4 shadow-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <Check className="h-3 w-3 text-primary-600" />
                    </span>
                    <span className="text-sm font-medium text-neutral-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-8 sm:p-10 text-white shadow-2xl">
              <h3 className="font-display text-2xl font-bold mb-4 leading-tight">
                Se sua clínica depende só da recepção para vender,
              </h3>
              <p className="text-xl font-bold text-primary-300 mb-6">
                você está deixando dinheiro na mesa.
              </p>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Cada lead que não recebe resposta rápida, cada paciente que some após a avaliação, cada procedimento sem retorno marcado — isso é receita perdida.
              </p>
              <Link
                to="/planos"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
              >
                Quero resolver isso agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ DEPOIMENTOS ══════════════════════ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <SectionBadge>Resultados reais</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
              O que dizem as clínicas que usam
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="relative flex flex-col rounded-3xl border border-neutral-100 bg-[#f7f4fb] p-7 shadow-sm hover:shadow-md transition-shadow">
                {/* Badge de resultado */}
                <div className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-3 py-1 text-xs font-bold text-white shadow-md">
                  {t.result}
                </div>

                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-neutral-600 flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-xs font-bold text-white shadow">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{t.name}</p>
                    <p className="text-xs text-neutral-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ PLANOS (resumido) ══════════════════════ */}
      <section id="planos" className="bg-[#f7f4fb] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <SectionBadge>Planos e preços</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Escolha o plano ideal para sua clínica
            </h2>
            <p className="text-neutral-500 text-lg">
              Todos incluem CRM completo, IA integrada ao WhatsApp e renovação automática de tokens
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-10">
            {plans.map((plan) => {
              const Icon = plan.icon
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${
                    plan.popular
                      ? 'border-primary-300 ring-2 ring-primary-200 shadow-lg'
                      : 'border-neutral-100'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary-500 to-secondary-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                        <Star className="h-3 w-3 fill-current" />
                        MAIS POPULAR
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-7">
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 shadow-md">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{plan.tagline}</p>
                        <h3 className="font-display text-xl font-bold text-neutral-900">{plan.name}</h3>
                      </div>
                      <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-700">
                        {plan.tokens} tokens
                      </span>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-end gap-1">
                        <span className="font-display text-4xl font-extrabold text-neutral-900">{plan.priceLabel}</span>
                        <span className="mb-1 text-neutral-400 text-sm">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="mb-6 space-y-2 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/planos"
                      className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-primary-500 to-primary-700 text-white shadow-md hover:opacity-90'
                          : 'border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {plan.cta}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-neutral-400">
            Todos os planos incluem suporte, atualizações automáticas e CRM completo.{' '}
            <Link to="/planos" className="font-semibold text-primary-600 hover:underline">
              Ver comparativo completo →
            </Link>
          </p>
        </div>
      </section>

      {/* ══════════════════════ RESULTADO / ANCORAGEM ══════════════════════ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <SectionBadge>Resultado garantido</SectionBadge>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 mb-5">
                Uma clínica organizada fatura mais.
                <span className="block text-primary-600 mt-1">Uma clínica inteligente cresce.</span>
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-6">
                Com processos claros de conversão, agendamento, retorno e upsell, o AutomaClinic ajuda sua clínica a crescer de forma previsível e sustentável.
              </p>
              <div className="space-y-3">
                {[
                  'Aumentar a taxa de conversão',
                  'Aproveitar melhor cada lead',
                  'Reduzir desperdício de agenda',
                  'Criar recorrência de pacientes',
                  'Escalar sem aumentar equipe',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-neutral-700">
                    <Check className="h-4 w-4 shrink-0 text-primary-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '+40%', label: 'Média de aumento em agendamentos', color: 'from-primary-500 to-primary-700' },
                { value: '-60%', label: 'Redução de faltas e no-shows', color: 'from-secondary-500 to-secondary-700' },
                { value: '24/7', label: 'Atendimento ativo sem recepção', color: 'from-primary-400 to-secondary-600' },
                { value: '+35%', label: 'Aumento médio no ticket médio', color: 'from-primary-600 to-secondary-500' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl bg-gradient-to-br ${stat.color} p-6 text-white shadow-md`}>
                  <p className="font-display text-4xl font-extrabold mb-2">{stat.value}</p>
                  <p className="text-xs text-white/80 leading-relaxed">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-neutral-100 bg-neutral-50 p-8 text-center">
            <p className="text-neutral-500 text-base mb-2">Não é mágica.</p>
            <p className="font-display text-2xl font-bold text-neutral-900">
              É método, automação e estratégia.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FAQ ══════════════════════ */}
      <section id="faq" className="bg-[#f7f4fb] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <SectionBadge>Dúvidas frequentes</SectionBadge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900">
              Respondendo suas perguntas
            </h2>
          </div>

          <div className="space-y-3">
            {faq.map((item, i) => (
              <FaqItem
                key={i}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA FINAL ══════════════════════ */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-600 p-10 sm:p-16 text-center shadow-2xl shadow-primary-200">
            {/* Decoração */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-secondary-300/20 blur-2xl" />
              <div className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-primary-300/20 blur-2xl" />
            </div>

            <div className="relative">
              <h2 className="font-display mb-4 text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Pronta para transformar conversas em faturamento?
              </h2>
              <p className="mb-10 text-base sm:text-lg leading-relaxed text-primary-100 max-w-2xl mx-auto">
                Chega de perder pacientes por falta de resposta, acompanhamento ou organização.
                Implemente um sistema que trabalha pela sua clínica todos os dias.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/planos"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-xl hover:bg-primary-50 hover:shadow-2xl transition-all"
                >
                  Quero aumentar o faturamento da minha clínica
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white hover:bg-white/20 transition-all"
                >
                  Já tenho conta — Entrar
                </Link>
              </div>

              <p className="mt-8 text-sm text-primary-200">
                Sem fidelidade · Cancele quando quiser · Suporte incluído
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer className="border-t border-neutral-100 bg-white px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/Logo.jpg"
                alt="AutoClinic"
                className="h-8 w-auto rounded-xl object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
              <span className="font-display text-sm font-bold text-neutral-700">AutoClinic</span>
            </div>

            <nav className="flex flex-wrap justify-center gap-5 text-xs font-medium text-neutral-500">
              <a href="#problema" className="hover:text-primary-600 transition-colors">Problema</a>
              <a href="#como-funciona" className="hover:text-primary-600 transition-colors">Como funciona</a>
              <a href="#beneficios" className="hover:text-primary-600 transition-colors">Benefícios</a>
              <a href="#planos" className="hover:text-primary-600 transition-colors">Planos</a>
              <a href="#faq" className="hover:text-primary-600 transition-colors">FAQ</a>
              <Link to="/planos" className="hover:text-primary-600 transition-colors">Ver Planos</Link>
              <Link to="/login" className="hover:text-primary-600 transition-colors">Login</Link>
            </nav>

            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>🔒</span>
              <span>© {new Date().getFullYear()} AutoClinic. Todos os direitos reservados.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
