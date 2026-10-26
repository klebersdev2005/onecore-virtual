import { ButtonLink } from '../../components/ui/Button'
import { useSeo } from '../../lib/seo'

export default function NotFoundPage() {
  useSeo({ title: 'Página não encontrada', noindex: true })
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="text-[96px] font-extrabold leading-none tracking-[-0.06em] text-line">404</p>
      <h1 className="mt-4 text-[28px] font-extrabold tracking-tight">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-muted">O endereço pode ter mudado ou o produto não está mais disponível.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Voltar ao início</ButtonLink>
        <ButtonLink to="/busca" variant="secondary">Ver produtos</ButtonLink>
      </div>
    </div>
  )
}
