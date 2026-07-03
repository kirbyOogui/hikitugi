@echo off
chcp 65001 >nul
REM 引継書システムをローカルで起動して確認するためのスクリプト。
REM ダブルクリック、またはターミナルで run_local.bat を実行してください。
REM 終了するにはこのウィンドウで Ctrl+C を押してください。

cd /d "%~dp0"

if not exist ".env" (
    echo .envが見つからないため、ローカル確認用の設定で作成します。
    (
        echo DATABASE_URL=sqlite:///./dev_local.db
        echo CLOUDINARY_CLOUD_NAME=dummy
        echo CLOUDINARY_API_KEY=dummy
        echo CLOUDINARY_API_SECRET=dummy
    ) > ".env"
)

echo 依存パッケージを確認しています...
python -m pip install -r requirements.txt --quiet --disable-pip-version-check

echo.
echo 引継書システムを起動します。ブラウザで以下を開いてください。
echo   ホーム画面: http://127.0.0.1:8000/
echo   設定画面  : http://127.0.0.1:8000/settings
echo.
echo コードを保存すると自動で再読み込みされます。終了はCtrl+Cです。
echo.

python -m uvicorn app.main:app --reload --port 8000

pause
