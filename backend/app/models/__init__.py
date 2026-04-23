import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(String(255), unique=True, nullable=False)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hotspots = relationship("Hotspot", back_populates="keyword")


class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    url = Column(String(1000), nullable=False)
    source = Column(String(50), nullable=False)  # twitter, bing
    source_id = Column(String(255), nullable=True)
    is_real = Column(Boolean, default=True)
    relevance = Column(Integer, default=0)  # 0-100
    importance = Column(String(20), default="low")  # low, medium, high, urgent
    summary = Column(Text, nullable=True)
    view_count = Column(Integer, nullable=True)
    like_count = Column(Integer, nullable=True)
    retweet_count = Column(Integer, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
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
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text, nullable=False)
