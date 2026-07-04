"""売切商品のCRUD・対応済み/再登録API。"""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HANDOVER_STATUS_ACTIVE, HANDOVER_STATUS_DONE, SoldoutItem
from app.schemas import SoldoutItemCreate, SoldoutItemOut, SoldoutItemUpdate

router = APIRouter(prefix="/api/soldout", tags=["soldout"])


@router.get("", response_model=list[SoldoutItemOut])
def list_soldout_items(
    status: Literal["active", "done"] = "active", db: Session = Depends(get_db)
) -> list[SoldoutItem]:
    """売切商品一覧を返す。statusで未対応(active)/対応済み(done)を切り替える。"""
    stmt = (
        select(SoldoutItem)
        .where(SoldoutItem.status == status)
        .order_by(SoldoutItem.created_at.desc())
    )
    return list(db.scalars(stmt))


@router.post("", response_model=SoldoutItemOut, status_code=201)
def create_soldout_item(
    payload: SoldoutItemCreate, db: Session = Depends(get_db)
) -> SoldoutItem:
    """売切商品を追加する。"""
    item = SoldoutItem(name=payload.name, status=HANDOVER_STATUS_ACTIVE)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=SoldoutItemOut)
def update_soldout_item(
    item_id: int, payload: SoldoutItemUpdate, db: Session = Depends(get_db)
) -> SoldoutItem:
    """売切商品名を編集する。"""
    item = db.get(SoldoutItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="売切商品が見つかりません")

    item.name = payload.name
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}/done", response_model=SoldoutItemOut)
def mark_soldout_item_done(item_id: int, db: Session = Depends(get_db)) -> SoldoutItem:
    """売切商品を対応済みにする（一覧から消え、対応済み一覧へ移動する）。"""
    item = db.get(SoldoutItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="売切商品が見つかりません")

    item.status = HANDOVER_STATUS_DONE
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}/reopen", response_model=SoldoutItemOut)
def reopen_soldout_item(item_id: int, db: Session = Depends(get_db)) -> SoldoutItem:
    """対応済みの売切商品を未対応に戻す（再登録）。"""
    item = db.get(SoldoutItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="売切商品が見つかりません")

    item.status = HANDOVER_STATUS_ACTIVE
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_soldout_item(item_id: int, db: Session = Depends(get_db)) -> None:
    """売切商品を完全削除する。"""
    item = db.get(SoldoutItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="売切商品が見つかりません")

    db.delete(item)
    db.commit()
