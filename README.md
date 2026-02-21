# Smart Bookmarks Organizer (Chrome Extension)

A production-ready Manifest V3 Chrome extension that auto-categorizes bookmarks and organizes them into clear category rows.

## Features implemented

- Auto-categorization using:
  - Domain mapping for known sites (Twitter/X, Instagram, YouTube, Amazon, Wikipedia, etc.)
  - Keyword scoring fallback for unknown sites
  - Adaptive local learning from user recategorization
- Visual category board with icon headers
- One-click bookmarking from:
  - Content-script floating button on any site
  - Popup “Add Current” button
  - Keyboard shortcut (`Ctrl/Cmd+Shift+B`)
  - Right-click context menu
- Search across title/URL/category/tags/notes
- Drag-and-drop:
  - Reorder categories
  - Move bookmarks between categories
- Export/import JSON backup
- Dark/light mode toggle
- Bulk delete of selected bookmarks
- Basic analytics in popup
- Privacy-first local storage (`chrome.storage.local`) with no external API calls
- Accessibility-minded UI with labels and keyboard-friendly controls

## Architecture

```
manifest.json         # MV3 extension metadata and permission model
background.js         # Service worker: categorization, storage, commands, menu, message API
contentScript.js      # Floating one-click bookmark button for all pages
popup.html            # Main UI surface (also used as options page)
popup.css             # Responsive styling + light/dark theming
popup.js              # Rendering, search, DnD, bulk ops, import/export, analytics
```

## Data model (stored in `chrome.storage.local`)

```json
{
  "bookmarks": [
    {
      "id": "uuid",
      "title": "Example",
      "url": "https://example.com",
      "domain": "example.com",
      "category": "Reference",
      "tags": ["example", "docs"],
      "notes": "",
      "createdAt": "ISO",
      "updatedAt": "ISO",
      "visitCount": 0,
      "lastVisitedAt": null
    }
  ],
  "theme": "light",
  "categoryOrder": ["Social Media", "Video Platforms", "News/Media", "E-commerce", "Productivity", "Entertainment", "Reference", "Uncategorized"],
  "userLearning": {
    "example.com": {
      "Reference": 3
    }
  }
}
```

## Step-by-step build and run

1. **Create extension files**
   - Add all files listed in the architecture section.
2. **Load in Chrome**
   - Open `chrome://extensions`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select this folder.
3. **Verify one-click bookmarking**
   - Visit any page.
   - Click the floating `★` button injected by `contentScript.js`.
4. **Open popup and test organization**
   - Click extension icon.
   - Check category sections and search.
5. **Test drag-and-drop**
   - Drag category headers to reorder columns.
   - Drag bookmark card to another category.
6. **Test import/export**
   - Export JSON backup.
   - Re-import same JSON and verify state restoration.
7. **Test keyboard shortcut**
   - Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on macOS).
8. **Test context menu integration**
   - Right click page → “Add to Smart Bookmarks Organizer”.

## AI integration (privacy-first, on-device)

This project includes practical “AI-like” intelligence without cloud calls:

1. **Smart Categorization (implemented)**
   - Rule engine + keyword scoring + title token extraction.
2. **Pattern Recognition (implemented)**
   - Learns per-domain category preferences based on manual recategorization.
3. **NLP-lite title understanding (implemented)**
   - Extracts top tokens from titles as tags (stop-word filtering).
4. **Personalization loop (implemented)**
   - User actions continuously refine future domain predictions.

### Optional advanced on-device AI upgrades

- Use TensorFlow.js in-extension for small text classifiers.
- Train local Naive Bayes on title+domain tokens.
- Add confidence scoring and “suggested category” badges.
- Add an “Explain this category” debug panel for transparency.

## Production hardening checklist

- Add extension icons (`16, 32, 48, 128`) and reference in `manifest.json`.
- Add automated test suite (e.g., Jest for pure classifier logic).
- Add bookmark open tracking (`chrome.tabs.onUpdated`) for better analytics.
- Add optional encrypted sync using `chrome.storage.sync` for settings.
- Improve accessibility:
  - Focus management during drag/drop.
  - Keyboard-only reordering shortcuts.
- Add schema version migrations for storage updates.
- Add rate-limiting/debouncing for heavy UI operations.

## Chrome Web Store deployment steps

1. Run manual QA across top target websites.
2. Capture screenshots + promo graphics.
3. Prepare privacy policy (explicitly no external calls for categorization).
4. Zip extension folder (excluding `.git`).
5. Upload package to Chrome Web Store Developer Dashboard.
6. Complete listing metadata and category.
7. Submit for review.

## AI-assisted development workflow (recommended)

1. Ask AI to scaffold MV3 structure and message contracts.
2. Generate unit tests for classifier and import/export validation.
3. Use AI to produce accessibility review checklist.
4. Use AI to generate synthetic bookmark datasets for QA.
5. Use AI for release notes + store listing copy.
6. Keep human-in-the-loop for privacy/security and UX approval.

