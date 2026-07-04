"""表示設定（NEWマークを表示する日数）のAPI。常にid=1の1行のみを読み書きするシングルトン。"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DisplaySettings
from app.schemas import DisplaySettingsOut, DisplaySettingsUpdate

router = APIRouter(prefix="/api/display-settings", tags=["display-settings"])

SINGLETON_ID = 1


def _get_or_create(db: Session) -> DisplaySettings:
    """表示設定の行を取得する。まだ無ければデフォルト値で新規作成する。"""
    settings_row = db.get(DisplaySettings, SINGLETON_ID)
    if settings_row is None:
        settings_row = DisplaySettings(id=SINGLETON_ID)
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


@router.get("", response_model=DisplaySettingsOut)
def get_display_settings(db: Session = Depends(get_db)) -> DisplaySettings:
    """現在の表示設定を取得する。"""
    return _get_or_create(db)


@router.put("", response_model=DisplaySettingsOut)
def update_display_settings(
    payload: DisplaySettingsUpdate, db: Session = Depends(get_db)
) -> DisplaySettings:
    """表示設定を更新する。"""
    settings_row = _get_or_create(db)
    settings_row.new_badge_days = payload.new_badge_days
    db.commit()
    db.refresh(settings_row)
    return settings_row
