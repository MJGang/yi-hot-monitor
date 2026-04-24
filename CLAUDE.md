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

- **数据流割裂导致字段遗漏** - 原因：数据从搜索 → 解析 → AI分析 → 数据库 → API响应 → 前端，在每个层级独立定义数据结构，添加字段时容易遗漏某处。解决：见下方「架构设计原则」

## 架构设计原则（经验总结）

### 1. 单一数据模型（Single Source of Truth）

数据模型只定义一次，所有层使用同一模型：

```
搜索结果 → 统一解析器 → 核心数据模型 → 数据库 ← → API响应 ← → 前端类型
                ↓
           Pydantic Schema（所有层共用）
```

**错误做法**：在搜索服务、AI服务、数据库模型、API Schema、前端类型各自独立定义同一数据结构。

**正确做法**：
```python
# 定义单一核心模型
class HotspotData(BaseModel):
    title: str
    stats: HotspotStats  # 嵌套 schema

# 搜索结果统一解析为此模型
def parse_to_hotspot(result: dict, source: str) -> HotspotData

# 数据库直接用此模型
hotspot = Hotspot(**hotspot_data.model_dump())

# API 直接返回此模型
return HotspotData.model_validate(hotspot)
```

### 2. 数据流链路检查清单

每次添加/修改数据字段时，必须检查以下所有链路，缺一不可：

- [ ] 搜索服务 → 返回原始数据
- [ ] 解析器 → 转换为统一格式
- [ ] AI 分析服务 → 保留/转换字段
- [ ] 数据库模型 → 添加对应列
- [ ] 数据库迁移 → 生成并执行
- [ ] API Schema → 添加字段
- [ ] API 响应 → 正确映射
- [ ] 前端类型定义 → 保持一致
- [ ] 前端组件 → 正确使用

### 3. 避免重复定义

- **禁止**：在多个文件定义相似的数据结构
- **允许**：数据库模型继承统一 Schema，或通过映射自动转换
- **推荐**：使用 ORM 事件或 Pydantic validator 自动处理数据转换

### 4. 前后端类型同步

- 后端 Pydantic Schema 作为事实标准
- 前端类型从后端 Schema 自动生成（如通过 tRPC、GraphQL CodeGen、或 OpenAPI Generator）
- 避免手动维护两套类型定义

### 5. 端到端测试覆盖

对核心数据流编写端到端测试，验证：
- 搜索 → 数据库 → API 响应数据完整性
- 字段映射不错漏
- 类型定义一致

### 6. 代码组织

- **纵向分层**：按职责分层（路由 → 服务 → 数据库），每层只关注自己的抽象
- **横向拆分**：按领域/实体拆分，而非按技术组件拆分
- **就近原则**：数据和操作数据的逻辑放在一起

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