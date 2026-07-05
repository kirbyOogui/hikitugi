/**
 * カラーテーマ（配色パターン）の定義と適用ロジック。
 * 実際の色はstatic/css/style.cssの:root[data-theme="..."]で定義しており、
 * ここではキー・表示名・一覧プレビュー用のスウォッチ色のみを持つ。
 */

const THEME_PATTERNS = [
  { key: "default", label: "パターン1", swatch: "#2563eb" },
  { key: "navy", label: "パターン2", swatch: "#1e3a8a" },
  { key: "green", label: "パターン3", swatch: "#15803d" },
  { key: "kaikatsu", label: "パターン4", swatch: "#e8630c" },
  { key: "purple", label: "パターン5", swatch: "#7c3aed" },
  { key: "mono", label: "パターン6", swatch: "#27272a" },
  { key: "dark", label: "パターン7", swatch: "#1e232b" },
];

// ホーム画面に追加した際のステータスバー等に使われる<meta name="theme-color">用。
// 各テーマの--color-bgと同じ値（static/css/style.cssの:root[data-theme]と対応させる）。
const THEME_BG_COLORS = {
  default: "#f5f6f8",
  navy: "#eef1f6",
  green: "#f2f7f3",
  kaikatsu: "#fdf5ec",
  purple: "#f7f5fb",
  mono: "#f4f4f5",
  dark: "#14171c",
};

/**
 * カラーテーマを画面に反映する。次回アクセス時に一瞬デフォルト配色が
 * 表示されてしまわないよう、localStorageにも保存しておく
 * （読み込み直後、<head>内の早期スクリプトがこの値を同期的に反映する）。
 */
function applyColorTheme(themeKey) {
  document.documentElement.dataset.theme = themeKey;
  const metaThemeColor = document.getElementById("theme-color-meta");
  if (metaThemeColor && THEME_BG_COLORS[themeKey]) {
    metaThemeColor.content = THEME_BG_COLORS[themeKey];
  }
  try {
    localStorage.setItem("colorTheme", themeKey);
  } catch (_) {
    // プライベートブラウズ等でlocalStorageが使えない場合は無視する
  }
}
