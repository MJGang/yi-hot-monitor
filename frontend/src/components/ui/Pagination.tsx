import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

export interface PaginationProps {
  currentStart: number
  currentEnd: number
  total: number
  pageSize: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)
  return pages
}

export default function Pagination({
  currentStart,
  currentEnd,
  total,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const [jumpInput, setJumpInput] = useState('')
  const [showJump, setShowJump] = useState(false)

  if (total === 0) return null

  const pageNumbers = getPageNumbers(currentPage, totalPages)

  const handleJump = () => {
    const page = parseInt(jumpInput, 10)
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
      setJumpInput('')
      setShowJump(false)
    }
  }

  return (
    <div className="liquid-glass flex items-center justify-between px-4 py-3 border-t border-white/10 gap-2">
      {/* Page size selector */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-text-muted hidden sm:inline">每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="glass-select px-2 py-1.5 rounded-xl text-xs text-text-primary cursor-pointer"
          aria-label="每页显示条数"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size} 条</option>
          ))}
        </select>
      </div>

      {/* Center: page navigation */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <motion.button
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage > 1 ? 'glass-btn cursor-pointer hover:bg-white/20' : 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          whileHover={currentPage > 1 ? { scale: 1.1 } : {}}
          whileTap={currentPage > 1 ? { scale: 0.9 } : {}}
          aria-label="第一页"
        >
          <ChevronsLeft className="w-4 h-4 text-text-primary" />
        </motion.button>

        {/* Previous */}
        <motion.button
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage > 1 ? 'glass-btn cursor-pointer hover:bg-white/20' : 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          whileHover={currentPage > 1 ? { scale: 1.1 } : {}}
          whileTap={currentPage > 1 ? { scale: 0.9 } : {}}
          aria-label="上一页"
        >
          <ChevronLeft className="w-4 h-4 text-text-primary" />
        </motion.button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-0.5 mx-1">
          {pageNumbers.map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-text-muted">...</span>
            ) : (
              <motion.button
                key={item}
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors cursor-pointer',
                  item === currentPage
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-secondary hover:bg-white/10'
                )}
                onClick={() => onPageChange(item)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`第 ${item} 页`}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </motion.button>
            )
          )}
        </div>

        {/* Next */}
        <motion.button
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage < totalPages ? 'glass-btn cursor-pointer hover:bg-white/20' : 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          whileHover={currentPage < totalPages ? { scale: 1.1 } : {}}
          whileTap={currentPage < totalPages ? { scale: 0.9 } : {}}
          aria-label="下一页"
        >
          <ChevronRight className="w-4 h-4 text-text-primary" />
        </motion.button>

        {/* Last page */}
        <motion.button
          className={clsx(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage < totalPages ? 'glass-btn cursor-pointer hover:bg-white/20' : 'opacity-30 cursor-not-allowed'
          )}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          whileHover={currentPage < totalPages ? { scale: 1.1 } : {}}
          whileTap={currentPage < totalPages ? { scale: 0.9 } : {}}
          aria-label="最后一页"
        >
          <ChevronsRight className="w-4 h-4 text-text-primary" />
        </motion.button>
      </div>

      {/* Right: position info + jump */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-text-muted tabular-nums whitespace-nowrap hidden sm:inline">
          <span className="font-semibold text-text-primary">{currentStart}-{currentEnd}</span>
          {' / '}{total.toLocaleString()}
        </span>

        {/* Page jump */}
        {showJump ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleJump() }}
            className="flex items-center gap-1"
          >
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="glass-input w-12 h-7 px-2 rounded-lg text-xs text-text-primary text-center"
              placeholder={`${currentPage}`}
              autoFocus
              onBlur={() => { setShowJump(false); setJumpInput('') }}
            />
            <span className="text-xs text-text-muted">/ {totalPages}</span>
          </form>
        ) : (
          <button
            className="text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer tabular-nums"
            onClick={() => setShowJump(true)}
            title="点击跳转页码"
          >
            <span className="sm:hidden font-semibold text-text-primary">{currentPage}/{totalPages}</span>
            <span className="hidden sm:inline">{currentPage}/{totalPages} 页</span>
          </button>
        )}
      </div>
    </div>
  )
}
