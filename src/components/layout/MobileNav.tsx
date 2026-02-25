import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { X, LogOut } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  UserSquare,
  Sparkles,
  CalendarDays,
  ScrollText,
  Settings2,
  Package,
  Palette,
  Bot,
  MessageCircle,
  Send,
  CreditCard,
  QrCode,
  BarChart3,
  Clock,
  AlertTriangle,
  RefreshCw,
  Stethoscope,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { usePlanoAtivo } from '@/hooks/usePlanoAtivo'
import { useIAConfig } from '@/hooks/useIAConfig'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

type AppRole = 'clinica' | 'admin' | 'profissional' | 'recepcao' | 'gestor'
const ALL_ROLES: AppRole[] = ['clinica', 'admin', 'profissional', 'recepcao', 'gestor']
const ADMIN_ROLES: AppRole[] = ['clinica', 'admin']
const ADMIN_GESTOR: AppRole[] = ['clinica', 'admin', 'gestor']

interface MobileMenuItem {
  label: string
  icon: any
  href: string
  allowedRoles?: AppRole[]
  subItems?: MobileMenuItem[]
}

const menuItems: MobileMenuItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/app/dashboard', allowedRoles: ALL_ROLES },
  {
    label: 'Pacientes', icon: Users, href: '/app/pacientes',
    allowedRoles: ['clinica', 'admin', 'profissional', 'recepcao', 'gestor'],
    subItems: [
      { label: 'Planos Ativos', icon: ScrollText, href: '/app/pacientes/planos-ativos', allowedRoles: ALL_ROLES },
    ],
  },
  { label: 'Profissionais', icon: UserSquare, href: '/app/profissionais', allowedRoles: ADMIN_GESTOR },
  {
    label: 'Procedimentos', icon: Sparkles, href: '/app/procedimentos', allowedRoles: ADMIN_GESTOR,
    subItems: [
      { label: 'Categorias', icon: Palette, href: '/app/categorias', allowedRoles: ADMIN_GESTOR },
      { label: 'Protocolos/Pacotes', icon: Package, href: '/app/protocolos-pacotes', allowedRoles: ADMIN_GESTOR },
    ],
  },
  { label: 'Planos de Tratamento', icon: ScrollText, href: '/app/planos-tratamento', allowedRoles: ['clinica', 'admin', 'profissional', 'gestor'] },
  {
    label: 'Agenda', icon: CalendarDays, href: '/app/agendamentos', allowedRoles: ALL_ROLES,
    subItems: [
      { label: 'Lista de Espera', icon: Clock, href: '/app/agendamentos/lista-espera', allowedRoles: ALL_ROLES },
      { label: 'No-Shows', icon: AlertTriangle, href: '/app/agendamentos/no-shows', allowedRoles: ALL_ROLES },
      { label: 'Retornos', icon: RefreshCw, href: '/app/agendamentos/sugestoes-retorno', allowedRoles: ALL_ROLES },
    ],
  },
  { label: 'Biblioteca IA', icon: Bot, href: '/app/arquivos-ia', allowedRoles: ADMIN_ROLES },
  {
    label: 'WhatsApp', icon: MessageCircle, href: '/app/whatsapp', allowedRoles: ADMIN_ROLES,
    subItems: [
      { label: 'Chat', icon: MessageCircle, href: '/app/chat', allowedRoles: ALL_ROLES },
      { label: 'Disparos', icon: Send, href: '/app/whatsapp?section=disparos', allowedRoles: ADMIN_ROLES },
    ],
  },
  {
    label: 'Relatórios', icon: BarChart3, href: '/app/relatorios', allowedRoles: ['clinica', 'admin', 'gestor'],
    subItems: [
      { label: 'Procedimentos', icon: Stethoscope, href: '/app/relatorios/procedimentos-realizados', allowedRoles: ['clinica', 'admin', 'gestor', 'profissional'] },
      { label: 'Agendamentos', icon: CalendarCheck, href: '/app/relatorios/agendamentos-realizados', allowedRoles: ['clinica', 'admin', 'gestor', 'recepcao'] },
    ],
  },
  {
    label: 'Configurações', icon: Settings2, href: '/app/configuracoes', allowedRoles: ADMIN_ROLES,
    subItems: [
      { label: 'Config. IA', icon: QrCode, href: '/app/configuracoes-ia', allowedRoles: ADMIN_ROLES },
    ],
  },
  { label: 'Planos', icon: CreditCard, href: '/planos', allowedRoles: ADMIN_ROLES },
]

export function MobileNav({ open, onClose }: MobileNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { planoAtivo } = usePlanoAtivo()
  const { data: iaConfigData } = useIAConfig() as any

  const userRole = (user?.role || 'profissional') as AppRole
  const ACTIVE_BG = 'bg-gradient-to-r from-primary-400 to-secondary-400'

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClose()
    navigate('/app/dashboard')
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) return false
    if (item.href === '/planos' && planoAtivo) return false
    if (item.href === '/app/arquivos-ia' && iaConfigData?.envia_documento !== true) return false
    return true
  })

  const roleLabels: Record<string, string> = {
    clinica: 'Clínica', admin: 'Administrador', profissional: 'Profissional',
    recepcao: 'Recepção', gestor: 'Gestor',
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex w-[85vw] max-w-[320px] flex-col">
              {/* Close button */}
              <div className="absolute -right-12 top-4">
                <button type="button" className="rounded-full bg-white/20 p-2 backdrop-blur" onClick={onClose}>
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>

              <div className="flex h-full flex-col overflow-hidden bg-gradient-to-br from-white/95 via-white/90 to-primary-50/80 backdrop-blur-2xl dark:from-neutral-900/95 dark:via-neutral-900/90 dark:to-neutral-800/80">
                {/* Branding */}
                <div className="relative flex shrink-0 items-center gap-3 border-b border-white/30 px-5 py-4">
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-400/20 via-secondary-300/15 to-secondary-400/20" />
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl overflow-hidden">
                    <img src="/Logo2.jpg" alt="AutomaClinic" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <span className="font-display text-base font-semibold text-neutral-900 dark:text-white">AutomaClinic</span>
                    <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-neutral-500">CRM COM IA PARA ESTÉTICA</p>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                  {filteredMenuItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                    const hasSubItems = item.subItems && item.subItems.length > 0
                    const currentFullPath = `${location.pathname}${location.search || ''}`
                    const isParentActive = hasSubItems && item.subItems?.some(sub =>
                      sub.href.includes('?') ? currentFullPath === sub.href : location.pathname === sub.href || location.pathname.startsWith(`${sub.href}/`)
                    )

                    const btnClasses = cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive || isParentActive
                        ? `${ACTIVE_BG} text-white shadow-md`
                        : 'text-neutral-700 hover:bg-white/60 active:bg-white/80 dark:text-neutral-200 dark:hover:bg-neutral-800/60'
                    )

                    const iconClasses = cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform',
                      isActive || isParentActive
                        ? 'bg-white/20 text-white'
                        : 'bg-primary-50 text-primary-600 dark:bg-neutral-800 dark:text-primary-300'
                    )

                    if (item.href === '/app/dashboard') {
                      return (
                        <div key={item.href}>
                          <button type="button" onClick={handleDashboardClick} className={btnClasses}>
                            <span className={iconClasses}><Icon className="h-4 w-4" /></span>
                            {item.label}
                          </button>
                        </div>
                      )
                    }

                    return (
                      <div key={item.href}>
                        <Link to={item.href} onClick={onClose} className={btnClasses}>
                          <span className={iconClasses}><Icon className="h-4 w-4" /></span>
                          {item.label}
                        </Link>

                        {hasSubItems && (isActive || isParentActive) && (
                          <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-primary-200/50 pl-3">
                            {item.subItems!.filter(sub => !sub.allowedRoles || sub.allowedRoles.includes(userRole)).map((sub) => {
                              const SubIcon = sub.icon
                              const isSubActive = sub.href.includes('?')
                                ? currentFullPath === sub.href
                                : location.pathname === sub.href || location.pathname.startsWith(`${sub.href}/`)
                              return (
                                <Link
                                  key={sub.href}
                                  to={sub.href}
                                  onClick={onClose}
                                  className={cn(
                                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all',
                                    isSubActive
                                      ? 'bg-primary-500/90 text-white shadow-sm'
                                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-white/50 dark:text-neutral-400 dark:hover:text-white'
                                  )}
                                >
                                  <SubIcon className="h-3.5 w-3.5" />
                                  {sub.label}
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
                <div className="shrink-0 border-t border-white/30 bg-white/40 p-4 dark:bg-neutral-900/60">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-400 text-sm font-bold text-white shadow-md">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{user?.full_name}</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{roleLabels[user?.role || ''] || 'Usuário'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-transparent bg-white/60 text-neutral-600 hover:border-red-200 hover:bg-red-50/80 hover:text-red-600 dark:bg-neutral-800/60 dark:text-neutral-300"
                    onClick={() => { signOut(); onClose() }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair da conta
                  </Button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
