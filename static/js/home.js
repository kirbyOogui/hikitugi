/**
 * ホーム画面のロジック。
 * 起動時に各種データを取得して描画し、以降はユーザー操作に応じて
 * APIを呼び出しては一覧を再取得する（単純さを優先し、差分更新はしない）。
 */

let categoriesCache = [];
let handoverSortableInstance = null;
let displaySettingsCache = { new_badge_days: 2 };

// 引継ぎ編集シートの状態。nullなら新規追加、値があればそのIDを編集中。
let editingHandoverId = null;
// 編集時に「×」で削除予約された既存写真のID一覧（保存時にdelete_photo_idsとして送信）
let photoIdsToDelete = new Set();

// --- 日付・時刻のフォーマット（店舗は日本国内のためJST固定で表示） ---

function formatToday() {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

function formatUpdatedAt(isoString) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

// --- 初期表示 ---

async function loadAll() {
  document.getElementById("today-date").textContent = formatToday();

  const [categories, handovers, soldoutItems, lostItems, garbage, displaySettings] =
    await Promise.all([
      api.getCategories(),
      api.getHandovers("active"),
      api.getSoldoutItems(),
      api.getLostItems(),
      api.getGarbageStatus(),
      api.getDisplaySettings(),
    ]);

  categoriesCache = categories;
  displaySettingsCache = displaySettings;
  renderGarbage(garbage.status);
  renderSoldout(soldoutItems);
  renderLostItems(lostItems);
  renderHandoverList(handovers);
  reorderHomeSections();
}

/**
 * 売切商品・忘れ物・引継ぎの3セクションを、0件（空表示）のものが上に来るよう並べ替える。
 * 各セクションが空かどうかは、共通の空表示に使われる.handover-emptyの有無で判定する。
 */
function reorderHomeSections() {
  const container = document.getElementById("home-sections");
  const sections = ["soldout-card", "lost-card", "categories-container"].map((id) =>
    document.getElementById(id)
  );
  const isEmpty = (el) => el.querySelector(".handover-empty") !== null;

  for (const el of sections.filter(isEmpty)) {
    container.appendChild(el);
  }
  for (const el of sections.filter((el) => !isEmpty(el))) {
    container.appendChild(el);
  }
}

// --- ゴミ庫 ---

function renderGarbage(status) {
  const btn = document.getElementById("garbage-toggle-btn");
  btn.classList.remove("garbage-toggle__btn--loading");
  btn.dataset.status = status;
  btn.textContent = status === "empty" ? "空" : "満";
}

async function toggleGarbage() {
  const btn = document.getElementById("garbage-toggle-btn");
  const next = btn.dataset.status === "empty" ? "full" : "empty";
  try {
    const updated = await api.updateGarbageStatus(next);
    renderGarbage(updated.status);
  } catch (err) {
    alert(err.message);
  }
}

// --- 売切商品 / 忘れ物（どちらも「名前だけの一覧＋編集/対応済み」という同じ構造なので共通関数で描画する） ---

/**
 * 名前のみを持つ項目一覧（売切商品・忘れ物）を描画する。
 * 0件のときは引継ぎと同様、カード枠を外して文字のみの表示にする。
 * 各項目は「編集」でその場で名前を書き換えられ、「✓対応済み」で
 * 引継ぎと同じように一覧から消えて対応済み一覧（設定画面）へ移動する。
 */
function renderItemListCard(container, items, { title, emptyText, onUpdate, onMarkDone }) {
  container.innerHTML = "";

  if (items.length === 0) {
    container.classList.remove("card");

    const empty = document.createElement("p");
    empty.className = "handover-empty";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  container.classList.add("card");

  const heading = document.createElement("h2");
  heading.className = "card__title";
  heading.textContent = title;
  container.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "simple-item-list";
  for (const item of items) {
    const li = document.createElement("li");
    li.className = "simple-item";

    const nameEl = document.createElement("span");
    nameEl.className = "simple-item__name";
    nameEl.textContent = item.name;

    const actions = document.createElement("div");
    actions.className = "simple-item__actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-outline";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => startEditSimpleItem(li, item, onUpdate));

    const doneBtn = document.createElement("button");
    doneBtn.className = "btn btn-success";
    doneBtn.textContent = "✓対応済み";
    doneBtn.addEventListener("click", async () => {
      try {
        await onMarkDone(item.id);
        await loadAll();
      } catch (err) {
        alert(err.message);
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(doneBtn);

    li.appendChild(nameEl);
    li.appendChild(actions);
    list.appendChild(li);
  }
  container.appendChild(list);
}

/** 売切商品・忘れ物の行を、その場でのテキスト編集モードに切り替える。 */
function startEditSimpleItem(li, item, onUpdate) {
  const nameEl = li.querySelector(".simple-item__name");

  const input = document.createElement("input");
  input.type = "text";
  input.className = "simple-item__name-input";
  input.value = nameEl.textContent;
  nameEl.replaceWith(input);
  input.focus();

  const editBtn = li.querySelector(".simple-item__actions .btn-outline");
  editBtn.textContent = "保存";
  const newEditBtn = editBtn.cloneNode(true);
  editBtn.replaceWith(newEditBtn);
  newEditBtn.addEventListener("click", async () => {
    const newName = input.value.trim();
    if (!newName) return;
    try {
      await onUpdate(item.id, newName);
      await loadAll();
    } catch (err) {
      alert(err.message);
    }
  });
}

function renderSoldout(items) {
  renderItemListCard(document.getElementById("soldout-card"), items, {
    title: "売切商品",
    emptyText: "売切商品はありません",
    onUpdate: (id, name) => api.updateSoldoutItem(id, name),
    onMarkDone: (id) => api.markSoldoutItemDone(id),
  });
}

function renderLostItems(items) {
  renderItemListCard(document.getElementById("lost-card"), items, {
    title: "忘れ物",
    emptyText: "忘れ物の問い合わせはありません",
    onUpdate: (id, name) => api.updateLostItem(id, name),
    onMarkDone: (id) => api.markLostItemDone(id),
  });
}

// --- 引継ぎ一覧（カテゴリをまたいで自由に並び替え可能な1本のリスト） ---

function renderHandoverList(handovers) {
  const container = document.getElementById("categories-container");
  container.innerHTML = "";

  if (handovers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "handover-empty";
    empty.textContent = "引継ぎはありません";
    container.appendChild(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "handover-list";

  if (handovers.some((h) => h.is_pinned)) {
    const label = document.createElement("div");
    label.className = "handover-list__pinned-label";
    label.textContent = "📌 ピン留め";
    list.appendChild(label);
  }

  for (const handover of handovers) {
    list.appendChild(renderHandoverCard(handover));
  }
  container.appendChild(list);

  // 既存のSortableインスタンスがあれば破棄してから作り直す（再描画のたびに二重登録を防ぐ）
  if (handoverSortableInstance) {
    handoverSortableInstance.destroy();
  }
  handoverSortableInstance = new Sortable(list, {
    handle: ".handover-card__handle",
    draggable: ".handover-card",
    animation: 150,
    onEnd: async () => {
      const order = Array.from(list.querySelectorAll(".handover-card")).map((el) =>
        Number(el.dataset.id)
      );
      try {
        await api.reorderHandovers(order);
      } catch (err) {
        alert(err.message);
        await loadAll();
      }
    },
  });
}

function categoryName(categoryId) {
  const category = categoriesCache.find((c) => c.id === categoryId);
  return category ? category.name : "";
}

/** 作成から表示設定の日数以内なら「NEW」バッジを表示する対象と判定する。 */
function isNewHandover(handover) {
  const days = displaySettingsCache.new_badge_days;
  if (!days || days <= 0) return false;
  const createdMs = new Date(handover.created_at).getTime();
  return Date.now() - createdMs < days * 24 * 60 * 60 * 1000;
}

function renderHandoverCard(handover) {
  const card = document.createElement("div");
  card.className = "handover-card" + (handover.is_pinned ? " handover-card--pinned" : "");
  card.dataset.id = handover.id;

  const meta = document.createElement("div");
  meta.className = "handover-card__meta";
  meta.innerHTML = `
    <span class="handover-card__handle">≡</span>
    <span class="handover-card__category-tag"></span>
    <span class="handover-card__new-badge hidden">NEW</span>
    <button class="icon-btn handover-card__pin-toggle" aria-label="ピン留め"></button>
  `;
  meta.querySelector(".handover-card__category-tag").textContent = categoryName(
    handover.category_id
  );
  if (isNewHandover(handover)) {
    meta.querySelector(".handover-card__new-badge").classList.remove("hidden");
  }
  const pinBtn = meta.querySelector(".handover-card__pin-toggle");
  pinBtn.textContent = handover.is_pinned ? "📌" : "📌";
  pinBtn.classList.toggle("is-active", handover.is_pinned);
  pinBtn.setAttribute("aria-label", handover.is_pinned ? "ピン留めを解除" : "ピン留めする");
  pinBtn.addEventListener("click", async () => {
    try {
      if (handover.is_pinned) {
        await api.unpinHandover(handover.id);
      } else {
        await api.pinHandover(handover.id);
      }
      await loadAll();
    } catch (err) {
      alert(err.message);
    }
  });
  card.appendChild(meta);

  const body = document.createElement("p");
  body.className = "handover-card__body";
  body.appendChild(buildTextWithHighlightedDates(handover.body));
  card.appendChild(body);

  if (handover.photos.length > 0) {
    const photos = document.createElement("div");
    photos.className = "handover-card__photos";
    for (const photo of handover.photos) {
      const img = document.createElement("img");
      img.src = photo.url;
      img.alt = "添付写真";
      img.addEventListener("click", () => openLightbox(photo.url));
      photos.appendChild(img);
    }
    card.appendChild(photos);
  }

  const footer = document.createElement("div");
  footer.className = "handover-card__footer";
  footer.innerHTML = `
    <span class="handover-card__updated"></span>
    <div class="handover-card__actions">
      <button class="btn btn-outline handover-card__edit">編集</button>
      <button class="btn btn-success handover-card__done">✓対応済み</button>
    </div>
  `;
  footer.querySelector(".handover-card__updated").textContent =
    `更新: ${formatUpdatedAt(handover.updated_at)}`;
  footer.querySelector(".handover-card__edit").addEventListener("click", () => {
    openHandoverEditSheet(handover);
  });
  footer.querySelector(".handover-card__done").addEventListener("click", async () => {
    try {
      await api.markHandoverDone(handover.id);
      await loadAll();
    } catch (err) {
      alert(err.message);
    }
  });
  card.appendChild(footer);

  return card;
}

// --- ライトボックス（写真拡大） ---

function openLightbox(url) {
  const lightbox = document.getElementById("lightbox");
  document.getElementById("lightbox-img").src = url;
  lightbox.classList.remove("hidden");
}

document.getElementById("lightbox").addEventListener("click", () => {
  document.getElementById("lightbox").classList.add("hidden");
});

// --- FAB / ボトムシート ---

const fabToggle = document.getElementById("fab-toggle");
const fabMenu = document.getElementById("fab-menu");
const sheetOverlay = document.getElementById("sheet-overlay");
const sheetHandover = document.getElementById("sheet-handover");
const sheetSoldout = document.getElementById("sheet-soldout");
const sheetLost = document.getElementById("sheet-lost");

fabToggle.addEventListener("click", () => {
  fabMenu.classList.toggle("hidden");
});

function openSheet(sheetEl) {
  fabMenu.classList.add("hidden");
  sheetOverlay.classList.remove("hidden");
  sheetEl.classList.remove("hidden");
}

function closeSheets() {
  sheetOverlay.classList.add("hidden");
  sheetHandover.classList.add("hidden");
  sheetSoldout.classList.add("hidden");
  sheetLost.classList.add("hidden");
}

document.getElementById("fab-add-handover").addEventListener("click", () => {
  openHandoverAddSheet();
});

document.getElementById("fab-add-soldout").addEventListener("click", () => {
  openSheet(sheetSoldout);
});

document.getElementById("fab-add-lost").addEventListener("click", () => {
  openSheet(sheetLost);
});

// シート背景タップ、またはxボタンで閉じる（シート自体のタップは伝播させない）
sheetOverlay.addEventListener("click", (e) => {
  if (e.target === sheetOverlay) closeSheets();
});
document.querySelectorAll(".sheet-close").forEach((btn) => {
  btn.addEventListener("click", closeSheets);
});

function populateCategorySelect(selectedCategoryId) {
  const select = document.getElementById("handover-category");
  select.innerHTML = "";
  for (const category of categoriesCache) {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  }
  if (selectedCategoryId !== undefined) {
    select.value = String(selectedCategoryId);
  }
}

/** 引継ぎ追加・編集シート内の「＋新規」からカテゴリを作成し、選択済みの状態にする。 */
async function addCategoryInline() {
  const input = document.getElementById("handover-category-add-input");
  const name = input.value.trim();
  if (!name) return;

  try {
    const category = await api.createCategory(name);
    categoriesCache = await api.getCategories();
    populateCategorySelect(category.id);
    input.value = "";
    document.getElementById("handover-category-add-row").classList.add("hidden");
  } catch (err) {
    alert(err.message);
  }
}

document.getElementById("handover-category-add-toggle").addEventListener("click", () => {
  const row = document.getElementById("handover-category-add-row");
  row.classList.toggle("hidden");
  if (!row.classList.contains("hidden")) {
    document.getElementById("handover-category-add-input").focus();
  }
});

document.getElementById("handover-category-add-confirm").addEventListener("click", addCategoryInline);

// カテゴリ名入力欄はhandover-form内にあるため、Enterキーでの送信は
// 引継ぎ本体のフォーム送信になってしまう。ここで止めてカテゴリ追加として扱う。
document.getElementById("handover-category-add-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCategoryInline();
  }
});

// --- 引継ぎ追加・編集シート ---

/** FABからの「引継ぎ追加」。フォームを空の状態にして新規追加モードで開く。 */
function openHandoverAddSheet() {
  editingHandoverId = null;
  photoIdsToDelete = new Set();

  document.getElementById("handover-sheet-title").textContent = "引継ぎ追加";
  document.getElementById("handover-submit-btn").textContent = "登録する";
  document.getElementById("handover-form").reset();
  document.getElementById("handover-existing-photos-group").classList.add("hidden");
  document.getElementById("handover-existing-photos").innerHTML = "";
  document.getElementById("handover-category-add-row").classList.add("hidden");

  populateCategorySelect();
  openSheet(sheetHandover);
}

/** カードの「編集」ボタンから、既存の内容を入力済みの状態で編集モードで開く。 */
function openHandoverEditSheet(handover) {
  editingHandoverId = handover.id;
  photoIdsToDelete = new Set();

  document.getElementById("handover-sheet-title").textContent = "引継ぎ編集";
  document.getElementById("handover-submit-btn").textContent = "保存する";
  document.getElementById("handover-form").reset();
  document.getElementById("handover-body").value = handover.body;
  document.getElementById("handover-category-add-row").classList.add("hidden");

  populateCategorySelect(handover.category_id);
  renderExistingPhotos(handover.photos);

  openSheet(sheetHandover);
}

/** 編集シート内に既存写真のサムネイルを表示し、×クリックで削除予約できるようにする。 */
function renderExistingPhotos(photos) {
  const group = document.getElementById("handover-existing-photos-group");
  const container = document.getElementById("handover-existing-photos");
  container.innerHTML = "";

  if (photos.length === 0) {
    group.classList.add("hidden");
    return;
  }
  group.classList.remove("hidden");

  for (const photo of photos) {
    const wrapper = document.createElement("div");
    wrapper.className = "existing-photo";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = "既存の写真";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "existing-photo__remove";
    removeBtn.setAttribute("aria-label", "この写真を削除");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      const alreadyMarked = photoIdsToDelete.has(photo.id);
      if (alreadyMarked) {
        photoIdsToDelete.delete(photo.id);
        wrapper.classList.remove("marked-for-delete");
      } else {
        photoIdsToDelete.add(photo.id);
        wrapper.classList.add("marked-for-delete");
      }
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
  }
}

document.getElementById("handover-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const categoryId = Number(document.getElementById("handover-category").value);
  const body = document.getElementById("handover-body").value;
  const photoInput = document.getElementById("handover-photos");

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    // 圧縮 → Cloudinaryへ直接アップロード（Renderサーバーを経由しない）
    const photos = [];
    for (const file of photoInput.files) {
      const compressed = await compressImage(file);
      const uploaded = await api.uploadPhotoToCloudinary(compressed);
      photos.push({ url: uploaded.secure_url, public_id: uploaded.public_id });
    }

    const payload = { category_id: categoryId, body, photos };
    if (editingHandoverId === null) {
      await api.createHandover(payload);
    } else {
      payload.delete_photo_ids = Array.from(photoIdsToDelete);
      await api.updateHandover(editingHandoverId, payload);
    }
    e.target.reset();
    closeSheets();
    await loadAll();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// --- 売切商品追加フォーム ---

document.getElementById("soldout-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("soldout-name").value;

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    await api.createSoldoutItem(name);
    e.target.reset();
    closeSheets();
    await loadAll();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// --- 忘れ物追加フォーム ---

document.getElementById("lost-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("lost-name").value;

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    await api.createLostItem(name);
    e.target.reset();
    closeSheets();
    await loadAll();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// --- ゴミ庫トグル ---

document.getElementById("garbage-toggle-btn").addEventListener("click", toggleGarbage);

// --- 初期化 ---

loadAll().catch((err) => alert(err.message));
