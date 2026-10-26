import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { BackendRequired, Spinner } from '../../components/auth/Guards'
import { Button } from '../../components/ui/Button'
import { Alert, Input } from '../../components/ui/Field'
import { LogoMark } from '../../components/ui/Logo'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  'User already registered': 'Já existe uma conta com este e-mail.',
}
const translate = (m: string) => ERRORS[m] ?? m

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  useSeo({ title, noindex: true })
  const { enabled, loading } = useAuth()
  if (!enabled) return <BackendRequired />
  if (loading) return <Spinner />
  return (
    <div className="container-x flex justify-center py-14 md:py-20">
      <div className="anim-rise w-full max-w-[420px]">
        <LogoMark className="h-11 w-11" />
        <h1 className="mt-6 text-[30px] font-extrabold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

const safeBack = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/conta')

export function LoginPage() {
  const [params] = useSearchParams()
  const back = safeBack(params.get('voltar'))
  const { user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={back} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(translate(error.message))
    nav(back, { replace: true })
  }

  return (
    <Shell title="Entrar" subtitle="Acesse sua conta para acompanhar pedidos e finalizar compras.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right">
          <Link to="/conta/recuperar" className="text-[13px] font-semibold text-muted hover:text-ink">Esqueci minha senha</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="mt-8 text-center text-[14px] text-muted">
        Ainda não tem conta?{' '}
        <Link to={`/conta/cadastro?voltar=${encodeURIComponent(back)}`} className="font-semibold text-ink underline underline-offset-4">Criar conta</Link>
      </p>
    </Shell>
  )
}

export function SignupPage() {
  const [params] = useSearchParams()
  const back = safeBack(params.get('voltar'))
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  if (user && !done) return <Navigate to={back} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    if (form.password !== form.confirm) return setError('As senhas não conferem.')
    setBusy(true)
    setError('')
    const { data, error } = await supabase!.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name.trim() }, emailRedirectTo: window.location.origin + back },
    })
    setBusy(false)
    if (error) return setError(translate(error.message))
    if (!data.session) setDone(true)
  }

  if (done)
    return (
      <Shell title="Confirme seu e-mail">
        <Alert tone="success">Enviamos um link de confirmação para <strong>{form.email}</strong>. Abra o e-mail para ativar sua conta.</Alert>
        <Link to="/conta/entrar" className="mt-6 inline-block text-[14px] font-semibold underline underline-offset-4">Ir para o login</Link>
      </Shell>
    )

  return (
    <Shell title="Criar conta" subtitle="Leva menos de um minuto.">
      <form onSubmit={submit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Input label="Nome completo" autoComplete="name" required value={form.name} onChange={set('name')} />
        <Input label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        <Input label="Senha" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} hint="Mínimo de 8 caracteres." />
        <Input label="Confirmar senha" type="password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} />
        <p className="text-[12px] leading-relaxed text-muted">
          Ao criar a conta você concorda com os <Link to="/ajuda/termos-de-compra" className="underline">Termos de compra</Link> e a{' '}
          <Link to="/ajuda/politica-de-privacidade" className="underline">Política de privacidade</Link>.
        </p>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</Button>
      </form>
      <p className="mt-8 text-center text-[14px] text-muted">
        Já tem conta? <Link to={`/conta/entrar?voltar=${encodeURIComponent(back)}`} className="font-semibold text-ink underline underline-offset-4">Entrar</Link>
      </p>
    </Shell>
  )
}

export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/conta/nova-senha' })
    setBusy(false)
    if (error) return setError(translate(error.message))
    setSent(true)
  }
  return (
    <Shell title="Recuperar senha" subtitle="Enviaremos um link para você criar uma nova senha.">
      {sent ? (
        <Alert tone="success">Se houver uma conta para <strong>{email}</strong>, você receberá o link em instantes.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link'}</Button>
        </form>
      )}
      <Link to="/conta/entrar" className="mt-6 inline-block text-[14px] font-semibold text-muted hover:text-ink">← Voltar ao login</Link>
    </Shell>
  )
}

export function NewPasswordPage() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.')
    setBusy(true)
    const { error } = await supabase!.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setError(translate(error.message))
    nav('/conta', { replace: true })
  }
  return (
    <Shell title="Nova senha">
      {!user ? (
        <Alert>Link inválido ou expirado. <Link to="/conta/recuperar" className="font-semibold underline">Solicite um novo</Link>.</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <Input label="Nova senha" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} hint="Mínimo de 8 caracteres." />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>Salvar senha</Button>
        </form>
      )}
    </Shell>
  )
}
