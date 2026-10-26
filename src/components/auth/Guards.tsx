import { Database, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ButtonLink } from '../ui/Button'
import { useAuth } from './AuthContext'

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}…
    </div>
  )
}

export function BackendRequired() {
  return (
    <div className="container-x max-w-xl py-20 text-center">
      <Database className="mx-auto h-9 w-9 text-brand" strokeWidth={1.5} />
      <h1 className="mt-5 text-[26px] font-extrabold tracking-tight">Conecte o Supabase</h1>
      <p className="mt-3 text-muted">
        Contas, pedidos e o painel administrativo dependem do banco de dados. Configure
        <code className="mx-1 rounded bg-soft px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_URL</code>e
        <code className="mx-1 rounded bg-soft px-1.5 py-0.5 text-[13px]">VITE_SUPABASE_ANON_KEY</code>
        no arquivo <code className="rounded bg-soft px-1.5 py-0.5 text-[13px]">.env</code> (veja o README).
      </p>
      <ButtonLink to="/" variant="secondary" className="mt-8">Voltar à loja</ButtonLink>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { enabled, loading, user } = useAuth()
  const loc = useLocation()
  if (!enabled) return <BackendRequired />
  if (loading) return <Spinner />
  if (!user) return <Navigate to={`/conta/entrar?voltar=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return <>{children}</>
}

/** Bloqueio de interface. A proteção efetiva dos dados é feita pela RLS no banco. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { enabled, loading, user, profile, isAdmin } = useAuth()
  const loc = useLocation()
  if (!enabled) return <BackendRequired />
  if (loading || (user && !profile)) return <Spinner />
  if (!user) return <Navigate to={`/conta/entrar?voltar=${encodeURIComponent(loc.pathname)}`} replace />
  if (!isAdmin)
    return (
      <div className="container-x py-24 text-center">
        <h1 className="text-[26px] font-extrabold">Acesso restrito</h1>
        <p className="mt-2 text-muted">Sua conta não tem permissão de administrador.</p>
        <ButtonLink to="/" variant="secondary" className="mt-6">Voltar à loja</ButtonLink>
      </div>
    )
  return <>{children}</>
}
