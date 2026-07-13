from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

DATABASE_URL = settings.database_url
is_sqlite = DATABASE_URL.startswith("sqlite")

# SQLite requires check_same_thread=False for async connection pools
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_async_engine(
    DATABASE_URL, 
    connect_args=connect_args, 
    echo=False,
    pool_pre_ping=True  # Important for maintaining long-lived connections (especially to Supabase)
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    """
    Dependency generator for async database sessions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    """
    Creates all database tables defined in our models.
    """
    async with engine.begin() as conn:
        from app.models.models import Base as ModelBase
        await conn.run_sync(ModelBase.metadata.create_all)
