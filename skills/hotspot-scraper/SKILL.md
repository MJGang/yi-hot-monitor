---
name: hotspot-scraper
description: >
  Hotspot scraping and public opinion monitoring toolkit. Triggers when the user
  wants to search trending topics, scrape latest content from platforms (Bing,
  Sogou, Bilibili, Weibo, Twitter/X), monitor public sentiment around keywords,
  fetch hot search rankings, or run a full hotspot scan pipeline. Use this
  whenever the user mentions 热点, 热搜, 舆情, 抓取, trending, sentiment
  analysis around topics, or wants to search/grab content from the supported
  platforms.
---

# Hotspot Scraper

Search and scrape trending content across multiple platforms. All scraping
functions live in `backend/app/services/` — this skill tells you which function
to call for which job, and how to compose them.

## Safety rules (READ FIRST)

These rules are non-negotiable. Violating them breaks the production system.

1. **NEVER modify existing source files** in `backend/app/`. No exceptions.
   The code under `app/services/`, `app/models/`, `app/api/` etc. is
   production code. If you find a bug, **report it in your output** — do not
   edit the file yourself. The operator will decide whether to apply the fix.

2. **NEVER hardcode credentials** (database passwords, API keys, tokens) in
   scripts. Use environment variables from `backend/.env` only. If you can't
   find the right credential, report it rather than guessing.

3. **NEVER write scripts into `backend/`**. If you need a temporary script,
   write it under the current workspace or a `/tmp` directory. Do not create
   new `.py` files in the project tree.

4. Use `uv run python` to execute code. Do not modify `pyproject.toml` or
   add/remove dependencies.

## Quick decision table

| User wants to... | Call |
|---|---|
| Get Weibo hot search ranking | `get_weibo_hotsearch()` |
| Search Twitter/X for a keyword | `search_twitter(query, ...)` |
| Search Bing for a keyword | `search_bing(query, ...)` |
| Search Sogou (搜狗) for a keyword | `search_sogou(query, ...)` |
| Search Bilibili videos for a keyword | `search_bilibili_video(keyword, ...)` |
| Run full pipeline (search all sources → AI analysis → save) | `scan_all_keywords()` |
| Quick scan a single keyword (no DB write) | Compose individual searches in parallel |
| Check if keyword looks like a platform account | `detect_account_type(keyword)` |

## How to invoke

All functions are async and live under `app.services`. Import directly:

```python
from app.services.china_search import search_sogou, search_bilibili_video, get_weibo_hotsearch
from app.services.search import search_bing
from app.services.twitter import search_twitter, get_trends
from app.services.scanner import scan_all_keywords
from app.services.account_detector import detect_account_type
```

Working directory is `backend/`. Run with `uv run python` or use the project's venv.

## Each source in detail

See `references/sources.md` for full signatures, parameters, return shapes,
rate limits, and error handling per source.

## Composition patterns

### Pattern 1: Single-source quick search

```python
import asyncio
from app.services.search import search_bing

results = asyncio.run(search_bing("关键词", limit=10))
# results is list[dict] with keys: title, content, url, source, source_type
```

### Pattern 2: Multi-source parallel search (recommended)

When the user wants broad coverage, search all relevant sources in parallel:

```python
import asyncio
from app.services.twitter import search_twitter
from app.services.search import search_bing
from app.services.china_search import search_sogou, search_bilibili_video, get_weibo_hotsearch

async def search_all(keyword: str):
    twitter, bing, sogou, bilibili, weibo = await asyncio.gather(
        search_twitter(keyword, limit=5),
        search_bing(keyword, limit=10),
        search_sogou(keyword, limit=5),
        search_bilibili_video(keyword, limit=3),
        get_weibo_hotsearch(),
        return_exceptions=True  # one source failing won't kill the rest
    )
    return {
        "twitter": twitter if not isinstance(twitter, Exception) else [],
        "bing": bing if not isinstance(bing, Exception) else [],
        "sogou": sogou if not isinstance(sogou, Exception) else [],
        "bilibili": bilibili if not isinstance(bilibili, Exception) else [],
        "weibo": weibo if not isinstance(weibo, Exception) else [],
    }
```

### Pattern 3: Full scan pipeline (search → AI analysis → DB)

Only use this when the user explicitly wants a full scan with persistence:

```python
from app.services.scanner import scan_all_keywords
result = await scan_all_keywords()
# Returns: {"status": "completed"|"already_running", "new_hotspots": int}
```

This scans ALL active keywords from the database across all enabled sources,
runs AI analysis, deduplicates, and saves new hotspots. It acquires a Redis
distributed lock to prevent concurrent scans.

### Pattern 4: Account-aware search

Check if a keyword is actually a platform account before searching:

```python
from app.services.account_detector import detect_account_type

info = detect_account_type(keyword)
if info["is_account"]:
    # info["platform"] is "bilibili" or "weibo"
    # info["account_id"] is the extracted ID
    # Search that specific account instead of broad search
```

## Output parsing

Each source search returns `list[dict]`. To convert results to the standard
hotspot format, use the corresponding parser:

```python
from app.services.twitter import parse_tweet_to_hotspot
from app.services.search import parse_bing_result_to_hotspot
from app.services.china_search import parse_china_result_to_hotspot

# Standard hotspot dict keys:
# title, content, url, source, source_id, author, author_handle,
# author_avatar, author_followers, author_verified, published_at,
# stats (dict with reposts/likes/views/comments/coins/favorites),
# matched_keyword, source_type
```

## Rate limits

Each source has a `RateLimiter` to avoid being blocked. Twitter uses the
twitterapi.io API key (configured in `backend/.env`). The others use web
scraping with rotating user agents. If a search returns empty, it may be
rate-limited — wait a few seconds and retry.

## Environment requirements

- Working directory: `backend/`
- Python: `uv run python`
- Required env vars in `backend/.env`: `TWITTER_API_KEY` (for Twitter searches)
- Redis is used for rate limiting but the limiters degrade gracefully without it
