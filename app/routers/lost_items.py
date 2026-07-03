"""問い合わせのあった忘れ物のCRUD API。売切商品(soldout.py)と同じ構成。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LostItem
from app.schemas import LostItemCreate, LostItemOut

router = APIRouter(prefix="/api/lost-items", tags=["lost_items"])


@router.get("", response_model=list[LostItemOut])
def list_lost_items(db: Session = Depends(get_db)) -> list[LostItem]:
    """忘れ物を新しい順に返す。"""
    stmt = select(LostItem).order_by(LostItem.created_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=LostItemOut, status_code=201)
def create_lost_item(payload: LostItemCreate, db: Session = Depends(get_db)) -> LostItem:
    """忘れ物を追加する。"""
    item = LostItem(name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_lost_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """忘れ物を削除する（引き取り完了・問い合わせ解消時）。"""
    item = db.get(LostItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="忘れ物が見つかりません")

    db.delete(item)
    db.commit()
