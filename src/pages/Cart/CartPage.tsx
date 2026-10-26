import { Lock, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { QtyStepper } from '../../components/cart/CartDrawer'
import { ProductImage } from '../../components/products/ProductImage'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { ButtonLink } from '../../components/ui/Button'
import { useCartDetails } from '../../hooks/useCartDetails'
import { formatPrice } from '../../lib/format'
import { useSeo } from '../../lib/seo'

export default function CartPage() {
  useSeo({ title: 'Carrinho', noindex: true })
  const { items, subtotal, setQty, remove, count } = useCartDetails()

  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Carrinho' }]} />
      <h1 className="h-display mt-8 text-[36px] md:text-[48px]">Carrinho</h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-soft px-6 py-20 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted" strokeWidth={1.5} />
          <p className="mt-5 text-[18px] font-bold">Seu carrinho está vazio</p>
          <p className="mt-2 text-muted">Que tal começar pelos destaques?</p>
          <ButtonLink to="/busca" className="mt-7">Explorar produtos</ButtonLink>
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <ul className="divide-y divide-line border-y border-line">
            {items.map(({ line, product, unitPrice }) => (
              <li key={line.key} className="flex gap-4 py-6 sm:gap-6">
                <Link to={`/produto/${product.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-32">
                  <ProductImage image={product.images[0]} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div>
                      <Link to={`/produto/${product.slug}`} className="font-semibold hover:text-brand-dark">{product.name}</Link>
                      {Object.entries(line.variant).map(([k, v]) => <p key={k} className="text-[13px] text-muted">{k}: {v}</p>)}
                      <p className="mt-1 text-[13px] text-muted">{formatPrice(unitPrice)} cada</p>
                    </div>
                    <p className="font-bold tabular-nums">{formatPrice(unitPrice * line.qty)}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-4">
                    <QtyStepper small qty={line.qty} onChange={(n) => setQty(line.key, n)} />
                    <button onClick={() => remove(line.key)} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] text-muted hover:text-ink">
                      <Trash2 className="h-4 w-4" /> Remover
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-line p-6 lg:sticky lg:top-36">
            <h2 className="text-[18px] font-bold">Resumo</h2>
            <dl className="mt-5 space-y-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal ({count} {count === 1 ? 'item' : 'itens'})</dt><dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Frete</dt><dd className="text-muted">Calculado pelo CEP no checkout</dd></div>
            </dl>
            <div className="mt-5 flex justify-between border-t border-line pt-5 text-[17px]">
              <span className="font-bold">Total parcial</span>
              <span className="font-extrabold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <ButtonLink to="/checkout" size="lg" className="mt-6 w-full">
              <Lock className="h-4 w-4" /> Finalizar compra
            </ButtonLink>
            <p className="mt-3 text-center text-[12px] text-muted">O total final é calculado e validado pelo servidor.</p>
            <ButtonLink to="/busca" variant="ghost" className="mt-2 w-full">Continuar comprando</ButtonLink>
          </aside>
        </div>
      )}
    </div>
  )
}
