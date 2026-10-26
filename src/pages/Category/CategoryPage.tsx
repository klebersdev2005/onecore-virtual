import { useParams } from 'react-router-dom'
import { CatalogView } from '../../components/catalog/CatalogView'
import { CatalogHeader } from '../../components/catalog/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { breadcrumbLd, useSeo } from '../../lib/seo'
import { getCategory, getProductsByCategory } from '../../services/catalog'
import NotFoundPage from '../NotFound/NotFoundPage'

export default function CategoryPage() {
  const { slug = '' } = useParams()
  const cat = useAsync(() => getCategory(slug), [slug])
  const list = useAsync(() => getProductsByCategory(slug), [slug])
  const path = `/categoria/${slug}`

  useSeo({
    title: cat.data?.name ?? 'Categoria',
    description: cat.data?.intro,
    path,
    jsonLd: cat.data ? breadcrumbLd([{ name: 'Início', path: '/' }, { name: cat.data.name, path }]) : undefined,
  })

  if (!cat.loading && !cat.data) return <NotFoundPage />
  return (
    <>
      <CatalogHeader
        crumbs={[{ name: 'Início', path: '/' }, { name: cat.data?.name ?? '…' }]}
        eyebrow="Categoria"
        title={cat.data?.name ?? ''}
        intro={cat.data?.intro ?? ''}
        art={cat.data?.art}
        imageUrl={cat.data?.imageUrl}
      />
      <div className="container-x pb-16">
        <CatalogView products={list.data} loading={list.loading} />
      </div>
    </>
  )
}
