"""
AI 分析服务

使用 LangChain + DeepSeek 分析热点内容
"""
from typing import Optional
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

# 分析提示词
ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """你是一个热点分析专家，请分析以下内容并返回 JSON 格式：

1. isReal: 判断是否为真实的热点新闻（排除标题党、假新闻、谣言）
2. relevance: 评估该热点与 AI/科技领域的相关性（0-100分）
3. importance: 评估热点的重要程度（low/medium/high/urgent）
4. summary: 生成简短摘要（50字以内）
5. reason: 简要说明分析理由

输出 JSON 格式：
{{"isReal": true/false, "relevance": 0-100, "importance": "low/medium/high/urgent", "summary": "...", "reason": "..."}}"""),
    ("user", "内容：{content}")
])

output_parser = JsonOutputParser()
analysis_chain = ANALYSIS_PROMPT | llm | output_parser


async def analyze_hotspot(content: str) -> dict:
    """
    分析热点内容

    Args:
        content: 热点内容

    Returns:
        分析结果
    """
    if not settings.deepseek_api_key:
        # 没有 API key 时返回默认值
        return {
            "isReal": True,
            "relevance": 50,
            "importance": "medium",
            "summary": content[:50],
            "reason": "AI 分析服务未配置"
        }

    try:
        result = await analysis_chain.ainvoke({"content": content})
        return result
    except Exception as e:
        print(f"AI analysis error: {e}")
        return {
            "isReal": True,
            "relevance": 50,
            "importance": "medium",
            "summary": content[:50],
            "reason": f"分析失败: {str(e)}"
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
    results = []
    for item in items:
        try:
            content = item.get("content", item.get("title", ""))
            analysis = await analyze_hotspot(content)

            hotspot = {
                "title": item.get("title", ""),
                "content": content,
                "url": item.get("url", ""),
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
                "retweet_count": item.get("stats", {}).get("reposts"),
                "keyword_id": keyword.id if hasattr(keyword, 'id') else None
            }
            results.append(hotspot)
        except Exception as e:
            print(f"Batch analysis error for item {item.get('title', 'unknown')}: {e}")
            continue

    return results