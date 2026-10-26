import { useCart } from '../components/cart/CartContext'
import { displayUnitPrice, loadCatalog } from '../services/catalog'
import { useAsync } from './useAsync'

/** Junta as linhas do carrinho com o catálogo atual (preço sempre do catálogo, nunca do storage). */
export function useCartDetails() {
  const cart = useCart()
  const { data, loading } = useAsync(loadCatalog, [])
  const items = data
    ? cart.lines.flatMap((line) => {
        const product = data.products.find((p) => p.slug === line.slug)
        return product ? [{ line, product, unitPrice: displayUnitPrice(product, line.variant) }] : []
      })
    : []
  const subtotal = items.reduce((s, x) => s + x.unitPrice * x.line.qty, 0)
  return { ...cart, items, subtotal, loading }
}
