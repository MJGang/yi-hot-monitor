from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db, close_db
from app.websocket import router as ws_router
from app.api.hotspots import router as hotspots_router
from app.api.stats import router as stats_router
from app.api.keywords import router as keywords_router
from app.api.notifications import router as notifications_router
from app.api.settings import router as settings_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()

    try:
        from app.redis import get_redis
        redis = await get_redis()
        await redis.ping()
        # 清理可能残留的旧进程锁（重启前未正常释放）
        await redis.delete("lock:scan")
        print("✓ Redis 连接成功")
    except Exception as e:
        print(f"⚠ Redis 不可用，缓存和去重功能降级: {e}")

    # 启动定时调度器
    from app.jobs import start_scheduler
    start_scheduler()

    yield
    # Shutdown
    from app.jobs import stop_scheduler
    stop_scheduler()
    try:
        from app.redis import close_redis
        await close_redis()
    except Exception:
        pass
    await close_db()


app = FastAPI(
    title="Yi Hot Monitor API",
    description="AI Hotspot Monitor Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(hotspots_router)
app.include_router(stats_router)
app.include_router(keywords_router)
app.include_router(notifications_router)
app.include_router(settings_router)
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "Yi Hot Monitor API", "version": "0.1.0"}
