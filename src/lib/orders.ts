export type OrderStatus =
  | 'pending_payment' | 'paid' | 'preparing' | 'ordered_from_supplier'
  | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'canceled' | 'refunded'

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'canceled' | 'refunded'

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: 'neutral' | 'brand' | 'success' | 'muted' }> = {
  pending_payment: { label: 'Aguardando pagamento', tone: 'brand' },
  paid: { label: 'Pagamento confirmado', tone: 'success' },
  preparing: { label: 'Pedido em preparação', tone: 'neutral' },
  ordered_from_supplier: { label: 'Pedido realizado com fornecedor', tone: 'neutral' },
  shipped: { label: 'Enviado', tone: 'neutral' },
  in_transit: { label: 'Em trânsito', tone: 'neutral' },
  out_for_delivery: { label: 'Saiu para entrega', tone: 'neutral' },
  delivered: { label: 'Entregue', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'muted' },
  refunded: { label: 'Reembolsado', tone: 'muted' },
}

export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  pending: 'Aguardando pagamento',
  approved: 'Aprovado',
  rejected: 'Recusado',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
}

/** Ordem de fluxo usada pelo admin para sugerir o próximo status. */
export const STATUS_FLOW: OrderStatus[] = [
  'pending_payment', 'paid', 'preparing', 'ordered_from_supplier', 'shipped', 'in_transit', 'out_for_delivery', 'delivered',
]

export interface Address {
  recipient?: string
  cep: string
  street: string
  number: string
  complement?: string
  district: string
  city: string
  state: string
}

export interface OrderItemRow {
  id: string
  product_id: string | null
  product_slug: string
  product_name: string
  variant: Record<string, string>
  unit_price_cents: number
  quantity: number
  line_total_cents: number
}

export interface PaymentRow {
  id: string
  method: 'pix' | 'card'
  status: PaymentStatus
  status_detail: string | null
  amount_cents: number
  installments: number | null
  pix_qr_code: string | null
  pix_qr_base64: string | null
  pix_expires_at: string | null
  approved_at: string | null
  created_at: string
  provider_payment_id: string | null
}

export interface ShipmentRow {
  id: string
  carrier: string
  tracking_code: string
  tracking_url: string | null
  shipped_at: string
  delivered_at: string | null
  shipment_events: { id: string; status: OrderStatus; description: string; location: string | null; occurred_at: string; source: string }[]
}

export interface OrderRow {
  id: string
  number: number
  user_id: string
  status: OrderStatus
  customer_name: string
  email: string
  phone: string | null
  cpf: string | null
  shipping_address: Address
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  payment_method: 'pix' | 'card'
  created_at: string
  updated_at: string
  order_items: OrderItemRow[]
  payments: PaymentRow[]
  shipments: ShipmentRow[]
  order_status_history: { id: string; from_status: OrderStatus | null; to_status: OrderStatus; created_at: string }[]
}

export const ORDER_SELECT = '*, order_items(*), payments(*), shipments(*, shipment_events(*)), order_status_history(*)'

export interface TimelineEvent {
  key: string
  date: string
  title: string
  detail?: string
}

/** Linha do tempo apenas com eventos registrados (mudanças de status e eventos de envio). */
export function buildTimeline(o: OrderRow): TimelineEvent[] {
  const ev: TimelineEvent[] = o.order_status_history.map((h) => ({
    key: h.id,
    date: h.created_at,
    title: h.from_status === null ? 'Pedido criado' : ORDER_STATUS[h.to_status].label,
  }))
  for (const s of o.shipments) {
    for (const e of s.shipment_events) {
      ev.push({ key: e.id, date: e.occurred_at, title: e.description, detail: [e.location, s.carrier].filter(Boolean).join(' · ') })
    }
  }
  return ev.sort((a, b) => b.date.localeCompare(a.date))
}

export const formatDate = (iso: string, time = true) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', ...(time && { hour: '2-digit', minute: '2-digit' }) })

export const formatCep = (c: string) => c.replace(/^(\d{5})(\d{3})$/, '$1-$2')
export const formatAddress = (a: Address) =>
  `${a.street}, ${a.number}${a.complement ? ` – ${a.complement}` : ''} · ${a.district} · ${a.city}/${a.state} · CEP ${formatCep(a.cep)}`
