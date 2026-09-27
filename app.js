/*
  Playground Home — a PS5-inspired home screen PWA.
  This deliberately uses original artwork, vector icons and generated UI tones
  rather than Sony/PlayStation proprietary assets.
*/

(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const DB_NAME = 'playground-home-db';
  const DB_VERSION = 1;
  const STORE_APPS = 'apps';
  const STORE_META = 'meta';

  const state = {
    db: null,
    apps: [],
    settings: {
      uiSounds: true,
      soundVolume: 0.5,
      autoMusic: true,
      reduceMotion: false,
      rememberSelection: true,
      showWidgets: true,
      blur: 22,
      openMode: 'new-tab',
      theme: 'ps5',
    },
    currentTab: 'games',
    currentId: null,
    keyboard: false,
    controlCenter: false,
    settingsOpen: false,
    settingsSection: 'general',
    audioEl: null,
    audioUrl: null,
    audioContext: null,
    toastTimer: null,
    touchStartY: null,
    touchStartX: null,
  };

  const builtIns = [
    {
      id: 'welcome',
      title: 'Welcome',
      category: 'games',
      description: 'Your personal home. Pick a game, add a web app, or open your local library.',
      meta: 'HOME',
      art: makeArt('WELCOME', ['#182c46','#4f87bd','#0a1120'], 'ring'),
      cover: './assets/background-default.svg',
      icon: makeIconArt('W', ['#355c89','#132033']),
      launch: 'welcome',
      order: 0,
    },
    {
      id: 'library',
      title: 'Game Library',
      category: 'games',
      description: 'All of your installed-style web apps and games in one place.',
      meta: 'LIBRARY',
      art: makeArt('LIBRARY', ['#1f1e3f','#5d62bf','#121329'], 'grid'),
      icon: makeIconArt('▦', ['#514f9e','#171638']),
      launch: 'library',
      order: 1,
    },
    {
      id: 'starlight',
      title: 'Starlight Runner',
      category: 'games',
      description: 'A demo game tile included to make the home feel populated. Replace its art with your own.',
      meta: 'GAME · DEMO',
      art: makeArt('STARLIGHT RUNNER', ['#172d3b','#3e8c9e','#0b1620'], 'stars'),
      icon: makeIconArt('S', ['#2b6e83','#111b25']),
      launch: 'https://example.com',
      order: 2,
    },
    {
      id: 'neon-frontier',
      title: 'Neon Frontier',
      category: 'games',
      description: 'Another local demo entry. Use Settings → Apps to add your actual websites.',
      meta: 'GAME · DEMO',
      art: makeArt('NEON FRONTIER', ['#34234a','#a85cbd','#11101d'], 'arc'),
      icon: makeIconArt('N', ['#7e4c95','#20152a']),
      launch: 'https://example.org',
      order: 3,
    },
    {
      id: 'media-demo',
      title: 'Media Hub',
      category: 'media',
      description: 'A media-home example. Add YouTube, Spotify, Plex, or other web destinations from Settings.',
      meta: 'MEDIA · DEMO',
      art: makeArt('MEDIA HUB', ['#1d2834','#5082ae','#0b1018'], 'play'),
      icon: makeIconArt('▶', ['#47749a','#14202a']),
      launch: 'https://www.youtube.com/',
      order: 4,
    },
  ];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setIcons();
    bindStaticEvents();
    detectInputMode();
    await openDb();
    await loadData();
    render();
    registerPwa();
    updateClock();
    setInterval(updateClock, 1000);
  }

  function setIcons() {
    $('#searchButton').innerHTML = svg('search');
    $('#settingsButton').innerHTML = svg('gear');
    $('#heroMore').innerHTML = svg('dots');
  }

  function bindStaticEvents() {
    document.addEventListener('keydown', onKeyDown, { passive: false });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });

    $('#gamesTab').addEventListener('click', () => switchTab('games'));
    $('#mediaTab').addEventListener('click', () => switchTab('media'));
    $('#searchButton').addEventListener('click', openSearch);
    $('#settingsButton').addEventListener('click', () => openSettings('general'));
    $('#profileButton').addEventListener('click', toggleProfileMenu);
    $('#heroLaunch').addEventListener('click', () => launchCurrent());
    $('#heroMore').addEventListener('click', openCurrentOptions);
    $('#psButton').addEventListener('click', toggleControlCenter);

    $('#controlCenter').addEventListener('click', (e) => {
      if (e.target === $('#controlCenter') || e.target.classList.contains('cc-backdrop')) closeControlCenter();
    });
    $('#overlayLayer').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) closeOverlay();
    });

    document.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      state.touchStartY = t.clientY;
      state.touchStartX = t.clientX;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      if (state.touchStartY == null) return;
      const dy = t.clientY - state.touchStartY;
      const dx = t.clientX - state.touchStartX;
      state.touchStartY = null;
      state.touchStartX = null;
      if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0 && !state.settingsOpen && !state.controlCenter) toggleControlCenter();
        if (dy > 0 && state.controlCenter) closeControlCenter();
      }
    }, { passive: true });
  }

  function detectInputMode() {
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (coarse) document.documentElement.classList.remove('keyboard-mode');
  }

  function onPointerDown() {
    state.keyboard = false;
    document.documentElement.classList.remove('keyboard-mode');
    clearKeyboardFocus();
  }

  function onKeyDown(e) {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }
    state.keyboard = true;
    document.documentElement.classList.add('keyboard-mode');

    if (e.key === 'F1' || e.key.toLowerCase() === 'p') {
      e.preventDefault();
      toggleControlCenter();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (state.controlCenter) { closeControlCenter(); return; }
      if (state.settingsOpen) { closeOverlay(); return; }
      closeProfileMenu();
      return;
    }

    if (state.controlCenter) {
      if (navigateFocused(e, $$('.cc-control, .cc-card'))) return;
      return;
    }
    if (state.settingsOpen) {
      handleSettingsKey(e);
      return;
    }
    if ($('.search-overlay')) {
      handleSearchKey(e);
      return;
    }

    const tiles = $$('.app-tile');
    const focused = $('.app-tile.keyboard-focus');
    if (tiles.length && focused) {
      const idx = Number(focused.dataset.index);
      if (e.key === 'ArrowRight') { e.preventDefault(); focusTile(clamp(idx + 1, 0, tiles.length - 1)); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusTile(clamp(idx - 1, 0, tiles.length - 1)); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); $('#heroLaunch').focus(); markKeyboard($('#heroLaunch')); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectApp(state.apps.find(a => a.id === focused.dataset.id)); return; }
    }

    const top = $$('.home-tabs .text-tab, .top-actions .focusable');
    if (['Home','ArrowUp'].includes(e.key) && document.activeElement === $('#heroLaunch')) {
      e.preventDefault(); focusTile(findCurrentIndex()); return;
    }
    if (e.key === 'ArrowRight' && top.includes(document.activeElement)) {
      e.preventDefault(); cycleFocus(top, +1); return;
    }
    if (e.key === 'ArrowLeft' && top.includes(document.activeElement)) {
      e.preventDefault(); cycleFocus(top, -1); return;
    }
    if (e.key === 'ArrowDown' && top.includes(document.activeElement)) {
      e.preventDefault(); focusTile(findCurrentIndex()); return;
    }
    if (e.key === 'Enter' && top.includes(document.activeElement)) {
      e.preventDefault(); document.activeElement.click();
    }
    if (e.key.toLowerCase() === 's') openSettings('general');
    if (e.key.toLowerCase() === 'f') openSearch();
  }

  function handleSettingsKey(e) {
    const nav = $$('.settings-nav button');
    if (nav.includes(document.activeElement)) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cycleFocus(nav, +1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); cycleFocus(nav, -1); return; }
      if (e.key === 'Enter') { e.preventDefault(); document.activeElement.click(); return; }
    }
  }

  function handleSearchKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const results = $$('.search-result');
      if (!results.length) return;
      const idx = results.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown' ? clamp(idx + 1, 0, results.length - 1) : clamp(idx - 1, 0, results.length - 1);
      e.preventDefault(); results[next].focus(); markKeyboard(results[next]);
    }
    if (e.key === 'Enter' && $('.search-result') && document.activeElement.classList.contains('search-result')) {
      document.activeElement.click();
    }
  }

  function navigateFocused(e, items) {
    if (!items.length) return false;
    const current = document.activeElement;
    const idx = items.indexOf(current);
    if (idx < 0 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      items[0].focus(); markKeyboard(items[0]); return true;
    }
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % items.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
    if (next !== idx) { e.preventDefault(); items[next].focus(); markKeyboard(items[next]); return true; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); current?.click(); return true; }
    return false;
  }

  function cycleFocus(items, delta) {
    const idx = Math.max(0, items.indexOf(document.activeElement));
    const next = (idx + delta + items.length) % items.length;
    items[next].focus();
    markKeyboard(items[next]);
  }

  function markKeyboard(el) {
    clearKeyboardFocus();
    if (el) el.classList.add('keyboard-focus');
  }

  function clearKeyboardFocus() {
    $$('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
  }

  async function openDb() {
    state.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_APPS)) db.createObjectStore(STORE_APPS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbGet(store, key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbAll(store) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(store, value) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbDelete(store, key) {
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function loadData() {
    const saved = await dbAll(STORE_APPS);
    const meta = await dbAll(STORE_META);
    const settings = meta.find(m => m.key === 'settings')?.value;
    const currentId = meta.find(m => m.key === 'currentId')?.value;
    const currentTab = meta.find(m => m.key === 'currentTab')?.value;
    state.settings = { ...state.settings, ...(settings || {}) };
    state.apps = [...builtIns, ...saved.filter(a => a.custom)];
    state.apps.sort((a,b) => (a.order ?? 99) - (b.order ?? 99));
    state.currentTab = currentTab === 'media' ? 'media' : 'games';
    const remembered = state.settings.rememberSelection ? currentId : null;
    const visible = state.apps.filter(a => a.category === state.currentTab);
    state.currentId = visible.some(a => a.id === remembered) ? remembered : (visible[0]?.id || state.apps[0]?.id);
    applyTheme();
  }

  async function saveMeta() {
    await dbPut(STORE_META, { key: 'settings', value: state.settings });
    await dbPut(STORE_META, { key: 'currentId', value: state.currentId });
    await dbPut(STORE_META, { key: 'currentTab', value: state.currentTab });
  }

  function getVisibleApps() {
    const apps = state.apps.filter(a => a.category === state.currentTab);
    if (!apps.length && state.currentTab === 'media') return [];
    return apps;
  }

  function getCurrentApp() {
    return state.apps.find(a => a.id === state.currentId) || getVisibleApps()[0] || state.apps[0];
  }

  function render() {
    renderTabs();
    renderCarousel();
    updateHero();
    renderWidgets();
    renderControlCenter();
    clearKeyboardFocus();
  }

  function renderTabs() {
    $('#gamesTab').classList.toggle('is-active', state.currentTab === 'games');
    $('#mediaTab').classList.toggle('is-active', state.currentTab === 'media');
  }

  function renderCarousel() {
    const wrap = $('#appCarousel');
    const apps = getVisibleApps();
    wrap.innerHTML = '';
    if (!apps.length) {
      wrap.innerHTML = `<div class="empty-state" style="width:100%;padding:50px 0;text-align:left">No media apps yet. Open Settings → Apps and add a website as a media app.</div>`;
      return;
    }
    apps.forEach((app, i) => {
      const b = document.createElement('button');
      b.className = 'app-tile focusable';
      b.type = 'button';
      b.tabIndex = 0;
      b.dataset.id = app.id;
      b.dataset.index = i;
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', app.id === state.currentId ? 'true' : 'false');
      b.innerHTML = `<img src="${escapeAttr(app.art || app.icon)}" alt=""><span class="tile-label">${escapeHtml(app.title)}</span>`;
      b.addEventListener('click', () => selectApp(app));
      b.addEventListener('dblclick', () => launchApp(app));
      if (app.id === state.currentId) b.classList.add('is-active');
      wrap.appendChild(b);
    });
    requestAnimationFrame(() => {
      const current = wrap.querySelector(`[data-id="${CSS.escape(state.currentId || '')}"]`);
      current?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
    });
  }

  function updateHero() {
    const app = getCurrentApp();
    if (!app) return;
    $('#heroMeta').textContent = app.meta || (app.custom ? `CUSTOM · ${app.category.toUpperCase()}` : 'APP');
    $('#heroTitle').textContent = app.title;
    $('#heroDescription').textContent = app.description || '';
    $('#heroLaunch').textContent = app.launch === 'library' ? 'View' : app.launch === 'welcome' ? 'Welcome' : app.category === 'media' ? 'Open' : 'Play';
    $('#ambientBg').style.backgroundImage = `url("${escapeCssUrl(app.cover || app.art || app.icon)}")`;
    $('#ambientBg').style.filter = `saturate(1.15) blur(${Math.max(0, state.settings.blur / 5)}px)`;
    $('#ambientBg').style.transform = state.settings.reduceMotion ? 'scale(1.015)' : 'scale(1.035)';
    $('#heroLaunch').dataset.id = app.id;
  }

  function renderWidgets() {
    const host = $('#welcomeWidgets');
    host.innerHTML = '';
    host.style.display = state.settings.showWidgets ? '' : 'none';
    const recent = getRecentApps();
    const selected = getCurrentApp();
    const customCount = state.apps.filter(a => a.custom).length;
    host.appendChild(widget('Recently Played', recent[0]?.title || selected.title, `${recent.length} apps in your local activity row.`, true));
    host.appendChild(widget('Game Library', `${state.apps.filter(a => a.category === 'games').length} games`, `${customCount} custom web apps`, false));
    host.appendChild(widget('Media', state.currentTab === 'media' ? 'Media home' : 'Ready', state.audioEl && !state.audioEl.paused ? 'Music playing' : 'Nothing playing', false));
    host.appendChild(widget('Trophies', '0% complete', 'No console account connected', false, 0));
  }

  function widget(kicker, value, sub, large, progress) {
    const el = document.createElement('article');
    el.className = `widget${large ? ' large' : ''}`;
    el.innerHTML = `<div class="w-kicker">${escapeHtml(kicker)}</div><div class="w-value">${escapeHtml(value)}</div><div class="w-sub">${escapeHtml(sub)}</div>${progress !== undefined ? `<div class="progress"><span style="width:${progress}%"></span></div>` : ''}`;
    return el;
  }

  function getRecentApps() {
    const order = state.apps.filter(a => a.lastOpened).sort((a,b) => b.lastOpened - a.lastOpened);
    return order.length ? order : [getCurrentApp()];
  }

  async function selectApp(app) {
    if (!app) return;
    state.currentId = app.id;
    app.lastOpened = Date.now();
    if (app.custom) await dbPut(STORE_APPS, app);
    await saveMeta();
    stopAppMusic();
    renderCarousel();
    updateHero();
    renderWidgets();
    playUiSound('hover');
    maybePlayAppMusic(app);
  }

  function switchTab(tab) {
    if (state.currentTab === tab) return;
    state.currentTab = tab;
    const first = getVisibleApps()[0];
    if (first) state.currentId = first.id;
    saveMeta();
    renderTabs();
    renderCarousel();
    updateHero();
    renderWidgets();
    playUiSound('select');
  }

  function focusTile(index) {
    const tiles = $$('.app-tile');
    if (!tiles.length) return;
    const b = tiles[clamp(index, 0, tiles.length - 1)];
    b.focus({ preventScroll: true });
    markKeyboard(b);
    b.scrollIntoView({ behavior: state.settings.reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    selectApp(state.apps.find(a => a.id === b.dataset.id));
  }

  function findCurrentIndex() {
    const visible = getVisibleApps();
    return Math.max(0, visible.findIndex(a => a.id === state.currentId));
  }

  function launchCurrent() { launchApp(getCurrentApp()); }

  function launchApp(app) {
    if (!app) return;
    playUiSound('open');
    if (app.launch === 'welcome') { toast('You are already home.'); return; }
    if (app.launch === 'library') { openLibrary(); return; }
    if (!app.launch) { toast('This app has no URL.'); return; }
    if (app.custom && app.openMode === 'embedded') {
      openEmbedded(app);
    } else if (state.settings.openMode === 'embedded' || app.openMode === 'embedded') {
      openEmbedded(app);
    } else {
      window.open(app.launch, '_blank', 'noopener,noreferrer');
    }
  }

  function openCurrentOptions() {
    const app = getCurrentApp();
    if (!app) return;
    if (app.custom) {
      openSettings('apps', { editId: app.id });
    } else {
      toast('Options are available for custom apps in Settings → Apps.');
    }
  }

  function openEmbedded(app) {
    const host = $('#overlayLayer');
    const back = document.createElement('div');
    back.className = 'modal-backdrop is-visible';
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.style.padding = '70px 0 0';
    panel.innerHTML = `<div style="height:100%;display:flex;flex-direction:column;background:#05070c"><div style="height:52px;flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(10,13,20,.94)"><button class="small-button focusable" id="runtimeBack">Back</button><strong style="font-size:12px">${escapeHtml(app.title)}</strong><a class="small-button" style="margin-left:auto;color:white;text-decoration:none" href="${escapeAttr(app.launch)}" target="_blank" rel="noopener noreferrer">Open in browser</a></div><iframe id="runtimeFrame" title="${escapeAttr(app.title)}" src="${escapeAttr(app.launch)}" style="border:0;flex:1;width:100%;background:white"></iframe></div>`;
    host.innerHTML = '';
    host.appendChild(back); host.appendChild(panel);
    $('#runtimeBack').onclick = closeOverlay;
    host.setAttribute('aria-hidden','false');
  }

  function openLibrary() {
    const cards = getVisibleAllApps().map((app, i) => `<button class="search-result focusable" type="button" data-lib-id="${escapeAttr(app.id)}"><img src="${escapeAttr(app.art || app.icon)}" alt=""><div><strong>${escapeHtml(app.title)}</strong><span>${escapeHtml(app.meta || app.category)}</span></div></button>`).join('');
    showPanel('Game Library', 'All local entries, including your custom web apps.', `<div class="settings-card" style="max-height:70vh;overflow:auto"><div class="apps-table">${cards || `<div class="empty-state">No apps.</div>`}</div></div>`);
    $$('.search-result[data-lib-id]').forEach(b => b.onclick = () => { selectApp(state.apps.find(a => a.id === b.dataset.libId)); closeOverlay(); });
  }

  function getVisibleAllApps() { return [...state.apps].sort((a,b) => (a.order ?? 99) - (b.order ?? 99)); }

  function toggleControlCenter() {
    if (state.settingsOpen) return;
    state.controlCenter = !state.controlCenter;
    $('#controlCenter').classList.toggle('is-open', state.controlCenter);
    $('#controlCenter').setAttribute('aria-hidden', String(!state.controlCenter));
    renderControlCenter();
    playUiSound(state.controlCenter ? 'open' : 'back');
    if (state.controlCenter) setTimeout(() => $$('.cc-control')[0]?.focus(), 20);
  }

  function closeControlCenter() {
    if (!state.controlCenter) return;
    state.controlCenter = false;
    $('#controlCenter').classList.remove('is-open');
    $('#controlCenter').setAttribute('aria-hidden', 'true');
    playUiSound('back');
  }

  function renderControlCenter() {
    $('#ccCards').innerHTML = [
      ccCard('Activity', 'Quick actions for the selected app.', 'activity'),
      ccCard('Music', state.audioEl && !state.audioEl.paused ? 'Music is playing.' : 'No app music playing.', 'music'),
      ccCard('Library', `${state.apps.length} local apps`, 'library'),
      ccCard('Widgets', state.settings.showWidgets ? 'Welcome widgets on.' : 'Welcome widgets off.', 'widgets'),
    ].join('');
    $('#ccControls').innerHTML = [
      ccControl('home','Home',() => closeControlCenter()),
      ccControl('switcher','Switcher',() => openLibrary()),
      ccControl('search','Search',() => { closeControlCenter(); openSearch(); }),
      ccControl('sound','Sound',() => showPanel('Sound', 'UI audio and per-app music.', soundSettingsHtml())),
      ccControl('mic','Mic',() => toast('Microphone is not used by this PWA.')),
      ccControl('settings','Settings',() => { closeControlCenter(); openSettings('general'); }),
      ccControl('power','Power',() => toast('PWA cannot power down your device.')),
    ].join('');
  }

  function ccCard(title, text, icon) {
    return `<button class="cc-card focusable" type="button" data-cc="${icon}"><div class="cc-icon">${svg(icon)}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></button>`;
  }

  function ccControl(icon, label, onClick) {
    const id = `cc-${Math.random().toString(36).slice(2)}`;
    setTimeout(() => { const el = document.getElementById(id); if (el) el.onclick = onClick; }, 0);
    return `<button id="${id}" class="cc-control focusable" type="button" data-focus-label="${escapeAttr(label)}">${svg(icon)}<small>${escapeHtml(label)}</small></button>`;
  }

  function openSearch() {
    closeProfileMenu();
    closeControlCenter();
    if ($('.search-overlay')) return;
    const host = $('#overlayLayer');
    const back = document.createElement('div');
    back.className = 'modal-backdrop is-visible';
    const wrap = document.createElement('div');
    wrap.className = 'search-overlay';
    wrap.innerHTML = `<section class="search-box"><div class="search-head"><span>${svg('search')}</span><input id="searchInput" class="focusable" type="search" autocomplete="off" placeholder="Search games and apps"><button class="small-button" id="searchClose">Back</button></div><div class="search-results" id="searchResults"></div></section>`;
    host.innerHTML = '';
    host.appendChild(back); host.appendChild(wrap);
    host.setAttribute('aria-hidden','false');
    const input = $('#searchInput');
    input.focus();
    input.addEventListener('input', () => renderSearchResults(input.value));
    $('#searchClose').onclick = closeOverlay;
    renderSearchResults('');
  }

  function renderSearchResults(query) {
    const q = query.trim().toLowerCase();
    const results = getVisibleAllApps().filter(a => !q || a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q) || (a.launch || '').toLowerCase().includes(q));
    $('#searchResults').innerHTML = results.map(a => `<button class="search-result focusable" type="button" data-search-id="${escapeAttr(a.id)}"><img src="${escapeAttr(a.art || a.icon)}" alt=""><div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.meta || a.category)}</span></div></button>`).join('') || `<div class="empty-state">No results.</div>`;
    $$('.search-result').forEach(b => b.onclick = () => { selectApp(state.apps.find(a => a.id === b.dataset.searchId)); closeOverlay(); });
  }

  function toggleProfileMenu() {
    const existing = $('.profile-menu');
    if (existing) { closeProfileMenu(); return; }
    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.innerHTML = `<div class="pm-top"><strong>Playground User</strong><span>Local profile · offline</span></div><button class="menu-action" data-profile="switch">Switch User</button><button class="menu-action" data-profile="trophies">Trophies</button><button class="menu-action" data-profile="privacy">Privacy</button>`;
    $('.topbar').appendChild(menu);
    $$('.menu-action', menu).forEach(b => b.onclick = () => toast(`${b.textContent} is local-only in this PWA.`));
  }

  function closeProfileMenu() { $('.profile-menu')?.remove(); }

  function openSettings(section = 'general', opts = {}) {
    closeProfileMenu();
    closeControlCenter();
    state.settingsOpen = true;
    state.settingsSection = section;
    const host = $('#overlayLayer');
    const back = document.createElement('div');
    back.className = 'modal-backdrop is-visible';
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.innerHTML = settingsShell();
    host.innerHTML = '';
    host.appendChild(back); host.appendChild(panel);
    host.setAttribute('aria-hidden','false');
    wireSettings(opts);
  }

  function settingsShell() {
    return `<div class="panel-header"><div><h2>Settings</h2><p>Local console-style settings for Playground Home.</p></div><button class="panel-close focusable" id="settingsClose" type="button" aria-label="Close">${svg('close')}</button></div><div class="settings-layout"><nav class="settings-nav" aria-label="Settings categories"><button class="focusable ${state.settingsSection==='general'?'is-active':''}" data-section="general">General</button><button class="focusable ${state.settingsSection==='appearance'?'is-active':''}" data-section="appearance">Appearance</button><button class="focusable ${state.settingsSection==='sound'?'is-active':''}" data-section="sound">Sound</button><button class="focusable ${state.settingsSection==='apps'?'is-active':''}" data-section="apps">Apps</button><button class="focusable ${state.settingsSection==='pwa'?'is-active':''}" data-section="pwa">System</button></nav><div class="settings-content" id="settingsContent"></div></div>`;
  }

  function wireSettings(opts) {
    $('#settingsClose').onclick = closeOverlay;
    $$('.settings-nav button').forEach(b => b.onclick = () => openSettings(b.dataset.section, opts));
    renderSettingsSection(opts);
  }

  function renderSettingsSection(opts = {}) {
    const c = $('#settingsContent'); if (!c) return;
    if (state.settingsSection === 'general') c.innerHTML = generalSettingsHtml();
    if (state.settingsSection === 'appearance') c.innerHTML = appearanceSettingsHtml();
    if (state.settingsSection === 'sound') c.innerHTML = soundSettingsHtml();
    if (state.settingsSection === 'apps') c.innerHTML = appsSettingsHtml(opts);
    if (state.settingsSection === 'pwa') c.innerHTML = pwaSettingsHtml();
    wireSectionControls(opts);
  }

  function generalSettingsHtml() {
    return `<div class="settings-section"><h3>Home behavior</h3><div class="settings-card">${settingSwitch('showWidgets','Welcome Hub widgets','Show compact information cards on the home screen.',state.settings.showWidgets)}${settingSwitch('rememberSelection','Remember last selection','Return to the last selected app when the PWA reopens.',state.settings.rememberSelection)}${settingSwitch('reduceMotion','Reduce motion','Use shorter, gentler movement and disable larger transforms.',state.settings.reduceMotion)}</div></div><div class="settings-section"><h3>App launching</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Default website launch mode</div><div class="sr-sub">Embedded mode can be blocked by websites; new-tab mode is the most compatible.</div></div><select id="openMode" class="select-input" style="width:170px"><option value="new-tab" ${state.settings.openMode==='new-tab'?'selected':''}>New tab</option><option value="embedded" ${state.settings.openMode==='embedded'?'selected':''}>Embedded</option></select></div></div></div>`;
  }

  function appearanceSettingsHtml() {
    return `<div class="settings-section"><h3>Background</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Background blur</div><div class="sr-sub">Amount of depth-of-field applied to the selected cover.</div></div><input id="blurRange" type="range" min="0" max="50" value="${state.settings.blur}" style="width:190px"></div></div></div><div class="settings-section"><h3>Design note</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">PS5-inspired presentation</div><div class="sr-sub">The layout, motion and interaction are recreated with original HTML/CSS/JS artwork; Sony proprietary screenshots, logos, music and SFX are not bundled.</div></div></div></div></div>`;
  }

  function soundSettingsHtml() {
    return `<div class="settings-section"><h3>Audio</h3><div class="settings-card">${settingSwitch('uiSounds','UI sounds','Play short original interface tones for focus, selection and navigation.',state.settings.uiSounds)}${settingSwitch('autoMusic','Per-app music','Play an uploaded track while its custom app is selected.',state.settings.autoMusic)}<div class="setting-row"><div><div class="sr-title">UI volume</div><div class="sr-sub">Controls the original synthesized interface sounds.</div></div><input id="soundRange" type="range" min="0" max="1" step="0.01" value="${state.settings.soundVolume}" style="width:190px"></div></div></div>`;
  }

  function appsSettingsHtml(opts = {}) {
    const custom = state.apps.filter(a => a.custom);
    return `<div class="settings-section"><h3>Add a website as a game or app</h3><div class="settings-card" style="padding:15px"><form id="appForm" class="form-grid" novalidate><input type="hidden" id="editId" value="${escapeAttr(opts.editId || '')}"><div class="form-field"><label for="appTitle">Title</label><input class="text-input" id="appTitle" required placeholder="My Game"></div><div class="form-field"><label for="appCategory">Type</label><select class="select-input" id="appCategory"><option value="games">Game</option><option value="media">Media</option></select></div><div class="form-field full"><label for="appUrl">Website URL</label><input class="text-input" id="appUrl" required inputmode="url" placeholder="https://example.com"></div><div class="form-field"><label for="coverFile">Cover image</label><input class="file-input" id="coverFile" type="file" accept="image/*"></div><div class="form-field"><label for="iconFile">Icon image (optional)</label><input class="file-input" id="iconFile" type="file" accept="image/*"></div><div class="form-field"><label for="musicFile">Home music (optional)</label><input class="file-input" id="musicFile" type="file" accept="audio/*"></div><div class="form-field"><label for="appOpenMode">Launch mode</label><select class="select-input" id="appOpenMode"><option value="new-tab">New tab</option><option value="embedded">Embedded</option></select></div><div class="form-field full"><label for="appDescription">Description</label><textarea class="text-input" id="appDescription" rows="3" placeholder="Optional hub text"></textarea></div><div class="form-actions full"><button class="small-button" id="clearForm" type="button">Clear</button><button class="small-button primary" type="submit">Save App</button></div></form></div></div><div class="settings-section"><h3>Your custom apps</h3><div class="settings-card"><div class="apps-table">${custom.map(a => adminAppRow(a)).join('') || `<div class="empty-state">No custom apps yet.</div>`}</div></div></div><div class="settings-section"><h3>Backup</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Export / import your app library</div><div class="sr-sub">Exports custom app metadata, artwork and music as JSON. Keep large audio files out of public repos; this backup stays local.</div></div><div style="display:flex;gap:8px"><button class="small-button" id="exportData">Export</button><label class="small-button" style="cursor:pointer">Import<input id="importData" type="file" accept="application/json" hidden></label></div></div></div></div>`;
  }

  function adminAppRow(a) {
    return `<div class="app-admin"><div class="mini-art"><img src="${escapeAttr(a.art || a.icon)}" alt=""></div><div class="name"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.launch || '')}</span></div><button class="small-button" data-edit-app="${escapeAttr(a.id)}">Edit</button><button class="small-button" data-delete-app="${escapeAttr(a.id)}">Delete</button></div>`;
  }

  function pwaSettingsHtml() {
    return `<div class="settings-section"><h3>Install</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Install this PWA</div><div class="sr-sub" id="installStatus">Checking install availability…</div></div><button class="small-button primary" id="installButton">Install</button></div></div></div><div class="settings-section"><h3>Offline cache</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Core shell</div><div class="sr-sub">The HTML, CSS, JavaScript, manifest and install icon are precached. User-added app assets stay in IndexedDB.</div></div><button class="small-button" id="updateButton">Refresh cache</button></div></div></div><div class="settings-section"><h3>Reset</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Restore built-in library</div><div class="sr-sub">Deletes every custom app, uploaded image and uploaded music track.</div></div><button class="small-button" id="resetButton">Reset library</button></div></div></div>`;
  }

  function settingSwitch(key, title, sub, value) {
    return `<div class="setting-row"><div><div class="sr-title">${escapeHtml(title)}</div><div class="sr-sub">${escapeHtml(sub)}</div></div><button class="switch ${value?'is-on':''}" type="button" role="switch" aria-checked="${value}" data-setting="${key}"><span></span></button></div>`;
  }

  function wireSectionControls(opts = {}) {
    $$('.switch').forEach(b => b.onclick = async () => {
      const key = b.dataset.setting;
      state.settings[key] = !state.settings[key];
      b.classList.toggle('is-on', state.settings[key]);
      b.setAttribute('aria-checked', String(state.settings[key]));
      await saveMeta();
      applyTheme(); renderWidgets(); maybePlayAppMusic(getCurrentApp());
      playUiSound('select');
    });
    $('#openMode')?.addEventListener('change', async e => { state.settings.openMode = e.target.value; await saveMeta(); });
    $('#blurRange')?.addEventListener('input', async e => { state.settings.blur = Number(e.target.value); updateHero(); await saveMeta(); });
    $('#soundRange')?.addEventListener('input', async e => { state.settings.soundVolume = Number(e.target.value); await saveMeta(); });
    $('#clearForm')?.addEventListener('click', () => resetAppForm());
    $('#appForm')?.addEventListener('submit', e => { e.preventDefault(); saveAppFromForm(opts.editId); });
    $$('.settings-nav button').forEach(b => b.classList.toggle('is-active', b.dataset.section === state.settingsSection));
    $$('.settings-nav button').forEach(b => b.onclick = () => openSettings(b.dataset.section));
    $$('.app-admin [data-edit-app]').forEach(b => b.onclick = () => editCustomApp(b.dataset.editApp));
    $$('.app-admin [data-delete-app]').forEach(b => b.onclick = () => deleteCustomApp(b.dataset.deleteApp));
    $('#exportData')?.addEventListener('click', exportLibrary);
    $('#importData')?.addEventListener('change', e => importLibrary(e.target.files?.[0]));
    $('#installButton')?.addEventListener('click', installPwa);
    $('#updateButton')?.addEventListener('click', async () => { if (navigator.serviceWorker?.controller) { toast('Refreshing shell cache…'); window.location.reload(); } else toast('Service worker is not controlling this page yet.'); });
    $('#resetButton')?.addEventListener('click', resetLibrary);
    updateInstallUi();
  }

  function resetAppForm() {
    $('#appForm')?.reset();
    $('#editId').value = '';
    $('#appCategory').value = 'games';
    $('#appOpenMode').value = state.settings.openMode;
  }

  function editCustomApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;
    const content = $('#settingsContent');
    if (content) openSettings('apps', { editId: id });
    setTimeout(() => {
      $('#editId').value = id;
      $('#appTitle').value = app.title;
      $('#appCategory').value = app.category;
      $('#appUrl').value = app.launch;
      $('#appDescription').value = app.description || '';
      $('#appOpenMode').value = app.openMode || state.settings.openMode;
      toast('Edit mode loaded. New images/audio are optional.');
    }, 0);
  }

  async function saveAppFromForm(existingId) {
    const title = $('#appTitle').value.trim();
    let url = $('#appUrl').value.trim();
    if (!title || !url) { toast('Title and URL are required.'); return; }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { toast('That URL is not valid.'); return; }

    const id = existingId || $('#editId').value || `custom-${crypto.randomUUID()}`;
    const old = state.apps.find(a => a.id === id);
    const cover = await fileToDataUrl($('#coverFile').files?.[0]);
    const icon = await fileToDataUrl($('#iconFile').files?.[0]);
    const music = await fileToDataUrl($('#musicFile').files?.[0]);
    const art = cover || old?.art || icon || makeArt(title.toUpperCase(), ['#293651','#6da5d6','#111725'], 'grid');
    const iconData = icon || cover || old?.icon || makeIconArt(title.slice(0,1).toUpperCase(), ['#315987','#131f2d']);
    const app = {
      id, custom: true,
      title,
      category: $('#appCategory').value,
      launch: url,
      description: $('#appDescription').value.trim(),
      meta: `CUSTOM · ${$('#appCategory').value.toUpperCase()}`,
      art,
      cover: art,
      icon: iconData,
      music: music || old?.music || null,
      openMode: $('#appOpenMode').value,
      order: old?.order ?? (100 + state.apps.filter(a => a.custom).length),
      lastOpened: old?.lastOpened || 0,
    };
    await dbPut(STORE_APPS, app);
    state.apps = [...builtIns, ...(await dbAll(STORE_APPS))].sort((a,b) => (a.order ?? 99) - (b.order ?? 99));
    state.currentId = app.id;
    await saveMeta();
    toast(`${title} added to the ${app.category} home.`);
    openSettings('apps');
    render();
  }

  async function deleteCustomApp(id) {
    const app = state.apps.find(a => a.id === id);
    if (!app) return;
    if (!confirm(`Delete "${app.title}" from this PWA?`)) return;
    await dbDelete(STORE_APPS, id);
    state.apps = [
      ...builtIns,
      ...(await dbAll(STORE_APPS)),
    ].sort((a,b) => (a.order ?? 99) - (b.order ?? 99));
    if (state.currentId === id) state.currentId = getVisibleApps()[0]?.id || state.apps[0]?.id;
    await saveMeta();
    render();
    openSettings('apps');
    toast('Custom app deleted.');
  }

  async function exportLibrary() {
    const custom = state.apps.filter(a => a.custom);
    const payload = { version: 1, exportedAt: new Date().toISOString(), settings: state.settings, apps: custom };
    const blob = new Blob([JSON.stringify(payload)], { type:'application/json' });
    downloadBlob(blob, `playground-home-backup-${new Date().toISOString().slice(0,10)}.json`);
    toast('Library backup exported.');
  }

  async function importLibrary(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.apps)) throw new Error('Missing apps');
      for (const app of payload.apps) {
        if (!app.id || !app.custom || !app.title || !app.launch) continue;
        await dbPut(STORE_APPS, app);
      }
      if (payload.settings) state.settings = { ...state.settings, ...payload.settings };
      state.apps = [...builtIns, ...(await dbAll(STORE_APPS))].sort((a,b) => (a.order ?? 99) - (b.order ?? 99));
      await saveMeta();
      render();
      openSettings('apps');
      toast(`${payload.apps.length} apps imported.`);
    } catch (err) {
      console.error(err); toast('Import failed. Check that the file came from this PWA.');
    }
  }

  async function resetLibrary() {
    if (!confirm('Delete all custom apps and their uploaded assets?')) return;
    const custom = await dbAll(STORE_APPS);
    await Promise.all(custom.map(a => dbDelete(STORE_APPS, a.id)));
    state.apps = [...builtIns];
    state.currentTab = 'games'; state.currentId = 'welcome';
    await saveMeta();
    render(); openSettings('apps'); toast('Custom library restored.');
  }

  function applyTheme() {
    document.documentElement.style.setProperty('--accent', '#2fb9ff');
    document.body.classList.toggle('reduce-motion', !!state.settings.reduceMotion);
    const bg = state.settings.homeBackground || '';
    if (bg && !state.controlCenter && !state.settingsOpen) {
      $('#ambientBg').style.backgroundImage = `url("${escapeCssUrl(bg)}")`;
    }
  }

  async function maybePlayAppMusic(app) {
    if (!state.settings.autoMusic || !app?.music) return;
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    try {
      const blob = dataUrlToBlob(app.music);
      state.audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(state.audioUrl);
      audio.loop = true;
      audio.volume = .45;
      state.audioEl = audio;
      await audio.play();
    } catch (err) {
      // Autoplay can be blocked until the user interacts; UI remains usable.
    }
  }

  function stopAppMusic() {
    if (state.audioEl) { state.audioEl.pause(); state.audioEl.src = ''; }
    if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
    state.audioEl = null; state.audioUrl = null;
  }

  function playUiSound(type) {
    if (!state.settings.uiSounds) return;
    if (!state.audioContext) {
      try { state.audioContext = new AudioContext(); } catch { return; }
    }
    const ctx = state.audioContext;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const vol = Math.max(.001, state.settings.soundVolume * .06);
    const presets = {
      hover: [480, 540, .055],
      select: [420, 700, .095],
      back: [500, 300, .08],
      open: [330, 780, .14],
    };
    const [a,b,dur] = presets[type] || presets.hover;
    osc.type = type === 'open' ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(a, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(80,b), now + dur);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + .008);
    gain.gain.exponentialRampToValueAtTime(.001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + dur + .015);
  }

  function showPanel(title, subtitle, contentHtml) {
    state.settingsOpen = false;
    const host = $('#overlayLayer');
    const back = document.createElement('div'); back.className = 'modal-backdrop is-visible';
    const panel = document.createElement('section'); panel.className = 'panel';
    panel.innerHTML = `<div class="panel-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div><button class="panel-close focusable" id="panelClose" type="button">${svg('close')}</button></div><div class="settings-content">${contentHtml}</div>`;
    host.innerHTML = ''; host.append(back,panel); host.setAttribute('aria-hidden','false');
    $('#panelClose').onclick = closeOverlay;
    panel.querySelectorAll('.switch').forEach(b => b.onclick = async () => {
      state.settings[b.dataset.setting] = !state.settings[b.dataset.setting]; b.classList.toggle('is-on'); await saveMeta();
    });
  }

  function closeOverlay() {
    state.settingsOpen = false;
    stopAppMusic();
    $('#overlayLayer').innerHTML = '';
    $('#overlayLayer').setAttribute('aria-hidden','true');
    renderWidgets();
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
  }

  function updateClock() {
    const d = new Date();
    $('#clock').textContent = d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); deferredPrompt = e; updateInstallUi();
  });

  async function installPwa() {
    if (!deferredPrompt) {
      toast('Use your browser menu → Install app / Add to Home screen.');
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    updateInstallUi();
  }

  function updateInstallUi() {
    const s = $('#installStatus');
    const b = $('#installButton');
    if (!s || !b) return;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) { s.textContent = 'Already running as an installed app.'; b.disabled = true; b.style.opacity = .45; }
    else if (deferredPrompt) s.textContent = 'The browser has offered an install prompt.';
    else s.textContent = 'Install prompt depends on browser and hosting. HTTPS or localhost is required.';
  }

  async function registerPwa() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      reg.addEventListener('updatefound', () => toast('A new shell version is available.'));
    } catch (err) {
      console.warn('Service worker registration failed', err);
    }
  }

  function fileToDataUrl(file) {
    if (!file) return Promise.resolve(null);
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(url) {
    const [meta, data] = url.split(',');
    const mime = /data:([^;]+);/.exec(meta)?.[1] || 'application/octet-stream';
    const raw = atob(data);
    const arr = new Uint8Array(raw.length);
    for (let i=0;i<raw.length;i++) arr[i] = raw.charCodeAt(i);
    return new Blob([arr], { type:mime });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function makeArt(text, colors, motif='grid') {
    const safe = String(text).replace(/[<&>]/g, '');
    const [a,b,c] = colors;
    const motifs = {
      grid: `<g opacity=".28" stroke="#fff" stroke-width="1">${Array.from({length:11},(_,i)=>`<path d="M${i*180-200} 0L${i*180+500} 1080"/>`).join('')}${Array.from({length:7},(_,i)=>`<path d="M0 ${i*180+20}H1920"/>`).join('')}</g>`,
      ring: `<circle cx="1510" cy="520" r="330" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="42"/><circle cx="1510" cy="520" r="210" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="18"/>`,
      stars: `<g fill="#fff" opacity=".75">${Array.from({length:35},(_,i)=>`<circle cx="${(i*353)%1920}" cy="${(i*173)%900}" r="${1+(i%4)}"/>`).join('')}</g>`,
      arc: `<path d="M-120 940 C 330 300 760 1120 1170 520 S 1800 260 2110 760" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="70"/><path d="M-150 1010 C 310 370 750 1180 1200 610 S 1800 350 2110 830" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="25"/>`,
      play: `<circle cx="1540" cy="520" r="220" fill="#fff" opacity=".08"/><path d="M1490 410l170 110-170 110z" fill="#fff" opacity=".65"/>`,
    };
    const svgText = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient><radialGradient id="r"><stop stop-color="#fff" stop-opacity=".20"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><circle cx="1440" cy="350" r="520" fill="url(#r)"/>${motifs[motif]||motifs.grid}<rect width="1920" height="1080" fill="url(#g)" opacity=".11"/><text x="120" y="850" fill="#fff" fill-opacity=".90" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" letter-spacing="5">${safe}</text></svg>`);
    return `data:image/svg+xml;charset=utf-8,${svgText}`;
  }

  function makeIconArt(letter, colors) {
    const [a,b] = colors;
    const s = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="256" height="256" rx="58" fill="url(#g)"/><circle cx="178" cy="70" r="68" fill="#fff" opacity=".08"/><text x="128" y="155" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="110" font-weight="750">${String(letter).slice(0,2)}</text></svg>`);
    return `data:image/svg+xml;charset=utf-8,${s}`;
  }

  function svg(name) {
    const p = {
      search: '<circle cx="11" cy="11" r="6.8"/><path d="m16 16 5 5"/>',
      gear: '<path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4"/><circle cx="12" cy="12" r="5"/>',
      dots: '<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
      close: '<path d="m6 6 12 12M18 6 6 18"/>',
      home: '<path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z"/>',
      switcher: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>',
      activity: '<circle cx="12" cy="12" r="8"/><path d="M5 12h4l2-5 2 10 2-5h3"/>',
      music: '<path d="M9 18V6l9-2v12"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="15.5" cy="16.5" r="2.5"/>',
      library: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      widgets: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
      sound: '<path d="M5 10v4h3l4 4V6l-4 4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/>',
      mic: '<rect x="9" y="4" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6"/>',
      settings: '<path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4.6"/>',
      power: '<path d="M12 3v8"/><path d="M7.2 5.6a8 8 0 1 0 9.6 0"/>',
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${p[name] || p.library}</svg>`;
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g,'&#39;'); }
  function escapeCssUrl(s) { return String(s || '').replace(/(["\\)])/g,'\\$1'); }
})();
