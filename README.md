# AutoBookmark — by Sinary

> A smart, auto-hiding floating bookmark bar for **Chromium-based browsers** (Manifest V3) crafted by the **[sinary.org](https://sinary.org/)** developer team.

![AutoBookmark Banner](icons/icon128.png)

---

## 🌐 Browser Compatibility

AutoBookmark is built using standard Chromium Manifest V3 and is **100% compatible with all major Chromium-based browsers**:

- ✅ **Google Chrome**
- ✅ **Microsoft Edge**
- ✅ **Brave Browser**
- ✅ **Opera & Opera GX**
- ✅ **Vivaldi**
- ✅ **Arc Browser**

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

## 🚀 How to Get AutoBookmark

> [!NOTE]
> **Why isn't AutoBookmark on the Chrome Web Store?**  
> Google charges an upfront developer registration fee to publish on the Chrome Web Store. To keep AutoBookmark 100% free and open-source without passing costs onto our users, we distribute AutoBookmark directly via **GitHub Releases** and the official **Microsoft Edge Add-ons Store** (which works in Chrome too!).

You can install AutoBookmark using either method below:

### Method 1: Microsoft Edge Add-ons Store (Recommended — 1-Click Install & Auto-Updates)

The easiest way to install and receive automatic updates. **Works on Edge, Chrome, Brave, and Opera**:

1. Visit the **[AutoBookmark Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons)** store listing.
2. Click **Get** (or **Add to Chrome** / **Add to Brave**).
   - *If installing in Google Chrome:* Chrome will prompt `"Allow extensions from other stores"`. Click **Allow**, then click **Add to Chrome**.
3. Done! The extension will automatically stay updated in the background.

---

### Method 2: Direct GitHub Release (No Store Required)

For complete independence from any store:

1. Download **`AutoBookmark.zip`** from the latest release:  
   👉 **[Download Latest GitHub Release](https://github.com/sinaryorg/chrome-autobookmark-extension/releases/latest)**
2. Unzip `AutoBookmark.zip` into a folder on your computer.
3. Open your browser's extension management page:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
   - **Opera**: `opera://extensions`
4. Toggle ON **Developer mode** (top-right corner switch).
5. Click **"Load unpacked"** (top-left) and select the unzipped folder.
6. Done! Hover near the top edge of any website to use your new bookmark bar.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Alt + B</kbd> | Toggle / Pin the AutoBookmark bar |

---

## ⚙️ Extension Settings

Click the **AutoBookmark** icon in your browser toolbar to customize:
- **Trigger Proximity**: Adjust sensitivity (2px to 25px from the top edge).
- **Auto-Hide Delay**: Configure hide duration (100ms to 1500ms).
- **Appearance Themes**: Switch between Dark Glass, Modern Light, AMOLED Black, and Classic Chrome.
- **Position**: Place on the Top or Bottom screen edge.
- **Behavior**: Choose whether bookmarks open in the current tab or a new tab.

---

## 🛠️ Tech Stack & Architecture

- **Manifest V3**: Pure modern extension standards using background service workers and declarative storage.
- **Shadow DOM**: Complete style and layout encapsulation from the host webpage.
- **Native Browser APIs**: `chrome.bookmarks`, `chrome.storage.sync`, and `chrome.commands`.

---

## 🌐 Sinary Ecosystem

AutoBookmark is developed and maintained by the **[sinary.org](https://sinary.org/)** developer team — building privacy-focused apps, digital tools, and browser extensions.

- **Website**: [https://sinary.org](https://sinary.org)
- **GitHub**: [https://github.com/sinaryorg](https://github.com/sinaryorg)
- **Privacy Policy**: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

---

## 📄 License

MIT License. Open source and free to use.
