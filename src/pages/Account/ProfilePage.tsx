import { useEffect, useState, type FormEvent } from 'react'
import { isValidCpf, onlyDigits } from '../../../supabase/functions/_shared/pricing'
import { useAuth } from '../../components/auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { Alert, Input } from '../../components/ui/Field'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'

export const maskCpf = (v: string) =>
  onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
export const maskPhone = (v: string) =>
  onlyDigits(v).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2')

export default function ProfilePage() {
  useSeo({ title: 'Dados pessoais', noindex: true })
  const { profile, user, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', cpf: '' })
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name ?? '', phone: maskPhone(profile.phone ?? ''), cpf: maskCpf(profile.cpf ?? '') })
  }, [profile])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.cpf && !isValidCpf(form.cpf)) return setMsg({ tone: 'error', text: 'CPF inválido.' })
    setBusy(true)
    const { error } = await supabase!
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: onlyDigits(form.phone) || null, cpf: onlyDigits(form.cpf) || null })
      .eq('id', user!.id)
    setBusy(false)
    if (error) return setMsg({ tone: 'error', text: 'Não foi possível salvar. Tente novamente.' })
    await refreshProfile()
    setMsg({ tone: 'success', text: 'Dados atualizados.' })
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-[28px] font-extrabold tracking-tight">Dados pessoais</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Input label="E-mail" value={user?.email ?? ''} disabled hint="O e-mail de acesso não pode ser alterado aqui." />
        <Input label="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Telefone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
          <Input label="CPF" inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} hint="Usado para pagamento e nota fiscal." />
        </div>
        <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</Button>
      </form>
    </div>
  )
}
