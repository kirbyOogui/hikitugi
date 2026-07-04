"""FastAPIアプリのエントリーポイント。

- 起動時にテーブル作成（Base.metadata.create_all）と初期カテゴリのseedを行う
- 各routerを登録する
- 静的ファイル（HTML/CSS/JS）を配信する
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select, text

from app.database import Base, SessionLocal, engine
from app.models import Category
from app.routers import categories, garbage, handovers, lost_items, soldout, uploads

# 初期カテゴリ（表示順もこの並びで登録する）
INITIAL_CATEGORIES = ["ブース席", "カラオケ", "2R", "その他"]


def _seed_initial_categories() -> None:
    """カテゴリが1件も無い場合のみ、初期カテゴリを登録する（初回起動時のみ実行される）。"""
    db = SessionLocal()
    try:
        existing = db.scalar(select(Category).limit(1))
        if existing is not None:
            return
        for order, name in enumerate(INITIAL_CATEGORIES):
            db.add(Category(name=name, sort_order=order))
        db.commit()
    finally:
        db.close()


def _ensure_handover_sort_order_column() -> None:
    """handoversテーブルにsort_order列が無ければ追加する（Alembic未導入のための簡易マイグレーション）。

    既にsort_order列を持つ状態でテーブルごと新規作成された場合はここでは何もしない。
    既存テーブルに列を追加した場合のみ、それまでの表示順（作成日時の新しい順）を
    保つようbackfillする。
    """
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("handovers")}
    if "sort_order" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE handovers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"))
        rows = conn.execute(text("SELECT id FROM handovers ORDER BY created_at DESC")).fetchall()
        for index, (handover_id,) in enumerate(rows):
            conn.execute(
                text("UPDATE handovers SET sort_order = :sort_order WHERE id = :id"),
                {"sort_order": index, "id": handover_id},
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """起動時にテーブル作成・初期カテゴリseedを行うlifespanハンドラ。"""
    Base.metadata.create_all(bind=engine)
    _ensure_handover_sort_order_column()
    _seed_initial_categories()
    yield


app = FastAPI(title="引継書", lifespan=lifespan)

# APIルーター登録
app.include_router(categories.router)
app.include_router(handovers.router)
app.include_router(soldout.router)
app.include_router(lost_items.router)
app.include_router(garbage.router)
app.include_router(uploads.router)

# 静的ファイル（CSS/JS）配信。index.html/settings.html自体は下の個別routeで返す。
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
def home_page() -> FileResponse:
    """ホーム画面を返す。"""
    return FileResponse("static/index.html")


@app.get("/settings", include_in_schema=False)
def settings_page() -> FileResponse:
    """設定画面を返す。"""
    return FileResponse("static/settings.html")
