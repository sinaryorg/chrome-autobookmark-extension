# AutoBookmark — Roadmap & Next Update Plan (v1.1.0+)

This document outlines the planned features, enhancements, and architectural details for the upcoming updates to **AutoBookmark — by Sinary**.

---

## 🎯 Target Version: v1.1.0

### 1. ✏️ Edit Existing Bookmarks
- **Feature**: Allow users to edit both the title and the URL of any saved bookmark directly from the floating bar.
- **UI / UX**:
  - Right-click context menu option: **"Edit Bookmark"**.
  - A clean, glassmorphic modal or inline popup with Title and URL input fields.
- **Technical Implementation**:
  - Uses `chrome.bookmarks.update(id, { title, url })`.
  - Automatically updates the UI in real-time across all open tabs via `chrome.bookmarks.onChanged`.

---

### 2. 🗑️ Remove / Delete Bookmarks
- **Feature**: Allow users to remove bookmarks with a single click or right-click.
- **UI / UX**:
  - Right-click context menu option: **"Delete Bookmark"** with a confirmation toast or undo banner.
  - Optional hover trash icon (`✕` or `🗑️`) in folder dropdowns and search results.
- **Technical Implementation**:
  - Uses `chrome.bookmarks.remove(id)`.
  - Automatically triggers `chrome.bookmarks.onRemoved`, seamlessly animating the removed bookmark out of the bar.

---

### 3. 📂 Folder Explorer & Expanded View
- **Feature**: Enhanced folder interaction allowing users to view, manage, and explore folder contents in greater depth.
- **UI / UX**:
  - Click-to-pin open folder panels or full-depth drawer view.
  - Option to **"Open All in New Tabs"** when right-clicking or clicking a folder.
  - Visual count badge showing how many items are inside each folder.
- **Technical Implementation**:
  - Uses `chrome.bookmarks.getChildren(folderId)` or cached bookmark tree.
  - Batch tab creation using `chrome.tabs.create`.

---

### 4. 🔀 Drag-and-Drop Bookmark Organization
- **Feature**: Reorder bookmarks and move bookmarks between folders seamlessly via drag-and-drop.
- **UI / UX**:
  - Native HTML5 Drag and Drop (`draggable="true"`) inside the Shadow DOM.
  - Animated insertion guideline showing the drop position.
  - Hovering over a folder while dragging automatically opens the folder after 400ms for deep nesting drops.
- **Technical Implementation**:
  - Uses `chrome.bookmarks.move(id, { parentId: targetFolderId, index: targetIndex })`.
  - Listens to `chrome.bookmarks.onMoved` to re-sync across windows without reloading.

---

### 5. 📁 Create & Delete Bookmark Folders
- **Feature**: Full folder management directly inside the extension.
- **UI / UX**:
  - **Create Folder**: A `+ New Folder` action button in the bar and inside folder dropdowns, opening a quick naming modal.
  - **Delete Folder**: Right-click option **"Delete Folder"** with a confirmation safeguard dialog (especially for folders with children).
- **Technical Implementation**:
  - Create: `chrome.bookmarks.create({ parentId, title })`.
  - Delete empty folder: `chrome.bookmarks.remove(id)`.
  - Delete non-empty folder tree: `chrome.bookmarks.removeTree(id)`.

---

## 🏗️ Technical Architecture & Permissions

- **Permissions**:  
  No new browser permissions are needed! All features are fully supported under the existing `"permissions": ["bookmarks", "storage"]` already granted in Manifest V3.
- **Isolation**:  
  Context menus, modals, and drag indicators will stay 100% encapsulated inside the extension's Shadow DOM to prevent any CSS interference from third-party host websites.

---

## 💬 Community Feedback & Contributions

Suggestions, ideas, and feature requests can be submitted via:
- **GitHub Issues**: [https://github.com/sinaryorg/chrome-autobookmark-extension/issues](https://github.com/sinaryorg/chrome-autobookmark-extension/issues)
- **Website**: [https://sinary.org](https://sinary.org)
