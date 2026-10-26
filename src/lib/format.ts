const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatPrice = (cents: number) => brl.format(cents / 100)

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
