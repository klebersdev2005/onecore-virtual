import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ProductImage } from '../../components/products/ProductImage'
import { cx } from '../../lib/format'
import type { ProductImage as Img } from '../../types/catalog'

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const touch = useRef<number | null>(null)
  const n = images.length
  const go = (d: number) => setI((v) => (v + d + n) % n)

  useEffect(() => {
    setI(0)
  }, [images])
  useEffect(() => {
    if (!zoom) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false)
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => (touch.current = e.touches[0].clientX),
    onTouchEnd: (e: React.TouchEvent) => {
      if (touch.current === null) return
      const dx = e.changedTouches[0].clientX - touch.current
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
      touch.current = null
    },
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      <div className="flex gap-2.5 md:flex-col" role="tablist" aria-label="Imagens do produto">
        {images.map((img, k) => (
          <button
            key={k}
            role="tab"
            aria-selected={k === i}
            aria-label={`Imagem ${k + 1} de ${n}`}
            onClick={() => setI(k)}
            className={cx('h-16 w-16 overflow-hidden rounded-lg ring-2 ring-offset-2 transition md:h-20 md:w-20', k === i ? 'ring-ink' : 'ring-transparent opacity-70 hover:opacity-100')}
          >
            <ProductImage image={img} />
          </button>
        ))}
      </div>

      <div className="group relative aspect-square flex-1 overflow-hidden rounded-2xl bg-soft" {...swipe}>
        {images.map((img, k) => (
          <div key={k} className={cx('absolute inset-0 transition-opacity duration-500', k === i ? 'opacity-100' : 'pointer-events-none opacity-0')} aria-hidden={k !== i}>
            <ProductImage image={img} eager={k === 0} />
          </div>
        ))}
        <button onClick={() => setZoom(true)} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white" aria-label="Ampliar imagem">
          <Expand className="h-4 w-4" />
        </button>
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 md:grid" aria-label="Imagem anterior"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => go(1)} className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow-sm transition group-hover:opacity-100 md:grid" aria-label="Próxima imagem"><ChevronRight className="h-5 w-5" /></button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden">
              {images.map((_, k) => <span key={k} className={cx('h-1.5 rounded-full transition-all', k === i ? 'w-5 bg-ink' : 'w-1.5 bg-ink/25')} />)}
            </div>
          </>
        )}
        {images[i]?.art && <span className="absolute bottom-3 right-3 hidden rounded bg-white/80 px-2 py-0.5 text-[11px] text-muted md:block">Imagem ilustrativa</span>}
      </div>

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={`Imagens de ${name}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-white anim-rise [animation-duration:.3s]" {...swipe}>
          <button onClick={() => setZoom(false)} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-soft" aria-label="Fechar"><X className="h-5 w-5" /></button>
          <div className="aspect-square w-full max-w-[min(90vw,88vh)] overflow-hidden rounded-2xl">
            <ProductImage image={images[i]} eager />
          </div>
          {n > 1 && (
            <>
              <button onClick={() => go(-1)} className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-soft" aria-label="Imagem anterior"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => go(1)} className="absolute right-4 grid h-12 w-12 place-items-center rounded-full bg-soft" aria-label="Próxima imagem"><ChevronRight className="h-5 w-5" /></button>
            </>
          )}
          <p className="absolute bottom-5 text-[13px] text-muted">{i + 1} / {n}</p>
        </div>
      )}
    </div>
  )
}
