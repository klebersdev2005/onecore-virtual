import { useEffect } from 'react'

export const SITE_NAME = 'OneCore Virtual'
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string) || window.location.origin).replace(/\/$/, '')

interface Seo {
  title: string
  description?: string
  path?: string
  image?: string
  noindex?: boolean
  jsonLd?: object | object[]
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

/** Title, description, canonical (sem query string de filtros), Open Graph e JSON-LD por página. */
export function useSeo({ title, description, path, image, noindex, jsonLd }: Seo) {
  const ld = JSON.stringify(jsonLd ?? null)
  useEffect(() => {
    const full = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`
    document.title = full
    const canonical = SITE_URL + (path ?? window.location.pathname)
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
    }
    setMeta('property', 'og:title', full)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:site_name', SITE_NAME)
    if (image) setMeta('property', 'og:image', image)
    setMeta('name', 'robots', noindex ? 'noindex,follow' : 'index,follow')

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonical

    document.getElementById('ld-json')?.remove()
    if (ld !== 'null') {
      const s = document.createElement('script')
      s.type = 'application/ld+json'
      s.id = 'ld-json'
      s.textContent = ld
      document.head.appendChild(s)
    }
  }, [title, description, path, image, noindex, ld])
}

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE_URL + it.path })),
})
