/**
 * Gera dist/sitemap.xml após o build.
 * Com VITE_SUPABASE_URL/ANON_KEY lê o catálogo real (apenas itens ativos, via RLS);
 * sem eles usa o catálogo de demonstração.
 * Páginas de busca, conta, carrinho e filtros ficam de fora (não indexáveis).
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

function loadEnv() {
  for (const f of ['.env.production', '.env']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  loadEnv()
  const site = (process.env.VITE_SITE_URL || 'http://localhost:5190').replace(/\/$/, '')
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  const entries: { loc: string; lastmod?: string }[] = [{ loc: '/' }]

  if (url && key) {
    const db = createClient(url, key)
    const [c, k, p] = await Promise.all([
      db.from('categories').select('slug').eq('is_active', true),
      db.from('collections').select('slug').eq('is_active', true),
      db.from('products').select('slug, updated_at').eq('is_active', true),
    ])
    c.data?.forEach((x) => entries.push({ loc: `/categoria/${x.slug}` }))
    k.data?.forEach((x) => entries.push({ loc: `/colecao/${x.slug}` }))
    p.data?.forEach((x) => entries.push({ loc: `/produto/${x.slug}`, lastmod: x.updated_at?.slice(0, 10) }))
  } else {
    const demo = await import('../src/data/demo-catalog')
    demo.categories.forEach((x) => entries.push({ loc: `/categoria/${x.slug}` }))
    demo.collections.forEach((x) => entries.push({ loc: `/colecao/${x.slug}` }))
    demo.products.forEach((x) => entries.push({ loc: `/produto/${x.slug}` }))
  }
  for (const s of ['entrega-e-rastreamento', 'trocas-e-devolucoes', 'politica-de-privacidade', 'termos-de-compra', 'contato'])
    entries.push({ loc: `/ajuda/${s}` })

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map((e) => `  <url><loc>${site}${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>\n'
  writeFileSync('dist/sitemap.xml', xml)

  const robots = readFileSync('dist/robots.txt', 'utf8').replace(/^Sitemap: .*$/m, `Sitemap: ${site}/sitemap.xml`)
  writeFileSync('dist/robots.txt', robots)
  console.log(`sitemap.xml: ${entries.length} URLs`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
