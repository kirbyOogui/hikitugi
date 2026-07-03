"""SQLAlchemyのengine・セッション生成をまとめるモジュール。"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

# RenderのDATABASE_URLは"postgres://"形式で発行されることがあるが、
# SQLAlchemy(psycopg2)は"postgresql://"を要求するため変換しておく。
_database_url = settings.database_url
if _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(_database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """全モデルの基底クラス。"""


def get_db() -> Generator[Session, None, None]:
    """FastAPIのDependsで使うDBセッション取得関数。

    リクエスト単位でセッションを生成し、処理完了後に必ずcloseする。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
