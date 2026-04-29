import { useState, useRef, useCallback } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { ParticleField } from '@/components/ui/Particle'
import { triggerScan } from '@/lib/api'
import Pagination from '@/components/ui/Pagination'
import HotspotCard from '@/components/HotspotCard'
import StatsBar from '@/components/StatsBar'
import FilterPanel from '@/components/FilterPanel'
import DashboardToolbar from '@/components/DashboardToolbar'
import NewContentToast from '@/components/NewContentToast'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useHotspots } from '@/hooks/useHotspots'

export default function Dashboard() {
  const [scanning, setScanning] = useState(false)
  const [showNewToast, setShowNewToast] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const {
    hotspots, totalHotspots, stats, loading, error,
    filters, activeFilterCount,
    pageNum, totalPages, pageSize,
    goToPage, handlePageSizeChange,
    handleFilterChange, clearFilter, resetFilters,
    fetchStats, refresh,
  } = useHotspots()

  const handleScanComplete = useCallback((newHotspots: number) => {
    setScanning(false)
    if (newHotspots > 0) {
      setNewCount(newHotspots)
      setShowNewToast(true)
      setTimeout(() => setShowNewToast(false), 3000)
    }
    fetchStats()
    refresh()
  }, [fetchStats, refresh])

  useWebSocket({
    onScanStart: useCallback(() => setScanning(true), []),
    onScanStatus: useCallback((s: boolean) => setScanning(s), []),
    onScanComplete: handleScanComplete,
    onOpen: fetchStats,
  })

  const handleScan = async () => {
    try {
      await triggerScan()
    } catch (err) {
      console.error('扫描失败', err)
    }
  }

  const handleViewNew = () => {
    refresh()
    fetchStats()
    setShowNewToast(false)
  }

  const handlePageChange = (page: number) => {
    goToPage(page)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <NewContentToast show={showNewToast} newCount={newCount} onView={handleViewNew} />

      <DashboardToolbar
        filters={filters}
        activeFilterCount={activeFilterCount}
        scanning={scanning}
        onUpdateFilter={handleFilterChange}
        onClearFilter={clearFilter}
        onToggleFilterPanel={() => setShowFilterPanel(p => !p)}
        onScan={handleScan}
      />

      <FilterPanel
        show={showFilterPanel}
        filters={filters}
        activeFilterCount={activeFilterCount}
        onClose={() => setShowFilterPanel(false)}
        onUpdateFilter={handleFilterChange}
        onReset={resetFilters}
      />

      <StatsBar stats={stats} totalHotspots={totalHotspots} scanning={scanning} />

      <ParticleField count={20} color="rgba(201, 177, 255, 0.4)" className="absolute inset-0 z-0" />

      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <div ref={listRef} className="flex-1 overflow-y-auto p-6 pb-3 space-y-3">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={refresh} />
          ) : hotspots.length > 0 ? (
            hotspots.map((hotspot, index) => (
              <motion.div
                key={hotspot.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <HotspotCard hotspot={hotspot} />
              </motion.div>
            ))
          ) : (
            <EmptyState activeFilterCount={activeFilterCount} onReset={resetFilters} />
          )}
        </div>

        <Pagination
          currentStart={hotspots.length > 0 ? (pageNum - 1) * pageSize + 1 : 0}
          currentEnd={(pageNum - 1) * pageSize + hotspots.length}
          total={totalHotspots}
          pageSize={pageSize}
          currentPage={pageNum}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="ml-2 text-text-muted">加载中...</span>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
        <X className="w-8 h-8 text-danger" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
      <p className="text-sm text-text-muted mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
      >
        重试
      </button>
    </motion.div>
  )
}

function EmptyState({ activeFilterCount, onReset }: { activeFilterCount: number; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">未找到匹配的热点</h3>
      <p className="text-sm text-text-muted mb-4">尝试调整筛选条件或搜索关键词</p>
      {activeFilterCount > 0 && (
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
        >
          重置筛选
        </button>
      )}
    </motion.div>
  )
}
