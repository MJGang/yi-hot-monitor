import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def beijing_now():
    """返回北京时间（UTC+8）的当前时间"""
    return datetime.now(timezone(timedelta(hours=8)))


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(String(255), unique=True, nullable=False)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=beijing_now)
    updated_at = Column(DateTime, default=beijing_now, onupdate=beijing_now)

    hotspots = relationship("Hotspot", back_populates="keyword")


class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    url = Column(String(1000), nullable=False)
    source = Column(String(50), nullable=False)  # twitter, bing
    source_id = Column(String(255), nullable=True)
    # 作者信息
    author = Column(String(255), nullable=True)
    author_handle = Column(String(255), nullable=True)
    author_avatar = Column(String(500), nullable=True)
    author_followers = Column(Integer, default=0)
    author_verified = Column(Boolean, default=False)
    # 内容属性
    is_real = Column(Boolean, default=True)
    relevance = Column(Integer, default=0)  # 0-100
    importance = Column(String(20), default="low")  # low, medium, high, urgent
    summary = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)  # AI 分析理由
    view_count = Column(Integer, nullable=True)
    like_count = Column(Integer, nullable=True)
    comment_count = Column(Integer, nullable=True)  # 评论/弹幕数
    coin_count = Column(Integer, nullable=True)  # B站投币
    favorite_count = Column(Integer, nullable=True)  # B站收藏
    retweet_count = Column(Integer, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=beijing_now)
    keyword_id = Column(String(36), ForeignKey("keywords.id"), nullable=True)

    keyword = relationship("Keyword", back_populates="hotspots")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String(50), nullable=False)  # hotspot, alert
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    hotspot_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=beijing_now)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)
