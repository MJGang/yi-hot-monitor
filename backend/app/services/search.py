"""
Bing 搜索服务

爬取 Bing 搜索结果作为热点来源
"""
import httpx
import random
from typing import Optional
from selectolax.parser import HTMLParser

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

RATE_LIMITER_MIN_INTERVAL = 5.0  # 秒


class RateLimiter:
    """请求频率限制器"""
    def __init__(self, min_interval: float = RATE_LIMITER_MIN_INTERVAL):
        self.min_interval = min_interval
        self.last_request_time = 0.0

    async def acquire(self):
        """等待直到可以发送请求"""
        import asyncio
        import time
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()


rate_limiter = RateLimiter()


async def search_bing(query: str, limit: int = 20) -> list[dict]:
    """
    搜索 Bing 并返回结果

    Args:
        query: 搜索关键词
        limit: 返回数量

    Returns:
        Bing 搜索结果列表
    """
    user_agent = random.choice(USER_AGENTS)

    await rate_limiter.acquire()

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            response = await client.get(
                'https://www.bing.com/search',
                params={"q": query, "first": 0, "count": limit},
                headers={"User-Agent": user_agent}
            )
            response.raise_for_status()
        except Exception as e:
            print(f"Bing search error: {e}")
            return []

    parser = HTMLParser(response.text)
    results = []

    for item in parser.css('li.b_algo'):
        title_elem = item.css_first('h2 a')
        snippet_elem = item.css_first('.b_caption p')

        if not title_elem:
            continue

        url = title_elem.attrs.get('href', '')
        title = title_elem.text()

        # 获取来源
        source_elem = item.css_first('.b_attribution cite')
        source = source_elem.text() if source_elem else 'Bing'

        results.append({
            "title": title,
            "content": snippet_elem.text() if snippet_elem else title,
            "url": url,
            "source": source,
            "published_at": None,
            "matched_keyword": query,
            "source_type": "bing"
        })

        if len(results) >= limit:
            break

    return results


def parse_bing_result_to_hotspot(result: dict, keyword: str) -> dict:
    """
    将 Bing 结果解析为热点格式

    Args:
        result: Bing 搜索结果
        keyword: 匹配的关键词

    Returns:
        标准热点格式
    """
    return {
        "title": result.get("title", ""),
        "content": result.get("content", ""),
        "url": result.get("url", ""),
        "source": result.get("source", "bing"),
        "source_id": result.get("url", ""),
        "author": result.get("source", "Bing"),
        "author_handle": "",
        "author_followers": 0,
        "author_verified": False,
        "published_at": result.get("published_at"),
        "stats": {"reposts": 0, "likes": 0, "views": 0, "comments": 0},
        "matched_keyword": keyword,
        "source_type": "bing"
    }