"""
热点扫描服务

协调 Twitter 搜索、Bing 搜索和 AI 分析
"""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker

from app.models import Keyword, Hotspot
from app.services.twitter import search_twitter, parse_tweet_to_hotspot
from app.services.search import search_bing, parse_bing_result_to_hotspot
from app.services.ai import batch_analyze


class ScanLock:
    """扫描锁，防止并发扫描"""
    _locked = False

    @classmethod
    def acquire(cls) -> bool:
        if cls._locked:
            return False
        cls._locked = True
        return True

    @classmethod
    def release(cls):
        cls._locked = False


async def scan_all_keywords(db: AsyncSession = None) -> dict:
    """
    扫描所有活跃关键词

    Returns:
        扫描结果统计
    """
    if not ScanLock.acquire():
        return {"status": "already_running", "new_hotspots": 0}

    # 如果没有传入 db，则自己创建 session
    should_close_db = False
    if db is None:
        db = async_session_maker()
        should_close_db = True

    try:
        # 获取所有活跃关键词
        result = await db.execute(select(Keyword).where(Keyword.is_active == True))
        keywords = result.scalars().all()

        total_new = 0
        for keyword in keywords:
            count = await scan_keyword(db, keyword)
            total_new += count
            # 每个关键词之间稍作延迟，避免请求过快
            await asyncio.sleep(2)

        return {"status": "completed", "new_hotspots": total_new}
    finally:
        ScanLock.release()
        if should_close_db:
            await db.close()


async def scan_keyword(db: AsyncSession, keyword: Keyword) -> int:
    """
    扫描单个关键词

    Args:
        db: 数据库会话
        keyword: 关键词对象

    Returns:
        新增热点数量
    """
    print(f"Scanning keyword: {keyword.text}")

    raw_results = []

    # 1. 从 Twitter 搜索
    try:
        twitter_results = await search_twitter(keyword.text, query_type="Latest", limit=1)
        tweets = twitter_results.get("tweets", [])
        for tweet in tweets:
            parsed = parse_tweet_to_hotspot(tweet, keyword.text)
            raw_results.append(parsed)
        print(f"  Twitter: found {len(tweets)} tweets")
    except Exception as e:
        print(f"  Twitter search error: {e}")

    # 2. 从 Bing 搜索
    try:
        bing_results = await search_bing(keyword.text, limit=10)
        for result in bing_results:
            parsed = parse_bing_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Bing: found {len(bing_results)} results")
    except Exception as e:
        print(f"  Bing search error: {e}")

    if not raw_results:
        return 0

    # 3. AI 分析
    analyzed = await batch_analyze(raw_results, keyword)

    # 4. 保存到数据库
    new_count = 0
    for hotspot_data in analyzed:
        # 检查是否已存在（通过 source_id 去重）
        source_id = hotspot_data.get("source_id")
        if source_id:
            existing = await db.execute(
                select(Hotspot).where(
                    Hotspot.source_id == source_id,
                    Hotspot.source == hotspot_data.get("source", "unknown")
                )
            )
            if existing.scalar_one_or_none():
                continue

        # 创建新热点
        hotspot = Hotspot(
            id=str(uuid.uuid4()),
            title=hotspot_data["title"][:500] if hotspot_data["title"] else "Untitled",
            content=hotspot_data["content"][:5000] if hotspot_data["content"] else "",
            url=hotspot_data.get("url", ""),
            source=hotspot_data.get("source", "unknown"),
            source_id=source_id or str(uuid.uuid4()),
            author=hotspot_data.get("author"),
            author_handle=hotspot_data.get("author_handle"),
            author_avatar=hotspot_data.get("author_avatar"),
            author_followers=hotspot_data.get("author_followers", 0),
            author_verified=hotspot_data.get("author_verified", False),
            is_real=hotspot_data.get("is_real", True),
            relevance=hotspot_data.get("relevance", 50),
            importance=hotspot_data.get("importance", "medium"),
            summary=hotspot_data.get("summary"),
            reason=hotspot_data.get("reason"),
            published_at=hotspot_data.get("published_at"),
            view_count=hotspot_data.get("view_count"),
            like_count=hotspot_data.get("like_count"),
            retweet_count=hotspot_data.get("retweet_count"),
            keyword_id=keyword.id
        )
        db.add(hotspot)
        new_count += 1

    await db.commit()
    print(f"  Saved {new_count} new hotspots for keyword: {keyword.text}")

    return new_count