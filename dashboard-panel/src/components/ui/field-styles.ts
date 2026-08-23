import { cn } from '@/lib/utils'

/** Shared control surface for text inputs, selects and secret fields. */
export const inputClasses = cn(
  'h-8 w-full rounded-md border border-line bg-inset px-2.5 text-meta text-fg',
  'placeholder:text-fg-subtle transition-colors duration-150',
  'hover:border-line-strong focus:border-accent focus:outline-none',
)
