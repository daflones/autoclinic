import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap, Sparkles, Crown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PlanoFeature {
  text: string
  highlight: boolean
}

export interface PlanoConfig {
  accentFrom: string
  accentTo: string
  badgeBg: string
  badgeText: string
  ringClass: string
  iconBg: string
  checkBg: string
  cta: string
}

export interface Plano {
  id: string
  slug: string
  nome: string
  tagline: string
  preco: number
  priceLabel: string   // formatado: 'R$ 197'
  period: string       // '/mês'
  tokens: string
  descricao: string
  popular: boolean
  ordem: number
  features: PlanoFeature[]
  notIncluded: string[]
  config: PlanoConfig
  icon: LucideIcon
}

// Mapeia slug → ícone lucide (não armazenamos componentes no banco)
const ICON_MAP: Record<string, LucideIcon> = {
  essential:  Zap,
  clinica_pro: Sparkles,
  elite_ia:   Crown,
}

// Dados de fallback caso o Supabase falhe
const FALLBACK: Plano[] = [
  {
    id: 'essential',
    slug: 'essential',
    nome: 'Essential',
    tagline: 'Comece a converter',
    preco: 197,
    priceLabel: 'R$ 197',
    period: '/mês',
    tokens: '1.000',
    descricao: 'Para clínicas que querem dar o primeiro passo na automação do atendimento via WhatsApp.',
    popular: false,
    ordem: 0,
    features: [
      { text: '1.000 tokens/mês — 1 token por mensagem ou ação da IA', highlight: true },
      { text: 'Renovação automática todo mês', highlight: false },
      { text: 'IA lê e interpreta imagens enviadas', highlight: false },
      { text: 'IA transcreve e entende áudios', highlight: false },
      { text: 'Atendimento automático no WhatsApp', highlight: false },
      { text: 'CRM completo de pacientes', highlight: false },
      { text: 'Agendamento inteligente', highlight: false },
    ],
    notIncluded: ['IA envia áudios personalizados'],
    config: {
      accentFrom: '#C265A3', accentTo: '#A15486',
      badgeBg: 'bg-primary-100', badgeText: 'text-primary-700',
      ringClass: 'ring-primary-200', iconBg: 'from-primary-400 to-primary-600',
      checkBg: 'bg-primary-500', cta: 'Começar com Essential',
    },
    icon: Zap,
  },
  {
    id: 'clinica_pro',
    slug: 'clinica_pro',
    nome: 'Clínica Pro',
    tagline: 'O preferido das clínicas',
    preco: 347,
    priceLabel: 'R$ 347',
    period: '/mês',
    tokens: '2.000',
    descricao: 'Para clínicas em crescimento que querem dobrar os agendamentos sem aumentar a equipe.',
    popular: true,
    ordem: 1,
    features: [
      { text: '2.000 tokens/mês — 1 token por mensagem ou ação da IA', highlight: true },
      { text: 'Renovação automática todo mês', highlight: false },
      { text: 'IA lê e interpreta imagens enviadas', highlight: false },
      { text: 'IA transcreve e entende áudios', highlight: false },
      { text: 'Atendimento automático no WhatsApp', highlight: false },
      { text: 'CRM completo de pacientes', highlight: false },
      { text: 'Agendamento inteligente', highlight: false },
    ],
    notIncluded: ['IA envia áudios personalizados'],
    config: {
      accentFrom: '#C265A3', accentTo: '#8655FF',
      badgeBg: 'bg-secondary-200', badgeText: 'text-secondary-800',
      ringClass: 'ring-secondary-300', iconBg: 'from-primary-500 to-secondary-600',
      checkBg: 'bg-primary-500', cta: 'Quero o Clínica Pro',
    },
    icon: Sparkles,
  },
  {
    id: 'elite_ia',
    slug: 'elite_ia',
    nome: 'Elite IA',
    tagline: 'Experiência total com IA',
    preco: 547,
    priceLabel: 'R$ 547',
    period: '/mês',
    tokens: '2.500',
    descricao: 'Para clínicas premium que querem o máximo de conversão e uma experiência inesquecível.',
    popular: false,
    ordem: 2,
    features: [
      { text: '2.500 tokens/mês — 1 token por mensagem ou ação da IA', highlight: true },
      { text: 'Renovação automática todo mês', highlight: false },
      { text: 'IA lê e interpreta imagens enviadas', highlight: false },
      { text: 'IA transcreve e entende áudios', highlight: false },
      { text: 'IA envia áudios personalizados', highlight: true },
      { text: 'Atendimento automático no WhatsApp', highlight: false },
      { text: 'CRM completo de pacientes', highlight: false },
      { text: 'Agendamento inteligente', highlight: false },
    ],
    notIncluded: [],
    config: {
      accentFrom: '#A15486', accentTo: '#6A30F0',
      badgeBg: 'bg-secondary-100', badgeText: 'text-secondary-700',
      ringClass: 'ring-secondary-200', iconBg: 'from-primary-600 to-secondary-700',
      checkBg: 'bg-secondary-600', cta: 'Quero o Elite IA',
    },
    icon: Crown,
  },
]

function formatPreco(preco: number): string {
  return `R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function mapRow(row: any): Plano {
  const config: PlanoConfig = {
    accentFrom: '#C265A3',
    accentTo: '#A15486',
    badgeBg: 'bg-primary-100',
    badgeText: 'text-primary-700',
    ringClass: 'ring-primary-200',
    iconBg: 'from-primary-400 to-primary-600',
    checkBg: 'bg-primary-500',
    cta: `Assinar ${row.nome}`,
    ...(row.config ?? {}),
  }
  return {
    id: row.id,
    slug: row.slug,
    nome: row.nome,
    tagline: row.tagline ?? '',
    preco: row.preco,
    priceLabel: formatPreco(row.preco),
    period: '/mês',
    tokens: row.tokens ?? '',
    descricao: row.descricao ?? '',
    popular: row.popular ?? false,
    ordem: row.ordem ?? 0,
    features: (row.features ?? []) as PlanoFeature[],
    notIncluded: (row.not_included ?? []) as string[],
    config,
    icon: ICON_MAP[row.slug] ?? Zap,
  }
}

export function usePlanos() {
  const [planos, setPlanos] = useState<Plano[]>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error: err } = await supabase
          .from('planos')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true })
        if (err) throw err
        if (!cancelled && data && data.length > 0) {
          setPlanos(data.map(mapRow))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Erro ao carregar planos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { planos, loading, error }
}
