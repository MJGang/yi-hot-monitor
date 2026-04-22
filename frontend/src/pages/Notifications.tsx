import { Bell, Trash2, CheckCircle, Zap, CircleDot, Flame } from 'lucide-react'
import { clsx } from 'clsx'

interface Notification {
  id: number
  title: string
  type: 'browser' | 'email'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  credibility: number
  isReal: boolean
  time: string
  source: string
  icon: 'flame' | 'zap' | 'alert' | 'circle' | 'check'
}

const notifications: Notification[] = [
  {
    id: 1,
    title: 'GPT-5 即将发布？OpenAI CEO 暗示重大更新',
    type: 'browser',
    priority: 'urgent',
    credibility: 92,
    isReal: true,
    time: '10分钟前',
    source: 'X @OpenAI',
    icon: 'flame'
  },
  {
    id: 2,
    title: 'Claude 3.5 发布：超越 GPT-4 的推理能力',
    type: 'email',
    priority: 'high',
    credibility: 95,
    isReal: true,
    time: '25分钟前',
    source: 'Bing',
    icon: 'zap'
  },
  {
    id: 3,
    title: '某公司宣称突破性 AI 技术被指虚假宣传',
    type: 'browser',
    priority: 'high',
    credibility: 23,
    isReal: false,
    time: '32分钟前',
    source: 'X @TechCrunch',
    icon: 'alert'
  },
  {
    id: 4,
    title: 'Google Gemini 2.0 路线图泄露，更多能力即将到来',
    type: 'email',
    priority: 'medium',
    credibility: 78,
    isReal: true,
    time: '1小时前',
    source: 'Bing',
    icon: 'circle'
  },
  {
    id: 5,
    title: 'Meta 发布开源 AI 助手，支持 100+ 语言',
    type: 'browser',
    priority: 'low',
    credibility: 85,
    isReal: true,
    time: '2小时前',
    source: 'X @MetaAI',
    icon: 'check'
  }
]

const priorityConfig = {
  urgent: { icon: Flame, badge: 'badge-urgent', color: '#E57373', bg: 'linear-gradient(135deg, rgba(255,138,128,0.5), rgba(255,153,200,0.5))' },
  high: { icon: Zap, badge: 'badge-high', color: '#4A9EE8', bg: 'linear-gradient(135deg, rgba(116,185,255,0.5), rgba(201,177,255,0.5))' },
  medium: { icon: CircleDot, badge: 'badge-medium', color: '#B88A00', bg: 'linear-gradient(135deg, rgba(255,217,61,0.5), rgba(255,170,165,0.5))' },
  low: { icon: CheckCircle, badge: 'badge-low', color: '#5FB88F', bg: 'linear-gradient(135deg, rgba(125,205,170,0.5), rgba(168,230,207,0.5))' }
}

const priorityLabels = { urgent: '紧急', high: '高优', medium: '中等', low: '低' }

export default function Notifications() {
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
          <select className="glass-select px-4 py-2.5 rounded-2xl text-text-primary text-sm cursor-pointer">
            <option value="all">全部类型</option>
            <option value="browser">浏览器</option>
            <option value="email">邮件</option>
          </select>
          <button className="glass-btn px-4 py-2.5 rounded-2xl text-danger text-sm font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            清空记录
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notifications.map((notification) => {
          const config = priorityConfig[notification.priority]
          const Icon = config.icon
          return (
            <div
              key={notification.id}
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
                      {priorityLabels[notification.priority]}
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
                <button className="glass-btn p-2 rounded-xl text-text-muted hover:text-text-primary cursor-pointer">
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
