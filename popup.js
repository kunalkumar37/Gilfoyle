
const hasChromeApis = typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage;
const CATEGORY_ICONS = {
  "Social Media": "👥",
  "Video Platforms": "🎬",
  "News/Media": "📰",
  "E-commerce": "🛒",
  "Productivity": "✅",
  "Entertainment": "🎮",
  "Reference": "📚",
  "Uncategorized": "📌"
};

const board = document.getElementById("board");
const analytics = document.getElementById("analytics");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");
const addCurrentBtn = document.getElementById("addCurrentBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const template = document.getElementById("bookmarkCardTemplate");

let state = {
  bookmarks: [],
  theme: "light",
  categoryOrder: [],
  userLearning: {}
};
let searchTerm = "";
const selectedIds = new Set();

init();

async function init() {
  if (hasChromeApis) {
    await refreshState();
  } else {
    state = {
      bookmarks: [
        { id: "demo-1", title: "YouTube", url: "https://youtube.com", domain: "youtube.com", category: "Video Platforms", tags: ["video", "stream"], notes: "Demo bookmark" },
        { id: "demo-2", title: "Wikipedia - AI", url: "https://wikipedia.org/wiki/Artificial_intelligence", domain: "wikipedia.org", category: "Reference", tags: ["artificial", "intelligence"], notes: "Research" }
      ],
      theme: "light",
      categoryOrder: Object.keys(CATEGORY_ICONS),
      userLearning: {}
    };
  }
  attachEvents();
  render();
}

function attachEvents() {
  searchInput.addEventListener("input", () => {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderBoard();
  });

  themeToggle.addEventListener("click", async () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    await sendMessage({ type: "SET_THEME", payload: { theme: state.theme } });
    applyTheme();
  });

  addCurrentBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !tab?.title) return;
    await sendMessage({
      type: "ADD_BOOKMARK",
      payload: { title: tab.title, url: tab.url }
    });
    await refreshState();
    render();
  });

  exportBtn.addEventListener("click", async () => {
    const { data } = await sendMessage({ type: "EXPORT_DATA" });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-bookmarks-export.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;
    const text = await file.text();
    await sendMessage({ type: "IMPORT_DATA", payload: JSON.parse(text) });
    await refreshState();
    render();
  });

  deleteSelectedBtn.addEventListener("click", async () => {
    for (const id of selectedIds) {
      await sendMessage({ type: "DELETE_BOOKMARK", payload: { id } });
    }
    selectedIds.clear();
    await refreshState();
    render();
  });
}

async function refreshState() {
  const response = await sendMessage({ type: "GET_BOOKMARKS" });
  state = response.data;
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === "light" ? "🌙" : "☀️";
}

function render() {
  renderAnalytics();
  renderBoard();
}

function renderAnalytics() {
  const total = state.bookmarks.length;
  const topCategory = Object.entries(groupByCategory(state.bookmarks)).sort((a, b) => b[1].length - a[1].length)[0];
  analytics.innerHTML = `
    <strong>Total:</strong> ${total}
    <br />
    <strong>Top Category:</strong> ${topCategory ? `${topCategory[0]} (${topCategory[1].length})` : "N/A"}
  `;
}

function renderBoard() {
  board.innerHTML = "";
  const grouped = groupByCategory(filterBookmarks(state.bookmarks, searchTerm));

  state.categoryOrder.forEach((category) => {
    const column = document.createElement("section");
    column.className = "column";
    column.dataset.category = category;

    const header = document.createElement("header");
    header.className = "column-header";
    header.draggable = true;
    header.innerHTML = `<h3>${CATEGORY_ICONS[category] || "📁"} ${category}</h3><span>${grouped[category]?.length || 0}</span>`;

    header.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/category", category);
    });

    column.addEventListener("dragover", (event) => event.preventDefault());
    column.addEventListener("drop", async (event) => {
      event.preventDefault();

      const sourceCategory = event.dataTransfer.getData("text/category");
      const bookmarkId = event.dataTransfer.getData("text/bookmark");

      if (sourceCategory) {
        reorderCategories(sourceCategory, category);
      }

      if (bookmarkId) {
        await sendMessage({
          type: "UPDATE_BOOKMARK",
          payload: { id: bookmarkId, category }
        });
        await refreshState();
      }

      render();
    });

    const list = document.createElement("div");
    list.className = "list";

    (grouped[category] || []).forEach((bookmark) => {
      list.append(createBookmarkCard(bookmark));
    });

    column.append(header, list);
    board.append(column);
  });
}

function createBookmarkCard(bookmark) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.dataset.id = bookmark.id;
  card.draggable = true;

  card.addEventListener("dragstart", (event) => {
    card.classList.add("dragging");
    event.dataTransfer.setData("text/bookmark", bookmark.id);
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));

  const checkbox = card.querySelector(".bulk-check");
  checkbox.checked = selectedIds.has(bookmark.id);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedIds.add(bookmark.id);
    else selectedIds.delete(bookmark.id);
  });

  const title = card.querySelector(".title");
  title.href = bookmark.url;
  title.textContent = bookmark.title;

  card.querySelector(".meta").textContent = bookmark.domain;
  card.querySelector(".notes").textContent = bookmark.notes || "No notes";

  const tagsWrap = card.querySelector(".tags");
  (bookmark.tags || []).forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    tagsWrap.append(chip);
  });

  const select = card.querySelector(".category-select");
  state.categoryOrder.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === bookmark.category;
    select.append(option);
  });

  select.addEventListener("change", async () => {
    await sendMessage({
      type: "UPDATE_BOOKMARK",
      payload: { id: bookmark.id, category: select.value }
    });
    await refreshState();
    render();
  });

  card.querySelector(".delete-btn").addEventListener("click", async () => {
    await sendMessage({ type: "DELETE_BOOKMARK", payload: { id: bookmark.id } });
    selectedIds.delete(bookmark.id);
    await refreshState();
    render();
  });

  return card;
}

function filterBookmarks(bookmarks, term) {
  if (!term) return bookmarks;

  return bookmarks.filter((bookmark) => {
    const haystack = [
      bookmark.title,
      bookmark.url,
      bookmark.category,
      bookmark.notes,
      ...(bookmark.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

function groupByCategory(bookmarks) {
  const grouped = {};
  state.categoryOrder.forEach((category) => {
    grouped[category] = [];
  });

  bookmarks.forEach((bookmark) => {
    const category = state.categoryOrder.includes(bookmark.category) ? bookmark.category : "Uncategorized";
    grouped[category] ??= [];
    grouped[category].push(bookmark);
  });

  return grouped;
}

function reorderCategories(sourceCategory, targetCategory) {
  if (sourceCategory === targetCategory) return;
  const order = [...state.categoryOrder];
  const sourceIndex = order.indexOf(sourceCategory);
  const targetIndex = order.indexOf(targetCategory);
  order.splice(sourceIndex, 1);
  order.splice(targetIndex, 0, sourceCategory);
  state.categoryOrder = order;
  sendMessage({ type: "SET_CATEGORY_ORDER", payload: { order } });
}

async function sendMessage(message) {
  if (!hasChromeApis) return { ok: true, data: state };
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "Message failed");
  return response;
}
