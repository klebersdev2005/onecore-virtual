import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ArtKind } from '../../types/catalog'
import { ProductArt } from '../products/ProductArt'

/** Faixa de abertura das páginas de catálogo (categoria, coleção, busca). */
export function CatalogHeader({
  crumbs, eyebrow, title, intro, art, imageUrl,
}: {
  crumbs: { name: string; path?: string }[]
  eyebrow: string
  title: string
  intro: string
  art?: { kind: ArtKind; tone: string }
  imageUrl?: string | null
}) {
  return (
    <section className="container-x pt-4 sm:pt-6">
      <div className="relative overflow-hidden rounded-3xl bg-soft">
        <div className="grid items-stretch md:grid-cols-[1fr_minmax(0,380px)]">
          <div className="relative z-10 flex flex-col justify-center px-6 py-9 sm:px-10 md:py-12">
            <nav aria-label="Trilha de navegação" className="anim-rise">
              <ol className="flex flex-wrap items-center gap-1 text-[12px] font-medium text-muted">
                {crumbs.map((c, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />}
                    {c.path && i < crumbs.length - 1 ? (
                      <Link to={c.path} className="transition-colors hover:text-ink">{c.name}</Link>
                    ) : (
                      <span aria-current="page" className="max-w-[180px] truncate text-ink sm:max-w-none">{c.name}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <p className="anim-rise eyebrow mt-6" style={{ animationDelay: '40ms' }}>{eyebrow}</p>
            <h1 className="anim-rise h-display mt-2 text-[34px] sm:text-[44px] md:text-[52px]" style={{ animationDelay: '80ms' }}>
              {title}
            </h1>
            {intro && (
              <p className="anim-rise mt-3 max-w-xl text-[15px] leading-relaxed text-muted sm:text-[16px]" style={{ animationDelay: '120ms' }}>
                {intro}
              </p>
            )}
          </div>

          {(art || imageUrl) && (
            <div className="relative hidden md:block">
              {/* transição suave entre texto e imagem */}
              <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-soft to-transparent" aria-hidden />
              {imageUrl ? (
                <img src={imageUrl} alt="" className="anim-rise h-full w-full object-cover" />
              ) : (
                <ProductArt {...art!} view="front" className="anim-rise h-full w-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
