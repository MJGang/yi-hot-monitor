import { Search, Radar, Loader2, Filter, X } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import type { FilterState } from '@/hooks/useHotspots'

interface DashboardToolbarProps {
  filters: FilterState
  activeFilterCount: number
  scanning: boolean
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onClearFilter: <K extends keyof FilterState>(key: K) => void
  onToggleFilterPanel: () => void
  onScan: () => void
}

export default function DashboardToolbar({
  filters,
  activeFilterCount,
  scanning,
  onUpdateFilter,
  onClearFilter,
  onToggleFilterPanel,
  onScan,
}: DashboardToolbarProps) {
  return (
    <div className="liquid-glass flex items-center justify-between px-6 py-3 relative z-10 h-16" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-lg h-full">
        <div className="relative flex-1 h-full">
          <input
            type="text"
            placeholder="搜索热点内容..."
            value={filters.search}
            onChange={(e) => onUpdateFilter('search', e.target.value)}
            className="glass-input w-full h-10 px-5 pl-12 rounded-2xl text-text-primary placeholder-text-muted text-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 text-text-muted" />
          {filters.search && (
            <button
              onClick={() => onClearFilter('search')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3 h-10 ml-4">
        <select
          value={filters.sourceType}
          onChange={(e) => onUpdateFilter('sourceType', e.target.value as FilterState['sourceType'])}
          className="glass-select px-4 py-2.5 h-full rounded-2xl text-text-primary text-sm cursor-pointer"
        >
          <option value="all">全部来源</option>
          <option value="x">X (Twitter)</option>
          <option value="weibo">微博</option>
          <option value="web">网页</option>
          <option value="bilibili">B站</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => onUpdateFilter('priority', e.target.value as FilterState['priority'])}
          className="glass-select px-4 py-2.5 h-10 rounded-2xl text-text-primary text-sm cursor-pointer"
        >
          <option value="all">全部优先级</option>
          <option value="urgent">紧急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <motion.button
          className={clsx(
            'glass-btn px-4 h-10 rounded-2xl flex items-center gap-2 cursor-pointer',
            activeFilterCount > 0 && 'bg-primary/20 border-primary/40',
          )}
          onClick={onToggleFilterPanel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">筛选</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </motion.button>
        <motion.button
          className="glass-btn-primary px-5 h-10 rounded-2xl text-text-primary font-semibold flex items-center gap-2 cursor-pointer"
          onClick={onScan}
          disabled={scanning}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {scanning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.div>
          ) : (
            <Radar className="w-5 h-5" />
          )}
          <span>{scanning ? '扫描中...' : '立即扫描'}</span>
        </motion.button>

        <StatusIndicator scanning={scanning} />
      </div>
    </div>
  )
}

function StatusIndicator({ scanning }: { scanning: boolean }) {
  return (
    <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
      <motion.span
        className={clsx('w-2 h-2 rounded-full', scanning ? 'bg-mint' : 'bg-gray-400')}
        animate={scanning ? {
          boxShadow: ['0 0 8px rgba(125,205,170,0.8)', '0 0 16px rgba(125,205,170,1)', '0 0 8px rgba(125,205,170,0.8)'],
        } : {}}
        transition={{ duration: 2, repeat: scanning ? Infinity : 0 }}
      />
      <span className="text-xs text-text-muted">{scanning ? '采集中' : '已停止'}</span>
    </div>
  )
}
