# 引継書システム

店舗のホワイトボード・口頭引継ぎを置き換える、シンプルな引継ぎ共有Webアプリ。

## 技術構成

- Backend: FastAPI
- Frontend: HTML / CSS / JavaScript（素のJS、ビルド不要。並び替えのみSortableJSをCDNで使用）
- DB: PostgreSQL + SQLAlchemy
- 画像: Cloudinary
- Deploy: Render

## ディレクトリ構成

```
app/
  main.py               FastAPIエントリーポイント、静的配信、初期カテゴリseed
  config.py             環境変数読み込み
  database.py           engine / セッション管理
  models.py             SQLAlchemyモデル（6テーブル）
  schemas.py             Pydanticスキーマ
  cloudinary_client.py  Cloudinaryアップロード/削除
  routers/
    categories.py        カテゴリCRUD・並び替え
    handovers.py         引継ぎCRUD・対応済み/再登録
    soldout.py           売切商品CRUD
    lost_items.py        忘れ物CRUD（soldout.pyと同じ構成）
    garbage.py           ゴミ庫状態

static/
  index.html / settings.html
  css/style.css
  js/api.js, utils.js, home.js, settings.js
```

## ローカル起動手順

1. 依存パッケージをインストール

   ```bash
   python -m pip install -r requirements.txt
   ```

2. `.env.example` を `.env` にコピーし、実際の値を設定する

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: ローカルまたはRenderのPostgreSQL接続文字列
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`: Cloudinaryダッシュボードの値

3. サーバーを起動

   ```bash
   python -m uvicorn app.main:app --reload
   ```

   起動時にテーブルが自動作成され、カテゴリが1件も無ければ初期カテゴリ（ブース席／カラオケ／2R／その他）が自動登録される。

4. ブラウザで `http://127.0.0.1:8000/` （ホーム画面）・`http://127.0.0.1:8000/settings` （設定画面）を開く。

## Renderへのデプロイ手順（概要）

1. GitHubにリポジトリをpush
2. Renderで PostgreSQL（Managed Database）を作成し、Internal Database URLを控える
3. RenderでWeb Serviceを作成し、このリポジトリを接続
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Web ServiceのEnvironment変数に `DATABASE_URL`（手順2のURL）、`CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET` を設定
5. デプロイ後、初回アクセス時にテーブル作成・初期カテゴリseedが自動実行される

## 主な仕様メモ

- 認証なし（店舗内共有端末での利用を想定）
- カテゴリ削除は、対応済み含め紐づく引継ぎが1件でもあれば不可
- 引継ぎ写真は1件につき複数枚添付可能。引継ぎ完全削除時にCloudinary側の画像も削除される
- 対応済みにした引継ぎはホーム画面から消え、設定画面の「対応済み一覧」からのみ再登録・完全削除できる
- カテゴリは引継ぎが1件も無い場合、ホーム画面から表示自体を省略する（全カテゴリ0件のときのみ「引継ぎはありません」を1つ表示）
- 売切商品・忘れ物は0件のとき、カード枠を外して引継ぎの空状態と同じ文字のみの表示にする（1件以上あるときのみカード表示に切り替わる）
- 忘れ物は売切商品と同じUI（名前のみ登録・一覧・削除）で、FABの「忘れ物追加」から登録する
- 引継ぎカードの「編集」ボタンから、カテゴリ・本文の変更、写真の追加・削除（既存写真は×で削除予約）ができる
- 引継ぎ本文中に書かれた日付表記（例: 7/5, 7月5日, 2026年7月10日）は自動検出して下線付きで強調表示する（static/js/utils.jsのbuildTextWithHighlightedDates）。ホーム画面・設定画面の対応済み一覧の両方に適用
- 設定画面のトップは項目一覧のみ（カテゴリ管理／対応済み一覧）。項目をタップするとその詳細パネルに切り替わり、「← 設定に戻る」で一覧に戻る（ページ遷移ではなくJSでの表示切替。今後の設定項目もこの一覧に追加していく想定）
