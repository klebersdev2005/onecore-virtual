import { ArrowUpRight, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { cx, formatPrice } from '../../lib/format'
import { searchProducts } from '../../services/catalog'
import type { Product } from '../../types/catalog'
import { ProductImage } from '../products/ProductImage'

/** Busca com sugestões em tempo real; Enter abre a página de resultados. */
export function SearchBox() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const [q, setQ] = useState(pathname === '/busca' ? params.get('q') ?? '' : '')
  const [results, setResults] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const nav = useNavigate()
  const wrap = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return setResults([])
    let alive = true
    const t = setTimeout(() => searchProducts(term).then((r) => alive && setResults(r.slice(0, 5))), 150)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setOpen(false)
    if (active >= 0 && results[active]) return nav(`/produto/${results[active].slug}`)
    if (q.trim()) nav(`/busca?q=${encodeURIComponent(q.trim())}`)
  }

  const show = open && q.trim().length >= 2

  return (
    <div ref={wrap} className="relative">
      <form role="search" onSubmit={submit}>
        <label className="group relative flex items-center">
          <span className="sr-only">Buscar produtos</span>
          <Search className="pointer-events-none absolute left-3.5 h-[18px] w-[18px] text-muted group-focus-within:text-ink" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
              setActive(-1)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
              else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, -1))
              else if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Buscar produtos, categorias…"
            role="combobox"
            aria-expanded={show}
            aria-controls={listId}
            aria-autocomplete="list"
            className="h-11 w-full rounded-[10px] border border-line bg-soft pl-11 pr-4 text-[14px] outline-none transition-all placeholder:text-muted focus:border-ink focus:bg-white [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
      </form>
      {show && (
        <div
          id={listId}
          role="listbox"
          className="anim-rise absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_48px_-24px_rgba(0,0,0,.28)] [animation-duration:.35s]"
        >
          {results.length ? (
            <>
              {results.map((p, i) => (
                <button
                  key={p.id}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false)
                    nav(`/produto/${p.slug}`)
                  }}
                  className={cx('flex w-full items-center gap-3 px-3 py-2.5 text-left', i === active ? 'bg-soft' : 'hover:bg-soft')}
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage image={p.images[0]} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-[13px] text-muted">{formatPrice(p.price)}</span>
                  </span>
                </button>
              ))}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={submit}
                className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-[13px] font-semibold text-brand-dark hover:bg-soft"
              >
                Ver todos os resultados para “{q.trim()}” <ArrowUpRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <p className="px-4 py-4 text-sm text-muted">Nenhum produto encontrado para “{q.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  )
}
