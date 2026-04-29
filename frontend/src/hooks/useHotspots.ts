import { useState, useEffect, useCallback, useRef } from 'react'
import { getHotspots, getStats, type Hotspot, type HotspotFilters, type Stats } from '@/lib/api'

export interface FilterState {
  search: string
  sourceType: 'all' | 'x' | 'weibo' | 'web' | 'bilibili'
  priority: 'all' | 'urgent' | 'high' | 'medium' | 'low'
  credibility: 'all' | 'high' | 'medium' | 'low'
  isReal: 'all' | 'real' | 'fake'
}

export const defaultFilters: FilterState = {
  search: '',
  sourceType: 'all',
  priority: 'all',
  credibility: 'all',
  isReal: 'all',
}

function buildFilters(state: FilterState): HotspotFilters {
  return {
    search: state.search || undefined,
    sourceType: state.sourceType,
    priority: state.priority,
    credibility: state.credibility,
    isReal: state.isReal,
  }
}

export function useHotspots() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [totalHotspots, setTotalHotspots] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const filtersRef = useRef<HotspotFilters>({})
  const pageSizeRef = useRef(20)

  const fetchHotspots = useCallback(async (filterParams: HotspotFilters, page?: number, size?: number) => {
    try {
      setError(null)
      const sz = size ?? pageSizeRef.current
      const pg = page ?? 1
      const response = await getHotspots({ ...filterParams, page: pg, pageSize: sz })
      setHotspots(response.data)
      setTotalHotspots(response.total)
      setTotalPages(response.totalPages)
    } catch (err) {
      setError('获取热点数据失败')
      console.error(err)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (err) {
      console.error('获取统计数据失败', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    let isMounted = true
    const initData = async () => {
      try {
        await Promise.all([fetchHotspots(filtersRef.current, 1, pageSize), fetchStats()])
      } catch (err) {
        console.error('Initialization failed', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    initData()
    return () => { isMounted = false }
  }, [fetchHotspots, fetchStats, pageSize])

  const goToPage = useCallback((page: number) => {
    setPageNum(page)
    fetchHotspots(filtersRef.current, page, pageSizeRef.current)
  }, [fetchHotspots])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    pageSizeRef.current = size
    setPageNum(1)
    fetchHotspots(filtersRef.current, 1, size)
  }, [fetchHotspots])

  const handleFilterChange = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => {
      const newState = { ...prev, [key]: value }
      const apiFilters = buildFilters(newState)
      filtersRef.current = apiFilters
      setPageNum(1)
      fetchHotspots(apiFilters, 1, pageSizeRef.current)
      return newState
    })
  }, [fetchHotspots])

  const clearFilter = useCallback(<K extends keyof FilterState>(key: K) => {
    handleFilterChange(key, defaultFilters[key])
  }, [handleFilterChange])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    filtersRef.current = {}
    setPageNum(1)
    fetchHotspots({}, 1, pageSizeRef.current)
  }, [fetchHotspots])

  const refresh = useCallback(() => {
    fetchHotspots(filtersRef.current, pageNum, pageSizeRef.current)
  }, [fetchHotspots, pageNum])

  const activeFilterCount = [
    filters.sourceType !== 'all',
    filters.priority !== 'all',
    filters.credibility !== 'all',
    filters.isReal !== 'all',
  ].filter(Boolean).length

  return {
    // Data
    hotspots,
    totalHotspots,
    stats,
    loading,
    error,
    // Filters
    filters,
    activeFilterCount,
    // Pagination
    pageNum,
    totalPages,
    pageSize,
    // Actions
    goToPage,
    handlePageSizeChange,
    handleFilterChange,
    clearFilter,
    resetFilters,
    fetchHotspots,
    fetchStats,
    refresh,
  }
}
