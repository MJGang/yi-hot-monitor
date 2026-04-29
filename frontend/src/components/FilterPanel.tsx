import { X, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import type { FilterState } from '@/hooks/useHotspots'

interface FilterPanelProps {
  show: boolean
  filters: FilterState
  activeFilterCount: number
  onClose: () => void
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onReset: () => void
}

export default function FilterPanel({ show, filters, activeFilterCount, onClose, onUpdateFilter, onReset }: FilterPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="liquid-glass px-6 py-4 relative z-10"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-text-primary">高级筛选</span>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={onReset}
                  className="text-xs text-text-muted hover:text-primary cursor-pointer underline"
                >
                  重置全部
                </button>
              )}
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FilterGroup
              label="可信度"
              options={([
                { value: 'all', label: '全部' },
                { value: 'high', label: '高度可信' },
                { value: 'medium', label: '中度可信' },
                { value: 'low', label: '低度可信' },
              ] as const)}
              selected={filters.credibility}
              onChange={(v) => onUpdateFilter('credibility', v)}
            />
            <FilterGroup
              label="内容真伪"
              options={([
                { value: 'all', label: '全部', icon: undefined, color: undefined },
                { value: 'real', label: '真实', icon: Check, color: '#00B894' },
                { value: 'fake', label: '虚假', icon: X, color: '#E17055' },
              ] as const)}
              selected={filters.isReal}
              onChange={(v) => onUpdateFilter('isReal', v)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FilterGroup<T extends string>({ label, options, selected, onChange }: {
  label: string
  options: readonly { value: T; label: string; icon?: typeof X; color?: string }[]
  selected: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
              selected === opt.value
                ? 'bg-primary/30 text-primary border border-primary/50'
                : 'bg-white/10 text-text-secondary hover:bg-white/20',
            )}
          >
            {opt.icon && <opt.icon className="w-3 h-3" style={opt.color ? { color: opt.color } : undefined} />}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
