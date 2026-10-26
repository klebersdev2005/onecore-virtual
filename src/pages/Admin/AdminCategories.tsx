import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Spinner } from '../../components/auth/Guards'
import { Button } from '../../components/ui/Button'
import { Alert, Input, Textarea } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import { cx } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { invalidateCatalog } from '../../services/catalog'
import { slugify } from './AdminProductEdit'
import { AdminHeader, Card } from './AdminLayout'

type Table = 'categories' | 'collections'
interface Row {
  id: string
  slug: string
  name: string
  description: string
  intro?: string
  image_url: string | null
  sort: number
  is_active: boolean
  seo_title: string | null
  seo_description: string | null
}

export default function AdminCategories() {
  return (
    <>
      <AdminHeader title="Categorias e coleções" description="Cada uma tem página própria na loja (/categoria/… e /colecao/…)." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Manager table="categories" title="Categorias" />
        <Manager table="collections" title="Coleções" />
      </div>
    </>
  )
}

const empty = { name: '', slug: '', description: '', intro: '', image_url: '', sort: '0', is_active: true, seo_title: '', seo_description: '' }

function Manager({ table, title }: { table: Table; title: string }) {
  const [tick, setTick] = useState(0)
  const { data, loading } = useAsync(async () => {
    const { data } = await supabase!.from(table).select('*').order('sort')
    return (data as Row[]) ?? []
  }, [tick])
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [f, setF] = useState(empty)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const open = (r: Row | 'new') => {
    setEditing(r)
    setError('')
    setF(
      r === 'new'
        ? { ...empty, sort: String(data?.length ?? 0) }
        : { name: r.name, slug: r.slug, description: r.description, intro: r.intro ?? '', image_url: r.image_url ?? '', sort: String(r.sort), is_active: r.is_active, seo_title: r.seo_title ?? '', seo_description: r.seo_description ?? '' },
    )
  }

  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    const path = `${table}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const { error } = await supabase!.storage.from('product-images').upload(path, file, { contentType: file.type })
    setUploading(false)
    if (error) return setError(error.message)
    setF((x) => ({ ...x, image_url: supabase!.storage.from('product-images').getPublicUrl(path).data.publicUrl }))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const row: Record<string, unknown> = {
      name: f.name.trim(),
      slug: slugify(f.slug || f.name),
      description: f.description.trim(),
      image_url: f.image_url || null,
      sort: Number(f.sort) || 0,
      is_active: f.is_active,
      seo_title: f.seo_title.trim() || null,
      seo_description: f.seo_description.trim() || null,
    }
    if (table === 'categories') row.intro = f.intro.trim()
    const { error } = editing === 'new' ? await supabase!.from(table).insert(row) : await supabase!.from(table).update(row).eq('id', (editing as Row).id)
    if (error) return setError(error.message.includes('duplicate') ? 'Já existe um item com este endereço (slug).' : error.message)
    invalidateCatalog()
    setEditing(null)
    setTick((t) => t + 1)
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {!editing && <Button size="sm" variant="secondary" onClick={() => open('new')}><Plus className="h-4 w-4" /> Nova</Button>}
      </div>
      {editing ? (
        <form onSubmit={save} className="mt-5 space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <Input label="Slug" value={f.slug} placeholder={slugify(f.name)} onChange={(e) => setF({ ...f, slug: e.target.value })} />
          </div>
          <Input label="Descrição curta" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          {table === 'categories' && <Textarea label="Texto da página (conteúdo útil para o cliente)" value={f.intro} onChange={(e) => setF({ ...f, intro: e.target.value })} />}
          <div className="flex items-center gap-4">
            {f.image_url && <img src={f.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <label className="cursor-pointer text-[13px] font-semibold text-brand-dark">
              {uploading ? 'Enviando…' : f.image_url ? 'Trocar imagem' : 'Enviar imagem'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            {f.image_url && <button type="button" className="text-[13px] text-muted" onClick={() => setF({ ...f, image_url: '' })}>Remover</button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Ordem" type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} />
            <label className="flex items-center gap-3 self-end pb-3 text-[14px]"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="h-4 w-4 accent-[#FF6A00]" /> Ativa</label>
            <Input label="Título SEO" value={f.seo_title} onChange={(e) => setF({ ...f, seo_title: e.target.value })} />
            <Input label="Meta description" value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Salvar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
          </div>
        </form>
      ) : loading ? (
        <Spinner />
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {data?.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className={cx('block font-semibold', !r.is_active && 'text-muted line-through')}>{r.name}</span>
                <span className="block truncate text-[13px] text-muted">/{table === 'categories' ? 'categoria' : 'colecao'}/{r.slug}</span>
              </span>
              <button onClick={() => open(r)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-soft" aria-label={`Editar ${r.name}`}><Pencil className="h-4 w-4" /></button>
            </li>
          ))}
          {!data?.length && <li className="py-6 text-center text-[14px] text-muted">Nenhum item.</li>}
        </ul>
      )}
    </Card>
  )
}
