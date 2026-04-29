# Redis 集成方案

## Redis 是什么

把 Redis 想象成一个**放在内存里的公共黑板**。你的应用（包括多个进程、多个容器）都能往上面写东西、读东西，而且读写得非常快，因为所有数据都在内存里。

跟 MySQL 的区别：MySQL 是**硬盘存储**，适合存需要持久保存的结构化数据（用户、订单、热点记录）。Redis 是**内存缓存**，适合存临时数据、计数器、锁——这些东西变得快、不需要存一辈子。

跟 Python 内存字典的区别：你现在的 `expansion_cache = {}` 只在当前进程有效，服务重启就没了，多个 worker 进程各有一份互相不知道。Redis 是所有进程共享的，重启也不丢。

## 我们会用到的 5 种 Redis 数据结构

### String（字符串）

最简单的类型。一个 key 对应一个 value。适合存缓存结果。

```
SET cache:ai:url_abc123 '{"relevance": 80, "summary": "..."}' EX 86400
GET cache:ai:url_abc123
```

`EX 86400` 表示 86400 秒（1 天）后自动删除，不需要手动清理。

### Set（集合）

一堆不重复的字符串。适合做去重——往里面加过的值，再加一次不会重复。

```
SADD seen:urls "https://example.com/news1"
SISMEMBER seen:urls "https://example.com/news1"  # 返回 1（存在）
SISMEMBER seen:urls "https://example.com/news2"  # 返回 0（不存在）
```

### Hash（哈希表）

类似 Python 的 dict。一个 key 下面有多个 field-value 对。适合存具有多个属性的对象。

```
HSET expansion:cache "Claude Sonnet" '["Claude Sonnet", "Sonnet 4.6", ...]'
HGET expansion:cache "Claude Sonnet"
```

### String + INCR（计数器）

Redis 的 INCR 命令是**原子操作**——多个进程同时 +1 不会出现竞态条件。适合做限流计数。

```
INCR rate:sogou:2026-04-28
EXPIRE rate:sogou:2026-04-28 86400
```

### String + SETNX（分布式锁）

`SETNX` = SET if Not eXists。只有 key 不存在时才能设置成功，只有一个进程能抢到锁。

```
SETNX scan:lock "worker-1"   # 返回 1（抢到了）
SETNX scan:lock "worker-2"   # 返回 0（没抢到）
EXPIRE scan:lock 600          # 10 分钟后自动释放，防止死锁
```

---

## 五个改动点详解

### 改动 1：URL 去重 → Redis Set

**现状**（`scanner.py:257-268`）：每条结果查一次数据库判断是否已存在。一个关键词扫 50 条结果就是 50 次 SQL 查询。数据库是硬盘 IO，慢。

```python
# 现在：每次查数据库
existing = await db.execute(
    select(Hotspot).where(
        Hotspot.source_id == source_id,
        Hotspot.source == source
    )
)
if existing.scalar_one_or_none():
    continue  # 已存在，跳过
```

**改为**：所有 URL 预先写入 Redis Set，判断是否已抓取过只需一次内存查询。

```python
# 改为：查 Redis Set，O(1) 内存操作
already_seen = await redis.sismember("hotspot:seen_urls", source_id)
if already_seen:
    continue  # 已存在，跳过

# 通过检查后，加入去重集合
await redis.sadd("hotspot:seen_urls", source_id)
```

**为什么用 Set**：Set 天然就是"不重复的集合"，`SISMEMBER` 查百万条数据也是 O(1)。

**数据生命周期**：持久保留，不设 TTL。如果担心内存占用过大，可以定期 `EXPIRE` 清理旧 key。

### 改动 2：AI 分析缓存 → Redis String

**现状**（`ai.py:245`）：同一个 URL 被不同关键词命中（"英伟达"和"NVIDIA"搜出同一条新闻），AI 会重复分析。每次调用 DeepSeek API 都要钱和时间，且完全相同的输入理应有相同的输出。

```python
# 现在：每条都调 AI，没有缓存
analysis = await analyze_hotspot(content, keyword, pre_match)
```

**改为**：对 URL 做 hash 作为缓存 key，分析前先查 Redis，命中则直接复用。

```python
import hashlib

url_hash = hashlib.md5(item.get("url", "").encode()).hexdigest()
cache_key = f"ai:analysis:{url_hash}"

# 先查缓存
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)

# 缓存未命中，调 AI
analysis = await analyze_hotspot(content, keyword, pre_match)
hotspot = build_hotspot(item, analysis)

# 写入缓存，1天后自动过期
await redis.set(cache_key, json.dumps(hotspot), ex=86400)
return hotspot
```

**为什么用 String**：分析结果是 JSON 字符串，不需要拆分存储，直接整体读写最方便。

**为什么设 1 天 TTL**：AI 分析结果不需要永久保留。1 天后自动过期，内存自动释放。而且同样的内容 1 天后可能有了新的上下文，重新分析也不浪费。

### 改动 3：请求频率限制 → Redis INCR

**现状**（`search.py:21-34` 和 `china_search.py:22-34`）：两个文件各写了一个几乎完全相同的 `RateLimiter` 类，用 Python 的 `time.time()` 记上次请求时间。问题：

1. **代码重复**：两个文件里的 RateLimiter 几乎是复制粘贴
2. **服务重启就丢了**：内存变量，重启后计数归零
3. **多 worker 互相不知道**：如果有 3 个 worker 进程，各记各的，没法统一限流

```python
# 现在：进程内记录时间戳
class RateLimiter:
    def __init__(self, min_interval=5.0):
        self.min_interval = min_interval
        self.last_request_time = 0.0

    async def acquire(self):
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()
```

**改为**：使用 Redis 的原子计数器实现**滑动窗口限流**。每个搜索源每秒钟最多 N 次请求。

```python
# 改为：Redis 原子计数器，所有进程共享
async def check_rate_limit(redis, source: str, max_per_second: int = 1) -> bool:
    """返回 True 表示允许请求，False 表示需要等待"""
    now = int(time.time())
    key = f"ratelimit:{source}:{now}"  # 按秒分桶

    count = await redis.incr(key)           # 原子 +1
    await redis.expire(key, 2)              # 2 秒后自动清理
    return count <= max_per_second

# 使用
if not await check_rate_limit(redis, "sogou", max_per_second=1):
    await asyncio.sleep(1)
```

**为什么用 INCR**：Redis 的 `INCR` 是原子操作。3 个进程同时对同一个 key 执行 `INCR`，返回的值分别是 1、2、3，不会出现两个都读到 1 再加成 2 的情况。这是 Redis 最经典的用法之一。

**为什么按秒分桶**：`ratelimit:sogou:1715359200`、`ratelimit:sogou:1715359201`，每秒一个新 key。2 秒后自动过期，不会堆积。

### 改动 4：扫描锁 → Redis SETNX

**现状**（`scanner.py:28-45`）：Python 类变量做锁，单进程没问题。但如果你以后用 Celery 多 worker，两个 worker 就会同时扫描，手机收到重复推送。

```python
# 现在：类变量，单进程可用
class ScanLock:
    _locked = False

    @classmethod
    def acquire(cls) -> bool:
        if cls._locked:
            return False
        cls._locked = True
        return True
```

**改为**：Redis `SETNX` 实现分布式锁，所有 worker 互斥。

```python
import uuid

async def acquire_scan_lock(redis, ttl: int = 600) -> str | None:
    """尝试获取扫描锁，返回锁 token。返回 None 表示已有其他进程在扫描"""
    token = str(uuid.uuid4())
    acquired = await redis.set("lock:scan", token, nx=True, ex=ttl)
    return token if acquired else None

async def release_scan_lock(redis, token: str):
    """释放扫描锁。只释放自己持有的锁，防止误删"""
    # Lua 脚本保证原子性：只有 value 匹配时才删除
    script = """
    if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
    else
        return 0
    end
    """
    await redis.eval(script, 1, "lock:scan", token)
```

**为什么用 SETNX + Lua 释放**：`SET key value NX EX ttl` 是一条命令同时做了"设值"和"仅当不存在时"和"设过期"三件事。释放时用 Lua 脚本检查 value 是否匹配，确保只有持锁的进程才能释放，不会误删别人的锁。

**为什么设 10 分钟过期**：防止死锁。万一进程崩溃没释放锁，10 分钟后 Redis 自动清理，不影响下次扫描。

### 改动 5：关键词扩展缓存 → Redis Hash

**现状**（`ai.py:26`）：Python 内存字典缓存 AI 生成的关键词扩展结果。服务重启就没了，下次还得调 LLM 重新生成。

```python
# 现在：进程内字典，重启就没了
expansion_cache: dict[str, list[str]] = {}
```

**改为**：Redis Hash。关键词作为 field，扩展结果（JSON 序列化的列表）作为 value。

```python
# 缓存 key 前缀: expansion:cache
# field: 原始关键词, value: JSON 序列化的扩展列表

async def get_expanded_keywords(redis, keyword: str) -> list[str] | None:
    cached = await redis.hget("expansion:cache", keyword)
    if cached:
        return json.loads(cached)
    return None

async def set_expanded_keywords(redis, keyword: str, variants: list[str]):
    await redis.hset("expansion:cache", keyword, json.dumps(variants))
```

**为什么用 Hash 而不是 String**：所有关键词扩展存在同一个 Hash 里，可以用 `HGETALL` 一次性遍历所有缓存，也可以用 `HDEL` 单独删某个关键词。如果用 String 的话会有一堆 key 散落在 Redis 里，不方便管理。Hash 就像 Redis 里的一个小字典。

---

## 新增模块：`backend/app/redis.py`

所有 Redis 交互集中在一个模块。其他服务只需 `from app.redis import get_redis` 即可。

```python
"""
Redis 连接管理

提供异步 Redis 客户端，所有服务共用同一个连接池。
"""
import redis.asyncio as aioredis
from app.config import get_settings

settings = get_settings()

# 连接池：复用连接，避免每次请求都建连
pool = aioredis.ConnectionPool.from_url(
    settings.redis_url,
    max_connections=20,
)


async def get_redis() -> aioredis.Redis:
    """获取 Redis 客户端"""
    return aioredis.Redis(connection_pool=pool)


async def close_redis():
    """关闭连接池"""
    await pool.disconnect()
```

## 配置变更

### `backend/app/config.py` 新增

```python
# 在 Settings 类中新增一行
redis_url: str = "redis://localhost:6379/0"
```

### `docker-compose.yml` 新增 Redis 服务

```yaml
redis:
  image: redis:7-alpine
  container_name: yi-hot-monitor-redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 5s
    timeout: 3s
    retries: 5

# backend 的 depends_on 加 redis
# backend 的 environment 加 REDIS_URL=redis://redis:6379/0
```

### `backend/pyproject.toml` 新增依赖

```toml
"redis[hiredis]>=5.0.0",
```

`hiredis` 是 C 语言写的 Redis 协议解析器，比纯 Python 快很多。

---

## 改动总览

| 文件 | 改动类型 | 内容 |
|------|---------|------|
| `app/redis.py` | **新增** | Redis 连接管理模块 |
| `app/config.py` | 修改 | 新增 `redis_url` 配置项 |
| `app/services/scanner.py` | 修改 | 去重用 Redis Set、锁用 Redis SETNX |
| `app/services/ai.py` | 修改 | 分析缓存用 Redis String、扩展缓存用 Redis Hash |
| `app/services/search.py` | 修改 | 限流器用 Redis INCR，删除手写 RateLimiter |
| `app/services/china_search.py` | 修改 | 同上 |
| `app/main.py` | 修改 | lifespan 中初始化/关闭 Redis |
| `backend/pyproject.toml` | 修改 | 新增 redis 依赖 |
| `docker-compose.yml` | 修改 | 新增 redis 服务 |
| `backend/.env.example` | 修改 | 新增 REDIS_URL 示例 |

## 实施步骤

1. 新增 `redis-py` 依赖
2. 创建 `app/redis.py` 连接管理模块
3. 修改 `config.py` 和 `main.py` 引入 Redis
4. 逐项迁移 5 个改动点（每个改完可以单独验证）
5. 修改 `docker-compose.yml` 加入 Redis 服务
6. 全栈启动验证
