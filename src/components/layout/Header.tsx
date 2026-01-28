import { Button } from '@/components/ui/button'
import {
  Menu,
  User,
  CreditCard,
  Sparkles,
  CalendarDays
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { NotificationButton } from '@/components/notifications/NotificationButton'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface HeaderProps {
  onMenuClick: () => void
  onNotificationCenterOpen?: () => void
}

export function Header({ onMenuClick, onNotificationCenterOpen }: HeaderProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { isActive, status, daysRemaining } = useSubscriptionStatus()
  const today = new Date()

  // Determinar se deve mostrar botão de assinatura
  const shouldShowSubscriptionButton = () => {
    if (!user) return false
    
    // Mostrar se nunca assinou (status inactive) ou se expirou
    return status === 'inactive' || status === 'expired' || (!isActive && daysRemaining !== null && daysRemaining < 0)
  }

  // Determinar texto do botão
  const getSubscriptionButtonText = () => {
    if (status === 'expired' || (!isActive && daysRemaining !== null && daysRemaining < 0)) {
      return 'Renovar'
    }
    return 'Assinar'
  }

  // Determinar para onde navegar
  const handleSubscriptionClick = () => {
    // Se é renovação (já teve assinatura), vai direto para planos
    if (status === 'expired' || (!isActive && daysRemaining !== null && daysRemaining < 0)) {
      navigate('/planos')
    } else {
      // Se nunca assinou, vai para página de planos para ver primeiro
      navigate('/planos')
    }
  }

  return (
    <header className="relative z-10 flex h-20 w-full items-center justify-between gap-4 overflow-hidden rounded-t-[28px] border-b border-white/30 bg-white/60 px-4 py-4 shadow-[0_18px_50px_-30px_rgba(49,17,72,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/70 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-200/40 via-secondary-200/35 to-tertiary-300/30" />

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-primary-500/90 to-secondary-400/90 p-2 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base text-neutral-900 dark:text-neutral-100">
                Olá, {user?.full_name?.split(' ')[0] || 'profissional'}
              </p>
              <span className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-300">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(today, "EEEE',' dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {shouldShowSubscriptionButton() && (
          <Button
            onClick={handleSubscriptionClick}
            size="sm"
            className="hidden bg-gradient-to-r from-primary-500 to-secondary-400 text-white shadow-md shadow-primary-400/30 hover:shadow-lg hover:shadow-primary-400/40 lg:inline-flex"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {getSubscriptionButtonText()}
          </Button>
        )}

        <NotificationButton onOpenCenter={onNotificationCenterOpen} />

        <Link to="/app/configuracoes">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11 rounded-2xl border border-white/40 bg-white/70 text-primary-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-neutral-900/80"
          >
            <User className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  )
}
