import { describe, expect, it } from 'vitest'
import { computeTotals, isValidCpf, shippingFor, unitPrice } from '../supabase/functions/_shared/pricing'
import { searchScore, sortProducts } from '../src/services/catalog-logic'
import { lineKey } from '../src/components/cart/lineKey'
import { products } from '../src/data/demo-catalog'

const variants = [
  { name: 'Cor', value: 'Preto', priceDeltaCents: 0 },
  { name: 'Cor', value: 'Laranja', priceDeltaCents: 500 },
]

describe('unitPrice', () => {
  it('soma acréscimo da variação', () => expect(unitPrice(1000, variants, { Cor: 'Laranja' })).toEqual({ ok: true, cents: 1500 }))
  it('exige escolher variação', () => expect(unitPrice(1000, variants, {}).ok).toBe(false))
  it('rejeita opção inexistente', () => expect(unitPrice(1000, variants, { Cor: 'Rosa' }).ok).toBe(false))
  it('rejeita grupo desconhecido', () => expect(unitPrice(1000, [], { Tamanho: 'G' }).ok).toBe(false))
})

describe('frete e totais', () => {
  const s = { shippingFlatCents: 1990, freeShippingMinCents: 20000 }
  it('frete fixo abaixo do mínimo', () => expect(shippingFor(10000, s)).toBe(1990))
  it('frete grátis a partir do mínimo', () => expect(shippingFor(20000, s)).toBe(0))
  it('sem frete configurado não calcula', () =>
    expect(computeTotals([{ unitPriceCents: 100, quantity: 1 }], { shippingFlatCents: null, freeShippingMinCents: null }).ok).toBe(false))
  it('total = subtotal + frete', () =>
    expect(computeTotals([{ unitPriceCents: 1000, quantity: 3 }], s)).toEqual({ ok: true, subtotalCents: 3000, shippingCents: 1990, totalCents: 4990 }))
  it('rejeita quantidade fora do limite', () => expect(computeTotals([{ unitPriceCents: 1000, quantity: 11 }], s).ok).toBe(false))
})

describe('CPF', () => {
  it('aceita válido', () => expect(isValidCpf('529.982.247-25')).toBe(true))
  it('rejeita inválido', () => expect(isValidCpf('529.982.247-24')).toBe(false))
  it('rejeita repetido', () => expect(isValidCpf('111.111.111-11')).toBe(false))
})

describe('catálogo', () => {
  it('busca por nome ignora acentos', () => {
    const p = products.find((x) => x.slug === 'caneca-termica-450ml')!
    expect(searchScore(p, 'TERMICA')).toBeGreaterThan(0)
    expect(searchScore(p, 'inexistente')).toBe(0)
  })
  it('ordena por preço', () => {
    const sorted = sortProducts(products, 'price-asc')
    expect(sorted[0].price).toBeLessThanOrEqual(sorted[sorted.length - 1].price)
  })
  it('chave do carrinho independe da ordem das variações', () =>
    expect(lineKey('x', { b: '1', a: '2' })).toBe(lineKey('x', { a: '2', b: '1' })))
})
