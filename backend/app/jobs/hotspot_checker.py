"""
热点定时检查任务

使用 APScheduler 实现定时扫描
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers import interval

from app.services.scanner import scan_all_keywords

logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler = AsyncIOScheduler()

# 扫描间隔（分钟）
SCAN_INTERVAL_MINUTES = 30


async def run_hotspot_check():
    """执行热点检查任务"""
    logger.info("🔄 Running scheduled hotspot check...")
    try:
        result = await scan_all_keywords()
        logger.info(f"✅ Scheduled scan completed: {result}")
    except Exception as e:
        logger.error(f"❌ Scheduled scan failed: {e}")


def start_scheduler():
    """启动定时调度器"""
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return

    # 添加定时任务
    scheduler.add_job(
        run_hotspot_check,
        trigger=interval(minutes=SCAN_INTERVAL_MINUTES),
        id="hotspot_check",
        name="热点定时扫描",
        replace_existing=True,
        misfire_grace_time=60  # 错过任务后60秒内仍会执行
    )

    scheduler.start()
    logger.info(f"✅ Scheduler started - hotspot check every {SCAN_INTERVAL_MINUTES} minutes")


def stop_scheduler():
    """停止定时调度器"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 Scheduler stopped")
