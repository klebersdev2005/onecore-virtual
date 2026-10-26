import { useState } from 'react'
import type { Address } from '../../lib/orders'
import { Input, Select } from '../ui/Field'

export const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')

export const emptyAddress: Address = { recipient: '', cep: '', street: '', number: '', complement: '', district: '', city: '', state: '' }

export const maskCep = (v: string) => v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')

export function validateAddress(a: Address) {
  const e: Partial<Record<keyof Address, string>> = {}
  if (a.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP inválido'
  if (!a.street.trim()) e.street = 'Informe a rua'
  if (!a.number.trim()) e.number = 'Informe o número'
  if (!a.district.trim()) e.district = 'Informe o bairro'
  if (!a.city.trim()) e.city = 'Informe a cidade'
  if (!UFS.includes(a.state)) e.state = 'Selecione o estado'
  return e
}

/** Campos de endereço com preenchimento automático pelo CEP (ViaCEP). */
export function AddressFields({
  value, onChange, errors = {}, withRecipient,
}: {
  value: Address
  onChange: (a: Address) => void
  errors?: Partial<Record<keyof Address, string>>
  withRecipient?: boolean
}) {
  const [lookup, setLookup] = useState<'idle' | 'loading' | 'notfound'>('idle')
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value })

  const onCep = async (raw: string) => {
    const cep = maskCep(raw)
    onChange({ ...value, cep })
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setLookup('loading')
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`).then((x) => x.json())
      if (r.erro) return setLookup('notfound')
      onChange({ ...value, cep, street: r.logradouro || value.street, district: r.bairro || value.district, city: r.localidade || value.city, state: r.uf || value.state })
      setLookup('idle')
    } catch {
      setLookup('idle')
    }
  }

  return (
    <div className="grid grid-cols-6 gap-4">
      {withRecipient && <Input className="col-span-6" label="Destinatário" value={value.recipient ?? ''} onChange={set('recipient')} autoComplete="name" />}
      <Input
        className="col-span-6 sm:col-span-2"
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        value={value.cep}
        onChange={(e) => onCep(e.target.value)}
        error={errors.cep}
        hint={lookup === 'loading' ? 'Buscando endereço…' : lookup === 'notfound' ? 'CEP não encontrado — preencha manualmente.' : undefined}
      />
      <Input className="col-span-6 sm:col-span-4" label="Rua" autoComplete="address-line1" value={value.street} onChange={set('street')} error={errors.street} />
      <Input className="col-span-2" label="Número" value={value.number} onChange={set('number')} error={errors.number} />
      <Input className="col-span-4" label="Complemento (opcional)" autoComplete="address-line2" value={value.complement ?? ''} onChange={set('complement')} />
      <Input className="col-span-6 sm:col-span-2" label="Bairro" value={value.district} onChange={set('district')} error={errors.district} />
      <Input className="col-span-4 sm:col-span-3" label="Cidade" autoComplete="address-level2" value={value.city} onChange={set('city')} error={errors.city} />
      <Select className="col-span-2 sm:col-span-1" label="UF" value={value.state} onChange={set('state')} error={errors.state}>
        <option value="">—</option>
        {UFS.map((u) => <option key={u}>{u}</option>)}
      </Select>
    </div>
  )
}
