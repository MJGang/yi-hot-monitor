import { useState, useEffect, useCallback } from 'react'
import { Tag as KeywordIcon, Search, Plus, Edit2, Trash2, Cpu, Sparkles, Brain, Bot, Layers, Gem, Car, GraduationCap, Loader2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { getKeywords, createKeyword, deleteKeyword, toggleKeyword, type Keyword } from '@/lib/api'

const iconMap = {
  cpu: Cpu,
  sparkles: Sparkles,
  brain: Brain,
  bot: Bot,
  layers: Layers,
  gem: Gem,
  car: Car,
  graduation: GraduationCap
}

interface KeywordCardProps {
  keyword: Keyword
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function KeywordCard({ keyword, onToggle, onDelete }: KeywordCardProps) {
  const Icon = iconMap[keyword.icon] || Sparkles

  return (
    <div
      className={clsx('liquid-card rounded-2xl p-5 card-hover cursor-pointer', !keyword.isActive && 'opacity-50')}
      style={{ borderColor: getBorderColor(keyword.icon) }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="icon-pill w-10 h-10 rounded-xl flex items-center justify-center">
            <Icon className="w-5 h-5 text-mint-dark" />
          </span>
          <span className="font-semibold text-text-primary">{keyword.text}</span>
        </div>
        <div
          className={clsx('toggle-switch', keyword.isActive && 'active')}
          onClick={() => onToggle(keyword.id)}
        />
      </div>
      <div className="text-text-secondary text-sm mb-4">
        {keyword.isActive ? '监控中' : '已暂停'} · {keyword.hotspotCount} 条热点
      </div>
      <div className="flex gap-2">
        <button
          className="glass-btn p-2 rounded-xl cursor-pointer"
          onClick={() => {/* TODO: 编辑功能 */}}
        >
          <Edit2 className="w-4 h-4 text-lavender-dark" />
        </button>
        <button
          className="glass-btn p-2 rounded-xl cursor-pointer"
          onClick={() => onDelete(keyword.id)}
        >
          <Trash2 className="w-4 h-4 text-coral-dark" />
        </button>
      </div>
    </div>
  )
}

function getBorderColor(icon: string): string {
  const colors: Record<string, string> = {
    cpu: 'rgba(125, 205, 170, 0.3)',
    sparkles: 'rgba(201, 177, 255, 0.3)',
    brain: 'rgba(116, 185, 255, 0.3)',
    bot: 'rgba(255, 153, 200, 0.3)',
    layers: 'rgba(255, 217, 61, 0.3)',
    gem: 'rgba(255, 138, 128, 0.3)',
    car: 'rgba(160, 174, 192, 0.3)',
    graduation: 'rgba(160, 174, 192, 0.3)'
  }
  return colors[icon] || 'rgba(125, 205, 170, 0.3)'
}

export default function Keywords() {
  const [keywordList, setKeywordList] = useState<Keyword[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 获取关键词列表
  const fetchKeywords = useCallback(async () => {
    try {
      setError(null)
      const response = await getKeywords()
      setKeywordList(response.data)
    } catch (err) {
      setError('获取关键词失败')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeywords()
  }, [fetchKeywords])

  // 添加关键词
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return

    setSubmitting(true)
    try {
      const created = await createKeyword(newKeyword.trim())
      setKeywordList(prev => [created, ...prev])
      setNewKeyword('')
    } catch (err) {
      console.error('添加关键词失败', err)
      setError('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 切换关键词状态
  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleKeyword(id)
      setKeywordList(prev =>
        prev.map(k => k.id === id ? updated : k)
      )
    } catch (err) {
      console.error('切换状态失败', err)
    }
  }

  // 删除关键词
  const handleDelete = async (id: string) => {
    try {
      await deleteKeyword(id)
      setKeywordList(prev => prev.filter(k => k.id !== id))
    } catch (err) {
      console.error('删除失败', err)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="liquid-glass flex items-center justify-between px-6 py-4" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
        <h2 className="font-display text-xl flex items-center gap-3">
          <span className="icon-pill w-12 h-12 rounded-2xl flex items-center justify-center">
            <KeywordIcon className="w-6 h-6 text-mint-dark" />
          </span>
          <span className="text-text-primary font-semibold">监控关键词</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-text-muted">共 <span className="text-lavender font-bold font-display">{keywordList.length}</span> 个关键词</span>
        </div>
      </div>

      {/* Add Keyword */}
      <div className="liquid-glass px-6 py-5" style={{ borderRadius: '0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="输入关键词，如: GPT-5, Claude, AI Agent..."
              className="glass-input w-full px-5 py-4 pl-12 rounded-2xl text-text-primary placeholder-text-muted font-medium"
              disabled={submitting}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          </div>
          <button
            onClick={handleAddKeyword}
            disabled={submitting || !newKeyword.trim()}
            className="glass-btn-primary px-6 py-4 rounded-2xl text-text-primary font-semibold flex items-center gap-2 disabled:opacity-50"
            style={{ borderRadius: '20px' }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            添加
          </button>
        </div>
      </div>

      {/* Keywords Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2 text-text-muted">加载中...</span>
          </div>
        ) : error && keywordList.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-danger" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">加载失败</h3>
            <p className="text-sm text-text-muted mb-4">{error}</p>
            <button
              onClick={fetchKeywords}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors cursor-pointer"
            >
              重试
            </button>
          </div>
        ) : keywordList.length > 0 ? (
          keywordList.map((keyword) => (
            <KeywordCard
              key={keyword.id}
              keyword={keyword}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <KeywordIcon className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">暂无关键词</h3>
            <p className="text-sm text-text-muted mb-4">添加关键词开始监控热点</p>
          </div>
        )}
      </div>
    </>
  )
}