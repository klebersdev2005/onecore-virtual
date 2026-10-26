import { useParams } from 'react-router-dom'
import { CatalogView } from '../../components/catalog/CatalogView'
import { CatalogHeader } from '../../components/catalog/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { breadcrumbLd, useSeo } from '../../lib/seo'
import { getCollection, getProductsByCollection } from '../../services/catalog'
import NotFoundPage from '../NotFound/NotFoundPage'

export default function CollectionPage() {
  const { slug = '' } = useParams()
  const coll = useAsync(() => getCollection(slug), [slug])
  const list = useAsync(() => getProductsByCollection(slug), [slug])
  const path = `/colecao/${slug}`

  useSeo({
    title: coll.data ? `Coleção ${coll.data.name}` : 'Coleção',
    description: coll.data?.description,
    path,
    jsonLd: coll.data ? breadcrumbLd([{ name: 'Início', path: '/' }, { name: coll.data.name, path }]) : undefined,
  })

  if (!coll.loading && !coll.data) return <NotFoundPage />
  return (
    <>
      <CatalogHeader
        crumbs={[{ name: 'Início', path: '/' }, { name: 'Coleções' }, { name: coll.data?.name ?? '…' }]}
        eyebrow="Coleção"
        title={coll.data?.name ?? ''}
        intro={coll.data?.description ?? ''}
        art={coll.data?.art}
        imageUrl={coll.data?.imageUrl}
      />
      <div className="container-x pb-16">
        <CatalogView products={list.data} loading={list.loading} />
      </div>
    </>
  )
}
