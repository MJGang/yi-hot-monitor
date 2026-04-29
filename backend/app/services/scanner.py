"""
热点扫描服务

协调 Twitter 搜索、搜狗搜索、B站搜索、微博热搜、Bing搜索和 AI 分析
支持内容新鲜度过滤、并行搜索、账号检测
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker

from app.models import Keyword, Hotspot, Setting
from app.services.twitter import search_twitter, parse_tweet_to_hotspot
from app.services.china_search import search_sogou, search_bilibili_video, get_weibo_hotsearch, parse_china_result_to_hotspot
from app.services.search import search_bing, parse_bing_result_to_hotspot
from app.services.ai import batch_analyze
from app.services.account_detector import detect_account_type
from app.websocket import notify_scan_complete, notify_scan_start


# 内容新鲜度阈值：7天
MAX_AGE_HOURS = 7 * 24

# Redis 锁释放 Lua 脚本：只释放自己持有的锁，防止误删
RELEASE_LOCK_SCRIPT = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
"""


async def _get_redis_or_none():
    """获取 Redis 客户端，不可用时返回 None"""
    try:
        from app.redis import get_redis
        return await get_redis()
    except Exception:
        return None


async def acquire_scan_lock(ttl: int = 60) -> str | None:
    """
    获取扫描分布式锁。返回锁 token，None 表示已被其他人持有。
    Redis 不可用时降级放行，允许扫描继续。
    """
    redis = await _get_redis_or_none()
    if redis is None:
        return "unlocked"

    token = str(uuid.uuid4())
    acquired = await redis.set("lock:scan", token, nx=True, ex=ttl)
    return token if acquired else None


async def release_scan_lock(token: str | None):
    """释放扫描锁"""
    if token is None or token == "unlocked":
        return

    redis = await _get_redis_or_none()
    if redis:
        await redis.eval(RELEASE_LOCK_SCRIPT, 1, "lock:scan", token)


async def scan_is_locked() -> bool:
    """判断扫描是否在运行中"""
    redis = await _get_redis_or_none()
    if redis is None:
        return False
    try:
        return bool(await redis.exists("lock:scan"))
    except Exception:
        return False


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


async def is_url_seen(redis, source_id: str, source: str) -> bool:
    """Redis 层快速去重：检查 URL 是否已处理过"""
    if redis is None:
        return False
    try:
        key = f"{source}:{source_id}"
        return bool(await redis.sismember("hotspot:seen_urls", key))
    except Exception:
        return False


async def mark_url_seen(redis, source_id: str, source: str):
    """Redis 层记录 URL 已处理"""
    if redis is None:
        return
    try:
        key = f"{source}:{source_id}"
        await redis.sadd("hotspot:seen_urls", key)
    except Exception:
        pass


async def _get_enabled_sources(db: AsyncSession) -> dict:
    """从数据库读取启用的数据源配置"""
    try:
        result = await db.execute(select(Setting).where(Setting.key == "data_sources"))
        row = result.scalar_one_or_none()
        if row and row.value:
            return json.loads(row.value)
    except Exception:
        pass
    return {"x": True, "bing": True, "sogou": True, "bilibili": True, "weibo": True}


async def scan_all_keywords(db: AsyncSession = None) -> dict:
    """
    扫描所有活跃关键词 + 微博热搜

    Returns:
        扫描结果统计
    """
    print("[Scanner] scan_all_keywords started")
    lock_token = await acquire_scan_lock()
    print(f"[Scanner] scan_all_keywords lock token: {lock_token}")
    if lock_token is None:
        return {"status": "already_running", "new_hotspots": 0}
    print("[Scanner] scan_all_keywords lock acquired")
    redis = await _get_redis_or_none()
    print("[Scanner] scan_all_keywords redis")

    # 立即通知前端扫描开始
    try:
        await notify_scan_start()
        print("[Scanner] notified frontend: scan started")
    except Exception as e:
        print(f"[Scanner] notify_scan_start error: {e}")

    # 总是创建自己的 session，避免外部 session 被关闭导致的问题
    should_close_db = True
    if db is not None:
        try:
            await db.close()
        except Exception:
            pass
        db = None

    total_new = 0
    try:
        db = async_session_maker()

        # 读取启用的数据源配置
        enabled_sources = await _get_enabled_sources(db)

        # 1. 扫描所有活跃关键词
        result = await db.execute(select(Keyword).where(Keyword.is_active == True))
        keywords = result.scalars().all()

        for keyword in keywords:
            count = await scan_keyword(db, keyword, redis, enabled_sources)
            total_new += count
            # 每个关键词之间稍作延迟，避免请求过快
            await asyncio.sleep(2)

        # 2. 扫描微博热搜（受数据源开关控制）
        if enabled_sources.get("weibo", True):
            try:
                weibo_results = await get_weibo_hotsearch()
                if weibo_results:
                    for result in weibo_results:
                        parsed = parse_china_result_to_hotspot(result, "微博热搜")
                        source_id = parsed.get("source_id", "")

                        # Redis 快速去重
                        if await is_url_seen(redis, source_id, "weibo"):
                            continue

                        # 数据库去重（双重保险）
                        existing = await db.execute(
                            select(Hotspot).where(
                                Hotspot.source_id == source_id,
                                Hotspot.source == "weibo"
                            )
                        )
                        if existing.scalar_one_or_none():
                            await mark_url_seen(redis, source_id, "weibo")
                            continue

                        hotspot = Hotspot(
                            id=str(uuid.uuid4()),
                            title=parsed["title"][:500] if parsed["title"] else "Untitled",
                            content=parsed["content"][:5000] if parsed["content"] else "",
                            url=parsed.get("url", ""),
                            source="weibo",
                            source_id=source_id,
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
                        await mark_url_seen(redis, source_id, "weibo")
                        total_new += 1
                    print(f"  Weibo hotsearch: found {len(weibo_results)} items")
            except Exception as e:
                print(f"  Weibo hotsearch error: {e}")

        await db.commit()

        return {"status": "completed", "new_hotspots": total_new}
    finally:
        await release_scan_lock(lock_token)
        await notify_scan_complete(total_new)
        if should_close_db and db is not None:
            try:
                await db.close()
            except Exception:
                pass


async def scan_keyword(db: AsyncSession, keyword: Keyword, redis=None, enabled_sources: dict = None) -> int:
    """
    扫描单个关键词

    Args:
        db: 数据库会话
        keyword: 关键词对象
        redis: Redis 客户端（可选，用于去重加速）
        enabled_sources: 启用的数据源配置

    Returns:
        新增热点数量
    """
    if enabled_sources is None:
        enabled_sources = {"x": True, "bing": True, "sogou": True, "bilibili": True, "weibo": True}

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
            return {"tweets": []} if "twitter" in name.lower() else []

    # 根据配置决定执行哪些搜索
    coros = {}
    if enabled_sources.get("x", True):
        coros["Twitter"] = safe_search_coro("Twitter", search_twitter(keyword.text, query_type="Latest", limit=5))
    if enabled_sources.get("sogou", True):
        coros["Sogou"] = safe_search_coro("Sogou", search_sogou(keyword.text, limit=5))
    if enabled_sources.get("bilibili", True):
        coros["Bilibili"] = safe_search_coro("Bilibili", search_bilibili_video(keyword.text, limit=3))
    if enabled_sources.get("bing", True):
        coros["Bing"] = safe_search_coro("Bing", search_bing(keyword.text, limit=10))

    # 并发执行
    gathered = await asyncio.gather(*coros.values())
    results_map = dict(zip(coros.keys(), gathered))

    # 处理 Twitter 结果
    twitter_result = results_map.get("Twitter")
    if twitter_result:
        tweets = twitter_result.get("tweets", []) if isinstance(twitter_result, dict) else []
        for tweet in tweets:
            parsed = parse_tweet_to_hotspot(tweet, keyword.text)
            raw_results.append(parsed)
        print(f"  Twitter: found {len(tweets)} tweets")

    # 处理搜狗结果
    sogou_result = results_map.get("Sogou")
    if isinstance(sogou_result, list):
        for result in sogou_result:
            parsed = parse_china_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Sogou: found {len(sogou_result)} results")

    # 处理B站结果
    bilibili_result = results_map.get("Bilibili")
    if isinstance(bilibili_result, list):
        for result in bilibili_result:
            parsed = parse_china_result_to_hotspot(result, keyword.text)
            raw_results.append(parsed)
        print(f"  Bilibili: found {len(bilibili_result)} results")

    # 处理 Bing 结果
    bing_result = results_map.get("Bing")
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
    low_rel_count = 0
    dup_count = 0
    for hotspot_data in analyzed:
        # 过滤：relevance < 50 排除
        if hotspot_data.get("relevance", 50) < 50:
            low_rel_count += 1
            continue

        # 检查是否已存在
        source_id = hotspot_data.get("source_id", "")
        source = hotspot_data.get("source", "unknown")
        if source_id:
            source_id = source_id[:255]

            # 第一层：Redis 快速去重
            if await is_url_seen(redis, source_id, source):
                dup_count += 1
                continue

            # 第二层：数据库去重（保险）
            existing = await db.execute(
                select(Hotspot).where(
                    Hotspot.source_id == source_id,
                    Hotspot.source == source
                )
            )
            if existing.scalar_one_or_none():
                await mark_url_seen(redis, source_id, source)
                dup_count += 1
                continue

        # 创建新热点
        hotspot = Hotspot(
            id=str(uuid.uuid4()),
            title=hotspot_data["title"][:500] if hotspot_data["title"] else "Untitled",
            content=hotspot_data["content"][:5000] if hotspot_data["content"] else "",
            url=hotspot_data.get("url", ""),
            source=source,
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
        await mark_url_seen(redis, source_id, source)
        new_count += 1

    await db.commit()
    print(f"  AI analyzed: {len(analyzed)}, low relevance: {low_rel_count}, duplicate: {dup_count}, saved: {new_count} for keyword: {keyword.text}")

    return new_count
