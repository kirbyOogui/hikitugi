"""APIのリクエスト/レスポンスで使うPydanticスキーマ。"""
from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# --- カテゴリ ---------------------------------------------------------


class CategoryCreate(BaseModel):
    """カテゴリ追加のリクエストボディ。"""

    name: str = Field(min_length=1, max_length=50)


class CategoryUpdate(BaseModel):
    """カテゴリ名編集のリクエストボディ。"""

    name: str = Field(min_length=1, max_length=50)


class CategoryReorderRequest(BaseModel):
    """並び替え後のカテゴリID順を受け取るリクエストボディ。"""

    order: list[int]


class CategoryOut(BaseModel):
    """カテゴリのレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sort_order: int


# --- 引継ぎ写真 ---------------------------------------------------------


class HandoverPhotoOut(BaseModel):
    """引継ぎに添付された写真のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str


class HandoverPhotoIn(BaseModel):
    """クライアントがCloudinaryへ直接アップロード済みの写真情報（作成・編集時の入力）。"""

    url: str
    public_id: str


# --- 引継ぎ ---------------------------------------------------------


class HandoverCreate(BaseModel):
    """引継ぎ追加のリクエストボディ。"""

    category_id: int
    body: str = Field(min_length=1)
    photos: list[HandoverPhotoIn] = []


class HandoverUpdate(BaseModel):
    """引継ぎ編集のリクエストボディ。"""

    category_id: int
    body: str = Field(min_length=1)
    photos: list[HandoverPhotoIn] = []
    delete_photo_ids: list[int] = []


class HandoverReorderRequest(BaseModel):
    """ドラッグ&ドロップ後のID順を受け取るリクエストボディ（未対応の引継ぎのみ対象）。"""

    order: list[int]


class HandoverOut(BaseModel):
    """引継ぎ一覧・作成後のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category_name: str
    body: str
    status: Literal["active", "done"]
    is_pinned: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    photos: list[HandoverPhotoOut]


# --- 売切商品 ---------------------------------------------------------


class SoldoutItemCreate(BaseModel):
    """売切商品追加のリクエストボディ。"""

    name: str = Field(min_length=1, max_length=100)


class SoldoutItemOut(BaseModel):
    """売切商品のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime.datetime


# --- 忘れ物 ---------------------------------------------------------


class LostItemCreate(BaseModel):
    """忘れ物追加のリクエストボディ。"""

    name: str = Field(min_length=1, max_length=100)


class LostItemOut(BaseModel):
    """忘れ物のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime.datetime


# --- 表示設定 ---------------------------------------------------------


class DisplaySettingsUpdate(BaseModel):
    """表示設定更新のリクエストボディ。"""

    new_badge_days: int = Field(ge=0, le=30)


class DisplaySettingsOut(BaseModel):
    """表示設定のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    new_badge_days: int


# --- ゴミ庫 ---------------------------------------------------------


class GarbageStatusUpdate(BaseModel):
    """ゴミ庫状態更新のリクエストボディ。"""

    status: Literal["empty", "full"]


class GarbageStatusOut(BaseModel):
    """ゴミ庫状態のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    status: Literal["empty", "full"]
    updated_at: datetime.datetime
