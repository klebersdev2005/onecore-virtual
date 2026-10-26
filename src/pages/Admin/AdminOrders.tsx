import { Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { Alert } from '../../components/ui/Field'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { cx, formatPrice, normalize } from '../../lib/format'
import { ORDER_STATUS, formatDate, type OrderStatus } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import { AdminHeader } from './AdminLayout'

interface Row {
  id: string
  number: number
  status: OrderStatus
  customer_name: string
  email: string
  total_cents: number
  payment_method: string
  created_at: string
}

export default function AdminOrders() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const [q, setQ] = useState('')
  const { data, loading, error } = useAsync(async () => {
    let query = supabase!.from('orders').select('id, number, status, customer_name, email, total_cents, payment_method, created_at').order('created_at', { ascending: false }).limit(500)
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) throw error
    return data as Row[]
  }, [status])

  const list = (data ?? []).filter((o) => !q || normalize(`${o.number} ${o.customer_name} ${o.email}`).includes(normalize(q)))

  return (
    <>
      <AdminHeader title="Pedidos" description="Clique em um pedido para registrar compra no fornecedor, envio e status." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, cliente ou e-mail" className="h-11 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink" />
        </label>
        <select
          value={status}
          onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})}
          className="h-11 rounded-[10px] border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-ink"
        >
          <option value="">Todos os status</option>
          {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert>Falha ao carregar pedidos.</Alert>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-b border-line text-[12px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Pagamento</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((o) => (
                <tr key={o.id} className="hover:bg-soft">
                  <td className="px-4 py-3 font-bold"><Link to={`/admin/pedidos/${o.id}`} className="hover:text-brand-dark">#{o.number}</Link></td>
                  <td className="px-4 py-3"><span className="block font-medium">{o.customer_name}</span><span className="text-[12px] text-muted">{o.email}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-muted">{o.payment_method === 'pix' ? 'Pix' : 'Cartão'}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPrice(o.total_cents)}</td>
                  <td className={cx('px-4 py-3 text-right text-muted')}>{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <p className="p-8 text-center text-muted">Nenhum pedido encontrado.</p>}
        </div>
      )}
    </>
  )
}
