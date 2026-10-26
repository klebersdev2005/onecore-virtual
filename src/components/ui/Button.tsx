import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cx } from '../../lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark'
type Size = 'md' | 'lg' | 'sm'

const base =
  'group/btn relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap rounded-[10px] transition-all duration-200 ease-out active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none select-none'
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-[0_1px_0_rgba(0,0,0,.08),0_8px_20px_-8px_rgba(255,106,0,.55)]',
  secondary: 'bg-white text-ink border border-line hover:border-ink',
  ghost: 'text-ink hover:bg-soft',
  dark: 'bg-ink text-white hover:bg-black',
}
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
}

export const btn = (v: Variant = 'primary', s: Size = 'md', extra?: string) => cx(base, variants[v], sizes[s], extra)

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
export const Button = forwardRef<HTMLButtonElement, BtnProps>(({ variant, size, className, ...rest }, ref) => (
  <button ref={ref} className={btn(variant, size, className)} {...rest} />
))

export function ButtonLink({ variant, size, className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={btn(variant, size, className)} {...rest} />
}
