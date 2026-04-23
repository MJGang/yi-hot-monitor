# 🔥 热点监控工具 (Yi Hot Monitor)

> 一款自动发现热点、智能识别真假内容、实时推送通知的 AI 工具

## 📋 项目概述

作为 AI 编程博主，需要第一时间获取热点信息（如 AI 大模型更新），本工具可以：
- 自动监控指定关键词的热点变化
- 利用 AI 识别假冒内容
- 第一时间发送通知
- 定期收集指定范围内的热点信息

## 🎯 核心功能

### 1. 关键词监控
- 用户输入要监控的关键词
- 当关键词相关内容出现时，利用 AI 识别真假
- 第一时间发送通知

### 2. 热点收集
- 每 30 分钟自动收集指定范围内的热点
- 多数据源聚合，确保信息全面
- AI 分析热点价值和可信度

### 3. 通知系统
- 浏览器实时推送 (WebSocket)
- 邮件通知 (SMTP)

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React + Vite + TailwindCSS | 响应式、赛博朋克风格 UI |
| 后端 | Python + FastAPI + uv | 高性能 API 服务 |
| 数据库 | MySQL + SQLAlchemy | 关系型数据库、ORM |
| AI 服务 | LangChain + LangGraph | DeepSeek/MiniMax LLM |
| 定时任务 | APScheduler | 定时热点抓取 |
| 实时通信 | Socket.io | 浏览器推送 |
| 邮件 | SMTP (aiosmtplib) | 异步邮件通知 |

## 📁 项目结构

```
yi-hot-monitor/
├── docs/                    # 文档目录
│   ├── README.md           # 项目说明
│   ├── REQUIREMENTS.md     # 需求文档
│   └── API_INTEGRATION.md  # API 集成文档
├── backend/                 # 后端服务 (Python)
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── services/       # 业务逻辑
│   │   │   ├── search/     # 搜索服务
│   │   │   ├── twitter/    # Twitter 服务
│   │   │   ├── ai/         # AI 分析服务 (LangChain/LangGraph)
│   │   │   └── notify/     # 通知服务
│   │   ├── jobs/           # 定时任务
│   │   ├── db/             # 数据库模型
│   │   └── utils/          # 工具函数
│   ├── pyproject.toml      # uv 项目配置
│   └── .env.example        # 环境变量模板
├── client/                  # 前端应用
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── pages/          # 页面
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── services/       # API 调用
│   │   └── styles/         # 样式
│   └── package.json
├── skills/                  # Agent Skills
│   └── SKILL.md            # 技能描述
└── .env.example            # 环境变量模板 (前端)
```

## ⚙️ 配置说明

### 后端环境变量 (backend/.env)

```env
# LLM 配置 (必填)
LLM_PROVIDER=deepseek        # deepseek 或 minimax
DEEPSEEK_API_KEY=your_deepseek_key
MINIMAX_API_KEY=your_minimax_key

# 数据库
DATABASE_URL=mysql+aiomysql://user:password@localhost:3306/hotspot_db

# Twitter API (twitterapi.io)
TWITTER_API_KEY=your_twitter_api_key

# 邮件通知
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
NOTIFY_EMAIL=receive@example.com

# 监控配置
MONITOR_INTERVAL=30         # 分钟

# WebSocket
WS_PORT=8765
```

## 🚀 快速开始

### 后端 (backend/)

```bash
# 1. 进入后端目录
cd backend

# 2. 使用 uv 安装依赖
uv sync

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入你的 API Keys

# 4. 启动开发服务器
uv run uvicorn app.main:app --reload --port 3001
```

### 前端 (client/)

```bash
# 1. 安装依赖
cd client && npm install

# 2. 配置环境变量
cp .env.example .env

# 3. 启动开发服务器
npm run dev
```

### 数据库初始化

```bash
cd backend

# 1. 创建数据库（MySQL 中执行）
# CREATE DATABASE hotspot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 2. 安装依赖
uv sync

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入数据库连接和 API Keys

# 4. 运行数据库迁移
uv run alembic upgrade head

# 5. 启动服务
uv run uvicorn app.main:app --reload --port 3001
```

### 数据库迁移命令

```bash
uv run alembic upgrade head     # 升级到最新版本
uv run alembic current          # 查看当前版本
uv run alembic history          # 查看迁移历史
uv run alembic downgrade -1     # 回滚一个版本
uv run alembic revision -m "xxx" # 创建新迁移
```

## 📝 开发日志

- [ ] 项目初始化
- [ ] 后端架构设计 (Python + FastAPI)
- [ ] 数据源对接
- [ ] AI 集成 (LangChain/LangGraph)
- [ ] 前端页面开发
- [ ] 通知系统开发
- [ ] 测试与验收
- [ ] Agent Skills 封装
