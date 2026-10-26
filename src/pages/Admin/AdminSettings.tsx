import { useEffect, useState, type FormEvent } from 'react'
import { Spinner } from '../../components/auth/Guards'
import { Button } from '../../components/ui/Button'
import { Alert, Input } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { supabase } from '../../lib/supabase'
import { getStoreSettings, invalidateStoreSettings, type StoreSettings } from '../../services/store'
import { AdminHeader, Card } from './AdminLayout'

const toReais = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','))
export const toCents = (v: string) => {
  const t = v.trim().replace(/\./g, '').replace(',', '.')
  if (!t) return null
  const n = Math.round(Number(t) * 100)
  return Number.isFinite(n) ? n : NaN
}

export default function AdminSettings() {
  const { data, loading } = useAsync(() => {
    invalidateStoreSettings()
    return getStoreSettings()
  }, [])
  const [f, setF] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (!data) return
    setF({
      shipping_flat: toReais(data.shipping_flat_cents),
      free_min: toReais(data.free_shipping_min_cents),
      days_min: data.shipping_days_min?.toString() ?? '',
      days_max: data.shipping_days_max?.toString() ?? '',
      contact_email: data.contact_email ?? '',
      contact_whatsapp: data.contact_whatsapp ?? '',
      company_name: data.company_name ?? '',
      cnpj: data.cnpj ?? '',
      company_address: data.company_address ?? '',
    })
  }, [data])

  if (loading) return <Spinner />
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const flat = toCents(f.shipping_flat)
    const free = toCents(f.free_min)
    if (Number.isNaN(flat) || Number.isNaN(free)) return setMsg({ tone: 'error', text: 'Valores de frete inválidos.' })
    const patch: Partial<StoreSettings> = {
      shipping_flat_cents: flat,
      free_shipping_min_cents: free,
      shipping_days_min: f.days_min ? Number(f.days_min) : null,
      shipping_days_max: f.days_max ? Number(f.days_max) : null,
      contact_email: f.contact_email || null,
      contact_whatsapp: f.contact_whatsapp || null,
      company_name: f.company_name || null,
      cnpj: f.cnpj || null,
      company_address: f.company_address || null,
    }
    const { error } = await supabase!.from('store_settings').update(patch).eq('id', 1)
    invalidateStoreSettings()
    setMsg(error ? { tone: 'error', text: `Erro ao salvar: ${error.message}` } : { tone: 'success', text: 'Configurações salvas.' })
  }

  return (
    <>
      <AdminHeader title="Configurações" description="Dados exibidos na loja e usados no cálculo do pedido." />
      <form onSubmit={save} className="max-w-3xl space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Card>
          <h2 className="font-bold">Frete</h2>
          <p className="mt-1 text-[13px] text-muted">Sem frete configurado, o checkout fica bloqueado — a loja não exibe valores que não foram definidos.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Frete fixo (R$)" inputMode="decimal" placeholder="0,00" value={f.shipping_flat ?? ''} onChange={set('shipping_flat')} hint="Use 0 para frete grátis em todos os pedidos." />
            <Input label="Frete grátis a partir de (R$)" inputMode="decimal" placeholder="opcional" value={f.free_min ?? ''} onChange={set('free_min')} />
            <Input label="Prazo mínimo (dias úteis)" type="number" min={1} value={f.days_min ?? ''} onChange={set('days_min')} hint="Deixe vazio se não houver prazo confiável." />
            <Input label="Prazo máximo (dias úteis)" type="number" min={1} value={f.days_max ?? ''} onChange={set('days_max')} />
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Atendimento</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="E-mail de contato" type="email" value={f.contact_email ?? ''} onChange={set('contact_email')} />
            <Input label="WhatsApp" value={f.contact_whatsapp ?? ''} onChange={set('contact_whatsapp')} placeholder="(00) 00000-0000" />
          </div>
        </Card>
        <Card>
          <h2 className="font-bold">Dados empresariais</h2>
          <p className="mt-1 text-[13px] text-muted">Exibidos no rodapé. Preencha apenas com dados oficiais.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Razão social" value={f.company_name ?? ''} onChange={set('company_name')} />
            <Input label="CNPJ" value={f.cnpj ?? ''} onChange={set('cnpj')} />
            <Input className="sm:col-span-2" label="Endereço comercial" value={f.company_address ?? ''} onChange={set('company_address')} />
          </div>
        </Card>
        <Button type="submit">Salvar configurações</Button>
      </form>
    </>
  )
}
