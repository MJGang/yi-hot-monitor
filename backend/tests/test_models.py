import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.database import Base
from app.models import Keyword, Hotspot, Notification, Setting


@pytest.fixture
async def async_session():
    """Create a test database session"""
    engine = create_async_engine("mysql+aiomysql://user:password@localhost:3306/hotspot_db_test", echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_keyword_model(async_session):
    """Test Keyword model creation"""
    keyword = Keyword(text="GPT-5", category="AI")
    async_session.add(keyword)
    await async_session.commit()

    result = await async_session.get(Keyword, keyword.id)
    assert result is not None
    assert result.text == "GPT-5"
    assert result.category == "AI"
    assert result.is_active is True


@pytest.mark.asyncio
async def test_hotspot_model(async_session):
    """Test Hotspot model creation"""
    keyword = Keyword(text="Claude 3.5")
    async_session.add(keyword)
    await async_session.commit()

    hotspot = Hotspot(
        title="Claude 3.5 Released",
        content="Anthropic announces Claude 3.5",
        url="https://example.com",
        source="twitter",
        source_id="12345",
        is_real=True,
        relevance=85,
        importance="high",
        keyword_id=keyword.id,
    )
    async_session.add(hotspot)
    await async_session.commit()

    result = await async_session.get(Hotspot, hotspot.id)
    assert result is not None
    assert result.title == "Claude 3.5 Released"
    assert result.relevance == 85
    assert result.keyword_id == keyword.id


@pytest.mark.asyncio
async def test_notification_model(async_session):
    """Test Notification model creation"""
    notification = Notification(
        type="hotspot",
        title="New Hotspot",
        content="A new hotspot was detected",
    )
    async_session.add(notification)
    await async_session.commit()

    result = await async_session.get(Notification, notification.id)
    assert result is not None
    assert result.type == "hotspot"
    assert result.is_read is False
