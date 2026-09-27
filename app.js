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
      homeMusic: true,
      musicVolume: 0.38,
      homeBackground: './assets/backgrounds/default.svg',
      backgroundPreset: 'default',
    },
    currentTab: 'games',
    currentId: null,
    keyboard: false,
    keyboardRegion: null,
    keyboardTargetId: null,
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
      id: 'ps-store', title: 'PlayStation Store', category: 'games',
      description: 'Browse games, add-ons and more.', meta: 'STORE',
      art: makeArt('PLAYSTATION STORE', ['#18283c','#2b7ca9','#08111e'], 'play'),
      cover: makeArt('PLAYSTATION STORE', ['#17314b','#297ca8','#07101c'], 'play'),
      icon: makeSymbolIcon('store'), launch: 'https://store.playstation.com/', order: 0,
    },
    {
      id: 'welcome', title: 'Welcome', category: 'games',
      description: 'Your Welcome Hub.', meta: 'HOME',
      art: makeArt('WELCOME', ['#111b2b','#326aa1','#080f19'], 'ring'),
      cover: './assets/background-default.svg', icon: makeSymbolIcon('welcome'), launch: 'welcome', order: 1,
    },
    {
      id: 'uncharted', title: 'Uncharted', category: 'games',
      description: 'An adventure-style demo entry. Replace the artwork or URL from Settings → Apps.', meta: 'GAME',
      art: makeArt('UNCHARTED', ['#352219','#b26e35','#101820'], 'mountain'),
      cover: makeArt('UNCHARTED', ['#261c18','#8b522e','#071018'], 'mountain'),
      icon: makeIconArt('U', ['#8b542f','#241b17']), launch: 'https://example.com', order: 2,
    },
    {
      id: 'astro-bot', title: 'Astro Bot', category: 'games',
      description: 'A bright platforming-style demo entry with its own hub art.', meta: 'GAME',
      art: makeArt('ASTRO BOT', ['#163c68','#49b1e4','#10223a'], 'stars'),
      cover: makeArt('ASTRO BOT', ['#153861','#43acd9','#071523'], 'stars'),
      icon: makeIconArt('A', ['#2f88bd','#0f2744']), launch: 'https://example.com', order: 3,
    },
    {
      id: 'astros-playroom', title: "Astro's Playroom", category: 'games',
      description: 'A colorful demo tile for the local home library.', meta: 'GAME',
      art: makeArt("ASTRO'S PLAYROOM", ['#17324b','#4bbbe1','#0d1821'], 'play'),
      cover: makeArt("ASTRO'S PLAYROOM", ['#163a56','#43b8df','#0b141c'], 'play'),
      icon: makeIconArt('P', ['#2c7da3','#10253a']), launch: 'https://example.com', order: 4,
    },
    {
      id: 'tlou', title: 'The Last of Us Part I', category: 'games',
      description: 'A darker demo tile. Use Settings → Apps to replace it with your own web game.', meta: 'GAME',
      art: makeArt('THE LAST OF US', ['#1c1d19','#5f6557','#0a0c0b'], 'leaves'),
      cover: makeArt('THE LAST OF US', ['#181a17','#4e564a','#080b0a'], 'leaves'),
      icon: makeIconArt('L', ['#51574b','#171a16']), launch: 'https://example.com', order: 5,
    },
    {
      id: 'library', title: 'Game Library', category: 'games',
      description: 'View every built-in and custom web app in one place.', meta: 'LIBRARY',
      art: makeArt('GAME LIBRARY', ['#1c1d21','#555961','#0b0d10'], 'grid'),
      cover: makeArt('GAME LIBRARY', ['#1a1c20','#555c63','#090b0e'], 'grid'),
      icon: makeSymbolIcon('library'), launch: 'library', order: 6,
    },
    {
      id: 'media-home', title: 'Media', category: 'media',
      description: 'A media-home entry for your video and music websites.', meta: 'MEDIA',
      art: makeArt('MEDIA', ['#171f2a','#4f7ea5','#0a1017'], 'play'),
      cover: makeArt('MEDIA', ['#17202b','#4b789f','#090f16'], 'play'),
      icon: makeSymbolIcon('media'), launch: 'https://www.youtube.com/', order: 0,
    },
  ];

  const BACKGROUND_PRESETS = [
    { id:'default', name:'PS5 Blue', src:'./assets/backgrounds/default.svg', note:'Dark blue signal artwork' },
    { id:'blue-wave', name:'Blue Wave', src:'./assets/backgrounds/blue-wave.svg', note:'Layered blue light trails' },
    { id:'violet-signal', name:'Violet Signal', src:'./assets/backgrounds/violet-signal.svg', note:'Purple-blue ambient lines' },
    { id:'midnight-grid', name:'Midnight Grid', src:'./assets/backgrounds/midnight-grid.svg', note:'Subtle geometric mesh' },
    { id:'aurora-rings', name:'Aurora Rings', src:'./assets/backgrounds/aurora-rings.svg', note:'Soft cyan orbital glow' },
    { id:'blueprint', name:'Blueprint', src:'./assets/backgrounds/blueprint.svg', note:'Technical console lines' },
    { id:'black-glass', name:'Black Glass', src:'./assets/backgrounds/black-glass.svg', note:'Minimal dark glass' },
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
    $('#profileButton').innerHTML = svg('profile');
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
    if (matchMedia('(pointer: coarse)').matches) {
      document.documentElement.classList.remove('keyboard-mode');
    }
  }

  function onPointerDown(e) {
    unlockAndSyncMusic();
    state.keyboard = false;
    state.keyboardRegion = null;
    state.keyboardTargetId = null;
    document.documentElement.classList.remove('keyboard-mode');
    clearKeyboardFocus();
    if (e?.target instanceof HTMLElement && !e.target.closest('.focusable')) return;
  }

  function focusElement(el, region = null, targetId = null, announce = false) {
    if (!el) return;
    state.keyboard = true;
    state.keyboardRegion = region;
    state.keyboardTargetId = targetId || el.dataset?.id || el.id || null;
    document.documentElement.classList.add('keyboard-mode');
    clearKeyboardFocus();
    el.classList.add('keyboard-focus');
    el.focus({ preventScroll: true });
    if (announce) playUiSound('hover');
  }

  function homeKeyboardItems() {
    return [$('#gamesTab'), $('#mediaTab'), $('#searchButton'), $('#settingsButton'), $('#profileButton')].filter(Boolean);
  }

  function welcomeKeyboardItems() {
    return $$('.welcome-card.focusable');
  }

  function onKeyDown(e) {
    const targetTag = document.activeElement?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(targetTag)) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }

    unlockAndSyncMusic();
    state.keyboard = true;
    document.documentElement.classList.add('keyboard-mode');

    if (e.key === 'F1' || e.key.toLowerCase() === 'p') {
      e.preventDefault(); toggleControlCenter(); return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (state.controlCenter) { closeControlCenter(); return; }
      if (state.settingsOpen || $('.search-overlay')) { closeOverlay(); return; }
      closeProfileMenu(); clearKeyboardFocus(); return;
    }

    if (state.controlCenter) {
      if (navigateFocused(e, $$('.cc-control, .cc-card'))) return;
      return;
    }
    if (state.settingsOpen) { handleSettingsKey(e); return; }
    if ($('.search-overlay')) { handleSearchKey(e); return; }

    const active = document.activeElement;
    const tiles = $$('.app-tile');
    const tileIdx = tiles.indexOf(active);
    const welcomeCards = welcomeKeyboardItems();
    const cardIdx = welcomeCards.indexOf(active);
    const top = homeKeyboardItems();
    const topIdx = top.indexOf(active);
    const heroLaunch = $('#heroLaunch');
    const heroMore = $('#heroMore');
    const heroItems = [heroLaunch, heroMore].filter(Boolean);

    if (tileIdx >= 0) {
      if (e.key === 'ArrowRight') { e.preventDefault(); focusTile(tileIdx + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusTile(tileIdx - 1); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if ($('#homeStage').classList.contains('welcome-mode') && welcomeCards.length) focusElement(welcomeCards[0], 'welcome-card', welcomeCards[0].dataset.widget, true);
        else if (heroLaunch) focusElement(heroLaunch, 'hero', heroLaunch.id, true);
        return;
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); focusElement($('#gamesTab'), 'top', 'gamesTab', true); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launchCurrent(); return; }
      return;
    }

    if (cardIdx >= 0) {
      const cols = welcomeCards.map(b => Number(b.dataset.col || 0));
      const rows = welcomeCards.map(b => Number(b.dataset.row || 0));
      const col = cols[cardIdx], row = rows[cardIdx];
      let candidate = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const sameRow = welcomeCards.filter((b,i) => rows[i] === row).sort((a,b) => Number(a.dataset.col)-Number(b.dataset.col));
        const pos = sameRow.indexOf(active);
        candidate = sameRow[clamp(pos + dir,0,sameRow.length-1)];
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const sameCol = welcomeCards.filter((b,i) => cols[i] === col).sort((a,b) => Number(a.dataset.row)-Number(b.dataset.row));
        const pos = sameCol.indexOf(active);
        candidate = sameCol[clamp(pos + dir,0,sameCol.length-1)];
        if (pos === 0 && dir < 0) { e.preventDefault(); focusTile(findCurrentIndex()); return; }
      }
      if (candidate) { e.preventDefault(); focusElement(candidate, 'welcome-card', candidate.dataset.widget, true); candidate.scrollIntoView({behavior:'smooth',block:'nearest'}); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active.click(); return; }
      return;
    }

    if (heroItems.includes(active)) {
      const idx = heroItems.indexOf(active);
      if (e.key === 'ArrowRight') { e.preventDefault(); focusElement(heroItems[clamp(idx+1,0,heroItems.length-1)], 'hero', heroItems[clamp(idx+1,0,heroItems.length-1)].id, true); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusElement(heroItems[clamp(idx-1,0,heroItems.length-1)], 'hero', heroItems[clamp(idx-1,0,heroItems.length-1)].id, true); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); focusTile(findCurrentIndex()); return; }
      if (e.key === 'ArrowDown' && $('#homeStage').classList.contains('welcome-mode') && welcomeCards.length) { e.preventDefault(); focusElement(welcomeCards[0], 'welcome-card', welcomeCards[0].dataset.widget, true); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active.click(); return; }
      return;
    }

    if (topIdx >= 0) {
      if (e.key === 'ArrowRight') { e.preventDefault(); focusElement(top[clamp(topIdx+1,0,top.length-1)], 'top', top[clamp(topIdx+1,0,top.length-1)].id, true); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); focusElement(top[clamp(topIdx-1,0,top.length-1)], 'top', top[clamp(topIdx-1,0,top.length-1)].id, true); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); focusTile(findCurrentIndex()); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active.click(); return; }
      return;
    }

    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      focusTile(findCurrentIndex());
      return;
    }
    if (e.key.toLowerCase() === 's') { e.preventDefault(); openSettings('general'); return; }
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); openSearch(); }
  }
  function handleSettingsKey(e) {
    const nav = $$('.settings-nav button');
    const controls = $$('.panel .focusable');
    const active = document.activeElement;
    if (nav.includes(active)) {
      if (e.key === 'ArrowDown') { e.preventDefault(); cycleFocus(nav, +1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); cycleFocus(nav, -1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); focusElement(controls.find(x => !nav.includes(x)) || $('#settingsClose'), 'settings', 'settingsClose', true); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active.click(); return; }
    }
    if (active && controls.includes(active) && !nav.includes(active)) {
      const idx = controls.indexOf(active);
      if (e.key === 'ArrowUp') { e.preventDefault(); focusElement(nav[Math.min(Math.max(idx - 1,0), nav.length-1)], 'settings-nav', nav[Math.min(Math.max(idx - 1,0), nav.length-1)].dataset.section, true); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); active.click(); return; }
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
    if (idx < 0 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault(); focusElement(items[0], null, items[0].id || items[0].dataset?.id, true); return true;
    }
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = clamp(idx + 1,0,items.length-1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = clamp(idx - 1,0,items.length-1);
    if (next !== idx) { e.preventDefault(); focusElement(items[next], null, items[next].id || items[next].dataset?.id, true); return true; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); current?.click(); return true; }
    return false;
  }

  function cycleFocus(items, delta) {
    if (!items.length) return;
    const idx = Math.max(0, items.indexOf(document.activeElement));
    const next = clamp(idx + delta, 0, items.length - 1);
    focusElement(items[next], null, items[next].id || items[next].dataset?.id, true);
  }

  function markKeyboard(el) {
    focusElement(el, state.keyboardRegion, state.keyboardTargetId, false);
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
    const defaultHome = visible.find(a => a.id === 'welcome')?.id || visible[0]?.id || state.apps[0]?.id;
    state.currentId = visible.some(a => a.id === remembered) ? remembered : defaultHome;
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
    restoreKeyboardFocus();
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
      wrap.innerHTML = `<div class="empty-state" style="padding:42px 0;text-align:left">No media apps yet. Open Settings → Apps and add a website as a media app.</div>`;
      return;
    }

    // A small leading spacer recreates the partially-visible previous tile at the left edge.
    const lead = document.createElement('span');
    lead.className = 'carousel-spacer';
    lead.setAttribute('aria-hidden', 'true');
    wrap.appendChild(lead);

    apps.forEach((app, i) => {
      const slot = document.createElement('div');
      slot.className = 'app-slot' + (app.id === state.currentId ? ' is-active' : '');
      slot.dataset.id = app.id;

      const b = document.createElement('button');
      b.className = 'app-tile focusable';
      b.type = 'button';
      b.tabIndex = 0;
      b.dataset.id = app.id;
      b.dataset.index = i;
      b.setAttribute('role','option');
      b.setAttribute('aria-selected', app.id === state.currentId ? 'true' : 'false');
      const tileSrc = app.icon || app.art;
      b.innerHTML = `<img src="${escapeAttr(tileSrc)}" alt=""><span class="tile-label">${escapeHtml(app.title)}</span>`;
      b.addEventListener('click', (ev) => {
        if (!state.keyboard) ev.currentTarget.blur();
        selectApp(app, {focus:false, sound:true});
      });
      b.addEventListener('dblclick', () => launchApp(app));
      b.addEventListener('pointerenter', ev => {
        if (ev.pointerType === 'mouse') selectApp(app, {focus:false, sound:false, music:false});
      });
      if (app.id === state.currentId) b.classList.add('is-active');
      slot.appendChild(b);
      wrap.appendChild(slot);
    });

    requestAnimationFrame(() => {
      const current = wrap.querySelector(`.app-tile[data-id="${CSS.escape(state.currentId || '')}"]`);
      current?.scrollIntoView({ behavior:'auto', block:'nearest', inline:'center' });
      restoreKeyboardFocus();
    });
  }

  function restoreKeyboardFocus() {
    if (!state.keyboard || !state.keyboardTargetId) return;
    const id = String(state.keyboardTargetId);
    const target = document.getElementById(id) || document.querySelector(`[data-id="${CSS.escape(id)}"]`) || document.querySelector(`[data-widget="${CSS.escape(id)}"]`);
    if (target) {
      clearKeyboardFocus();
      target.classList.add('keyboard-focus');
      target.focus({preventScroll:true});
    }
  }
  function updateHero() {
    const app = getCurrentApp();
    if (!app) return;
    const welcome = app.id === 'welcome';
    $('#homeStage').classList.toggle('welcome-mode', welcome);
    $('#heroMeta').textContent = app.meta || (app.custom ? `CUSTOM · ${app.category.toUpperCase()}` : 'APP');
    $('#heroTitle').textContent = app.title;
    $('#heroDescription').textContent = app.description || '';
    $('#heroLaunch').textContent = app.launch === 'library' ? 'View' : app.launch === 'welcome' ? 'Welcome' : app.category === 'media' ? 'Open' : 'Play';
    const background = app.id === 'welcome'
      ? (state.settings.homeBackground || './assets/backgrounds/default.svg')
      : (app.cover || app.art || app.icon || './assets/backgrounds/default.svg');
    $('#ambientBg').style.backgroundImage = `url("${escapeCssUrl(background)}")`;
    $('#ambientBg').style.filter = `saturate(1.08) blur(${Math.max(0, state.settings.blur / 7)}px)`;
    $('#ambientBg').style.transform = state.settings.reduceMotion ? 'scale(1.012)' : 'scale(1.025)';
    $('#heroLaunch').dataset.id = app.id;
  }
  function renderWidgets() {
    const host = $('#welcomeWidgets');
    host.innerHTML = '';
    host.style.display = state.settings.showWidgets ? '' : 'none';
    if (!state.settings.showWidgets || state.currentId !== 'welcome') return;

    const store = state.apps.find(a => a.id === 'ps-store');
    const wish = state.apps.find(a => a.id === 'astro-bot') || state.apps.find(a => a.custom) || store;
    const activity = state.apps.find(a => a.id === 'tlou') || state.apps[0];

    host.innerHTML = `
      <div class="welcome-column">
        <button class="welcome-card large focusable" type="button" data-widget="friends" data-col="0" data-row="0">
          <div class="card-head"><span class="head-icon">☻</span><span>Online Friends</span><span class="online-dot"></span><span class="head-value">4</span></div>
          <div class="friends-body"><div class="avatar-row"><span class="avatar">A</span><span class="avatar">S</span><span class="avatar">L</span><span class="avatar">M</span></div><div class="friend-names">Zane Richardsons, Space_Carrot10, DrujiceXI,<br>Elisa Woods</div></div>
        </button>
        <button class="welcome-card focusable store-card" type="button" data-widget="store" data-col="0" data-row="1">
          <div class="store-body" style="background-image:url('${escapeAttr(store?.art || './assets/background-default.svg')}')"></div>
          <div class="card-head"><span class="head-icon">▣</span><span>PlayStation Store</span></div>
          <div class="store-copy">Horizon-style adventure collection</div>
          <div class="store-badge"><span class="platform-badge">PS5</span><span class="platform-badge">PS4</span></div>
        </button>
      </div>

      <div class="welcome-column">
        <button class="welcome-card focusable" type="button" data-widget="accessibility" data-col="1" data-row="0">
          <div class="card-head"><span class="head-icon">◎</span><span>Accessibility</span></div><div class="accessibility-symbol"></div><div class="accessibility-copy">Make your PS5 more usable for you.</div>
        </button>
        <button class="welcome-card large focusable" type="button" data-widget="trophies" data-col="1" data-row="1">
          <div class="card-head"><span class="head-icon">♜</span><span>Trophies</span><span class="head-value">Total: 380</span></div>
          <div class="trophy-body"><div class="trophy-row"><div class="trophy"><div class="trophy-symbol">✦</div><div class="trophy-value">1</div></div><div class="trophy"><div class="trophy-symbol">★</div><div class="trophy-value">20</div></div><div class="trophy"><div class="trophy-symbol">★</div><div class="trophy-value">67</div></div><div class="trophy"><div class="trophy-symbol">★</div><div class="trophy-value">292</div></div></div><div class="trophy-footer"><span>◉</span><span>Level 128</span><div class="trophy-progress"><span></span></div><span>33%</span></div></div>
        </button>
      </div>

      <div class="welcome-column">
        <button class="welcome-card focusable" type="button" data-widget="controllers" data-col="2" data-row="0">
          <div class="card-head"><span class="head-icon">⌁</span><span>Accessories</span></div>
          <div class="controllers-body"><div class="controller-meter"><div class="controller-ring"></div><div class="battery-bar"></div></div><div class="controller-meter"><div class="controller-ring"></div><div class="battery-bar"></div></div><div class="controller-meter"><div class="controller-ring low"></div><div class="battery-bar low"></div></div></div>
        </button>
        <button class="welcome-card large focusable" type="button" data-widget="wishlist" data-col="2" data-row="1">
          <div class="wishlist-body" style="background-image:url('${escapeAttr(wish?.art || './assets/background-default.svg')}')"></div>
          <div class="card-head"><span class="head-icon">♥</span><span>Wishlist</span></div><div class="wishlist-copy">${escapeHtml(wish?.title || 'Your wishlist')}</div>
          <div class="store-badge"><span class="platform-badge">PS5</span><span class="platform-badge">PS4</span></div>
        </button>
      </div>

      <div class="welcome-column">
        <button class="welcome-card large focusable" type="button" data-widget="activity" data-col="3" data-row="0">
          <div class="card-head"><span class="head-icon">☻</span><span>Friend Activity</span></div><div class="activity-body"><div class="activity-game">A friend just started playing a new game.</div><div class="activity-sub">First time here? Add your websites from Settings.</div>${activity?.art ? `<img class="activity-thumb" src="${escapeAttr(activity.art)}" alt="">` : ''}</div>
        </button>
      </div>`;

    $$('.welcome-card', host).forEach(card => {
      card.addEventListener('click', () => {
        if (!state.keyboard) card.blur();
        playUiSound('select');
        const action = card.dataset.widget;
        if (action === 'store') selectApp(store, {focus:false, sound:false});
        if (action === 'wishlist') selectApp(wish, {focus:false, sound:false});
        if (action === 'accessibility') openSettings('general');
        if (action === 'trophies') toast('Trophy data is local-only in this PWA.');
        if (action === 'friends') toast('Friends are represented locally. No account is connected.');
        if (action === 'controllers') toast('Controller status is visual-only in this PWA.');
        if (action === 'activity') toast('Friend Activity is a local mock card.');
      });
    });
    restoreKeyboardFocus();
  }
  function getRecentApps() {
    const order = state.apps.filter(a => a.lastOpened).sort((a,b) => b.lastOpened - a.lastOpened);
    return order.length ? order : [getCurrentApp()];
  }

  function selectApp(app, {focus = false, sound = true, music = true} = {}) {
    if (!app) return;
    const changed = state.currentId !== app.id;
    state.currentId = app.id;
    app.lastOpened = Date.now();
    if (app.custom) dbPut(STORE_APPS, app).catch(console.warn);
    saveMeta().catch(console.warn);
    if (changed) {
      renderCarousel();
      updateHero();
      renderWidgets();
    }
    if (sound) playUiSound('hover');
    if (music && changed) syncMusic(app);
    if (focus) {
      state.keyboardTargetId = app.id;
      requestAnimationFrame(() => restoreKeyboardFocus());
    }
  }

  function switchTab(tab) {
    if (state.currentTab === tab) return;
    state.currentTab = tab;
    const first = getVisibleApps()[0];
    if (first) state.currentId = first.id;
    saveMeta().catch(console.warn);
    renderTabs(); renderCarousel(); updateHero(); renderWidgets();
    playUiSound('select');
    syncMusic(getCurrentApp());
    if (state.keyboard) requestAnimationFrame(() => focusTile(findCurrentIndex()));
  }

  function focusTile(index) {
    const tiles = $$('.app-tile');
    if (!tiles.length) return;
    const b = tiles[clamp(index,0,tiles.length-1)];
    const app = state.apps.find(a => a.id === b.dataset.id);
    if (!app) return;
    state.keyboardRegion = 'tile';
    state.keyboardTargetId = app.id;
    state.keyboard = true;
    document.documentElement.classList.add('keyboard-mode');
    selectApp(app, {focus:true, sound:true});
    requestAnimationFrame(() => {
      const fresh = document.querySelector(`.app-tile[data-id="${CSS.escape(app.id)}"]`);
      if (!fresh) return;
      fresh.scrollIntoView({behavior:state.settings.reduceMotion ? 'auto' : 'smooth',block:'nearest',inline:'center'});
      focusElement(fresh,'tile',app.id,false);
    });
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
    if (state.controlCenter) setTimeout(() => { const first = $$('.cc-control')[0]; if (first && state.keyboard) focusElement(first, 'cc', first.id, false); }, 20);
  }

  function closeControlCenter() {
    if (!state.controlCenter) return;
    state.controlCenter = false;
    $('#controlCenter').classList.remove('is-open');
    $('#controlCenter').setAttribute('aria-hidden', 'true');
    playUiSound('back');
    if (state.keyboard) { state.keyboardRegion = 'tile'; state.keyboardTargetId = state.currentId; requestAnimationFrame(() => restoreKeyboardFocus()); }
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
    if (state.keyboard) setTimeout(() => { const first = $('.settings-nav button'); if (first) focusElement(first, 'settings-nav', first.dataset.section, false); }, 20);
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
    const current = state.settings.homeBackground || '';
    const cards = BACKGROUND_PRESETS.map(bg => `<button class="bg-preset focusable ${current === bg.src ? 'is-selected' : ''}" type="button" data-background="${escapeAttr(bg.src)}" data-bg-id="${escapeAttr(bg.id)}"><span class="bg-thumb" style="background-image:url('${escapeAttr(bg.src)}')"></span><span class="bg-preset-copy"><strong>${escapeHtml(bg.name)}</strong><small>${escapeHtml(bg.note)}</small></span><span class="bg-check">✓</span></button>`).join('');
    const custom = current && !BACKGROUND_PRESETS.some(bg => bg.src === current);
    const selectedPreset = BACKGROUND_PRESETS.find(bg => bg.src === current);
    const selectedName = selectedPreset?.name || (custom ? 'Custom image' : 'PS5 Blue');
    return `<div class="settings-section"><h3>Background</h3><div class="background-current-preview" style="background-image:url('${escapeAttr(current || './assets/backgrounds/default.svg')}')"><div class="background-current-scrim"></div><div class="background-current-copy"><span>Welcome home</span><strong>${escapeHtml(selectedName)}</strong><small>Selected for your home screen</small></div></div><p class="settings-intro">Choose the atmosphere used by the Welcome home. Presets are local, lightweight and designed to stay readable under the UI.</p><div class="background-gallery">${cards}<label class="bg-preset bg-upload focusable"><input id="backgroundFile" type="file" accept="image/*" hidden><span class="bg-upload-art">＋</span><span class="bg-preset-copy"><strong>${custom ? 'Custom image' : 'Use your image'}</strong><small>${custom ? 'Current custom background' : 'Choose from this device'}</small></span></label></div></div><div class="settings-section"><h3>Background depth</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Background blur</div><div class="sr-sub">Keep a little depth behind the home tiles without washing out the artwork.</div></div><input id="blurRange" type="range" min="0" max="50" value="${state.settings.blur}" style="width:190px"></div></div></div><div class="settings-section"><h3>Design</h3><div class="settings-card"><div class="setting-row"><div><div class="sr-title">Original visual recreation</div><div class="sr-sub">The console-style layout uses original HTML/CSS artwork and generated audio rather than bundled Sony system assets.</div></div></div></div></div>`;
  }

  function soundSettingsHtml() {
    return `<div class="settings-section"><h3>Audio</h3><div class="settings-card">${settingSwitch('homeMusic','Home background music','Play the built-in original ambient track while browsing the home screen.',state.settings.homeMusic)}${settingSwitch('uiSounds','UI sounds','Play short original interface tones for focus, selection and navigation.',state.settings.uiSounds)}${settingSwitch('autoMusic','Per-app music','Play an uploaded track while its custom app is selected.',state.settings.autoMusic)}<div class="setting-row"><div><div class="sr-title">Music volume</div><div class="sr-sub">Controls both the home ambience and uploaded app music.</div></div><input id="musicRange" type="range" min="0" max="1" step="0.01" value="${state.settings.musicVolume}" style="width:190px"></div><div class="setting-row"><div><div class="sr-title">UI volume</div><div class="sr-sub">Controls the original synthesized interface sounds.</div></div><input id="soundRange" type="range" min="0" max="1" step="0.01" value="${state.settings.soundVolume}" style="width:190px"></div></div></div><div class="settings-section"><div class="settings-card audio-note"><span class="audio-note-icon">♪</span><div><strong>Browser autoplay note</strong><p>The home track starts on the first keyboard or pointer interaction, which keeps the PWA compatible with browser autoplay rules.</p></div></div></div>`;
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
      applyTheme(); renderWidgets(); syncMusic(getCurrentApp());
      playUiSound('select');
    });
    $('#openMode')?.addEventListener('change', async e => { state.settings.openMode = e.target.value; await saveMeta(); });
    $('#blurRange')?.addEventListener('input', async e => { state.settings.blur = Number(e.target.value); updateHero(); await saveMeta(); });
    $('#soundRange')?.addEventListener('input', async e => { state.settings.soundVolume = Number(e.target.value); await saveMeta(); });
    $('#musicRange')?.addEventListener('input', async e => { state.settings.musicVolume = Number(e.target.value); if (state.audioEl) state.audioEl.volume = state.settings.musicVolume; await saveMeta(); });
    $$('.bg-preset[data-background]').forEach(b => b.addEventListener('click', async () => {
      state.settings.homeBackground = b.dataset.background;
      state.settings.backgroundPreset = b.dataset.bgId || null;
      await saveMeta();
      applyTheme();
      updateHero();
      renderSettingsSection(opts);
      playUiSound('select');
      toast('Welcome background changed.');
    }));
    $('#backgroundFile')?.addEventListener('change', async e => {
      const data = await fileToDataUrl(e.target.files?.[0]);
      if (!data) return;
      state.settings.homeBackground = data;
      state.settings.backgroundPreset = 'custom';
      await saveMeta();
      updateHero();
      renderSettingsSection(opts);
      playUiSound('select');
      toast('Custom Welcome background saved.');
    });
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
    const bg = state.settings.homeBackground || './assets/backgrounds/default.svg';
    if (!state.controlCenter && !state.settingsOpen && state.currentId === 'welcome') {
      $('#ambientBg').style.backgroundImage = `url("${escapeCssUrl(bg)}")`;
    }
  }

  async function unlockAndSyncMusic() {
    if (state.settings.uiSounds && !state.audioContext) {
      try { state.audioContext = new AudioContext(); } catch {}
    }
    if (state.audioContext?.state === 'suspended') state.audioContext.resume().catch(() => {});
    if (!state.audioEl) await syncMusic(getCurrentApp());
  }

  async function syncMusic(app) {
    stopMusic();
    if ((state.settings.autoMusic && app?.music)) {
      try {
        const blob = dataUrlToBlob(app.music);
        state.audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(state.audioUrl);
        audio.loop = true;
        audio.volume = state.settings.musicVolume;
        state.audioEl = audio;
        await audio.play();
        return;
      } catch (err) {
        stopMusic();
      }
    }
    if (!state.settings.homeMusic) return;
    try {
      const audio = new Audio('./assets/audio/home-ambient.mp3');
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = state.settings.musicVolume;
      state.audioEl = audio;
      await audio.play();
    } catch (err) {
      // Browser autoplay may require another user gesture.
    }
  }

  function stopMusic() {
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
      state.settings[b.dataset.setting] = !state.settings[b.dataset.setting];
      b.classList.toggle('is-on');
      await saveMeta();
      if (b.dataset.setting === 'homeMusic' || b.dataset.setting === 'autoMusic') syncMusic(getCurrentApp());
      playUiSound('select');
    });
  }

  function closeOverlay() {
    state.settingsOpen = false;
    $('#overlayLayer').innerHTML = '';
    $('#overlayLayer').setAttribute('aria-hidden','true');
    renderWidgets();
    syncMusic(getCurrentApp());
    if (state.keyboard) { state.keyboardRegion = 'tile'; state.keyboardTargetId = state.currentId; requestAnimationFrame(() => restoreKeyboardFocus()); }
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
    $('#clock').textContent = d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',hour12:true}).replace(/\s/g,'').toUpperCase();
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
      mountain: `<path d="M0 820L360 410l210 260 250-330 410 480 250-260 430 390H0z" fill="#fff" opacity=".15"/><path d="M210 650l150-240 70 90" fill="none" stroke="#fff" stroke-opacity=".26" stroke-width="22"/>`,
      leaves: `<g fill="none" stroke="#dce8d8" stroke-opacity=".20" stroke-width="18"><path d="M1250 830C1280 590 1400 350 1640 180"/><path d="M1350 690c-150-80-240-170-300-320"/><path d="M1470 570c150-80 245-165 310-295"/><path d="M1180 820c130-70 210-160 250-275"/></g>`,
    };
    const svgText = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient><radialGradient id="r"><stop stop-color="#fff" stop-opacity=".20"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><circle cx="1440" cy="350" r="520" fill="url(#r)"/>${motifs[motif]||motifs.grid}<rect width="1920" height="1080" fill="url(#g)" opacity=".11"/><text x="120" y="850" fill="#fff" fill-opacity=".90" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" letter-spacing="5">${safe}</text></svg>`);
    return `data:image/svg+xml;charset=utf-8,${svgText}`;
  }

  function makeIconArt(letter, colors) {
    const [a,b] = colors;
    const s = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="256" height="256" rx="58" fill="url(#g)"/><circle cx="178" cy="70" r="68" fill="#fff" opacity=".08"/><text x="128" y="155" text-anchor="middle" fill="#fff" font-family="Arial,Helvetica,sans-serif" font-size="110" font-weight="750">${String(letter).slice(0,2)}</text></svg>`);
    return `data:image/svg+xml;charset=utf-8,${s}`;
  }


  function makeSymbolIcon(kind) {
    const bg = kind === 'store' ? '#0b80c9' : '#20252b';
    const svgMap = {
      welcome: `<rect x="55" y="55" width="58" height="58" fill="none" stroke="#fff" stroke-width="8"/><polygon points="168,53 205,90 168,127" fill="none" stroke="#fff" stroke-width="8"/><path d="M60 166l48 48 48-48" fill="none" stroke="#fff" stroke-width="8"/><circle cx="185" cy="185" r="27" fill="none" stroke="#fff" stroke-width="8"/>`,
      store: `<rect x="78" y="70" width="100" height="120" rx="10" fill="none" stroke="#fff" stroke-width="8"/><path d="M92 78c4-28 20-40 36-40s32 12 36 40" fill="none" stroke="#fff" stroke-width="8"/><path d="M101 122h54" stroke="#fff" stroke-width="8"/>`,
      library: `<rect x="48" y="48" width="58" height="58" rx="5" fill="none" stroke="#fff" stroke-width="8"/><rect x="150" y="48" width="58" height="58" rx="5" fill="none" stroke="#fff" stroke-width="8"/><rect x="48" y="150" width="58" height="58" rx="5" fill="none" stroke="#fff" stroke-width="8"/><rect x="150" y="150" width="58" height="58" rx="5" fill="none" stroke="#fff" stroke-width="8"/>`,
      media: `<path d="M92 60l91 68-91 68V60z" fill="none" stroke="#fff" stroke-width="8"/>`
    };
    const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="34" fill="${bg}"/>${svgMap[kind] || svgMap.library}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
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
      profile: '<rect x="4.5" y="4.5" width="15" height="15" rx="4"/><circle cx="9" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r="1" fill="currentColor" stroke="none"/><path d="M8 14c1.2 1.3 2.8 1.9 4 1.9s2.8-.6 4-1.9"/>',
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${p[name] || p.library}</svg>`;
  }

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g,'&#39;'); }
  function escapeCssUrl(s) { return String(s || '').replace(/(["\\)])/g,'\\$1'); }
})();
