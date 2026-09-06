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
    barPosition: 'top',
    pinned: false
  };

  let bookmarksData = [];
  let otherBookmarksData = [];
  let hideTimer = null;
  let isMouseInsideBar = false;
  let isMouseInsideDropdown = false;
  let isBarVisible = false;
  let isPinned = false;
  let activeFolderItem = null;

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

  searchContainer.appendChild(searchIconBtn);
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchResultsModal);
  rightActions.appendChild(searchContainer);

  // Assemble bar
  bar.appendChild(leftActions);
  bar.appendChild(itemsWrapper);
  bar.appendChild(rightActions);
  barContainer.appendChild(bar);

  shadow.appendChild(triggerZone);
  shadow.appendChild(barContainer);

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

  // Helper: Favicon URL
  function getFaviconUrl(url) {
    if (!url) return '';
    try {
      // Manifest V3 Favicon API
      const extId = chrome.runtime.id;
      return `chrome-extension://${extId}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
    } catch {
      return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=32`;
    }
  }

  // Favicon fallback SVG
  const fallbackFaviconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2394a3b8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`;

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
    if (isPinned || !isBarVisible) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isMouseInsideBar && !isMouseInsideDropdown && !isPinned) {
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

  // Dropdown Handling
  function closeAllDropdowns() {
    shadow.querySelectorAll('.ab-item.ab-open').forEach(el => {
      el.classList.remove('ab-open');
    });
    activeFolderItem = null;
  }

  // Create Bookmark Chip Element
  function createBookmarkElement(item) {
    const a = document.createElement('a');
    a.className = 'ab-item ab-bookmark';
    a.href = item.url || '#';
    a.title = `${item.title || 'Untitled'}\n${item.url || ''}`;

    if (settings.showFavicons && item.url) {
      const img = document.createElement('img');
      img.className = 'ab-favicon';
      img.src = getFaviconUrl(item.url);
      img.onerror = () => {
        img.onerror = null;
        img.src = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(item.url)}&sz=32`;
        img.onerror = () => {
          img.src = fallbackFaviconSvg;
        };
      };
      a.appendChild(img);
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ab-title';
    titleSpan.textContent = item.title || 'Untitled';
    a.appendChild(titleSpan);

    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (!item.url) return;
      if (settings.openInNewTab || e.ctrlKey || e.metaKey || e.button === 1) {
        window.open(item.url, '_blank');
      } else {
        window.location.href = item.url;
      }
    });

    a.addEventListener('auxclick', (e) => {
      if (e.button === 1 && item.url) {
        e.preventDefault();
        window.open(item.url, '_blank');
      }
    });

    return a;
  }

  // Recursive Dropdown Item Creator
  function createDropdownNode(child) {
    if (child.url) {
      const a = document.createElement('a');
      a.className = 'ab-dropdown-item';
      a.href = child.url;
      a.title = `${child.title}\n${child.url}`;

      if (settings.showFavicons) {
        const img = document.createElement('img');
        img.className = 'ab-favicon';
        img.src = getFaviconUrl(child.url);
        img.onerror = () => {
          img.src = fallbackFaviconSvg;
        };
        a.appendChild(img);
      }

      const span = document.createElement('span');
      span.className = 'ab-title';
      span.textContent = child.title || 'Untitled';
      a.appendChild(span);

      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (settings.openInNewTab || e.ctrlKey || e.metaKey || e.button === 1) {
          window.open(child.url, '_blank');
        } else {
          window.location.href = child.url;
        }
      });
      return a;
    } else if (child.children) {
      // Subfolder
      const folderDiv = document.createElement('div');
      folderDiv.className = 'ab-dropdown-item ab-dropdown-parent';

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
      arrow.textContent = '›';
      arrow.style.marginLeft = 'auto';
      arrow.style.opacity = '0.7';
      folderDiv.appendChild(arrow);

      // Submenu
      const submenu = document.createElement('div');
      submenu.className = 'ab-submenu';
      if (child.children.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ab-empty-msg';
        empty.textContent = 'Empty folder';
        submenu.appendChild(empty);
      } else {
        child.children.forEach(subChild => {
          submenu.appendChild(createDropdownNode(subChild));
        });
      }
      folderDiv.appendChild(submenu);
      return folderDiv;
    }
    return null;
  }

  // Create Folder Element
  function createFolderElement(folder) {
    const div = document.createElement('div');
    div.className = 'ab-item ab-folder';
    div.tabIndex = 0;

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

    // Dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'ab-dropdown';

    if (!folder.children || folder.children.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'ab-empty-msg';
      emptyMsg.textContent = 'Folder is empty';
      dropdown.appendChild(emptyMsg);
    } else {
      folder.children.forEach(child => {
        const childNode = createDropdownNode(child);
        if (childNode) dropdown.appendChild(childNode);
      });
    }

    div.appendChild(dropdown);

    // Toggle on click / hover
    div.addEventListener('mouseenter', () => {
      isMouseInsideDropdown = true;
      clearTimeout(hideTimer);
      if (activeFolderItem && activeFolderItem !== div) {
        activeFolderItem.classList.remove('ab-open');
      }
      div.classList.add('ab-open');
      activeFolderItem = div;
    });

    div.addEventListener('mouseleave', () => {
      isMouseInsideDropdown = false;
      scheduleHide();
    });

    div.addEventListener('click', (e) => {
      if (e.target.closest('.ab-dropdown-item')) return;
      div.classList.toggle('ab-open');
      activeFolderItem = div.classList.contains('ab-open') ? div : null;
    });

    return div;
  }

  // Render All Bookmarks
  function renderBookmarks() {
    itemsTrack.innerHTML = '';

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

  itemsTrack.addEventListener('scroll', updateScrollArrows, { passive: true });
  window.addEventListener('resize', updateScrollArrows, { passive: true });

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
  }

  function closeSearch() {
    searchContainer.classList.remove('ab-search-open');
    searchResultsModal.classList.remove('ab-show');
    searchInput.value = '';
  }

  searchIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (searchContainer.classList.contains('ab-search-open')) {
      if (searchInput.value.trim().length > 0) {
        closeSearch();
      } else {
        closeSearch();
      }
    } else {
      openSearch();
    }
  });

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      searchResultsModal.classList.remove('ab-show');
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: 'SEARCH_BOOKMARKS', query: q }, (res) => {
        if (chrome.runtime.lastError) return;
        if (!res || !res.results || res.results.length === 0) {
          searchResultsModal.innerHTML = '<div class="ab-empty-msg">No bookmarks found</div>';
          searchResultsModal.classList.add('ab-show');
          return;
        }

        searchResultsModal.innerHTML = '';
        res.results.forEach(item => {
          const a = document.createElement('a');
          a.className = 'ab-dropdown-item';
          a.href = item.url;
          a.title = `${item.title}\n${item.url}`;

          const img = document.createElement('img');
          img.className = 'ab-favicon';
          img.src = getFaviconUrl(item.url);
          img.onerror = () => { img.src = fallbackFaviconSvg; };
          a.appendChild(img);

          const span = document.createElement('span');
          span.className = 'ab-title';
          span.textContent = item.title || item.url;
          a.appendChild(span);

          a.addEventListener('click', (e) => {
            e.preventDefault();
            if (settings.openInNewTab || e.ctrlKey || e.metaKey) {
              window.open(item.url, '_blank');
            } else {
              window.location.href = item.url;
            }
            closeSearch();
          });

          searchResultsModal.appendChild(a);
        });
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
    } else if (isBarVisible && !isMouseInsideBar && !isMouseInsideDropdown && !isPinned) {
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
