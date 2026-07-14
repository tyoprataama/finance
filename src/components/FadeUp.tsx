import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

// Fade-up animation used across the app when elements appear.
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

interface Props {
  children: ReactNode
  className?: string
}

export function FadeStagger({ children, className }: Props) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  )
}

export function FadeItem({ children, className }: Props) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}

// Standalone fade-up (no parent stagger needed).
export function FadeIn({ children, className }: Props) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  )
}
