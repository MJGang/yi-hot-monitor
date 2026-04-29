# Data Source Reference

Detailed signatures, parameters, return shapes, and platform-specific notes.

## Bing (`app.services.search`)

```python
async def search_bing(query: str, limit: int = 20) -> list[dict]
```

Scrapes Bing.com search results via HTML parsing (selectolax). Uses rotating
user agents. Rate limited to 0.2 req/s.

**Return shape:**
```python
{
    "title": str,          # Result title
    "content": str,        # Snippet text
    "url": str,            # Result URL
    "source": str,         # Source domain (from cite tag)
    "published_at": None,  # Always None (Bing doesn't expose dates)
    "matched_keyword": str,# The search query
    "source_type": "bing"
}
```

**Parser:** `parse_bing_result_to_hotspot(result, keyword)` → standard hotspot dict
- `source` set to `"bing"`
- `source_id` = url

---

## Sogou / 搜狗 (`app.services.china_search`)

```python
async def search_sogou(query: str, limit: int = 10) -> list[dict]
```

Scrapes sogou.com web search. Rate limited to ~0.33 req/s. Redirect links
(`/link?...`) are resolved to final URLs with a follow-up request.

**Return shape:**
```python
{
    "title": str,
    "content": str,        # Truncated to 500 chars
    "url": str,            # Resolved final URL
    "source": "sogou",
    "published_at": None,
    "matched_keyword": str,
    "source_type": "web"
}
```

---

## Bilibili / B站 (`app.services.china_search`)

```python
async def search_bilibili_video(keyword: str, limit: int = 10) -> list[dict]
```

Uses Bilibili's search API (`api.bilibili.com/x/web-interface/search/type`).
No rate limiter applied (API-based). Sorted by publish date descending.

**Return shape:**
```python
{
    "title": str,              # Video title (HTML tags stripped)
    "content": str,            # Video description
    "url": str,                # "https://www.bilibili.com/video/{bvid}"
    "source": "bilibili",
    "author": str,             # UP主 name
    "author_handle": str,      # "uid:{mid}"
    "author_avatar": str|None, # Avatar URL (upic field)
    "published_at": datetime,  # Beijing time (UTC+8), from unix timestamp
    "stats": {
        "views": int,          # Play count
        "likes": int,
        "favorites": int,
        "comments": int        # Review count
    },
    "matched_keyword": str,
    "source_type": "bilibili"
}
```

**Note:** Returns videos ordered by `pubdate` (newest first), NOT comprehensive
ranking.

---

## Weibo / 微博 (`app.services.china_search`)

```python
async def get_weibo_hotsearch() -> list[dict]
```

Fetches the real-time Weibo hot search ranking via `weibo.com/ajax/side/hotSearch`.
No parameters needed — returns the full ranking. No rate limiter (API-based).

**Return shape:**
```python
{
    "title": str,          # Hot search term (word)
    "content": str,        # "热搜指数: {raw_hot}"
    "url": str,            # "https://s.weibo.com/weibo?q={word}"
    "source": "weibo",
    "published_at": None,
    "matched_keyword": str,# Same as word
    "source_type": "weibo"
}
```

**Important:** This returns the ENTIRE hot search ranking. The caller is
responsible for filtering results by keyword if needed. The scanner
(`scan_keyword`) does this by matching keyword text/parts against each entry's
`word` field.

---

## Twitter/X (`app.services.twitter`)

```python
async def search_twitter(
    query: str,
    query_type: str = "Latest",  # "Latest" or "Top"
    cursor: str | None = None,   # Pagination cursor
    limit: int = 20
) -> dict
```

Uses twitterapi.io with API key from `backend/.env` (`TWITTER_API_KEY`).
Results are quality-filtered (min likes/retweets/views/followers) and ranked by
score: `likes*2 + retweets*3 + views/100 + (verified ? 50 : 0)`.

Twitter API key can hold only one working key at a time, so it may sometimes
fail or return different results even for the same keyword.

**Return shape:**
```python
{
    "tweets": [
        {
            "id": str,           # Tweet ID
            "text": str,         # Tweet content
            "url": str,          # Tweet URL
            "author": {
                "name": str,
                "userName": str,
                "profilePicture": str,
                "followers": int,
                "isBlueVerified": bool,
                ...
            },
            "likeCount": int,
            "retweetCount": int,
            "viewCount": int,
            "replyCount": int,
            "createdAt": str,        # "Tue Apr 29 12:00:00 +0000 2025"
            "type": str,             # Tweet type — "reply" tweets are filtered out
            "_quality_score": float, # Computed score
        },
        ...
    ],
    "has_next_page": bool,
    "next_cursor": str | None
}
```

**Parser:** `parse_tweet_to_hotspot(tweet, keyword)` → standard hotspot dict
- `source` set to `"twitter"`
- `source_id` = tweet id
- `published_at` converted to Beijing time (UTC+8)

**Quality filter thresholds (non-blue users; halved for blue):**
- min likes: 10, min retweets: 5, min views: 1000, min followers: 500
- Reply tweets and tweets starting with "@" are excluded

```python
async def get_trends(woeid: int = 1) -> dict
```

Fetches Twitter trending topics. `woeid`: 1=global, 23424768=Brazil, etc.

---

## Scanner / 扫描器 (`app.services.scanner`)

```python
async def scan_all_keywords(db=None) -> dict
```

Full pipeline: loads all active keywords from DB → for each keyword, parallel
search across enabled sources → freshness filter (7 days) → AI analysis →
deduplication (Redis + DB) → save to DB → WebSocket notification.

Returns `{"status": "completed"|"already_running", "new_hotspots": int}`.

Uses Redis distributed lock (`lock:scan`) with 60s TTL to prevent concurrent
scans. Redis unavailable → degrades gracefully (lock skipped).

```python
async def scan_is_locked() -> bool
```

Check if a scan is currently running.

```python
def filter_by_freshness(results: list[dict]) -> list[dict]
```

Filters out content older than 7 days. Content without `published_at` is kept.

---

## Account Detector (`app.services.account_detector`)

```python
def detect_account_type(keyword: str) -> dict
```

Detects if a keyword identifies a platform account rather than a topic:
- `uid:xxx` → Bilibili account
- `@xxx` → Weibo account
- `BV...` (10 alphanumeric chars) → Bilibili video
- `avNNN` → Bilibili video

Returns `{"is_account": bool, "platform": str|None, "account_id": str|None}`.

---

## Rate Limiter (`app.services.rate_limit`)

```python
class RateLimiter:
    def __init__(self, name: str, max_per_second: float = 1.0)
    async def acquire(self)  # Wait until allowed to send
```

Redis-based sliding window rate limiting. Degrades to in-memory limiting when
Redis is unavailable. Timeout: 5s max wait, then passes through.

Existing limiters:
- `rate_limiter` (Bing): 0.2 req/s
- `sogou_rate_limiter`: ~0.33 req/s
