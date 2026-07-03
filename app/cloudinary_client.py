"""Cloudinaryへの画像アップロード・削除をまとめるモジュール。

APIキーはサーバー側のみで保持し、フロントエンドには一切渡さない
（バックエンド経由アップロードにすることでキー漏洩を防ぐ）。
"""
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)

# アップロード先フォルダ（Cloudinary上で引継書アプリの画像だとわかるように分けておく）
UPLOAD_FOLDER = "handover-app"


def upload_photo(file: UploadFile) -> tuple[str, str]:
    """画像ファイルをCloudinaryにアップロードし、(配信URL, public_id)を返す。"""
    result = cloudinary.uploader.upload(file.file, folder=UPLOAD_FOLDER)
    return result["secure_url"], result["public_id"]


def delete_photo(public_id: str) -> None:
    """Cloudinary上の画像を削除する（引継ぎ完全削除時に呼び出す）。

    削除に失敗してもDB側の削除処理自体は継続させたいため、例外は握りつぶす。
    """
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as exc:  # noqa: BLE001 - 削除失敗はログのみ残し処理は継続する
        print(f"[cloudinary_client] 画像削除に失敗しました public_id={public_id}: {exc}")
