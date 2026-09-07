# AutoBookmark — Roadmap & Release Milestones

This document tracks completed milestones and outlines the planned features, enhancements, and architectural details for future updates to **AutoBookmark — by Sinary**.

---

## ✅ Released in v1.1.0

The following features and improvements were successfully implemented and shipped in **v1.1.0**:

### 1. 🔀 Drag-and-Drop Bookmark Organization
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Reorder bookmarks on the bar, within folder dropdowns, and inside nested submenus.
  - Drop bookmarks directly into folders with hover highlight activation.
  - Live animated insertion guidelines showing exact drop position.
  - Robust index boundary calculations for top, middle, and bottom drops.

### 2. ✏️ Edit Bookmarks & Rename Folders
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Right-click context menu option: **"Edit Bookmark..."** / **"Rename Folder..."**.
  - Glassmorphic modal editor for titles and URLs with auto-protocol prefixing (`https://`).
  - Real-time synchronization with `chrome.bookmarks.update`.

### 3. 🗑️ Delete Bookmarks & Folders
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Right-click context menu option: **"Delete Bookmark"** / **"Delete Folder"**.
  - Safety confirmation modal dialog.
  - Recursive folder removal (`chrome.bookmarks.removeTree`) for non-empty folders.

### 4. 📁 Seamless Multi-Level Subfolders
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Deep nested subfolder navigation.
  - Connected concave fillet wings with seamless zero-gap attachment.
  - Smart hover de-escalation closing submenus when moving to regular links or bar controls.

### 5. 🛡️ Stacking Order & Context Menu Engine
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Stratified Shadow DOM z-index tiers (`contextMenu`: `2147483646 !important`, `modal`: `2147483647 !important`).
  - Dynamic submenu z-indexes and DOM re-parenting ensuring context menus are never occluded by subfolder portals.
  - Interaction guards preventing dropdowns and submenus from closing prematurely while using context menus.

---

## 🎯 Target Version: v1.2.0+ (Upcoming Roadmap)

### 1. ➕ Quick Add & Create Actions
- **Feature**: Fast bookmark and folder creation directly from the bar.
- **UI / UX**:
  - `+ Add Current Tab` button to quickly bookmark the active page to the bar or a selected folder.
  - `+ New Folder` action button in the bar and within dropdown menus.
- **Technical Implementation**:
  - `chrome.tabs.query({ active: true, currentWindow: true })` + `chrome.bookmarks.create()`.

---

### 2. 📂 "Open All in Tabs" for Folders
- **Feature**: Open all links in a folder (and its subfolders) in new tabs with a single click.
- **UI / UX**:
  - Right-click context menu option: **"Open All in New Tabs"**.
  - Middle-click (<kbd>auxclick</kbd>) on a folder icon/chip to trigger batch open.
- **Technical Implementation**:
  - Traversal of folder children and batch tab creation via `chrome.tabs.create`.

---

### 3. 🔢 Folder Bookmark Count Badges
- **Feature**: Small subtle badge counter showing the number of bookmarks stored within each folder.
- **UI / UX**:
  - Lightweight pill/badge counter next to the folder title inside dropdowns.

---

### 4. ⌨️ Full Keyboard Navigation
- **Feature**: Complete keyboard accessibility across the bar, dropdowns, and nested submenus.
- **UI / UX**:
  - Navigate with <kbd>Tab</kbd>, <kbd>Arrow Keys</kbd>, <kbd>Enter</kbd>, and <kbd>Escape</kbd>.
  - Context menu trigger via <kbd>Menu</kbd> key or <kbd>Shift + F10</kbd>.

---

### 5. 💾 Backup & Export Bookmarks
- **Feature**: Quick export/import of bookmarks in standard HTML format.
- **UI / UX**:
  - Settings popup option to download a JSON/HTML bookmark backup.

---

## 🏗️ Technical Architecture & Permissions

- **Permissions**:  
  All features remain fully supported under existing `"permissions": ["bookmarks", "storage"]` in Manifest V3. No intrusive permissions required.
- **Isolation**:  
  All new UI components remain 100% encapsulated inside the extension's Shadow DOM to prevent any CSS conflicts with host websites.

---

## 💬 Community Feedback & Contributions

Suggestions, ideas, and feature requests can be submitted via:
- **GitHub Issues**: [https://github.com/sinaryorg/chrome-autobookmark-extension/issues](https://github.com/sinaryorg/chrome-autobookmark-extension/issues)
- **Website**: [https://sinary.org](https://sinary.org)
