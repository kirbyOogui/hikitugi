"""ゴミ庫状態（空/満）のAPI。常にid=1の1行のみを読み書きするシングルトン。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GARBAGE_STATUS_EMPTY, GarbageStatus
from app.schemas import GarbageStatusOut, GarbageStatusUpdate

router = APIRouter(prefix="/api/garbage", tags=["garbage"])

SINGLETON_ID = 1


def _get_or_create(db: Session) -> GarbageStatus:
    """ゴミ庫状態の行を取得する。まだ無ければ「空」で新規作成する。"""
    status_row = db.get(GarbageStatus, SINGLETON_ID)
    if status_row is None:
        status_row = GarbageStatus(id=SINGLETON_ID, status=GARBAGE_STATUS_EMPTY)
        db.add(status_row)
        db.commit()
        db.refresh(status_row)
    return status_row


@router.get("", response_model=GarbageStatusOut)
def get_garbage_status(db: Session = Depends(get_db)) -> GarbageStatus:
    """現在のゴミ庫状態を取得する。"""
    return _get_or_create(db)


@router.put("", response_model=GarbageStatusOut)
def update_garbage_status(
    payload: GarbageStatusUpdate, db: Session = Depends(get_db)
) -> GarbageStatus:
    """ゴミ庫状態をトグル変更する。押した瞬間に即保存される想定。"""
    status_row = _get_or_create(db)
    status_row.status = payload.status
    db.commit()
    db.refresh(status_row)
    return status_row
