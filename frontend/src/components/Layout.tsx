import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, Bell, Settings, Flame, Sun, Moon, Monitor } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '../hooks/useTheme'

const IconX = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const IconBing = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
    <path fill="#008373" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
  </svg>
)

export default function Layout() {
  const { theme, setTheme } = useTheme()

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <div className="window-frame">
      <div className="h-screen flex flex-col liquid-bg">
        {/* Title Bar */}
        <div className="liquid-glass h-12 flex items-center justify-between px-5" style={{ borderRadius: '0' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl liquid-glass flex items-center justify-center" style={{ padding: '0' }}>
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-coral to-lavender flex items-center justify-center shadow-sm">
                <Flame className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="font-display font-bold text-lg tracking-wide">
              <span className="text-coral">YI</span>
              <span className="text-text-primary">HOT</span>
              <span className="text-lavender">MONITOR</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="w-10 h-9 flex items-center justify-center hover:bg-white/20 rounded-xl transition-colors cursor-pointer rounded-2xl"
              title={`主题: ${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
            >
              <ThemeIcon className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden" style={{ padding: '12px' }}>
          {/* Sidebar */}
          <nav className="liquid-glass w-60 flex flex-col mr-4" style={{ borderRadius: '24px', padding: '8px' }}>
            <div className="flex-1 py-3">
              <NavLink
                to="/"
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
            <div className="p-4 mx-2 my-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.3)' }}>
              <div className="text-xs text-text-muted mb-2">数据来源</div>
              <div className="flex items-center gap-2">
                <span className="icon-pill px-3 py-1 rounded-full text-xs font-medium text-sky flex items-center gap-1.5">
                  <IconX /> X
                </span>
                <span className="icon-pill px-3 py-1 rounded-full text-xs font-medium text-mint flex items-center gap-1.5">
                  <IconBing /> Bing
                </span>
              </div>
            </div>
          </nav>

          {/* Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden liquid-glass" style={{ borderRadius: '24px' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
