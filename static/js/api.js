/**
 * バックエンドAPIとの通信をまとめたラッパー関数群。
 * home.js / settings.js から呼び出す。
 */

const API_BASE = "/api";

/**
 * JSON形式のレスポンスを想定した共通fetch処理。
 * エラー時はレスポンスのdetailメッセージを含むErrorをthrowする。
 */
async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let detail = `通信エラーが発生しました (status: ${res.status})`;
    try {
      const data = await res.json();
      if (data.detail) detail = data.detail;
    } catch (_) {
      // JSONでないエラーレスポンスは無視してデフォルトメッセージを使う
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  // --- カテゴリ ---
  getCategories: () => request("/categories"),
  createCategory: (name) =>
    request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updateCategory: (id, name) =>
    request(`/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  reorderCategories: (order) =>
    request("/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),

  // --- 引継ぎ ---
  getHandovers: (status) => request(`/handovers?status=${status}`),
  createHandover: (payload) =>
    request("/handovers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateHandover: (id, payload) =>
    request(`/handovers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  markHandoverDone: (id) => request(`/handovers/${id}/done`, { method: "PUT" }),
  reopenHandover: (id) => request(`/handovers/${id}/reopen`, { method: "PUT" }),
  deleteHandover: (id) => request(`/handovers/${id}`, { method: "DELETE" }),
  pinHandover: (id) => request(`/handovers/${id}/pin`, { method: "PUT" }),
  unpinHandover: (id) => request(`/handovers/${id}/unpin`, { method: "PUT" }),
  reorderHandovers: (order) =>
    request("/handovers/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }),

  // --- 表示設定 ---
  getDisplaySettings: () => request("/display-settings"),
  /**
   * 表示設定を更新する。NEW表示日数・カラーテーマはそれぞれ別画面から
   * 個別に更新するため、渡された項目のみサーバー側で更新される。
   * 例: updateDisplaySettings({ new_badge_days: 3 }) / updateDisplaySettings({ color_theme: "navy" })
   */
  updateDisplaySettings: (partialSettings) =>
    request("/display-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partialSettings),
    }),

  // --- 写真アップロード（Cloudinaryへ直接） ---
  getUploadSignature: () => request("/uploads/signature"),
  /**
   * 圧縮済みファイルを、署名付きでCloudinaryへ直接アップロードする
   * （Renderサーバーを経由しないため、サーバー転送分の時間を短縮できる）。
   */
  uploadPhotoToCloudinary: async (file) => {
    const sig = await api.getUploadSignature();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.api_key);
    formData.append("timestamp", sig.timestamp);
    formData.append("signature", sig.signature);
    formData.append("folder", sig.folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error("写真のアップロードに失敗しました");
    }
    return res.json();
  },

  // --- 売切商品 ---
  getSoldoutItems: (status = "active") => request(`/soldout?status=${status}`),
  createSoldoutItem: (name) =>
    request("/soldout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updateSoldoutItem: (id, name) =>
    request(`/soldout/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  markSoldoutItemDone: (id) => request(`/soldout/${id}/done`, { method: "PUT" }),
  reopenSoldoutItem: (id) => request(`/soldout/${id}/reopen`, { method: "PUT" }),
  deleteSoldoutItem: (id) => request(`/soldout/${id}`, { method: "DELETE" }),

  // --- 忘れ物 ---
  getLostItems: (status = "active") => request(`/lost-items?status=${status}`),
  createLostItem: (name) =>
    request("/lost-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updateLostItem: (id, name) =>
    request(`/lost-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  markLostItemDone: (id) => request(`/lost-items/${id}/done`, { method: "PUT" }),
  reopenLostItem: (id) => request(`/lost-items/${id}/reopen`, { method: "PUT" }),
  deleteLostItem: (id) => request(`/lost-items/${id}`, { method: "DELETE" }),

  // --- ゴミ庫 ---
  getGarbageStatus: () => request("/garbage"),
  updateGarbageStatus: (status) =>
    request("/garbage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};
