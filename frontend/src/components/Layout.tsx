import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, Bell, Settings, Flame, Sun, Moon, Monitor } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../hooks/useTheme'
import { getSettings } from '../lib/api'
import { IconX, IconBing, IconWeibo, IconSogou, IconBilibili } from './icons/SourceIcons'

const SOURCE_DEFS = [
  { key: 'x', label: 'X', icon: IconX, color: 'text-sky' },
  { key: 'bing', label: 'Bing', icon: IconBing, color: 'text-mint' },
  { key: 'sogou', label: '搜狗', icon: IconSogou, color: 'text-coral' },
  { key: 'bilibili', label: 'B站', icon: IconBilibili, color: 'text-blue' },
  { key: 'weibo', label: '微博', icon: IconWeibo, color: 'text-danger' },
]

const themeLabels: Record<string, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
}

export default function Layout() {
  const { theme, setTheme } = useTheme()
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({})

  useEffect(() => {
    getSettings().then(data => {
      setEnabledSources(data.dataSources || {})
    }).catch(() => {})
  }, [])

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <div className="window-frame">
      <div className="h-screen flex flex-col liquid-bg">
        {/* Main Content - Title Bar removed, freed 48px vertical space */}
        <div className="flex-1 flex overflow-hidden" style={{ padding: '12px' }}>
          {/* Sidebar - Brand, Navigation, Sources, Theme all in one */}
          <nav className="liquid-glass w-60 flex flex-col mr-4" style={{ borderRadius: '24px', padding: '8px' }}>
            {/* Brand Logo - moved from Title Bar */}
            <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-coral to-lavender flex items-center justify-center shadow-sm shrink-0">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-base tracking-wide">
                <span className="text-coral">YI</span>
                <span className="text-text-primary">HOT</span>
                <span className="text-lavender">MONITOR</span>
              </span>
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-white/10" />

            {/* Navigation */}
            <div className="flex-1 py-3">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  clsx('nav-item flex items-center gap-3 px-4 py-3 cursor-pointer', isActive ? 'active text-text-primary' : 'text-text-secondary')
                }
              >
                <span className="icon-pill w-10 h-10 rounded-2xl flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-lavender-dark" />
                </span>
                <span className="font-medium">仪表盘</span>
              </NavLink>
              <NavLink
                to="/keywords"
                className={({ isActive }) =>
                  clsx('nav-item flex items-center gap-3 px-4 py-3 cursor-pointer', isActive ? 'active text-text-primary' : 'text-text-secondary')
                }
              >
                <span className="icon-pill w-10 h-10 rounded-2xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-mint-dark" />
                </span>
                <span className="font-medium">关键词</span>
              </NavLink>
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  clsx('nav-item flex items-center gap-3 px-4 py-3 cursor-pointer', isActive ? 'active text-text-primary' : 'text-text-secondary')
                }
              >
                <span className="icon-pill w-10 h-10 rounded-2xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-coral-dark" />
                </span>
                <span className="font-medium">通知记录</span>
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  clsx('nav-item flex items-center gap-3 px-4 py-3 cursor-pointer', isActive ? 'active text-text-primary' : 'text-text-secondary')
                }
              >
                <span className="icon-pill w-10 h-10 rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-coral-dark" />
                </span>
                <span className="font-medium">设置</span>
              </NavLink>
            </div>

            {/* Data Sources */}
            <div className="p-3 mx-2 my-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="text-xs text-text-muted mb-2">数据来源</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SOURCE_DEFS.map(({ key, label, icon: Icon, color }) =>
                  enabledSources[key] ? (
                    <span key={key} className={`icon-pill px-2.5 py-1 rounded-full text-xs font-medium ${color} flex items-center gap-1`}>
                      <Icon className="w-3 h-3" /> {label}
                    </span>
                  ) : null
                )}
              </div>
            </div>

            {/* Theme Toggle - moved from Title Bar */}
            <button
              onClick={cycleTheme}
              className="flex items-center gap-3 mx-2 mt-1.5 mb-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title={`主题: ${themeLabels[theme]}`}
            >
              <span className="icon-pill w-8 h-8 rounded-lg flex items-center justify-center bg-white/10">
                <ThemeIcon className="w-4 h-4 text-text-secondary" />
              </span>
              <span className="text-xs text-text-muted">
                主题 · {themeLabels[theme]}
              </span>
            </button>
          </nav>

          {/* Content Area - now full height */}
          <main className="flex-1 flex flex-col overflow-hidden liquid-glass" style={{ borderRadius: '24px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
