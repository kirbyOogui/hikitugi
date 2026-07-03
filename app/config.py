"""環境変数を一元管理するモジュール。

.envファイル（ローカル開発時）またはホスティング先の環境変数（Render等）から
設定値を読み込み、アプリ全体で共通のSettingsインスタンスとして参照する。
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリ全体で使う環境変数の定義。"""

    # PostgreSQL接続文字列
    database_url: str

    # Cloudinary認証情報
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    """Settingsのシングルトンを返す（毎回.envを読み直さないようキャッシュする）。"""
    return Settings()
