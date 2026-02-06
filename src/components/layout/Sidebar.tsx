import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  UserSquare,
  Sparkles,
  CalendarDays,
  ScrollText,
  FolderOpen,
  Settings2,
  Package,
  Palette,
  LogOut,
  Bot,
  MessageCircle,
  CreditCard,
  QrCode,
  BarChart3
} from 'lucide-react'

type AppRole = 'clinica' | 'admin' | 'profissional' | 'recepcao' | 'gestor'

interface MenuItem {
  label: string
  description?: string
  icon: any
  href: string
  color: string
  adminOnly?: boolean
  allowedRoles?: AppRole[]
  subItems?: MenuItem[]
}
import { useAuthStore } from '@/stores/authStore'
import { usePlanoAtivo } from '@/hooks/usePlanoAtivo'
import { useIAConfig } from '@/hooks/useIAConfig'
import { SubscriptionStatusBanner } from '@/components/SubscriptionNotifications'
import { Button } from '@/components/ui/button'

const ALL_ROLES: AppRole[] = ['clinica', 'admin', 'profissional', 'recepcao', 'gestor']
const ADMIN_ROLES: AppRole[] = ['clinica', 'admin']
const ADMIN_GESTOR: AppRole[] = ['clinica', 'admin', 'gestor']

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard Inteligente',
    description: 'Indicadores clínicos em tempo real',
    icon: LayoutDashboard,
    href: '/app/dashboard',
    color: 'from-primary-400 to-primary-600',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Pacientes',
    description: 'Histórico, fichas e prontuários',
    icon: Users,
    href: '/app/pacientes',
    color: 'from-secondary-400 to-secondary-600',
    allowedRoles: ['clinica', 'admin', 'profissional', 'recepcao', 'gestor'],
    subItems: []
  },
  {
    label: 'Profissionais',
    description: 'Equipe clínica, agendas e metas',
    icon: UserSquare,
    href: '/app/profissionais',
    color: 'from-primary-500 to-primary-700',
    allowedRoles: ADMIN_GESTOR,
  },
  {
    label: 'Procedimentos',
    description: 'Catálogo de tratamentos e protocolos',
    icon: Sparkles,
    href: '/app/procedimentos',
    color: 'from-secondary-300 to-secondary-500',
    allowedRoles: ADMIN_GESTOR,
  },
  {
    label: 'Categorias de Tratamento',
    icon: Palette,
    href: '/app/categorias',
    color: 'from-primary-300 to-primary-500',
    allowedRoles: ADMIN_GESTOR,
  },
  {
    label: 'Protocolos/Pacotes',
    description: 'Biblioteca de pacotes e protocolos',
    icon: Package,
    href: '/app/protocolos-pacotes',
    color: 'from-secondary-300 to-primary-300',
    allowedRoles: ADMIN_GESTOR,
  },
  {
    label: 'Agenda Inteligente',
    description: 'Agendamentos e salas simultâneas',
    icon: CalendarDays,
    href: '/app/agendamentos',
    color: 'from-primary-400 to-secondary-400',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Planos de Tratamento',
    description: 'Protocolos clínicos e acompanhamento',
    icon: ScrollText,
    href: '/app/planos-tratamento',
    color: 'from-tertiary-300 to-primary-400',
    allowedRoles: ['clinica', 'admin', 'profissional', 'gestor'],
  },
  {
    label: 'Arquivos Clínicos',
    icon: FolderOpen,
    href: '/app/arquivos',
    color: 'from-primary-200 to-primary-400',
    allowedRoles: ['clinica', 'admin', 'profissional', 'gestor'],
  },
  {
    label: 'Biblioteca IA',
    icon: Bot,
    href: '/app/arquivos-ia',
    color: 'from-secondary-300 to-secondary-500',
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'Automação & Disparos',
    description: 'Disparador e evolução omnichannel',
    icon: MessageCircle,
    href: '/app/whatsapp',
    color: 'from-primary-400 to-secondary-400',
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'Chat WhatsApp',
    description: 'Conversas e atendimento em tempo real',
    icon: MessageCircle,
    href: '/app/chat',
    color: 'from-green-400 to-green-600',
    allowedRoles: ALL_ROLES,
  },
  {
    label: 'Configurações da Clínica',
    icon: Settings2,
    href: '/app/configuracoes',
    color: 'from-neutral-200 to-neutral-400',
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'Configurações de IA',
    icon: QrCode,
    href: '/app/configuracoes-ia',
    color: 'from-primary-500 to-secondary-500',
    allowedRoles: ADMIN_ROLES,
  },
  {
    label: 'Relatórios',
    description: 'Análises e métricas da clínica',
    icon: BarChart3,
    href: '/app/relatorios',
    color: 'from-purple-400 to-pink-500',
    allowedRoles: ADMIN_GESTOR,
  },
  {
    label: 'Planos & Assinaturas',
    icon: CreditCard,
    href: '/planos',
    color: 'from-tertiary-400 to-secondary-400',
    allowedRoles: ADMIN_ROLES,
  }
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { planoAtivo } = usePlanoAtivo()
  const { data: iaConfigData } = useIAConfig() as any

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate('/app/dashboard')
  }

  const userRole = (user?.role || 'profissional') as AppRole
  const isAdmin = userRole === 'admin' || userRole === 'clinica'

  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    
    // Filtrar por role
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) return false
    
    // Ocultar página Planos se o usuário já tem plano ativo
    if (item.href === '/planos' && planoAtivo) return false
    
    // Ocultar Arquivos IA se envia_documento não for explicitamente true
    if (item.href === '/app/arquivos-ia' && (iaConfigData as any)?.envia_documento !== true) return false
    
    // Ocultar WhatsApp Web da sidebar (funcionalidade existe mas aba fica oculta)
    if (item.href === '/app/whatsapp-web') return false
    
    return true
  })

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Branding */}
      <div className="relative flex h-28 w-full flex-col justify-center overflow-hidden rounded-[24px] border border-white/40 bg-white/40 px-5 py-4 shadow-[0_12px_40px_-24px_rgba(49,17,72,0.45)] dark:border-white/10 dark:bg-neutral-900/70">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-400/40 via-secondary-300/30 to-secondary-400/40 blur-2xl" />
        <button
          type="button"
          onClick={handleDashboardClick}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden flex-shrink-0">
            <img src="/Logo2.jpg" alt="AutomaClinic" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-1 flex-col">
            <span className="font-display text-lg font-semibold text-neutral-900 dark:text-white">AutomaClinic</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400">CRM COM IA PARA ESTÉTICA</span>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1 space-y-2 overflow-y-auto pr-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
          const hasSubItems = item.subItems && item.subItems.length > 0
          const isParentActive = hasSubItems && item.subItems?.some(sub => location.pathname === sub.href || location.pathname.startsWith(`${sub.href}/`))

          const gradientClass = `bg-gradient-to-r ${item.color}`

          const baseClasses = cn(
            'group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200',
            isActive || isParentActive
              ? `${gradientClass} text-white shadow-[0_16px_32px_-22px_rgba(49,17,72,0.65)]`
              : 'bg-white/55 text-neutral-600 hover:bg-white/80 dark:bg-neutral-900/55 dark:text-neutral-200 dark:hover:bg-neutral-900/80 border border-white/30 dark:border-white/10 shadow-[0_12px_30px_-28px_rgba(49,17,72,0.55)]'
          )

          const content = (
            <>
              <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-white/30 text-primary-600 shadow-sm backdrop-blur-sm transition-transform group-hover:scale-[1.08]',
                isActive || isParentActive ? 'border-white/50 text-white bg-white/15 shadow-white/25' : 'dark:text-primary-200'
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-neutral-800 dark:text-neutral-100 group-hover:translate-x-[1px]">
                  {item.label}
                </span>
                {item.description && (
                  <span className={cn(
                    'text-xs text-neutral-500 transition-opacity duration-200',
                    isActive || isParentActive ? 'text-white/80' : 'group-hover:opacity-90'
                  )}>
                    {item.description}
                  </span>
                )}
              </div>
            </>
          )

          // Special handling for dashboard button (anchor) and planos route (outside /app)
          if (item.href === '/app/dashboard') {
            return (
              <button
                key={item.href}
                type="button"
                onClick={handleDashboardClick}
                className={baseClasses}
              >
                {content}
              </button>
            )
          }

          if (item.href === '/planos') {
            return (
              <Link key={item.href} to={item.href} className={baseClasses}>
                {content}
              </Link>
            )
          }

          return (
            <div key={item.href}>
              <Link to={item.href} className={baseClasses}>
                {content}
              </Link>

              {hasSubItems && (
                <div className="ml-5 mt-2 space-y-1.5 border-l border-white/30 pl-4">
                  {item.subItems!.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isSubActive = location.pathname === subItem.href || location.pathname.startsWith(`${subItem.href}/`)

                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={cn(
                          'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200',
                          isSubActive
                            ? 'bg-primary-500/90 text-white shadow-md shadow-primary-500/30'
                            : 'text-neutral-500 hover:bg-white/70 hover:text-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900/50'
                        )}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/40 text-primary-500 dark:bg-neutral-800/70">
                          <SubIcon className="h-4 w-4" />
                        </span>
                        {subItem.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="mt-6 rounded-[24px] border border-white/40 bg-white/45 p-4 shadow-[0_18px_48px_-34px_rgba(50,20,75,0.65)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/70">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-400 text-white shadow-lg">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
              {user?.full_name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-300">
              {(() => {
                const roleLabels: Record<string, string> = {
                  clinica: 'Clínica',
                  admin: 'Administrador',
                  profissional: 'Profissional',
                  recepcao: 'Recepção',
                  gestor: 'Gestor',
                }
                return roleLabels[user?.role || ''] || user?.role || 'Usuário'
              })()}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-[11px] font-medium text-green-600 dark:text-green-400">
              <span className="flex h-2 w-2 rounded-full bg-green-500" />
              Online agora
            </div>
          </div>
        </div>

        <SubscriptionStatusBanner />

        <Button
          variant="outline"
          size="sm"
          className="group mt-3 w-full border-transparent bg-white/60 text-neutral-600 transition-all duration-200 hover:border-red-200 hover:bg-red-50/80 hover:text-red-600 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-red-500/40 dark:hover:bg-red-900/20 dark:hover:text-red-300"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
