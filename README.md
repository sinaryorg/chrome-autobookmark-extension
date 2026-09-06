# AutoBookmark — by Sinary

> A smart, auto-hiding floating bookmark bar for Google Chrome (Manifest V3) crafted by the **[sinary.org](https://sinary.org/)** developer team.

![AutoBookmark Banner](icons/icon128.png)

---

## ✨ Features

- **⚡ Hover-Activated Slide-in**: Move your cursor to the top edge of any webpage (within 8px) to reveal your bookmarks.
- **🍃 Smooth Auto-Hide**: Slides away smoothly when you move your cursor back into the page content.
- **📁 Full Folder Dropdowns**: Browse multi-level nested folders with flyout submenus.
- **🔍 Connected Search with Bevel**: Instant bookmark search connected seamlessly to the navbar with a curved bevel fillet and glass highlight.
- **📌 Pin Anytime**: Press <kbd>Alt + B</kbd> or click the 📌 pin button to keep the bar visible while working.
- **🛡️ 100% Shadow DOM Isolated**: Injected with an open Shadow DOM root — zero CSS conflicts with any website.
- **🎨 4 Curated Themes**: Dark Glass, Modern Light, AMOLED Black, and Classic Chrome.
- **⚡ Privacy-First**: 100% local in-browser execution. No data is ever collected or transmitted.

---

## 🚀 Installation

### Option 1: Chrome Web Store
*(Link will be available once published on the Chrome Web Store)*

### Option 2: Manual Installation (Developer Mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/sinaryorg/chrome-autobookmark-extension.git
   ```
2. Open **Google Chrome** and navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the upper-right corner.
4. Click the **Load unpacked** button in the upper-left corner.
5. Select the `AutoBookmark` folder (containing `manifest.json`).
6. Hover at the top edge of any page to enjoy your auto-hiding bookmark bar!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Alt + B</kbd> | Toggle / Pin the AutoBookmark bar |

---

## ⚙️ Extension Settings

Click the **AutoBookmark** icon in your Chrome extensions toolbar to customize:
- **Trigger Proximity**: Adjust sensitivity (2px to 25px).
- **Auto-Hide Delay**: Configure hide duration (100ms to 1500ms).
- **Appearance Themes**: Switch between Dark Glass, Modern Light, AMOLED, and Classic.
- **Position**: Place on the Top or Bottom screen edge.
- **Behavior**: Choose whether bookmarks open in the current tab or a new tab.

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3**: Pure modern extension standards using background service workers and declarative storage.
- **Shadow DOM**: Complete style and layout encapsulation from the host webpage.
- **Native Chrome APIs**: `chrome.bookmarks`, `chrome.storage.sync`, and `chrome.commands`.

---

## 🌐 Sinary Ecosystem

AutoBookmark is developed and maintained by the **[sinary.org](https://sinary.org/)** developer team — building privacy-focused apps, digital tools, and browser extensions.

- Website: [https://sinary.org](https://sinary.org)
- GitHub: [https://github.com/sinaryorg](https://github.com/sinaryorg)

---

## 📄 License

MIT License. Open source and free to use.
