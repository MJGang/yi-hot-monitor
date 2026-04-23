const API_BASE = '/api'

export interface HotspotStats {
  reposts: number
  comments: number
  likes: number
  views: number
}

export interface Hotspot {
  id: string
  title: string
  source: string
  author: string
  authorAvatar: string
  handle: string
  time: string
  publishedAt: string | null
  capturedAt: string | null
  priority: 'urgent' | 'high' | 'medium' | 'low'
  credibility: number
  isReal: boolean
  isVerified: boolean
  followers: number
  icon: 'flame' | 'brain' | 'gem' | 'bot' | 'monitor'
  stats: HotspotStats
  summary: string | null
  aiReason: string | null
  originalText: string | null
  url: string | null
  matchedKeywords: string[]
  sourceType: 'x' | 'bing'
}

export interface HotspotsResponse {
  data: Hotspot[]
  nextCursor: string | null
  total: number
}

export interface Stats {
  todayHotspots: number
  credibilityRate: number
  collectionStatus: 'running' | 'stopped'
}

export interface ScanResponse {
  status: 'started' | 'already_running'
  message: string
}

export interface Keyword {
  id: string
  text: string
  icon: 'cpu' | 'sparkles' | 'brain' | 'bot' | 'layers' | 'gem' | 'car' | 'graduation'
  hotspotCount: number
  isActive: boolean
  createdAt: string | null
}

export interface Notification {
  id: string
  title: string
  type: 'browser' | 'email'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  credibility: number
  isReal: boolean
  time: string
  source: string
  hotspotId: string | null
  createdAt: string | null
}

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  browserNotify: boolean
  emailNotify: boolean
  notifyEmail: string
  notifyFrequency: 'realtime' | 'hourly' | 'daily' | 'disabled'
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  scanInterval: number
  dataSources: { x: boolean; bing: boolean }
  autoScan: boolean
  openrouterApiKey: string
  twitterApiKey: string
}

export interface HotspotFilters {
  cursor?: string
  pageSize?: number
  search?: string
  sourceType?: 'all' | 'x' | 'bing'
  priority?: 'all' | 'urgent' | 'high' | 'medium' | 'low'
  credibility?: 'all' | 'high' | 'medium' | 'low'
  isReal?: 'all' | 'real' | 'fake'
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response.json()
}

export async function getHotspots(filters: HotspotFilters = {}): Promise<HotspotsResponse> {
  const params = new URLSearchParams()
  if (filters.cursor) params.set('cursor', filters.cursor)
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  if (filters.search) params.set('search', filters.search)
  if (filters.sourceType && filters.sourceType !== 'all') params.set('sourceType', filters.sourceType)
  if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority)
  if (filters.credibility && filters.credibility !== 'all') params.set('credibility', filters.credibility)
  if (filters.isReal && filters.isReal !== 'all') params.set('isReal', filters.isReal)

  const query = params.toString()
  return fetchJSON<HotspotsResponse>(`${API_BASE}/hotspots${query ? `?${query}` : ''}`)
}

export async function getStats(): Promise<Stats> {
  return fetchJSON<Stats>(`${API_BASE}/stats`)
}

export async function triggerScan(): Promise<ScanResponse> {
  return fetchJSON<ScanResponse>(`${API_BASE}/scan`, { method: 'POST' })
}

// Keywords API
export async function getKeywords(): Promise<{ data: Keyword[] }> {
  return fetchJSON<{ data: Keyword[] }>(`${API_BASE}/keywords`)
}

export async function createKeyword(text: string): Promise<Keyword> {
  return fetchJSON<Keyword>(`${API_BASE}/keywords`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
}

export async function updateKeyword(id: string, data: { text?: string }): Promise<Keyword> {
  return fetchJSON<Keyword>(`${API_BASE}/keywords/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteKeyword(id: string): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(`${API_BASE}/keywords/${id}`, { method: 'DELETE' })
}

export async function toggleKeyword(id: string): Promise<Keyword> {
  return fetchJSON<Keyword>(`${API_BASE}/keywords/${id}/toggle`, { method: 'PATCH' })
}

// Notifications API
export async function getNotifications(params?: { type?: string; page?: number; pageSize?: number }): Promise<{ data: Notification[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.set('type', params.type)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  const query = searchParams.toString()
  return fetchJSON<{ data: Notification[]; total: number }>(`${API_BASE}/notifications${query ? `?${query}` : ''}`)
}

export async function deleteNotification(id: string): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(`${API_BASE}/notifications/${id}`, { method: 'DELETE' })
}

export async function clearNotifications(): Promise<{ status: string }> {
  return fetchJSON<{ status: string }>(`${API_BASE}/notifications`, { method: 'DELETE' })
}

// Settings API
export async function getSettings(): Promise<Settings> {
  return fetchJSON<Settings>(`${API_BASE}/settings`)
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  return fetchJSON<Settings>(`${API_BASE}/settings`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}