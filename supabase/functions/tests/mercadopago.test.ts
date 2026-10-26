// deno test --allow-env supabase/functions/tests
import { assertEquals } from 'jsr:@std/assert@1.0.8'
import { mapStatus, verifySignature } from '../_shared/mercadopago.ts'

async function sign(secret: string, manifest: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const req = (sig: string) => new Request('https://x/mp-webhook', { method: 'POST', headers: { 'x-signature': sig, 'x-request-id': 'req-1' } })

Deno.test('aceita assinatura válida', async () => {
  Deno.env.set('MP_WEBHOOK_SECRET', 'segredo')
  const v1 = await sign('segredo', 'id:123;request-id:req-1;ts:1700000000;')
  assertEquals(await verifySignature(req(`ts=1700000000,v1=${v1}`), '123'), true)
})

Deno.test('rejeita assinatura com outro segredo', async () => {
  Deno.env.set('MP_WEBHOOK_SECRET', 'segredo')
  const v1 = await sign('outro', 'id:123;request-id:req-1;ts:1700000000;')
  assertEquals(await verifySignature(req(`ts=1700000000,v1=${v1}`), '123'), false)
})

Deno.test('rejeita id de pagamento trocado', async () => {
  Deno.env.set('MP_WEBHOOK_SECRET', 'segredo')
  const v1 = await sign('segredo', 'id:123;request-id:req-1;ts:1700000000;')
  assertEquals(await verifySignature(req(`ts=1700000000,v1=${v1}`), '999'), false)
})

Deno.test('rejeita sem segredo configurado ou sem cabeçalho', async () => {
  Deno.env.delete('MP_WEBHOOK_SECRET')
  assertEquals(await verifySignature(req('ts=1,v1=abc'), '1'), false)
  Deno.env.set('MP_WEBHOOK_SECRET', 'segredo')
  assertEquals(await verifySignature(req(''), '1'), false)
})

Deno.test('mapeia status do provedor', () => {
  assertEquals(mapStatus('approved'), 'approved')
  assertEquals(mapStatus('in_process'), 'pending')
  assertEquals(mapStatus('cancelled'), 'canceled')
  assertEquals(mapStatus('charged_back'), 'refunded')
  assertEquals(mapStatus('rejected'), 'rejected')
})
