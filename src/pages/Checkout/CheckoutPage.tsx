import { CreditCard, Lock, QrCode } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { computeTotals, isValidCpf, onlyDigits } from '../../../supabase/functions/_shared/pricing'
import { useAuth } from '../../components/auth/AuthContext'
import { RequireAuth, Spinner } from '../../components/auth/Guards'
import { AddressFields, emptyAddress, validateAddress } from '../../components/checkout/AddressFields'
import { CardBrick, MP_PUBLIC_KEY, callCheckout, type CardData } from '../../components/checkout/Payment'
import { ProductImage } from '../../components/products/ProductImage'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Alert, Input } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { useCartDetails } from '../../hooks/useCartDetails'
import { cx, formatPrice } from '../../lib/format'
import { formatAddress, type Address } from '../../lib/orders'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'
import { deliveryEstimate, getStoreSettings, toShipping } from '../../services/store'
import { listAddresses } from '../Account/AddressesPage'
import { maskCpf, maskPhone } from '../Account/ProfilePage'

export default function CheckoutPage() {
  useSeo({ title: 'Checkout', noindex: true })
  return (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  )
}

function Checkout() {
  const { user, profile } = useAuth()
  const nav = useNavigate()
  const cart = useCartDetails()
  const settings = useAsync(getStoreSettings, [])
  const saved = useAsync(listAddresses, [])

  const [contact, setContact] = useState({ name: '', email: '', phone: '', cpf: '' })
  const [addrChoice, setAddrChoice] = useState<string>('new')
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [saveAddress, setSaveAddress] = useState(true)
  const [method, setMethod] = useState<'pix' | 'card'>('pix')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [addrErrors, setAddrErrors] = useState({})
  const [stage, setStage] = useState<'form' | 'card'>('form')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setContact((c) => ({
      name: c.name || profile?.full_name || '',
      email: c.email || user?.email || '',
      phone: c.phone || maskPhone(profile?.phone ?? ''),
      cpf: c.cpf || maskCpf(profile?.cpf ?? ''),
    }))
  }, [profile, user])

  useEffect(() => {
    const def = saved.data?.find((a) => a.is_default) ?? saved.data?.[0]
    if (def) setAddrChoice(def.id)
  }, [saved.data])

  if (cart.loading || settings.loading) return <Spinner />
  if (!cart.items.length) return <Navigate to="/carrinho" replace />

  const totals = computeTotals(cart.items.map((i) => ({ unitPriceCents: i.unitPrice, quantity: i.line.qty })), toShipping(settings.data!))
  const estimate = deliveryEstimate(settings.data!)
  const chosen = saved.data?.find((a) => a.id === addrChoice)
  const finalAddress: Address = chosen ?? address

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contact.name.trim()) e.name = 'Informe seu nome'
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) e.email = 'E-mail inválido'
    if (onlyDigits(contact.phone).length < 10) e.phone = 'Telefone inválido'
    if (!isValidCpf(contact.cpf)) e.cpf = 'CPF inválido'
    if (!terms) e.terms = 'Aceite os termos para continuar'
    setErrors(e)
    const ae = chosen ? {} : validateAddress(address)
    setAddrErrors(ae)
    return !Object.keys(e).length && !Object.keys(ae).length
  }

  const submitOrder = async (card?: CardData) => {
    setBusy(true)
    setError('')
    if (!chosen && saveAddress) {
      await supabase!.from('addresses').insert({
        user_id: user!.id,
        recipient: contact.name.trim(),
        cep: onlyDigits(address.cep),
        street: address.street.trim(),
        number: address.number.trim(),
        complement: address.complement?.trim() || null,
        district: address.district.trim(),
        city: address.city.trim(),
        state: address.state,
        is_default: !saved.data?.length,
      })
    }
    const r = await callCheckout({
      items: cart.items.map((i) => ({ slug: i.product.slug, variant: i.line.variant, quantity: i.line.qty })),
      customer: { name: contact.name, email: contact.email, phone: contact.phone, cpf: contact.cpf },
      address: { ...finalAddress, cep: onlyDigits(finalAddress.cep), recipient: finalAddress.recipient || contact.name },
      method: card ? 'card' : 'pix',
      card,
      acceptedTerms: terms,
    })
    setBusy(false)
    if (r.orderId) {
      cart.clear()
      nav(`/conta/pedidos/${r.orderId}`, { replace: true })
      return
    }
    setError(r.error ?? 'Não foi possível concluir o pedido.')
    setStage('form')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return setError('Revise os campos destacados.')
    if (method === 'card') return setStage('card')
    submitOrder()
  }

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ name: 'Carrinho', path: '/carrinho' }, { name: 'Checkout' }]} />
      <h1 className="h-display mt-8 text-[36px] md:text-[44px]">Finalizar compra</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
        {stage === 'card' ? (
          <section>
            <h2 className="text-[20px] font-bold">Dados do cartão</h2>
            <p className="mt-1 text-[14px] text-muted">Os dados são processados diretamente pelo Mercado Pago. A OneCore Virtual não armazena o número do cartão nem o código de segurança.</p>
            {error && <div className="mt-4"><Alert>{error}</Alert></div>}
            <div className={cx('mt-6', busy && 'pointer-events-none opacity-60')}>
              {totals.ok && <CardBrick amountCents={totals.totalCents} email={contact.email} onToken={submitOrder} />}
            </div>
            <button onClick={() => setStage('form')} className="mt-4 text-[14px] font-semibold text-muted underline underline-offset-4">← Voltar e alterar dados</button>
          </section>
        ) : (
          <form onSubmit={onSubmit} className="space-y-10" noValidate>
            {error && <Alert>{error}</Alert>}

            <section>
              <h2 className="mb-5 text-[20px] font-bold">1. Seus dados</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input className="sm:col-span-2" label="Nome completo" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} error={errors.name} />
                <Input label="E-mail" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} error={errors.email} />
                <Input label="Telefone" inputMode="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: maskPhone(e.target.value) })} error={errors.phone} hint="Para contato sobre a entrega." />
                <Input label="CPF" inputMode="numeric" value={contact.cpf} onChange={(e) => setContact({ ...contact, cpf: maskCpf(e.target.value) })} error={errors.cpf} hint="Exigido para pagamento e emissão da nota fiscal." />
              </div>
            </section>

            <section>
              <h2 className="mb-5 text-[20px] font-bold">2. Endereço de entrega</h2>
              {!!saved.data?.length && (
                <div className="mb-5 space-y-2">
                  {saved.data.map((a) => (
                    <label key={a.id} className={cx('flex cursor-pointer gap-3 rounded-xl border p-4', addrChoice === a.id ? 'border-ink' : 'border-line')}>
                      <input type="radio" name="addr" checked={addrChoice === a.id} onChange={() => setAddrChoice(a.id)} className="mt-1 accent-[#FF6A00]" />
                      <span className="text-[14px]"><strong>{a.recipient}</strong><br /><span className="text-muted">{formatAddress(a)}</span></span>
                    </label>
                  ))}
                  <label className={cx('flex cursor-pointer gap-3 rounded-xl border p-4 text-[14px] font-semibold', addrChoice === 'new' ? 'border-ink' : 'border-line')}>
                    <input type="radio" name="addr" checked={addrChoice === 'new'} onChange={() => setAddrChoice('new')} className="accent-[#FF6A00]" />
                    Usar outro endereço
                  </label>
                </div>
              )}
              {addrChoice === 'new' && (
                <>
                  <AddressFields value={address} onChange={setAddress} errors={addrErrors} />
                  <label className="mt-4 flex items-center gap-3 text-[14px]">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-[#FF6A00]" />
                    Salvar este endereço na minha conta
                  </label>
                </>
              )}
            </section>

            <section>
              <h2 className="mb-5 text-[20px] font-bold">3. Pagamento</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { v: 'pix' as const, icon: QrCode, title: 'Pix', text: 'Aprovação em instantes' },
                  { v: 'card' as const, icon: CreditCard, title: 'Cartão de crédito', text: MP_PUBLIC_KEY ? 'Parcelas exibidas pelo emissor' : 'Indisponível no momento', disabled: !MP_PUBLIC_KEY },
                ].map((m) => (
                  <label key={m.v} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border p-4', method === m.v ? 'border-ink ring-1 ring-ink' : 'border-line', m.disabled && 'cursor-not-allowed opacity-50')}>
                    <input type="radio" name="method" disabled={m.disabled} checked={method === m.v} onChange={() => setMethod(m.v)} className="accent-[#FF6A00]" />
                    <m.icon className="h-5 w-5" strokeWidth={1.75} />
                    <span><span className="block text-[14px] font-semibold">{m.title}</span><span className="block text-[12px] text-muted">{m.text}</span></span>
                  </label>
                ))}
              </div>
            </section>

            <div>
              <label className="flex items-start gap-3 text-[14px]">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6A00]" />
                <span>
                  Li e aceito os <Link to="/ajuda/termos-de-compra" target="_blank" className="font-semibold underline">Termos de compra</Link> e a{' '}
                  <Link to="/ajuda/politica-de-privacidade" target="_blank" className="font-semibold underline">Política de privacidade</Link>.
                </span>
              </label>
              {errors.terms && <p className="mt-1 text-[12px] font-medium text-red-600">{errors.terms}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !totals.ok}>
              <Lock className="h-4 w-4" /> {busy ? 'Processando…' : method === 'pix' ? 'Finalizar e gerar Pix' : 'Continuar para o cartão'}
            </Button>
          </form>
        )}

        <aside className="h-fit rounded-2xl border border-line p-6 lg:sticky lg:top-36">
          <h2 className="text-[18px] font-bold">Resumo do pedido</h2>
          <ul className="mt-5 space-y-4">
            {cart.items.map(({ line, product, unitPrice }) => (
              <li key={line.key} className="flex gap-3">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                  <ProductImage image={product.images[0]} />
                  <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">{line.qty}</span>
                </span>
                <span className="min-w-0 flex-1 text-[14px]">
                  <span className="block font-semibold leading-snug">{product.name}</span>
                  <span className="block text-[12px] text-muted">{Object.values(line.variant).join(' · ')}</span>
                </span>
                <span className="text-[14px] font-semibold tabular-nums">{formatPrice(unitPrice * line.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-line pt-5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">Frete</dt>
              <dd className="tabular-nums">{totals.ok ? (totals.shippingCents ? formatPrice(totals.shippingCents) : 'Grátis') : '—'}</dd>
            </div>
            {totals.ok && (
              <div className="flex justify-between border-t border-line pt-3 text-[17px] font-extrabold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(totals.totalCents)}</dd></div>
            )}
          </dl>
          {!totals.ok && <div className="mt-4"><Alert>{totals.error}. Não é possível finalizar a compra agora.</Alert></div>}
          {estimate && <p className="mt-4 text-[13px] text-muted">Prazo estimado de entrega: {estimate}.</p>}
          <p className="mt-4 text-[12px] text-muted">O valor final é calculado e validado pelo servidor no momento do pedido.</p>
        </aside>
      </div>
    </div>
  )
}
