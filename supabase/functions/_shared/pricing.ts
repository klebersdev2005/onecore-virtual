/**
 * Regras de preço — fonte única usada pelo frontend (exibição) e pela Edge
 * Function de checkout (cobrança). O servidor SEMPRE recalcula com dados do banco.
 * Sem dependências: roda em Node, navegador e Deno.
 */

export interface PricedVariant {
  name: string
  value: string
  priceDeltaCents: number
}

export interface ShippingSettings {
  shippingFlatCents: number | null
  freeShippingMinCents: number | null
}

export interface PricedLine {
  unitPriceCents: number
  quantity: number
}

export const MAX_QTY = 10

/** Valida a seleção de variações e devolve o preço unitário. */
export function unitPrice(
  basePriceCents: number,
  variants: PricedVariant[],
  selection: Record<string, string>,
): { ok: true; cents: number } | { ok: false; error: string } {
  const groups = [...new Set(variants.map((v) => v.name))]
  let cents = basePriceCents
  for (const g of groups) {
    const chosen = selection[g]
    if (!chosen) return { ok: false, error: `Selecione ${g.toLowerCase()}` }
    const v = variants.find((x) => x.name === g && x.value === chosen)
    if (!v) return { ok: false, error: `Opção inválida para ${g}` }
    cents += v.priceDeltaCents
  }
  for (const k of Object.keys(selection)) {
    if (!groups.includes(k)) return { ok: false, error: `Opção desconhecida: ${k}` }
  }
  if (cents <= 0) return { ok: false, error: 'Preço inválido' }
  return { ok: true, cents }
}

/** Frete só existe se a loja configurou. null = não calculável (checkout bloqueado). */
export function shippingFor(subtotalCents: number, s: ShippingSettings): number | null {
  if (s.freeShippingMinCents != null && subtotalCents >= s.freeShippingMinCents) return 0
  return s.shippingFlatCents
}

export function computeTotals(lines: PricedLine[], s: ShippingSettings) {
  if (!lines.length) return { ok: false as const, error: 'Carrinho vazio' }
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_QTY)
      return { ok: false as const, error: 'Quantidade inválida' }
  }
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0)
  const shippingCents = shippingFor(subtotalCents, s)
  if (shippingCents == null) return { ok: false as const, error: 'Frete ainda não configurado pela loja' }
  return { ok: true as const, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents }
}

export const onlyDigits = (s: string) => s.replace(/\D/g, '')

/** Validação de CPF pelos dígitos verificadores. */
export function isValidCpf(raw: string) {
  const c = onlyDigits(raw)
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dv = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10])
}
