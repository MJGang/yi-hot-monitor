"""
通知相关 API 接口

提供通知的查询和删除功能。
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Notification, Hotspot
from app.schemas.schemas import NotificationResponse, NotificationsListResponse

router = APIRouter(prefix="/api", tags=["通知接口"])


def notification_to_response(notification: Notification, hotspot: Hotspot = None) -> NotificationResponse:
    """将 Notification 模型转换为响应格式"""
    # Calculate time ago
    time_ago = ""
    if notification.created_at:
        now = datetime.utcnow()
        diff = now - notification.created_at
        if diff < timedelta(minutes=1):
            time_ago = "刚刚"
        elif diff < timedelta(hours=1):
            time_ago = f"{int(diff.total_seconds() / 60)}分钟前"
        elif diff < timedelta(days=1):
            time_ago = f"{int(diff.total_seconds() / 3600)}小时前"
        else:
            time_ago = f"{int(diff.total_seconds() / 86400)}天前"

    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        type="browser" if notification.type == "hotspot" else notification.type,
        priority=hotspot.importance if hotspot else "medium",
        credibility=hotspot.relevance if hotspot else 0,
        isReal=hotspot.is_real if hotspot else True,
        time=time_ago,
        source=f"X @{hotspot.source}" if hotspot and hotspot.source == "twitter" else (hotspot.source if hotspot else "unknown"),
        hotspotId=notification.hotspot_id,
        createdAt=notification.created_at.isoformat() if notification.created_at else None
    )


@router.get(
    "/notifications",
    response_model=NotificationsListResponse,
    summary="获取通知列表",
    description="""
获取通知历史列表，支持按类型筛选和分页。

## 参数
- **type**: 通知类型 (`browser`, `email`, `all`)
- **page**: 页码，默认 1
- **pageSize**: 每页数量，默认 20
    """,
    responses={200: {"description": "成功获取通知列表"}}
)
async def get_notifications(
    type: str = Query("all", description="通知类型: browser, email, all"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取通知列表"""
    query = select(Notification).order_by(Notification.created_at.desc())

    # Filter by type
    if type == "browser":
        query = query.where(Notification.type == "hotspot")
    elif type == "email":
        query = query.where(Notification.type == "email")

    # Count total
    count_query = select(func.count(Notification.id))
    if type == "browser":
        count_query = count_query.where(Notification.type == "hotspot")
    elif type == "email":
        count_query = count_query.where(Notification.type == "email")
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Pagination
    offset = (page - 1) * pageSize
    query = query.offset(offset).limit(pageSize)

    result = await db.execute(query)
    notifications = result.scalars().all()

    # Get hotspot info for each notification
    notification_list = []
    for notif in notifications:
        hotspot = None
        if notif.hotspot_id:
            hotspot = await db.get(Hotspot, notif.hotspot_id)
        notification_list.append(notification_to_response(notif, hotspot))

    return NotificationsListResponse(data=notification_list, total=total)


@router.delete(
    "/notifications/{notification_id}",
    summary="删除单条通知",
    description="删除指定的通知记录",
    responses={200: {"description": "通知删除成功"}, 404: {"description": "通知不存在"}}
)
async def delete_notification(notification_id: str, db: AsyncSession = Depends(get_db)):
    """删除单条通知"""
    notification = await db.get(Notification, notification_id)
    if not notification:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="通知不存在")

    await db.delete(notification)
    await db.commit()
    return {"status": "ok"}


@router.delete(
    "/notifications",
    summary="清空所有通知",
    description="删除所有通知记录",
    responses={200: {"description": "通知已清空"}}
)
async def clear_notifications(db: AsyncSession = Depends(get_db)):
    """清空所有通知"""
    await db.execute(select(Notification))
    result = await db.execute(select(Notification))
    notifications = result.scalars().all()
    for notif in notifications:
        await db.delete(notif)
    await db.commit()
    return {"status": "ok"}