import { supabase } from '../lib/supabase'

export interface StoreSettings {
  shipping_flat_cents: number | null
  free_shipping_min_cents: number | null
  shipping_days_min: number | null
  shipping_days_max: number | null
  contact_email: string | null
  contact_whatsapp: string | null
  company_name: string | null
  cnpj: string | null
  company_address: string | null
}

const EMPTY: StoreSettings = {
  shipping_flat_cents: null,
  free_shipping_min_cents: null,
  shipping_days_min: null,
  shipping_days_max: null,
  contact_email: null,
  contact_whatsapp: null,
  company_name: null,
  cnpj: null,
  company_address: null,
}

let cache: Promise<StoreSettings> | null = null

/** Configurações públicas da loja (frete, contato, dados empresariais). */
export function getStoreSettings(): Promise<StoreSettings> {
  if (!supabase) return Promise.resolve(EMPTY)
  return (cache ??= Promise.resolve(supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()).then(({ data }) => (data as StoreSettings) ?? EMPTY))
}

export const invalidateStoreSettings = () => {
  cache = null
}

export const toShipping = (s: StoreSettings) => ({ shippingFlatCents: s.shipping_flat_cents, freeShippingMinCents: s.free_shipping_min_cents })

export function deliveryEstimate(s: StoreSettings) {
  if (!s.shipping_days_min) return null
  return s.shipping_days_max && s.shipping_days_max !== s.shipping_days_min
    ? `${s.shipping_days_min} a ${s.shipping_days_max} dias úteis após a confirmação do pagamento`
    : `${s.shipping_days_min} dias úteis após a confirmação do pagamento`
}
