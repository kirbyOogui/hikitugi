"""問い合わせのあった忘れ物のCRUD・対応済み/再登録API。売切商品(soldout.py)と同じ構成。"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HANDOVER_STATUS_ACTIVE, HANDOVER_STATUS_DONE, LostItem
from app.schemas import LostItemCreate, LostItemOut, LostItemUpdate

router = APIRouter(prefix="/api/lost-items", tags=["lost_items"])


@router.get("", response_model=list[LostItemOut])
def list_lost_items(
    status: Literal["active", "done"] = "active", db: Session = Depends(get_db)
) -> list[LostItem]:
    """忘れ物一覧を返す。statusで未対応(active)/対応済み(done)を切り替える。"""
    stmt = select(LostItem).where(LostItem.status == status).order_by(LostItem.created_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=LostItemOut, status_code=201)
def create_lost_item(payload: LostItemCreate, db: Session = Depends(get_db)) -> LostItem:
    """忘れ物を追加する。"""
    item = LostItem(name=payload.name, status=HANDOVER_STATUS_ACTIVE)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=LostItemOut)
def update_lost_item(
    item_id: int, payload: LostItemUpdate, db: Session = Depends(get_db)
) -> LostItem:
    """忘れ物名を編集する。"""
    item = db.get(LostItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="忘れ物が見つかりません")

    item.name = payload.name
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}/done", response_model=LostItemOut)
def mark_lost_item_done(item_id: int, db: Session = Depends(get_db)) -> LostItem:
    """忘れ物を対応済みにする（一覧から消え、対応済み一覧へ移動する）。"""
    item = db.get(LostItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="忘れ物が見つかりません")

    item.status = HANDOVER_STATUS_DONE
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}/reopen", response_model=LostItemOut)
def reopen_lost_item(item_id: int, db: Session = Depends(get_db)) -> LostItem:
    """対応済みの忘れ物を未対応に戻す（再登録）。"""
    item = db.get(LostItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="忘れ物が見つかりません")

    item.status = HANDOVER_STATUS_ACTIVE
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_lost_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """忘れ物を完全削除する。"""
    item = db.get(LostItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="忘れ物が見つかりません")

    db.delete(item)
    db.commit()
