import { useSearchParams } from 'react-router-dom'
import { CatalogView } from '../../components/catalog/CatalogView'
import { CatalogHeader } from '../../components/catalog/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { useSeo } from '../../lib/seo'
import { searchProducts } from '../../services/catalog'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const res = useAsync(() => searchProducts(q), [q])
  useSeo({ title: q ? `Busca: ${q}` : 'Todos os produtos', path: '/busca', noindex: true })
  return (
    <>
      <CatalogHeader
        crumbs={[{ name: 'Início', path: '/' }, { name: q ? 'Busca' : 'Todos os produtos' }]}
        eyebrow={q ? 'Resultados da busca' : 'Catálogo'}
        title={q ? `“${q}”` : 'Todos os produtos'}
        intro={q ? 'Produtos encontrados pelo nome, descrição e termos relacionados.' : 'O catálogo completo da OneCore Virtual.'}
      />
      <div className="container-x pb-16">
        <CatalogView products={res.data} loading={res.loading} searchable={!q} />
      </div>
    </>
  )
}
