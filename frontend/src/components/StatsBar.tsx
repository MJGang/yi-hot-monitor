import { Flame, Zap, ShieldCheck, Radar } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import type { Stats } from '@/lib/api'

interface StatsBarProps {
  stats: Stats | null
  totalHotspots: number
  scanning: boolean
}

export default function StatsBar({ stats, totalHotspots, scanning }: StatsBarProps) {
  return (
    <div className="relative z-10 px-4 sm:px-6 pt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Flame}
          iconBg="bg-primary/15"
          iconColor="text-primary"
          label="热点总数"
          value={stats ? stats.totalHotspots.toLocaleString() : totalHotspots.toLocaleString() || '0'}
        />
        <StatCard
          icon={Zap}
          iconBg="bg-sky/15"
          iconColor="text-sky"
          label="今日新增"
          value={stats?.todayHotspots?.toLocaleString() || '0'}
        />
        <StatCard
          icon={ShieldCheck}
          iconBg="bg-success/15"
          iconColor="text-success"
          label="可信率"
          value={`${stats?.credibilityRate || 0}%`}
          valueColor="#7DCTAA"
        />
        <CollectStatusCard scanning={scanning} />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, valueColor }: {
  icon: typeof Flame
  iconBg: string
  iconColor: string
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={clsx('w-5 h-5', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted truncate">{label}</p>
        <p className="text-xl font-bold text-text-primary tabular-nums leading-tight" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </p>
      </div>
    </div>
  )
}

function CollectStatusCard({ scanning }: { scanning: boolean }) {
  return (
    <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', scanning ? 'bg-mint/15' : 'bg-gray-400/15')}>
        <Radar className={clsx('w-5 h-5', scanning ? 'text-mint' : 'text-gray-400')} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted truncate">采集状态</p>
        <div className="flex items-center gap-1.5">
          <motion.span
            className={clsx('w-2 h-2 rounded-full', scanning ? 'bg-mint' : 'bg-gray-400')}
            animate={scanning ? {
              boxShadow: ['0 0 6px rgba(125,205,170,0.8)', '0 0 12px rgba(125,205,170,1)', '0 0 6px rgba(125,205,170,0.8)'],
            } : {}}
            transition={{ duration: 2, repeat: scanning ? Infinity : 0 }}
          />
          <span className="text-sm font-semibold text-text-primary">
            {scanning ? '采集中' : '已停止'}
          </span>
        </div>
      </div>
    </div>
  )
}
