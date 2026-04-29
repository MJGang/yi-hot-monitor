"""
AI 分析服务

使用 LangChain + DeepSeek 分析热点内容
支持关键词扩展、预匹配和 AI 分析。Redis 缓存加速重复查询。
"""
import json as json_module
import hashlib
from typing import Optional
from datetime import datetime, timezone, timedelta
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser

from app.config import get_settings

settings = get_settings()

# 初始化 LLM
llm = ChatOpenAI(
    model=settings.llm_model,
    openai_api_key=settings.deepseek_api_key,
    openai_api_base=settings.deepseek_api_base,
    temperature=0.3,
)

# 扩展缓存：Redis 不可用时的内存回退
_expansion_cache: dict[str, list[str]] = {}


async def _get_redis_or_none():
    """获取 Redis 客户端，不可用时返回 None"""
    try:
        from app.redis import get_redis
        return await get_redis()
    except Exception:
        return None


def extract_core_terms(keyword: str) -> list[str]:
    """
    从关键词中提取核心词（纯文本方式，不依赖 AI）

    Args:
        keyword: 原始关键词

    Returns:
        核心词列表
    """
    import re
    terms = []
    # 按空格、连字符、下划线等分割
    parts = re.split(r'[\s\-_\/\\·]+', keyword)
    parts = [p for p in parts if len(p) >= 2]
    if len(parts) > 1:
        terms.extend(parts)
        # 两两组合
        for i in range(len(parts) - 1):
            terms.append(parts[i] + ' ' + parts[i + 1])
    # 去重，排除原始关键词本身
    return list(set(terms))


def pre_match_keyword(text: str, expanded_keywords: list[str]) -> dict:
    """
    检查文本中是否包含任一扩展关键词（不区分大小写）

    Args:
        text: 待检查文本
        expanded_keywords: 扩展后的关键词列表

    Returns:
        匹配结果 {"matched": bool, "matched_terms": list[str]}
    """
    lower_text = text.lower()
    matched_terms = []
    for kw in expanded_keywords:
        if kw.lower() in lower_text:
            matched_terms.append(kw)
    return {"matched": len(matched_terms) > 0, "matched_terms": matched_terms}


async def expand_keyword(keyword: str) -> list[str]:
    """
    使用 AI 将关键词扩展为多个变体

    Args:
        keyword: 原始关键词

    Returns:
        扩展后的关键词列表（含原始关键词）
    """
    # 内存缓存命中（最快路径）
    if keyword in _expansion_cache:
        return _expansion_cache[keyword]

    # Redis 缓存命中
    redis = await _get_redis_or_none()
    if redis:
        try:
            cached = await redis.hget("expansion:cache", keyword)
            if cached:
                result = json_module.loads(cached)
                _expansion_cache[keyword] = result
                return result
        except Exception:
            pass

    # 不管 AI 是否可用，先提取基础核心词
    core_terms = extract_core_terms(keyword)

    # 无 API Key 时使用基础核心词
    if not settings.deepseek_api_key:
        result = [keyword] + core_terms
        _expansion_cache[keyword] = result
        return result

    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是一个搜索查询扩展专家。给定一个监控关键词，生成该关键词的变体和相关检索词，用于文本匹配。

规则：
1. 包含原始关键词的各种写法（大小写、空格、连字符变体）
2. 包含关键词的核心组成词（拆分后的各个有意义的词）
3. 包含常见别称、缩写、中英文对照
4. 不要加入泛化词（比如关键词是"Claude Sonnet 4.6"，不要加"AI模型"这种泛化词）
5. 总数控制在 5-15 个

输出 JSON 数组，只输出 json，不要有其他内容。
示例输入："Claude Sonnet 4.6"
示例输出：["Claude Sonnet 4.6", "Claude Sonnet", "Sonnet 4.6", "claude-sonnet-4.6", "Claude 4.6", "Anthropic Sonnet"]"""),
            ("user", "{keyword}")
        ])

        chain = prompt | llm
        response = await chain.ainvoke({"keyword": keyword})
        content = response.content if hasattr(response, 'content') else str(response)

        # 解析 JSON 数组
        import re
        json_match = re.search(r'\[[\s\S]*\]', content)
        if json_match:
            parsed = json_module.loads(json_match[0])
            # 确保原始关键词和核心词都在列表中
            expanded = list(set([keyword] + core_terms + [s.strip() for s in parsed if s.strip()]))
            _expansion_cache[keyword] = expanded

            # 写入 Redis 缓存
            if redis:
                try:
                    await redis.hset("expansion:cache", keyword, json_module.dumps(expanded))
                except Exception:
                    pass

            print(f"  Query expansion for '{keyword}': {len(expanded)} variants")
            return expanded
    except Exception as e:
        print(f"Query expansion failed: {e}")

    # Fallback：使用基础核心词
    fallback = [keyword] + core_terms
    _expansion_cache[keyword] = fallback
    return fallback


async def analyze_hotspot(content: str, keyword: str = "", pre_match_result: dict = None) -> dict:
    """
    分析热点内容

    Args:
        content: 热点内容
        keyword: 关键词（用于更精准的分析）
        pre_match_result: 预匹配结果 {"matched": bool, "matched_terms": list[str]}

    Returns:
        分析结果
    """
    # 默认预匹配结果
    match_result = pre_match_result or {"matched": False, "matched_terms": []}

    if not settings.deepseek_api_key:
        return {
            "isReal": True,
            "relevance": 50 if match_result["matched"] else 20,
            "importance": "medium",
            "summary": content[:50],
            "reason": "AI 分析服务未配置，使用默认分数"
        }

    try:
        # 构建带预匹配信息的 prompt（使用字符串拼接避免 f-string 转义问题）
        match_hint = ""
        if match_result["matched"]:
            matched_terms_str = ', '.join(match_result['matched_terms'])
            match_hint = "\n注意：文本预匹配发现内容中包含以下关键词变体：" + matched_terms_str
        else:
            match_hint = "\n注意：文本预匹配发现内容中未直接提及关键词'" + keyword + "'的任何变体，请特别严格审核相关性。"

        # 构建 system message（不使用 f-string，避免 {{}} 被转义）
        system_msg = (
            "你是一个热点内容精准匹配专家。你的任务是判断一段内容是否与指定的监控关键词【" + keyword + "】直接相关。"
            + match_hint + "\n\n"
            "分析要点：\n"
            "1. 判断是否为真实有价值的信息（排除标题党、假新闻、营销软文）\n"
            "2. 判断内容是否直接涉及关键词，注意：\n"
            "   - 仅仅属于同一领域但未提及关键词的内容，相关性应低于 40 分\n"
            "   - 内容必须直接讨论、提及关键词才能获得 60 分以上\n"
            "   - 只是间接沾边应给 30-50 分\n"
            "3. 评估热点的重要程度\n"
            "4. 用一句话说明此内容与关键词的关联\n\n"
            "请以 JSON 格式输出，字段：\n"
            "isReal: true 或 false\n"
            "relevance: 0-100 的数字\n"
            "importance: low 或 medium 或 high 或 urgent\n"
            "summary: 一句话描述内容与关键词的关联\n"
            "reason: 打分理由\n\n"
            "只输出 JSON，不要有其他内容。"
        )

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_msg),
            ("user", "内容：{content}")
        ])

        chain = prompt | llm
        response = await chain.ainvoke({"content": content[:2000]})  # 限制内容长度
        raw_content = response.content if hasattr(response, 'content') else str(response)
        # 手动解析 JSON，处理 LLM 输出裸字符串的情况（如 importance: medium 而非 importance: "medium"）
        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw_content)
        if json_match:
            raw_json = json_match[0]
            # 修复裸字符串：确保字符串字段（importance, summary, reason）有引号
            # isReal 的 true/false 是 JSON 布尔值，不要加引号
            raw_json = re.sub(r'"(importance|summary|reason)":\s*([a-zA-Z_][a-zA-Z0-9_]*)', r'"\1": "\2"', raw_json)
            result = json.loads(raw_json)
        else:
            raise ValueError("No JSON found in response")

        return {
            "isReal": result.get("isReal", True),
            "relevance": min(100, max(0, result.get("relevance", 50))),
            "importance": result.get("importance", "medium"),
            "summary": result.get("summary", "")[:150],
            "reason": result.get("reason", "")[:200]
        }
    except Exception as e:
        print(f"AI analysis error: {e}")
        return {
            "isReal": True,
            "relevance": 60 if match_result["matched"] else 10,
            "importance": "medium" if match_result["matched"] else "low",
            "summary": content[:50],
            "reason": "AI 分析失败，使用默认分数"
        }


async def batch_analyze(items: list[dict], keyword: str) -> list[dict]:
    """
    批量分析热点

    Args:
        items: 热点列表
        keyword: 关键词

    Returns:
        分析后的热点列表
    """
    # 先扩展关键词
    expanded_keywords = await expand_keyword(keyword)

    # 获取 Redis 用于分析缓存
    redis = await _get_redis_or_none()

    results = []
    batch_size = 3  # 并发限制

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]

        async def process_item(item: dict) -> Optional[dict]:
            try:
                content = item.get("content", item.get("title", ""))
                url = item.get("url", "")

                # 检查 AI 分析缓存
                if redis and url:
                    try:
                        url_hash = hashlib.md5(url.encode()).hexdigest()
                        cache_key = f"ai:cache:{url_hash}"
                        cached = await redis.get(cache_key)
                        if cached:
                            cached_data = json_module.loads(cached)
                            # 更新 keyword_id（当前 keyword 不同但 URL 相同）
                            cached_data["keyword_id"] = None
                            return cached_data
                    except Exception:
                        pass

                # 预匹配
                pre_match = pre_match_keyword(content, expanded_keywords)

                # AI 分析
                analysis = await analyze_hotspot(content, keyword, pre_match)

                hotspot = {
                    "title": item.get("title", ""),
                    "content": content,
                    "url": url,
                    "source": item.get("source", "unknown"),
                    "source_id": item.get("source_id", ""),
                    "author": item.get("author"),
                    "author_handle": item.get("author_handle"),
                    "author_avatar": item.get("author_avatar"),
                    "author_followers": item.get("author_followers", 0),
                    "author_verified": item.get("author_verified", False),
                    "is_real": analysis.get("isReal", True),
                    "relevance": analysis.get("relevance", 50),
                    "importance": analysis.get("importance", "medium"),
                    "summary": analysis.get("summary", ""),
                    "reason": analysis.get("reason", ""),
                    "published_at": item.get("published_at"),
                    "view_count": item.get("stats", {}).get("views"),
                    "like_count": item.get("stats", {}).get("likes"),
                    "comment_count": item.get("stats", {}).get("comments"),
                    "favorite_count": item.get("stats", {}).get("favorites"),
                    "retweet_count": item.get("stats", {}).get("reposts"),
                    "keyword_id": None
                }

                # 写入分析缓存（1天过期）
                if redis and url:
                    try:
                        url_hash = hashlib.md5(url.encode()).hexdigest()
                        cache_key = f"ai:cache:{url_hash}"
                        await redis.set(cache_key, json_module.dumps(hotspot), ex=86400)
                    except Exception:
                        pass

                return hotspot
            except Exception as e:
                print(f"Batch analysis error for item {item.get('title', 'unknown')}: {e}")
                return None

        # 并发处理
        import asyncio
        batch_results = await asyncio.gather(*[process_item(item) for item in batch])
        results.extend([r for r in batch_results if r])

    return results
