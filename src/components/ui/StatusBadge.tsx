import { ORDER_STATUS, type OrderStatus } from '../../lib/orders'
import { cx } from '../../lib/format'

const tones = {
  neutral: 'bg-soft text-ink',
  brand: 'bg-brand-tint text-brand-dark',
  success: 'bg-green-50 text-success',
  muted: 'bg-soft text-muted',
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold', tones[s.tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}
