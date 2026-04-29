"""
统计相关 API 接口

提供仪表盘统计数据，包括今日热点数、可信度比率和采集状态。
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Hotspot
from app.schemas.schemas import StatsResponse
from app.services.scanner import scan_is_locked

router = APIRouter(prefix="/api", tags=["统计接口"])


@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="获取仪表盘统计",
    description="""
获取仪表盘统计数据，包括：

- **todayHotspots**: 今日新增热点数量
- **credibilityRate**: 可信度比率（热点中可信度≥50%的比例）
- **collectionStatus**: 采集状态（running/stopped）

## 数据计算
- 今日热点：统计创建时间在今天0点之后的热点
- 可信度：relevance ≥ 50 视为可信
    """,
    responses={
        200: {"description": "成功获取统计数据"},
        500: {"description": "服务器内部错误"}
    }
)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """获取仪表盘统计信息"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Today's hotspots count
    today_query = select(func.count(Hotspot.id)).where(Hotspot.created_at >= today_start)
    today_result = await db.execute(today_query)
    today_hotspots = today_result.scalar() or 0

    # Credibility rate (percentage of hotspots with relevance >= 50)
    total_query = select(func.count(Hotspot.id))
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    high_cred_query = select(func.count(Hotspot.id)).where(Hotspot.relevance >= 50)
    high_cred_result = await db.execute(high_cred_query)
    high_cred = high_cred_result.scalar() or 0

    credibility_rate = int((high_cred / total * 100)) if total > 0 else 0

    return StatsResponse(
        totalHotspots=total,
        todayHotspots=today_hotspots,
        credibilityRate=credibility_rate,
        collectionStatus="running" if await scan_is_locked() else "stopped"
    )