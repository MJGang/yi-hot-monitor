#!/bin/bash
# Yi Hot Monitor 后端环境初始化脚本

set -e

echo "======================================"
echo "  Yi Hot Monitor 环境初始化"
echo "======================================"

# 1. 检查 .env 文件
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  未找到 .env 配置文件"
    echo "   正在从 .env.example 创建..."
    cp .env.example .env
    echo "✓ 已创建 .env 文件，请编辑并填写必要的配置"
    echo ""
    echo "必填项:"
    echo "  - DATABASE_URL: 数据库连接字符串"
    echo "  - DEEPSEEK_API_KEY 或 MINIMAX_API_KEY: AI API 密钥"
    echo ""
    read -p "按回车继续 (如果有数据库配置)..."
fi

# 2. 安装依赖
echo ""
echo ">>> 安装依赖..."
uv sync

# 3. 数据库迁移
echo ""
echo ">>> 检查数据库迁移..."
if ! uv run alembic current > /dev/null 2>&1; then
    echo "   数据库迁移尚未运行..."
else
    echo "   当前数据库版本: $(uv run alembic current 2>/dev/null || echo 'unknown')"
fi

echo ""
echo ">>> 运行数据库迁移..."
uv run alembic upgrade head

# 4. 提示信息
echo ""
echo "======================================"
echo "  初始化完成！"
echo "======================================"
echo ""
echo "启动服务: uv run uvicorn app.main:app --reload --port 3001"
echo ""