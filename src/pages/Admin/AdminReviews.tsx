import { BadgeCheck, Flag, Star } from 'lucide-react'
import { useState } from 'react'
import { Spinner } from '../../components/auth/Guards'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { cx } from '../../lib/format'
import { formatDate } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import { invalidateCatalog } from '../../services/catalog'
import { AdminHeader, Card } from './AdminLayout'

type Status = 'pending' | 'published' | 'rejected'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  author_name: string
  verified_purchase: boolean
  status: Status
  moderation_reason: string | null
  report_count: number
  created_at: string
  product: { name: string; slug: string } | null
  review_reports: { id: string; reason: string; resolved: boolean }[]
}

/** Regras de moderação exibidas ao administrador — a mesma regra vale para avaliações positivas e negativas. */
const RULES = [
  'Publicar avaliações negativas e positivas da mesma forma.',
  'Rejeitar somente: dados pessoais, ofensas, discurso de ódio, spam/propaganda ou conteúdo sem relação com o produto.',
  'Não é possível editar o texto ou a nota do cliente nem criar avaliações em nome de compradores.',
]
const REASONS = ['Dados pessoais', 'Ofensa ou discurso de ódio', 'Spam ou propaganda', 'Sem relação com o produto']

export default function AdminReviews() {
  const [tab, setTab] = useState<Status | 'reported'>('pending')
  const [tick, setTick] = useState(0)
  const [error, setError] = useState('')
  const { data, loading } = useAsync(async () => {
    let q = supabase!.from('reviews').select('*, product:products(name, slug), review_reports(id, reason, resolved)').order('created_at', { ascending: false })
    q = tab === 'reported' ? q.gt('report_count', 0) : q.eq('status', tab)
    const { data } = await q
    return (data as unknown as Review[]) ?? []
  }, [tab, tick])

  const moderate = async (r: Review, status: Status, reason?: string) => {
    const { error } = await supabase!.from('reviews').update({ status, moderation_reason: reason ?? null }).eq('id', r.id)
    if (!error && r.review_reports.length) await supabase!.from('review_reports').update({ resolved: true }).eq('review_id', r.id)
    setError(error?.message ?? '')
    invalidateCatalog()
    setTick((t) => t + 1)
  }

  return (
    <>
      <AdminHeader title="Avaliações" description="Somente compradores com pedido entregue podem avaliar. Todas chegam como compra verificada." />
      <Card className="mb-4">
        <p className="text-[13px] font-bold">Regras de moderação</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-muted">{RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </Card>
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {([['pending', 'Pendentes'], ['reported', 'Denunciadas'], ['published', 'Publicadas'], ['rejected', 'Rejeitadas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold', tab === k ? 'bg-ink text-white' : 'bg-white hover:bg-line')}>{l}</button>
        ))}
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Spinner />
      ) : data?.length ? (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cx('h-4 w-4', n <= r.rating ? 'fill-brand text-brand' : 'text-line')} />)}</span>
                <span className="font-semibold">{r.author_name}</span>
                {r.verified_purchase && <span className="flex items-center gap-1 text-success"><BadgeCheck className="h-3.5 w-3.5" /> Compra verificada</span>}
                <span className="text-muted">· {formatDate(r.created_at)} · {r.product?.name}</span>
              </div>
              {r.title && <p className="mt-3 font-bold">{r.title}</p>}
              <p className="mt-1 whitespace-pre-wrap text-[14px]">{r.body}</p>
              {r.review_reports.length > 0 && (
                <div className="mt-3 rounded-xl bg-brand-tint p-3 text-[13px]">
                  <p className="flex items-center gap-1.5 font-semibold text-brand-dark"><Flag className="h-3.5 w-3.5" /> {r.review_reports.length} denúncia(s)</p>
                  <ul className="mt-1 list-disc pl-5">{r.review_reports.map((x) => <li key={x.id}>{x.reason}{x.resolved && ' (resolvida)'}</li>)}</ul>
                </div>
              )}
              {r.moderation_reason && <p className="mt-2 text-[13px] text-muted">Motivo: {r.moderation_reason}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {r.status !== 'published' && <Button size="sm" onClick={() => moderate(r, 'published')}>Publicar</Button>}
                {r.status !== 'rejected' && (
                  <select
                    defaultValue=""
                    onChange={(e) => e.target.value && moderate(r, 'rejected', e.target.value)}
                    className="h-9 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold"
                    aria-label="Rejeitar com motivo"
                  >
                    <option value="">Rejeitar por…</option>
                    {REASONS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-10 text-center text-muted">Nada por aqui.</p>
      )}
    </>
  )
}
