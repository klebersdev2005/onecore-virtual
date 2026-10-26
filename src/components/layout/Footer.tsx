import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { getCategories } from '../../services/catalog'
import { getStoreSettings } from '../../services/store'
import { Logo } from '../ui/Logo'

const help = [
  { to: '/ajuda/entrega-e-rastreamento', label: 'Entrega e rastreamento' },
  { to: '/ajuda/trocas-e-devolucoes', label: 'Trocas, devoluções e reembolsos' },
  { to: '/ajuda/contato', label: 'Contato' },
]
const legal = [
  { to: '/ajuda/politica-de-privacidade', label: 'Política de privacidade' },
  { to: '/ajuda/termos-de-compra', label: 'Termos de compra' },
]

export function Footer() {
  const { data: cats } = useAsync(getCategories, [])
  const { data: s } = useAsync(getStoreSettings, [])
  const company = s && [s.company_name, s.cnpj && `CNPJ ${s.cnpj}`, s.company_address].filter(Boolean).join(' · ')
  const col = 'text-[14px] text-white/60 hover:text-white transition-colors'
  return (
    <footer className="mt-24 bg-ink text-white">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo invert />
          <p className="mt-5 text-[14px] leading-relaxed text-white/60">
            Loja virtual de produtos selecionados para casa, carro, tecnologia e rotina — com informação clara e compra segura.
          </p>
        </div>
        <FooterCol title="Categorias">
          {cats?.map((c) => (
            <Link key={c.slug} to={`/categoria/${c.slug}`} className={col}>{c.name}</Link>
          ))}
        </FooterCol>
        <FooterCol title="Sua conta">
          <Link to="/conta" className={col}>Minha conta</Link>
          <Link to="/conta/pedidos" className={col}>Meus pedidos</Link>
          {help.map((l) => <Link key={l.to} to={l.to} className={col}>{l.label}</Link>)}
        </FooterCol>
        <FooterCol title="Institucional">
          {legal.map((l) => <Link key={l.to} to={l.to} className={col}>{l.label}</Link>)}
        </FooterCol>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-[12px] text-white/45 md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} OneCore Virtual. Todos os direitos reservados.</span>
          {company && <span>{company}</span>}
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-[12px] font-bold uppercase tracking-[0.16em] text-white/40">{title}</h3>
      <nav className="flex flex-col gap-3">{children}</nav>
    </div>
  )
}
