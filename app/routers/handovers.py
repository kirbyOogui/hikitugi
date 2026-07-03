"""引継ぎのCRUD・対応済み/再登録API。"""
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.cloudinary_client import delete_photo, upload_photo
from app.database import get_db
from app.models import (
    HANDOVER_STATUS_ACTIVE,
    HANDOVER_STATUS_DONE,
    Category,
    Handover,
    HandoverPhoto,
)
from app.schemas import HandoverOut

router = APIRouter(prefix="/api/handovers", tags=["handovers"])


def _handover_query():
    """カテゴリ・写真を一括ロードするための共通クエリ（N+1防止）。"""
    return select(Handover).options(
        selectinload(Handover.category), selectinload(Handover.photos)
    )


@router.get("", response_model=list[HandoverOut])
def list_handovers(
    status: Literal["active", "done"] = "active", db: Session = Depends(get_db)
) -> list[Handover]:
    """引継ぎ一覧を返す。statusで未対応(active)/対応済み(done)を切り替える。"""
    stmt = _handover_query().where(Handover.status == status).order_by(Handover.created_at.desc())
    return list(db.scalars(stmt))


@router.post("", response_model=HandoverOut, status_code=201)
def create_handover(
    category_id: int = Form(...),
    body: str = Form(..., min_length=1),
    photos: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
) -> Handover:
    """引継ぎを追加する。写真は任意で複数枚添付できる。"""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="指定されたカテゴリが存在しません")

    handover = Handover(category_id=category_id, body=body, status=HANDOVER_STATUS_ACTIVE)

    # ファイル未選択時、フロントから空のUploadFileが1件混ざることがあるため中身の有無で判定する
    for photo in photos:
        if not photo.filename:
            continue
        url, public_id = upload_photo(photo)
        handover.photos.append(HandoverPhoto(url=url, public_id=public_id))

    db.add(handover)
    db.commit()
    db.refresh(handover)
    return handover


@router.put("/{handover_id}", response_model=HandoverOut)
def update_handover(
    handover_id: int,
    category_id: int = Form(...),
    body: str = Form(..., min_length=1),
    photos: list[UploadFile] = File(default=[]),
    delete_photo_ids: list[int] = Form(default=[]),
    db: Session = Depends(get_db),
) -> Handover:
    """既存の引継ぎを編集する。カテゴリ・本文の変更、写真の追加・削除に対応する。"""
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="引継ぎが見つかりません")

    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=400, detail="指定されたカテゴリが存在しません")

    handover.category_id = category_id
    handover.body = body

    if delete_photo_ids:
        photos_by_id = {photo.id: photo for photo in handover.photos}
        for photo_id in delete_photo_ids:
            photo = photos_by_id.get(photo_id)
            if photo is None:
                continue
            delete_photo(photo.public_id)
            handover.photos.remove(photo)

    for photo in photos:
        if not photo.filename:
            continue
        url, public_id = upload_photo(photo)
        handover.photos.append(HandoverPhoto(url=url, public_id=public_id))

    db.commit()
    db.refresh(handover)
    return handover


@router.put("/{handover_id}/done", response_model=HandoverOut)
def mark_done(handover_id: int, db: Session = Depends(get_db)) -> Handover:
    """引継ぎを対応済みにする（一覧から消え、対応済み一覧へ移動する）。"""
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="引継ぎが見つかりません")

    handover.status = HANDOVER_STATUS_DONE
    db.commit()
    db.refresh(handover)
    return handover


@router.put("/{handover_id}/reopen", response_model=HandoverOut)
def reopen_handover(handover_id: int, db: Session = Depends(get_db)) -> Handover:
    """対応済みの引継ぎを未対応に戻す（再登録）。"""
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="引継ぎが見つかりません")

    handover.status = HANDOVER_STATUS_ACTIVE
    db.commit()
    db.refresh(handover)
    return handover


@router.delete("/{handover_id}", status_code=204)
def delete_handover(handover_id: int, db: Session = Depends(get_db)) -> None:
    """引継ぎを完全削除する。添付写真もCloudinaryから削除する。"""
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="引継ぎが見つかりません")

    for photo in handover.photos:
        delete_photo(photo.public_id)

    db.delete(handover)
    db.commit()
