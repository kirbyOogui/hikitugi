/**
 * 設定画面のロジック。
 * カテゴリ管理（追加・編集・並び替え・削除）と対応済み一覧（再登録・完全削除）を扱う。
 */

let sortableInstance = null;

function formatDateTime(isoString) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

// --- カテゴリ管理 ---

async function loadCategories() {
  const categories = await api.getCategories();
  renderCategoryList(categories);
}

function renderCategoryList(categories) {
  const listEl = document.getElementById("category-list");
  listEl.innerHTML = "";

  for (const category of categories) {
    listEl.appendChild(renderCategoryRow(category));
  }

  // 既存のSortableインスタンスがあれば破棄してから作り直す（再描画のたびに二重登録を防ぐ）
  if (sortableInstance) {
    sortableInstance.destroy();
  }
  sortableInstance = new Sortable(listEl, {
    handle: ".category-row__handle",
    animation: 150,
    onEnd: async () => {
      const order = Array.from(listEl.children).map((el) => Number(el.dataset.id));
      try {
        await api.reorderCategories(order);
      } catch (err) {
        alert(err.message);
        await loadCategories();
      }
    },
  });
}

function renderCategoryRow(category) {
  const row = document.createElement("div");
  row.className = "category-row";
  row.dataset.id = category.id;
  row.innerHTML = `
    <span class="category-row__handle">≡</span>
    <span class="category-row__name"></span>
    <button class="btn btn-outline category-row__edit">編集</button>
    <button class="btn btn-danger category-row__delete">削除</button>
  `;
  row.querySelector(".category-row__name").textContent = category.name;

  row.querySelector(".category-row__edit").addEventListener("click", () => {
    startEditCategory(row, category);
  });
  row.querySelector(".category-row__delete").addEventListener("click", async () => {
    if (!confirm(`「${category.name}」を削除しますか？`)) return;
    try {
      await api.deleteCategory(category.id);
      await loadCategories();
    } catch (err) {
      alert(err.message);
    }
  });

  return row;
}

function startEditCategory(row, category) {
  const nameEl = row.querySelector(".category-row__name");

  // innerHTML文字列にカテゴリ名を埋め込むとXSSの余地があるため、DOM APIで組み立てる
  const input = document.createElement("input");
  input.type = "text";
  input.className = "category-row__name-input";
  input.value = nameEl.textContent;
  input.style.cssText =
    "flex:1; border:1px solid var(--color-border); border-radius:var(--radius-sm); padding:6px 8px; font-size:15px;";
  nameEl.replaceWith(input);
  input.focus();

  const editBtn = row.querySelector(".category-row__edit");
  editBtn.textContent = "保存";
  const newEditBtn = editBtn.cloneNode(true);
  editBtn.replaceWith(newEditBtn);
  newEditBtn.addEventListener("click", async () => {
    const newName = input.value.trim();
    if (!newName) return;
    try {
      await api.updateCategory(category.id, newName);
      await loadCategories();
    } catch (err) {
      alert(err.message);
    }
  });
}

document.getElementById("category-add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("category-add-input");
  const name = input.value.trim();
  if (!name) return;
  try {
    await api.createCategory(name);
    input.value = "";
    await loadCategories();
  } catch (err) {
    alert(err.message);
  }
});

// --- 対応済み一覧 ---

async function loadDoneList() {
  const items = await api.getHandovers("done");
  renderDoneList(items);
}

function renderDoneList(items) {
  const listEl = document.getElementById("done-list");
  listEl.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "対応済みの引継ぎはありません";
    listEl.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "done-row";
    row.innerHTML = `
      <p class="done-row__body"></p>
      <p class="done-row__meta"></p>
      <div class="done-row__actions">
        <button class="btn btn-outline done-row__reopen">再登録</button>
        <button class="btn btn-danger done-row__delete">完全削除</button>
      </div>
    `;
    row.querySelector(".done-row__body").appendChild(buildTextWithHighlightedDates(item.body));
    row.querySelector(".done-row__meta").textContent =
      `${item.category_name} / 更新: ${formatDateTime(item.updated_at)}`;

    row.querySelector(".done-row__reopen").addEventListener("click", async () => {
      try {
        await api.reopenHandover(item.id);
        await loadDoneList();
      } catch (err) {
        alert(err.message);
      }
    });
    row.querySelector(".done-row__delete").addEventListener("click", async () => {
      if (!confirm("完全に削除します。よろしいですか？")) return;
      try {
        await api.deleteHandover(item.id);
        await loadDoneList();
      } catch (err) {
        alert(err.message);
      }
    });

    listEl.appendChild(row);
  }
}

// --- 設定トップ(項目一覧) ⇔ 詳細パネルの切り替え ---
// 今後設定項目が増えても、トップは常に項目一覧のみを表示する構成にする。

function showSettingsMenu() {
  document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.add("hidden"));
  document.getElementById("settings-menu").classList.remove("hidden");
}

function showSettingsPanel(panelId) {
  document.getElementById("settings-menu").classList.add("hidden");
  document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.add("hidden"));
  document.getElementById(panelId).classList.remove("hidden");
}

document.querySelectorAll(".settings-menu-item").forEach((btn) => {
  btn.addEventListener("click", () => showSettingsPanel(btn.dataset.target));
});
document.querySelectorAll(".panel-back").forEach((btn) => {
  btn.addEventListener("click", showSettingsMenu);
});

// --- 初期化 ---

Promise.all([loadCategories(), loadDoneList()]).catch((err) => alert(err.message));
