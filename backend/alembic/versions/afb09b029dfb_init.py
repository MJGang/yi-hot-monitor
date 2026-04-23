"""init

Revision ID: afb09b029dfb
Revises:
Create Date: 2026-04-23 12:58:36.297640

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'afb09b029dfb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Initial schema - keywords, hotspots, notifications, settings tables"""
    # Keywords table
    op.create_table(
        'keywords',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('text', sa.String(255), nullable=False, unique=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Hotspots table
    op.create_table(
        'hotspots',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('url', sa.String(1000), nullable=False),
        sa.Column('source', sa.String(50), nullable=False),
        sa.Column('source_id', sa.String(255), nullable=True),
        sa.Column('is_real', sa.Boolean, default=True),
        sa.Column('relevance', sa.Integer, default=0),
        sa.Column('importance', sa.String(20), default='low'),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('view_count', sa.Integer, nullable=True),
        sa.Column('like_count', sa.Integer, nullable=True),
        sa.Column('retweet_count', sa.Integer, nullable=True),
        sa.Column('published_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('keyword_id', sa.String(36), sa.ForeignKey('keywords.id'), nullable=True),
    )

    # Notifications table
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_read', sa.Boolean, default=False),
        sa.Column('hotspot_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
    )

    # Settings table
    op.create_table(
        'settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('key', sa.String(255), nullable=False, unique=True),
        sa.Column('value', sa.Text, nullable=False),
    )


def downgrade() -> None:
    """Drop all tables"""
    op.drop_table('settings')
    op.drop_table('notifications')
    op.drop_table('hotspots')
    op.drop_table('keywords')