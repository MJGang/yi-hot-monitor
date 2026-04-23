from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ============== Keyword Schemas ==============

class KeywordBase(BaseModel):
    text: str
    category: Optional[str] = None


class KeywordCreate(KeywordBase):
    pass


class KeywordResponse(BaseModel):
    """关键词响应模型"""
    id: str
    text: str
    icon: str = "sparkles"  # 图标标识
    hotspotCount: int = 0   # 关联热点数量
    isActive: bool = True   # 是否激活
    createdAt: Optional[str] = None  # ISO 格式时间

    class Config:
        from_attributes = True


class KeywordsListResponse(BaseModel):
    """关键词列表响应"""
    data: list[KeywordResponse]


# ============== Hotspot Schemas ==============

class HotspotStats(BaseModel):
    """热点统计数据"""
    reposts: int = 0
    comments: int = 0
    likes: int = 0
    views: int = 0


class HotspotResponse(BaseModel):
    """热点响应模型"""
    id: str
    title: str
    source: str
    author: str = ""
    authorAvatar: str = ""
    handle: str = ""
    time: str = ""
    publishedAt: Optional[str] = None
    capturedAt: Optional[str] = None
    priority: str = "low"  # urgent, high, medium, low
    credibility: int = 0   # 0-100
    isReal: bool = True
    isVerified: bool = False
    followers: int = 0
    icon: str = "flame"    # flame, brain, gem, bot, monitor
    stats: HotspotStats = HotspotStats()
    summary: Optional[str] = None
    aiReason: Optional[str] = None
    originalText: Optional[str] = None
    matchedKeywords: list[str] = []
    sourceType: str = "x"  # x, bing

    class Config:
        from_attributes = True


class HotspotsListResponse(BaseModel):
    """热点列表响应（无限滚动）"""
    data: list[HotspotResponse]
    nextCursor: Optional[str] = None  # 下一页游标
    total: int = 0                     # 总数量


# ============== Notification Schemas ==============

class NotificationResponse(BaseModel):
    """通知响应模型"""
    id: str
    title: str
    type: str = "browser"  # browser, email
    priority: str = "medium"  # urgent, high, medium, low
    credibility: int = 0     # 0-100
    isReal: bool = True
    time: str = ""           # 相对时间，如 "10分钟前"
    source: str = ""         # 来源描述，如 "X @OpenAI"
    hotspotId: Optional[str] = None
    createdAt: Optional[str] = None  # ISO 格式时间

    class Config:
        from_attributes = True


class NotificationsListResponse(BaseModel):
    """通知列表响应"""
    data: list[NotificationResponse]
    total: int = 0


# ============== Settings Schemas ==============

class SettingsResponse(BaseModel):
    """设置响应模型"""
    theme: str = "dark"                    # dark, light, system
    browserNotify: bool = True            # 浏览器通知
    emailNotify: bool = False             # 邮件通知
    notifyEmail: str = ""                 # 通知邮箱
    notifyFrequency: str = "realtime"     # 通知频率: realtime, hourly, daily, disabled
    quietHoursEnabled: bool = False       # 静默时段开关
    quietHoursStart: str = "22:00"        # 静默开始时间
    quietHoursEnd: str = "08:00"          # 静默结束时间
    scanInterval: int = 30                # 扫描间隔（分钟）
    dataSources: dict = {"x": True, "bing": True}  # 数据源
    autoScan: bool = True                 # 自动扫描
    openrouterApiKey: str = ""            # OpenRouter API Key
    twitterApiKey: str = ""               # Twitter API Key

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    """设置更新请求模型（支持部分更新）"""
    theme: Optional[str] = None
    browserNotify: Optional[bool] = None
    emailNotify: Optional[bool] = None
    notifyEmail: Optional[str] = None
    notifyFrequency: Optional[str] = None
    quietHoursEnabled: Optional[bool] = None
    quietHoursStart: Optional[str] = None
    quietHoursEnd: Optional[str] = None
    scanInterval: Optional[int] = None
    dataSources: Optional[dict] = None
    autoScan: Optional[bool] = None
    openrouterApiKey: Optional[str] = None
    twitterApiKey: Optional[str] = None


# ============== Stats Schemas ==============

class StatsResponse(BaseModel):
    """统计响应模型"""
    todayHotspots: int = 0      # 今日热点数
    credibilityRate: int = 0    # 可信度比率
    collectionStatus: str = "stopped"  # running, stopped


# ============== Scan Schemas ==============

class ScanResponse(BaseModel):
    """扫描响应模型"""
    status: str  # started, already_running
    message: str