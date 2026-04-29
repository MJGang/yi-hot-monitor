import redis.asyncio as aioredis
from app.config import get_settings

settings = get_settings()

pool = aioredis.ConnectionPool.from_url(
    settings.redis_url,
    max_connections=20,
)


async def get_redis() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=pool)


async def close_redis():
    await pool.disconnect()
