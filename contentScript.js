(() => {
  if (window.__smartBookmarksInjected) return;
  window.__smartBookmarksInjected = true;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "smart-bookmarks-fab";
  button.setAttribute("aria-label", "Save page to Smart Bookmarks Organizer");
  button.title = "Save to Smart Bookmarks Organizer";
  button.textContent = "★";

  const style = document.createElement("style");
  style.textContent = `
    .smart-bookmarks-fab {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      font-size: 22px;
      line-height: 1;
      z-index: 2147483647;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      opacity: 0.85;
    }
    .smart-bookmarks-fab:hover,
    .smart-bookmarks-fab:focus {
      opacity: 1;
      outline: 2px solid #bfdbfe;
      outline-offset: 2px;
    }
  `;

  button.addEventListener("click", async () => {
    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = "✓";

    await chrome.runtime.sendMessage({
      type: "ADD_BOOKMARK",
      payload: {
        title: document.title,
        url: window.location.href,
        notes: "",
        tags: []
      }
    });

    setTimeout(() => {
      button.disabled = false;
      button.textContent = previousText;
    }, 1000);
  });

  document.documentElement.append(style);
  document.documentElement.append(button);
})();
