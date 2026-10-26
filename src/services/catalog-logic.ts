import { normalize } from '../lib/format'
import type { Product, SortKey } from '../types/catalog'

export function searchScore(p: Product, q: string) {
  const terms = normalize(q).split(/\s+/).filter(Boolean)
  if (!terms.length) return 1
  const name = normalize(p.name)
  const hay = normalize([p.name, p.shortDescription, p.tags.join(' '), p.categorySlug].join(' '))
  let score = 0
  for (const t of terms) {
    if (name.includes(t)) score += 3
    else if (hay.includes(t)) score += 1
    else return 0
  }
  return score
}

export function sortProducts(list: Product[], sort: SortKey) {
  const l = [...list]
  if (sort === 'price-asc') l.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') l.sort((a, b) => b.price - a.price)
  if (sort === 'newest') l.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return l
}
