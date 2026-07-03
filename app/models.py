"""SQLAlchemyのテーブル定義。

テーブルは以下の5つ。
- Category        : カテゴリ（ブース席、カラオケ等）
- Handover         : 引継ぎ本文
- HandoverPhoto    : 引継ぎに添付する写真（1件につき複数枚）
- SoldoutItem      : 売切商品
- LostItem         : 問い合わせのあった忘れ物
- GarbageStatus    : ゴミ庫の状態（常に1行のみ使用する）
"""
from __future__ import annotations

import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# 引継ぎのステータス定数（未対応 / 対応済み）
HANDOVER_STATUS_ACTIVE = "active"
HANDOVER_STATUS_DONE = "done"

# ゴミ庫の状態定数（空 / 満）
GARBAGE_STATUS_EMPTY = "empty"
GARBAGE_STATUS_FULL = "full"


class Category(Base):
    """引継ぎのカテゴリ（ブース席、カラオケ、2R、その他など）。"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    # 表示順。設定画面のドラッグ&ドロップ並び替えで更新される。
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # カテゴリ削除の可否はAPI側（routers/categories.py）で事前チェックする。
    # DB外部キーもondelete="RESTRICT"のため、紐づく引継ぎが残っていれば削除は失敗する。
    handovers: Mapped[list[Handover]] = relationship(back_populates="category")


class Handover(Base):
    """引継ぎ本文。"""

    __tablename__ = "handovers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default=HANDOVER_STATUS_ACTIVE
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    category: Mapped[Category] = relationship(back_populates="handovers")
    photos: Mapped[list[HandoverPhoto]] = relationship(
        back_populates="handover",
        cascade="all, delete-orphan",
        order_by="HandoverPhoto.id",
    )

    @property
    def category_name(self) -> str:
        """スキーマ側でHandoverOut.category_nameとして参照するためのプロパティ。"""
        return self.category.name


class HandoverPhoto(Base):
    """引継ぎに添付された写真（Cloudinaryの配信URLを保持）。"""

    __tablename__ = "handover_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    handover_id: Mapped[int] = mapped_column(
        ForeignKey("handovers.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(String, nullable=False)
    # Cloudinary側の画像削除に使うID（引継ぎ完全削除時に利用）
    public_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    handover: Mapped[Handover] = relationship(back_populates="photos")


class SoldoutItem(Base):
    """売切商品。"""

    __tablename__ = "soldout_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LostItem(Base):
    """問い合わせのあった忘れ物。売切商品と同じ、名前のみのシンプルな一覧。"""

    __tablename__ = "lost_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class GarbageStatus(Base):
    """ゴミ庫の状態。常にid=1の1行のみを使うシングルトンテーブル。"""

    __tablename__ = "garbage_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(
        String(10), nullable=False, default=GARBAGE_STATUS_EMPTY
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
