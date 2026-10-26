import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useReveal } from '../../hooks/useReveal'
import { cx } from '../../lib/format'

export function Section({
  eyebrow, title, description, action, children, className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: { to: string; label: string }
  children: ReactNode
  className?: string
}) {
  const ref = useReveal<HTMLElement>()
  return (
    <section ref={ref} className={cx('reveal container-x py-14 md:py-20', className)}>
      <div className="mb-9 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h2 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[42px]">{title}</h2>
          {description && <p className="mt-3 text-[16px] leading-relaxed text-muted">{description}</p>}
        </div>
        {action && (
          <Link to={action.to} className="group inline-flex shrink-0 items-center gap-2 text-[14px] font-semibold">
            <span className="border-b border-ink/20 pb-0.5 transition-colors group-hover:border-brand">{action.label}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
