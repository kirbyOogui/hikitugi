"""カテゴリのCRUD・並び替えAPI。"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Category, Handover
from app.schemas import CategoryCreate, CategoryOut, CategoryReorderRequest, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)) -> list[Category]:
    """表示順（sort_order）でカテゴリ一覧を返す。"""
    stmt = select(Category).order_by(Category.sort_order)
    return list(db.scalars(stmt))


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)) -> Category:
    """カテゴリを追加する。表示順は末尾に追加する。"""
    max_order = db.scalar(select(func.max(Category.sort_order))) or 0
    category = Category(name=payload.name, sort_order=max_order + 1)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/reorder", response_model=list[CategoryOut])
def reorder_categories(
    payload: CategoryReorderRequest, db: Session = Depends(get_db)
) -> list[Category]:
    """ドラッグ&ドロップ後のID順を受け取り、sort_orderを一括更新する。"""
    categories = {c.id: c for c in db.scalars(select(Category))}

    missing_ids = set(payload.order) - set(categories.keys())
    if missing_ids:
        raise HTTPException(status_code=400, detail=f"存在しないカテゴリIDです: {missing_ids}")

    for index, category_id in enumerate(payload.order):
        categories[category_id].sort_order = index

    db.commit()
    stmt = select(Category).order_by(Category.sort_order)
    return list(db.scalars(stmt))


@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)
) -> Category:
    """カテゴリ名を編集する。"""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    category.name = payload.name
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)) -> None:
    """カテゴリを削除する。紐づく引継ぎ（対応済み含む）が1件でもあれば削除不可。"""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")

    handover_count = db.scalar(
        select(func.count()).select_from(Handover).where(Handover.category_id == category_id)
    )
    if handover_count > 0:
        raise HTTPException(
            status_code=400,
            detail="このカテゴリには引継ぎが残っているため削除できません。先に引継ぎを完全削除してください。",
        )

    db.delete(category)
    db.commit()
