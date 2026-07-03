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


# --- 引継ぎ ---------------------------------------------------------


class HandoverOut(BaseModel):
    """引継ぎ一覧・作成後のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category_name: str
    body: str
    status: Literal["active", "done"]
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


# --- ゴミ庫 ---------------------------------------------------------


class GarbageStatusUpdate(BaseModel):
    """ゴミ庫状態更新のリクエストボディ。"""

    status: Literal["empty", "full"]


class GarbageStatusOut(BaseModel):
    """ゴミ庫状態のレスポンス。"""

    model_config = ConfigDict(from_attributes=True)

    status: Literal["empty", "full"]
    updated_at: datetime.datetime
