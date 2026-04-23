"""
关键词相关 API 接口

提供关键词的增删改查和状态切换功能。
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.database import get_db
from app.models import Keyword, Hotspot
from app.schemas.schemas import KeywordResponse, KeywordsListResponse, KeywordCreate

router = APIRouter(prefix="/api", tags=["关键词接口"])


@router.get(
    "/keywords",
    response_model=KeywordsListResponse,
    summary="获取关键词列表",
    description="获取所有监控关键词及其关联的热点数量",
    responses={200: {"description": "成功获取关键词列表"}}
)
async def get_keywords(db: AsyncSession = Depends(get_db)):
    """获取关键词列表"""
    result = await db.execute(select(Keyword).order_by(Keyword.created_at.desc()))
    keywords = result.scalars().all()

    # Count hotspots for each keyword
    keyword_list = []
    for kw in keywords:
        count_result = await db.execute(
            select(func.count(Hotspot.id)).where(Hotspot.keyword_id == kw.id)
        )
        hotspot_count = count_result.scalar() or 0

        keyword_list.append(KeywordResponse(
            id=kw.id,
            text=kw.text,
            icon="sparkles",
            hotspotCount=hotspot_count,
            isActive=kw.is_active,
            createdAt=kw.created_at.isoformat() if kw.created_at else None
        ))

    return KeywordsListResponse(data=keyword_list)


@router.post(
    "/keywords",
    response_model=KeywordResponse,
    status_code=201,
    summary="添加关键词",
    description="添加一个新的监控关键词",
    responses={201: {"description": "关键词创建成功"}, 400: {"description": "关键词已存在"}}
)
async def create_keyword(keyword_data: KeywordCreate, db: AsyncSession = Depends(get_db)):
    """添加关键词"""
    # Check if keyword already exists
    existing = await db.execute(
        select(Keyword).where(Keyword.text == keyword_data.text)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="关键词已存在")

    keyword = Keyword(
        id=str(uuid.uuid4()),
        text=keyword_data.text,
        category=keyword_data.category
    )
    db.add(keyword)
    await db.commit()
    await db.refresh(keyword)

    return KeywordResponse(
        id=keyword.id,
        text=keyword.text,
        icon="sparkles",
        hotspotCount=0,
        isActive=keyword.is_active,
        createdAt=keyword.created_at.isoformat() if keyword.created_at else None
    )


@router.put(
    "/keywords/{keyword_id}",
    response_model=KeywordResponse,
    summary="更新关键词",
    description="更新关键词的文本或激活状态",
    responses={200: {"description": "关键词更新成功"}, 404: {"description": "关键词不存在"}}
)
async def update_keyword(keyword_id: str, keyword_data: KeywordCreate, db: AsyncSession = Depends(get_db)):
    """更新关键词"""
    keyword = await db.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="关键词不存在")

    if keyword_data.text is not None:
        keyword.text = keyword_data.text
    if keyword_data.category is not None:
        keyword.category = keyword_data.category

    await db.commit()
    await db.refresh(keyword)

    # Get hotspot count
    count_result = await db.execute(
        select(func.count(Hotspot.id)).where(Hotspot.keyword_id == keyword.id)
    )
    hotspot_count = count_result.scalar() or 0

    return KeywordResponse(
        id=keyword.id,
        text=keyword.text,
        icon="sparkles",
        hotspotCount=hotspot_count,
        isActive=keyword.is_active,
        createdAt=keyword.created_at.isoformat() if keyword.created_at else None
    )


@router.delete(
    "/keywords/{keyword_id}",
    summary="删除关键词",
    description="删除指定的关键词及其关联的热点",
    responses={200: {"description": "关键词删除成功"}, 404: {"description": "关键词不存在"}}
)
async def delete_keyword(keyword_id: str, db: AsyncSession = Depends(get_db)):
    """删除关键词"""
    keyword = await db.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="关键词不存在")

    await db.delete(keyword)
    await db.commit()
    return {"status": "ok"}


@router.patch(
    "/keywords/{keyword_id}/toggle",
    response_model=KeywordResponse,
    summary="切换关键词激活状态",
    description="切换关键词的激活/暂停状态",
    responses={200: {"description": "状态切换成功"}, 404: {"description": "关键词不存在"}}
)
async def toggle_keyword(keyword_id: str, db: AsyncSession = Depends(get_db)):
    """切换关键词激活状态"""
    keyword = await db.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="关键词不存在")

    keyword.is_active = not keyword.is_active
    await db.commit()
    await db.refresh(keyword)

    # Get hotspot count
    count_result = await db.execute(
        select(func.count(Hotspot.id)).where(Hotspot.keyword_id == keyword.id)
    )
    hotspot_count = count_result.scalar() or 0

    return KeywordResponse(
        id=keyword.id,
        text=keyword.text,
        icon="sparkles",
        hotspotCount=hotspot_count,
        isActive=keyword.is_active,
        createdAt=keyword.created_at.isoformat() if keyword.created_at else None
    )