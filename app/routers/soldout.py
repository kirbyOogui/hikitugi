"""売切商品のCRUD API。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SoldoutItem
from app.schemas import SoldoutItemCreate, SoldoutItemOut

router = APIRouter(prefix="/api/soldout", tags=["soldout"])


@router.get("", response_model=list[SoldoutItemOut])
def list_soldout_items(db: Session = Depends(get_db)) -> list[SoldoutItem]:
    """売切商品を新しい順に返す。"""
    stmt = select(SoldoutItem).order_by(SoldoutItem.created_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=SoldoutItemOut, status_code=201)
def create_soldout_item(
    payload: SoldoutItemCreate, db: Session = Depends(get_db)
) -> SoldoutItem:
    """売切商品を追加する。"""
    item = SoldoutItem(name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_soldout_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """売切商品を削除する（売り切れ解消時）。"""
    item = db.get(SoldoutItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="売切商品が見つかりません")

    db.delete(item)
    db.commit()
