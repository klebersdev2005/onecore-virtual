import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'

/** Símbolo: um "O" que contém um "C" laranja — núcleo + conexão. */
export function LogoMark({ className = 'h-8 w-8', invert = false }: { className?: string; invert?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={invert ? '#FFFFFF' : '#171717'} />
      <circle cx="20" cy="20" r="10.5" fill="none" stroke={invert ? '#171717' : '#FFFFFF'} strokeWidth="3.4" />
      <path d="M27.4 12.6a10.5 10.5 0 0 1 0 14.8" fill="none" stroke="#FF6A00" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="20" cy="20" r="2.6" fill="#FF6A00" />
    </svg>
  )
}

export function Logo({ invert = false, className }: { invert?: boolean; className?: string }) {
  return (
    <Link to="/" className={cx('flex items-center gap-2.5 shrink-0', className)} aria-label="OneCore Virtual — página inicial">
      <LogoMark invert={invert} />
      <span className={cx('text-[17px] font-extrabold tracking-[-0.03em] leading-none', invert ? 'text-white' : 'text-ink')}>
        OneCore<span className="font-medium text-muted"> Virtual</span>
      </span>
    </Link>
  )
}
