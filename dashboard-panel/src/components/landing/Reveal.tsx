import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Scroll-triggered entrance. Opacity and 6px, once, 300ms — enough to feel
 * composed while scrolling, not enough to notice as an effect.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.3, delay, ease: [0.2, 0, 0.13, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({ eyebrow, title, description, align = 'left', className }: SectionHeadingProps) {
  return (
    <Reveal className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow && <p className="label mb-2 uppercase">{eyebrow}</p>}
      <h2 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-fg md:text-[2rem]">{title}</h2>
      {description && (
        <p
          className={cn(
            'mt-3 max-w-2xl text-body leading-relaxed text-fg-muted',
            align === 'center' && 'mx-auto',
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  )
}
