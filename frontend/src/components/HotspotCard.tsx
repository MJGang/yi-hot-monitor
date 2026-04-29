import { useState } from 'react'
import { ChevronDown, Heart, MessageCircle, Repeat, Eye, BadgeCheck, Clock, Download, ShieldCheck, Bookmark, Tag, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { GlareCard } from '@/components/ui/glare-card'
import { IconX, IconBing, IconWeibo, IconSogou, IconBilibili } from '@/components/icons/SourceIcons'
import { credibilityLevels, hotnessLevels, avatarColors } from '@/lib/constants'
import { formatDateTime, formatNumber, getCredibilityLevel, getHotnessLevel } from '@/lib/utils'
import type { Hotspot } from '@/lib/api'

interface HotspotCardProps {
  hotspot: Hotspot
}

export default function HotspotCard({ hotspot }: HotspotCardProps) {
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
            <SourceTag sourceType={hotspot.sourceType} />
            {hotspot.matchedKeywords?.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-lavender/20 text-lavender-dark border border-lavender/30">
                <Tag className="w-3 h-3" />
                {hotspot.matchedKeywords[0]}
              </span>
            )}
          </div>
          <CardActions
            isBookmarked={isBookmarked}
            onBookmark={() => setIsBookmarked(!isBookmarked)}
            url={hotspot.url}
            expanded={expanded}
            onToggleExpand={() => setExpanded(!expanded)}
          />
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

        {/* Author info - B站/X/微博 */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
          <AuthorInfo
            author={hotspot.author}
            authorAvatar={hotspot.authorAvatar}
            isVerified={hotspot.isVerified}
            avatarColor={avatarColor}
          />
        )}

        {/* Time info - B站/X/微博 */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
          <TimeInfo publishedAt={hotspot.publishedAt} capturedAt={hotspot.capturedAt} />
        )}

        {/* Stats row */}
        {(hotspot.sourceType === 'bilibili' || hotspot.sourceType === 'x' || hotspot.sourceType === 'weibo') && (
          <StatsRow sourceType={hotspot.sourceType} stats={hotspot.stats} />
        )}
      </div>

      {expanded && hotspot.aiReason && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
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

function SourceTag({ sourceType }: { sourceType: string }) {
  const icon = sourceType === 'x' ? <IconX /> : sourceType === 'weibo' ? <IconWeibo /> : sourceType === 'web' ? <IconSogou /> : sourceType === 'bilibili' ? <IconBilibili /> : <IconBing />
  const label = sourceType === 'x' ? 'X' : sourceType === 'weibo' ? '微博' : sourceType === 'web' ? '网页' : sourceType === 'bilibili' ? 'B站' : 'Bing'
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/20 bg-white/10">
      {icon}
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  )
}

function CardActions({ isBookmarked, onBookmark, url, expanded, onToggleExpand }: {
  isBookmarked: boolean
  onBookmark: () => void
  url: string | null
  expanded: boolean
  onToggleExpand: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <motion.button
        className="w-8 h-8 rounded-xl glass-btn flex items-center justify-center cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onBookmark() }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Bookmark className={clsx('w-4 h-4 transition-colors', isBookmarked ? 'text-primary fill-primary' : 'text-text-muted')} />
      </motion.button>
      {url && (
        <a
          href={url}
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
        onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronDown className={clsx('w-4 h-4 text-text-muted transition-transform duration-300', expanded && 'rotate-180')} />
      </motion.button>
    </div>
  )
}

function AuthorInfo({ author, authorAvatar, isVerified, avatarColor }: {
  author: string
  authorAvatar: string
  isVerified: boolean
  avatarColor: string
}) {
  return (
    <div className="flex items-center gap-2 mt-3">
      {authorAvatar?.startsWith('http') || authorAvatar?.startsWith('//') ? (
        <img
          src={authorAvatar?.startsWith('//') ? 'https:' + authorAvatar : authorAvatar}
          alt={author}
          className="w-6 h-6 rounded-full shrink-0 object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: avatarColor }}>
          {authorAvatar || 'UN'}
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-secondary">{author}</span>
        {isVerified && <BadgeCheck className="w-4 h-4 text-sky shrink-0" />}
      </div>
    </div>
  )
}

function TimeInfo({ publishedAt, capturedAt }: { publishedAt: string | null; capturedAt: string | null }) {
  return (
    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>发布于：{formatDateTime(publishedAt)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" />
        <span>抓取于：{formatDateTime(capturedAt)}</span>
      </div>
    </div>
  )
}

function StatsRow({ sourceType, stats }: { sourceType: string; stats: Hotspot['stats'] }) {
  if (sourceType === 'bilibili' || sourceType === 'x') {
    return (
      <div className="flex items-center gap-4 mt-3 py-2 border-t border-white/10">
        <StatItem icon={Heart} value={stats?.likes || 0} />
        <StatItem icon={MessageCircle} value={stats?.comments || 0} />
        <StatItem icon={Bookmark} value={stats?.favorites || stats?.reposts || 0} />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 mt-3 py-2 border-t border-white/10">
      <StatItem icon={Repeat} value={stats?.reposts || 0} />
      <StatItem icon={MessageCircle} value={stats?.comments || 0} />
      <StatItem icon={Heart} value={stats?.likes || 0} />
      <StatItem icon={Eye} value={stats?.views || 0} />
    </div>
  )
}

function StatItem({ icon: Icon, value }: { icon: typeof Heart; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-text-muted">
      <Icon className="w-3.5 h-3.5" />
      <span>{formatNumber(value)}</span>
    </div>
  )
}
