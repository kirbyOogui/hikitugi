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
  updateDisplaySettings: (newBadgeDays) =>
    request("/display-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_badge_days: newBadgeDays }),
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
  getSoldoutItems: () => request("/soldout"),
  createSoldoutItem: (name) =>
    request("/soldout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  deleteSoldoutItem: (id) => request(`/soldout/${id}`, { method: "DELETE" }),

  // --- 忘れ物 ---
  getLostItems: () => request("/lost-items"),
  createLostItem: (name) =>
    request("/lost-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
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
