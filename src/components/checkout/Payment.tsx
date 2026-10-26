import { Check, Copy, Loader2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { formatDate } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import { Alert } from '../ui/Field'

export const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined

export interface CheckoutResult {
  orderId: string
  number: number
  error?: string
  payment?: { status: string; statusDetail?: string; pixQrCode?: string; pixQrBase64?: string }
}

export interface CardData {
  token: string
  installments: number
  paymentMethodId: string
  issuerId?: string
}

/** Chama a Edge Function de checkout. Todo valor é recalculado no servidor. */
export async function callCheckout(body: Record<string, unknown>): Promise<CheckoutResult> {
  const { data, error } = await supabase!.functions.invoke<CheckoutResult>('checkout', { body })
  if (error) {
    let msg = 'Não foi possível concluir. Tente novamente.'
    let partial: Partial<CheckoutResult> = {}
    try {
      const ctx = (error as { context?: Response }).context
      const j = ctx ? await ctx.json() : null
      if (j?.error) msg = j.error
      partial = j ?? {}
    } catch {
      /* resposta sem corpo */
    }
    return { ...(partial as CheckoutResult), error: msg }
  }
  return data!
}

export function PixPanel({ code, base64, expiresAt }: { code: string; base64?: string | null; expiresAt?: string | null }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-2xl border border-line p-5 sm:p-6">
      <p className="font-bold">Pague com Pix</p>
      <p className="mt-1 text-[14px] text-muted">Escaneie o QR Code no app do seu banco ou use o código copia e cola. A confirmação é automática.</p>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {base64 && <img src={`data:image/png;base64,${base64}`} alt="QR Code Pix" width={180} height={180} className="h-[180px] w-[180px] rounded-lg border border-line" />}
        <div className="w-full min-w-0 flex-1">
          <p className="break-all rounded-lg bg-soft p-3 font-mono text-[12px] leading-relaxed text-ink/80">{code}</p>
          <button onClick={copy} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-ink text-[14px] font-semibold text-white hover:bg-black">
            {copied ? <><Check className="h-4 w-4" /> Código copiado</> : <><Copy className="h-4 w-4" /> Copiar código Pix</>}
          </button>
          {expiresAt && <p className="mt-2 text-[12px] text-muted">Válido até {formatDate(expiresAt)}.</p>}
        </div>
      </div>
      <p className="mt-5 flex items-center gap-2 text-[13px] text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando confirmação do pagamento…</p>
    </div>
  )
}

declare global {
  interface Window {
    MercadoPago?: new (key: string, opts: { locale: string }) => {
      bricks: () => { create: (name: string, container: string, settings: unknown) => Promise<{ unmount: () => void }> }
    }
  }
}

let sdk: Promise<void> | null = null
const loadSdk = () =>
  (sdk ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://sdk.mercadopago.com/js/v2'
    s.onload = () => resolve()
    s.onerror = () => {
      sdk = null
      reject(new Error('Falha ao carregar o SDK de pagamento'))
    }
    document.head.appendChild(s)
  }))

/**
 * Formulário de cartão do Mercado Pago (Card Payment Brick). Os dados do cartão
 * são digitados em campos do provedor e convertidos em token; a loja só recebe o token.
 */
export function CardBrick({ amountCents, email, onToken }: { amountCents: number; email?: string; onToken: (d: CardData) => Promise<void> }) {
  const id = 'mp-card-' + useId().replace(/:/g, '')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const cb = useRef(onToken)
  cb.current = onToken

  useEffect(() => {
    if (!MP_PUBLIC_KEY) return
    let brick: { unmount: () => void } | null = null
    let alive = true
    loadSdk()
      .then(async () => {
        if (!alive || !window.MercadoPago) return
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' })
        brick = await mp.bricks().create('cardPayment', id, {
          initialization: { amount: amountCents / 100, payer: email ? { email } : undefined },
          customization: { visual: { style: { theme: 'default', customVariables: { baseColor: '#FF6A00' } } }, paymentMethods: { maxInstallments: 12 } },
          callbacks: {
            onReady: () => setState('ready'),
            onError: () => setState('error'),
            onSubmit: (f: { token: string; installments: number; payment_method_id: string; issuer_id?: string }) =>
              cb.current({ token: f.token, installments: f.installments, paymentMethodId: f.payment_method_id, issuerId: f.issuer_id }),
          },
        })
      })
      .catch(() => setState('error'))
    return () => {
      alive = false
      brick?.unmount()
    }
  }, [id, amountCents, email])

  if (!MP_PUBLIC_KEY) return <Alert tone="info">Pagamento com cartão indisponível: configure <code>VITE_MP_PUBLIC_KEY</code>.</Alert>
  return (
    <div>
      {state === 'loading' && <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário seguro…</div>}
      {state === 'error' && <Alert>Não foi possível carregar o formulário de cartão. Recarregue a página ou use Pix.</Alert>}
      <div id={id} />
    </div>
  )
}
