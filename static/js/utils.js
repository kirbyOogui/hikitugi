/**
 * home.js / settings.js の両方から使う共通ユーティリティ。
 * 引継ぎ本文中に書かれた日付表記（例: 7/5, 7月5日, 2026/7/5, 7月5日(土)）を
 * 自動検出して下線付きのspanで囲む。
 */

// 「7/5」「2026/7/5」「7月5日」「2026年7月5日」「7月5日(土)」などにマッチする。
// 曜日付きの丸括弧は任意。年は西暦4桁のときだけ対応する。
const DATE_PATTERN =
  /(\d{4}年)?\d{1,2}月\d{1,2}日(\([月火水木金土日]\))?|(\d{4}\/)?\d{1,2}\/\d{1,2}(\([月火水木金土日]\))?/g;

/**
 * 本文テキストを、日付部分だけ<span class="date-highlight">で囲んだ
 * DocumentFragmentに変換する。textContentベースで組み立てるためXSSの心配はない。
 */
function buildTextWithHighlightedDates(text) {
  const fragment = document.createDocumentFragment();
  const regex = new RegExp(DATE_PATTERN);
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const span = document.createElement("span");
    span.className = "date-highlight";
    span.textContent = match[0];
    fragment.appendChild(span);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return fragment;
}
