/**
 * home.js / settings.js の両方から使う共通ユーティリティ。
 * 引継ぎ本文中に書かれた日付表記（例: 7/5, ７／５, 7月5日, 2026/7/5,
 * 7月5日(土), ７／５（月）など、数字・記号が全角/半角どちらでも）を
 * 自動検出してハイライト用のspanで囲む。
 */

// 数字は半角(0-9)・全角(０-９)のどちらも許容する。
// 「7/5」「２０２６／７／５」「7月5日」「2026年7月5日」「7月5日(土)」
// 「７／５（月）」などにマッチする。曜日付きの括弧(半角/全角とも)は任意。
// 年は西暦4桁のときだけ対応する。
const D = "[0-9０-９]";
const WEEKDAY_PAREN = `(?:\\([月火水木金土日]\\)|（[月火水木金土日]）)`;
const DATE_PATTERN = new RegExp(
  `(?:${D}{4}年)?${D}{1,2}月${D}{1,2}日${WEEKDAY_PAREN}?` +
    `|(?:${D}{4}[/／])?${D}{1,2}[/／]${D}{1,2}${WEEKDAY_PAREN}?`,
  "g"
);

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

/**
 * 画像ファイルをアップロード前にリサイズ・圧縮する。
 * スマホ写真は数MBになることが多く、そのままアップロードすると
 * （特に無料ホスティングの帯域では）体感速度が大きく悪化するため、
 * 長辺1600pxを超える場合は縮小し、JPEG品質0.8で再エンコードする。
 * 画像以外のファイルや変換に失敗した場合は元ファイルをそのまま返す。
 */
async function compressImage(file, maxDimension = 1600, quality = 0.8) {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (err) {
    console.warn("画像圧縮に失敗したため元ファイルをアップロードします", err);
    return file;
  }
}
