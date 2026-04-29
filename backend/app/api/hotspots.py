"""
热点相关 API 接口

提供热点的查询、筛选和手动扫描触发功能。
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select, or_, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Hotspot
from app.schemas.schemas import HotspotResponse, HotspotsListResponse, ScanResponse
from app.services.scanner import scan_all_keywords

router = APIRouter(prefix="/api", tags=["热点接口"])


def hotspot_to_response(hotspot: Hotspot, keyword_text: str = None) -> HotspotResponse:
    """
    将 Hotspot 数据库模型转换为 API 响应模型

    Args:
        hotspot: Hotspot 数据库模型实例

    Returns:
        HotspotResponse: 符合前端接口规范的响应对象
    """
    # Calculate time ago
    time_ago = ""
    if hotspot.created_at:
        now = datetime.utcnow()
        diff = now - hotspot.created_at
        if diff < timedelta(minutes=1):
            time_ago = "刚刚"
        elif diff < timedelta(hours=1):
            time_ago = f"{int(diff.total_seconds() / 60)}分钟前"
        elif diff < timedelta(days=1):
            time_ago = f"{int(diff.total_seconds() / 3600)}小时前"
        else:
            time_ago = f"{int(diff.total_seconds() / 86400)}天前"

    return HotspotResponse(
        id=hotspot.id,
        title=hotspot.title,
        source=hotspot.source,
        author=hotspot.author or hotspot.source,
        authorAvatar=hotspot.author_avatar or (hotspot.author or hotspot.source or "UN")[:2].upper(),
        handle=f"@{hotspot.author_handle}" if hotspot.author_handle else f"@{hotspot.source}" if hotspot.source else "@unknown",
        time=time_ago,
        publishedAt=hotspot.published_at.isoformat() if hotspot.published_at else None,
        capturedAt=hotspot.created_at.isoformat() if hotspot.created_at else None,
        priority=hotspot.importance or "low",
        credibility=hotspot.relevance or 0,
        isReal=hotspot.is_real if hotspot.is_real is not None else True,
        isVerified=hotspot.author_verified or False,
        followers=hotspot.author_followers or 0,
        icon="flame",
        stats={
            "reposts": hotspot.retweet_count or 0,
            "comments": hotspot.comment_count or 0,
            "likes": hotspot.like_count or 0,
            "views": hotspot.view_count or 0,
            "coins": hotspot.coin_count or 0,
            "favorites": hotspot.favorite_count or 0
        },
        summary=hotspot.summary,
        aiReason=hotspot.reason,
        originalText=hotspot.content[:200] if hotspot.content else None,
        url=hotspot.url,
        matchedKeywords=[keyword_text] if keyword_text else [],
        sourceType={
                "twitter": "x",
                "weibo": "weibo",
                "sogou": "web",
                "bilibili": "bilibili"
            }.get(hotspot.source, "web")
    )


@router.get(
    "/hotspots",
    response_model=HotspotsListResponse,
    summary="获取热点列表",
    description="""
获取热点列表，支持分页和多种筛选条件。

## 查询参数
- **page**: 页码，从1开始，默认1
- **pageSize**: 每页数量，默认20，最大100
- **search**: 搜索关键词（搜索 title, summary, content）
- **sourceType**: 来源类型 (`x`, `weibo`, `web`, `bilibili`, `all`)
- **priority**: 优先级 (`urgent`, `high`, `medium`, `low`, `all`)
- **credibility**: 可信度 (`high`≥80%, `medium`≥50%, `low`≥25%, `all`)
- **isReal**: 内容真伪 (`real`, `fake`, `all`)

## 响应数据
返回热点列表、总数、当前页码、每页条数和总页数。
    """,
    responses={
        200: {"description": "成功获取热点列表"},
        500: {"description": "服务器内部错误"}
    }
)
async def get_hotspots(
    page: int = Query(1, ge=1, description="页码，从1开始"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（搜索 title, summary, content）"),
    sourceType: str = Query("all", description="来源类型: x, weibo, web, bilibili, all"),
    priority: str = Query("all", description="优先级: urgent, high, medium, low, all"),
    credibility: str = Query("all", description="可信度: high(≥80%), medium(≥50%), low(≥25%), all"),
    isReal: str = Query("all", description="内容真伪: true, false, all"),
    db: AsyncSession = Depends(get_db)
):
    """获取热点列表，支持分页和多种筛选条件"""
    # Build query with joinedload for keyword
    query = select(Hotspot).options(joinedload(Hotspot.keyword)).order_by(Hotspot.created_at.desc())

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Hotspot.title.ilike(search_pattern),
                Hotspot.summary.ilike(search_pattern),
                Hotspot.content.ilike(search_pattern)
            )
        )

    # Source type filter
    if sourceType != "all":
        source_mapping = {
            "x": ["twitter"],
            "weibo": ["weibo"],
            "web": ["sogou", "bing"],  # 网页来源包括搜狗和必应
            "bilibili": ["bilibili"]
        }
        if sourceType in source_mapping:
            query = query.where(Hotspot.source.in_(source_mapping[sourceType]))
        else:
            query = query.where(Hotspot.source == sourceType)

    # Priority filter
    if priority != "all":
        query = query.where(Hotspot.importance == priority)

    # Credibility filter
    if credibility == "high":
        query = query.where(Hotspot.relevance >= 80)
    elif credibility == "medium":
        query = query.where(Hotspot.relevance >= 50, Hotspot.relevance < 80)
    elif credibility == "low":
        query = query.where(Hotspot.relevance >= 25, Hotspot.relevance < 50)

    # Real/fake filter
    if isReal == "true":
        query = query.where(Hotspot.is_real == True)
    elif isReal == "false":
        query = query.where(Hotspot.is_real == False)

    # Get total count first
    count_query = select(func.count(Hotspot.id))
    if search:
        search_pattern = f"%{search}%"
        count_query = count_query.where(
            or_(
                Hotspot.title.ilike(search_pattern),
                Hotspot.summary.ilike(search_pattern),
                Hotspot.content.ilike(search_pattern)
            )
        )
    # Apply same filters to count query
    if sourceType != "all":
        source_mapping = {"x": ["twitter"], "weibo": ["weibo"], "web": ["sogou", "bing"], "bilibili": ["bilibili"]}
        if sourceType in source_mapping:
            count_query = count_query.where(Hotspot.source.in_(source_mapping[sourceType]))
        else:
            count_query = count_query.where(Hotspot.source == sourceType)
    if priority != "all":
        count_query = count_query.where(Hotspot.importance == priority)
    if credibility == "high":
        count_query = count_query.where(Hotspot.relevance >= 80)
    elif credibility == "medium":
        count_query = count_query.where(Hotspot.relevance >= 50, Hotspot.relevance < 80)
    elif credibility == "low":
        count_query = count_query.where(Hotspot.relevance >= 25, Hotspot.relevance < 50)
    if isReal == "true":
        count_query = count_query.where(Hotspot.is_real == True)
    elif isReal == "false":
        count_query = count_query.where(Hotspot.is_real == False)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    total_pages = max(1, (total + pageSize - 1) // pageSize)

    # Execute query with limit + offset
    offset = (page - 1) * pageSize
    result = await db.execute(query.limit(pageSize).offset(offset))
    hotspots = result.scalars().all()

    return HotspotsListResponse(
        data=[hotspot_to_response(h, h.keyword.text if h.keyword else None) for h in hotspots],
        total=total,
        page=page,
        pageSize=pageSize,
        totalPages=total_pages,
    )


@router.get("/proxy")
async def proxy_image(url: str = Query(...)):
    """代理图片请求，解决跨域和 Referer 问题"""
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers={"Referer": "https://www.bilibili.com"})
        return Response(content=resp.content, media_type=resp.headers.get("content-type", "image/jpeg"))


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="手动触发扫描",
    description="""
手动触发热点扫描任务。

该接口会启动后台扫描任务，从 Twitter 和 Bing 搜索最新热点内容。

## 返回状态
- **started**: 扫描已开始
- **already_running**: 扫描已在运行中

## 注意事项
- 扫描任务在后台异步执行
- 扫描结果会通过 WebSocket 实时推送
    """,
    responses={
        200: {"description": "扫描任务启动成功"},
        500: {"description": "服务器内部错误"}
    }
)
async def trigger_scan():
    """手动触发扫描"""
    import asyncio
    # Run scan in background to avoid blocking the request
    # 注意：不传入 db session，让 scan_all_keywords 自己创建独立的 session
    print("[API] Creating scan task...")
    asyncio.create_task(scan_all_keywords())
    return ScanResponse(status="started", message="扫描已开始")