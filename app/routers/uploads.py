"""クライアントからCloudinaryへ直接アップロードするための署名発行API。"""
from fastapi import APIRouter

from app.cloudinary_client import generate_upload_signature

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.get("/signature")
def get_upload_signature() -> dict:
    """Cloudinary直接アップロード用の署名一式を返す。"""
    return generate_upload_signature()
