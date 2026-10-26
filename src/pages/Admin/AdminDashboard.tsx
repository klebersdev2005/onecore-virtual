import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { Alert } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { cx, formatPrice } from '../../lib/format'
import { formatDate, type OrderStatus } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import { AdminHeader, Card } from './AdminLayout'

const PAID_STATES: OrderStatus[] = ['paid', 'preparing', 'ordered_from_supplier', 'shipped', 'in_transit', 'out_for_delivery', 'delivered']

async function load() {
  const [orders, costs] = await Promise.all([
    supabase!.from('orders').select('id, number, status, total_cents, customer_name, created_at').order('created_at', { ascending: false }),
    supabase!.from('supplier_orders').select('order_id, cost_cents'),
  ])
  if (orders.error) throw orders.error
  return { orders: orders.data as { id: string; number: number; status: OrderStatus; total_cents: number; customer_name: string; created_at: string }[], costs: costs.data ?? [] }
}

export default function AdminDashboard() {
  const { data, loading, error } = useAsync(load, [])
  if (loading) return <Spinner />
  if (error || !data) return <Alert>Falha ao carregar os dados.</Alert>

  const count = (s: OrderStatus[]) => data.orders.filter((o) => s.includes(o.status)).length
  const paidOrders = data.orders.filter((o) => PAID_STATES.includes(o.status))
  const paidIds = new Set(paidOrders.map((o) => o.id))
  const revenue = paidOrders.reduce((s, o) => s + o.total_cents, 0)
  const cost = data.costs.filter((c) => paidIds.has(c.order_id)).reduce((s, c) => s + (c.cost_cents ?? 0), 0)
  const withoutCost = paidOrders.filter((o) => !data.costs.some((c) => c.order_id === o.id && c.cost_cents != null)).length

  const stats = [
    { label: 'Pedidos recebidos', value: data.orders.length, to: '/admin/pedidos' },
    { label: 'Pedidos pagos', value: paidOrders.length, to: '/admin/pedidos' },
    { label: 'Aguardando compra no fornecedor', value: count(['paid', 'preparing']), to: '/admin/pedidos?status=paid', highlight: true },
    { label: 'Aguardando envio', value: count(['ordered_from_supplier']), to: '/admin/pedidos?status=ordered_from_supplier', highlight: true },
    { label: 'Em trânsito', value: count(['shipped', 'in_transit', 'out_for_delivery']), to: '/admin/pedidos?status=in_transit' },
    { label: 'Entregues', value: count(['delivered']), to: '/admin/pedidos?status=delivered' },
  ]

  return (
    <>
      <AdminHeader title="Visão geral" description="Números calculados a partir dos pedidos registrados." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className={cx('rounded-2xl border bg-white p-5 transition-colors hover:border-ink', s.highlight && s.value > 0 ? 'border-brand' : 'border-line')}>
            <p className="text-[12px] font-semibold text-muted">{s.label}</p>
            <p className="mt-2 text-[28px] font-extrabold tabular-nums">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card>
          <p className="text-[12px] font-semibold text-muted">Receita bruta (pedidos pagos)</p>
          <p className="mt-2 text-[26px] font-extrabold tabular-nums">{formatPrice(revenue)}</p>
        </Card>
        <Card>
          <p className="text-[12px] font-semibold text-muted">Custos registrados</p>
          <p className="mt-2 text-[26px] font-extrabold tabular-nums">{formatPrice(cost)}</p>
          {withoutCost > 0 && <p className="mt-1 text-[12px] text-brand-dark">{withoutCost} pedido(s) pago(s) sem custo registrado</p>}
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">Margem estimada <span className="rounded bg-brand-tint px-1.5 text-[10px] font-bold uppercase text-brand-dark">estimativa</span></p>
          <p className="mt-2 text-[26px] font-extrabold tabular-nums">{formatPrice(revenue - cost)}</p>
          <p className="mt-1 flex gap-1 text-[12px] text-muted"><Info className="mt-0.5 h-3 w-3 shrink-0" /> Receita menos custos de fornecedor registrados. Não inclui taxas de pagamento, frete pago, impostos ou outras despesas.</p>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="text-[13px] font-semibold text-brand-dark">Ver todos</Link>
        </div>
        {data.orders.length ? (
          <ul className="divide-y divide-line">
            {data.orders.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Link to={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-3 py-3 text-[14px] hover:text-brand-dark">
                  <span className="w-16 font-bold">#{o.number}</span>
                  <span className="min-w-0 flex-1 truncate">{o.customer_name}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-28 text-right font-semibold tabular-nums">{formatPrice(o.total_cents)}</span>
                  <span className="hidden w-40 text-right text-muted md:inline">{formatDate(o.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted">Nenhum pedido ainda.</p>
        )}
      </Card>
    </>
  )
}
