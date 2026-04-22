import { useState } from 'react'
import { Settings as SettingsIcon, Bell, Radar, Key, Eye, Sun, Moon, Monitor } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../hooks/useTheme'

const IconX = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const IconBing = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#008373" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
  </svg>
)

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [browserNotify, setBrowserNotify] = useState(true)
  const [emailNotify, setEmailNotify] = useState(true)
  const [quietHours, setQuietHours] = useState(false)
  const [autoScan, setAutoScan] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)

  const themeOptions = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ] as const

  return (
    <>
      {/* Toolbar */}
      <div className="liquid-glass flex items-center px-6 py-4" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
        <h2 className="font-display text-xl flex items-center gap-3">
          <span className="icon-pill w-12 h-12 rounded-2xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-coral-dark" />
          </span>
          <span className="text-text-primary font-semibold">系统设置</span>
        </h2>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">

        {/* Appearance Settings */}
        <section className="mb-8">
          <h3 className="font-display text-lg text-lavender-dark font-semibold mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" />
            外观设置
          </h3>
          <div className="liquid-card rounded-3xl overflow-hidden" style={{ borderRadius: '28px' }}>
            <div className="flex items-center justify-between p-5">
              <div>
                <div className="font-semibold text-text-primary">主题模式</div>
                <div className="text-text-secondary text-sm">选择应用的主题风格</div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all cursor-pointer',
                    theme === value
                      ? 'glass-btn-primary'
                      : 'glass-btn hover:bg-white/40'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="mb-8">
          <h3 className="font-display text-lg text-lavender-dark font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            通知设置
          </h3>
          <div className="liquid-card rounded-3xl overflow-hidden" style={{ borderRadius: '28px' }}>

            {/* Browser Notification */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div>
                <div className="font-semibold text-text-primary">浏览器通知</div>
                <div className="text-text-secondary text-sm">接收到热点时弹出浏览器通知</div>
              </div>
              <div className={clsx('toggle-switch', browserNotify && 'active')} onClick={() => setBrowserNotify(!browserNotify)} />
            </div>

            {/* Email Notification */}
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div>
                <div className="font-semibold text-text-primary">邮件通知</div>
                <div className="text-text-secondary text-sm">接收热点邮件通知</div>
              </div>
              <div className={clsx('toggle-switch', emailNotify && 'active')} onClick={() => setEmailNotify(!emailNotify)} />
            </div>

            {/* Email Address */}
            <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="font-semibold text-text-primary mb-2">接收邮箱</div>
              <input
                type="email"
                defaultValue="user@example.com"
                className="glass-input w-full px-4 py-3 rounded-2xl text-text-primary"
                placeholder="输入邮箱地址"
              />
            </div>

            {/* Notification Frequency */}
            <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="font-semibold text-text-primary mb-2">通知频率</div>
              <select className="glass-select w-full px-4 py-3 rounded-2xl text-text-primary cursor-pointer">
                <option value="realtime">实时通知</option>
                <option value="hourly">每小时汇总</option>
                <option value="daily">每日汇总</option>
                <option value="disabled">关闭</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold text-text-primary">静默时段</div>
                  <div className="text-text-secondary text-sm">在指定时间段内不发送通知</div>
                </div>
                <div className={clsx('toggle-switch', quietHours && 'active')} onClick={() => setQuietHours(!quietHours)} />
              </div>
              {quietHours && (
                <div className="flex items-center gap-3 mt-3">
                  <input type="time" defaultValue="22:00" className="glass-input flex-1 px-4 py-2.5 rounded-2xl text-text-primary" />
                  <span className="text-text-muted">至</span>
                  <input type="time" defaultValue="08:00" className="glass-input flex-1 px-4 py-2.5 rounded-2xl text-text-primary" />
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Monitor Settings */}
        <section className="mb-8">
          <h3 className="font-display text-lg text-coral-dark font-semibold mb-4 flex items-center gap-2">
            <Radar className="w-5 h-5" />
            监控设置
          </h3>
          <div className="liquid-card rounded-3xl overflow-hidden" style={{ borderRadius: '28px' }}>

            {/* Scan Interval */}
            <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="font-semibold text-text-primary mb-2">扫描间隔</div>
              <select className="glass-select w-full px-4 py-3 rounded-2xl text-text-primary cursor-pointer">
                <option value="15">每 15 分钟</option>
                <option value="30" selected>每 30 分钟</option>
                <option value="60">每 1 小时</option>
                <option value="120">每 2 小时</option>
              </select>
            </div>

            {/* Data Sources */}
            <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="font-semibold text-text-primary mb-3">数据源</div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7DCTAA' }} />
                  <span className="flex items-center gap-2">
                    <IconX />
                    <span className="text-text-primary">X (Twitter)</span>
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#7DCTAA' }} />
                  <span className="flex items-center gap-2">
                    <IconBing />
                    <span className="text-text-primary">Bing 搜索</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Auto Scan */}
            <div className="flex items-center justify-between p-5">
              <div>
                <div className="font-semibold text-text-primary">自动扫描</div>
                <div className="text-text-secondary text-sm">按设定间隔自动扫描新热点</div>
              </div>
              <div className={clsx('toggle-switch', autoScan && 'active')} onClick={() => setAutoScan(!autoScan)} />
            </div>

          </div>
        </section>

        {/* API Settings */}
        <section className="mb-8">
          <h3 className="font-display text-lg text-mint-dark font-semibold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            API 配置
          </h3>
          <div className="liquid-card rounded-3xl overflow-hidden" style={{ borderRadius: '28px' }}>

            {/* OpenRouter API Key */}
            <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="font-semibold text-text-primary mb-2">OpenRouter API Key</div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  defaultValue="sk-or-v1-xxxxx...xxxxx"
                  className="glass-input w-full px-4 py-3 pr-10 rounded-2xl text-text-primary font-mono text-sm"
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Twitter API Key */}
            <div className="p-5">
              <div className="font-semibold text-text-primary mb-2">Twitter API Key (可选)</div>
              <input
                type="password"
                placeholder="输入 Twitter API Key"
                className="glass-input w-full px-4 py-3 rounded-2xl text-text-primary placeholder-text-muted font-mono text-sm"
              />
            </div>

          </div>
        </section>
      </div>
    </>
  )
}
