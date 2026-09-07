// AutoBookmark - Content Script (Injected into web pages)

(function () {
  if (window.__autoBookmarkInjected) return;
  window.__autoBookmarkInjected = true;

  // State
  let settings = {
    enabled: true,
    triggerHeight: 8,
    hideDelay: 450,
    theme: 'dark-glass',
    openInNewTab: false,
    showFavicons: true,
    showBookmarkUrl: false,
    hideTooltips: true,
    barPosition: 'top',
    pinned: false
  };

  let bookmarksData = [];
  let otherBookmarksData = [];
  let barFolderId = '1';
  let hideTimer = null;
  let isMouseInsideBar = false;
  let isMouseInsideDropdown = false;
  let isDraggingBookmark = false;
  let wasJustDragged = false;
  let draggedItemData = null;
  let folderHoverExpandTimer = null;
  let currentHoveredFolderElem = null;
  let isBarVisible = false;
  let isPinned = false;
  let activeFolderItem = null;
  let isContextMenuOpen = false;
  let isModalOpen = false;
  let activeContextTarget = null;

  // Create Shadow Host
  const host = document.createElement('div');
  host.id = 'autobookmark-host';
  host.style.cssText = 'position: static !important; z-index: 2147483647 !important;';
  
  // Attach shadow root
  const shadow = host.attachShadow({ mode: 'open' });

  // Load stylesheet
  const linkRel = document.createElement('link');
  linkRel.rel = 'stylesheet';
  linkRel.href = chrome.runtime.getURL('content.css');
  shadow.appendChild(linkRel);

  // Core UI Elements
  const triggerZone = document.createElement('div');
  triggerZone.className = 'ab-trigger-zone';

  const barContainer = document.createElement('div');
  barContainer.className = 'ab-bar-container';

  const bar = document.createElement('div');
  bar.className = 'ab-bar';

  // Left action buttons: Sinary Brand, Pin, Divider
  const leftActions = document.createElement('div');
  leftActions.style.cssText = 'display: flex; align-items: center; gap: 2px; flex-shrink: 0;';

  const sinaryLogoBtn = document.createElement('a');
  sinaryLogoBtn.className = 'ab-sinary-brand-btn';
  sinaryLogoBtn.href = 'https://sinary.org';
  sinaryLogoBtn.target = '_blank';
  sinaryLogoBtn.title = 'SINARY - Your All-in-One Digital Platform (sinary.org)';
  sinaryLogoBtn.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/icon48.png')}" class="ab-sinary-icon" alt="SINARY" />
  `;

  const pinBtn = document.createElement('button');
  pinBtn.className = 'ab-action-btn';
  pinBtn.title = 'Pin bookmark bar (Alt+B)';
  pinBtn.innerHTML = `
    <svg class="ab-icon-svg" viewBox="0 0 24 24">
      <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22L12 23L13 22V16H18V14L16 12Z"/>
    </svg>
  `;

  leftActions.appendChild(sinaryLogoBtn);
  leftActions.appendChild(pinBtn);

  const divider1 = document.createElement('div');
  divider1.className = 'ab-divider';
  leftActions.appendChild(divider1);

  // Bookmarks scrollable track
  const itemsWrapper = document.createElement('div');
  itemsWrapper.className = 'ab-items-wrapper';

  const scrollLeftBtn = document.createElement('button');
  scrollLeftBtn.className = 'ab-scroll-btn ab-scroll-left';
  scrollLeftBtn.innerHTML = '‹';
  scrollLeftBtn.title = 'Scroll left';

  const scrollRightBtn = document.createElement('button');
  scrollRightBtn.className = 'ab-scroll-btn ab-scroll-right';
  scrollRightBtn.innerHTML = '›';
  scrollRightBtn.title = 'Scroll right';

  const itemsTrack = document.createElement('div');
  itemsTrack.className = 'ab-items-track';

  const dropIndicator = document.createElement('div');
  dropIndicator.className = 'ab-drop-indicator';
  itemsTrack.appendChild(dropIndicator);

  itemsWrapper.appendChild(scrollLeftBtn);
  itemsWrapper.appendChild(itemsTrack);
  itemsWrapper.appendChild(scrollRightBtn);

  // Right action buttons: Search input, Settings
  const rightActions = document.createElement('div');
  rightActions.className = 'ab-right-actions';

  const searchContainer = document.createElement('div');
  searchContainer.className = 'ab-search-container';

  const searchIconBtn = document.createElement('button');
  searchIconBtn.className = 'ab-search-icon-btn';
  searchIconBtn.title = 'Search bookmarks';
  searchIconBtn.innerHTML = `
    <svg class="ab-icon-svg" viewBox="0 0 24 24">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  `;

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'ab-search-input';
  searchInput.placeholder = 'Search bookmarks...';

  const searchResultsModal = document.createElement('div');
  searchResultsModal.className = 'ab-search-results-modal';

  searchResultsModal.addEventListener('mouseenter', () => {
    isMouseInsideDropdown = true;
    clearTimeout(hideTimer);
  });

  searchResultsModal.addEventListener('mouseleave', () => {
    isMouseInsideDropdown = false;
    scheduleHide();
  });

  searchContainer.appendChild(searchIconBtn);
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchResultsModal);
  rightActions.appendChild(searchContainer);

  // Assemble bar
  bar.appendChild(leftActions);
  bar.appendChild(itemsWrapper);
  bar.appendChild(rightActions);
  barContainer.appendChild(bar);

  // Dedicated Dropdown Portal attached to shadow root (never clipped by track overflow)
  const dropdownPortal = document.createElement('div');
  dropdownPortal.className = 'ab-dropdown-portal';

  dropdownPortal.addEventListener('mouseenter', () => {
    isMouseInsideDropdown = true;
    clearTimeout(hideTimer);
  });

  dropdownPortal.addEventListener('mouseleave', (e) => {
    if (e.relatedTarget && activeFolderItem && activeFolderItem.contains(e.relatedTarget)) {
      return;
    }
    isMouseInsideDropdown = false;
    scheduleHide();
  });

  // Custom Context Menu attached to shadow root
  const contextMenu = document.createElement('div');
  contextMenu.className = 'ab-context-menu';

  contextMenu.addEventListener('mouseenter', () => {
    isMouseInsideDropdown = true;
    clearTimeout(hideTimer);
  });

  contextMenu.addEventListener('mouseleave', () => {
    isMouseInsideDropdown = false;
    scheduleHide();
  });

  // Edit / Delete Modal Backdrop attached to shadow root
  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 'ab-modal-backdrop';
  const modalContainer = document.createElement('div');
  modalContainer.className = 'ab-modal';
  modalBackdrop.appendChild(modalContainer);

  modalBackdrop.addEventListener('mouseenter', () => {
    isMouseInsideDropdown = true;
    clearTimeout(hideTimer);
  });

  modalBackdrop.addEventListener('mouseleave', () => {
    isMouseInsideDropdown = false;
    scheduleHide();
  });

  shadow.appendChild(triggerZone);
  shadow.appendChild(barContainer);
  shadow.appendChild(dropdownPortal);
  shadow.appendChild(contextMenu);
  shadow.appendChild(modalBackdrop);

  // Append host to DOM safely
  function mountHost() {
    if (!document.body && !document.documentElement) {
      setTimeout(mountHost, 50);
      return;
    }
    const target = document.body || document.documentElement;
    if (!shadow.isConnected && !host.parentNode) {
      target.appendChild(host);
    }
  }
  mountHost();

  // Favicon fallback SVG
  const fallbackFaviconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

  // Robust Cross-Browser Favicon Resolver (Edge, Chrome, Firefox, Opera)
  function setupFavicon(img, url) {
    if (!url) {
      img.src = fallbackFaviconSvg;
      return;
    }

    let domain = '';
    try {
      const parsed = new URL(url);
      domain = parsed.hostname;
    } catch (e) {}

    const isChromeOnly = navigator.userAgent.includes('Chrome') &&
                         !navigator.userAgent.includes('Edg') &&
                         !navigator.userAgent.includes('OPR') &&
                         !navigator.userAgent.includes('Firefox');

    // Pure Chrome supports internal _favicon cache; Edge, Firefox & Opera use Google S2
    if (isChromeOnly && chrome.runtime?.id) {
      img.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    } else if (domain) {
      img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    } else {
      img.src = fallbackFaviconSvg;
      return;
    }

    img.onerror = () => {
      if (domain && !img.src.includes('google.com/s2/favicons')) {
        img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
      } else if (domain && !img.src.includes('/favicon.ico')) {
        img.src = `https://${domain}/favicon.ico`;
      } else {
        img.onerror = null;
        img.src = fallbackFaviconSvg;
      }
    };
  }

  // Clean URL helper: removes tracking bloat (utm_*, gclid, gad_source, etc.) and formats for sleek tooltips
  function getCleanDisplayUrl(rawUrl, maxLen = 75) {
    if (!rawUrl) return '';
    try {
      const u = new URL(rawUrl);
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'gbraid', 'wbraid', 'gad_source', 'gclsrc', 'fbclid', 'msclkid',
        'is_sa', 'android-min-version', 'ios-min-version', 'campaign_id', 'pt', 'mt', 'ct',
        'gad_campaignid', 'mc_cid', 'mc_eid', 'ref_src'
      ];
      trackingParams.forEach(p => u.searchParams.delete(p));
      Array.from(u.searchParams.keys()).forEach(key => {
        if (key.toLowerCase().startsWith('utm_')) u.searchParams.delete(key);
      });

      let display = u.origin + (u.pathname === '/' ? '' : u.pathname);
      const cleanSearch = u.search;
      if (cleanSearch && cleanSearch.length > 1) {
        if (cleanSearch.length > 32) {
          display += cleanSearch.substring(0, 29) + '...';
        } else {
          display += cleanSearch;
        }
      }

      if (display.length > maxLen) {
        return display.substring(0, maxLen - 3) + '...';
      }
      return display;
    } catch {
      if (rawUrl.length > maxLen) {
        return rawUrl.substring(0, maxLen - 3) + '...';
      }
      return rawUrl;
    }
  }

  // Format sleek, readable tooltip
  function formatBookmarkTooltip(title, url) {
    const cleanUrl = getCleanDisplayUrl(url);
    if (!title || title.trim() === 'Untitled' || title.trim() === '') {
      return cleanUrl;
    }
    return `${title.trim()}\n${cleanUrl}`;
  }

  // Check if bookmark URL preview should be displayed on hover
  function shouldShowBookmarkUrl() {
    if (settings.showBookmarkUrl !== undefined) {
      return !!settings.showBookmarkUrl;
    }
    return settings.hideTooltips === false;
  }

  // Show / Hide Functions
  function showBar() {
    if (!settings.enabled) return;
    clearTimeout(hideTimer);
    if (!isBarVisible) {
      isBarVisible = true;
      barContainer.classList.add('ab-visible');
      updateScrollArrows();
    }
  }

  function scheduleHide() {
    if (isPinned || !isBarVisible || isDraggingBookmark || isContextMenuOpen || isModalOpen) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isMouseInsideBar && !isMouseInsideDropdown && !isPinned && !isDraggingBookmark && !isContextMenuOpen && !isModalOpen) {
        closeAllDropdowns();
        closeSearch();
        isBarVisible = false;
        barContainer.classList.remove('ab-visible');
      }
    }, settings.hideDelay || 450);
  }

  function togglePin() {
    isPinned = !isPinned;
    if (isPinned) {
      pinBtn.classList.add('ab-active');
      showBar();
    } else {
      pinBtn.classList.remove('ab-active');
      scheduleHide();
    }
  }

  // Helper: Find bookmark item by ID in local cached tree
  function findBookmarkById(id) {
    function search(list) {
      for (const item of list) {
        if (item.id === id) return item;
        if (item.children) {
          const res = search(item.children);
          if (res) return res;
        }
      }
      return null;
    }
    return search([...bookmarksData, ...otherBookmarksData]);
  }

  // Helper: Prevent cyclic drops (folder into itself or its descendants)
  function isDescendantOrSelf(sourceId, targetId) {
    if (!sourceId || !targetId) return false;
    if (sourceId === targetId) return true;
    const sourceObj = findBookmarkById(sourceId);
    if (!sourceObj || !sourceObj.children) return false;

    function checkContains(folder, id) {
      if (!folder.children) return false;
      for (const child of folder.children) {
        if (child.id === id) return true;
        if (child.children && checkContains(child, id)) return true;
      }
      return false;
    }
    return checkContains(sourceObj, targetId);
  }

  // Helper: Execute bookmark move via Service Worker
  function moveBookmarkTo(id, parentId, index) {
    if (!id) return;
    const payload = { type: 'MOVE_BOOKMARK', id };
    if (parentId !== undefined && parentId !== null) payload.parentId = parentId;
    if (index !== undefined && index !== null) payload.index = index;

    try {
      chrome.runtime.sendMessage(payload, (res) => {
        if (chrome.runtime.lastError) {
          console.warn('Failed to move bookmark:', chrome.runtime.lastError);
        }
      });
    } catch (err) {
      console.warn('Move bookmark error:', err);
    }
  }

  // Helper: HTML escaping
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Root folders should not be deleted
  function isRootFolder(id) {
    if (!id) return true;
    const rootIds = ['0', '1', '2', 'root________', 'toolbar_____', 'unfiled_____', 'menu________'];
    if (rootIds.includes(String(id))) return true;
    if (barFolderId && String(id) === String(barFolderId)) return true;
    return false;
  }

  function closeContextMenu() {
    if (!isContextMenuOpen) return;
    isContextMenuOpen = false;
    contextMenu.classList.remove('ab-show');
    contextMenu.innerHTML = '';
    activeContextTarget = null;
    scheduleHide();
  }

  function closeModal() {
    if (!isModalOpen) return;
    isModalOpen = false;
    modalBackdrop.classList.remove('ab-show');
    modalContainer.innerHTML = '';
    scheduleHide();
  }

  function openEditModal(itemData) {
    if (!itemData || !itemData.id) return;
    isModalOpen = true;
    clearTimeout(hideTimer);
    showBar();

    const isFolder = !!itemData.isFolder;
    const titleText = isFolder ? 'Rename Folder' : 'Edit Bookmark';

    modalContainer.innerHTML = `
      <div class="ab-modal-header">
        <h3 class="ab-modal-title">
          <svg class="ab-context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>${titleText}</span>
        </h3>
        <button type="button" class="ab-modal-close-btn" title="Close (Esc)">✕</button>
      </div>
      <form class="ab-modal-body">
        <div class="ab-form-group">
          <label class="ab-form-label">Name</label>
          <input type="text" class="ab-form-input ab-edit-name-input" value="${escapeHtml(itemData.title || '')}" spellcheck="false" autocomplete="off" />
        </div>
        ${!isFolder ? `
        <div class="ab-form-group">
          <label class="ab-form-label">URL</label>
          <input type="text" class="ab-form-input ab-edit-url-input" value="${escapeHtml(itemData.url || '')}" spellcheck="false" autocomplete="off" />
        </div>
        ` : ''}
        <div class="ab-modal-actions">
          <button type="button" class="ab-btn ab-btn-secondary ab-modal-cancel">Cancel</button>
          <button type="submit" class="ab-btn ab-btn-primary ab-modal-save">Save</button>
        </div>
      </form>
    `;

    modalBackdrop.classList.add('ab-show');

    const form = modalContainer.querySelector('form');
    const nameInput = modalContainer.querySelector('.ab-edit-name-input');
    const urlInput = modalContainer.querySelector('.ab-edit-url-input');
    const closeBtn = modalContainer.querySelector('.ab-modal-close-btn');
    const cancelBtn = modalContainer.querySelector('.ab-modal-cancel');

    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = nameInput.value.trim();
      const payload = { type: 'UPDATE_BOOKMARK', id: itemData.id, title: newName };

      if (!isFolder && urlInput) {
        let newUrl = urlInput.value.trim();
        if (newUrl) {
          if (!/^https?:\/\//i.test(newUrl) && !/^(chrome|edge|about|moz-extension|chrome-extension|javascript):\/\//i.test(newUrl)) {
            newUrl = 'https://' + newUrl;
          }
          payload.url = newUrl;
        }
      }

      chrome.runtime.sendMessage(payload, () => {});
      closeModal();
    });

    setTimeout(() => {
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
      }
    }, 50);
  }

  function openDeleteConfirmModal(itemData) {
    if (!itemData || !itemData.id) return;
    if (isRootFolder(itemData.id)) return;

    isModalOpen = true;
    clearTimeout(hideTimer);
    showBar();

    const isFolder = !!itemData.isFolder;
    const titleText = isFolder ? 'Delete Folder' : 'Delete Bookmark';
    const promptText = isFolder
      ? 'Are you sure you want to delete this folder and all bookmarks inside it?'
      : 'Are you sure you want to delete this bookmark?';

    modalContainer.innerHTML = `
      <div class="ab-modal-header">
        <h3 class="ab-modal-title" style="color: #f87171;">
          <svg class="ab-context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          <span>${titleText}</span>
        </h3>
        <button type="button" class="ab-modal-close-btn" title="Close (Esc)">✕</button>
      </div>
      <div class="ab-modal-body">
        <p class="ab-modal-prompt">${promptText}</p>
        <div class="ab-modal-item-preview">
          <span style="opacity:0.6;margin-right:4px;">${isFolder ? '📁' : '🔗'}</span>
          <span>${escapeHtml(itemData.title || (isFolder ? 'Folder' : 'Bookmark'))}</span>
        </div>
        <div class="ab-modal-actions">
          <button type="button" class="ab-btn ab-btn-secondary ab-modal-cancel">Cancel</button>
          <button type="button" class="ab-btn ab-btn-danger ab-modal-confirm-delete">Delete</button>
        </div>
      </div>
    `;

    modalBackdrop.classList.add('ab-show');

    const closeBtn = modalContainer.querySelector('.ab-modal-close-btn');
    const cancelBtn = modalContainer.querySelector('.ab-modal-cancel');
    const deleteBtn = modalContainer.querySelector('.ab-modal-confirm-delete');

    closeBtn.addEventListener('click', () => closeModal());
    cancelBtn.addEventListener('click', () => closeModal());

    deleteBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'DELETE_BOOKMARK',
        id: itemData.id,
        isFolder: !!itemData.isFolder
      }, () => {});
      closeModal();
    });

    setTimeout(() => {
      if (deleteBtn) deleteBtn.focus();
    }, 50);
  }

  function handleContextMenu(e, itemData) {
    if (!itemData || !itemData.id) return;
    e.preventDefault();
    e.stopPropagation();

    closeContextMenu();
    isContextMenuOpen = true;
    activeContextTarget = itemData;
    clearTimeout(hideTimer);
    showBar();

    const isFolder = !!itemData.isFolder;
    const canDelete = !isRootFolder(itemData.id);

    contextMenu.innerHTML = '';

    if (!isFolder && itemData.url) {
      const openTabItem = document.createElement('div');
      openTabItem.className = 'ab-context-item';
      openTabItem.innerHTML = `
        <svg class="ab-context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        <span>Open in New Tab</span>
      `;
      openTabItem.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeContextMenu();
        window.open(itemData.url, '_blank');
      });
      contextMenu.appendChild(openTabItem);
    }

    const editItem = document.createElement('div');
    editItem.className = 'ab-context-item';
    editItem.innerHTML = `
      <svg class="ab-context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <span>${isFolder ? 'Rename Folder...' : 'Edit Bookmark...'}</span>
    `;
    editItem.addEventListener('click', (ev) => {
      ev.stopPropagation();
      closeContextMenu();
      openEditModal(itemData);
    });
    contextMenu.appendChild(editItem);

    if (canDelete) {
      const sep = document.createElement('div');
      sep.className = 'ab-context-separator';
      contextMenu.appendChild(sep);

      const deleteItem = document.createElement('div');
      deleteItem.className = 'ab-context-item ab-danger';
      deleteItem.innerHTML = `
        <svg class="ab-context-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
        <span>${isFolder ? 'Delete Folder' : 'Delete Bookmark'}</span>
      `;
      deleteItem.addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeContextMenu();
        openDeleteConfirmModal(itemData);
      });
      contextMenu.appendChild(deleteItem);
    }

    contextMenu.classList.add('ab-show');

    // Clamp coordinates so menu stays inside viewport
    const menuWidth = 185;
    const menuHeight = isFolder ? 80 : 120;
    const posX = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const posY = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    contextMenu.style.left = `${Math.max(8, posX)}px`;
    contextMenu.style.top = `${Math.max(8, posY)}px`;
  }

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeModal();
    }
  });

  window.addEventListener('click', (e) => {
    if (isContextMenuOpen) {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(contextMenu)) {
        closeContextMenu();
      }
    }
  }, true);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isModalOpen) {
        closeModal();
        e.stopPropagation();
      } else if (isContextMenuOpen) {
        closeContextMenu();
        e.stopPropagation();
      }
    }
  }, true);

  // Helper: Find vertical drop target position within a dropdown or submenu scroll container
  function getDropPositionInContainer(container, clientY) {
    const items = Array.from(container.querySelectorAll('.ab-dropdown-item:not(.ab-dragging)'));
    if (items.length === 0) {
      return { targetItem: null, insertBefore: true, targetIndex: 0 };
    }

    for (let i = 0; i < items.length; i++) {
      const itemEl = items[i];
      const rect = itemEl.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) {
        return { targetItem: itemEl, insertBefore: true, targetIndex: i };
      }
    }

    const last = items[items.length - 1];
    return { targetItem: last, insertBefore: false, targetIndex: items.length };
  }

  // Dropdown & Submenu Handling via Portal
  let openSubmenus = [];

  function closeSubmenusFromLevel(level) {
    for (let i = openSubmenus.length - 1; i >= 0; i--) {
      const item = openSubmenus[i];
      if (item.level >= level) {
        if (item.closeTimer) clearTimeout(item.closeTimer);
        if (item.folderElem) {
          item.folderElem.classList.remove('ab-submenu-active');
          const parent = item.folderElem.closest('.ab-dropdown-portal, .ab-submenu');
          if (parent) parent.classList.remove('ab-has-submenu-right', 'ab-has-submenu-left');
        }
        if (item.submenuElem && item.submenuElem.parentNode) {
          item.submenuElem.parentNode.removeChild(item.submenuElem);
        }
        openSubmenus.splice(i, 1);
      }
    }
    if (openSubmenus.length === 0) {
      dropdownPortal.classList.remove('ab-has-submenu-right', 'ab-has-submenu-left');
    }
  }

  function closeAllSubmenus() {
    closeSubmenusFromLevel(1);
  }

  function closeAllDropdowns() {
    closeContextMenu();
    closeAllSubmenus();
    dropdownPortal.classList.remove('ab-has-submenu-right', 'ab-has-submenu-left');
    if (activeFolderItem) {
      activeFolderItem.classList.remove('ab-open');
      activeFolderItem = null;
    }
    dropdownPortal.classList.remove('ab-show');
    dropdownPortal.innerHTML = '';
    isMouseInsideDropdown = false;
  }

  function openFolderDropdown(folder, folderElement) {
    if (activeFolderItem === folderElement && dropdownPortal.classList.contains('ab-show')) {
      closeAllDropdowns();
      return;
    }

    closeAllSubmenus();

    if (activeFolderItem) {
      activeFolderItem.classList.remove('ab-open');
    }

    activeFolderItem = folderElement;
    folderElement.classList.add('ab-open');

    dropdownPortal.innerHTML = '';
    dropdownPortal.className = `ab-dropdown-portal ab-theme-${settings.theme || 'dark-glass'} ab-show`;

    if (settings.barPosition === 'bottom') {
      dropdownPortal.classList.add('ab-portal-bottom');
    } else {
      dropdownPortal.classList.remove('ab-portal-bottom');
    }

    // Seamless connecting concave fillet wings
    const wingLeft = document.createElement('div');
    wingLeft.className = 'ab-portal-wing ab-wing-left';
    const wingRight = document.createElement('div');
    wingRight.className = 'ab-portal-wing ab-wing-right';
    dropdownPortal.appendChild(wingLeft);
    dropdownPortal.appendChild(wingRight);

    // Scrollable container for bookmark items
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'ab-portal-scroll';
    scrollContainer.addEventListener('scroll', () => closeAllSubmenus(), { passive: true });
    dropdownPortal.appendChild(scrollContainer);

    const dropdownDropIndicator = document.createElement('div');
    dropdownDropIndicator.className = 'ab-dropdown-drop-indicator';
    scrollContainer.appendChild(dropdownDropIndicator);

    if (!folder.children || folder.children.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'ab-empty-msg';
      emptyMsg.textContent = 'Folder is empty';
      scrollContainer.appendChild(emptyMsg);
    } else {
      folder.children.forEach(child => {
        const childNode = createDropdownNode(child, folder, 1);
        if (childNode) scrollContainer.appendChild(childNode);
      });
    }

    // Drop target handlers for items inside folder dropdown
    scrollContainer.addEventListener('dragover', (e) => {
      if (!isDraggingBookmark || !draggedItemData) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearTimeout(hideTimer);
      isMouseInsideDropdown = true;

      // Check if hovering over a subfolder
      const subfolderTarget = e.target.closest('.ab-dropdown-parent');
      if (subfolderTarget && !subfolderTarget.classList.contains('ab-dragging')) {
        const rect = subfolderTarget.getBoundingClientRect();
        const relativeY = (e.clientY - rect.top) / rect.height;
        if (relativeY > 0.25 && relativeY < 0.75) {
          dropdownDropIndicator.classList.remove('ab-show');
          const subfolderId = subfolderTarget.dataset.bookmarkId;
          const subfolderObj = findBookmarkById(subfolderId);
          if (subfolderId && !isDescendantOrSelf(draggedItemData.id, subfolderId)) {
            setFolderDragHighlight(subfolderTarget, subfolderObj);
          }
          return;
        }
      }

      clearFolderDragHighlights();

      // Position drop indicator between items
      const items = Array.from(scrollContainer.querySelectorAll('.ab-dropdown-item:not(.ab-dragging)'));
      if (items.length === 0) return;

      const { targetItem, insertBefore } = getDropPositionInContainer(scrollContainer, e.clientY);
      if (targetItem) {
        const topPos = insertBefore 
          ? targetItem.offsetTop - 1 
          : targetItem.offsetTop + targetItem.offsetHeight + 1;
        dropdownDropIndicator.style.top = `${topPos}px`;
        dropdownDropIndicator.classList.add('ab-show');
      }
    });

    scrollContainer.addEventListener('dragleave', (e) => {
      if (!scrollContainer.contains(e.relatedTarget)) {
        dropdownDropIndicator.classList.remove('ab-show');
        clearFolderDragHighlights();
      }
    });

    scrollContainer.addEventListener('drop', (e) => {
      if (!isDraggingBookmark || !draggedItemData) return;
      e.preventDefault();
      dropdownDropIndicator.classList.remove('ab-show');
      clearFolderDragHighlights();

      // Check if dropped directly on a subfolder item
      const subfolderTarget = e.target.closest('.ab-dropdown-parent');
      if (subfolderTarget && !subfolderTarget.classList.contains('ab-dragging')) {
        const targetRect = subfolderTarget.getBoundingClientRect();
        const relativeY = (e.clientY - targetRect.top) / targetRect.height;
        if (relativeY > 0.25 && relativeY < 0.75) {
          const targetFolderId = subfolderTarget.dataset.bookmarkId;
          if (targetFolderId && !isDescendantOrSelf(draggedItemData.id, targetFolderId)) {
            moveBookmarkTo(draggedItemData.id, targetFolderId, null);
            return;
          }
        }
      }

      // Safety guard: cannot drop parent folder into itself
      if (isDescendantOrSelf(draggedItemData.id, folder.id)) {
        return;
      }

      // Dropped between items in this folder
      const { targetItem, insertBefore, targetIndex } = getDropPositionInContainer(scrollContainer, e.clientY);
      let finalIndex = targetIndex;
      if (targetItem) {
        const targetId = targetItem.dataset.bookmarkId;
        const targetObj = (folder.children || []).find(b => b.id === targetId);
        if (targetObj) {
          finalIndex = insertBefore ? targetObj.index : targetObj.index + 1;
        } else if (!insertBefore) {
          finalIndex = (folder.children || []).length;
        }
      } else {
        finalIndex = (folder.children || []).length;
      }

      if (folder.children && finalIndex > folder.children.length) {
        finalIndex = folder.children.length;
      }

      moveBookmarkTo(draggedItemData.id, folder.id, finalIndex);
    });

    // Position portal flush with the bar (0px gap for seamless connection)
    const rect = folderElement.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const isBottom = settings.barPosition === 'bottom';

    if (isBottom) {
      dropdownPortal.style.top = 'auto';
      dropdownPortal.style.bottom = `${window.innerHeight - barRect.top}px`;
    } else {
      dropdownPortal.style.top = `${barRect.bottom}px`;
      dropdownPortal.style.bottom = 'auto';
    }

    // Clamp left so dropdown and wings stay fully on screen
    const maxLeft = Math.max(16, window.innerWidth - 356);
    const clampedLeft = Math.max(16, Math.min(rect.left, maxLeft));
    dropdownPortal.style.left = `${clampedLeft}px`;

    clearTimeout(hideTimer);
    isMouseInsideDropdown = true;
    showBar();
  }

  // Create Bookmark Chip Element
  function createBookmarkElement(item) {
    const a = document.createElement('a');
    a.className = 'ab-item ab-bookmark';
    a.href = item.url || '#';
    a.draggable = true;
    a.dataset.bookmarkId = item.id;
    a.dataset.parentId = item.parentId || barFolderId;

    if (shouldShowBookmarkUrl()) {
      a.title = formatBookmarkTooltip(item.title, item.url);
    }

    if (settings.showFavicons && item.url) {
      const img = document.createElement('img');
      img.className = 'ab-favicon';
      setupFavicon(img, item.url);
      a.appendChild(img);
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ab-title';
    titleSpan.textContent = item.title || 'Untitled';
    a.appendChild(titleSpan);

    a.addEventListener('dragstart', (e) => {
      isDraggingBookmark = true;
      draggedItemData = {
        id: item.id,
        parentId: item.parentId || barFolderId,
        index: item.index,
        isFolder: false,
        title: item.title || ''
      };
      a.classList.add('ab-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.title || item.url || '');
      e.dataTransfer.setData('application/x-autobookmark-id', item.id);
      clearTimeout(hideTimer);
      showBar();
    });

    a.addEventListener('dragend', () => {
      isDraggingBookmark = false;
      draggedItemData = null;
      wasJustDragged = true;
      setTimeout(() => { wasJustDragged = false; }, 150);
      a.classList.remove('ab-dragging');
      hideDropIndicator();
      clearFolderDragHighlights();
      scheduleHide();
    });

    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (wasJustDragged || !item.url) return;
      if (settings.openInNewTab || e.ctrlKey || e.metaKey || e.button === 1) {
        window.open(item.url, '_blank');
      } else {
        window.location.href = item.url;
      }
    });

    a.addEventListener('auxclick', (e) => {
      if (e.button === 1 && item.url && !wasJustDragged) {
        e.preventDefault();
        window.open(item.url, '_blank');
      }
    });

    a.addEventListener('contextmenu', (e) => {
      handleContextMenu(e, {
        id: item.id,
        title: item.title,
        url: item.url,
        isFolder: false,
        parentId: item.parentId || barFolderId
      });
    });

    return a;
  }

  // Open Submenu as Unclipped Portal attached to Shadow Root with Seamless Connection
  function openSubmenu(folderDiv, childFolder, level) {
    if (isDraggingBookmark) return;

    // If already open for this exact folder item, do nothing
    const existing = openSubmenus.find(s => s.level === level && s.folderElem === folderDiv);
    if (existing) return;

    // Close any sibling submenus at this level or deeper
    closeSubmenusFromLevel(level);

    folderDiv.classList.add('ab-submenu-active');

    const parentContainer = folderDiv.closest('.ab-dropdown-portal, .ab-submenu');
    const parentRect = parentContainer ? parentContainer.getBoundingClientRect() : folderDiv.getBoundingClientRect();
    const folderRect = folderDiv.getBoundingClientRect();

    const submenu = document.createElement('div');
    submenu.className = `ab-submenu ab-theme-${settings.theme || 'dark-glass'} ab-show`;
    submenu.dataset.level = String(level);

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'ab-submenu-scroll';
    submenu.appendChild(scrollContainer);

    const subDropIndicator = document.createElement('div');
    subDropIndicator.className = 'ab-dropdown-drop-indicator';
    scrollContainer.appendChild(subDropIndicator);

    if (!childFolder.children || childFolder.children.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ab-empty-msg';
      empty.textContent = 'Empty folder';
      scrollContainer.appendChild(empty);
    } else {
      childFolder.children.forEach(subChild => {
        const subNode = createDropdownNode(subChild, childFolder, level + 1);
        if (subNode) scrollContainer.appendChild(subNode);
      });
    }

    // Attach unclipped directly to shadow root
    shadow.appendChild(submenu);

    // Compute fixed screen coordinates flush with parent container border (0px gap)
    const submenuWidth = 220;
    const fitsRight = (parentRect.right + submenuWidth <= window.innerWidth);

    if (fitsRight) {
      submenu.style.left = `${Math.round(parentRect.right - 1)}px`;
      submenu.style.right = 'auto';
      submenu.classList.add('ab-flyout-right');
      submenu.classList.remove('ab-flyout-left');
      if (parentContainer) {
        parentContainer.classList.add('ab-has-submenu-right');
        parentContainer.classList.remove('ab-has-submenu-left');
      }
    } else {
      submenu.style.left = 'auto';
      submenu.style.right = `${Math.max(8, Math.round(window.innerWidth - parentRect.left + 1))}px`;
      submenu.classList.add('ab-flyout-left');
      submenu.classList.remove('ab-flyout-right');
      if (parentContainer) {
        parentContainer.classList.add('ab-has-submenu-left');
        parentContainer.classList.remove('ab-has-submenu-right');
      }
    }

    const subHeight = submenu.offsetHeight || 180;
    let topPos = folderRect.top - 6;
    if (topPos + subHeight > window.innerHeight - 10) {
      topPos = Math.max(10, window.innerHeight - subHeight - 10);
    }
    if (topPos < 10) {
      topPos = 10;
    }
    submenu.style.top = `${Math.max(10, Math.round(topPos))}px`;

    // Seamless Connecting Top Concave Fillet Wing
    if (fitsRight) {
      if (topPos > parentRect.top + 6) {
        const wingTop = document.createElement('div');
        wingTop.className = 'ab-submenu-wing ab-submenu-wing-top-right';
        submenu.appendChild(wingTop);
      }
    } else {
      if (topPos > parentRect.top + 6) {
        const wingTop = document.createElement('div');
        wingTop.className = 'ab-submenu-wing ab-submenu-wing-top-left';
        submenu.appendChild(wingTop);
      }
    }

    const record = { level, folderElem: folderDiv, submenuElem: submenu, closeTimer: null };
    openSubmenus.push(record);

    scrollContainer.addEventListener('scroll', () => closeSubmenusFromLevel(level + 1), { passive: true });

    submenu.addEventListener('mouseenter', () => {
      isMouseInsideDropdown = true;
      clearTimeout(hideTimer);
      if (record.closeTimer) {
        clearTimeout(record.closeTimer);
        record.closeTimer = null;
      }
    });

    submenu.addEventListener('mouseleave', (e) => {
      const childRecord = openSubmenus.find(s => s.level === level + 1);
      if (childRecord && childRecord.submenuElem.contains(e.relatedTarget)) {
        return;
      }
      if (folderDiv.contains(e.relatedTarget)) {
        return;
      }
      record.closeTimer = setTimeout(() => {
        closeSubmenusFromLevel(level);
      }, 220);
    });

    // Drop target handlers inside submenu
    scrollContainer.addEventListener('dragover', (e) => {
      if (!isDraggingBookmark || !draggedItemData) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      clearTimeout(hideTimer);
      isMouseInsideDropdown = true;

      const subfolderTarget = e.target.closest('.ab-dropdown-parent');
      if (subfolderTarget && !subfolderTarget.classList.contains('ab-dragging')) {
        const targetRect = subfolderTarget.getBoundingClientRect();
        const relativeY = (e.clientY - targetRect.top) / targetRect.height;
        if (relativeY > 0.25 && relativeY < 0.75) {
          subDropIndicator.classList.remove('ab-show');
          const subId = subfolderTarget.dataset.bookmarkId;
          const subObj = findBookmarkById(subId);
          if (subId && !isDescendantOrSelf(draggedItemData.id, subId)) {
            setFolderDragHighlight(subfolderTarget, subObj);
          }
          return;
        }
      }

      clearFolderDragHighlights();

      const items = Array.from(scrollContainer.querySelectorAll('.ab-dropdown-item:not(.ab-dragging)'));
      if (items.length === 0) return;

      const { targetItem, insertBefore } = getDropPositionInContainer(scrollContainer, e.clientY);
      if (targetItem) {
        const topIndicatorPos = insertBefore 
          ? targetItem.offsetTop - 1 
          : targetItem.offsetTop + targetItem.offsetHeight + 1;
        subDropIndicator.style.top = `${topIndicatorPos}px`;
        subDropIndicator.classList.add('ab-show');
      }
    });

    scrollContainer.addEventListener('dragleave', (e) => {
      if (!scrollContainer.contains(e.relatedTarget)) {
        subDropIndicator.classList.remove('ab-show');
        clearFolderDragHighlights();
      }
    });

    scrollContainer.addEventListener('drop', (e) => {
      if (!isDraggingBookmark || !draggedItemData) return;
      e.preventDefault();
      subDropIndicator.classList.remove('ab-show');
      clearFolderDragHighlights();

      const subfolderTarget = e.target.closest('.ab-dropdown-parent');
      if (subfolderTarget && !subfolderTarget.classList.contains('ab-dragging')) {
        const targetRect = subfolderTarget.getBoundingClientRect();
        const relativeY = (e.clientY - targetRect.top) / targetRect.height;
        if (relativeY > 0.25 && relativeY < 0.75) {
          const targetFolderId = subfolderTarget.dataset.bookmarkId;
          if (targetFolderId && !isDescendantOrSelf(draggedItemData.id, targetFolderId)) {
            moveBookmarkTo(draggedItemData.id, targetFolderId, null);
            return;
          }
        }
      }

      if (isDescendantOrSelf(draggedItemData.id, childFolder.id)) {
        return;
      }

      const { targetItem, insertBefore, targetIndex } = getDropPositionInContainer(scrollContainer, e.clientY);
      let finalIndex = targetIndex;
      if (targetItem) {
        const targetId = targetItem.dataset.bookmarkId;
        const targetObj = (childFolder.children || []).find(b => b.id === targetId);
        if (targetObj) {
          finalIndex = insertBefore ? targetObj.index : targetObj.index + 1;
        } else if (!insertBefore) {
          finalIndex = (childFolder.children || []).length;
        }
      } else {
        finalIndex = (childFolder.children || []).length;
      }

      if (childFolder.children && finalIndex > childFolder.children.length) {
        finalIndex = childFolder.children.length;
      }

      moveBookmarkTo(draggedItemData.id, childFolder.id, finalIndex);
    });
  }

  // Recursive Dropdown Item Creator
  function createDropdownNode(child, parentFolder, level = 1) {
    if (child.url) {
      const a = document.createElement('a');
      a.className = 'ab-dropdown-item';
      a.href = child.url;
      a.draggable = true;
      a.dataset.bookmarkId = child.id;
      a.dataset.parentId = child.parentId || (parentFolder ? parentFolder.id : barFolderId);

      if (shouldShowBookmarkUrl()) {
        a.title = formatBookmarkTooltip(child.title, child.url);
      }

      if (settings.showFavicons) {
        const img = document.createElement('img');
        img.className = 'ab-favicon';
        setupFavicon(img, child.url);
        a.appendChild(img);
      }

      const span = document.createElement('span');
      span.className = 'ab-title';
      span.textContent = child.title || 'Untitled';
      a.appendChild(span);

      a.addEventListener('mouseenter', () => {
        closeSubmenusFromLevel(level);
      });

      a.addEventListener('dragstart', (e) => {
        isDraggingBookmark = true;
        draggedItemData = {
          id: child.id,
          parentId: child.parentId || (parentFolder ? parentFolder.id : barFolderId),
          index: child.index,
          isFolder: false,
          title: child.title || ''
        };
        a.classList.add('ab-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', child.title || child.url || '');
        e.dataTransfer.setData('application/x-autobookmark-id', child.id);
        clearTimeout(hideTimer);
        showBar();
      });

      a.addEventListener('dragend', () => {
        isDraggingBookmark = false;
        draggedItemData = null;
        wasJustDragged = true;
        setTimeout(() => { wasJustDragged = false; }, 150);
        a.classList.remove('ab-dragging');
        hideDropIndicator();
        clearFolderDragHighlights();
        scheduleHide();
      });

      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (wasJustDragged || !child.url) return;
        closeAllDropdowns();
        if (settings.openInNewTab || e.ctrlKey || e.metaKey || e.button === 1) {
          window.open(child.url, '_blank');
        } else {
          window.location.href = child.url;
        }
      });

      a.addEventListener('auxclick', (e) => {
        if (e.button === 1 && child.url && !wasJustDragged) {
          e.preventDefault();
          closeAllDropdowns();
          window.open(child.url, '_blank');
        }
      });

      a.addEventListener('contextmenu', (e) => {
        handleContextMenu(e, {
          id: child.id,
          title: child.title,
          url: child.url,
          isFolder: false,
          parentId: child.parentId || (parentFolder ? parentFolder.id : barFolderId)
        });
      });

      return a;
    } else if (child.children) {
      // Subfolder
      const folderDiv = document.createElement('div');
      folderDiv.className = 'ab-dropdown-item ab-dropdown-parent';
      folderDiv.draggable = true;
      folderDiv.dataset.bookmarkId = child.id;
      folderDiv.dataset.parentId = child.parentId || (parentFolder ? parentFolder.id : barFolderId);

      folderDiv.addEventListener('contextmenu', (e) => {
        handleContextMenu(e, {
          id: child.id,
          title: child.title,
          isFolder: true,
          parentId: child.parentId || (parentFolder ? parentFolder.id : barFolderId)
        });
      });
      folderDiv.tabIndex = 0;
      folderDiv.setAttribute('role', 'button');
      folderDiv.setAttribute('aria-haspopup', 'true');

      const folderIcon = document.createElement('span');
      folderIcon.className = 'ab-folder-icon';
      folderIcon.innerHTML = `
        <svg class="ab-icon-svg" viewBox="0 0 24 24" style="fill: #fbbf24;">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
        </svg>
      `;
      folderDiv.appendChild(folderIcon);

      const span = document.createElement('span');
      span.className = 'ab-title';
      span.textContent = child.title || 'Folder';
      folderDiv.appendChild(span);

      const arrow = document.createElement('span');
      arrow.className = 'ab-submenu-arrow';
      arrow.textContent = '›';
      folderDiv.appendChild(arrow);

      let subOpenTimer = null;

      folderDiv.addEventListener('mouseenter', () => {
        if (isDraggingBookmark) return;
        const record = openSubmenus.find(s => s.level === level && s.folderElem === folderDiv);
        if (record && record.closeTimer) {
          clearTimeout(record.closeTimer);
          record.closeTimer = null;
        }

        const activeAtThisLevel = openSubmenus.find(s => s.level === level);
        if (activeAtThisLevel && activeAtThisLevel.folderElem !== folderDiv) {
          openSubmenu(folderDiv, child, level);
        } else if (!activeAtThisLevel) {
          subOpenTimer = setTimeout(() => {
            if (folderDiv.matches(':hover')) {
              openSubmenu(folderDiv, child, level);
            }
          }, 180);
        }
      });

      folderDiv.addEventListener('mouseleave', (e) => {
        clearTimeout(subOpenTimer);
        const record = openSubmenus.find(s => s.level === level && s.folderElem === folderDiv);
        if (record) {
          if (record.submenuElem.contains(e.relatedTarget)) {
            return;
          }
          record.closeTimer = setTimeout(() => {
            closeSubmenusFromLevel(level);
          }, 220);
        }
      });

      folderDiv.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (wasJustDragged) return;
        const record = openSubmenus.find(s => s.level === level && s.folderElem === folderDiv);
        if (record) {
          closeSubmenusFromLevel(level);
        } else {
          openSubmenu(folderDiv, child, level);
        }
      });

      folderDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          openSubmenu(folderDiv, child, level);
        } else if (e.key === 'Escape' || e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          closeSubmenusFromLevel(level);
        }
      });

      folderDiv.addEventListener('dragstart', (e) => {
        isDraggingBookmark = true;
        draggedItemData = {
          id: child.id,
          parentId: child.parentId || (parentFolder ? parentFolder.id : barFolderId),
          index: child.index,
          isFolder: true,
          title: child.title || ''
        };
        folderDiv.classList.add('ab-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', child.title || '');
        e.dataTransfer.setData('application/x-autobookmark-id', child.id);
        clearTimeout(hideTimer);
        showBar();
      });

      folderDiv.addEventListener('dragend', () => {
        isDraggingBookmark = false;
        draggedItemData = null;
        wasJustDragged = true;
        setTimeout(() => { wasJustDragged = false; }, 150);
        folderDiv.classList.remove('ab-dragging');
        hideDropIndicator();
        clearFolderDragHighlights();
        scheduleHide();
      });

      return folderDiv;
    }
    return null;
  }

  // Create Folder Element
  function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'ab-item ab-folder';
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-haspopup', 'true');
    div.draggable = true;
    div.dataset.bookmarkId = folder.id;
    div.dataset.parentId = folder.parentId || barFolderId;
    div.title = `${folder.title || 'Folder'} (${(folder.children || []).length} items)\nClick to open`;

    const folderIcon = document.createElement('span');
    folderIcon.className = 'ab-folder-icon';
    folderIcon.innerHTML = `
      <svg class="ab-icon-svg" viewBox="0 0 24 24" style="fill: #fbbf24;">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
    `;
    div.appendChild(folderIcon);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ab-title';
    titleSpan.textContent = folder.title || 'Bookmarks';
    div.appendChild(titleSpan);

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'ab-folder-arrow';
    arrowSpan.textContent = '▼';
    div.appendChild(arrowSpan);

    let folderHoverTimer = null;

    div.addEventListener('dragstart', (e) => {
      isDraggingBookmark = true;
      draggedItemData = {
        id: folder.id,
        parentId: folder.parentId || barFolderId,
        index: folder.index,
        isFolder: true,
        title: folder.title || ''
      };
      div.classList.add('ab-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', folder.title || '');
      e.dataTransfer.setData('application/x-autobookmark-id', folder.id);
      clearTimeout(hideTimer);
      showBar();
    });

    div.addEventListener('dragend', () => {
      isDraggingBookmark = false;
      draggedItemData = null;
      wasJustDragged = true;
      setTimeout(() => { wasJustDragged = false; }, 150);
      div.classList.remove('ab-dragging');
      hideDropIndicator();
      clearFolderDragHighlights();
      scheduleHide();
    });

    // Click on folder chip: toggles the folder dropdown
    div.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (wasJustDragged) return;
      clearTimeout(folderHoverTimer);
      if (activeFolderItem === div) {
        closeAllDropdowns();
      } else {
        openFolderDropdown(folder, div);
      }
    });

    // Hover over folder: if already browsing folders, switch instantly; otherwise dwell
    div.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      if (isDraggingBookmark) return; // handled by dragover
      if (activeFolderItem && activeFolderItem !== div) {
        openFolderDropdown(folder, div);
      } else if (!activeFolderItem) {
        folderHoverTimer = setTimeout(() => {
          if (div.matches(':hover')) {
            openFolderDropdown(folder, div);
          }
        }, 220);
      }
    });

    div.addEventListener('mouseleave', () => {
      clearTimeout(folderHoverTimer);
      scheduleHide();
    });

    div.addEventListener('contextmenu', (e) => {
      handleContextMenu(e, {
        id: folder.id,
        title: folder.title,
        isFolder: true,
        parentId: folder.parentId || barFolderId
      });
    });

    // Keyboard support: Enter, Space, Escape
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (activeFolderItem === div) {
          closeAllDropdowns();
        } else {
          openFolderDropdown(folder, div);
        }
      } else if (e.key === 'Escape') {
        closeAllDropdowns();
      }
    });

    return div;
  }

  // Render All Bookmarks
  function renderBookmarks() {
    const previousOpenFolderId = (activeFolderItem && dropdownPortal.classList.contains('ab-show'))
      ? activeFolderItem.dataset.bookmarkId
      : null;
    const previousSubmenuIds = openSubmenus.map(s => s.folderElem ? s.folderElem.dataset.bookmarkId : null).filter(Boolean);

    closeAllDropdowns();
    itemsTrack.innerHTML = '';
    itemsTrack.appendChild(dropIndicator);

    const allItems = [...bookmarksData, ...otherBookmarksData];

    if (allItems.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.className = 'ab-empty-msg';
      emptySpan.textContent = 'No bookmarks on bar';
      itemsTrack.appendChild(emptySpan);
      return;
    }

    allItems.forEach(item => {
      if (item.url) {
        itemsTrack.appendChild(createBookmarkElement(item));
      } else if (item.children) {
        itemsTrack.appendChild(createFolderElement(item));
      }
    });

    if (previousOpenFolderId) {
      const newFolderEl = itemsTrack.querySelector(`.ab-item.ab-folder[data-bookmark-id="${previousOpenFolderId}"]`);
      const newFolderObj = findBookmarkById(previousOpenFolderId);
      if (newFolderEl && newFolderObj) {
        openFolderDropdown(newFolderObj, newFolderEl);

        // Restore open submenus if any
        if (previousSubmenuIds.length > 0) {
          previousSubmenuIds.forEach((subId, idx) => {
            const subElem = shadowRoot.querySelector(`.ab-dropdown-parent[data-bookmark-id="${subId}"]`);
            const subObj = findBookmarkById(subId);
            if (subElem && subObj) {
              openSubmenu(subObj, subElem, idx + 1);
            }
          });
        }
      }
    }

    setTimeout(updateScrollArrows, 50);
  }

  // Overflow Scroll Control
  function updateScrollArrows() {
    const canScrollLeft = itemsTrack.scrollLeft > 5;
    const canScrollRight = itemsTrack.scrollWidth - itemsTrack.clientWidth - itemsTrack.scrollLeft > 5;

    if (canScrollLeft) scrollLeftBtn.classList.add('ab-show');
    else scrollLeftBtn.classList.remove('ab-show');

    if (canScrollRight) scrollRightBtn.classList.add('ab-show');
    else scrollRightBtn.classList.remove('ab-show');
  }

  // Drag & Drop Track Handlers
  function hideDropIndicator() {
    dropIndicator.classList.remove('ab-show');
  }

  function clearFolderDragHighlights() {
    if (currentHoveredFolderElem) {
      currentHoveredFolderElem.classList.remove('ab-drag-target-folder');
      currentHoveredFolderElem = null;
    }
    clearTimeout(folderHoverExpandTimer);
  }

  function setFolderDragHighlight(folderElem, folderObj) {
    if (currentHoveredFolderElem === folderElem) return;
    clearFolderDragHighlights();
    currentHoveredFolderElem = folderElem;
    folderElem.classList.add('ab-drag-target-folder');

    clearTimeout(folderHoverExpandTimer);
    folderHoverExpandTimer = setTimeout(() => {
      if (currentHoveredFolderElem === folderElem && isDraggingBookmark) {
        if (folderObj && folderObj.children) {
          openFolderDropdown(folderObj, folderElem);
        }
      }
    }, 450);
  }

  function getDropPositionOnTrack(clientX) {
    const items = Array.from(itemsTrack.querySelectorAll('.ab-item:not(.ab-dragging)'));
    if (items.length === 0) {
      return { targetItem: null, insertBefore: true, targetIndex: 0 };
    }

    for (let i = 0; i < items.length; i++) {
      const itemEl = items[i];
      const rect = itemEl.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (clientX < mid) {
        return { targetItem: itemEl, insertBefore: true, targetIndex: i };
      }
    }

    const last = items[items.length - 1];
    return { targetItem: last, insertBefore: false, targetIndex: items.length };
  }

  function handleTrackAutoScroll(clientX) {
    const trackRect = itemsTrack.getBoundingClientRect();
    const edgeDistance = 45;
    if (clientX < trackRect.left + edgeDistance) {
      itemsTrack.scrollLeft -= 8;
    } else if (clientX > trackRect.right - edgeDistance) {
      itemsTrack.scrollLeft += 8;
    }
  }

  itemsTrack.addEventListener('dragover', (e) => {
    if (!isDraggingBookmark || !draggedItemData) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearTimeout(hideTimer);

    handleTrackAutoScroll(e.clientX);

    // Check if hovering directly over a folder chip on the track
    const folderTarget = e.target.closest('.ab-item.ab-folder');
    if (folderTarget && !folderTarget.classList.contains('ab-dragging')) {
      const rect = folderTarget.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      // If hovering near the middle 60% of folder chip (0.2 to 0.8), treat as drop-into-folder
      if (relativeX > 0.2 && relativeX < 0.8) {
        hideDropIndicator();
        const folderId = folderTarget.dataset.bookmarkId;
        const folderObj = findBookmarkById(folderId);
        if (folderId && !isDescendantOrSelf(draggedItemData.id, folderId)) {
          setFolderDragHighlight(folderTarget, folderObj);
        }
        return;
      }
    }

    // Otherwise, position the drop indicator between items
    clearFolderDragHighlights();
    const { targetItem, insertBefore } = getDropPositionOnTrack(e.clientX);
    if (targetItem) {
      const leftPos = insertBefore 
        ? targetItem.offsetLeft - 3 
        : targetItem.offsetLeft + targetItem.offsetWidth + 1;
      dropIndicator.style.left = `${leftPos}px`;
      dropIndicator.classList.add('ab-show');
    }
  });

  itemsTrack.addEventListener('dragleave', (e) => {
    if (!itemsTrack.contains(e.relatedTarget)) {
      hideDropIndicator();
      clearFolderDragHighlights();
    }
  });

  itemsTrack.addEventListener('drop', (e) => {
    if (!isDraggingBookmark || !draggedItemData) return;
    e.preventDefault();
    hideDropIndicator();
    clearFolderDragHighlights();

    // Check if dropped directly onto a folder chip
    const folderTarget = e.target.closest('.ab-item.ab-folder');
    if (folderTarget && !folderTarget.classList.contains('ab-dragging')) {
      const rect = folderTarget.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      if (relativeX > 0.2 && relativeX < 0.8) {
        const targetFolderId = folderTarget.dataset.bookmarkId;
        if (targetFolderId && !isDescendantOrSelf(draggedItemData.id, targetFolderId)) {
          moveBookmarkTo(draggedItemData.id, targetFolderId, null);
        }
        return;
      }
    }

    // Dropped between items on the main bar
    const { targetItem, insertBefore, targetIndex } = getDropPositionOnTrack(e.clientX);
    let newIndex = targetIndex;
    if (targetItem) {
      const targetId = targetItem.dataset.bookmarkId;
      const targetObj = findBookmarkById(targetId);
      if (targetObj) {
        if (targetObj.parentId === barFolderId) {
          newIndex = insertBefore ? targetObj.index : targetObj.index + 1;
        } else {
          newIndex = bookmarksData.length;
        }
      }
    }

    moveBookmarkTo(draggedItemData.id, barFolderId, newIndex);
  });

  itemsTrack.addEventListener('scroll', () => {
    updateScrollArrows();
    if (activeFolderItem && dropdownPortal.classList.contains('ab-show')) {
      const rect = activeFolderItem.getBoundingClientRect();
      const trackRect = itemsTrack.getBoundingClientRect();
      if (rect.right < trackRect.left || rect.left > trackRect.right) {
        closeAllDropdowns();
      } else {
        const maxLeft = Math.max(8, window.innerWidth - 340);
        const clampedLeft = Math.max(8, Math.min(rect.left, maxLeft));
        dropdownPortal.style.left = `${clampedLeft}px`;
      }
    }
  }, { passive: true });
  window.addEventListener('resize', () => {
    updateScrollArrows();
    if (activeFolderItem && dropdownPortal.classList.contains('ab-show')) {
      closeAllDropdowns();
    }
  }, { passive: true });

  // Click outside to close active folder dropdown
  document.addEventListener('click', (e) => {
    if (activeFolderItem) {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(host)) {
        closeAllDropdowns();
      }
    }
  }, true);

  scrollLeftBtn.addEventListener('click', () => {
    itemsTrack.scrollBy({ left: -220, behavior: 'smooth' });
  });
  scrollRightBtn.addEventListener('click', () => {
    itemsTrack.scrollBy({ left: 220, behavior: 'smooth' });
  });

  // Mouse wheel horizontal scrolling over track
  itemsTrack.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      itemsTrack.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Quick Search Functionality
  function openSearch() {
    searchContainer.classList.add('ab-search-open');
    searchInput.focus();
    clearTimeout(hideTimer);
  }

  function closeSearch() {
    searchContainer.classList.remove('ab-search-open');
    searchResultsModal.classList.remove('ab-show');
    searchResultsModal.innerHTML = '';
    searchInput.value = '';
    scheduleHide();
  }

  searchIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (searchContainer.classList.contains('ab-search-open')) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  searchInput.addEventListener('focus', () => {
    clearTimeout(hideTimer);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearch();
    }
  });

  document.addEventListener('click', (e) => {
    if (searchContainer.classList.contains('ab-search-open')) {
      const path = e.composedPath ? e.composedPath() : [];
      if (!path.includes(searchContainer)) {
        closeSearch();
      }
    }
  }, true);

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResultsModal.classList.remove('ab-show');
      searchResultsModal.innerHTML = '';
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: 'SEARCH_BOOKMARKS', query: q }, (res) => {
        if (chrome.runtime.lastError) return;

        searchResultsModal.innerHTML = '';

        // Seamless connecting concave fillet wings
        const wingLeft = document.createElement('div');
        wingLeft.className = 'ab-search-wing ab-wing-left';
        const wingRight = document.createElement('div');
        wingRight.className = 'ab-search-wing ab-wing-right';
        searchResultsModal.appendChild(wingLeft);
        searchResultsModal.appendChild(wingRight);

        // Scrollable container for search items
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'ab-search-scroll';
        searchResultsModal.appendChild(scrollContainer);

        if (!res || !res.results || res.results.length === 0) {
          const emptyMsg = document.createElement('div');
          emptyMsg.className = 'ab-empty-msg';
          emptyMsg.textContent = 'No bookmarks found';
          scrollContainer.appendChild(emptyMsg);
        } else {
          res.results.forEach(item => {
            const a = document.createElement('a');
            a.className = 'ab-dropdown-item';
            a.href = item.url;
            if (shouldShowBookmarkUrl()) {
              a.title = formatBookmarkTooltip(item.title, item.url);
            }

            const img = document.createElement('img');
            img.className = 'ab-favicon';
            setupFavicon(img, item.url);
            a.appendChild(img);

            const span = document.createElement('span');
            span.className = 'ab-title';
            span.textContent = item.title || item.url;
            a.appendChild(span);

            a.addEventListener('click', (e) => {
              e.preventDefault();
              if (settings.openInNewTab || e.ctrlKey || e.metaKey || e.button === 1) {
                window.open(item.url, '_blank');
              } else {
                window.location.href = item.url;
              }
              closeSearch();
            });

            a.addEventListener('auxclick', (e) => {
              if (e.button === 1 && item.url) {
                e.preventDefault();
                window.open(item.url, '_blank');
                closeSearch();
              }
            });

            a.addEventListener('contextmenu', (e) => {
              handleContextMenu(e, {
                id: item.id,
                title: item.title,
                url: item.url,
                isFolder: false,
                parentId: item.parentId
              });
            });

            scrollContainer.appendChild(a);
          });
        }

        searchResultsModal.classList.add('ab-show');
      });
    } catch (err) {}
  });

  // Pin Button listener
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin();
  });

  // Apply Settings
  function applySettings(newSettings) {
    settings = Object.assign({}, settings, newSettings);
    closeAllSubmenus();

    // Apply Theme
    bar.className = `ab-bar ab-theme-${settings.theme || 'dark-glass'}`;

    // Apply Position
    if (settings.barPosition === 'bottom') {
      barContainer.classList.add('ab-position-bottom');
      triggerZone.classList.add('ab-bottom');
      triggerZone.style.top = 'auto';
      triggerZone.style.bottom = '0';
    } else {
      barContainer.classList.remove('ab-position-bottom');
      triggerZone.classList.remove('ab-bottom');
      triggerZone.style.top = '0';
      triggerZone.style.bottom = 'auto';
    }

    // Trigger Height
    triggerZone.style.height = `${settings.triggerHeight || 8}px`;

    // Update active dropdown portal theme if open
    if (activeFolderItem && dropdownPortal.classList.contains('ab-show')) {
      dropdownPortal.className = `ab-dropdown-portal ab-theme-${settings.theme || 'dark-glass'} ab-show`;
      if (settings.barPosition === 'bottom') {
        dropdownPortal.classList.add('ab-portal-bottom');
      }
    }

    // Re-render bookmarks in case showFavicons changed
    renderBookmarks();
  }

  // Hover Events & Mouse Tracking
  triggerZone.addEventListener('mouseenter', () => {
    showBar();
  });

  barContainer.addEventListener('mouseenter', () => {
    isMouseInsideBar = true;
    showBar();
  });

  barContainer.addEventListener('mouseleave', () => {
    isMouseInsideBar = false;
    scheduleHide();
  });

  // Global mousemove detection for smooth trigger near edge
  window.addEventListener('mousemove', (e) => {
    if (!settings.enabled) return;
    const triggerPx = settings.triggerHeight || 8;
    const isAtTriggerEdge = (settings.barPosition === 'bottom')
      ? (window.innerHeight - e.clientY <= triggerPx)
      : (e.clientY <= triggerPx);

    if (isAtTriggerEdge) {
      showBar();
    } else if (isBarVisible && !isMouseInsideBar && !isMouseInsideDropdown && !isPinned && !isDraggingBookmark && !isContextMenuOpen && !isModalOpen) {
      // Check if mouse is beyond bar threshold (38px + buffer)
      const isPastBar = (settings.barPosition === 'bottom')
        ? (window.innerHeight - e.clientY > 50)
        : (e.clientY > 50);

      if (isPastBar) {
        scheduleHide();
      }
    }
  }, { passive: true });

  // Load Bookmarks & Settings initially
  function fetchBookmarks(retries = 2) {
    try {
      chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (res) => {
        if (chrome.runtime.lastError) {
          if (retries > 0) {
            setTimeout(() => fetchBookmarks(retries - 1), 300);
          }
          return;
        }
        if (res && res.success) {
          bookmarksData = res.bookmarks || [];
          otherBookmarksData = res.otherBookmarks || [];
          if (res.barFolderId) barFolderId = res.barFolderId;
          renderBookmarks();
        }
      });
    } catch (err) {}
  }

  function loadInitialData() {
    try {
      chrome.storage.sync.get('settings', (data) => {
        if (!chrome.runtime.lastError && data && data.settings) {
          applySettings(data.settings);
        }
      });
    } catch (err) {}

    fetchBookmarks();
  }
  loadInitialData();

  // Listen directly for storage changes across tabs & popup
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.settings) {
        applySettings(changes.settings.newValue);
      }
    });
  } catch (err) {}

  // Listen for broadcast messages from background & popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      applySettings(message.settings);
    } else if (message.type === 'BOOKMARKS_UPDATED') {
      fetchBookmarks();
    } else if (message.type === 'TOGGLE_PIN') {
      togglePin();
    }
  });

})();
