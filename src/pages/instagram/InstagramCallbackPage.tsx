import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Instagram, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function InstagramCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setStatus('error')
      setMessage('Autorização cancelada ou negada pelo Instagram.')
      setTimeout(() => navigate('/app/instagram'), 3000)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('Código de autorização não encontrado.')
      setTimeout(() => navigate('/app/instagram'), 3000)
      return
    }

    const exchangeCode = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/instagram/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ code }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao conectar Instagram')

        setStatus('success')
        setMessage(`Conta @${data.username} conectada com sucesso!`)
        setTimeout(() => navigate('/app/instagram'), 2500)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Erro ao conectar Instagram')
        setTimeout(() => navigate('/app/instagram'), 4000)
      }
    }

    exchangeCode()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-orange-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/40 bg-white/80 px-10 py-12 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/80">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 shadow-lg">
          {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-white" />}
          {status === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
          {status === 'error' && <XCircle className="h-8 w-8 text-white" />}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {status === 'loading' && 'Conectando Instagram...'}
            {status === 'success' && 'Instagram conectado!'}
            {status === 'error' && 'Falha na conexão'}
          </h2>
          {message && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
          )}
          {status !== 'loading' && (
            <p className="mt-2 text-xs text-neutral-400">Redirecionando em instantes...</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
          <Instagram className="h-3.5 w-3.5" />
          AutomaClinic × Instagram
        </div>
      </div>
    </div>
  )
}
