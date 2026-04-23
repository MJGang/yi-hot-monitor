# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
无需我明确要求，当我需要库或API文档、生成代码、创建项目基架时或配置步骤时，始终使用Context7 MCP。
无需我明确要求，当我需要进行web搜索时，始终使用firecrawl。

## 项目概述

Yi Hot Monitor 是一款 AI 热点监控工具，自动发现热点、智能识别真假内容、实时推送通知。

## 常用命令

### 前端 (frontend/)

```bash
npm run dev      # 开发服务器 (默认端口见 vite.config.ts)
npm run build    # 构建生产版本
npm run lint     # ESLint 检查
npm run preview  # 预览构建结果
```

### 后端 (backend/)

```bash
cd backend
uv sync                    # 安装依赖
uv run uvicorn app.main:app --reload --port 3001  # 启动开发服务器
uv run pytest              # 运行测试
uv run pytest tests/xxx.py::test_func  # 运行单个测试
```

## 技术架构

### 前端
- **框架**: React 19 + TypeScript + Vite
- **样式**: TailwindCSS v4 (使用 `@tailwindcss/postcss` 插件)
- **UI 库**: Aceternity UI + Framer Motion
- **路径别名**: `@` 指向 `frontend/src/`
- **路由**: React Router v7

### 后端
- **框架**: FastAPI + Python 3.11+
- **包管理**: uv
- **数据库**: MySQL + SQLAlchemy 2.0 + aiomysql (异步驱动)
- **AI**: LangChain + LangGraph (DeepSeek/MiniMax)
- **实时通信**: Socket.IO
- **定时任务**: APScheduler
- **邮件**: aiosmtplib

### 后端目录结构
- `app/api/` - API 路由
- `app/services/` - 业务逻辑 (search/twitter/ai/notify)
- `app/jobs/` - 定时任务
- `app/models/` - 数据库模型
- `app/schemas/` - Pydantic schemas
- `app/websocket.py` - Socket.IO 事件处理

### 前端目录结构
- `src/components/` - UI 组件
- `src/pages/` - 页面 (Dashboard/Keywords/Notifications/Settings)
- `src/hooks/` - 自定义 Hooks
- `src/lib/` - 工具库

## 环境变量

前端: `frontend/.env` (参考 `frontend/.env.example`)
后端: `backend/.env` (参考 `backend/.env.example`)

后端必填: `LLM_PROVIDER`, `DEEPSEEK_API_KEY` 或 `MINIMAX_API_KEY`

## git commit message rule

commit message 必须符合 Conventional Commits 规范，格式如下：

```
<type>: <short summary>
```

其中，`<type>` 是 commit 类型，可以是以下之一：

- `feat`: 新功能（feature）
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（即不是新增功能，也不是修改bug的代码变动）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动

`<short summary>` 是 commit 的简短描述，应该简洁明了，不超过 50 个字符。不要是比较笼统的内容，例如 "更新代码" 或 "修复 bug"，应该具体描述 commit 的内容。

## 开发经验总结

遇到问题后，将经验总结归档到此，便于后续遇到类似问题时有据可查。

### 后端开发规范

1. **模块级语法检查** - 编写完新模块后，用 `python -c "import module"` 验证语法正确性，再启动服务
2. **启动阶段要容错** - 数据库、缓存等依赖服务未就绪时，应用应能正常启动（至少暴露管理接口），不要让非核心组件的失败导致整体不可用
3. **渐进式验证** - 分步验证：语法 → 导入 → 路由注册 → 服务启动，每步确认通过后再继续
4. **关键日志输出** - 启动阶段要有明确的日志，帮助快速定位哪个环节出问题

### 问题归档

- **服务启动但接口不注册** - 原因：模块语法错误导致导入失败，FastAPI 启动流程中断。解决：先验证模块能正常导入，再逐步排查

- **数据库初始化失败导致应用无法启动** - 原因：MySQL 服务未启动或配置错误。解决：在 `init_db()` 中捕获异常并打印友好提示，让应用仍能启动。关键：非核心组件失败不应导致整体不可用

## 快速开始

### 新环境初始化
```bash
cd backend
cp .env.example .env          # 编辑 .env 填写数据库配置
chmod +x setup.sh
./setup.sh                    # 或手动: uv sync
uv run uvicorn app.main:app --reload --port 3001
```

### 数据库创建（如不存在）
```sql
CREATE DATABASE hotspot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 数据库迁移
```bash
cd backend
uv run alembic upgrade head     # 执行迁移
uv run alembic current          # 查看当前版本
uv run alembic downgrade -1    # 回滚一个版本
uv run alembic history          # 查看迁移历史
```