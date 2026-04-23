# 🔌 API 集成技术文档

## 1. LLM 配置 (LangChain + LangGraph)

### 1.1 安装依赖

```bash
uv add langchain langchain-deepseek langchain-core
uv add langgraph
```

### 1.2 DeepSeek 配置

```python
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser

# DeepSeek 配置
llm = ChatOpenAI(
    model="deepseek-chat",
    openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
    openai_api_base="https://api.deepseek.com",
    temperature=0.3,
)
```

### 1.3 MiniMax 配置

```python
from langchain_openai import ChatOpenAI

# MiniMax 配置
llm = ChatOpenAI(
    model="MiniMax-Text-01",
    openai_api_key=os.getenv("MINIMAX_API_KEY"),
    openai_api_base="https://api.minimax.chat/v1",
    temperature=0.3,
)
```

### 1.4 热点分析 Chain

```python
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain.output_parsers import JsonOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", """你是一个热点分析专家，请分析以下内容：
1. 判断是否为真实的热点新闻（排除标题党、假新闻）
2. 评估该热点与 AI 编程领域的相关性（0-100分）
3. 评估热点的重要程度（low/medium/high/urgent）
4. 生成简短摘要（50字以内）

输出 JSON 格式：
{
  "isReal": true/false,
  "relevance": 0-100,
  "importance": "low/medium/high/urgent",
  "summary": "..."
}"""),
    ("user", "{content}")
])

output_parser = JsonOutputParser()
chain = prompt | llm | output_parser

async def analyze_hotspot(content: str) -> dict:
    result = await chain.ainvoke({"content": content})
    return result
```

### 1.5 LangGraph 工作流

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class HotspotState(TypedDict):
    content: str
    source: str
    url: str
    analysis: dict | None

def analyze_node(state: HotspotState) -> HotspotState:
    """AI 分析节点"""
    result = analyze_hotspot_sync(state["content"])
    return {"analysis": result}

def should_notify(state: HotspotState) -> bool:
    """判断是否发送通知"""
    if not state["analysis"]:
        return False
    return state["analysis"].get("isReal", False) and state["analysis"].get("relevance", 0) > 60

workflow = StateGraph(HotspotState)
workflow.add_node("analyze", analyze_node)
workflow.set_entry_point("analyze")
workflow.add_conditional_edges(
    "analyze",
    should_notify,
    {True: END, False: END}
)
app = workflow.compile()
```

---

## 2. Twitter API (twitterapi.io) 集成

### 2.1 认证

```python
import httpx

TWITTER_API_BASE = 'https://api.twitterapi.io'
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")

headers = {
    'X-API-Key': TWITTER_API_KEY,
    'Content-Type': 'application/json'
}
```

### 2.2 高级搜索 API

**Endpoint:** `GET /twitter/tweet/advanced_search`

**参数:**
- `query` (string, required): 搜索查询，支持高级语法
- `queryType` (enum, required): `Latest` 或 `Top`
- `cursor` (string, optional): 分页游标

**查询语法示例:**
```
"AI" OR "GPT" lang:en since:2024-01-01
from:OpenAI OR from:Anthropic
#AINews min_faves:100
```

**请求示例:**

```python
async def search_twitter(query: str, cursor: str | None = None):
    async with httpx.AsyncClient() as client:
        params = {"query": query, "queryType": "Latest"}
        if cursor:
            params["cursor"] = cursor

        response = await client.get(
            f"{TWITTER_API_BASE}/twitter/tweet/advanced_search",
            params=params,
            headers=headers
        )
        return response.json()
```

**响应格式:**

```json
{
  "tweets": [
    {
      "type": "tweet",
      "id": "1234567890",
      "url": "https://twitter.com/user/status/1234567890",
      "text": "Breaking: OpenAI announces GPT-5...",
      "source": "Twitter Web App",
      "retweetCount": 1500,
      "replyCount": 300,
      "likeCount": 5000,
      "quoteCount": 200,
      "viewCount": 150000,
      "createdAt": "2024-01-15T10:30:00Z",
      "lang": "en",
      "author": {
        "userName": "techreporter",
        "name": "Tech Reporter",
        "isBlueVerified": true,
        "followers": 50000,
        "profilePicture": "https://..."
      },
      "entities": {
        "hashtags": [{ "text": "AI" }],
        "urls": [{ "expanded_url": "https://..." }]
      }
    }
  ],
  "has_next_page": true,
  "next_cursor": "xxxx"
}
```

### 2.3 获取热门趋势

**Endpoint:** `GET /twitter/trends`

```python
async def get_trends(woeid: int = 1):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{TWITTER_API_BASE}/twitter/trends",
            params={"woeid": woeid},
            headers=headers
        )
        return response.json()
```

---

## 3. 网页搜索爬虫

### 3.1 Bing 搜索爬虫

```python
import httpx
from selectolax.parser import HTMLParser

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
]

async def search_bing(query: str) -> list[dict]:
    user_agent = random.choice(USER_AGENTS)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            'https://www.bing.com/search',
            params={"q": query},
            headers={"User-Agent": user_agent}
        )

    parser = HTMLParser(response.text)
    results = []

    for item in parser.css('li.b_algo'):
        title = item.css_first('h2 a')
        caption = item.css_first('.b_caption p')
        if title:
            results.append({
                "title": title.text(),
                "url": title.attrs.get('href'),
                "snippet": caption.text() if caption else "",
                "source": "bing"
            })

    return results
```

### 3.2 频率控制

```python
import asyncio
import time

class RateLimiter:
    def __init__(self, min_interval: float = 5.0):
        self.min_interval = min_interval
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.min_interval:
                await asyncio.sleep(self.min_interval - elapsed)
            self.last_request_time = time.time()
```

---

## 4. SQLAlchemy + SQLite 配置

### 4.1 模型定义

```python
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(String, primary_key=True)
    text = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hotspots = relationship("Hotspot", back_populates="keyword")

class Hotspot(Base):
    __tablename__ = "hotspots"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    url = Column(String, nullable=False)
    source = Column(String, nullable=False)  # twitter, bing, google
    source_id = Column(String, nullable=True)
    is_real = Column(Boolean, default=True)
    relevance = Column(Integer, default=0)
    importance = Column(String, default="low")
    summary = Column(Text, nullable=True)
    view_count = Column(Integer, nullable=True)
    like_count = Column(Integer, nullable=True)
    retweet_count = Column(Integer, nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    keyword_id = Column(String, ForeignKey("keywords.id"), nullable=True)

    keyword = relationship("Keyword", back_populates="hotspots")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)  # hotspot, alert
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    hotspot_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String, nullable=False)
```

### 4.2 数据库会话

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# MySQL 配置示例
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+aiomysql://user:password@localhost:3306/hotspot_db"
)

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session
```

### 4.3 迁移 (Alembic)

```bash
# 初始化 alembic
uv run alembic init alembic

# 生成迁移
uv run alembic revision --autogenerate -m "init"

# 执行迁移
uv run alembic upgrade head
```

---

## 5. FastAPI + WebSocket 配置

### 5.1 服务器配置

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import socketio

app = FastAPI()
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors={
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST"]
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.io 挂载到 FastAPI
socket_app = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def subscribe(sid, data):
    keywords = data.get("keywords", [])
    for kw in keywords:
        await sio.enter_room(sid, f"keyword:{kw}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

async def notify_new_hotspot(hotspot: dict):
    keyword = hotspot.get("keyword", {}).get("text", "")
    await sio.emit("hotspot:new", hotspot, room=f"keyword:{keyword}")
    await sio.emit("notification", {
        "type": "hotspot",
        "title": "发现新热点",
        "content": hotspot.get("title")
    })
```

### 5.2 路由结构

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter()

async def get_db():
    async with async_session() as session:
        yield session

@router.get("/keywords")
async def get_keywords(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Keyword).order_by(Keyword.created_at.desc()))
    return result.scalars().all()

@router.post("/keywords")
async def create_keyword(text: str, category: str | None = None, db: AsyncSession = Depends(get_db)):
    keyword = Keyword(id=str(uuid.uuid4()), text=text, category=category)
    db.add(keyword)
    await db.commit()
    return keyword

@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: str, db: AsyncSession = Depends(get_db)):
    keyword = await db.get(Keyword, keyword_id)
    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")
    await db.delete(keyword)
    await db.commit()
    return {"status": "ok"}
```

---

## 6. 定时任务配置

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("*/30 * * * *")
async def check_hotspots():
    print("Running hotspot check...")

    async with async_session() as db:
        result = await db.execute(select(Keyword).where(Keyword.is_active == True))
        keywords = result.scalars().all()

    for keyword in keywords:
        # 1. 从 Twitter 搜索
        tweets = await search_twitter(keyword.text)

        # 2. 从 Bing 搜索
        web_results = await search_bing(keyword.text)

        # 3. AI 分析
        for item in [...tweets, ...web_results]:
            state = {"content": item["content"], "source": item["source"], "url": item["url"]}
            result = await app.run(state)  # LangGraph

            if result["analysis"]["isReal"] and result["analysis"]["relevance"] > 60:
                # 4. 保存并通知
                hotspot = await save_hotspot(item, result["analysis"], keyword)
                await notify_new_hotspot(hotspot)

# 启动调度器
scheduler.start()
```

---

## 7. 邮件通知配置

```python
import aiosmtplib
from email.mime.text import MIMEText

async def send_email_notification(hotspot: dict):
    message = MIMEText(f"""
        <h2>{hotspot['title']}</h2>
        <p>{hotspot.get('summary', '')}</p>
        <p><strong>重要程度:</strong> {hotspot.get('importance', 'low')}</p>
        <p><strong>相关性:</strong> {hotspot.get('relevance', 0)}%</p>
        <p><a href="{hotspot['url']}">查看原文</a></p>
    """, "html")

    message["From"] = os.getenv("SMTP_USER")
    message["To"] = os.getenv("NOTIFY_EMAIL")
    message["Subject"] = f"🔥 新热点: {hotspot['title']}"

    await aiosmtplib.send(
        message,
        hostname=os.getenv("SMTP_HOST"),
        port=int(os.getenv("SMTP_PORT", 587)),
        username=os.getenv("SMTP_USER"),
        password=os.getenv("SMTP_PASS"),
        start_tls=True
    )
```
