from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from sqlalchemy.orm import declarative_base

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        await session.execute(text("SET time_zone = '+00:00'"))
        yield session


async def init_db():
    """
    初始化数据库连接和表结构。
    支持两种启动模式：
    1. 正常模式：数据库已配置且可连接，创建表结构
    2. 演示模式：数据库不可用时，使用内存 SQLite 仅供界面展示
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✓ 数据库连接成功，表结构已就绪")
        return True
    except Exception as e:
        error_msg = str(e).lower()

        # 判断错误类型
        if "access denied" in error_msg or "authentication" in error_msg:
            print(f"✗ 数据库认证失败: 请检查 .env 中的 DATABASE_URL 配置")
        elif "unknown database" in error_msg:
            print(f"✗ 数据库不存在: 请先创建数据库 '{settings.database_url.split('/')[-1]}'")
        elif "connection refused" in error_msg or "can't connect" in error_msg:
            print(f"✗ 数据库连接失败: 请确保 MySQL 服务已启动")
        else:
            print(f"✗ 数据库连接失败: {e}")

        print("\n提示: 首次使用请参考 .env.example 创建 .env 配置文件")
        return False


async def close_db():
    await engine.dispose()