import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Spinner } from '../../components/auth/Guards'
import { Breadcrumbs } from '../../components/ui/Breadcrumbs'
import { Button } from '../../components/ui/Button'
import { Alert, Input, Select, Textarea } from '../../components/ui/Field'
import { cx } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { invalidateCatalog } from '../../services/catalog'
import { toCents } from './AdminSettings'
import { AdminHeader, Card } from './AdminLayout'

interface Variant { id?: string; name: string; value: string; delta: string }
interface Img { id?: string; url: string; storage_path: string | null; alt: string; width: number; height: number }
interface Opt { id: string; name: string }

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)
const reais = (c: number | null | undefined) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','))

const blank = {
  name: '', slug: '', category_id: '', short_description: '', overview: '', features: '', specs: '',
  dimensions: '', materials: '', package_contents: '', compatibility: '', usage: '', care: '',
  price: '', compare_at: '', availability: 'available', is_active: true, is_new: false, tags: '', seo_title: '', seo_description: '',
}

export default function AdminProductEdit() {
  const { id } = useParams()
  const isNew = id === 'novo'
  const nav = useNavigate()
  const [f, setF] = useState(blank)
  const [variants, setVariants] = useState<Variant[]>([])
  const [images, setImages] = useState<Img[]>([])
  const [cats, setCats] = useState<Opt[]>([])
  const [colls, setColls] = useState<Opt[]>([])
  const [selColls, setSelColls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    ;(async () => {
      const [c, k] = await Promise.all([
        supabase!.from('categories').select('id, name').order('sort'),
        supabase!.from('collections').select('id, name').order('sort'),
      ])
      setCats((c.data as Opt[]) ?? [])
      setColls((k.data as Opt[]) ?? [])
      if (!isNew) {
        const { data: p } = await supabase!.from('products').select('*, product_variants(*), product_images(*), product_collections(collection_id)').eq('id', id).single()
        if (p) {
          setF({
            name: p.name, slug: p.slug, category_id: p.category_id ?? '', short_description: p.short_description, overview: p.overview,
            features: (p.features ?? []).join('\n'),
            specs: Object.entries(p.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n'),
            dimensions: p.dimensions ?? '', materials: p.materials ?? '', package_contents: (p.package_contents ?? []).join('\n'),
            compatibility: p.compatibility ?? '', usage: p.usage ?? '', care: p.care ?? '',
            price: reais(p.price_cents), compare_at: reais(p.compare_at_price_cents), availability: p.availability,
            is_active: p.is_active, is_new: p.is_new, tags: (p.tags ?? []).join(', '), seo_title: p.seo_title ?? '', seo_description: p.seo_description ?? '',
          })
          setVariants(
            [...p.product_variants].sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
              .map((v: { id: string; name: string; value: string; price_delta_cents: number }) => ({ id: v.id, name: v.name, value: v.value, delta: reais(v.price_delta_cents || null) })),
          )
          setImages([...p.product_images].sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort))
          setSelColls(p.product_collections.map((x: { collection_id: string }) => x.collection_id))
        }
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
        setError(`${file.name}: envie imagens de até 5 MB.`)
        continue
      }
      const dims = await new Promise<{ w: number; h: number }>((r) => {
        const im = new Image()
        im.onload = () => r({ w: im.naturalWidth, h: im.naturalHeight })
        im.onerror = () => r({ w: 1200, h: 1200 })
        im.src = URL.createObjectURL(file)
      })
      const path = `${slugify(f.slug || f.name || 'produto')}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
      const { error } = await supabase!.storage.from('product-images').upload(path, file, { cacheControl: '31536000', contentType: file.type })
      if (error) {
        setError(`Falha no upload: ${error.message}`)
        continue
      }
      const url = supabase!.storage.from('product-images').getPublicUrl(path).data.publicUrl
      setImages((im) => [...im, { url, storage_path: path, alt: f.name, width: dims.w, height: dims.h }])
    }
    setUploading(false)
  }

  const move = (i: number, d: number) =>
    setImages((im) => {
      const n = [...im]
      const j = i + d
      if (j < 0 || j >= n.length) return n
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    const price = toCents(f.price)
    const compare = toCents(f.compare_at)
    if (!price || Number.isNaN(price) || price <= 0) return setError('Informe um preço válido.')
    if (Number.isNaN(compare) || (compare != null && compare <= price)) return setError('Preço anterior deve ser maior que o atual — e só deve ser usado com comparação real e verificável.')
    const slug = slugify(f.slug || f.name)
    if (!slug) return setError('Informe o nome.')
    const specs: Record<string, string> = {}
    for (const l of lines(f.specs)) {
      const i = l.indexOf(':')
      if (i > 0) specs[l.slice(0, i).trim()] = l.slice(i + 1).trim()
    }
    const row = {
      name: f.name.trim(), slug, category_id: f.category_id || null, short_description: f.short_description.trim(), overview: f.overview.trim(),
      features: lines(f.features), specs, dimensions: f.dimensions.trim() || null, materials: f.materials.trim() || null,
      package_contents: lines(f.package_contents), compatibility: f.compatibility.trim() || null, usage: f.usage.trim() || null, care: f.care.trim() || null,
      price_cents: price, compare_at_price_cents: compare, availability: f.availability, is_active: f.is_active, is_new: f.is_new,
      tags: f.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      seo_title: f.seo_title.trim() || null, seo_description: f.seo_description.trim() || null,
    }
    setBusy(true)
    const db = supabase!
    const res = isNew ? await db.from('products').insert(row).select('id').single() : await db.from('products').update(row).eq('id', id).select('id').single()
    if (res.error) {
      setBusy(false)
      return setError(res.error.message.includes('duplicate') ? 'Já existe um produto com este endereço (slug).' : res.error.message)
    }
    const pid = res.data.id as string

    // Substitui variações, imagens e coleções pelo estado do formulário
    const vRows = variants.filter((v) => v.name.trim() && v.value.trim()).map((v, i) => ({
      product_id: pid, name: v.name.trim(), value: v.value.trim(), price_delta_cents: toCents(v.delta) || 0, sort: i,
    }))
    const steps = await Promise.all([
      db.from('product_variants').delete().eq('product_id', pid),
      db.from('product_images').delete().eq('product_id', pid),
      db.from('product_collections').delete().eq('product_id', pid),
    ])
    const steps2 = await Promise.all([
      vRows.length ? db.from('product_variants').insert(vRows) : Promise.resolve({ error: null }),
      images.length
        ? db.from('product_images').insert(images.map((im, i) => ({ product_id: pid, url: im.url, storage_path: im.storage_path, alt: im.alt || f.name, width: im.width, height: im.height, sort: i })))
        : Promise.resolve({ error: null }),
      selColls.length ? db.from('product_collections').insert(selColls.map((c) => ({ product_id: pid, collection_id: c }))) : Promise.resolve({ error: null }),
    ])
    setBusy(false)
    const err = [...steps, ...steps2].find((s) => s.error)?.error
    if (err) return setError(`Produto salvo, mas houve erro em variações/imagens: ${err.message}`)
    invalidateCatalog()
    setSaved(true)
    if (isNew) nav(`/admin/produtos/${pid}`, { replace: true })
  }

  if (loading) return <Spinner />

  return (
    <form onSubmit={save}>
      <Breadcrumbs items={[{ name: 'Produtos', path: '/admin/produtos' }, { name: isNew ? 'Novo' : f.name }]} />
      <div className="mt-4">
        <AdminHeader
          title={isNew ? 'Novo produto' : f.name}
          actions={
            <>
              {!isNew && f.is_active && <a href={`/produto/${f.slug}`} target="_blank" rel="noreferrer" className="flex h-9 items-center rounded-[10px] border border-line bg-white px-3.5 text-[13px] font-semibold">Ver na loja</a>}
              <Button type="submit" size="sm" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</Button>
            </>
          }
        />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {saved && <div className="mb-4"><Alert tone="success">Produto salvo.</Alert></div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input className="sm:col-span-2" label="Nome" required value={f.name} onChange={set('name')} />
              <Input label="Endereço (slug)" value={f.slug} onChange={set('slug')} placeholder={slugify(f.name)} hint={`/produto/${slugify(f.slug || f.name) || '…'}`} />
              <Select label="Categoria" value={f.category_id} onChange={set('category_id')}>
                <option value="">Sem categoria</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input className="sm:col-span-2" label="Descrição curta" value={f.short_description} onChange={set('short_description')} maxLength={160} />
              <Textarea className="sm:col-span-2" label="Visão geral" value={f.overview} onChange={set('overview')} />
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Imagens</h2>
            <p className="mt-1 text-[13px] text-muted">Use apenas fotos do próprio produto. A primeira é a imagem principal. Até 5 MB cada.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((im, i) => (
                <div key={im.url} className="group relative">
                  <img src={im.url} alt={im.alt} className="aspect-square w-full rounded-xl border border-line object-cover" />
                  <div className="absolute right-1.5 top-1.5 flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="grid h-7 w-7 place-items-center rounded-md bg-white/90" aria-label="Mover para a esquerda"><ArrowUp className="h-3.5 w-3.5 -rotate-90" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="grid h-7 w-7 place-items-center rounded-md bg-white/90" aria-label="Mover para a direita"><ArrowDown className="h-3.5 w-3.5 -rotate-90" /></button>
                    <button type="button" onClick={() => setImages((x) => x.filter((_, k) => k !== i))} className="grid h-7 w-7 place-items-center rounded-md bg-white/90" aria-label="Remover"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <input value={im.alt} onChange={(e) => setImages((x) => x.map((y, k) => (k === i ? { ...y, alt: e.target.value } : y)))} placeholder="Texto alternativo" className="mt-1.5 h-9 w-full rounded-lg border border-line px-2 text-[12px] outline-none focus:border-ink" />
                </div>
              ))}
              <label className={cx('grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-[13px] text-muted hover:border-ink', uploading && 'pointer-events-none opacity-60')}>
                <span><ImagePlus className="mx-auto mb-1 h-6 w-6" />{uploading ? 'Enviando…' : 'Adicionar'}</span>
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Variações</h2>
            <p className="mt-1 text-[13px] text-muted">Cada linha é uma opção (ex.: Cor = Preto). Acréscimo é somado ao preço base.</p>
            <div className="mt-4 space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_110px_40px] gap-2">
                  <input value={v.name} onChange={(e) => setVariants((x) => x.map((y, k) => (k === i ? { ...y, name: e.target.value } : y)))} placeholder="Grupo (Cor)" className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink" />
                  <input value={v.value} onChange={(e) => setVariants((x) => x.map((y, k) => (k === i ? { ...y, value: e.target.value } : y)))} placeholder="Opção (Preto)" className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink" />
                  <input value={v.delta} onChange={(e) => setVariants((x) => x.map((y, k) => (k === i ? { ...y, delta: e.target.value } : y)))} placeholder="+ R$ 0,00" inputMode="decimal" className="h-10 rounded-lg border border-line px-3 text-sm outline-none focus:border-ink" />
                  <button type="button" onClick={() => setVariants((x) => x.filter((_, k) => k !== i))} className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-soft" aria-label="Remover variação"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => setVariants((x) => [...x, { name: x[x.length - 1]?.name ?? '', value: '', delta: '' }])}><Plus className="h-4 w-4" /> Adicionar opção</Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Detalhes</h2>
            <p className="mt-1 text-[13px] text-muted">Preencha apenas informações confirmadas. Campos vazios não aparecem na loja.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Textarea label="Principais características (uma por linha)" value={f.features} onChange={set('features')} />
              <Textarea label="Especificações (Nome: valor, uma por linha)" value={f.specs} onChange={set('specs')} placeholder={'Capacidade: 450 ml\nMaterial: Aço inox'} />
              <Input label="Dimensões" value={f.dimensions} onChange={set('dimensions')} />
              <Input label="Materiais" value={f.materials} onChange={set('materials')} />
              <Textarea label="Conteúdo da embalagem (um por linha)" value={f.package_contents} onChange={set('package_contents')} />
              <Textarea label="Compatibilidade" value={f.compatibility} onChange={set('compatibility')} />
              <Textarea label="Instruções de uso" value={f.usage} onChange={set('usage')} />
              <Textarea label="Cuidados e limitações" value={f.care} onChange={set('care')} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Preço e disponibilidade</h2>
            <div className="mt-4 space-y-4">
              <Input label="Preço (R$)" required inputMode="decimal" value={f.price} onChange={set('price')} />
              <Input label="Preço anterior (R$)" inputMode="decimal" value={f.compare_at} onChange={set('compare_at')} hint="Somente com comparação legítima e verificável." />
              <Select label="Disponibilidade" value={f.availability} onChange={set('availability')}>
                <option value="available">Disponível</option>
                <option value="to_confirm">A confirmar</option>
                <option value="unavailable">Indisponível</option>
              </Select>
              <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={f.is_active} onChange={set('is_active')} className="h-4 w-4 accent-[#FF6A00]" /> Ativo (visível na loja)</label>
              <label className="flex items-center gap-3 text-[14px]"><input type="checkbox" checked={f.is_new} onChange={set('is_new')} className="h-4 w-4 accent-[#FF6A00]" /> Marcar como novidade</label>
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Coleções</h2>
            <div className="mt-3 space-y-2">
              {colls.map((c) => (
                <label key={c.id} className="flex items-center gap-3 text-[14px]">
                  <input type="checkbox" checked={selColls.includes(c.id)} onChange={(e) => setSelColls((x) => (e.target.checked ? [...x, c.id] : x.filter((y) => y !== c.id)))} className="h-4 w-4 accent-[#FF6A00]" />
                  {c.name}
                </label>
              ))}
              {!colls.length && <p className="text-[13px] text-muted">Nenhuma coleção criada.</p>}
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Busca e SEO</h2>
            <div className="mt-4 space-y-4">
              <Input label="Termos de busca" value={f.tags} onChange={set('tags')} hint="Separados por vírgula." />
              <Input label="Título SEO" value={f.seo_title} onChange={set('seo_title')} maxLength={70} hint={`${f.seo_title.length}/70`} />
              <Textarea label="Meta description" value={f.seo_description} onChange={set('seo_description')} maxLength={160} hint={`${f.seo_description.length}/160`} />
            </div>
          </Card>
        </div>
      </div>
    </form>
  )
}
