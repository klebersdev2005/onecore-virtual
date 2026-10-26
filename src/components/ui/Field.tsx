import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/format'

export const inputCls =
  'h-12 w-full rounded-[10px] border border-line bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted/70 focus:border-ink disabled:bg-soft aria-[invalid=true]:border-red-500'

interface Wrap {
  label: string
  error?: string
  hint?: ReactNode
  className?: string
}

export function FieldWrap({ label, error, hint, className, children }: Wrap & { children: ReactNode }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] font-medium text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>
      )}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap>(
  ({ label, error, hint, className, ...rest }, ref) => (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <input ref={ref} aria-invalid={!!error} className={inputCls} {...rest} />
    </FieldWrap>
  ),
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap>(
  ({ label, error, hint, className, ...rest }, ref) => (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <textarea ref={ref} aria-invalid={!!error} className={cx(inputCls, 'h-auto min-h-[100px] py-3')} {...rest} />
    </FieldWrap>
  ),
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Wrap>(
  ({ label, error, hint, className, children, ...rest }, ref) => (
    <FieldWrap label={label} error={error} hint={hint} className={className}>
      <select ref={ref} aria-invalid={!!error} className={inputCls} {...rest}>
        {children}
      </select>
    </FieldWrap>
  ),
)

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const t = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-success',
    info: 'border-line bg-soft text-ink',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-[10px] border px-4 py-3 text-[14px]', t)}>
      {children}
    </div>
  )
}
