/**
 * Testes das migrations em Postgres real (PGlite), simulando os papéis do Supabase.
 * Verificam RLS, integridade de status e regras de avaliação.
 */
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const ANA = '00000000-0000-0000-0000-0000000000a1'
const BIA = '00000000-0000-0000-0000-0000000000b1'

let db: PGlite

const supabaseStub = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
`
const grants = `
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to anon, authenticated, service_role;
  grant all on all sequences in schema public to anon, authenticated, service_role;
`

/** Executa como um usuário (ou anon / service_role). */
async function as<T = Record<string, unknown>>(who: string | null, sql: string, params: unknown[] = []) {
  const role = who === 'service' ? 'service_role' : who ? 'authenticated' : 'anon'
  const sub = who && who !== 'service' ? who : ''
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec('reset role;')
  }
}

async function newOrder(user: string) {
  const [o] = await as<{ id: string }>('service', `
    insert into orders (user_id, customer_name, email, shipping_address, subtotal_cents, shipping_cents, total_cents, payment_method, accepted_terms_at)
    values ($1, 'Cliente', 'c@x.com', '{}', 1000, 0, 1000, 'pix', now()) returning id`, [user])
  const [p] = await as<{ id: string }>('service', `select id from products where slug = 'ativo'`)
  const [it] = await as<{ id: string }>('service', `
    insert into order_items (order_id, product_id, product_slug, product_name, unit_price_cents, quantity)
    values ($1, $2, 'p', 'P', 1000, 1) returning id`, [o.id, p.id])
  return { order: o.id, item: it.id, product: p.id }
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(supabaseStub)
  for (const f of readdirSync('supabase/migrations').sort()) await db.exec(readFileSync(join('supabase/migrations', f), 'utf8'))
  await db.exec(readFileSync('supabase/seed.sql', 'utf8'))
  await db.exec(grants)
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin@x.com'), ('${ANA}', 'ana@x.com'), ('${BIA}', 'bia@x.com');
    update profiles set role = 'admin' where id = '${ADMIN}';
    insert into categories (slug, name) values ('casa', 'Casa');
    insert into products (slug, name, price_cents, category_id) select 'ativo', 'Ativo', 1000, id from categories where slug = 'casa';
    insert into products (slug, name, price_cents, is_active) values ('inativo', 'Inativo', 1000, false);
  `)
})

describe('catálogo', () => {
  it('visitante vê só produtos ativos', async () => {
    const rows = await as(null, 'select slug from products')
    expect(rows.map((r) => r.slug)).toEqual(['ativo'])
  })
  it('cliente não altera produtos', async () => {
    await as(ANA, `update products set price_cents = 1 where slug = 'ativo'`)
    const [p] = await as('service', `select price_cents from products where slug = 'ativo'`)
    expect(p.price_cents).toBe(1000)
  })
  it('admin altera produtos', async () => {
    await as(ADMIN, `update products set price_cents = 1200 where slug = 'ativo'`)
    const [p] = await as('service', `select price_cents from products where slug = 'ativo'`)
    expect(p.price_cents).toBe(1200)
  })
  it('preço anterior precisa ser maior que o atual', async () => {
    await expect(as(ADMIN, `update products set compare_at_price_cents = 500 where slug = 'ativo'`)).rejects.toThrow()
  })
})

describe('seed', () => {
  it('cria as categorias iniciais visíveis ao público', async () => {
    const rows = await as(null, `select slug from categories where slug <> 'casa' order by sort`)
    expect(rows.map((r) => r.slug)).toEqual(['acessorios-automotivos', 'casa-e-organizacao', 'tecnologia-e-acessorios', 'dia-a-dia', 'novidades'])
  })
  it('frete começa sem configuração (checkout bloqueado até o admin definir)', async () => {
    const [s] = await as(null, 'select shipping_flat_cents from store_settings')
    expect(s.shipping_flat_cents).toBeNull()
  })
  it('cliente não altera configurações da loja', async () => {
    await as(ANA, 'update store_settings set shipping_flat_cents = 0')
    const [s] = await as('service', 'select shipping_flat_cents from store_settings')
    expect(s.shipping_flat_cents).toBeNull()
  })
})

describe('perfis', () => {
  it('cadastro cria perfil de cliente', async () => {
    const [p] = await as(ANA, 'select role from profiles where id = auth.uid()')
    expect(p.role).toBe('customer')
  })
  it('cliente não se promove a admin', async () => {
    await expect(as(ANA, `update profiles set role = 'admin' where id = auth.uid()`)).rejects.toThrow(/administradores/)
  })
  it('cliente não lê perfil de outro', async () => {
    expect(await as(ANA, `select * from profiles where id = '${BIA}'`)).toHaveLength(0)
  })
})

describe('pedidos', () => {
  it('cliente não cria pedido direto (só o backend)', async () => {
    await expect(
      as(ANA, `insert into orders (user_id, customer_name, email, shipping_address, subtotal_cents, shipping_cents, total_cents, payment_method, accepted_terms_at)
               values (auth.uid(), 'x', 'x', '{}', 1, 0, 1, 'pix', now())`),
    ).rejects.toThrow(/row-level security/)
  })
  it('total precisa bater com subtotal + frete', async () => {
    await expect(
      as('service', `insert into orders (user_id, customer_name, email, shipping_address, subtotal_cents, shipping_cents, total_cents, payment_method, accepted_terms_at)
                     values ('${ANA}', 'x', 'x', '{}', 1000, 500, 1, 'pix', now())`),
    ).rejects.toThrow()
  })
  it('cliente vê só os próprios pedidos', async () => {
    await newOrder(ANA)
    await newOrder(BIA)
    const ana = await as(ANA, 'select user_id from orders')
    expect(ana.length).toBeGreaterThan(0)
    expect(ana.every((o) => o.user_id === ANA)).toBe(true)
  })
  it('cliente não altera status do próprio pedido', async () => {
    const { order } = await newOrder(ANA)
    await as(ANA, `update orders set status = 'canceled' where id = $1`, [order])
    const [o] = await as('service', 'select status from orders where id = $1', [order])
    expect(o.status).toBe('pending_payment')
  })
  it('não marca como pago sem pagamento aprovado', async () => {
    const { order } = await newOrder(ANA)
    await expect(as(ADMIN, `update orders set status = 'paid' where id = $1`, [order])).rejects.toThrow(/pagamento aprovado/)
  })
  it('não marca como enviado sem envio registrado', async () => {
    const { order } = await newOrder(ANA)
    await as('service', `insert into payments (order_id, method, status, amount_cents) values ($1, 'pix', 'approved', 1000)`, [order])
    await as(ADMIN, `update orders set status = 'paid' where id = $1`, [order])
    await expect(as(ADMIN, `update orders set status = 'shipped' where id = $1`, [order])).rejects.toThrow(/Registre o envio/)
  })
  it('registra linha do tempo real e custos ficam ocultos ao cliente', async () => {
    const { order } = await newOrder(ANA)
    await as('service', `insert into payments (order_id, method, status, amount_cents) values ($1, 'pix', 'approved', 1000)`, [order])
    await as(ADMIN, `update orders set status = 'paid' where id = $1`, [order])
    await as(ADMIN, `insert into supplier_orders (order_id, supplier_name, cost_cents) values ($1, 'Fornecedor', 400)`, [order])
    const hist = await as(ANA, 'select to_status from order_status_history where order_id = $1 order by created_at', [order])
    expect(hist.map((h) => h.to_status)).toEqual(['pending_payment', 'paid'])
    expect(await as(ANA, 'select * from supplier_orders')).toHaveLength(0)
    expect(await as(BIA, 'select * from order_status_history where order_id = $1', [order])).toHaveLength(0)
  })
})

describe('avaliações', () => {
  async function delivered(user: string) {
    const o = await newOrder(user)
    await as('service', `insert into payments (order_id, method, status, amount_cents) values ($1, 'pix', 'approved', 1000)`, [o.order])
    await as('service', `insert into shipments (order_id, carrier, tracking_code, shipped_at) values ($1, 'Correios', 'BR1', now())`, [o.order])
    await as('service', `update orders set status = 'paid' where id = $1`, [o.order])
    await as('service', `update orders set status = 'shipped' where id = $1`, [o.order])
    await as('service', `update orders set status = 'delivered' where id = $1`, [o.order])
    return o
  }
  const insert = (who: string, user: string, o: { item: string; product: string }) =>
    as(who, `insert into reviews (product_id, user_id, order_item_id, author_name, rating, body)
             values ($1, $2, $3, 'Nome', 5, 'Produto excelente, recomendo.') returning verified_purchase, status`, [o.product, user, o.item])

  it('não avalia pedido não entregue', async () => {
    const o = await newOrder(ANA)
    await expect(insert(ANA, ANA, o)).rejects.toThrow(/entregues/)
  })
  it('admin não cria avaliação em nome do cliente', async () => {
    const o = await delivered(ANA)
    await expect(insert(ADMIN, ANA, o)).rejects.toThrow(/row-level security/)
  })
  it('comprador avalia; fica pendente e verificada; publicação atualiza a nota', async () => {
    const o = await delivered(ANA)
    const [r] = await insert(ANA, ANA, o)
    expect(r).toEqual({ verified_purchase: true, status: 'pending' })
    expect(await as(null, `select * from reviews where status = 'pending'`)).toHaveLength(0)
    await as(ADMIN, `update reviews set status = 'published' where order_item_id = $1`, [o.item])
    const [p] = await as(null, 'select rating_avg, rating_count from products where id = $1', [o.product])
    expect(p.rating_count).toBe(1)
    expect(Number(p.rating_avg)).toBe(5)
  })
  it('moderação não reescreve o conteúdo', async () => {
    const o = await delivered(BIA)
    await insert(BIA, BIA, o)
    await expect(as(ADMIN, `update reviews set rating = 1 where order_item_id = $1`, [o.item])).rejects.toThrow(/não pode ser alterado/)
  })
})
