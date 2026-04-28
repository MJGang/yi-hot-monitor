import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Radar, ChevronDown, Loader2, Repeat, MessageCircle, Heart, Eye, BadgeCheck, Clock, ShieldCheck, ShieldAlert, ShieldX, Shield, Flame, Thermometer, Zap, Leaf, Snowflake, Filter, X, Check, Download, Tag, Bookmark, ExternalLink, ArrowUp } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { ParticleField } from '@/components/ui/Particle'
import { GlareCard } from '@/components/ui/glare-card'
import { getHotspots, getStats, triggerScan, type Hotspot, type HotspotFilters, type Stats } from '@/lib/api'
import { io, Socket } from 'socket.io-client'

// 筛选器配置
interface FilterState {
  search: string
  sourceType: 'all' | 'x' | 'weibo' | 'web' | 'bilibili'
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

const IconWeibo = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#E6162D" d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.573h.014zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.578-.18-.401-.649.385-1.019.432-1.894-.003-2.421-.811-.974-2.724-.769-5.087-.027 0 0-.796.254-1.875.639-.709.253-1.561.557-2.2.793-.321.118-.505.273-.505.415 0 .263.607.772 1.448 1.025 1.337.402 3.7.6 5.477-.171 1.361-.594 2.3-1.564 2.146-2.394-.053-.287-.37-.422-.688-.318-.317.104-.52.349-.52.565.002.341-.19.729-.873 1.168-.277.179-.59.378-.946.594l-.996.582c-.18.1-.063.246.109.34.515.28 1.326.644 1.834.742.18.037.36-.024.493-.18.173-.201.173-.435.056-.632zm1.242-2.858c-.956-.534-2.156-.427-3.073.276-.917.702-1.167 1.927-.555 2.737.611.811 1.872 1.068 2.812.573.94-.494 1.198-1.721.572-2.74-.626-1.017-1.92-1.318-2.876-.787-.479.267-.816.672-.949 1.146l1.568.387c.111-.346.385-.623.736-.74.35-.117.727-.038.997.21.269.25.285.628.037.896l-1.269-.958zm1.098-2.148c-.332 1.2-1.47 1.992-2.694 1.992-1.225 0-2.31-.857-2.31-1.992s1.085-1.993 2.31-1.993c1.224 0 2.362.858 2.362 1.993H12.349zm5.174 2.036c.332.396.332.989-.005 1.37-.336.38-.924.486-1.367.226-.443-.26-.603-.801-.363-1.243.239-.442.79-.574 1.263-.353h-.001c.12.057.27.086.418.06.148-.026.277-.109.371-.221l1.17 1.148c-.232.272-.549.467-.906.555-.357.089-.731.045-1.064-.123-.337-.17-.585-.444-.712-.784-.126-.34-.098-.709.079-1.026l1.217-1.196v.487zm.545-3.274c1.466-.946 1.628-3.205.361-5.045-1.268-1.84-3.853-2.584-5.774-1.662-1.92.922-2.584 3.44-1.482 5.623 1.101 2.184 3.861 2.918 6.164 1.639.136-.075.256-.17.363-.277l.819.991c-.582.549-1.337.914-2.139 1.027-.802.113-1.615-.02-2.306-.378-1.378-.713-2.053-2.23-1.537-3.467l1.463-.844-.844-1.463-.844-.488-.488-.844-1.463.844c-1.238.516-2.755-.159-3.468-1.537-.713-1.378-.22-2.958.989-3.806l.991-.819c-.074.135-.166.254-.277.361-1.279 2.303-.545 5.063 1.639 6.164 2.183 1.102 4.701.438 5.623-1.482l.844-1.463-.844-1.463-.844-.488-.488-.844-1.463.844c-1.238.516-2.755-.159-3.468-1.537-.713-1.378-.492-3.014.508-4.019.999-1.006 2.535-1.382 3.908-.922l.991-.819c-1.183-1.9-.178-4.334 2.243-5.436 2.421-1.102 5.263-.178 6.344 2.064 1.082 2.242.178 4.882-2.019 5.897l-.991.82c.073-.136.165-.255.276-.362z"/>
  </svg>
)

const IconSogou = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#FB2C2C" d="M12.002 2C6.39 2.005 1.751 6.647 1.751 12.256c0 5.61 4.638 10.246 10.251 10.246 5.61 0 10.246-4.636 10.246-10.246S17.617 2.005 12.002 2zm0 15.112c-2.792 0-5.056-2.267-5.056-5.056 0-2.792 2.264-5.057 5.056-5.057 2.789 0 5.056 2.265 5.056 5.057 0 2.789-2.267 5.056-5.056 5.056zm-1.003-3.092h1.145v-4.17h-1.145v4.17z"/>
  </svg>
)

const IconBilibili = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#00A1D6" d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36l-3.626.002v1.334H3.375V9.347h1.38v4.048l-1.38.002V3.195l7.5-.002v1.46zM9.626 7.788c-.596-.016-1.093.44-1.11 1.018-.017.578.44 1.063 1.036 1.08.596.016 1.093-.44 1.11-1.018.017-.578-.44-1.063-1.036-1.08zm4.13.025c-.643-.018-1.17.466-1.18 1.08-.008.614.502 1.119 1.14 1.127.638.008 1.168-.475 1.176-1.089.009-.614-.502-1.116-1.136-1.118zm-6.196 2.771c-.596-.016-1.093.44-1.11 1.018-.017.578.44 1.063 1.036 1.08.596.016 1.093-.44 1.11-1.018.017-.578-.44-1.063-1.036-1.08zm8.67 4.583c.115.132.09.198.09.198h2.205s-.015-.304-.137-.513l-2.793-4.952v4.771l1.21 1.268-.575.228zm1.11-6.097h-.05l-1.632 2.944-1.67-2.96h-.06l.002 8.117h1.376V11.62l1.755 3.112h.036l1.74-3.112v5.557h1.376V9.07h-1.873z"/>
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
  const avatarColor = hotspot.authorAvatar && !hotspot.authorAvatar.startsWith('http')
    ? avatarColors[hotspot.authorAvatar] || 'linear-gradient(135deg, #888, #666)'
    : 'linear-gradient(135deg, #888, #666)'

  return (
    <GlareCard className="px-0 pt-0">
      <div className="cursor-pointer px-5 pt-4 pb-4 bg-white/90 border-gray-200 shadow-md shadow-gray-300/50 dark:bg-[#1c1c1e]/90 dark:border-white/10 dark:shadow-black/40" onClick={() => setExpanded(!expanded)}>
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
              {hotspot.sourceType === 'x' ? <IconX /> : hotspot.sourceType === 'weibo' ? <IconWeibo /> : hotspot.sourceType === 'web' ? <IconSogou /> : hotspot.sourceType === 'bilibili' ? <IconBilibili /> : <IconBing />}
              <span className="text-xs text-text-secondary">
                {hotspot.sourceType === 'x' ? 'X' : hotspot.sourceType === 'weibo' ? '微博' : hotspot.sourceType === 'web' ? '网页' : hotspot.sourceType === 'bilibili' ? 'B站' : 'Bing'}
              </span>
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
            {hotspot.url && (
              <a
                href={hotspot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4 text-text-muted" />
              </a>
            )}
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

        {/* Author info - B站/X/微博 显示 */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
          <div className="flex items-center gap-2 mt-3">
            {hotspot.authorAvatar?.startsWith('http') || hotspot.authorAvatar?.startsWith('//') ? (
              <img
                src={hotspot.authorAvatar?.startsWith('//') ? 'https:' + hotspot.authorAvatar : hotspot.authorAvatar}
                alt={hotspot.author}
                className="w-6 h-6 rounded-full shrink-0 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avatarColor }}>
                {hotspot.authorAvatar || 'UN'}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-secondary">{hotspot.author}</span>
              {hotspot.isVerified && <BadgeCheck className="w-4 h-4 text-sky shrink-0" />}
            </div>
          </div>
        )}

        {/* Time info - B站/X/微博 显示 */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
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
        )}

        {/* Stats row - B站/X/微博 显示 */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
          <div className="flex items-center gap-4 mt-3 py-2 border-t border-white/10">
            {hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' ? (
              <>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{formatNumber(hotspot.stats?.likes || 0)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{formatNumber(hotspot.stats?.comments || 0)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{formatNumber(hotspot.stats?.favorites || hotspot.stats?.reposts || 0)}</span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
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
  const [showNewToast, setShowNewToast] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const newCountRef = useRef(0) // 用来在 toast 中显示

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

  // WebSocket 连接 - 开发环境直连后端
  useEffect(() => {
    const socketUrl = import.meta.env.DEV ? 'http://localhost:3001' : '/'
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('scan:start', () => {
      setScanning(true)
      fetchStats()
    })

    socket.on('scan:complete', (data: { new_hotspots: number }) => {
      setScanning(false)
      if (data.new_hotspots > 0) {
        newCountRef.current = data.new_hotspots
        setShowNewToast(true)
        // 3秒后隐藏 toast
        setTimeout(() => setShowNewToast(false), 3000)
      }
      // 更新统计数据
      fetchStats()
    })

    // 获取初始状态
    fetchStats()

    return () => {
      socket.disconnect()
    }
  }, [fetchStats])

  // 处理扫描
  const handleScan = async () => {
    setScanning(true)
    try {
      await triggerScan()
      // 数据刷新由 WebSocket 推送处理，这里只需等待
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
      {/* 新内容提示 Toast */}
      <AnimatePresence>
        {showNewToast && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-mint/20 border border-mint/40 backdrop-blur-md shadow-lg cursor-pointer hover:bg-mint/30 transition-colors"
            onClick={() => {
              fetchHotspots()
              fetchStats()
              setShowNewToast(false)
            }}
          >
            <ArrowUp className="w-4 h-4 text-mint" />
            <span className="text-sm font-medium text-mint">发现 {newCountRef.current} 条新内容，点击查看</span>
          </motion.button>
        )}
      </AnimatePresence>

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
            <option value="weibo">微博</option>
            <option value="web">网页</option>
            <option value="bilibili">B站</option>
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