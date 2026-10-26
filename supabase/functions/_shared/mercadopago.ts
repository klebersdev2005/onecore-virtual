// Integração com a API de pagamentos do Mercado Pago (server-side apenas).
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.46.1'

const API = 'https://api.mercadopago.com'

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'canceled' | 'refunded'

/** Mapeia o status do provedor para o status interno. */
export function mapStatus(mp: string): PaymentStatus {
  switch (mp) {
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    case 'cancelled':
      return 'canceled'
    case 'refunded':
    case 'charged_back':
      return 'refunded'
    default: // pending, in_process, authorized, in_mediation
      return 'pending'
  }
}

export async function mpFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado')
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.idempotencyKey ? { 'X-Idempotency-Key': init.idempotencyKey } : {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${body?.message ?? 'erro'}`)
  return body as any
}

/**
 * Aplica no banco o estado de um pagamento CONSULTADO na API do provedor.
 * Nunca recebe status vindo do navegador.
 */
export async function applyProviderPayment(db: SupabaseClient, mp: any) {
  const status = mapStatus(mp.status)
  const orderId = mp.external_reference as string

  const { data: existing } = await db.from('payments').select('id').eq('provider_payment_id', String(mp.id)).maybeSingle()
  const fields = {
    status,
    status_detail: mp.status_detail ?? null,
    installments: mp.installments ?? null,
    approved_at: mp.date_approved ?? null,
  }
  let paymentId = existing?.id as string | undefined
  if (paymentId) {
    await db.from('payments').update(fields).eq('id', paymentId)
  } else {
    const { data } = await db
      .from('payments')
      .insert({
        ...fields,
        order_id: orderId,
        provider_payment_id: String(mp.id),
        method: mp.payment_method_id === 'pix' ? 'pix' : 'card',
        amount_cents: Math.round(Number(mp.transaction_amount) * 100),
      })
      .select('id')
      .single()
    paymentId = data?.id
  }
  await db.from('payment_events').insert({ payment_id: paymentId, provider_payment_id: String(mp.id), status: mp.status, payload: mp })

  const { data: order } = await db.from('orders').select('id, status, total_cents').eq('id', orderId).single()
  if (!order) return
  if (status === 'approved' && order.status === 'pending_payment') {
    // Confere o valor antes de confirmar
    if (Math.round(Number(mp.transaction_amount) * 100) !== order.total_cents) {
      await db.from('order_notes').insert({ order_id: orderId, body: `Pagamento ${mp.id} aprovado com valor divergente — verificar.` })
      return
    }
    await db.from('orders').update({ status: 'paid' }).eq('id', orderId)
  } else if (status === 'refunded' && !['canceled', 'refunded'].includes(order.status)) {
    await db.from('orders').update({ status: 'refunded' }).eq('id', orderId)
  } else if (status === 'canceled' && order.status === 'pending_payment' && mp.payment_method_id === 'pix') {
    // Pix expirado
    await db.from('orders').update({ status: 'canceled' }).eq('id', orderId)
  }
}

/** Valida a assinatura x-signature das notificações (HMAC-SHA256). */
export async function verifySignature(req: Request, dataId: string) {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')
  if (!secret) return false
  const sig = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''
  const parts = Object.fromEntries(sig.split(',').map((p) => p.trim().split('=') as [string, string]))
  if (!parts.ts || !parts.v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return timingSafeEqual(hex, parts.v1)
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
