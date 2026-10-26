import { lineKey } from './lineKey'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Carrinho do navegador. Guarda apenas referências (produto, variação, quantidade);
 * o preço exibido é recalculado a partir do catálogo, e o total definitivo será
 * sempre validado no backend no checkout.
 */
export interface CartLine {
  key: string
  slug: string
  variant: Record<string, string>
  qty: number
}

interface CartCtx {
  lines: CartLine[]
  count: number
  add: (slug: string, variant?: Record<string, string>, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
  /** Incrementa a cada adição — usado para o feedback visual no ícone. */
  pulse: number
}

const Ctx = createContext<CartCtx | null>(null)
const STORAGE = 'onecore.cart.v1'
const MAX_QTY = 10

const load = (): CartLine[] => {
  try {
    const raw = localStorage.getItem(STORAGE)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)
  const [isOpen, setOpen] = useState(false)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines))
    } catch {
      /* armazenamento indisponível: carrinho vale só para a sessão */
    }
  }, [lines])

  const add = useCallback((slug: string, variant: Record<string, string> = {}, qty = 1) => {
    const key = lineKey(slug, variant)
    setLines((ls) => {
      const found = ls.find((l) => l.key === key)
      if (found) return ls.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
      return [...ls, { key, slug, variant, qty: Math.min(MAX_QTY, qty) }]
    })
    setPulse((p) => p + 1)
  }, [])

  const setQty = useCallback(
    (key: string, qty: number) =>
      setLines((ls) => (qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)))),
    [],
  )
  const remove = useCallback((key: string) => setLines((ls) => ls.filter((l) => l.key !== key)), [])
  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      pulse,
    }),
    [lines, add, setQty, remove, clear, isOpen, pulse],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart fora do CartProvider')
  return c
}
