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
  createHandover: (formData) =>
    request("/handovers", { method: "POST", body: formData }),
  updateHandover: (id, formData) =>
    request(`/handovers/${id}`, { method: "PUT", body: formData }),
  markHandoverDone: (id) => request(`/handovers/${id}/done`, { method: "PUT" }),
  reopenHandover: (id) => request(`/handovers/${id}/reopen`, { method: "PUT" }),
  deleteHandover: (id) => request(`/handovers/${id}`, { method: "DELETE" }),

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
