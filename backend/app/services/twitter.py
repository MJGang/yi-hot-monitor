"""
Twitter 搜索服务

使用 twitterapi.io 搜索热点内容
支持质量评分、过滤和排序
"""
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.config import get_settings

settings = get_settings()

TWITTER_API_BASE = 'https://api.twitterapi.io'
HEADERS = {
    'X-API-Key': settings.twitter_api_key,
    'Content-Type': 'application/json'
}

# Twitter 质量评分配置
TWITTER_FILTER_CONFIG = {
    "min_likes": 10,
    "min_retweets": 5,
    "min_views": 1000,
    "min_followers": 500
}


def parse_twitter_date(date_str: str) -> Optional[datetime]:
    """解析 Twitter API 返回的日期字符串，转换为北京时间"""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%a %b %d %H:%M:%S %z %Y")
        # 转换为北京时间 (UTC+8)
        beijing_tz = timezone(timedelta(hours=8))
        return dt.astimezone(beijing_tz)
    except ValueError:
        return None


def calculate_twitter_score(tweet: dict) -> float:
    """
    计算 Twitter 质量评分

    评分公式：likes*2 + retweets*3 + views/100 + (蓝V?50:0)

    Args:
        tweet: 推文数据

    Returns:
        质量评分
    """
    author = tweet.get("author", {})
    like_count = tweet.get("likeCount", 0) or 0
    retweet_count = tweet.get("retweetCount", 0) or 0
    view_count = tweet.get("viewCount", 0) or 0
    is_blue_verified = author.get("isBlueVerified", False)

    score = like_count * 2 + retweet_count * 3 + view_count / 100
    if is_blue_verified:
        score += 50
    return score


def filter_and_rank_tweets(tweets: list[dict]) -> list[dict]:
    """
    过滤和排序 Twitter 推文

    1. 过滤回复推文
    2. 过滤不符合最低标准的推文（蓝V用户阈值减半）
    3. 按质量评分排序

    Args:
        tweets: 推文列表

    Returns:
        过滤并排序后的推文列表
    """
    config = TWITTER_FILTER_CONFIG
    filtered = []

    for tweet in tweets:
        # 跳过回复推文
        tweet_type = tweet.get("type", "")
        if tweet_type and "reply" in tweet_type.lower():
            continue

        # 检查文本是否以 @ 开头（回复）
        text = tweet.get("text", "").strip()
        if text.startswith("@"):
            continue

        author = tweet.get("author", {})
        is_blue_verified = author.get("isBlueVerified", False)

        # 蓝V用户阈值减半
        factor = 0.5 if is_blue_verified else 1.0

        like_count = tweet.get("likeCount", 0) or 0
        retweet_count = tweet.get("retweetCount", 0) or 0
        view_count = tweet.get("viewCount", 0) or 0
        followers = author.get("followers", 0) or 0

        # 检查最低标准
        if like_count < config["min_likes"] * factor:
            continue
        if retweet_count < config["min_retweets"] * factor:
            continue
        if view_count < config["min_views"] * factor:
            continue
        if followers < config["min_followers"] * factor:
            continue

        # 计算评分并添加到结果
        tweet["_quality_score"] = calculate_twitter_score(tweet)
        filtered.append(tweet)

    # 按质量评分降序排序
    filtered.sort(key=lambda t: t.get("_quality_score", 0), reverse=True)

    return filtered


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
        Twitter 搜索结果（已过滤和排序）
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
            result = response.json()

            # 过滤和排序
            tweets = result.get("tweets", [])
            if tweets:
                filtered_tweets = filter_and_rank_tweets(tweets)
                result["tweets"] = filtered_tweets

            return result
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
