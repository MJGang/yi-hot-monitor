"""
Twitter 搜索服务

使用 twitterapi.io 搜索热点内容
"""
import httpx
from datetime import datetime
from typing import Optional

from app.config import get_settings


def parse_twitter_date(date_str: str) -> Optional[datetime]:
    """解析 Twitter API 返回的日期字符串，转换为北京时间"""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
        # 转换为北京时间 (UTC+8)
        from datetime import timezone, timedelta
        beijing_tz = timezone(timedelta(hours=8))
        return dt.astimezone(beijing_tz)
    except ValueError:
        return None

settings = get_settings()

TWITTER_API_BASE = 'https://api.twitterapi.io'
HEADERS = {
    'X-API-Key': settings.twitter_api_key,
    'Content-Type': 'application/json'
}


async def search_twitter(
    query: str,
    query_type: str = "Latest",
    cursor: Optional[str] = None,
    limit: int = 20
) -> dict:
    """
    搜索 Twitter 推文

    Args:
        query: 搜索关键词
        query_type: Latest 或 Top
        cursor: 分页游标
        limit: 返回数量

    Returns:
        Twitter 搜索结果
    """
    if not settings.twitter_api_key:
        return {"tweets": [], "has_next_page": False, "next_cursor": None}

    params = {
        "query": query,
        "queryType": query_type,
        "limit": limit
    }
    if cursor:
        params["cursor"] = cursor

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{TWITTER_API_BASE}/twitter/tweet/advanced_search",
                params=params,
                headers=HEADERS
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Twitter API error: {e}")
            return {"tweets": [], "has_next_page": False, "next_cursor": None}


async def get_trends(woeid: int = 1) -> dict:
    """
    获取 Twitter 热门趋势

    Args:
        woeid: 全球地区 ID，1 表示全球

    Returns:
        趋势列表
    """
    if not settings.twitter_api_key:
        return {"trends": []}

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{TWITTER_API_BASE}/twitter/trends",
                params={"woeid": woeid},
                headers=HEADERS
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Twitter trends API error: {e}")
            return {"trends": []}


def parse_tweet_to_hotspot(tweet: dict, keyword: str) -> dict:
    """
    将 Twitter 推文解析为热点格式

    Args:
        tweet: Twitter API 返回的推文数据
        keyword: 匹配的关键词

    Returns:
        标准热点格式
    """
    author = tweet.get("author", {})
    return {
        "title": tweet.get("text", "")[:500],
        "content": tweet.get("text", ""),
        "url": tweet.get("url", ""),
        "source": "twitter",
        "source_id": tweet.get("id", ""),
        "author": author.get("name", ""),
        "author_handle": author.get("userName", ""),
        "author_avatar": author.get("profilePicture", ""),
        "author_followers": author.get("followers", 0),
        "author_verified": author.get("isBlueVerified", False),
        "published_at": parse_twitter_date(tweet.get("createdAt")),
        "stats": {
            "reposts": tweet.get("retweetCount", 0),
            "likes": tweet.get("likeCount", 0),
            "views": tweet.get("viewCount", 0),
            "comments": tweet.get("replyCount", 0),
        },
        "matched_keyword": keyword,
        "source_type": "x"
    }