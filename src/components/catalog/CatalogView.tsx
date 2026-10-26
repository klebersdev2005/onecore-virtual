import { Check, ChevronDown, PackageOpen, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cx } from '../../lib/format'
import { searchScore, sortProducts } from '../../services/catalog'
import type { Product, SortKey } from '../../types/catalog'
import { ProductGrid, ProductGridSkeleton } from '../products/ProductCard'
import { Button, ButtonLink } from '../ui/Button'

const PAGE = 8
const SORTS: { v: SortKey; label: string }[] = [
  { v: 'relevance', label: 'Relevância' },
  { v: 'newest', label: 'Novidades' },
  { v: 'price-asc', label: 'Menor preço' },
  { v: 'price-desc', label: 'Maior preço' },
]
const PRICES = [
  { v: '0-80', label: 'Até R$ 80', min: 0, max: 8000 },
  { v: '80-150', label: 'R$ 80 a R$ 150', min: 8000, max: 15000 },
  { v: '150-250', label: 'R$ 150 a R$ 250', min: 15000, max: 25000 },
  { v: '250-', label: 'Acima de R$ 250', min: 25000, max: Infinity },
]

/**
 * Filtros, ordenação e paginação baseados em query string — funcionam com
 * links diretos, recarregamento e botão voltar. O canonical das páginas ignora
 * a query string, evitando URLs duplicadas por filtros.
 */
export function CatalogView({ products, loading, searchable = true }: { products: Product[] | null; loading: boolean; searchable?: boolean }) {
  const [params, setParams] = useSearchParams()
  const [panel, setPanel] = useState(false)
  const sort = (params.get('ordem') as SortKey) || 'relevance'
  const price = params.get('preco') ?? ''
  const onlyAvailable = params.get('disponivel') === '1'
  const colors = params.getAll('cor')
  const q = params.get('filtro') ?? ''
  const shown = Number(params.get('mostrar')) || PAGE

  const update = (fn: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    fn(next)
    next.delete('mostrar')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const colorOptions = useMemo(
    () => [...new Set((products ?? []).flatMap((p) => p.variants.find((v) => v.name === 'Cor')?.options ?? []))].sort(),
    [products],
  )

  const filtered = useMemo(() => {
    if (!products) return []
    const range = PRICES.find((r) => r.v === price)
    const list = products.filter(
      (p) =>
        (!range || (p.price >= range.min && p.price < range.max)) &&
        (!onlyAvailable || p.availability === 'available') &&
        (!colors.length || colors.some((c) => p.variants.find((v) => v.name === 'Cor')?.options.includes(c))) &&
        (!q || searchScore(p, q) > 0),
    )
    return sortProducts(list, sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, price, onlyAvailable, colors.join(), q, sort])

  const activeCount = (price ? 1 : 0) + (onlyAvailable ? 1 : 0) + colors.length + (q ? 1 : 0)
  const clearAll = () => setParams(sort !== 'relevance' ? { ordem: sort } : {}, { replace: true })
  const setPrice = (v: string) => update((p) => (v && v !== price ? p.set('preco', v) : p.delete('preco')))
  const toggleColor = (c: string) =>
    update((p) => {
      const cur = p.getAll('cor')
      p.delete('cor')
      ;(cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]).forEach((x) => p.append('cor', x))
    })
  const setAvailable = (on: boolean) => update((p) => (on ? p.set('disponivel', '1') : p.delete('disponivel')))
  const setSort = (v: string) => update((p) => (v === 'relevance' ? p.delete('ordem') : p.set('ordem', v)))

  const isEmptyCatalog = !loading && (products?.length ?? 0) === 0
  const priceLabel = PRICES.find((r) => r.v === price)?.label

  const chips: { label: string; clear: () => void }[] = [
    ...(q ? [{ label: `“${q}”`, clear: () => update((p) => p.delete('filtro')) }] : []),
    ...(priceLabel ? [{ label: priceLabel, clear: () => setPrice('') }] : []),
    ...colors.map((c) => ({ label: c, clear: () => toggleColor(c) })),
    ...(onlyAvailable ? [{ label: 'Somente disponíveis', clear: () => setAvailable(false) }] : []),
  ]

  return (
    <div>
      {/* Barra de filtros */}
      {!isEmptyCatalog && (
        <div className="sticky top-[120px] md:top-[64px] z-20 mt-6 -mx-4 border-b border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-[112px] lg:-mx-10 lg:px-10">
          <div className="flex items-center gap-2">
            {searchable && (
              <label className="relative hidden w-56 items-center md:flex">
                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
                <input
                  value={q}
                  onChange={(e) => update((p) => (e.target.value ? p.set('filtro', e.target.value) : p.delete('filtro')))}
                  placeholder="Filtrar por nome"
                  aria-label="Filtrar produtos por nome"
                  className="h-10 w-full rounded-full border border-line bg-white pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-ink"
                />
              </label>
            )}

            <div className="hidden items-center gap-2 md:flex">
              <Dropdown label={priceLabel ?? 'Preço'} active={!!price}>
                {(close) => (
                  <div className="w-56 p-1.5">
                    {PRICES.map((r) => (
                      <OptionRow key={r.v} selected={price === r.v} onClick={() => (setPrice(r.v), close())}>{r.label}</OptionRow>
                    ))}
                  </div>
                )}
              </Dropdown>
              {colorOptions.length > 0 && (
                <Dropdown label={colors.length ? `Cor · ${colors.length}` : 'Cor'} active={colors.length > 0}>
                  {() => (
                    <div className="w-56 p-1.5">
                      {colorOptions.map((c) => (
                        <OptionRow key={c} selected={colors.includes(c)} onClick={() => toggleColor(c)} multi>{c}</OptionRow>
                      ))}
                    </div>
                  )}
                </Dropdown>
              )}
              <button
                onClick={() => setAvailable(!onlyAvailable)}
                aria-pressed={onlyAvailable}
                className={cx(
                  'flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors',
                  onlyAvailable ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink',
                )}
              >
                {onlyAvailable && <Check className="h-3.5 w-3.5" />} Disponíveis
              </button>
            </div>

            <button
              onClick={() => setPanel(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-semibold md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtrar
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">{activeCount}</span>}
            </button>

            <p className="ml-auto hidden text-[13px] text-muted lg:block" aria-live="polite">
              {loading ? 'Carregando…' : `${filtered.length} ${filtered.length === 1 ? 'produto' : 'produtos'}`}
            </p>

            <Dropdown label={SORTS.find((s) => s.v === sort)!.label} prefix="Ordenar:" align="right" className="ml-auto lg:ml-3">
              {(close) => (
                <div className="w-48 p-1.5">
                  {SORTS.map((s) => (
                    <OptionRow key={s.v} selected={sort === s.v} onClick={() => (setSort(s.v), close())}>{s.label}</OptionRow>
                  ))}
                </div>
              )}
            </Dropdown>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button key={c.label} onClick={c.clear} className="anim-rise flex h-8 items-center gap-1.5 rounded-full bg-brand-tint pl-3 pr-2 text-[12px] font-semibold text-brand-dark [animation-duration:.3s]">
                  {c.label} <X className="h-3.5 w-3.5" aria-label="remover filtro" />
                </button>
              ))}
              <button onClick={clearAll} className="ml-1 text-[12px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">Limpar tudo</button>
            </div>
          )}
        </div>
      )}

      <div className="pt-8">
        {loading ? (
          <ProductGridSkeleton n={8} />
        ) : isEmptyCatalog ? (
          <EmptyState
            title="Ainda não há produtos aqui"
            text="Estamos preparando esta seleção. Enquanto isso, explore outras partes do catálogo."
            action={<ButtonLink to="/busca" variant="secondary">Ver todos os produtos</ButtonLink>}
          />
        ) : filtered.length ? (
          <>
            <ProductGrid products={filtered.slice(0, shown)} eagerFirst={4} />
            {shown < filtered.length && (
              <div className="mt-12 flex flex-col items-center gap-3">
                <p className="text-[13px] text-muted">Mostrando {shown} de {filtered.length}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const n = new URLSearchParams(params)
                    n.set('mostrar', String(shown + PAGE))
                    setParams(n, { replace: true, preventScrollReset: true })
                  }}
                >
                  Carregar mais produtos
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="Nenhum produto com esses filtros"
            text="Tente remover algum filtro para ver mais opções."
            action={<Button onClick={clearAll}>Limpar filtros</Button>}
          />
        )}
      </div>

      {/* Painel de filtros mobile */}
      <div className={cx('fixed inset-0 z-50 md:hidden', panel ? 'visible' : 'invisible')}>
        <div className={cx('absolute inset-0 bg-black/40 transition-opacity', panel ? 'opacity-100' : 'opacity-0')} onClick={() => setPanel(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          className={cx('absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white transition-transform duration-400 ease-[var(--ease-out-expo)]', panel ? 'translate-y-0' : 'translate-y-full')}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
          <div className="flex h-14 items-center justify-between px-5">
            <h2 className="text-[17px] font-bold">Filtrar</h2>
            <button onClick={() => setPanel(false)} className="-mr-2 grid h-11 w-11 place-items-center" aria-label="Fechar filtros"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-7 overflow-y-auto px-5 pb-6">
            {searchable && (
              <label className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
                <input
                  value={q}
                  onChange={(e) => update((p) => (e.target.value ? p.set('filtro', e.target.value) : p.delete('filtro')))}
                  placeholder="Filtrar por nome"
                  className="h-12 w-full rounded-full border border-line pl-10 pr-4 text-[15px] outline-none focus:border-ink"
                />
              </label>
            )}
            <PillGroup title="Preço">
              {PRICES.map((r) => <Pill key={r.v} on={price === r.v} onClick={() => setPrice(r.v)}>{r.label}</Pill>)}
            </PillGroup>
            {colorOptions.length > 0 && (
              <PillGroup title="Cor">
                {colorOptions.map((c) => <Pill key={c} on={colors.includes(c)} onClick={() => toggleColor(c)}>{c}</Pill>)}
              </PillGroup>
            )}
            <PillGroup title="Disponibilidade">
              <Pill on={onlyAvailable} onClick={() => setAvailable(!onlyAvailable)}>Somente disponíveis</Pill>
            </PillGroup>
          </div>
          <div className="flex gap-3 border-t border-line p-4">
            {activeCount > 0 && <Button variant="ghost" onClick={clearAll}>Limpar</Button>}
            <Button className="flex-1" size="lg" onClick={() => setPanel(false)}>
              Ver {filtered.length} {filtered.length === 1 ? 'produto' : 'produtos'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dropdown({
  label, prefix, active, align = 'left', className, children,
}: {
  label: string
  prefix?: string
  active?: boolean
  align?: 'left' | 'right'
  className?: string
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cx(
          'flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-[13px] font-semibold transition-colors',
          active ? 'border-ink bg-ink text-white' : open ? 'border-ink' : 'border-line hover:border-ink',
        )}
      >
        {prefix && <span className="hidden font-medium text-muted sm:inline">{prefix}</span>}
        {label}
        <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      <div
        className={cx(
          'absolute top-full z-30 mt-2 rounded-2xl border border-line bg-white shadow-[0_24px_48px_-20px_rgba(0,0,0,.25)] transition-all duration-200',
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0',
        )}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  )
}

function OptionRow({ selected, onClick, multi, children }: { selected: boolean; onClick: () => void; multi?: boolean; children: ReactNode }) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cx('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors hover:bg-soft', selected && 'font-semibold')}
    >
      {children}
      <span
        className={cx(
          'grid h-5 w-5 place-items-center border transition-colors',
          multi ? 'rounded-md' : 'rounded-full',
          selected ? 'border-brand bg-brand text-white' : 'border-line',
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

function PillGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[13px] font-bold">{title}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={on}
      onClick={onClick}
      className={cx('h-11 rounded-full border px-4 text-[14px] font-medium transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line')}
    >
      {children}
    </button>
  )
}

function EmptyState({ title, text, action }: { title: string; text: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-soft">
        <PackageOpen className="h-6 w-6 text-muted" strokeWidth={1.5} />
      </span>
      <p className="mt-5 text-[18px] font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">{text}</p>
      <div className="mt-6">{action}</div>
    </div>
  )
}
