# Docker 容器化方案

## 目标

`docker-compose up` 一键启动完整开发环境：MySQL + FastAPI（热重载）+ React（热重载），无需手动安装任何语言运行时。

## 架构

```
docker-compose up
├── mysql          — MySQL 8.0, utf8mb4, 数据持久化到 volume
├── backend        — FastAPI, uvicorn --reload, 端口 3001
│   └── 启动时自动执行 alembic upgrade head
└── frontend       — Vite dev server, 端口 5173, HMR
    └── API 请求通过 Vite proxy 转发到 backend:3001（容器内网络）
        WebSocket 直连 backend（容器内网络）
```

## 服务设计

### MySQL

| 项 | 值 |
|----|-----|
| 镜像 | `mysql:8.0` |
| 端口 | `3306`（映射到宿主机 `3307`，避免和本地 MySQL 冲突） |
| 数据库 | `hotspot_db`（首次启动自动创建） |
| 字符集 | `utf8mb4` |
| 数据持久化 | Docker volume `mysql_data` |
| 健康检查 | `mysqladmin ping`，就绪后 backend 才能启动 |

### Backend

| 项 | 值 |
|----|-----|
| 基础镜像 | `python:3.12-slim` |
| 包管理 | uv（在镜像内安装） |
| 依赖安装 | `uv sync`（利用 pyproject.toml） |
| 启动命令 | `uv run uvicorn app.main:socket_app --host 0.0.0.0 --port 3001 --reload` |
| 热重载 | 源码目录 mount 到容器内，代码修改即时生效 |
| 数据库迁移 | 启动时自动执行 `uv run alembic upgrade head` |
| 环境变量 | 通过 `.env` 文件注入，`.env.example` 作为模板 |

构建采用多阶段：
- **builder 阶段**：安装 uv，`uv sync` 生成虚拟环境
- **runtime 阶段**：从 builder 复制虚拟环境，最小化镜像体积

### Frontend

| 项 | 值 |
|----|-----|
| 基础镜像 | `node:22-alpine` |
| 启动命令 | `npm run dev` |
| 端口 | `5173`（映射到宿主机 `5173`） |
| 热重载 | Vite HMR，源码 mount 到容器内 |

关于 API 代理：开发模式下容器内网络拓扑如下：

```
Browser → localhost:5173 (Vite)
              │
              ├── /api/*       → proxy → backend:3001（容器内 DNS）
              ├── /socket.io/* → proxy → backend:3001（WebSocket）
              └── 其余          → Vite 静态服务
```

这意味着前端不需要感知 backend 的具体地址，Vite proxy 在容器内完成转发。需要在 `vite.config.ts` 中将 proxy target 改为 `http://backend:3001`（容器内 DNS 名称）。

由于这个改动会破坏非 Docker 开发环境，处理方式是：docker-compose 通过环境变量 `VITE_API_TARGET=http://backend:3001` 注入，vite.config.ts 优先读取环境变量，fallback 到 `http://localhost:3001`。

## 目录结构

```
项目根目录/
├── docker-compose.yml          # 编排文件
├── backend/
│   ├── Dockerfile              # Backend 镜像
│   ├── .dockerignore           # 排除 __pycache__ 等
│   ├── docker-entrypoint.sh    # 启动脚本（迁移 + uvicorn）
│   └── .env                    # 用户自己的环境变量
├── frontend/
│   ├── Dockerfile              # Frontend 镜像
│   └── .dockerignore
└── .env.docker                 # Docker 环境变量默认值（入仓库）
```

## 环境变量策略

三层优先级（由高到低）：

1. `backend/.env` — 用户本地配置，含 API Key，不入仓库
2. docker-compose.yml 中的 `environment` — 数据库连接等 Docker 特定值，入仓库
3. `.env.docker` — 非敏感默认值，入仓库

关键区分：DATABASE_URL 在 docker-compose 中写死为 `mysql+aiomysql://root:hotspot123@mysql:3306/hotspot_db`（host 是容器名 `mysql`，密码统一），用户的 API Key 仍从 `.env` 读取。

## 启动流程

```
1. docker-compose up
2. mysql 容器启动 → 健康检查通过
3. backend 容器启动 → entrypoint 执行 alembic upgrade head → uvicorn --reload
4. frontend 容器启动 → npm run dev
5. 浏览器打开 http://localhost:5173
```

## 不做的

- 不搞 Nginx 反向代理（开发环境不需要，生产部署后续再说）
- 不搞多阶段前端构建（当前聚焦开发体验）
- 不做 docker-compose.prod.yml（开发环境先跑通）
- 不把 .env 打入镜像（通过 volume/mount 注入）

## 实施步骤

1. 创建 `backend/Dockerfile`（多阶段，基于 uv）
2. 创建 `backend/docker-entrypoint.sh`（迁移 + 启动）
3. 创建 `backend/.dockerignore`
4. 创建 `frontend/Dockerfile`
5. 创建 `frontend/.dockerignore`
6. 创建 `docker-compose.yml`
7. 创建 `.env.docker`
8. 修改 `frontend/vite.config.ts`（支持环境变量配置 proxy target）
9. 添加 `.gitignore` 条目
10. 验证：`docker-compose up` 后 Dashboard 正常加载
