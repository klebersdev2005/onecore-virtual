import { ChevronRight, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { ButtonLink } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { formatPrice } from '../../lib/format'
import { formatDate, type OrderRow } from '../../lib/orders'
import { useSeo } from '../../lib/seo'
import { supabase } from '../../lib/supabase'

export default function OrdersPage() {
  useSeo({ title: 'Meus pedidos', noindex: true })
  const { data, loading, error } = useAsync(async () => {
    const { data, error } = await supabase!
      .from('orders')
      .select('id, number, status, total_cents, created_at, order_items(id, product_name, quantity)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as unknown as Pick<OrderRow, 'id' | 'number' | 'status' | 'total_cents' | 'created_at' | 'order_items'>[]
  }, [])

  return (
    <div>
      <h1 className="text-[28px] font-extrabold tracking-tight">Meus pedidos</h1>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="mt-8"><Alert>Não foi possível carregar seus pedidos.</Alert></div>
      ) : data?.length ? (
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {data.map((o) => (
            <li key={o.id}>
              <Link to={`/conta/pedidos/${o.id}`} className="flex items-center gap-4 p-5 transition-colors hover:bg-soft">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-bold">Pedido #{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="mt-1.5 truncate text-[14px] text-muted">
                    {formatDate(o.created_at, false)} · {o.order_items.map((i) => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </p>
                </div>
                <span className="font-bold tabular-nums">{formatPrice(o.total_cents)}</span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl bg-soft px-6 py-16 text-center">
          <Package className="mx-auto h-9 w-9 text-muted" strokeWidth={1.5} />
          <p className="mt-4 font-bold">Você ainda não fez pedidos</p>
          <ButtonLink to="/busca" className="mt-6">Explorar produtos</ButtonLink>
        </div>
      )}
    </div>
  )
}
