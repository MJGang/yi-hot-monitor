import { ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface NewContentToastProps {
  show: boolean
  newCount: number
  onView: () => void
}

export default function NewContentToast({ show, newCount, onView }: NewContentToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-mint/20 border border-mint/40 backdrop-blur-md shadow-lg cursor-pointer hover:bg-mint/30 transition-colors"
          onClick={onView}
        >
          <ArrowUp className="w-4 h-4 text-mint" />
          <span className="text-sm font-medium text-mint">发现 {newCount} 条新内容，点击查看</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
