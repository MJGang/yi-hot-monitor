"""
设置相关 API 接口

提供系统设置的查询和更新功能。
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Setting
from app.schemas.schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api", tags=["设置接口"])


async def get_settings_from_db(db: AsyncSession) -> SettingsResponse:
    """从数据库获取设置"""
    result = await db.execute(select(Setting))
    settings_map = {s.key: s.value for s in result.scalars().all()}

    return SettingsResponse(
        theme=settings_map.get("theme", "dark"),
        browserNotify=settings_map.get("browser_notify", "true").lower() == "true",
        emailNotify=settings_map.get("email_notify", "false").lower() == "true",
        notifyEmail=settings_map.get("notify_email", ""),
        notifyFrequency=settings_map.get("notify_frequency", "realtime"),
        quietHoursEnabled=settings_map.get("quiet_hours_enabled", "false").lower() == "true",
        quietHoursStart=settings_map.get("quiet_hours_start", "22:00"),
        quietHoursEnd=settings_map.get("quiet_hours_end", "08:00"),
        scanInterval=int(settings_map.get("scan_interval", "30")),
        dataSources=_parse_data_sources(settings_map.get("data_sources", "")),
        autoScan=settings_map.get("auto_scan", "true").lower() == "true",
        openrouterApiKey=settings_map.get("openrouter_api_key", ""),
        twitterApiKey=settings_map.get("twitter_api_key", "")
    )


async def save_setting(db: AsyncSession, key: str, value: str):
    """保存单个设置到数据库"""
    result = await db.execute(select(Setting).where(Setting.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
    else:
        setting = Setting(key=key, value=value)
        db.add(setting)
    await db.commit()


def _parse_data_sources(raw: str) -> dict:
    """解析数据库中存储的 data_sources 字符串为 dict"""
    defaults = {"x": True, "bing": True, "sogou": True, "bilibili": True, "weibo": True}
    if not raw:
        return defaults
    try:
        parsed = json.loads(raw)
        # 补齐新数据源（兼容旧格式只存了 x/bing）
        for k, v in defaults.items():
            parsed.setdefault(k, v)
        return parsed
    except (json.JSONDecodeError, TypeError):
        raw_lower = raw.lower()
        return {
            "x": "'x': true" in raw_lower or '"x": true' in raw_lower,
            "bing": "'bing': true" in raw_lower or '"bing": true' in raw_lower,
            "sogou": "'sogou': true" in raw_lower or '"sogou": true' in raw_lower,
            "bilibili": "'bilibili': true" in raw_lower or '"bilibili": true' in raw_lower,
            "weibo": "'weibo': true" in raw_lower or '"weibo": true' in raw_lower,
        }


@router.get(
    "/settings",
    response_model=SettingsResponse,
    summary="获取系统设置",
    description="获取所有系统设置，包括外观、通知、监控和 API 配置",
    responses={200: {"description": "成功获取设置"}}
)
async def get_settings(db: AsyncSession = Depends(get_db)):
    """获取系统设置"""
    return await get_settings_from_db(db)


@router.put(
    "/settings",
    response_model=SettingsResponse,
    summary="更新系统设置",
    description="更新系统设置，支持部分更新",
    responses={200: {"description": "设置更新成功"}}
)
async def update_settings(settings_data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    """更新系统设置"""
    update_data = settings_data.model_dump(exclude_unset=True)

    # Save each setting to database
    for key, value in update_data.items():
        # Convert camelCase to snake_case for DB storage
        db_key = key.replace("notifyFrequency", "notify_frequency") \
                     .replace("quietHoursEnabled", "quiet_hours_enabled") \
                     .replace("quietHoursStart", "quiet_hours_start") \
                     .replace("quietHoursEnd", "quiet_hours_end") \
                     .replace("scanInterval", "scan_interval") \
                     .replace("dataSources", "data_sources") \
                     .replace("autoScan", "auto_scan") \
                     .replace("notifyEmail", "notify_email") \
                     .replace("browserNotify", "browser_notify") \
                     .replace("emailNotify", "email_notify") \
                     .replace("openrouterApiKey", "openrouter_api_key") \
                     .replace("twitterApiKey", "twitter_api_key")

        if isinstance(value, dict):
            value = json.dumps(value)
        elif isinstance(value, bool):
            value = "true" if value else "false"

        await save_setting(db, db_key, str(value))

    return await get_settings_from_db(db)