/**
 * POST /functions/v1/mp-webhook — notificações do Mercado Pago.
 * 1. valida a assinatura (x-signature); 2. consulta o pagamento na API;
 * 3. só então atualiza pagamento e pedido. O corpo da notificação nunca é
 * usado como fonte do status.
 * Deploy com --no-verify-jwt (o provedor não envia JWT do Supabase).
 */
import { adminClient, json } from '../_shared/http.ts'
import { applyProviderPayment, mpFetch, verifySignature } from '../_shared/mercadopago.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)
  const url = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  const type = url.searchParams.get('type') ?? body?.type
  const dataId = url.searchParams.get('data.id') ?? body?.data?.id

  if (type !== 'payment' || !dataId) return json({ ignored: true })
  if (!(await verifySignature(req, String(dataId)))) return json({ error: 'Assinatura inválida' }, 401)

  try {
    const mp = await mpFetch(`/v1/payments/${encodeURIComponent(String(dataId))}`)
    if (!mp.external_reference) return json({ ignored: true })
    await applyProviderPayment(adminClient(), mp)
    return json({ ok: true })
  } catch (e) {
    // 500 faz o provedor reenviar a notificação
    return json({ error: String(e) }, 500)
  }
})
