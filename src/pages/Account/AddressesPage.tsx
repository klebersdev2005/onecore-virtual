import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AddressFields, emptyAddress, validateAddress } from '../../components/checkout/AddressFields'
import { useAuth } from '../../components/auth/AuthContext'
import { Spinner } from '../../components/auth/Guards'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { formatAddress, type Address } from '../../lib/orders'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'

export interface SavedAddress extends Address {
  id: string
  label: string | null
  is_default: boolean
}

export const listAddresses = async () => {
  const { data, error } = await supabase!.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at')
  if (error) throw error
  return data as SavedAddress[]
}

export default function AddressesPage() {
  useSeo({ title: 'Endereços', noindex: true })
  const { user } = useAuth()
  const [tick, setTick] = useState(0)
  const { data, loading, error } = useAsync(listAddresses, [tick])
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null)
  const [form, setForm] = useState<Address>(emptyAddress)
  const [isDefault, setIsDefault] = useState(false)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')

  const open = (a: SavedAddress | 'new') => {
    setEditing(a)
    setForm(a === 'new' ? emptyAddress : { ...a, cep: a.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') })
    setIsDefault(a === 'new' ? !data?.length : a.is_default)
    setErrors({})
    setSaveError('')
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const v = validateAddress(form)
    setErrors(v)
    if (Object.keys(v).length) return
    const row = {
      user_id: user!.id,
      recipient: form.recipient?.trim() || user!.email!,
      cep: form.cep.replace(/\D/g, ''),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement?.trim() || null,
      district: form.district.trim(),
      city: form.city.trim(),
      state: form.state,
      is_default: isDefault,
    }
    const q = editing === 'new' ? supabase!.from('addresses').insert(row) : supabase!.from('addresses').update(row).eq('id', (editing as SavedAddress).id)
    const { error } = await q
    if (error) return setSaveError('Não foi possível salvar o endereço.')
    setEditing(null)
    setTick((t) => t + 1)
  }

  const remove = async (id: string) => {
    if (!confirm('Remover este endereço?')) return
    await supabase!.from('addresses').delete().eq('id', id)
    setTick((t) => t + 1)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-extrabold tracking-tight">Endereços</h1>
        {!editing && <Button size="sm" variant="secondary" onClick={() => open('new')}><Plus className="h-4 w-4" /> Novo endereço</Button>}
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-8 space-y-5 rounded-2xl border border-line p-5 sm:p-6">
          {saveError && <Alert>{saveError}</Alert>}
          <AddressFields value={form} onChange={setForm} errors={errors} withRecipient />
          <label className="flex items-center gap-3 text-[14px]">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-[#FF6A00]" />
            Usar como endereço padrão
          </label>
          <div className="flex gap-3">
            <Button type="submit">Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </form>
      ) : loading ? (
        <Spinner />
      ) : error ? (
        <Alert>Não foi possível carregar seus endereços.</Alert>
      ) : data?.length ? (
        <ul className="mt-8 space-y-3">
          {data.map((a) => (
            <li key={a.id} className="flex items-start gap-4 rounded-2xl border border-line p-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {a.recipient} {a.is_default && <span className="ml-2 rounded bg-brand-tint px-1.5 py-0.5 text-[11px] font-bold text-brand-dark">Padrão</span>}
                </p>
                <p className="mt-1 text-[14px] text-muted">{formatAddress(a)}</p>
              </div>
              <button onClick={() => open(a)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-soft" aria-label="Editar endereço"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(a.id)} className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label="Remover endereço"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl bg-soft p-8 text-center text-muted">Nenhum endereço salvo. Você também pode cadastrar um durante o checkout.</p>
      )}
    </div>
  )
}
