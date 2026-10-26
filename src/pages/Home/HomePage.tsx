import { ArrowUpRight, BookOpen, CreditCard, Headphones, PackageSearch, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductArt } from '../../components/products/ProductArt'
import { ProductCard, ProductGrid, ProductGridSkeleton } from '../../components/products/ProductCard'
import { ButtonLink } from '../../components/ui/Button'
import { Section } from '../../components/ui/Section'
import { useAsync } from '../../hooks/useAsync'
import { useReveal } from '../../hooks/useReveal'
import { cx } from '../../lib/format'
import { SITE_NAME, SITE_URL, useSeo } from '../../lib/seo'
import {
  getCategories, getCollections, getFeaturedProducts, getNewArrivals, getProductsByCollection,
  type Collection,
} from '../../services/catalog'
import { Hero } from './Hero'

export default function HomePage() {
  useSeo({
    title: SITE_NAME,
    description: 'Produtos selecionados para simplificar sua rotina, renovar seus espaços e acompanhar seu estilo.',
    path: '/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/busca?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
    },
  })
  const cats = useAsync(getCategories, [])
  const featured = useAsync(() => getFeaturedProducts(8), [])
  const fresh = useAsync(() => getNewArrivals(4), [])
  const colls = useAsync(getCollections, [])

  return (
    <>
      <Hero />

      <Section eyebrow="Categorias" title="Encontre pelo que importa" description="Navegue pelas áreas da sua rotina." className="pt-6 md:pt-10">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {(cats.data ?? []).map((c, i) => (
            <Link
              key={c.slug}
              to={`/categoria/${c.slug}`}
              className={cx(
                'group relative overflow-hidden rounded-2xl bg-soft',
                i === 0 ? 'col-span-2 aspect-[2/1.15] lg:row-span-2 lg:aspect-auto' : 'aspect-[1/1.1] lg:aspect-auto lg:min-h-[250px]',
                i === 4 && 'col-span-2 aspect-[2/1] lg:col-span-1 lg:aspect-auto',
              )}
            >
              <ProductArt {...c.art} view={i === 0 ? 'context' : 'front'} className="absolute inset-0 h-full w-full transition-transform duration-[1.1s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-4 pt-16 sm:p-5 sm:pt-20">
                <div className="flex items-end justify-between gap-3">
                  <div className="text-white">
                    <h3 className={cx('font-bold leading-tight tracking-tight', i === 0 ? 'text-[22px] sm:text-[28px]' : 'text-[15px] sm:text-[18px]')}>{c.name}</h3>
                    <p className={cx('mt-1 text-[13px] text-white/80', i === 0 ? 'block max-w-sm' : 'hidden sm:block line-clamp-2')}>{c.description}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-all duration-300 group-hover:bg-brand group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {cats.loading && Array.from({ length: 5 }, (_, i) => <div key={i} className={cx('skeleton min-h-[200px] rounded-2xl', i === 0 && 'col-span-2 lg:row-span-2')} />)}
        </div>
      </Section>

      <Section eyebrow="Destaques" title="Escolhidos para começar" action={{ to: '/busca', label: 'Ver todos os produtos' }}>
        {featured.data ? (
          <ProductGrid products={featured.data} />
        ) : featured.error ? (
          <p className="rounded-2xl bg-soft p-8 text-center text-muted">Não foi possível carregar o catálogo agora. Tente recarregar a página.</p>
        ) : (
          <ProductGridSkeleton />
        )}
      </Section>

      <div className="bg-soft">
        {(colls.data ?? []).map((c, i) => (
          <CollectionBlock key={c.slug} collection={c} flip={i % 2 === 1} />
        ))}
      </div>

      <Section eyebrow="Novidades" title="Acabou de chegar" description="Os produtos adicionados mais recentemente ao catálogo." action={{ to: '/categoria/novidades', label: 'Ver novidades' }}>
        {fresh.data ? <ProductGrid products={fresh.data} /> : !fresh.error && <ProductGridSkeleton n={4} />}
      </Section>

      <Trust />
      <Guides />
    </>
  )
}

function CollectionBlock({ collection: c, flip }: { collection: Collection; flip: boolean }) {
  const ref = useReveal()
  const { data } = useAsync(() => getProductsByCollection(c.slug), [c.slug])
  const dark = c.art.tone === '#171717'
  return (
    <div ref={ref} className="reveal container-x py-14 md:py-20">
      <div className={cx('grid gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-12', flip && 'lg:grid-cols-[1.5fr_0.9fr]')}>
        <Link
          to={`/colecao/${c.slug}`}
          className={cx('group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl p-7 sm:min-h-[420px]', flip && 'lg:order-2', dark ? 'text-white' : 'text-ink')}
        >
          <ProductArt {...c.art} view="context" className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
          <div className={cx('absolute inset-0', dark ? 'bg-gradient-to-t from-black/70 to-transparent' : 'bg-gradient-to-t from-white/90 via-white/30 to-transparent')} />
          <div className="relative">
            <p className={cx('eyebrow', dark && 'text-brand')}>Coleção</p>
            <h3 className="mt-2 text-[30px] font-extrabold tracking-[-0.03em] md:text-[36px]">{c.name}</h3>
            <p className={cx('mt-2 max-w-sm text-[15px]', dark ? 'text-white/75' : 'text-muted')}>{c.description}</p>
          </div>
        </Link>
        <div className="flex flex-col">
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 [scrollbar-width:none]">
            {(data ?? []).slice(0, 3).map((p) => (
              <div key={p.id} className="w-[68%] shrink-0 snap-start sm:w-auto">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <ButtonLink to={`/colecao/${c.slug}`} variant="secondary" className="mt-8 self-start">
            Ver coleção completa ({data?.length ?? '…'})
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}

/** Apenas compromissos que a arquitetura da loja realmente cumpre. Nada de selos ou prêmios. */
function Trust() {
  const items = [
    { icon: CreditCard, title: 'Pagamento seguro', text: 'Pix e cartão processados por provedor de pagamento. A loja não armazena os dados do seu cartão.' },
    { icon: PackageSearch, title: 'Acompanhamento do pedido', text: 'Veja o status e o código de rastreamento na sua conta assim que o envio for confirmado.' },
    { icon: RotateCcw, title: 'Trocas e devoluções', text: 'Regras publicadas de forma clara, conforme o Código de Defesa do Consumidor.' },
    { icon: Headphones, title: 'Atendimento', text: 'Canais de contato informados na página de ajuda, para dúvidas antes e depois da compra.' },
  ]
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className="reveal border-y border-line">
      <div className="container-x grid divide-line sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 py-8 lg:px-8 lg:first:pl-0">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-brand" strokeWidth={1.75} />
            <div>
              <h3 className="text-[15px] font-bold">{title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Espaço reservado para guias editoriais (SEO). Sem links até que o conteúdo exista. */
function Guides() {
  const guides = [
    { tag: 'Guia de compra', title: 'Como escolher um carregador para o carro' },
    { tag: 'Organização', title: 'Gavetas organizadas em uma tarde' },
    { tag: 'Comparativo', title: 'Fones sem fio: o que observar antes de comprar' },
  ]
  return (
    <Section eyebrow="Conteúdo" title="Guias para comprar melhor" description="Conteúdo útil para decidir com informação. Em preparação.">
      <div className="grid gap-4 md:grid-cols-3">
        {guides.map((g) => (
          <article key={g.title} className="flex min-h-[180px] flex-col justify-between rounded-2xl border border-line p-6">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted">{g.tag}</span>
              <BookOpen className="h-4 w-4 text-line" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold leading-snug tracking-tight">{g.title}</h3>
              <span className="mt-3 inline-block rounded-md bg-soft px-2 py-1 text-[11px] font-semibold text-muted">Em breve</span>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}
