# AutoBookmark — Roadmap & Release Milestones

This document tracks completed milestones and outlines the planned features, enhancements, and architectural details for future updates to **AutoBookmark — by Sinary**.

---

## ✅ Released in v1.2.0

The following features and improvements were successfully implemented and shipped in **v1.2.0**:

### 1. 🧭 4-Direction Edge Docking (Top, Bottom, Left, Right)
- **Status**: ✅ **Shipped**
- **Highlights**:
  - 4-direction segmented control in the settings popup with live broadcast to all open tabs.
  - Full-screen edge detection and responsive auto-reveal/hide triggers.

### 2. 📐 Vertical Sidebar Dock Mode (`Left` / `Right`)
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Dedicated `210px` vertical dock layout with `100vh` height.
  - Integrated header actions, full-width search bar, and vertical bookmark track.
  - Cohesive borders and soft depth shadows across all 4 themes.

### 3. ✨ Horizontal Flyout Portals
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Folder dropdowns and search modals fly out towards the screen center flush against the sidebar.
  - Viewport-aware vertical clamping preventing overflow off-screen.

### 4. 🎯 Vertical Drag-and-Drop
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Vertical `clientY` item boundary calculation for bookmark reordering on sidebars.
  - Clean horizontal drop line guideline indicators.

### 5. ➕ One-Click "Add Current Tab"
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Dedicated quick-add button in header controls with checkmark transition and toast feedback.
  - In-dropdown action button to bookmark the active page directly into any target folder.
  - Context menu option: **"Bookmark Current Tab Here"**.

### 6. 📂 "Open All in Tabs" for Folders
- **Status**: ✅ **Shipped**
- **Highlights**:
  - Right-click context menu option: **"Open All in Tabs (N)"** with active link count.
  - Middle-click (<kbd>auxclick</kbd>) on folder chips and subfolders to batch-open all links in background tabs.

---

## 📦 Released in v1.1.0

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

## 🎯 Target Version: v1.3.0+ (Upcoming Roadmap)

### 1. 📁 "+ New Folder" In-Place Creation
- **Feature**: Fast folder creation directly from the bar and inside dropdowns.
- **UI / UX**:
  - `+ New Folder` action button in the bar's header and inside dropdown menus.
  - Glassmorphic modal to enter folder name and select target location.
- **Technical Implementation**:
  - `chrome.bookmarks.create({ parentId, title })`.

---

### 2. 🔢 Folder Bookmark Count Badges
- **Feature**: Subtle badge counter showing the number of bookmarks stored within each folder.
- **UI / UX**:
  - Lightweight pill counter next to folder titles (e.g. `Dev (14)`, `Reading (5)`).
  - Can be toggled on/off in the Settings popup.

---

### 3. ⌨️ Global Spotlight & Quick-Search Launcher (`Alt + B`)
- **Feature**: Hotkey to instantly summon the bar and focus search without using the mouse.
- **UI / UX**:
  - Press <kbd>Alt + B</kbd> to reveal the bar and focus the search bar immediately.
  - Arrow key (<kbd>↑</kbd> / <kbd>↓</kbd>) navigation and <kbd>Enter</kbd> to launch.
- **Technical Implementation**:
  - `chrome.commands` shortcut listener + shadow root keyboard event trap.

---

### 4. 🎨 Custom Accent Color & Glow Customizer
- **Feature**: Let users choose their preferred glow and active indicator color.
- **UI / UX**:
  - Accent palette in Settings popup: Neon Cyan (Default), Violet, Emerald, Amber, Sakura Pink, and custom hex input.

---

### 5. 🧹 Duplicate & Broken Link Cleaner
- **Feature**: Health scan tool to identify duplicate bookmarks and empty folders.
- **UI / UX**:
  - "Bookmark Health" tab in the Settings popup with 1-click batch cleanup.

---

### 6. 💾 One-Click Backup & Export (JSON / HTML)
- **Feature**: Export and restore your complete bookmark structure.
- **UI / UX**:
  - Settings popup option to download an instant JSON/HTML backup file and restore anytime.

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
