"""
中国平台搜索服务

支持搜狗搜索、B站视频搜索、微博热搜
"""
import httpx
import random
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.services.rate_limit import RateLimiter

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

sogou_rate_limiter = RateLimiter("sogou", max_per_second=1.0 / 3.0)


def generate_buvid3() -> str:
    """生成随机的 buvid3 cookie 值"""
    import uuid
    return str(uuid.uuid4()).upper() + '-' + ''.join(random.choices('0123456789ABCDEF', k=24))


async def search_sogou(query: str, limit: int = 10) -> list[dict]:
    """
    搜狗搜索

    Args:
        query: 搜索关键词
        limit: 返回数量

    Returns:
        搜狗搜索结果列表
    """
    user_agent = random.choice(USER_AGENTS)
    await sogou_rate_limiter.acquire()

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            response = await client.get(
                'https://www.sogou.com/web',
                params={"query": query, "ie": "utf8", "page": 1},
                headers={"User-Agent": user_agent}
            )
            response.raise_for_status()
        except Exception as e:
            print(f"Sogou search error: {e}")
            return []

    from selectolax.parser import HTMLParser
    parser = HTMLParser(response.text)
    results = []

    for item in parser.css('div.vrwrap, div.rb'):
        title_elem = item.css_first('h3 a, h2 a')
        snippet_elem = item.css_first('div.v-summary, div.str-text, p')
        url_elem = item.css_first('h3 a, h2 a')

        if not title_elem:
            continue

        title = title_elem.text()
        url = url_elem.attrs.get('href', '') if url_elem else ''
        content = snippet_elem.text() if snippet_elem else title

        # 完整URL
        if url.startswith('/link?'):
            try:
                resp = await client.get(f"https://www.sogou.com{url}", headers={"User-Agent": user_agent})
                url = str(resp.url)
            except:
                pass

        results.append({
            "title": title,
            "content": content[:500],
            "url": url,
            "source": "sogou",
            "published_at": None,
            "matched_keyword": query,
            "source_type": "web"
        })

        if len(results) >= limit:
            break

    return results


async def search_bilibili_video(keyword: str, limit: int = 10) -> list[dict]:
    """
    B站视频搜索

    Args:
        keyword: 搜索关键词
        limit: 返回数量

    Returns:
        B站视频结果列表
    """
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Referer": "https://search.bilibili.com",
        "Cookie": f"buvid3={generate_buvid3()}; buvid4={generate_buvid3()}"
    }

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        try:
            response = await client.get(
                'https://api.bilibili.com/x/web-interface/search/type',
                params={
                    "search_type": "video",
                    "keyword": keyword,
                    "page": 1,
                    "pagesize": min(limit, 20),
                    "order": "pubdate"  # 按最新投稿排序，而不是综合排序
                }
            )
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Bilibili search error: {e}")
            return []

    if data.get("code") != 0:
        print(f"Bilibili API error: {data.get('message')}")
        return []

    results = []
    items = data.get("data", {}).get("result", [])

    for item in items:
        print(f"Bilibili API - item: {item}")
        results.append({
            "title": item.get("title", "").replace('<em class="keyword">', '').replace('</em>', ''),
            "content": item.get("description", ""),
            "url": f"https://www.bilibili.com/video/{item.get('bvid', '')}",
            "source": "bilibili",
            "author": item.get("author", ""),
            "author_handle": f"uid:{item.get('mid', '')}",
            "author_avatar": item.get("upic"),
            "published_at": datetime.fromtimestamp(item.get("pubdate", 0), tz=timezone(timedelta(hours=8))) if item.get("pubdate") else None,
            "stats": {
                "views": item.get("play", 0),
                "likes": item.get("like", 0),
                "favorites": item.get("favorites", 0),
                "comments": item.get("review", 0)
            },
            "matched_keyword": keyword,
            "source_type": "bilibili"
        })

    return results[:limit]


async def get_weibo_hotsearch() -> list[dict]:
    """
    获取微博热搜榜

    Returns:
        微博热搜列表
    """
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Referer": "https://weibo.com",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        try:
            response = await client.get(
                'https://weibo.com/ajax/side/hotSearch'
            )
            response.raise_for_status()
            data = response.json()
        except Exception as e:
            print(f"Weibo hotsearch error: {e}")
            return []

    if data.get("ok") != 1:
        return []

    results = []
    for item in data.get("data", {}).get("realtime", []):
        results.append({
            "title": item.get("word", ""),
            "content": f"热搜指数: {item.get('raw_hot', 0)}",
            "url": f"https://s.weibo.com/weibo?q={item.get('word', '')}",
            "source": "weibo",
            "published_at": None,
            "matched_keyword": item.get('word', ''),
            "source_type": "weibo"
        })

    return results


def parse_china_result_to_hotspot(result: dict, keyword: str) -> dict:
    """
    将中国平台结果解析为热点格式

    Args:
        result: 搜索结果
        keyword: 匹配的关键词

    Returns:
        标准热点格式
    """
    return {
        "title": result.get("title", ""),
        "content": result.get("content", ""),
        "url": result.get("url", ""),
        "source": result.get("source", "unknown"),
        "source_id": result.get("url", ""),
        "author": result.get("author", result.get("source", "")),
        "author_handle": result.get("author_handle", ""),
        "author_avatar": result.get("author_avatar"),
        "author_followers": 0,
        "author_verified": False,
        "published_at": result.get("published_at"),
        "stats": result.get("stats", {"reposts": 0, "likes": 0, "views": 0, "comments": 0}),
        "matched_keyword": keyword,
        "source_type": result.get("source_type", "web")
    }
