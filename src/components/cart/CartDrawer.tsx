import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCartDetails } from '../../hooks/useCartDetails'
import { cx, formatPrice } from '../../lib/format'
import { ProductImage } from '../products/ProductImage'
import { ButtonLink, btn } from '../ui/Button'

export function QtyStepper({ qty, onChange, small }: { qty: number; onChange: (n: number) => void; small?: boolean }) {
  const s = small ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center rounded-[10px] border border-line">
      <button className={cx(s, 'grid place-items-center hover:text-brand')} onClick={() => onChange(qty - 1)} aria-label="Diminuir quantidade">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{qty}</span>
      <button className={cx(s, 'grid place-items-center hover:text-brand disabled:opacity-30')} disabled={qty >= 10} onClick={() => onChange(qty + 1)} aria-label="Aumentar quantidade">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function CartDrawer() {
  const { isOpen, close, items, subtotal, setQty, remove, count } = useCartDetails()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  return (
    <div className={cx('fixed inset-0 z-50', isOpen ? 'visible' : 'invisible')} aria-hidden={!isOpen}>
      <div className={cx('absolute inset-0 bg-black/40 transition-opacity duration-300', isOpen ? 'opacity-100' : 'opacity-0')} onClick={close} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho"
        className={cx(
          'absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white transition-transform duration-500 ease-[var(--ease-out-expo)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <h2 className="text-[17px] font-bold">Carrinho <span className="font-medium text-muted">({count})</span></h2>
          <button onClick={close} className="-mr-2 grid h-11 w-11 place-items-center rounded-lg hover:bg-soft" aria-label="Fechar carrinho">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-soft"><ShoppingBag className="h-7 w-7 text-muted" /></div>
            <p className="font-semibold">Seu carrinho está vazio</p>
            <p className="text-sm text-muted">Explore o catálogo e adicione o que fizer sentido para você.</p>
            <button onClick={close} className={btn('secondary')}>Continuar comprando</button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map(({ line, product, unitPrice }) => (
                <li key={line.key} className="flex gap-4 py-5">
                  <Link to={`/produto/${product.slug}`} onClick={close} className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                    <ProductImage image={product.images[0]} />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <Link to={`/produto/${product.slug}`} onClick={close} className="text-sm font-semibold leading-snug hover:text-brand-dark">{product.name}</Link>
                      <span className="text-sm font-bold tabular-nums">{formatPrice(unitPrice * line.qty)}</span>
                    </div>
                    {Object.entries(line.variant).map(([k, v]) => (
                      <span key={k} className="mt-0.5 text-[13px] text-muted">{k}: {v}</span>
                    ))}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper small qty={line.qty} onChange={(n) => setQty(line.key, n)} />
                      <button onClick={() => remove(line.key)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink" aria-label={`Remover ${product.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-5">
              <div className="flex justify-between text-[15px]">
                <span className="text-muted">Subtotal</span>
                <span className="font-bold tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-[12px] text-muted">Frete calculado no checkout. O total é confirmado pelo servidor.</p>
              <ButtonLink to="/carrinho" onClick={close} size="lg" className="mt-4 w-full">Ver carrinho e finalizar</ButtonLink>
              <button onClick={close} className="mt-2 h-11 w-full text-sm font-semibold text-muted hover:text-ink">Continuar comprando</button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
