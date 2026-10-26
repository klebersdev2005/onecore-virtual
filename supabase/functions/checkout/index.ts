/**
 * POST /functions/v1/checkout
 * Cria o pedido com preços recalculados no servidor e inicia o pagamento no
 * Mercado Pago (Pix ou cartão tokenizado no navegador — o número do cartão
 * nunca passa por aqui). Com `orderId`, gera nova tentativa de pagamento.
 */
// deno-lint-ignore-file no-explicit-any
import { adminClient, cors, getUser, json } from '../_shared/http.ts'
import { applyProviderPayment, mapStatus, mpFetch } from '../_shared/mercadopago.ts'
import { MAX_QTY, computeTotals, isValidCpf, onlyDigits, unitPrice } from '../_shared/pricing.ts'

interface Body {
  orderId?: string
  items?: { slug: string; variant: Record<string, string>; quantity: number }[]
  customer?: { name: string; email: string; phone?: string; cpf: string }
  address?: { cep: string; street: string; number: string; complement?: string; district: string; city: string; state: string; recipient?: string }
  method: 'pix' | 'card'
  acceptedTerms?: boolean
  card?: { token: string; installments: number; paymentMethodId: string; issuerId?: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  if (!Deno.env.get('MP_ACCESS_TOKEN')) return json({ error: 'Pagamentos ainda não configurados nesta loja.' }, 503)

  const user = await getUser(req)
  if (!user) return json({ error: 'Faça login para finalizar a compra.' }, 401)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Requisição inválida' }, 400)
  }
  if (body.method !== 'pix' && body.method !== 'card') return json({ error: 'Forma de pagamento inválida' }, 400)
  if (body.method === 'card' && !body.card?.token) return json({ error: 'Dados do cartão ausentes' }, 400)

  const db = adminClient()
  let order: any

  if (body.orderId) {
    // Nova tentativa para pedido existente do próprio usuário
    const { data } = await db.from('orders').select('*').eq('id', body.orderId).eq('user_id', user.id).maybeSingle()
    if (!data) return json({ error: 'Pedido não encontrado' }, 404)
    if (data.status !== 'pending_payment') return json({ error: 'Este pedido não está aguardando pagamento' }, 409)
    order = data
  } else {
    const c = body.customer
    const a = body.address
    if (!body.acceptedTerms) return json({ error: 'É necessário aceitar os termos de compra' }, 400)
    if (!c?.name?.trim() || !/^\S+@\S+\.\S+$/.test(c.email ?? '')) return json({ error: 'Nome e e-mail são obrigatórios' }, 400)
    if (!isValidCpf(c.cpf ?? '')) return json({ error: 'CPF inválido' }, 400)
    if (!a || onlyDigits(a.cep).length !== 8 || !a.street || !a.number || !a.district || !a.city || !/^[A-Z]{2}$/.test(a.state))
      return json({ error: 'Endereço incompleto' }, 400)
    const items = body.items ?? []
    if (!items.length || items.length > 30) return json({ error: 'Carrinho inválido' }, 400)

    const slugs = [...new Set(items.map((i) => i.slug))]
    const { data: products, error } = await db
      .from('products')
      .select('id, slug, name, price_cents, availability, is_active, product_variants(name, value, price_delta_cents, is_active)')
      .in('slug', slugs)
    if (error) return json({ error: 'Falha ao consultar produtos' }, 500)

    const lines: { product: any; variant: Record<string, string>; unitPriceCents: number; quantity: number }[] = []
    for (const it of items) {
      const p = products?.find((x) => x.slug === it.slug)
      if (!p || !p.is_active) return json({ error: `Produto indisponível: ${it.slug}` }, 409)
      if (p.availability === 'unavailable') return json({ error: `${p.name} está indisponível no momento` }, 409)
      const variants = (p.product_variants as any[])
        .filter((v) => v.is_active)
        .map((v) => ({ name: v.name, value: v.value, priceDeltaCents: v.price_delta_cents }))
      const price = unitPrice(p.price_cents, variants, it.variant ?? {})
      if (!price.ok) return json({ error: `${p.name}: ${price.error}` }, 400)
      const quantity = Math.floor(Number(it.quantity))
      if (!(quantity >= 1 && quantity <= MAX_QTY)) return json({ error: 'Quantidade inválida' }, 400)
      lines.push({ product: p, variant: it.variant ?? {}, unitPriceCents: price.cents, quantity })
    }

    const { data: s } = await db.from('store_settings').select('*').eq('id', 1).single()
    const totals = computeTotals(lines, { shippingFlatCents: s?.shipping_flat_cents ?? null, freeShippingMinCents: s?.free_shipping_min_cents ?? null })
    if (!totals.ok) return json({ error: totals.error }, 409)

    const { data: created, error: oErr } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        customer_name: c.name.trim(),
        email: c.email.trim().toLowerCase(),
        phone: c.phone ? onlyDigits(c.phone) : null,
        cpf: onlyDigits(c.cpf),
        shipping_address: { ...a, cep: onlyDigits(a.cep), recipient: a.recipient || c.name },
        subtotal_cents: totals.subtotalCents,
        shipping_cents: totals.shippingCents,
        total_cents: totals.totalCents,
        payment_method: body.method,
        accepted_terms_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (oErr) return json({ error: 'Falha ao criar pedido' }, 500)
    order = created

    const { error: iErr } = await db.from('order_items').insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        product_slug: l.product.slug,
        product_name: l.product.name,
        variant: l.variant,
        unit_price_cents: l.unitPriceCents,
        quantity: l.quantity,
      })),
    )
    if (iErr) {
      await db.from('orders').delete().eq('id', order.id)
      return json({ error: 'Falha ao registrar itens' }, 500)
    }
  }

  // ---------------------------------------------------------------- pagamento
  const [first, ...rest] = String(order.customer_name).split(' ')
  const payload: Record<string, unknown> = {
    transaction_amount: order.total_cents / 100,
    description: `OneCore Virtual — pedido #${order.number}`,
    external_reference: order.id,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
    payer: {
      email: order.email,
      first_name: first,
      last_name: rest.join(' ') || undefined,
      identification: order.cpf ? { type: 'CPF', number: order.cpf } : undefined,
    },
  }
  if (body.method === 'pix') {
    payload.payment_method_id = 'pix'
    payload.date_of_expiration = new Date(Date.now() + 30 * 60_000).toISOString()
  } else {
    payload.token = body.card!.token
    payload.installments = Math.max(1, Math.floor(body.card!.installments || 1))
    payload.payment_method_id = body.card!.paymentMethodId
    if (body.card!.issuerId) payload.issuer_id = body.card!.issuerId
  }

  let mp: any
  try {
    mp = await mpFetch('/v1/payments', { method: 'POST', body: JSON.stringify(payload), idempotencyKey: crypto.randomUUID() })
  } catch (e) {
    return json({ orderId: order.id, number: order.number, error: 'Não foi possível iniciar o pagamento. Tente novamente.', detail: String(e) }, 502)
  }

  const tx = mp.point_of_interaction?.transaction_data
  await db.from('payments').upsert(
    {
      order_id: order.id,
      provider_payment_id: String(mp.id),
      method: body.method,
      status: mapStatus(mp.status),
      status_detail: mp.status_detail,
      amount_cents: order.total_cents,
      installments: mp.installments ?? null,
      pix_qr_code: tx?.qr_code ?? null,
      pix_qr_base64: tx?.qr_code_base64 ?? null,
      pix_expires_at: mp.date_of_expiration ?? null,
    },
    { onConflict: 'provider_payment_id' },
  )
  // Resposta veio diretamente da API do provedor (servidor-servidor): pode ser aplicada.
  await applyProviderPayment(db, mp)

  return json({
    orderId: order.id,
    number: order.number,
    payment: { status: mapStatus(mp.status), statusDetail: mp.status_detail, pixQrCode: tx?.qr_code, pixQrBase64: tx?.qr_code_base64 },
  })
})
