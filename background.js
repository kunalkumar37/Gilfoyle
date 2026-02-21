const DEFAULT_CATEGORIES = [
  "Social Media",
  "Video Platforms",
  "News/Media",
  "E-commerce",
  "Productivity",
  "Entertainment",
  "Reference",
  "Uncategorized"
];

const DOMAIN_CATEGORY_MAP = {
  "twitter.com": "Social Media",
  "x.com": "Social Media",
  "instagram.com": "Social Media",
  "facebook.com": "Social Media",
  "linkedin.com": "Social Media",
  "reddit.com": "Social Media",
  "youtube.com": "Video Platforms",
  "youtu.be": "Video Platforms",
  "vimeo.com": "Video Platforms",
  "twitch.tv": "Video Platforms",
  "amazon.": "E-commerce",
  "flipkart.com": "E-commerce",
  "myntra.com": "E-commerce",
  "ebay.": "E-commerce",
  "google.com/docs": "Productivity",
  "docs.google.com": "Productivity",
  "notion.so": "Productivity",
  "trello.com": "Productivity",
  "slack.com": "Productivity",
  "netflix.com": "Entertainment",
  "spotify.com": "Entertainment",
  "steampowered.com": "Entertainment",
  "wikipedia.org": "Reference",
  "developer.mozilla.org": "Reference",
  "stackoverflow.com": "Reference",
  "arxiv.org": "Reference"
};

const CATEGORY_KEYWORDS = {
  "Social Media": ["tweet", "post", "social", "community", "profile", "network"],
  "Video Platforms": ["video", "watch", "stream", "channel", "episode"],
  "News/Media": ["news", "report", "media", "blog", "article", "press"],
  "E-commerce": ["shop", "buy", "cart", "deal", "product", "sale"],
  "Productivity": ["docs", "workspace", "project", "task", "board", "calendar"],
  "Entertainment": ["music", "movie", "game", "podcast", "playlist", "show"],
  "Reference": ["wiki", "docs", "reference", "guide", "research", "tutorial"]
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "by", "with", "at", "is", "are", "from", "your", "this", "that"
]);

chrome.runtime.onInstalled.addListener(async () => {
  await ensureStorageDefaults();
  chrome.contextMenus.create({
    id: "smartBookmarkCurrent",
    title: "Add to Smart Bookmarks Organizer",
    contexts: ["page"]
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-add-bookmark") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !tab?.title) return;
  await addBookmarkFromTab(tab);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "smartBookmarkCurrent" || !tab?.url || !tab?.title) return;
  await addBookmarkFromTab(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "ADD_BOOKMARK") {
      const tabData = message.payload || {};
      const record = await addBookmark({
        title: tabData.title,
        url: tabData.url,
        notes: tabData.notes ?? "",
        tags: tabData.tags ?? []
      });
      sendResponse({ ok: true, data: record });
    }

    if (message.type === "GET_BOOKMARKS") {
      const state = await getState();
      sendResponse({ ok: true, data: state });
    }

    if (message.type === "UPDATE_BOOKMARK") {
      const updated = await updateBookmark(message.payload);
      sendResponse({ ok: true, data: updated });
    }

    if (message.type === "DELETE_BOOKMARK") {
      await deleteBookmark(message.payload.id);
      sendResponse({ ok: true });
    }

    if (message.type === "SET_THEME") {
      await chrome.storage.local.set({ theme: message.payload.theme });
      sendResponse({ ok: true });
    }

    if (message.type === "SET_CATEGORY_ORDER") {
      await chrome.storage.local.set({ categoryOrder: message.payload.order });
      sendResponse({ ok: true });
    }

    if (message.type === "EXPORT_DATA") {
      const state = await getState();
      sendResponse({ ok: true, data: state });
    }

    if (message.type === "IMPORT_DATA") {
      await importState(message.payload);
      sendResponse({ ok: true });
    }
  })().catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function addBookmarkFromTab(tab) {
  await addBookmark({ title: tab.title, url: tab.url, notes: "", tags: [] });
}

async function addBookmark({ title, url, notes = "", tags = [] }) {
  const state = await getState();
  const category = classifyBookmark({ title, url }, state.userLearning);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id,
    title,
    url,
    domain: safeDomain(url),
    category,
    notes,
    tags: tags.length ? tags : extractTags(title),
    createdAt: now,
    updatedAt: now,
    visitCount: 0,
    lastVisitedAt: null
  };

  const bookmarks = [record, ...state.bookmarks];
  await chrome.storage.local.set({ bookmarks });
  return record;
}

async function updateBookmark(payload) {
  const state = await getState();
  const bookmarks = state.bookmarks.map((bookmark) => {
    if (bookmark.id !== payload.id) return bookmark;

    if (payload.category && payload.category !== bookmark.category) {
      learnDomainPreference(bookmark.domain, payload.category, state.userLearning);
    }

    return {
      ...bookmark,
      ...payload,
      updatedAt: new Date().toISOString()
    };
  });

  await chrome.storage.local.set({ bookmarks, userLearning: state.userLearning });
  return bookmarks.find((bookmark) => bookmark.id === payload.id);
}

async function deleteBookmark(id) {
  const state = await getState();
  const bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id);
  await chrome.storage.local.set({ bookmarks });
}

async function getState() {
  const data = await chrome.storage.local.get([
    "bookmarks",
    "theme",
    "categoryOrder",
    "userLearning"
  ]);

  return {
    bookmarks: data.bookmarks ?? [],
    theme: data.theme ?? "light",
    categoryOrder: data.categoryOrder ?? [...DEFAULT_CATEGORIES],
    userLearning: data.userLearning ?? {}
  };
}

async function ensureStorageDefaults() {
  const state = await getState();
  await chrome.storage.local.set({
    bookmarks: state.bookmarks,
    theme: state.theme,
    categoryOrder: state.categoryOrder,
    userLearning: state.userLearning
  });
}

function classifyBookmark({ title = "", url = "" }, userLearning = {}) {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const domain = safeDomain(url);

  if (domain && userLearning[domain]) {
    return bestLearnedCategory(userLearning[domain]);
  }

  for (const [pattern, category] of Object.entries(DOMAIN_CATEGORY_MAP)) {
    if (lowerUrl.includes(pattern)) return category;
  }

  const categoryScores = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c, 0]));

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach((keyword) => {
      if (lowerTitle.includes(keyword)) categoryScores[category] += 2;
      if (lowerUrl.includes(keyword)) categoryScores[category] += 1;
    });
  });

  const best = Object.entries(categoryScores)
    .filter(([category]) => category !== "Uncategorized")
    .sort((a, b) => b[1] - a[1])[0];

  return best && best[1] > 0 ? best[0] : "Uncategorized";
}

function extractTags(title = "") {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token))
    .slice(0, 5);
}

function safeDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function learnDomainPreference(domain, category, learning) {
  if (!domain || !category) return;
  if (!learning[domain]) learning[domain] = {};
  if (!learning[domain][category]) learning[domain][category] = 0;
  learning[domain][category] += 1;
}

function bestLearnedCategory(domainLearning) {
  return Object.entries(domainLearning).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Uncategorized";
}

async function importState(incoming) {
  const normalizedBookmarks = Array.isArray(incoming.bookmarks)
    ? incoming.bookmarks.map((bookmark) => ({
        ...bookmark,
        id: bookmark.id || crypto.randomUUID(),
        updatedAt: bookmark.updatedAt || new Date().toISOString(),
        createdAt: bookmark.createdAt || new Date().toISOString(),
        tags: Array.isArray(bookmark.tags) ? bookmark.tags : extractTags(bookmark.title),
        notes: bookmark.notes || ""
      }))
    : [];

  await chrome.storage.local.set({
    bookmarks: normalizedBookmarks,
    categoryOrder: Array.isArray(incoming.categoryOrder) && incoming.categoryOrder.length
      ? incoming.categoryOrder
      : [...DEFAULT_CATEGORIES],
    theme: incoming.theme === "dark" ? "dark" : "light",
    userLearning: typeof incoming.userLearning === "object" && incoming.userLearning ? incoming.userLearning : {}
  });
}
