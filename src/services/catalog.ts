/**
 * Fonte central do catálogo. Os componentes nunca importam dados diretamente.
 * Com Supabase configurado lê do banco (respeitando RLS: só itens ativos);
 * sem ele usa o catálogo de demonstração.
 */
import * as demo from '../data/demo-catalog'
import { supabase } from '../lib/supabase'
import type { ArtKind, Category, Collection, Product, VariantGroup } from '../types/catalog'
import { searchScore, sortProducts } from './catalog-logic'

export { searchScore, sortProducts }
export type { Category, Collection, Product }

export const NEW_CATEGORY = 'novidades'

interface Catalog {
  categories: Category[]
  collections: Collection[]
  products: Product[]
}

type Art = { kind: ArtKind; tone: string } | null

// --------------------------------------------------------------- mapeamento do banco
interface ProductRow {
  id: string
  slug: string
  name: string
  short_description: string
  overview: string
  features: string[]
  specs: Record<string, string>
  dimensions: string | null
  materials: string | null
  package_contents: string[] | null
  compatibility: string | null
  usage: string | null
  care: string | null
  price_cents: number
  compare_at_price_cents: number | null
  availability: Product['availability']
  is_new: boolean
  tags: string[]
  art: Art
  rating_avg: number | null
  rating_count: number
  created_at: string
  category: { slug: string } | null
  product_collections: { collection: { slug: string } | null }[]
  product_variants: { name: string; value: string; price_delta_cents: number; sort: number; is_active: boolean }[]
  product_images: { url: string; alt: string; width: number; height: number; sort: number }[]
}

export function mapProduct(r: ProductRow): Product {
  const groups = new Map<string, VariantGroup>()
  for (const v of [...r.product_variants].filter((v) => v.is_active).sort((a, b) => a.sort - b.sort)) {
    const g = groups.get(v.name) ?? { name: v.name, options: [], deltas: {} }
    g.options.push(v.value)
    if (v.price_delta_cents) g.deltas![v.value] = v.price_delta_cents
    groups.set(v.name, g)
  }
  const images = [...r.product_images].sort((a, b) => a.sort - b.sort).map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height }))
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    categorySlug: r.category?.slug ?? '',
    collectionSlugs: r.product_collections.map((c) => c.collection?.slug).filter(Boolean) as string[],
    price: r.price_cents,
    compareAtPrice: r.compare_at_price_cents,
    isNew: r.is_new,
    createdAt: r.created_at,
    shortDescription: r.short_description,
    overview: r.overview,
    features: r.features,
    specs: r.specs,
    dimensions: r.dimensions ?? undefined,
    materials: r.materials ?? undefined,
    packageContents: r.package_contents?.length ? r.package_contents : undefined,
    compatibility: r.compatibility ?? undefined,
    usage: r.usage ?? undefined,
    care: r.care ?? undefined,
    images: images.length
      ? images
      : [{ art: { ...(r.art ?? { kind: 'box', tone: '#F2F2F2' }), view: 'front' }, alt: `${r.name} (imagem ilustrativa)`, width: 1200, height: 1200 }],
    variants: [...groups.values()],
    availability: r.availability,
    tags: r.tags,
    rating: r.rating_count > 0 && r.rating_avg != null ? { average: Number(r.rating_avg), count: r.rating_count } : null,
    isDemo: false,
  }
}

const fallbackArt = { kind: 'box' as ArtKind, tone: '#F2F2F2' }

export const PRODUCT_SELECT =
  '*, category:categories(slug), product_collections(collection:collections(slug)), product_variants(*), product_images(*)'

async function loadFromSupabase(): Promise<Catalog> {
  const db = supabase!
  const [cats, colls, prods] = await Promise.all([
    db.from('categories').select('*').eq('is_active', true).order('sort'),
    db.from('collections').select('*').eq('is_active', true).order('sort'),
    db.from('products').select(PRODUCT_SELECT).eq('is_active', true).order('created_at', { ascending: false }),
  ])
  const err = cats.error ?? colls.error ?? prods.error
  if (err) throw new Error(err.message)
  return {
    categories: (cats.data ?? []).map((c) => ({ slug: c.slug, name: c.name, description: c.description, intro: c.intro || c.description, art: c.art ?? fallbackArt, imageUrl: c.image_url })),
    collections: (colls.data ?? []).map((c) => ({ slug: c.slug, name: c.name, description: c.description, art: c.art ?? fallbackArt, imageUrl: c.image_url })),
    products: (prods.data as unknown as ProductRow[]).map(mapProduct),
  }
}

// --------------------------------------------------------------- cache
let cache: Promise<Catalog> | null = null
let snapshot: Catalog | null = null

export function loadCatalog(): Promise<Catalog> {
  if (!cache) {
    cache = (supabase ? loadFromSupabase() : Promise.resolve({ categories: demo.categories, collections: demo.collections, products: demo.products }))
      .then((c) => (snapshot = c))
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}

/** Chamado pelo admin após editar o catálogo. */
export function invalidateCatalog() {
  cache = null
}

const q = <T,>(fn: (c: Catalog) => T) => loadCatalog().then(fn)

export const getCategories = () => q((c) => c.categories)
export const getCategory = (slug: string) => q((c) => c.categories.find((x) => x.slug === slug) ?? null)
export const getCollections = () => q((c) => c.collections)
export const getCollection = (slug: string) => q((c) => c.collections.find((x) => x.slug === slug) ?? null)
export const getProduct = (slug: string) => q((c) => c.products.find((p) => p.slug === slug) ?? null)
export const getAllProducts = () => q((c) => c.products)

export const getProductsByCategory = (slug: string) =>
  q((c) => c.products.filter((p) => p.categorySlug === slug || (slug === NEW_CATEGORY && p.isNew)))

export const getProductsByCollection = (slug: string) => q((c) => c.products.filter((p) => p.collectionSlugs.includes(slug)))

export const getFeaturedProducts = (limit = 8) => q((c) => c.products.filter((p) => p.availability !== 'unavailable').slice(0, limit))

export const getNewArrivals = (limit = 4) =>
  q((c) => [...c.products].filter((p) => p.isNew).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit))

export const getRelated = (p: Product, limit = 4) =>
  q((c) =>
    c.products
      .filter((o) => o.id !== p.id && (o.categorySlug === p.categorySlug || o.collectionSlugs.some((s) => p.collectionSlugs.includes(s))))
      .slice(0, limit),
  )

export const searchProducts = (term: string) =>
  q((c) =>
    c.products
      .map((p) => ({ p, s: searchScore(p, term) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p),
  )

/** Leitura síncrona para o carrinho (disponível depois do primeiro carregamento). */
export const findProductSync = (slug: string) => snapshot?.products.find((p) => p.slug === slug)

/** Preço unitário exibido para uma seleção (o servidor recalcula no checkout). */
export function displayUnitPrice(p: Product, sel: Record<string, string>) {
  return p.price + p.variants.reduce((s, g) => s + (g.deltas?.[sel[g.name]] ?? 0), 0)
}
