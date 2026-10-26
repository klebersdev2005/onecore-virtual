import { ExternalLink, Star, Truck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthContext'
import { Spinner } from '../../components/auth/Guards'
import { CardBrick, PixPanel, callCheckout } from '../../components/checkout/Payment'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Alert, Input, Textarea } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { cx, formatPrice } from '../../lib/format'
import { ORDER_SELECT, PAYMENT_STATUS, buildTimeline, formatAddress, formatDate, type OrderItemRow, type OrderRow } from '../../lib/orders'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'
import NotFoundPage from '../NotFound/NotFoundPage'

interface MyReview {
  order_item_id: string
  status: 'pending' | 'published' | 'rejected'
  rating: number
}

export default function OrderDetailPage() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<OrderRow | null | undefined>(undefined)
  const [reviews, setReviews] = useState<MyReview[]>([])

  const load = async () => {
    const { data } = await supabase!.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()
    setOrder((data as unknown as OrderRow) ?? null)
    const items = (data as unknown as OrderRow | null)?.order_items.map((i) => i.id) ?? []
    if (items.length) {
      const { data: r } = await supabase!.from('reviews').select('order_item_id, status, rating').in('order_item_id', items)
      setReviews((r as MyReview[]) ?? [])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Enquanto aguarda pagamento, relê o pedido (o status só muda pelo backend).
  useEffect(() => {
    if (order?.status !== 'pending_payment') return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status])

  useSeo({ title: order ? `Pedido #${order.number}` : 'Pedido', noindex: true })

  if (order === undefined) return <Spinner />
  if (order === null) return <NotFoundPage />

  const payment = [...order.payments].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const timeline = buildTimeline(order)

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Meus pedidos', path: '/conta/pedidos' }, { name: `#${order.number}` }]} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-extrabold tracking-tight">Pedido #{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-[14px] text-muted">Realizado em {formatDate(order.created_at)}</p>

      {order.status === 'pending_payment' && (
        <section className="mt-8">
          <PaymentArea order={order} pixPending={payment?.method === 'pix' && payment.status === 'pending' ? payment : undefined} lastStatus={payment?.status} onDone={load} />
        </section>
      )}

      <div className="mt-10 grid gap-10 xl:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-[18px] font-bold">Itens</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {order.order_items.map((it) => (
                <li key={it.id} className="p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link to={`/produto/${it.product_slug}`} className="font-semibold hover:text-brand-dark">{it.product_name}</Link>
                      <p className="text-[13px] text-muted">
                        {Object.entries(it.variant).map(([k, v]) => `${k}: ${v}`).join(' · ')} {it.quantity}× {formatPrice(it.unit_price_cents)}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">{formatPrice(it.line_total_cents)}</span>
                  </div>
                  {order.status === 'delivered' && it.product_id && (
                    <ReviewBox item={it} existing={reviews.find((r) => r.order_item_id === it.id)} onSaved={load} />
                  )}
                </li>
              ))}
            </ul>
          </section>

          {order.shipments.length > 0 && (
            <section>
              <h2 className="mb-4 text-[18px] font-bold">Entrega</h2>
              {order.shipments.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-5">
                  <Truck className="h-5 w-5 text-brand" />
                  <div className="flex-1">
                    <p className="font-semibold">{s.carrier}</p>
                    <p className="text-[14px] text-muted">Código de rastreamento: <span className="font-mono font-semibold text-ink">{s.tracking_code}</span></p>
                    <p className="text-[13px] text-muted">Enviado em {formatDate(s.shipped_at, false)}</p>
                  </div>
                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[14px] font-semibold text-brand-dark hover:underline">
                      Rastrear <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </section>
          )}

          <section>
            <h2 className="mb-4 text-[18px] font-bold">Histórico</h2>
            <ol className="relative ml-2 border-l border-line">
              {timeline.map((e, i) => (
                <li key={e.key} className="relative pb-6 pl-6 last:pb-0">
                  <span className={cx('absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full', i === 0 ? 'bg-brand' : 'bg-line')} />
                  <p className={cx('text-[14px]', i === 0 ? 'font-bold' : 'font-medium')}>{e.title}</p>
                  {e.detail && <p className="text-[13px] text-muted">{e.detail}</p>}
                  <p className="text-[12px] text-muted">{formatDate(e.date)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line p-5">
            <h2 className="font-bold">Resumo</h2>
            <dl className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Frete</dt><dd>{order.shipping_cents ? formatPrice(order.shipping_cents) : 'Grátis'}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-[16px] font-bold"><dt>Total</dt><dd>{formatPrice(order.total_cents)}</dd></div>
            </dl>
            {payment && (
              <p className="mt-4 text-[13px] text-muted">
                {payment.method === 'pix' ? 'Pix' : `Cartão${payment.installments ? ` em ${payment.installments}x` : ''}`} · {PAYMENT_STATUS[payment.status]}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-line p-5">
            <h2 className="font-bold">Endereço de entrega</h2>
            <p className="mt-3 text-[14px] text-muted">{order.shipping_address.recipient}<br />{formatAddress(order.shipping_address)}</p>
          </div>
          <div className="rounded-2xl bg-soft p-5 text-[14px]">
            <p className="font-bold">Precisa de ajuda?</p>
            <p className="mt-1 text-muted">Informe o número do pedido ao falar com o atendimento.</p>
            <Link to="/ajuda/contato" className="mt-3 inline-block font-semibold underline underline-offset-4">Falar com o atendimento</Link>
            <Link to="/ajuda/trocas-e-devolucoes" className="mt-2 block font-semibold underline underline-offset-4">Trocas e devoluções</Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function PaymentArea({
  order, pixPending, lastStatus, onDone,
}: {
  order: OrderRow
  pixPending?: OrderRow['payments'][number]
  lastStatus?: string
  onDone: () => void
}) {
  const { user } = useAuth()
  const [method, setMethod] = useState<'pix' | 'card' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pay = async (m: 'pix' | 'card', card?: Parameters<Parameters<typeof CardBrick>[0]['onToken']>[0]) => {
    setBusy(true)
    setError('')
    const r = await callCheckout({ orderId: order.id, method: m, card })
    setBusy(false)
    if (r.error) setError(r.error)
    else if (r.payment?.status === 'rejected') setError('Pagamento recusado pelo emissor. Verifique os dados ou tente outro meio.')
    setMethod(null)
    onDone()
  }

  if (pixPending?.pix_qr_code && !method)
    return (
      <div className="space-y-3">
        <PixPanel code={pixPending.pix_qr_code} base64={pixPending.pix_qr_base64} expiresAt={pixPending.pix_expires_at} />
        <button onClick={() => setMethod('card')} className="text-[13px] font-semibold text-muted underline underline-offset-4 hover:text-ink">Prefiro pagar com cartão</button>
      </div>
    )

  return (
    <div className="rounded-2xl border border-line p-5 sm:p-6">
      <p className="font-bold">Pagamento pendente</p>
      {lastStatus === 'rejected' && <p className="mt-1 text-[14px] text-brand-dark">A última tentativa foi recusada.</p>}
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      {method === 'card' ? (
        <div className="mt-4">
          <CardBrick amountCents={order.total_cents} email={user?.email} onToken={(d) => pay('card', d)} />
          <button onClick={() => setMethod(null)} className="mt-2 text-[13px] font-semibold text-muted underline">Voltar</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => pay('pix')} disabled={busy}>{busy ? 'Gerando…' : 'Gerar Pix'}</Button>
          <Button variant="secondary" onClick={() => setMethod('card')} disabled={busy}>Pagar com cartão</Button>
        </div>
      )}
    </div>
  )
}

function ReviewBox({ item, existing, onSaved }: { item: OrderItemRow; existing?: MyReview; onSaved: () => void }) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  if (existing)
    return (
      <p className="mt-3 text-[13px] text-muted">
        Sua avaliação ({existing.rating}★): {existing.status === 'published' ? 'publicada' : existing.status === 'pending' ? 'em moderação' : 'não publicada'}
      </p>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!rating) return setError('Escolha uma nota.')
    if (body.trim().length < 10) return setError('Escreva pelo menos 10 caracteres.')
    const firstName = (profile?.full_name || user?.email || 'Cliente').split(/[\s@]/)[0]
    const { error } = await supabase!.from('reviews').insert({
      product_id: item.product_id,
      user_id: user!.id,
      order_item_id: item.id,
      author_name: firstName,
      rating,
      title: title.trim() || null,
      body: body.trim(),
    })
    if (error) return setError('Não foi possível enviar a avaliação.')
    onSaved()
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-brand-dark hover:underline">
        <Star className="h-3.5 w-3.5" /> Avaliar produto
      </button>
    )

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-soft p-4">
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-1" role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-1">
            <Star className={cx('h-6 w-6', n <= rating ? 'fill-brand text-brand' : 'text-line')} />
          </button>
        ))}
      </div>
      <Input label="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      <Textarea label="Sua avaliação" value={body} onChange={(e) => setBody(e.target.value)} maxLength={3000} hint="Avaliações passam por moderação antes de serem publicadas." />
      <div className="flex gap-2">
        <Button type="submit" size="sm">Enviar avaliação</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  )
}
