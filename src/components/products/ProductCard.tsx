import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../types/catalog'
import { cx, formatPrice } from '../../lib/format'
import { useCart } from '../cart/CartContext'
import { ProductImage } from './ProductImage'

export function ProductCard({ product, eager }: { product: Product; eager?: boolean }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const unavailable = product.availability === 'unavailable'
  const needsChoice = product.variants.length > 0
  const href = `/produto/${product.slug}`
  const [img, img2] = product.images

  const quickAdd = () => {
    add(product.slug)
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        <Link to={href} className="relative block aspect-square overflow-hidden rounded-xl bg-soft" aria-label={product.name}>
          <ProductImage image={img} eager={eager} className="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
          {img2 && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100">
              <ProductImage image={img2} />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {product.isNew && <span className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-ink shadow-sm">Novo</span>}
            {unavailable && <span className="rounded-md bg-ink px-2 py-1 text-[11px] font-bold text-white">Indisponível</span>}
          </div>
        </Link>

        {/* Ação rápida: sempre visível em toque, revelada no hover com mouse */}
        {!unavailable && !needsChoice && (
          <button
            onClick={quickAdd}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            className={cx(
              'absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full shadow-[0_6px_18px_-6px_rgba(0,0,0,.35)] transition-all duration-300',
              added ? 'bg-success text-white' : 'bg-white text-ink hover:bg-brand hover:text-white',
              '[@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 group-hover:!translate-y-0 group-hover:!opacity-100 focus-visible:!opacity-100',
            )}
          >
            {added ? <Check className="h-[18px] w-[18px]" /> : <Plus className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col gap-1">
        <Link to={href} className="text-[15px] font-semibold leading-snug text-ink hover:text-brand-dark transition-colors line-clamp-2">
          {product.name}
        </Link>
        <p className="text-[13px] text-muted line-clamp-1">{product.shortDescription}</p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[16px] font-bold tracking-tight">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <s className="text-[13px] text-muted">{formatPrice(product.compareAtPrice)}</s>
          )}
        </div>
        {product.rating && (
          <p className="text-[12px] text-muted">
            ★ {product.rating.average.toFixed(1)} · {product.rating.count} avaliações
          </p>
        )}
      </div>
    </article>
  )
}

export function ProductGrid({ products, eagerFirst = 0 }: { products: Product[]; eagerFirst?: number }) {
  if (!products.length) return <p className="rounded-2xl bg-soft p-8 text-center text-muted">Novos produtos em breve.</p>
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} eager={i < eagerFirst} />
      ))}
    </div>
  )
}

export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4" aria-busy="true" aria-label="Carregando produtos">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <div className="skeleton aspect-square rounded-xl" />
          <div className="skeleton mt-4 h-4 w-3/4 rounded" />
          <div className="skeleton mt-2 h-3 w-1/2 rounded" />
          <div className="skeleton mt-3 h-4 w-1/3 rounded" />
        </div>
      ))}
    </div>
  )
}
