import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { ButtonLink } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { cx, formatPrice, normalize } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { AdminHeader } from './AdminLayout'

interface Row {
  id: string
  slug: string
  name: string
  price_cents: number
  availability: string
  is_active: boolean
  category: { name: string } | null
  product_images: { url: string; sort: number }[]
}

const AV: Record<string, string> = { available: 'Disponível', unavailable: 'Indisponível', to_confirm: 'A confirmar' }

export default function AdminProducts() {
  const [q, setQ] = useState('')
  const { data, loading, error } = useAsync(async () => {
    const { data, error } = await supabase!
      .from('products')
      .select('id, slug, name, price_cents, availability, is_active, category:categories(name), product_images(url, sort)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as unknown as Row[]
  }, [])
  const list = (data ?? []).filter((p) => !q || normalize(p.name + ' ' + p.slug).includes(normalize(q)))

  return (
    <>
      <AdminHeader title="Produtos" description="Produtos inativos não aparecem na loja." actions={<ButtonLink to="/admin/produtos/novo" size="sm"><Plus className="h-4 w-4" /> Novo produto</ButtonLink>} />
      <label className="relative mb-4 flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto" className="h-11 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink" />
      </label>
      {loading ? (
        <Spinner />
      ) : error ? (
        <Alert>Falha ao carregar produtos.</Alert>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {list.map((p) => {
              const img = [...p.product_images].sort((a, b) => a.sort - b.sort)[0]
              return (
                <li key={p.id}>
                  <Link to={`/admin/produtos/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-soft">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-soft">{img && <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="block text-[13px] text-muted">{p.category?.name ?? 'Sem categoria'} · /{p.slug}</span>
                    </span>
                    <span className={cx('hidden rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline', p.is_active ? 'bg-green-50 text-success' : 'bg-soft text-muted')}>
                      {p.is_active ? AV[p.availability] : 'Inativo'}
                    </span>
                    <span className="w-24 text-right font-semibold tabular-nums">{formatPrice(p.price_cents)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
          {!list.length && <p className="p-8 text-center text-muted">Nenhum produto cadastrado.</p>}
        </div>
      )}
    </>
  )
}
