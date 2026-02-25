import { useEffect, useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { PlanoExpiracaoAviso } from '../PlanoExpiracaoAviso'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { SubscriptionNotifications } from '@/components/SubscriptionNotifications'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { MobileNav } from './MobileNav'

const backgroundLayers = [
  'pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-50/80 via-tertiary-200/60 to-secondary-100/70',
  'pointer-events-none absolute right-[-20%] top-[-10%] h-[60%] w-[45%] rounded-full bg-gradient-to-b from-primary-400/25 via-primary-500/15 to-transparent blur-3xl',
  'pointer-events-none absolute left-[-15%] bottom-[-20%] h-[55%] w-[40%] rounded-full bg-gradient-to-t from-secondary-300/30 via-secondary-200/15 to-transparent blur-3xl',
]

export function AppLayout() {
  const { user, loading, initialized, initializeAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!initialized) {
      initializeAuth()
    }
  }, [initializeAuth, initialized])

  useEffect(() => {
    // Fechar sidebar mobile ao mudar de rota
    setSidebarOpen(false)
  }, [location])

  // Show loading only if not initialized yet
  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-tertiary-200 to-secondary-100 text-primary-600">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    )
  }

  // Only redirect to login if we're initialized and there's no user
  if (initialized && !user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-gradient-to-br from-background to-tertiary-200/80 text-foreground">
      {backgroundLayers.map((cls, index) => (
        <div key={index} className={cls} />
      ))}

      <div className="relative z-10 flex h-full w-full">
        {/* Sidebar Desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="m-4 flex h-[calc(100vh-2rem)] w-72 flex-col rounded-3xl border border-white/30 bg-card/80 p-[1px] shadow-[0_24px_60px_-32px_rgba(49,17,72,0.45)] backdrop-blur-3xl">
            <div className="flex h-full w-full rounded-[calc(theme(borderRadius.3xl)-4px)] bg-white/40 p-2 dark:bg-neutral-900/60">
              <Sidebar />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-hidden p-1.5 sm:p-4 lg:p-8">
            <div className="flex h-full flex-col rounded-2xl sm:rounded-[28px] border border-white/30 bg-white/70 shadow-[0_28px_80px_-40px_rgba(50,20,75,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/60">
              <Header
                onMenuClick={() => setSidebarOpen(true)}
                onNotificationCenterOpen={() => setNotificationCenterOpen(true)}
              />

              <main className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2 sm:px-4 md:px-6 lg:px-8 sm:pb-6">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                  <PlanoExpiracaoAviso />
                  <Outlet />
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Notification Center */}
      <NotificationCenter
        open={notificationCenterOpen}
        onOpenChange={setNotificationCenterOpen}
      />

      {/* Subscription Notifications */}
      <SubscriptionNotifications />
    </div>
  )
}
