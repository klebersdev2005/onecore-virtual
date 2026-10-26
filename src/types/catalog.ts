/** Ilustração vetorial gerada em código, usada enquanto não há fotos reais do produto. */
export type ArtKind =
  | 'holder' | 'organizer' | 'earbuds' | 'charger' | 'lamp' | 'bottle'
  | 'backpack' | 'wallet' | 'box' | 'cable' | 'vacuum' | 'mug'

export interface ProductImage {
  /** URL de foto real (Supabase Storage). Quando ausente, usa a ilustração `art`. */
  url?: string
  art?: { kind: ArtKind; tone: string; view: 'front' | 'detail' | 'context' }
  alt: string
  width: number
  height: number
}

export interface VariantGroup {
  name: string
  options: string[]
  /** Acréscimo em centavos por opção (ausente = 0). */
  deltas?: Record<string, number>
}

export type Availability = 'available' | 'unavailable' | 'to_confirm'

export interface Category {
  slug: string
  name: string
  description: string
  /** Texto editorial exibido na página da categoria (conteúdo útil para SEO). */
  intro: string
  art: { kind: ArtKind; tone: string }
  /** Foto real (Storage). Quando ausente usa a ilustração. */
  imageUrl?: string | null
}

export interface Collection {
  slug: string
  name: string
  description: string
  art: { kind: ArtKind; tone: string }
  /** Foto real (Storage). Quando ausente usa a ilustração. */
  imageUrl?: string | null
}

export interface Product {
  id: string
  slug: string
  name: string
  categorySlug: string
  collectionSlugs: string[]
  /** Preço em centavos. */
  price: number
  /** Preço anterior: só preencher com comparação legítima e verificável. */
  compareAtPrice: number | null
  isNew: boolean
  createdAt: string
  shortDescription: string
  overview: string
  features: string[]
  specs: Record<string, string>
  dimensions?: string
  materials?: string
  packageContents?: string[]
  compatibility?: string
  usage?: string
  care?: string
  images: ProductImage[]
  variants: VariantGroup[]
  availability: Availability
  tags: string[]
  /** Agregado de avaliações reais. null = nenhuma avaliação. */
  rating: { average: number; count: number } | null
  /** Produto de demonstração — remover quando o catálogo real for cadastrado. */
  isDemo: boolean
}

export type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'newest'
