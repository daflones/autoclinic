import { useState } from 'react'
import { Check, Sparkles, RefreshCw, ArrowRight, Star, Loader2, Zap, MessageSquare, Calendar } from 'lucide-react'
import { usePlanos } from '@/hooks/usePlanos'

const testimonials = [
  {
    name: 'Dra. Amanda Costa',
    role: 'Clínica de Estética — SP',
    text: 'Aumentamos em 40% os agendamentos no primeiro mês. A IA responde os pacientes enquanto estou em atendimento.',
    stars: 5,
    initials: 'AC',
  },
  {
    name: 'Dra. Renata Mello',
    role: 'Clínica Facial — RJ',
    text: 'Antes eu perdia pacientes por demora no WhatsApp. Agora a IA responde na hora e ainda agenda automaticamente.',
    stars: 5,
    initials: 'RM',
  },
  {
    name: 'Dra. Fernanda Lima',
    role: 'Estética Avançada — BH',
    text: 'O plano Elite IA foi um divisor de águas. Os pacientes adoram receber áudios personalizados da IA.',
    stars: 5,
    initials: 'FL',
  },
]

const faq = [
  {
    q: 'O que são tokens e como funcionam?',
    a: 'Tokens são as unidades de processamento da IA. Cada mensagem enviada ou ação realizada pela IA (resposta de texto, leitura de imagem, transcrição de áudio, agendamento, etc.) consome 1 token. Quanto mais a IA interage com seus pacientes, mais tokens são utilizados.',
  },
  {
    q: 'O que acontece se eu esgotar os tokens antes do mês acabar?',
    a: 'Você pode adquirir tokens adicionais a qualquer momento ou aguardar a renovação automática no início do próximo ciclo mensal. Seu saldo é sempre reposto na data de renovação.',
  },
  {
    q: 'Posso trocar de plano a qualquer momento?',
    a: 'Sim. Você pode fazer upgrade ou downgrade do plano a qualquer momento. O novo plano entra em vigor imediatamente após a confirmação.',
  },
  {
    q: 'A IA consegue agendar consultas automaticamente?',
    a: 'Sim! A IA identifica a intenção do paciente e pode agendar diretamente no sistema, respeitando a disponibilidade configurada por você. Cada ação de agendamento consome 1 token.',
  },
]

export default function PlanosPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { planos, loading: planosLoading }  = usePlanos()

  return (
    <div className="min-h-screen bg-[#f7f4fb]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-primary-100 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/Logo.jpg"
              alt="AutoClinic"
              className="h-9 w-auto rounded-xl object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <div className="hidden sm:block">
              <span className="font-display text-lg font-bold tracking-tight text-neutral-800">AutoClinic</span>
              <span className="ml-1.5 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-600">IA</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-neutral-600">
            <a href="#planos" className="hover:text-primary-600 transition-colors">Planos</a>
            <a href="#comparativo" className="hover:text-primary-600 transition-colors">Comparativo</a>
            <a href="#como-funciona" className="hover:text-primary-600 transition-colors">Como funciona</a>
            <a href="#faq" className="hover:text-primary-600 transition-colors">FAQ</a>
          </nav>

          <a
            href="#planos"
            className="rounded-full bg-gradient-to-r from-primary-500 to-primary-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-200 hover:opacity-90 transition-opacity"
          >
            Ver Planos
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[480px] w-[700px] -translate-x-1/2 rounded-full bg-primary-200/40 blur-3xl" />
          <div className="absolute left-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-secondary-200/50 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-tertiary-300/60 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-600">
            <Sparkles className="h-3.5 w-3.5" />
            Sistema com IA para clínicas de estética
          </div>

          <h1 className="font-display mb-6 text-5xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl">
            Transforme cada conversa
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-secondary-600 bg-clip-text text-transparent">
              em faturamento
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Um sistema inteligente que responde, converte, agenda, acompanha e traz o paciente de volta
            — tudo de forma automática no WhatsApp.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {['Mais agendamentos', 'Menos no-shows', 'Mais retorno de pacientes', 'Mais faturamento'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-full border border-primary-100 bg-white px-4 py-2 text-neutral-700 shadow-sm">
                <Check className="h-3.5 w-3.5 text-primary-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOKENS EXPLICADOS ── */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-secondary-500 shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-display mb-1 text-base font-bold text-neutral-900">Como funcionam os tokens?</h3>
                <p className="text-sm leading-relaxed text-neutral-600">
                  Cada <strong>mensagem ou ação gerada pela IA</strong> consome <strong>1 token</strong> — seja uma resposta de texto,
                  leitura de imagem, transcrição de áudio, agendamento ou qualquer outra interação automática.
                  Os tokens se renovam automaticamente todo mês, sempre recolocando o saldo completo do seu plano.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="font-display mb-3 text-4xl font-bold text-neutral-900">Escolha o plano ideal para sua clínica</h2>
            <p className="text-neutral-500 text-lg">Todos incluem renovação automática de tokens a cada mês</p>
          </div>

          {planosLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
            </div>
          ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {planos.map((plan) => {
              const PlanIcon = plan.icon
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-3xl border bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    plan.popular
                      ? `border-primary-300 shadow-lg ring-2 ${plan.config.ringClass}`
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

                  <div className="flex flex-col flex-1 p-8">
                    {/* Ícone + badge */}
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.config.iconBg} shadow-md`}>
                          <PlanIcon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-1">{plan.tagline}</p>
                        <h3 className="font-display text-2xl font-bold text-neutral-900">{plan.nome}</h3>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${plan.config.badgeBg} ${plan.config.badgeText}`}>
                        {plan.tokens} tokens
                      </span>
                    </div>

                    {/* Preço */}
                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="font-display text-5xl font-extrabold text-neutral-900">{plan.priceLabel}</span>

                        <span className="mb-2 text-neutral-400 text-sm">{plan.period}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{plan.descricao}</p>
                    </div>

                    {/* CTA */}
                    <button
                      style={{ background: `linear-gradient(135deg, ${plan.config.accentFrom}, ${plan.config.accentTo})` }}
                      className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:opacity-90 hover:shadow-lg"
                    >
                      {plan.config.cta}
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <div className="mb-6 border-t border-neutral-100" />

                    {/* Token card */}
                    <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${plan.config.iconBg} shadow`}>
                          <RefreshCw className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary-700">{plan.tokens} tokens renovados/mês</p>
                          <p className="text-xs text-primary-500">1 token por mensagem ou ação da IA</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${feat.highlight ? plan.config.checkBg : 'bg-neutral-100'}`}>
                            <Check className={`h-3 w-3 ${feat.highlight ? 'text-white' : 'text-neutral-500'}`} />
                          </div>
                          <span className={`text-sm ${feat.highlight ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
                            {feat.text}
                          </span>
                        </li>
                      ))}
                      {plan.notIncluded.map((item: string, i: number) => (
                        <li key={`no-${i}`} className="flex items-start gap-3 opacity-40">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                            <span className="text-xs leading-none text-neutral-400">—</span>
                          </div>
                          <span className="text-sm text-neutral-400 line-through">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
          )}

          <p className="mt-8 text-center text-sm text-neutral-400">
            Todos os planos incluem acesso ao CRM completo, suporte e atualizações automáticas.
          </p>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section id="comparativo" className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-bold text-neutral-900">Compare os planos</h2>
            <p className="text-neutral-500">Veja o que está incluído em cada plano</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/80">
                    <th className="px-6 py-5 text-left text-sm font-semibold text-neutral-500">Recurso</th>
                    <th className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-primary-600">Essential</span>
                    </th>
                    <th className="px-6 py-5 text-center bg-primary-50/50">
                      <span className="text-sm font-bold text-primary-700">Clínica Pro</span>
                      <div className="text-[10px] font-semibold text-primary-400 mt-0.5">Popular</div>
                    </th>
                    <th className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-secondary-700">Elite IA</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {[
                    { feature: 'Tokens mensais', essential: '1.000', pro: '2.000', elite: '2.500' },
                    { feature: 'Tokens por mensagem/ação da IA', essential: '1 token', pro: '1 token', elite: '1 token' },
                    { feature: 'IA lê e interpreta imagens', essential: true, pro: true, elite: true },
                    { feature: 'IA transcreve áudios recebidos', essential: true, pro: true, elite: true },
                    { feature: 'IA envia áudios personalizados', essential: false, pro: false, elite: true },
                    { feature: 'Atendimento WhatsApp 24/7', essential: true, pro: true, elite: true },
                    { feature: 'CRM de pacientes', essential: true, pro: true, elite: true },
                    { feature: 'Agendamento automático', essential: true, pro: true, elite: true },
                    { feature: 'Relatórios de conversão', essential: true, pro: true, elite: true },
                    { feature: 'Renovação automática mensal', essential: true, pro: true, elite: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-neutral-700">{row.feature}</td>
                      {(['essential', 'pro', 'elite'] as const).map((key, j) => {
                        const val = row[key]
                        const isPopular = key === 'pro'
                        return (
                          <td key={j} className={`px-6 py-4 text-center ${isPopular ? 'bg-primary-50/30' : ''}`}>
                            {typeof val === 'boolean' ? (
                              val
                                ? <Check className="mx-auto h-5 w-5 text-primary-500" />
                                : <span className="text-neutral-300 text-lg">—</span>
                            ) : (
                              <span className={`text-sm font-bold ${isPopular ? 'text-primary-700' : key === 'elite' ? 'text-secondary-700' : 'text-primary-600'}`}>
                                {val}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-bold text-neutral-900">Como o AutoClinic aumenta seu faturamento</h2>
            <p className="text-neutral-500">Da primeira mensagem ao retorno do paciente — tudo automatizado</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { step: '1', title: 'Lead chama no WhatsApp', desc: 'A IA responde instantaneamente — cada resposta usa 1 token', icon: MessageSquare },
              { step: '2', title: 'Entende a intenção', desc: 'Analisa imagens, áudios e textos do paciente', icon: Sparkles },
              { step: '3', title: 'Apresenta o procedimento', desc: 'Sugere o tratamento ideal com argumentos persuasivos', icon: Star },
              { step: '4', title: 'Agenda automaticamente', desc: 'Marca horários respeitando sua disponibilidade', icon: Calendar },
              { step: '5', title: 'Confirma a presença', desc: 'Envia lembretes e reduz faltas drasticamente', icon: Check },
              { step: '6', title: 'Ativa retorno e upsell', desc: 'Após o atendimento, faz follow-up e oferece manutenção', icon: RefreshCw },
            ].map((item) => {
              const StepIcon = item.icon
              return (
                <div key={item.step} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:border-primary-100 hover:shadow-md">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50">
                    <StepIcon className="h-5 w-5 text-primary-500" />
                  </div>
                  <p className="mb-1 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">Passo {item.step}</p>
                  <h3 className="font-display mb-2 text-base font-bold text-neutral-900">{item.title}</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-bold text-neutral-900">O que dizem as clínicas que usam</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-neutral-600">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 text-xs font-bold text-white shadow">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
                    <p className="text-xs text-neutral-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-bold text-neutral-900">Dúvidas frequentes</h2>
          </div>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm">
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  <span className={`ml-4 shrink-0 text-primary-500 transition-transform duration-200 text-lg leading-none ${openFaq === i ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>
                {openFaq === i && (
                  <div className="border-t border-neutral-50 px-6 py-4 text-sm leading-relaxed text-neutral-600">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500 to-secondary-600 p-12 text-center shadow-xl shadow-primary-200">
            {/* Decorative */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-16 right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
            </div>
            <div className="relative">
              <div className="mb-4 text-4xl">🚀</div>
              <h2 className="font-display mb-4 text-3xl font-extrabold text-white">
                Pronta para transformar conversas em faturamento?
              </h2>
              <p className="mb-8 text-base leading-relaxed text-primary-100">
                Chega de perder pacientes por falta de resposta, acompanhamento ou organização.
                Implemente um sistema que trabalha pela sua clínica todos os dias.
              </p>
              <a
                href="#planos"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold text-primary-700 shadow-lg transition-all hover:bg-primary-50 hover:shadow-xl"
              >
                Quero aumentar o faturamento da minha clínica
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-neutral-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/Logo.jpg"
              alt="AutoClinic"
              className="h-7 w-auto rounded-lg object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <span className="font-display text-sm font-semibold text-neutral-600">AutoClinic</span>
          </div>
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} AutoClinic — Todos os direitos reservados
          </p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <span>🔒</span>
            <span>Pagamentos seguros</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
