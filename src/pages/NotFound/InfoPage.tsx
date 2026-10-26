import { Mail, MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { useAsync } from '../../hooks/useAsync'
import { useSeo } from '../../lib/seo'
import { deliveryEstimate, getStoreSettings, type StoreSettings } from '../../services/store'
import NotFoundPage from './NotFoundPage'

/**
 * Páginas institucionais. Os textos são uma base alinhada ao CDC e à LGPD;
 * devem ser revisados por assessoria jurídica antes da abertura da loja.
 * Dados de contato e empresariais vêm de /admin/configuracoes.
 */
const PAGES: Record<string, { title: string; description: string; body: (s: StoreSettings) => ReactNode }> = {
  'entrega-e-rastreamento': {
    title: 'Entrega e rastreamento',
    description: 'Como funcionam os prazos, o envio e o acompanhamento do seu pedido.',
    body: (s) => (
      <>
        <p>O pedido é preparado depois da confirmação do pagamento. Quando o envio é realizado, registramos a transportadora e o código de rastreamento, que ficam disponíveis em <Link to="/conta/pedidos">Meus pedidos</Link>.</p>
        <h2>Prazo</h2>
        <p>{deliveryEstimate(s) ? `Prazo estimado: ${deliveryEstimate(s)}.` : 'O prazo estimado é informado no checkout e no acompanhamento do pedido.'} Prazos podem variar conforme a região e a transportadora.</p>
        <h2>Acompanhamento</h2>
        <p>A linha do tempo do pedido mostra apenas eventos confirmados: pagamento, preparação, envio e as movimentações informadas pela transportadora.</p>
      </>
    ),
  },
  'trocas-e-devolucoes': {
    title: 'Trocas, devoluções e reembolsos',
    description: 'Direito de arrependimento, produtos com defeito e prazos de reembolso.',
    body: () => (
      <>
        <h2>Direito de arrependimento</h2>
        <p>Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos a partir do recebimento, sem precisar justificar. O valor pago, incluindo o frete, é devolvido integralmente.</p>
        <h2>Produto com defeito</h2>
        <p>Produtos com vício podem ser reclamados em até 90 dias (bens duráveis) ou 30 dias (não duráveis) a partir do recebimento, conforme o art. 26 do CDC.</p>
        <h2>Como solicitar</h2>
        <p>Entre em contato pelos canais da página <Link to="/ajuda/contato">Contato</Link> informando o número do pedido. Enviaremos as instruções de devolução.</p>
        <h2>Reembolso</h2>
        <p>Pix: devolvido na conta de origem. Cartão: estornado na fatura, conforme o prazo da administradora.</p>
      </>
    ),
  },
  'politica-de-privacidade': {
    title: 'Política de privacidade',
    description: 'Como a OneCore Virtual trata seus dados pessoais, conforme a LGPD.',
    body: (s) => (
      <>
        <h2>Dados coletados</h2>
        <p>Nome, e-mail, telefone, CPF e endereço de entrega, fornecidos por você no cadastro e no checkout.</p>
        <h2>Finalidade</h2>
        <p>Processar pagamentos, emitir documentos fiscais, entregar pedidos e prestar atendimento (LGPD, art. 7º, V e II). Não vendemos seus dados.</p>
        <h2>Pagamentos</h2>
        <p>Dados de cartão são digitados em campos do provedor de pagamento (Mercado Pago). A loja não armazena número do cartão nem código de segurança.</p>
        <h2>Compartilhamento</h2>
        <p>Somente com provedor de pagamento, transportadoras e fornecedores, na medida necessária para concluir o pedido.</p>
        <h2>Seus direitos</h2>
        <p>Você pode solicitar acesso, correção ou exclusão dos seus dados{s.contact_email ? ` pelo e-mail ${s.contact_email}` : ' pelos canais de contato'}.</p>
      </>
    ),
  },
  'termos-de-compra': {
    title: 'Termos de compra',
    description: 'Condições para compras na OneCore Virtual.',
    body: () => (
      <>
        <h2>Pedidos e preços</h2>
        <p>Os preços exibidos são confirmados pelo nosso servidor no momento do pedido. O pedido só é considerado pago após a confirmação do provedor de pagamento.</p>
        <h2>Pagamento</h2>
        <p>Aceitamos Pix e cartão de crédito. O código Pix tem validade limitada; após o vencimento, o pedido pode ser cancelado automaticamente.</p>
        <h2>Disponibilidade</h2>
        <p>Caso um produto fique indisponível após o pagamento, entraremos em contato e o valor será devolvido integralmente, se você preferir.</p>
        <h2>Trocas e devoluções</h2>
        <p>Veja a página <Link to="/ajuda/trocas-e-devolucoes">Trocas, devoluções e reembolsos</Link>.</p>
      </>
    ),
  },
  contato: {
    title: 'Contato',
    description: 'Fale com o atendimento da OneCore Virtual.',
    body: (s) => (
      <>
        <p>Tem dúvidas sobre um produto ou pedido? Informe o número do pedido para agilizar o atendimento.</p>
        {s.contact_email || s.contact_whatsapp ? (
          <div className="not-prose mt-6 grid gap-3 sm:grid-cols-2">
            {s.contact_email && (
              <a href={`mailto:${s.contact_email}`} className="flex items-center gap-3 rounded-2xl border border-line p-5 hover:border-ink">
                <Mail className="h-5 w-5 text-brand" /> <span><span className="block text-[13px] text-muted">E-mail</span><span className="font-semibold">{s.contact_email}</span></span>
              </a>
            )}
            {s.contact_whatsapp && (
              <a href={`https://wa.me/55${s.contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-line p-5 hover:border-ink">
                <MessageCircle className="h-5 w-5 text-brand" /> <span><span className="block text-[13px] text-muted">WhatsApp</span><span className="font-semibold">{s.contact_whatsapp}</span></span>
              </a>
            )}
          </div>
        ) : (
          <p>Os canais de atendimento serão publicados aqui em breve.</p>
        )}
      </>
    ),
  },
}

export default function InfoPage() {
  const { slug = '' } = useParams()
  const page = PAGES[slug]
  const { data: s } = useAsync(getStoreSettings, [])
  useSeo({ title: page?.title ?? 'Página não encontrada', description: page?.description, path: `/ajuda/${slug}`, noindex: !page })
  if (!page) return <NotFoundPage />
  return (
    <div className="container-x max-w-3xl py-12">
      <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: page.title }]} />
      <h1 className="h-display mt-8 text-[38px] md:text-[48px]">{page.title}</h1>
      <div className="prose-info mt-8 text-[16px] leading-relaxed text-ink/85">{s && page.body(s)}</div>
    </div>
  )
}
