import { Copy } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Alert, Input, Select, Textarea } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { formatPrice } from '../../lib/format'
import { ORDER_SELECT, ORDER_STATUS, PAYMENT_STATUS, formatAddress, formatDate, type OrderRow, type OrderStatus } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import { toCents } from './AdminSettings'
import { AdminHeader, Card } from './AdminLayout'

interface Supplier {
  id: string
  supplier_name: string
  supplier_order_ref: string | null
  purchased_at: string | null
  cost_cents: number | null
  notes: string | null
}
interface Note {
  id: string
  body: string
  created_at: string
}
interface Audit {
  id: number
  table_name: string
  action: string
  created_at: string
  changes: Record<string, unknown>
}

/** Próximos status permitidos a partir do atual (o banco valida pagamento e envio). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['canceled'],
  paid: ['preparing', 'ordered_from_supplier', 'canceled', 'refunded'],
  preparing: ['ordered_from_supplier', 'canceled', 'refunded'],
  ordered_from_supplier: ['shipped', 'canceled', 'refunded'],
  shipped: ['in_transit', 'out_for_delivery', 'delivered', 'refunded'],
  in_transit: ['out_for_delivery', 'delivered', 'refunded'],
  out_for_delivery: ['delivered', 'refunded'],
  delivered: ['refunded'],
  canceled: [],
  refunded: [],
}

const today = () => new Date().toISOString().slice(0, 16)

export default function AdminOrderDetail() {
  const { id = '' } = useParams()
  const [order, setOrder] = useState<OrderRow | null>()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  const load = async () => {
    const [o, s, n, a] = await Promise.all([
      supabase!.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle(),
      supabase!.from('supplier_orders').select('*').eq('order_id', id).order('created_at'),
      supabase!.from('order_notes').select('*').eq('order_id', id).order('created_at', { ascending: false }),
      supabase!.from('admin_audit_log').select('id, table_name, action, created_at, changes').eq('record_id', id).order('created_at', { ascending: false }).limit(30),
    ])
    setOrder((o.data as unknown as OrderRow) ?? null)
    setSuppliers((s.data as Supplier[]) ?? [])
    setNotes((n.data as Note[]) ?? [])
    setAudit((a.data as Audit[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p
    setMsg(error ? { tone: 'error', text: error.message } : { tone: 'success', text: ok })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!error) await load()
    return !error
  }

  if (order === undefined) return <Spinner />
  if (order === null) return <Alert>Pedido não encontrado.</Alert>

  const a = order.shipping_address
  const cost = suppliers.reduce((s, x) => s + (x.cost_cents ?? 0), 0)

  return (
    <>
      <Breadcrumbs items={[{ name: 'Pedidos', path: '/admin/pedidos' }, { name: `#${order.number}` }]} />
      <div className="mt-4">
        <AdminHeader title={`Pedido #${order.number}`} description={`Criado em ${formatDate(order.created_at)}`} actions={<StatusBadge status={order.status} className="text-[13px]" />} />
      </div>
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Itens</h2>
            <ul className="mt-4 divide-y divide-line text-[14px]">
              {order.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3">
                  <span>
                    <Link to={`/produto/${i.product_slug}`} target="_blank" className="font-semibold hover:text-brand-dark">{i.product_name}</Link>
                    <span className="block text-muted">{Object.entries(i.variant).map(([k, v]) => `${k}: ${v}`).join(' · ')} {i.quantity}× {formatPrice(i.unit_price_cents)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(i.line_total_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[14px]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal_cents)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Frete cobrado</dt><dd>{formatPrice(order.shipping_cents)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatPrice(order.total_cents)}</dd></div>
              {cost > 0 && (
                <div className="flex justify-between text-muted"><dt>Custo registrado · margem estimada</dt><dd>{formatPrice(cost)} · {formatPrice(order.total_cents - cost)}</dd></div>
              )}
            </dl>
          </Card>

          <StatusCard order={order} onSave={(s) => run(supabase!.from('orders').update({ status: s }).eq('id', order.id), 'Status atualizado.')} />
          <SupplierCard suppliers={suppliers} onAdd={(row) => run(supabase!.from('supplier_orders').insert({ ...row, order_id: order.id }), 'Compra no fornecedor registrada.')} />
          <ShipmentCard order={order} run={run} />

          <Card>
            <h2 className="font-bold">Observações internas</h2>
            <NoteForm onAdd={(body) => run(supabase!.from('order_notes').insert({ order_id: order.id, body }), 'Observação adicionada.')} />
            <ul className="mt-4 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-soft p-3 text-[14px]">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-[12px] text-muted">{formatDate(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Cliente e entrega</h2>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div><dt className="text-muted">Nome</dt><dd className="font-medium">{order.customer_name}</dd></div>
              <div><dt className="text-muted">E-mail</dt><dd>{order.email}</dd></div>
              {order.phone && <div><dt className="text-muted">Telefone</dt><dd>{order.phone}</dd></div>}
              {order.cpf && <div><dt className="text-muted">CPF</dt><dd>{order.cpf}</dd></div>}
              <div>
                <dt className="text-muted">Endereço</dt>
                <dd>{a.recipient}<br />{formatAddress(a)}</dd>
                <button
                  onClick={() => navigator.clipboard.writeText(`${a.recipient}\n${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''}\n${a.district} - ${a.city}/${a.state}\nCEP ${a.cep}\nTel ${order.phone ?? ''}`)}
                  className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-brand-dark"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar dados de entrega
                </button>
              </div>
            </dl>
          </Card>
          <Card>
            <h2 className="font-bold">Pagamentos</h2>
            <ul className="mt-4 space-y-3 text-[14px]">
              {order.payments.map((p) => (
                <li key={p.id} className="rounded-xl bg-soft p-3">
                  <p className="font-semibold">{p.method === 'pix' ? 'Pix' : `Cartão${p.installments ? ` ${p.installments}x` : ''}`} · {PAYMENT_STATUS[p.status]}</p>
                  <p className="text-muted">{formatPrice(p.amount_cents)} · ID {p.provider_payment_id ?? '—'}</p>
                  {p.status_detail && <p className="text-[12px] text-muted">{p.status_detail}</p>}
                  <p className="text-[12px] text-muted">{formatDate(p.created_at)}{p.approved_at && ` · aprovado ${formatDate(p.approved_at)}`}</p>
                </li>
              ))}
              {!order.payments.length && <li className="text-muted">Nenhuma tentativa de pagamento.</li>}
            </ul>
            <p className="mt-3 text-[12px] text-muted">Status de pagamento é atualizado somente pelas notificações verificadas do Mercado Pago.</p>
          </Card>
          <Card>
            <h2 className="font-bold">Histórico de alterações</h2>
            <ul className="mt-4 space-y-2 text-[13px]">
              {order.order_status_history.sort((x, y) => y.created_at.localeCompare(x.created_at)).map((h) => (
                <li key={h.id}><span className="font-semibold">{ORDER_STATUS[h.to_status].label}</span> <span className="text-muted">· {formatDate(h.created_at)}</span></li>
              ))}
              {audit.filter((x) => x.table_name !== 'orders').map((x) => (
                <li key={x.id} className="text-muted">{x.table_name} · {x.action} · {formatDate(x.created_at)}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

function StatusCard({ order, onSave }: { order: OrderRow; onSave: (s: OrderStatus) => Promise<boolean> }) {
  const options = NEXT[order.status]
  const [s, setS] = useState<OrderStatus | ''>('')
  return (
    <Card>
      <h2 className="font-bold">Atualizar status</h2>
      {options.length ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select label="Novo status" className="flex-1" value={s} onChange={(e) => setS(e.target.value as OrderStatus)}>
            <option value="">Selecione…</option>
            {options.map((o) => <option key={o} value={o}>{ORDER_STATUS[o].label}</option>)}
          </Select>
          <Button disabled={!s} onClick={async () => s && (await onSave(s)) && setS('')}>Aplicar</Button>
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-muted">Pedido encerrado.</p>
      )}
      <p className="mt-3 text-[12px] text-muted">
        “Pagamento confirmado” é aplicado automaticamente pelo webhook. O banco bloqueia status de envio sem envio registrado. Reembolsos devem ser feitos no painel do Mercado Pago — o status é sincronizado pela notificação.
      </p>
    </Card>
  )
}

function SupplierCard({ suppliers, onAdd }: { suppliers: Supplier[]; onAdd: (r: Omit<Supplier, 'id'>) => Promise<boolean> }) {
  const [f, setF] = useState({ supplier_name: '', supplier_order_ref: '', purchased_at: today(), cost: '', notes: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const cost = toCents(f.cost)
    if (Number.isNaN(cost)) return
    const ok = await onAdd({
      supplier_name: f.supplier_name.trim(),
      supplier_order_ref: f.supplier_order_ref.trim() || null,
      purchased_at: f.purchased_at ? new Date(f.purchased_at).toISOString() : null,
      cost_cents: cost,
      notes: f.notes.trim() || null,
    })
    if (ok) setF({ supplier_name: '', supplier_order_ref: '', purchased_at: today(), cost: '', notes: '' })
  }
  return (
    <Card>
      <h2 className="font-bold">Compra no fornecedor <span className="ml-1 text-[12px] font-medium text-muted">(visível só para administradores)</span></h2>
      {suppliers.length > 0 && (
        <ul className="mt-4 space-y-2 text-[14px]">
          {suppliers.map((x) => (
            <li key={x.id} className="rounded-xl bg-soft p-3">
              <p className="font-semibold">{x.supplier_name} {x.supplier_order_ref && <span className="font-mono text-muted">· {x.supplier_order_ref}</span>}</p>
              <p className="text-muted">{x.cost_cents != null ? formatPrice(x.cost_cents) : 'custo não informado'}{x.purchased_at && ` · ${formatDate(x.purchased_at)}`}</p>
              {x.notes && <p className="mt-1 text-[13px]">{x.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Fornecedor" required value={f.supplier_name} onChange={(e) => setF({ ...f, supplier_name: e.target.value })} />
        <Input label="Nº do pedido no fornecedor" value={f.supplier_order_ref} onChange={(e) => setF({ ...f, supplier_order_ref: e.target.value })} />
        <Input label="Data da compra" type="datetime-local" value={f.purchased_at} onChange={(e) => setF({ ...f, purchased_at: e.target.value })} />
        <Input label="Custo efetivo (R$)" inputMode="decimal" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
        <Input className="sm:col-span-2" label="Observações" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <div><Button type="submit" variant="dark" size="sm">Registrar compra</Button></div>
      </form>
    </Card>
  )
}

function ShipmentCard({ order, run }: { order: OrderRow; run: (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => Promise<boolean> }) {
  const [f, setF] = useState({ carrier: '', tracking_code: '', tracking_url: '', shipped_at: today() })
  const [ev, setEv] = useState({ status: 'in_transit' as OrderStatus, description: '', location: '', occurred_at: today() })
  const shipment = order.shipments[0]
  const canShip = ['paid', 'preparing', 'ordered_from_supplier'].includes(order.status) || !!shipment

  if (!shipment)
    return (
      <Card>
        <h2 className="font-bold">Envio</h2>
        {!canShip ? (
          <p className="mt-2 text-[14px] text-muted">Disponível após a confirmação do pagamento.</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const ok = await run(
                supabase!.from('shipments').insert({
                  order_id: order.id,
                  carrier: f.carrier.trim(),
                  tracking_code: f.tracking_code.trim(),
                  tracking_url: f.tracking_url.trim() || null,
                  shipped_at: new Date(f.shipped_at).toISOString(),
                }),
                'Envio registrado.',
              )
              if (ok) await run(supabase!.from('orders').update({ status: 'shipped' }).eq('id', order.id), 'Envio registrado e pedido marcado como enviado.')
            }}
            className="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <Input label="Transportadora" required value={f.carrier} onChange={(e) => setF({ ...f, carrier: e.target.value })} />
            <Input label="Código de rastreamento" required value={f.tracking_code} onChange={(e) => setF({ ...f, tracking_code: e.target.value })} />
            <Input label="Link de rastreamento (opcional)" type="url" value={f.tracking_url} onChange={(e) => setF({ ...f, tracking_url: e.target.value })} />
            <Input label="Data de envio" type="datetime-local" required value={f.shipped_at} onChange={(e) => setF({ ...f, shipped_at: e.target.value })} />
            <div><Button type="submit" variant="dark" size="sm">Registrar envio</Button></div>
          </form>
        )}
      </Card>
    )

  return (
    <Card>
      <h2 className="font-bold">Envio</h2>
      <p className="mt-2 text-[14px]">{shipment.carrier} · <span className="font-mono font-semibold">{shipment.tracking_code}</span> · enviado {formatDate(shipment.shipped_at, false)}</p>
      <ul className="mt-4 space-y-2 text-[14px]">
        {[...shipment.shipment_events].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map((e) => (
          <li key={e.id} className="rounded-xl bg-soft p-3">
            <span className="font-semibold">{e.description}</span> <span className="text-muted">· {e.location ? `${e.location} · ` : ''}{formatDate(e.occurred_at)}</span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const ok = await run(
            supabase!.from('shipment_events').insert({
              shipment_id: shipment.id,
              status: ev.status,
              description: ev.description.trim() || ORDER_STATUS[ev.status].label,
              location: ev.location.trim() || null,
              occurred_at: new Date(ev.occurred_at).toISOString(),
            }),
            'Movimentação registrada.',
          )
          if (ok && ev.status !== order.status && NEXT[order.status].includes(ev.status)) {
            if (ev.status === 'delivered') await supabase!.from('shipments').update({ delivered_at: new Date(ev.occurred_at).toISOString() }).eq('id', shipment.id)
            await run(supabase!.from('orders').update({ status: ev.status }).eq('id', order.id), 'Movimentação registrada e status atualizado.')
          }
          setEv({ ...ev, description: '', location: '' })
        }}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <p className="text-[13px] font-semibold sm:col-span-2">Registrar movimentação informada pela transportadora</p>
        <Select label="Tipo" value={ev.status} onChange={(e) => setEv({ ...ev, status: e.target.value as OrderStatus })}>
          {(['in_transit', 'out_for_delivery', 'delivered'] as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </Select>
        <Input label="Data" type="datetime-local" value={ev.occurred_at} onChange={(e) => setEv({ ...ev, occurred_at: e.target.value })} />
        <Input label="Descrição" placeholder="Ex.: Objeto em trânsito para a unidade de distribuição" value={ev.description} onChange={(e) => setEv({ ...ev, description: e.target.value })} />
        <Input label="Local (opcional)" value={ev.location} onChange={(e) => setEv({ ...ev, location: e.target.value })} />
        <div><Button type="submit" variant="dark" size="sm">Registrar movimentação</Button></div>
      </form>
    </Card>
  )
}

function NoteForm({ onAdd }: { onAdd: (b: string) => Promise<boolean> }) {
  const [b, setB] = useState('')
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (b.trim() && (await onAdd(b.trim()))) setB('')
      }}
      className="mt-4 space-y-2"
    >
      <Textarea label="Nova observação" value={b} onChange={(e) => setB(e.target.value)} />
      <Button type="submit" size="sm" variant="secondary">Adicionar</Button>
    </form>
  )
}
