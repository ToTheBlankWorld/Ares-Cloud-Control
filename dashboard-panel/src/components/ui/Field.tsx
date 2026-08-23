import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { inputClasses } from '@/components/ui/field-styles'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | null
  children: (id: string) => ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-meta font-medium text-fg">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-micro text-danger">{error}</p>
      ) : (
        hint && <p className="text-micro leading-relaxed text-fg-subtle">{hint}</p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputClasses, className)} {...props} />
})

/** Password-style input with a reveal toggle, used for agent API tokens. */
export const SecretInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SecretInput({ className, ...props }, ref) {
    const [revealed, setRevealed] = useState(false)
    return (
      <div className="relative">
        <input
          ref={ref}
          type={revealed ? 'text' : 'password'}
          className={cn(inputClasses, 'pr-9 font-mono', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? 'Hide token' : 'Show token'}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-fg-subtle transition-colors duration-150 hover:text-fg"
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
    )
  },
)

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  className?: string
}

export function Toggle({ checked, onChange, label, description, className }: ToggleProps) {
  return (
    <div className={cn('flex items-start justify-between gap-6 py-2.5', className)}>
      <div className="min-w-0">
        <p className="text-meta font-medium text-fg">{label}</p>
        {description && <p className="mt-0.5 text-micro leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-4.5 w-8 shrink-0 rounded-full border transition-colors duration-150',
          checked ? 'border-accent bg-accent' : 'border-line bg-surface-active',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3 rounded-full transition-transform duration-150 ease-out',
            checked ? 'translate-x-4 bg-accent-fg' : 'translate-x-0.5 bg-fg-muted',
          )}
        />
      </button>
    </div>
  )
}
