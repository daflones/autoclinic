import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { ArquivosIAGuard } from './components/guards/ArquivosIAGuard'

// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ConfirmationPage = lazy(() => import('./pages/auth/ConfirmationPage').then(m => ({ default: m.ConfirmationPage })))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const PacientesPage = lazy(() => import('./pages/pacientes/PacientesPage').then(m => ({ default: m.PacientesPage })))
const PacientesPlanosAtivosPage = lazy(() => import('./pages/pacientes/PacientesPlanosAtivosPage').then(m => ({ default: m.PacientesPlanosAtivosPage })))
const ProfissionaisPage = lazy(() => import('./pages/profissionais/ProfissionaisClinicaPage').then(m => ({ default: m.ProfissionaisClinicaPage })))
const ProcedimentosPage = lazy(() => import('./pages/procedimentos/ProcedimentosPage').then(m => ({ default: m.ProcedimentosPage })))
const CategoriasPage = lazy(() => import('./pages/categorias/CategoriasClinicaPage').then(m => ({ default: m.CategoriasClinicaPage })))
const AgendamentosPage = lazy(() => import('./pages/agendamentos/AgendamentosClinicaPage').then(m => ({ default: m.AgendamentosClinicaPage })))
const ListaEsperaPage = lazy(() => import('./pages/agendamentos/ListaEsperaPage').then(m => ({ default: m.ListaEsperaPage })))
const NoShowsPage = lazy(() => import('./pages/agendamentos/NoShowsPage').then(m => ({ default: m.NoShowsPage })))
const SugestoesRetornoPage = lazy(() => import('./pages/agendamentos/SugestoesRetornoPage').then(m => ({ default: m.SugestoesRetornoPage })))
const PlanosTratamentoPage = lazy(() => import('./pages/planos-tratamento/PlanosTratamentoPage').then(m => ({ default: m.PlanosTratamentoPage })))
const ArquivosPage = lazy(() => import('./pages/arquivos/ArquivosPage').then(m => ({ default: m.ArquivosPage })))
const ArquivosIAPage = lazy(() => import('./pages/arquivos-ia/ArquivosIAPage').then(m => ({ default: m.default })))
const RelatoriosPage = lazy(() => import('./pages/relatorios/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })))
const ProcedimentosRealizadosPage = lazy(() => import('./pages/relatorios/ProcedimentosRealizadosPage').then(m => ({ default: m.ProcedimentosRealizadosPage })))
const AgendamentosRealizadosPage = lazy(() => import('./pages/relatorios/AgendamentosRealizadosPage').then(m => ({ default: m.AgendamentosRealizadosPage })))
const ProtocolosPacotesPage = lazy(() => import('./pages/protocolos-pacotes/ProtocolosPacotesPage').then(m => ({ default: m.ProtocolosPacotesPage })))
const ConfiguracoesPage = lazy(() => import('./pages/configuracoes/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const ClinicaIAConfigPage = lazy(() => import('./pages/configuracoes/ClinicaIAConfigPage').then(m => ({ default: m.ClinicaIAConfigPage })))
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'))
const WhatsAppWebPage = lazy(() => import('./pages/whatsapp-web/WhatsAppWebPage'))
const ChatPage = lazy(() => import('./pages/chat/ChatPage').then(m => ({ default: m.ChatPage })))
const LandingPage = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.LandingPage })))
const PlanosPage = lazy(() => import('./pages/Planos'))

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

// Wrap lazy components with Suspense
const withSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/register',
    element: withSuspense(RegisterPage),
  },
  {
    path: '/forgot-password',
    element: withSuspense(ForgotPasswordPage),
  },
  {
    path: '/confirm',
    element: withSuspense(ConfirmationPage),
  },
  {
    path: '/reset-password',
    element: withSuspense(ResetPasswordPage),
  },
  {
    path: '/landing',
    element: withSuspense(LandingPage),
  },
  {
    path: '/planos',
    element: withSuspense(PlanosPage),
  },
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(DashboardPage),
      },
      {
        path: 'clientes',
        element: <Navigate to="/app/pacientes" replace />,
      },
      {
        path: 'pacientes',
        element: withSuspense(PacientesPage),
      },
      {
        path: 'pacientes/planos-ativos',
        element: withSuspense(PacientesPlanosAtivosPage),
      },
      {
        path: 'tickets-suporte',
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'clientes-prospeccao',
        element: <Navigate to="/app/pacientes" replace />,
      },
      {
        path: 'vendedores',
        element: <Navigate to="/app/profissionais" replace />,
      },
      {
        path: 'profissionais',
        element: withSuspense(ProfissionaisPage),
      },
      {
        path: 'setores-atendimento',
        element: <Navigate to="/app/configuracoes" replace />,
      },
      {
        path: 'produtos',
        element: <Navigate to="/app/procedimentos" replace />,
      },
      {
        path: 'procedimentos',
        element: withSuspense(ProcedimentosPage),
      },
      {
        path: 'categorias',
        element: withSuspense(CategoriasPage),
      },
      {
        path: 'protocolos-pacotes',
        element: withSuspense(ProtocolosPacotesPage),
      },
      {
        path: 'agendamentos',
        element: withSuspense(AgendamentosPage),
      },
      {
        path: 'agendamentos/lista-espera',
        element: withSuspense(ListaEsperaPage),
      },
      {
        path: 'agendamentos/no-shows',
        element: withSuspense(NoShowsPage),
      },
      {
        path: 'agendamentos/sugestoes-retorno',
        element: withSuspense(SugestoesRetornoPage),
      },
      {
        path: 'planos-tratamento',
        element: withSuspense(PlanosTratamentoPage),
      },
      {
        path: 'arquivos',
        element: withSuspense(ArquivosPage),
      },
      {
        path: 'arquivos-ia',
        element: (
          <ArquivosIAGuard>
            {withSuspense(ArquivosIAPage)}
          </ArquivosIAGuard>
        ),
      },
      {
        path: 'relatorios',
        element: withSuspense(RelatoriosPage),
      },
      {
        path: 'configuracoes',
        element: withSuspense(ConfiguracoesPage),
      },
      {
        path: 'configuracoes-ia',
        element: withSuspense(ClinicaIAConfigPage),
      },
      {
        path: 'atividades',
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'whatsapp',
        element: withSuspense(WhatsAppPage),
      },
      {
        path: 'whatsapp-web',
        element: withSuspense(WhatsAppWebPage),
      },
      {
        path: 'chat',
        element: withSuspense(ChatPage),
      },
      {
        path: 'prospeccao',
        element: <Navigate to="/app/pacientes" replace />,
      },
    ],
  },
])
