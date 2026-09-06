// AutoBookmark - Service Worker (Background Script)

const DEFAULT_SETTINGS = {
  enabled: true,
  triggerHeight: 8,       // Distance from top edge in pixels to trigger bar
  hideDelay: 450,          // Delay in ms before hiding after mouse leaves
  theme: 'dark-glass',     // 'dark-glass' | 'modern-light' | 'amoled' | 'chrome'
  openInNewTab: false,     // Open bookmarks in new tab by default
  showFavicons: true,      // Show website favicons
  barPosition: 'top',      // 'top' | 'bottom'
  fontSize: 'medium',      // 'small' | 'medium' | 'large'
  pinned: false            // Keep bar pinned open
};

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.sync.get('settings');
  if (!data.settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
});

// Helper: Broadcast message to all active web tabs
async function broadcastToAllTabs(message) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      }
    }
  } catch (err) {}
}

// Listen to bookmark changes in Chrome and notify tabs to live-update
const bookmarkEvents = [
  chrome.bookmarks.onCreated,
  chrome.bookmarks.onRemoved,
  chrome.bookmarks.onChanged,
  chrome.bookmarks.onMoved,
  chrome.bookmarks.onChildrenReordered
];

bookmarkEvents.forEach(event => {
  if (event && event.addListener) {
    event.addListener(() => {
      broadcastToAllTabs({ type: 'BOOKMARKS_UPDATED' });
    });
  }
});

// Listen to keyboard shortcut command
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-bar') {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id && activeTab.url && !activeTab.url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_PIN' }).catch(() => {});
      }
    } catch (e) {}
  }
});

// Message listener for content scripts & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_BOOKMARKS') {
    chrome.bookmarks.getTree().then(tree => {
      let barItems = [];
      let otherItems = [];

      if (tree && tree.length > 0 && tree[0].children) {
        const rootChildren = tree[0].children;
        const barFolder = rootChildren.find(c => c.id === '1' || /bar/i.test(c.title)) || rootChildren[0];
        if (barFolder && barFolder.children) {
          barItems = barFolder.children;
        }

        const otherFolder = rootChildren.find(c => c.id === '2' || /other/i.test(c.title)) || rootChildren[1];
        if (otherFolder && otherFolder.children && otherFolder.children.length > 0) {
          otherItems = [otherFolder];
        }
      }

      sendResponse({ success: true, bookmarks: barItems, otherBookmarks: otherItems });
    }).catch(err => {
      console.error('Failed to get bookmarks tree:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // async sendResponse
  }

  if (request.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings').then(data => {
      const settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {});
      sendResponse({ success: true, settings });
    }).catch(err => {
      sendResponse({ success: false, error: err.message, settings: DEFAULT_SETTINGS });
    });
    return true;
  }

  if (request.type === 'SAVE_SETTINGS') {
    chrome.storage.sync.set({ settings: request.settings }).then(() => {
      broadcastToAllTabs({ type: 'SETTINGS_UPDATED', settings: request.settings });
      sendResponse({ success: true });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  if (request.type === 'SEARCH_BOOKMARKS') {
    chrome.bookmarks.search(request.query || '').then(results => {
      const links = (results || []).filter(item => item.url).slice(0, 30);
      sendResponse({ success: true, results: links });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }

  return false;
});
