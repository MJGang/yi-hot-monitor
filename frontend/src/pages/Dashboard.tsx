import { useState, useEffect, useCallback } from 'react'
import { Search, Radar, ChevronDown, Loader2, Repeat, MessageCircle, Heart, Eye, BadgeCheck, Clock, ShieldCheck, ShieldAlert, ShieldX, Shield, Flame, Thermometer, Zap, Leaf, Snowflake, Filter, X, Check, Download, Tag, Bookmark } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/ui/Particle'
import { GlareCard } from '@/components/ui/glare-card'
import { getHotspots, getStats, triggerScan, type Hotspot, type HotspotFilters, type Stats } from '@/lib/api'

// 筛选器配置
interface FilterState {
  search: string
  sourceType: 'all' | 'x' | 'bing'
  priority: 'all' | 'urgent' | 'high' | 'medium' | 'low'
  credibility: 'all' | 'high' | 'medium' | 'low'
  isReal: 'all' | 'real' | 'fake'
}

const defaultFilters: FilterState = {
  search: '',
  sourceType: 'all',
  priority: 'all',
  credibility: 'all',
  isReal: 'all'
}

const IconX = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const IconBing = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#008373" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
  </svg>
)

const credibilityLevels = {
  high: { label: '高度可信', icon: ShieldCheck, color: '#00B894', bg: 'rgba(0,184,148,0.15)', border: 'border border-success/30' },
  medium: { label: '中度可信', icon: ShieldAlert, color: '#FDCB6E', bg: 'rgba(253,203,110,0.15)', border: 'border border-warning/30' },
  low: { label: '低度可信', icon: ShieldX, color: '#E17055', bg: 'rgba(225,112,85,0.15)', border: 'border border-danger/30' },
  uncertain: { label: '待核实', icon: Shield, color: '#A0AEC0', bg: 'rgba(160,174,192,0.15)', border: 'border border-gray-400/30' }
}

const hotnessLevels: Record<string, {
  label: string
  icon: typeof Snowflake
  color: string
  bg: string
  border: string
  effect: { type: 'ice' | 'warm' | 'fire' | 'lightning' | 'none'; glowColor: string; particleColor: string }
}> = {
  cold: {
    label: '冷', icon: Snowflake, color: '#00D9FF', bg: 'rgba(0,217,255,0.08)', border: 'border border-cyan-400/30',
    effect: { type: 'ice', glowColor: 'rgba(0,217,255,0.5)', particleColor: 'rgba(0,217,255,0.8)' }
  },
  normal: {
    label: '一般', icon: Leaf, color: '#A0AEC0', bg: 'rgba(160,174,192,0.1)', border: 'border border-gray-400/30',
    effect: { type: 'none', glowColor: 'transparent', particleColor: '' }
  },
  warm: {
    label: '暖', icon: Zap, color: '#FFB432', bg: 'rgba(255,180,50,0.1)', border: 'border border-amber-400/30',
    effect: { type: 'warm', glowColor: 'rgba(255,180,50,0.4)', particleColor: 'rgba(255,200,100,0.7)' }
  },
  hot: {
    label: '热', icon: Thermometer, color: '#FF5722', bg: 'rgba(255,87,34,0.12)', border: 'border border-orange-500/30',
    effect: { type: 'fire', glowColor: 'rgba(255,80,0,0.6)', particleColor: 'rgba(255,200,50,1)' }
  },
  explosive: {
    label: '爆', icon: Flame, color: '#F0ABFC', bg: 'rgba(240,171,252,0.08)', border: 'border border-fuchsia-400/30',
    effect: { type: 'lightning', glowColor: 'rgba(240,171,252,0.6)', particleColor: 'rgba(255,255,255,0.9)' }
  }
}

const avatarColors: Record<string, string> = {
  OA: 'linear-gradient(135deg, #1DA1F2, #0d8ed9)',
  An: 'linear-gradient(135deg, #FF6B6B, #EE5A24)',
  TC: 'linear-gradient(135deg, #E17055, #D63031)',
  G: 'linear-gradient(135deg, #4285F4, #34A853)',
  MA: 'linear-gradient(135deg, #0081FB, #0057E7)',
  M: 'linear-gradient(135deg, #00A4EF, #0078D4)',
  LA: 'linear-gradient(135deg, #74B9FF, #0984E3)'
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function getCredibilityLevel(percent: number): keyof typeof credibilityLevels {
  if (percent >= 80) return 'high'
  if (percent >= 50) return 'medium'
  if (percent >= 25) return 'low'
  return 'uncertain'
}

function getHotnessLevel(views: number): 'explosive' | 'hot' | 'warm' | 'normal' | 'cold' {
  if (views >= 500000) return 'explosive'
  if (views >= 100000) return 'hot'
  if (views >= 50000) return 'warm'
  if (views >= 10000) return 'normal'
  return 'cold'
}

interface HotspotCardProps {
  hotspot: Hotspot
}

function HotspotCard({ hotspot }: HotspotCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const hotness = hotnessLevels[getHotnessLevel(hotspot.stats?.views || 0)]
  const HotnessIcon = hotness.icon
  const credibility = credibilityLevels[getCredibilityLevel(hotspot.credibility)]
  const CredibilityIcon = credibility.icon
  const avatarColor = avatarColors[hotspot.authorAvatar] || 'linear-gradient(135deg, #888, #666)'

  return (
    <GlareCard className="px-0 pt-0">
      <div className="cursor-pointer px-5 pt-4 bg-white/90 border-gray-200 shadow-md shadow-gray-300/50 dark:bg-[#1c1c1e]/90 dark:border-white/10 dark:shadow-black/40" onClick={() => setExpanded(!expanded)}>
        {/* Top tags row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg', hotness.bg, hotness.border)}>
              <HotnessIcon className="w-3.5 h-3.5" style={{ color: hotness.color }} />
              <span className="text-xs font-semibold" style={{ color: hotness.color }}>{hotness.label}</span>
            </div>
            <div className={clsx('flex items-center gap-1 px-2 py-1 rounded-lg', credibility.bg, credibility.border)}>
              <CredibilityIcon className="w-3.5 h-3.5" style={{ color: credibility.color }} />
              <span className="text-xs font-medium" style={{ color: credibility.color }}>{credibility.label}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/20 bg-white/10">
              {hotspot.sourceType === 'x' ? <IconX /> : <IconBing />}
              <span className="text-xs text-text-secondary">{hotspot.sourceType === 'x' ? 'X' : 'Bing'}</span>
            </div>
            {hotspot.matchedKeywords?.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-lavender/20 text-lavender-dark border border-lavender/30">
                <Tag className="w-3 h-3" />
                {hotspot.matchedKeywords[0]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <motion.button
              className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setIsBookmarked(!isBookmarked) }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Bookmark className={clsx('w-4 h-4 transition-colors', isBookmarked ? 'text-primary fill-primary' : 'text-text-muted')} />
            </motion.button>
            <motion.button
              className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronDown className={clsx('w-4 h-4 text-text-muted transition-transform duration-300', expanded && 'rotate-180')} />
            </motion.button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-text-primary leading-snug mb-2">{hotspot.title}</h3>

        {/* AI Summary */}
        {hotspot.summary && (
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-lavender/20 text-lavender-dark shrink-0 leading-tight">AI摘要</span>
            <p className="text-xs text-text-secondary leading-tight line-clamp-2">{hotspot.summary}</p>
          </div>
        )}

        {/* Author info */}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avatarColor }}>
            {hotspot.authorAvatar || 'UN'}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-secondary">{hotspot.author}</span>
            {hotspot.isVerified && <BadgeCheck className="w-4 h-4 text-sky shrink-0" />}
          </div>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{hotspot.followers?.toLocaleString() || 0}粉丝</span>
        </div>

        {/* Time info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>发布于：{formatDateTime(hotspot.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>抓取于：{formatDateTime(hotspot.capturedAt)}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 py-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Repeat className="w-3.5 h-3.5" />
            <span>{formatNumber(hotspot.stats?.reposts || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{formatNumber(hotspot.stats?.comments || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Heart className="w-3.5 h-3.5" />
            <span>{formatNumber(hotspot.stats?.likes || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(hotspot.stats?.views || 0)}</span>
          </div>
        </div>
      </div>

      {expanded && hotspot.aiReason && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-5 pb-5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}
        >
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-mint-dark" />
              <span className="text-xs font-semibold text-mint-dark">AI 分析理由</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed pl-6">{hotspot.aiReason}</p>
          </div>
        </motion.div>
      )}
    </GlareCard>
  )
}

export default function Dashboard() {
  const [scanning, setScanning] = useState(false)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取热点数据
  const fetchHotspots = useCallback(async (filterParams: HotspotFilters = {}) => {
    try {
      setError(null)
      const response = await getHotspots(filterParams)
      setHotspots(response.data)
    } catch (err) {
      setError('获取热点数据失败')
      console.error(err)
    }
  }, [])

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats()
      setStats(data)
    } catch (err) {
      console.error('获取统计数据失败', err)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchHotspots(), fetchStats()]).finally(() => setLoading(false))
  }, [fetchHotspots, fetchStats])

  // 处理扫描
  const handleScan = async () => {
    setScanning(true)
    try {
      await triggerScan()
      // 扫描完成后重新获取数据
      await fetchHotspots()
      await fetchStats()
    } catch (err) {
      console.error('扫描失败', err)
    } finally {
      setScanning(false)
    }
  }

  // 处理筛选变化 - 重新获取数据
  const handleFilterChange = (key: keyof FilterState, value: FilterState[keyof FilterState]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    // 重新获取数据，传入新的筛选条件
    fetchHotspots({
      search: key === 'search' ? value as string : filters.search,
      sourceType: key === 'sourceType' ? value as FilterState['sourceType'] : filters.sourceType,
      priority: key === 'priority' ? value as FilterState['priority'] : filters.priority,
      credibility: key === 'credibility' ? value as FilterState['credibility'] : filters.credibility,
      isReal: key === 'isReal' ? value as FilterState['isReal'] : filters.isReal,
    })
  }

  // 计算活跃筛选器数量
  const activeFilterCount = [
    filters.sourceType !== 'all',
    filters.priority !== 'all',
    filters.credibility !== 'all',
    filters.isReal !== 'all'
  ].filter(Boolean).length

  // 清除单个筛选器
  const clearFilter = (key: keyof FilterState) => {
    handleFilterChange(key, defaultFilters[key])
  }

  // 重置所有筛选器
  const resetFilters = () => {
    setFilters(defaultFilters)
    fetchHotspots()
  }

  // 更新筛选器（不触发请求）
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    handleFilterChange(key, value)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="liquid-glass flex items-center justify-between px-6 py-3 relative z-10 h-16" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
        <div className="flex items-center gap-4 flex-1 max-w-lg h-full">
          <div className="relative flex-1 h-full">
            <input
              type="text"
              placeholder="搜索热点内容..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="glass-input w-full h-10 px-5 pl-12 rounded-2xl text-text-primary placeholder-text-muted text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 text-text-muted" />
            {filters.search && (
              <button
                onClick={() => clearFilter('search')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 h-10 ml-4">
          <select
            value={filters.sourceType}
            onChange={(e) => updateFilter('sourceType', e.target.value as FilterState['sourceType'])}
            className="glass-select px-4 py-2.5 h-full rounded-2xl text-text-primary text-sm cursor-pointer"
          >
            <option value="all">全部来源</option>
            <option value="x">X (Twitter)</option>
            <option value="bing">Bing</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => updateFilter('priority', e.target.value as FilterState['priority'])}
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
              activeFilterCount > 0 && 'bg-primary/20 border-primary/40'
            )}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
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
            onClick={handleScan}
            disabled={scanning}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {scanning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5" />
              </motion.div>
            ) : (
              <Radar className="w-5 h-5" />
            )}
            <span>{scanning ? '扫描中...' : '立即扫描'}</span>
          </motion.button>

          {/* Stats Display */}
          <div className="hidden lg:flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted">今日</span>
              <span className="text-sm font-bold text-text-primary">{stats?.todayHotspots || 0}</span>
              <span className="text-xs text-text-muted">热点</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted">可信率</span>
              <span className="text-sm font-bold" style={{ color: '#7DCTAA' }}>{stats?.credibilityRate || 0}%</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <motion.span
                className={clsx('w-2 h-2 rounded-full', stats?.collectionStatus === 'running' ? 'bg-mint' : 'bg-gray-400')}
                animate={stats?.collectionStatus === 'running' ? {
                  boxShadow: ['0 0 8px rgba(125,205,170,0.8)', '0 0 16px rgba(125,205,170,1)', '0 0 8px rgba(125,205,170,0.8)']
                } : {}}
                transition={{ duration: 2, repeat: stats?.collectionStatus === 'running' ? Infinity : 0 }}
              />
              <span className="text-xs text-text-muted">{stats?.collectionStatus === 'running' ? '采集中' : '已停止'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 高级筛选面板 */}
      <AnimatePresence>
        {showFilterPanel && (
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
                    onClick={resetFilters}
                    className="text-xs text-text-muted hover:text-primary cursor-pointer underline"
                  >
                    重置全部
                  </button>
                )}
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20"
                >
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* 可信度筛选 */}
              <div>
                <label className="block text-xs text-text-muted mb-2">可信度</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'high', 'medium', 'low'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => updateFilter('credibility', level)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                        filters.credibility === level
                          ? 'bg-primary/30 text-primary border border-primary/50'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20'
                      )}
                    >
                      {level === 'all' ? '全部' :
                       level === 'high' ? '高度可信' :
                       level === 'medium' ? '中度可信' : '低度可信'}
                    </button>
                  ))}
                </div>
              </div>
              {/* 真假筛选 */}
              <div>
                <label className="block text-xs text-text-muted mb-2">内容真伪</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'all', label: '全部' },
                    { value: 'real', label: '真实', icon: Check, color: '#00B894' },
                    { value: 'fake', label: '虚假', icon: X, color: '#E17055' }
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateFilter('isReal', opt.value)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                        filters.isReal === opt.value
                          ? 'bg-primary/30 text-primary border border-primary/50'
                          : 'bg-white/10 text-text-secondary hover:bg-white/20'
                      )}
                    >
                      {opt.value !== 'all' && <opt.icon className="w-3 h-3" style={{ color: opt.color }} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Background */}
      <ParticleField count={20} color="rgba(201, 177, 255, 0.4)" className="absolute inset-0 z-0" />

      {/* Hotspots Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2 text-text-muted">加载中...</span>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
            <p className="text-sm text-text-muted mb-4">{error}</p>
            <button
              onClick={() => fetchHotspots()}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
            >
              重试
            </button>
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">未找到匹配的热点</h3>
            <p className="text-sm text-text-muted mb-4">尝试调整筛选条件或搜索关键词</p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
              >
                重置筛选
              </button>
            )}
          </motion.div>
        )}
      </div>
    </>
  )
}