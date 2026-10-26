import { Check, ChevronDown, CreditCard, QrCode, RotateCcw, ShoppingBag, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QtyStepper } from '../../components/cart/CartDrawer'
import { useCart } from '../../components/cart/CartContext'
import { ProductGrid } from '../../components/products/ProductCard'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Section } from '../../components/ui/Section'
import { useAsync } from '../../hooks/useAsync'
import { cx, formatPrice } from '../../lib/format'
import { SITE_URL, breadcrumbLd, useSeo } from '../../lib/seo'
import { displayUnitPrice, getCategory, getProduct, getRelated } from '../../services/catalog'
import { deliveryEstimate, getStoreSettings } from '../../services/store'
import { Reviews } from './Reviews'
import type { Product } from '../../types/catalog'
import NotFoundPage from '../NotFound/NotFoundPage'
import { Gallery } from './Gallery'

const AVAIL = {
  available: { label: 'Disponível', cls: 'text-success' },
  unavailable: { label: 'Indisponível no momento', cls: 'text-muted' },
  to_confirm: { label: 'Disponibilidade a confirmar', cls: 'text-brand-dark' },
}

export default function ProductPage() {
  const { slug = '' } = useParams()
  const { data: product, loading } = useAsync(() => getProduct(slug), [slug])
  if (!loading && !product) return <NotFoundPage />
  if (!product) return <ProductSkeleton />
  return <ProductView key={product.id} product={product} />
}

function ProductView({ product: p }: { product: Product }) {
  const { add, open } = useCart()
  const nav = useNavigate()
  const { data: cat } = useAsync(() => getCategory(p.categorySlug), [p.categorySlug])
  const { data: related } = useAsync(() => getRelated(p), [p.id])
  const [sel, setSel] = useState<Record<string, string>>({})
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const path = `/produto/${p.slug}`
  const canBuy = p.availability !== 'unavailable'
  const { data: settings } = useAsync(getStoreSettings, [])
  const estimate = settings && deliveryEstimate(settings)
  const shippingText = estimate ? `Prazo estimado: ${estimate}. Frete calculado no checkout.` : 'Frete calculado no checkout.'

  const crumbs = [
    { name: 'Início', path: '/' },
    ...(cat ? [{ name: cat.name, path: `/categoria/${cat.slug}` }] : []),
    { name: p.name, path },
  ]

  useSeo({
    title: p.name,
    description: `${p.shortDescription} ${p.overview}`.slice(0, 158),
    path,
    image: p.images[0]?.url,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        description: p.overview,
        sku: p.id,
        url: SITE_URL + path,
        ...(p.images.some((i) => i.url) && { image: p.images.filter((i) => i.url).map((i) => i.url) }),
        offers: {
          '@type': 'Offer',
          price: (p.price / 100).toFixed(2),
          priceCurrency: 'BRL',
          url: SITE_URL + path,
          availability: p.availability === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
        // AggregateRating somente com avaliações reais
        ...(p.rating && { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.average, reviewCount: p.rating.count } }),
      },
      breadcrumbLd(crumbs.map((c) => ({ name: c.name, path: c.path! }))),
    ],
  })

  useEffect(() => {
    setError('')
  }, [sel])

  const validate = () => {
    const missing = p.variants.find((v) => !sel[v.name])
    if (missing) {
      setError(`Selecione ${missing.name.toLowerCase()}.`)
      return false
    }
    return true
  }
  const addToCart = () => {
    if (!validate()) return
    add(p.slug, sel, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }
  const buyNow = () => {
    if (!validate()) return
    add(p.slug, sel, qty)
    nav('/carrinho')
  }

  const details: { title: string; body: React.ReactNode }[] = [
    { title: 'Visão geral', body: <p>{p.overview}</p> },
    p.features.length > 0 && { title: 'Principais características', body: <ul className="space-y-2">{p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}</li>)}</ul> },
    Object.keys(p.specs).length > 0 && {
      title: 'Especificações técnicas',
      body: (
        <dl className="divide-y divide-line">
          {Object.entries(p.specs).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-4 py-2.5">
              <dt className="text-muted">{k}</dt>
              <dd className={cx('font-medium', /a confirmar/i.test(v) && 'text-brand-dark')}>{v}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    (p.dimensions || p.materials) && { title: 'Dimensões e materiais', body: <p>{[p.dimensions && `Dimensões: ${p.dimensions}`, p.materials && `Materiais: ${p.materials}`].filter(Boolean).join(' · ')}</p> },
    p.packageContents && { title: 'Conteúdo da embalagem', body: <ul className="list-disc space-y-1 pl-5">{p.packageContents.map((c) => <li key={c}>{c}</li>)}</ul> },
    p.compatibility && { title: 'Compatibilidade', body: <p>{p.compatibility}</p> },
    p.usage && { title: 'Instruções de uso', body: <p>{p.usage}</p> },
    p.care && { title: 'Cuidados e limitações', body: <p>{p.care}</p> },
  ].filter(Boolean) as { title: string; body: React.ReactNode }[]

  return (
    <>
      <div className="container-x pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-x grid gap-10 pb-6 pt-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-8">
        <div className="lg:sticky lg:top-36 lg:self-start">
          <Gallery images={p.images} name={p.name} />
        </div>

        <div className="anim-rise">
          {p.isNew && <p className="eyebrow mb-3">Novidade</p>}
          <h1 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] md:text-[40px]">{p.name}</h1>
          <p className="mt-3 text-[16px] text-muted">{p.shortDescription}</p>

          <p className="mt-3 text-[13px] text-muted">
            {p.rating ? `★ ${p.rating.average.toFixed(1)} · ${p.rating.count} avaliações` : 'Ainda sem avaliações'}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-[32px] font-extrabold tracking-tight">{formatPrice(displayUnitPrice(p, sel))}</span>
            {p.compareAtPrice && p.compareAtPrice > p.price && <s className="text-[16px] text-muted">{formatPrice(p.compareAtPrice)}</s>}
          </div>
          {p.isDemo && <p className="mt-1 text-[12px] text-muted">Preço de demonstração</p>}
          <p className={cx('mt-3 flex items-center gap-2 text-[14px] font-semibold', AVAIL[p.availability].cls)}>
            <span className="h-2 w-2 rounded-full bg-current" /> {AVAIL[p.availability].label}
          </p>

          <div id="opcoes" className="mt-8 space-y-6 border-t border-line pt-7">
            {p.variants.map((v) => (
              <fieldset key={v.name}>
                <legend className="mb-3 text-[14px] font-semibold">
                  {v.name}: <span className="font-normal text-muted">{sel[v.name] ?? 'selecione'}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {v.options.map((o) => (
                    <button
                      key={o}
                      aria-pressed={sel[v.name] === o}
                      onClick={() => setSel((s) => ({ ...s, [v.name]: o }))}
                      className={cx(
                        'h-11 min-w-[64px] rounded-[10px] border px-4 text-[14px] font-medium transition-all',
                        sel[v.name] === o ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink',
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}

            <div>
              <p className="mb-3 text-[14px] font-semibold">Quantidade</p>
              <QtyStepper qty={qty} onChange={(n) => setQty(Math.max(1, n))} />
            </div>

            {error && <p role="alert" className="text-[14px] font-semibold text-brand-dark">{error}</p>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="sm:flex-1" onClick={buyNow} disabled={!canBuy}>Comprar agora</Button>
              <Button size="lg" variant={added ? "dark" : "secondary"} className="sm:flex-1" onClick={addToCart} disabled={!canBuy}>
                {added ? <><Check className="h-4 w-4" /> Adicionado</> : <><ShoppingBag className="h-4 w-4" /> Adicionar ao carrinho</>}
              </Button>
            </div>
            {added && (
              <button onClick={open} className="anim-rise text-[13px] font-semibold text-brand-dark underline-offset-4 hover:underline">Ver carrinho →</button>
            )}
          </div>

          <ul className="mt-8 divide-y divide-line rounded-2xl border border-line text-[14px]">
            <li className="flex gap-3.5 p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-ink" strokeWidth={1.75} />
              <div><p className="font-semibold">Entrega</p><p className="text-muted">{shippingText}</p></div>
            </li>
            <li className="flex gap-3.5 p-4">
              <div className="mt-0.5 flex shrink-0 gap-1"><QrCode className="h-5 w-5" strokeWidth={1.75} /></div>
              <div>
                <p className="font-semibold">Pagamento</p>
                <p className="flex flex-wrap items-center gap-x-3 text-muted"><span>Pix</span><span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />Cartão de crédito</span></p>
              </div>
            </li>
            <li className="flex gap-3.5 p-4">
              <RotateCcw className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
              <div><p className="font-semibold">Trocas e devoluções</p><p className="text-muted">Direito de arrependimento em até 7 dias após o recebimento. <Link to="/ajuda/trocas-e-devolucoes" className="font-semibold text-ink underline underline-offset-2">Ver política</Link></p></div>
            </li>
          </ul>
        </div>
      </div>

      <section className="container-x grid gap-12 py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16" aria-label="Detalhes do produto">
        <div>
          <h2 className="mb-4 text-[24px] font-extrabold tracking-tight">Detalhes</h2>
          <div className="divide-y divide-line border-y border-line">
            {details.map((d, k) => (
              <details key={d.title} open={k < 2} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {d.title}
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-5 text-[15px] leading-relaxed text-ink/80">{d.body}</div>
              </details>
            ))}
          </div>
          {p.isDemo && <p className="mt-3 text-[12px] text-muted">Informações marcadas “a confirmar” ainda precisam ser validadas com o fornecedor.</p>}
        </div>
        <Reviews product={p} />
      </section>

      {related && related.length > 0 && (
        <Section eyebrow="Relacionados" title="Você também pode gostar" action={cat ? { to: `/categoria/${cat.slug}`, label: `Mais em ${cat.name}` } : undefined}>
          <ProductGrid products={related} />
        </Section>
      )}

      {/* Barra fixa de compra no mobile */}
      {canBuy && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-muted">{p.name}</p>
            <p className="text-[17px] font-extrabold">{formatPrice(displayUnitPrice(p, sel))}</p>
          </div>
          <Button
            onClick={() => {
              if (!validate()) return document.getElementById('opcoes')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              addToCart()
            }}
          >
            {added ? 'Adicionado' : 'Adicionar'}
          </Button>
        </div>
      )}
      {canBuy && <div className="h-20 lg:hidden" aria-hidden />}
    </>
  )
}

function ProductSkeleton() {
  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16" aria-busy="true">
      <div className="skeleton aspect-square rounded-2xl" />
      <div className="space-y-4">
        <div className="skeleton h-10 w-3/4 rounded-lg" />
        <div className="skeleton h-5 w-1/2 rounded" />
        <div className="skeleton mt-8 h-9 w-1/3 rounded" />
        <div className="skeleton mt-8 h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
