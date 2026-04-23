import { useState, useEffect, useCallback } from 'react'
import { Bell, Trash2, CheckCircle, Zap, CircleDot, Flame, Loader2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { getNotifications, deleteNotification, clearNotifications, type Notification } from '@/lib/api'

const priorityConfig = {
  urgent: { icon: Flame, badge: 'badge-urgent', color: '#E57373', bg: 'linear-gradient(135deg, rgba(255,138,128,0.5), rgba(255,153,200,0.5))' },
  high: { icon: Zap, badge: 'badge-high', color: '#4A9EE8', bg: 'linear-gradient(135deg, rgba(116,185,255,0.5), rgba(201,177,255,0.5))' },
  medium: { icon: CircleDot, badge: 'badge-medium', color: '#B88A00', bg: 'linear-gradient(135deg, rgba(255,217,61,0.5), rgba(255,170,165,0.5))' },
  low: { icon: CheckCircle, badge: 'badge-low', color: '#5FB88F', bg: 'linear-gradient(135deg, rgba(125,205,170,0.5), rgba(168,230,207,0.5))' }
}

const priorityLabels = { urgent: '紧急', high: '高优', medium: '中等', low: '低' }

interface NotificationItemProps {
  notification: Notification
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onDelete }: NotificationItemProps) {
  const config = priorityConfig[notification.priority] || priorityConfig.medium
  const Icon = config.icon

  return (
    <div
      className="liquid-card rounded-2xl p-5 card-hover"
      style={{ borderColor: notification.isReal ? 'rgba(0,184,148,0.3)' : 'rgba(225,112,85,0.3)' }}
    >
      <div className="flex items-start gap-4">
        <span
          className="icon-pill w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: config.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx('px-3 py-1 text-xs font-semibold rounded-full text-white', config.badge)}>
              {priorityLabels[notification.priority] || '中等'}
            </span>
            <span
              className="px-3 py-1 text-xs font-semibold rounded-full"
              style={{ background: notification.type === 'browser' ? 'rgba(116,185,255,0.2)' : 'rgba(125,205,170,0.2)', color: notification.type === 'browser' ? '#74B9FF' : '#5FB88F' }}
            >
              {notification.type === 'browser' ? '浏览器' : '邮件'}
            </span>
            <span className="text-text-muted text-sm ml-auto">{notification.time}</span>
          </div>
          <h4 className="font-semibold text-text-primary mb-1">{notification.title}</h4>
          <p className="text-text-secondary text-sm">
            AI分析: {notification.isReal ? '真实' : '假冒'} (置信度 {notification.credibility}%) · 来源: {notification.source}
          </p>
        </div>
        <button
          onClick={() => onDelete(notification.id)}
          className="glass-btn p-2 rounded-xl text-text-muted hover:text-text-primary cursor-pointer"
        >
          <span className="text-xl">×</span>
        </button>
      </div>
    </div>
  )
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'browser' | 'email'>('all')

  // 获取通知列表
  const fetchNotifications = useCallback(async () => {
    try {
      setError(null)
      const response = await getNotifications({ type: filterType })
      setNotifications(response.data)
    } catch (err) {
      setError('获取通知失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // 删除单条通知
  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) {
      console.error('删除失败', err)
    }
  }

  // 清空所有通知
  const handleClearAll = async () => {
    if (!confirm('确定要清空所有通知吗？')) return

    try {
      await clearNotifications()
      setNotifications([])
    } catch (err) {
      console.error('清空失败', err)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="liquid-glass flex items-center justify-between px-6 py-4" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
        <h2 className="font-display text-xl flex items-center gap-3">
          <span className="icon-pill w-12 h-12 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-coral-dark" />
          </span>
          <span className="text-text-primary font-semibold">通知记录</span>
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'browser' | 'email')}
            className="glass-select px-4 py-2.5 rounded-2xl text-text-primary text-sm cursor-pointer"
          >
            <option value="all">全部类型</option>
            <option value="browser">浏览器</option>
            <option value="email">邮件</option>
          </select>
          <button
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="glass-btn px-4 py-2.5 rounded-2xl text-danger text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            清空记录
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2 text-text-muted">加载中...</span>
          </div>
        ) : error && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
            <p className="text-sm text-text-muted mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
            >
              重试
            </button>
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">暂无通知</h3>
            <p className="text-sm text-text-muted">发现热点时会发送通知</p>
          </div>
        )}
      </div>
    </>
  )
}