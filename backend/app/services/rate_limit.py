"""
请求频率限制器

基于 Redis 原子计数器实现滑动窗口限流，所有 worker 进程共享。
Redis 不可用时自动降级放行，不阻塞请求。
"""
import time
import asyncio


async def _get_redis_or_none():
    try:
        from app.redis import get_redis
        return await get_redis()
    except Exception:
        return None


class RateLimiter:
    """
    请求频率限制器，Redis 不可用时自动降级放行。

    Usage:
        limiter = RateLimiter("sogou", max_per_second=1)
        await limiter.acquire()
    """

    def __init__(self, name: str, max_per_second: float = 1.0):
        self.name = name
        self.max_per_second = max_per_second
        self._last_request_time = 0.0

    async def acquire(self):
        """等待直到可以发送请求，Redis 异常时降级放行"""
        redis = await _get_redis_or_none()
        if redis:
            try:
                await asyncio.wait_for(self._redis_acquire(redis), timeout=5.0)
            except (asyncio.TimeoutError, Exception):
                pass  # Redis 异常，降级放行
        else:
            await self._memory_acquire()

    async def _redis_acquire(self, redis):
        """Redis 滑动窗口限流：按秒分桶，最多等待 5 秒"""
        min_interval = 1.0 / self.max_per_second
        deadline = time.time() + 5.0
        while True:
            if time.time() > deadline:
                return
            now = int(time.time())
            key = f"ratelimit:{self.name}:{now}"
            try:
                count = await redis.incr(key)
                await redis.expire(key, 2)
            except Exception:
                return  # Redis 操作失败，降级放行

            if count <= self.max_per_second:
                return

            await asyncio.sleep(min_interval)

    async def _memory_acquire(self):
        """进程内内存限流（Redis 不可用时的回退）"""
        min_interval = 1.0 / self.max_per_second
        elapsed = time.time() - self._last_request_time
        if elapsed < min_interval:
            await asyncio.sleep(min_interval - elapsed)
        self._last_request_time = time.time()
