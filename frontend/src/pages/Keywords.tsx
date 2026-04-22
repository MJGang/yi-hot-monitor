import { useState } from 'react'
import { Tag as KeywordIcon, Search, Plus, Edit2, Trash2, Cpu, Sparkles, Brain, Bot, Layers, Gem, Car, GraduationCap } from 'lucide-react'
import { clsx } from 'clsx'

interface Keyword {
  id: number
  name: string
  icon: 'cpu' | 'sparkles' | 'brain' | 'bot' | 'layers' | 'gem' | 'car' | 'graduation'
  hotspotCount: number
  active: boolean
  borderColor: string
}

const keywords: Keyword[] = [
  { id: 1, name: 'AI 大模型', icon: 'cpu', hotspotCount: 23, active: true, borderColor: 'rgba(125, 205, 170, 0.3)' },
  { id: 2, name: 'GPT-5', icon: 'sparkles', hotspotCount: 12, active: true, borderColor: 'rgba(201, 177, 255, 0.3)' },
  { id: 3, name: 'Claude 3.5', icon: 'brain', hotspotCount: 8, active: true, borderColor: 'rgba(116, 185, 255, 0.3)' },
  { id: 4, name: 'AI Agent', icon: 'bot', hotspotCount: 15, active: true, borderColor: 'rgba(255, 153, 200, 0.3)' },
  { id: 5, name: 'Llama 3', icon: 'layers', hotspotCount: 6, active: true, borderColor: 'rgba(255, 217, 61, 0.3)' },
  { id: 6, name: 'Gemini 2.0', icon: 'gem', hotspotCount: 4, active: true, borderColor: 'rgba(255, 138, 128, 0.3)' },
  { id: 7, name: '自动驾驶', icon: 'car', hotspotCount: 5, active: false, borderColor: 'rgba(160, 174, 192, 0.3)' },
  { id: 8, name: '机器学习', icon: 'graduation', hotspotCount: 3, active: false, borderColor: 'rgba(160, 174, 192, 0.3)' }
]

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

export default function Keywords() {
  const [keywordList, setKeywordList] = useState(keywords)
  const [newKeyword, setNewKeyword] = useState('')

  const toggleKeyword = (id: number) => {
    setKeywordList(keywords =>
      keywords.map(k =>
        k.id === id ? { ...k, active: !k.active } : k
      )
    )
  }

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    const newId = Math.max(...keywordList.map(k => k.id)) + 1
    setKeywordList([
      ...keywordList,
      {
        id: newId,
        name: newKeyword,
        icon: 'cpu',
        hotspotCount: 0,
        active: true,
        borderColor: 'rgba(125, 205, 170, 0.3)'
      }
    ])
    setNewKeyword('')
  }

  const deleteKeyword = (id: number) => {
    setKeywordList(keywordList.filter(k => k.id !== id))
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
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="输入关键词，如: GPT-5, Claude, AI Agent..."
              className="glass-input w-full px-5 py-4 pl-12 rounded-2xl text-text-primary placeholder-text-muted font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          </div>
          <button
            onClick={addKeyword}
            className="glass-btn-primary px-6 py-4 rounded-2xl text-text-primary font-semibold flex items-center gap-2"
            style={{ borderRadius: '20px' }}
          >
            <Plus className="w-5 h-5" />
            添加
          </button>
        </div>
      </div>

      {/* Keywords Grid */}
      <div className="flex-1 overflow-y-auto p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
        {keywordList.map((keyword) => {
          const Icon = iconMap[keyword.icon]
          return (
            <div
              key={keyword.id}
              className={clsx('liquid-card rounded-2xl p-5 card-hover cursor-pointer', !keyword.active && 'opacity-50')}
              style={{ borderColor: keyword.borderColor }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="icon-pill w-10 h-10 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-mint-dark" />
                  </span>
                  <span className="font-semibold text-text-primary">{keyword.name}</span>
                </div>
                <div
                  className={clsx('toggle-switch', keyword.active && 'active')}
                  onClick={() => toggleKeyword(keyword.id)}
                />
              </div>
              <div className="text-text-secondary text-sm mb-4">
                {keyword.active ? '监控中' : '已暂停'} · {keyword.hotspotCount} 条热点
              </div>
              <div className="flex gap-2">
                <button className="glass-btn p-2 rounded-xl cursor-pointer">
                  <Edit2 className="w-4 h-4 text-lavender-dark" />
                </button>
                <button
                  className="glass-btn p-2 rounded-xl cursor-pointer"
                  onClick={() => deleteKeyword(keyword.id)}
                >
                  <Trash2 className="w-4 h-4 text-coral-dark" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
