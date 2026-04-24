"""
热点扫描服务

协调 Twitter 搜索、搜狗搜索、B站搜索、微博热搜、Bing搜索和 AI 分析
支持内容新鲜度过滤、并行搜索、账号检测
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker

from app.models import Keyword, Hotspot
from app.services.twitter import search_twitter, parse_tweet_to_hotspot
from app.services.china_search import search_sogou, search_bilibili_video, get_weibo_hotsearch, parse_china_result_to_hotspot
from app.services.search import search_bing, parse_bing_result_to_hotspot
from app.services.ai import batch_analyze
from app.services.account_detector import detect_account_type


# 内容新鲜度阈值：7天
MAX_AGE_HOURS = 7 * 24


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


def filter_by_freshness(results: list[dict]) -> list[dict]:
    """
    过滤内容新鲜度，只保留7天内的内容

    Args:
        results: 搜索结果列表

    Returns:
        过滤后的结果列表
    """
    cutoff = datetime.now(timezone(timedelta(hours=8))) - timedelta(hours=MAX_AGE_HOURS)
    filtered = []
    for item in results:
        published_at = item.get("published_at")
        # 没有发布时间的内容保留（如搜索引擎结果）
        if not published_at:
            filtered.append(item)
            continue
        # 转换为北京时间（如果需要）
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone(timedelta(hours=8)))
        if published_at >= cutoff:
            filtered.append(item)
    return filtered


async def scan_all_keywords(db: AsyncSession = None) -> dict:
    """
    扫描所有活跃关键词 + 微博热搜

    Returns:
        扫描结果统计
    """
    if not ScanLock.acquire():
        return {"status": "already_running", "new_hotspots": 0}

    # 总是创建自己的 session，避免外部 session 被关闭导致的问题
    should_close_db = True
    if db is not None:
        # 如果传入了外部 session，先关闭它
        try:
            await db.close()
        except:
            pass
    db = async_session_maker()

    try:
        total_new = 0

        # 1. 扫描所有活跃关键词
        result = await db.execute(select(Keyword).where(Keyword.is_active == True))
        keywords = result.scalars().all()

        for keyword in keywords:
            count = await scan_keyword(db, keyword)
            total_new += count
            # 每个关键词之间稍作延迟，避免请求过快
            await asyncio.sleep(2)

        # 2. 扫描微博热搜
        try:
            weibo_results = await get_weibo_hotsearch()
            if weibo_results:
                for result in weibo_results:
                    parsed = parse_china_result_to_hotspot(result, "微博热搜")
                    existing = await db.execute(
                        select(Hotspot).where(
                            Hotspot.source_id == parsed.get("source_id"),
                            Hotspot.source == "weibo"
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue
                    hotspot = Hotspot(
                        id=str(uuid.uuid4()),
                        title=parsed["title"][:500] if parsed["title"] else "Untitled",
                        content=parsed["content"][:5000] if parsed["content"] else "",
                        url=parsed.get("url", ""),
                        source="weibo",
                        source_id=parsed.get("source_id", ""),
                        author="微博热搜",
                        author_handle="",
                        author_avatar=None,
                        author_followers=0,
                        author_verified=False,
                        is_real=True,
                        relevance=50,
                        importance="medium",
                        summary=parsed["title"],
                        reason="微博实时热搜榜",
                        published_at=None,
                        view_count=0,
                        like_count=0,
                        retweet_count=0,
                        keyword_id=None
                    )
                    db.add(hotspot)
                    total_new += 1
                print(f"  Weibo hotsearch: found {len(weibo_results)} items")
        except Exception as e:
            print(f"  Weibo hotsearch error: {e}")

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

    # 检测是否为平台账号
    account_info = detect_account_type(keyword.text)
    if account_info["is_account"]:
        print(f"  Detected {account_info['platform']} account: {account_info['account_id']}")

    raw_results = []

    # 并行搜索所有数据源（使用 Promise.allSettled 模式，容错）
    async def safe_search_coro(name: str, coro):
        """安全执行搜索协程，捕获异常"""
        try:
            return await coro
        except Exception as e:
            print(f"  {name} search error: {e}")
            return [] if "search" in name.lower() else {"tweets": []} if "twitter" in name.lower() else {}

    # 并行执行所有搜索
    twitter_coro = safe_search_coro("Twitter", search_twitter(keyword.text, query_type="Latest", limit=5))
    sogou_coro = safe_search_coro("Sogou", search_sogou(keyword.text, limit=5))
    bilibili_coro = safe_search_coro("Bilibili", search_bilibili_video(keyword.text, limit=3))
    bing_coro = safe_search_coro("Bing", search_bing(keyword.text, limit=10))

    # 并发执行
    results = await asyncio.gather(
        twitter_coro, sogou_coro, bing_coro, bilibili_coro
    )
    twitter_result, sogou_result, bing_result, bilibili_result = results

    # 处理 Twitter 结果
    tweets = twitter_result.get("tweets", []) if isinstance(twitter_result, dict) else []
    for tweet in tweets:
        parsed = parse_tweet_to_hotspot(tweet, keyword.text)
        raw_results.append(parsed)
    print(f"  Twitter: found {len(tweets)} tweets")

    # 处理搜狗结果
    if isinstance(sogou_result, list):
        for result in sogou_result:
            parsed = parse_china_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Sogou: found {len(sogou_result)} results")

    # 处理B站结果
    if isinstance(bilibili_result, list):
        for result in bilibili_result:
            parsed = parse_china_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Bilibili: found {len(bilibili_result)} results")

    # 处理 Bing 结果
    if isinstance(bing_result, list):
        for result in bing_result:
            parsed = parse_bing_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Bing: found {len(bing_result)} results")

    if not raw_results:
        return 0

    # 内容新鲜度过滤（7天内）
    fresh_results = filter_by_freshness(raw_results)
    print(f"  Freshness filter: {len(raw_results)} -> {len(fresh_results)}")

    if not fresh_results:
        return 0

    # AI 分析
    analyzed = await batch_analyze(fresh_results, keyword.text)

    # 保存到数据库
    new_count = 0
    for hotspot_data in analyzed:
        # 过滤：relevance < 50 排除
        if hotspot_data.get("relevance", 50) < 50:
            continue

        # 检查是否已存在（通过 source_id 去重），过长时截断
        source_id = hotspot_data.get("source_id", "")
        if source_id:
            # source_id 最大 255 字符，超过则截断
            source_id = source_id[:255]
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
            view_count=hotspot_data.get("stats", {}).get("views") or hotspot_data.get("view_count"),
            like_count=hotspot_data.get("stats", {}).get("likes") or hotspot_data.get("like_count"),
            comment_count=hotspot_data.get("stats", {}).get("comments") or hotspot_data.get("comment_count"),
            coin_count=hotspot_data.get("stats", {}).get("coins") or hotspot_data.get("coin_count"),
            favorite_count=hotspot_data.get("stats", {}).get("favorites") or hotspot_data.get("favorite_count"),
            retweet_count=hotspot_data.get("stats", {}).get("reposts") or hotspot_data.get("retweet_count"),
            keyword_id=keyword.id
        )
        db.add(hotspot)
        new_count += 1

    await db.commit()
    print(f"  Saved {new_count} new hotspots for keyword: {keyword.text}")

    return new_count
