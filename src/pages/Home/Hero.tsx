import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductArt } from '../../components/products/ProductArt'
import { ButtonLink } from '../../components/ui/Button'

const d = (ms: number) => ({ animationDelay: `${ms}ms` })

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* grade geométrica discreta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.5] [background-image:linear-gradient(#EAEAEA_1px,transparent_1px),linear-gradient(90deg,#EAEAEA_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_70%_60%_at_70%_40%,#000_20%,transparent_75%)]"
      />
      <div className="container-x relative grid items-center gap-12 pb-16 pt-10 md:pt-14 lg:min-h-[640px] lg:grid-cols-[1.02fr_1fr] lg:gap-8 lg:pb-24 lg:pt-16">
        <div className="max-w-[600px]">
          <p className="anim-rise eyebrow flex items-center gap-2.5" style={d(0)}>
            <span className="h-px w-8 bg-brand" /> Curadoria OneCore
          </p>
          <h1 className="anim-rise h-display mt-5 text-[44px] sm:text-[60px] lg:text-[76px]" style={d(80)}>
            Descubra o que faz <span className="relative whitespace-nowrap">
              sentido
              <svg aria-hidden viewBox="0 0 220 18" className="absolute -bottom-1.5 left-0 w-full text-brand" preserveAspectRatio="none">
                <path d="M3 13 C 60 4, 150 4, 217 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="[stroke-dasharray:240] [stroke-dashoffset:240] [animation:draw_1.1s_.7s_var(--ease-out-expo)_forwards]" />
              </svg>
            </span>{' '}
            para você.
          </h1>
          <p className="anim-rise mt-7 max-w-[470px] text-[17px] leading-relaxed text-muted sm:text-[18px]" style={d(180)}>
            Produtos selecionados para simplificar sua rotina, renovar seus espaços e acompanhar seu estilo.
          </p>
          <div className="anim-rise mt-9 flex flex-col gap-3 sm:flex-row" style={d(280)}>
            <ButtonLink to="/busca" size="lg">
              Explorar produtos <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </ButtonLink>
            <ButtonLink to="/categoria/novidades" variant="secondary" size="lg">
              Descobrir novidades
            </ButtonLink>
          </div>
          <dl className="anim-rise mt-12 grid max-w-[460px] grid-cols-3 border-t border-line pt-6 text-[13px]" style={d(380)}>
            {[
              ['Casa', 'organização'],
              ['Tecnologia', 'e acessórios'],
              ['Carro', 'e dia a dia'],
            ].map(([a, b]) => (
              <div key={a}>
                <dt className="font-bold text-ink">{a}</dt>
                <dd className="text-muted">{b}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Composição editorial */}
        <div className="relative mx-auto aspect-[1/1.02] w-full max-w-[560px] lg:mr-0">
          <div aria-hidden className="anim-rise absolute -right-6 top-6 h-[78%] w-[78%] rounded-full border border-brand/30" style={d(200)} />
          <div aria-hidden className="absolute left-[2%] top-[4%] h-14 w-14 rotate-12 rounded-lg border-2 border-ink/10 anim-float" />

          <Link
            to="/categoria/dia-a-dia"
            className="anim-rise group absolute left-[10%] top-[6%] h-[66%] w-[62%] overflow-hidden rounded-2xl shadow-[0_40px_80px_-40px_rgba(0,0,0,.35)]"
            style={d(120)}
            aria-label="Acessórios para o dia a dia"
          >
            <ProductArt kind="bottle" tone="#E6EFEA" view="context" className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
            <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3.5 py-1.5 text-[12px] font-semibold backdrop-blur">Dia a dia</span>
          </Link>

          <Link
            to="/categoria/tecnologia-e-acessorios"
            className="anim-rise group absolute right-0 top-[30%] h-[40%] w-[40%] overflow-hidden rounded-2xl ring-[6px] ring-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.4)]"
            style={d(300)}
            aria-label="Tecnologia e acessórios"
          >
            <ProductArt kind="earbuds" tone="#171717" className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
          </Link>

          <Link
            to="/categoria/casa-e-organizacao"
            className="anim-rise group absolute bottom-0 left-[30%] h-[34%] w-[34%] overflow-hidden rounded-2xl ring-[6px] ring-white shadow-[0_30px_60px_-30px_rgba(0,0,0,.35)]"
            style={d(420)}
            aria-label="Casa e organização"
          >
            <ProductArt kind="lamp" tone="#FFE7D6" className="h-full w-full transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
          </Link>

          <Link
            to="/categoria/novidades"
            className="anim-rise absolute bottom-[8%] right-[2%] flex items-center gap-3 rounded-xl border border-line bg-white py-2.5 pl-2.5 pr-4 shadow-[0_20px_40px_-24px_rgba(0,0,0,.35)] transition-transform hover:-translate-y-0.5"
            style={d(560)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span className="text-[13px] leading-tight">
              <span className="block font-bold">Novidades</span>
              <span className="text-muted">Chegou agora</span>
            </span>
          </Link>
        </div>
      </div>
      <p className="container-x relative -mt-8 pb-6 text-right text-[11px] text-muted/70 lg:-mt-14">Imagens ilustrativas</p>
    </section>
  )
}
