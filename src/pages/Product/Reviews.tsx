import { BadgeCheck, Flag, MessageSquareText, Star } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../components/auth/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { cx } from '../../lib/format'
import { formatDate } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import type { Product } from '../../types/catalog'

interface PublicReview {
  id: string
  rating: number
  title: string | null
  body: string
  author_name: string
  verified_purchase: boolean
  created_at: string
}

/** Apenas avaliações publicadas de compradores reais. Sem conteúdo fictício. */
export function Reviews({ product: p }: { product: Product }) {
  const { user } = useAuth()
  const [sort, setSort] = useState<'recent' | 'relevant'>('recent')
  const { data } = useAsync(async () => {
    if (!supabase || p.isDemo || !p.rating) return [] as PublicReview[]
    const { data } = await supabase
      .from('reviews')
      .select('id, rating, title, body, author_name, verified_purchase, created_at')
      .eq('product_id', p.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(100)
    return (data as PublicReview[]) ?? []
  }, [p.id])

  const list = [...(data ?? [])]
  // "Relevantes": compra verificada e textos mais completos primeiro
  if (sort === 'relevant') list.sort((a, b) => Number(b.verified_purchase) - Number(a.verified_purchase) || b.body.length - a.body.length)
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: (data ?? []).filter((r) => r.rating === n).length }))
  const total = data?.length ?? 0

  return (
    <div id="avaliacoes">
      <h2 className="mb-4 text-[24px] font-extrabold tracking-tight">Avaliações</h2>
      {!p.rating ? (
        <div className="rounded-2xl bg-soft p-8 text-center">
          <MessageSquareText className="mx-auto h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="mt-4 font-bold">Este produto ainda não possui avaliações</p>
          <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">Após a entrega, clientes que compraram este produto poderão avaliá-lo pela área do cliente.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-6 rounded-2xl border border-line p-5">
            <div className="text-center">
              <p className="text-[40px] font-extrabold leading-none">{p.rating.average.toFixed(1)}</p>
              <Stars n={Math.round(p.rating.average)} className="mt-2 justify-center" />
              <p className="mt-1 text-[12px] text-muted">{p.rating.count} {p.rating.count === 1 ? 'avaliação' : 'avaliações'}</p>
            </div>
            <ul className="flex-1 space-y-1.5">
              {dist.map(({ n, c }) => (
                <li key={n} className="flex items-center gap-2 text-[12px]">
                  <span className="w-3 text-muted">{n}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                    <span className="block h-full rounded-full bg-brand" style={{ width: total ? `${(c / total) * 100}%` : 0 }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-muted">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 flex justify-end">
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold" aria-label="Ordenar avaliações">
              <option value="recent">Mais recentes</option>
              <option value="relevant">Mais relevantes</option>
            </select>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {list.map((r) => <ReviewItem key={r.id} r={r} canReport={!!user} />)}
          </ul>
        </>
      )}
    </div>
  )
}

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cx('flex', className)} aria-label={`${n} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cx('h-4 w-4', i <= n ? 'fill-brand text-brand' : 'text-line')} />)}
    </span>
  )
}

function ReviewItem({ r, canReport }: { r: PublicReview; canReport: boolean }) {
  const { user } = useAuth()
  const [reported, setReported] = useState(false)
  const report = async () => {
    const reason = prompt('Por que esta avaliação deve ser revisada?')
    if (!reason || reason.trim().length < 3) return
    const { error } = await supabase!.from('review_reports').insert({ review_id: r.id, user_id: user!.id, reason: reason.trim() })
    setReported(!error || error.code === '23505')
  }
  return (
    <li className="py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <Stars n={r.rating} />
        <span className="font-semibold">{r.author_name}</span>
        {r.verified_purchase && <span className="flex items-center gap-1 text-success"><BadgeCheck className="h-3.5 w-3.5" /> Compra verificada</span>}
        <span className="text-muted">{formatDate(r.created_at, false)}</span>
      </div>
      {r.title && <p className="mt-2 font-bold">{r.title}</p>}
      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-ink/85">{r.body}</p>
      {canReport && (
        <button onClick={report} disabled={reported} className="mt-2 flex items-center gap-1 text-[12px] text-muted hover:text-ink disabled:opacity-60">
          <Flag className="h-3 w-3" /> {reported ? 'Denúncia enviada' : 'Denunciar'}
        </button>
      )}
    </li>
  )
}
