import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

const overlayVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18 } },
}
const panelVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  },
}

function stopPropagation(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

export default function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      variants={overlayVariants}
      initial="hidden"
      animate="show"
      onClick={onClose}
    >
      <motion.div
        className="relative z-10 w-full max-w-md rounded-t-3xl border border-hairline bg-surface shadow-glass sm:rounded-3xl"
        variants={panelVariants}
        initial="hidden"
        animate="show"
        onClick={stopPropagation}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-fg-muted transition hover:bg-accent-soft hover:text-accent"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}
