(() => {
  const APP_BROWSER_META = {
    direct: {label: '가게바로주문', icon: '🏪', installUrl: ''},
    brand: {label: '브랜드앱', icon: 'B', installUrl: ''},
    mukkebi: {label: '먹깨비', icon: 'assets/mukkebi-v7.png', installUrl: 'https://play.google.com/store/apps/details?id=mukkebi.user.app.android'},
    ddangyo: {label: '땡겨요', icon: 'assets/ddangyo-v7.png', installUrl: 'https://play.google.com/store/apps/details?id=com.shinhan.o2o'},
    ondongne: {label: '온동네', icon: 'assets/ondongne.png', installUrl: 'https://play.google.com/store/apps/details?id=kr.co.kncsol.ondongne'},
    yogiyo: {label: '요기요', icon: 'assets/yogiyo.jpg', installUrl: 'https://play.google.com/store/apps/details?id=com.fineapp.yogiyo'},
    coupang: {label: '쿠팡이츠', icon: 'assets/coupang-eats.jpg', installUrl: 'https://play.google.com/store/apps/details?id=com.coupang.mobile.eats'},
    baemin: {label: '배달의민족', icon: 'assets/baemin.jpg', installUrl: 'https://play.google.com/store/search?q=%EB%B0%B0%EB%8B%AC%EC%9D%98%EB%AF%BC%EC%A1%B1&c=apps'},
    phone: {label: '전화주문', icon: '☎', installUrl: ''}
  };
  const CATEGORY_ORDER = ['한식','치킨','피자','중식','분식','족발·보쌈','회·해산물','햄버거','고기·구이','야식·주점','마라탕·양꼬치','반찬','카페·디저트','음식점'];
  const cleanText = value => String(value ?? '').trim();
  const compact = value => cleanText(value).toLowerCase().replace(/\s+/g, '');
  const escapeHtml = value => cleanText(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function routeNameKey(name = '') {
    const value = compact(name);
    if (value.includes('가게바로') || value.includes('직접주문') || value.includes('자동접수')) return 'direct';
    if (value.includes('브랜드앱') || value.includes('자사앱')) return 'brand';
    if (value.includes('먹깨비')) return 'mukkebi';
    if (value.includes('땡겨요')) return 'ddangyo';
    if (value.includes('온동네')) return 'ondongne';
    if (value.includes('요기요')) return 'yogiyo';
    if (value.includes('쿠팡')) return 'coupang';
    if (value.includes('배달의민족') || value.includes('배민')) return 'baemin';
    if (value.includes('전화') || value.includes('통화') || value.includes('tel')) return 'phone';
    return '';
  }

  function keyFromLauncher(element) {
    const alt = [...element.querySelectorAll('img')].map(image => image.alt || '').join(' ');
    return routeNameKey(`${element.textContent || ''} ${alt}`);
  }

  function routeFor(store, key) {
    const directLink = store?.links?.[key];
    if (directLink) return directLink;
    const route = (store?.routes || []).find(item => item && item.enabled !== false && item.url && routeNameKey(item.name) === key);
    return route?.url || '';
  }

  function readJson(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function preferenceRanks(key) {
    const ranks = new Map();
    const choices = readJson('daedongPreferredOrderHistoryV1');
    choices.filter(item => item.routeKey === key).forEach((item, index) => {
      if (!ranks.has(String(item.storeId))) ranks.set(String(item.storeId), index);
    });
    const recent = readJson('daedongRecentStoresV2');
    recent.forEach((item, index) => {
      const id = String(item.storeId ?? item.id ?? item);
      if (!ranks.has(id)) ranks.set(id, 100 + index);
    });
    return ranks;
  }

  function orderedForApp(list, key) {
    const base = typeof stableSort === 'function' ? stableSort(list) : [...list];
    const ranks = preferenceRanks(key);
    return base.map((store, index) => ({store, index, pref: ranks.get(String(store.id)) ?? 9999, distance: Number.isFinite(store.distanceKm) ? store.distanceKm : Infinity}))
      .sort((a, b) => a.pref - b.pref || a.distance - b.distance || a.index - b.index)
      .map(item => item.store);
  }

  function browserIcon(meta) {
    if (String(meta.icon).startsWith('assets/')) return `<img src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.label)}">`;
    return `<span class="app-browser-emoji">${escapeHtml(meta.icon)}</span>`;
  }

  function browserCard(store, key, meta, index = 0) {
    const url = routeFor(store, key);
    const external = /^https?:/i.test(url);
    const target = external ? ' target="_blank" rel="noopener"' : '';
    const photo = window.DaedongPhotoDisplay?.attributes(store, 'card', index) || {src: store.img || store.image || 'assets/store1.jpg', loading: index >= 4 ? 'lazy' : 'eager'};
    const area = store.area || store.district || '여수';
    const category = store.cat || store.category || '음식점';
    const distance = Number.isFinite(store.distanceKm) ? `<em>${store.distanceKm < 1 ? `${Math.round(store.distanceKm * 1000)}m` : `${store.distanceKm.toFixed(1)}km`}</em>` : '';
    return `<a class="app-browser-card" data-store-id="${escapeHtml(store.id)}" href="${escapeHtml(url)}"${target}>
      <img class="app-browser-photo" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)}" loading="${photo.loading}" decoding="async" width="72" height="64" onerror="this.src='assets/store1.jpg'">
      <div class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(area)} · ${escapeHtml(category)} ${distance}</small><span class="app-browser-only-icon" aria-label="${escapeHtml(meta.label)}">${browserIcon(meta)}</span></div>
      <b class="app-browser-arrow">›</b>
    </a>`;
  }

  function categorySections(ordered, key, meta) {
    const ranks = preferenceRanks(key);
    const recent = ordered.filter(store => ranks.has(String(store.id))).slice(0, 8);
    const recentIds = new Set(recent.map(store => String(store.id)));
    const groups = new Map();
    for (const store of ordered) {
      if (recentIds.has(String(store.id))) continue;
      const category = cleanText(store.cat || store.category || '음식점');
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(store);
    }
    const sections = [];
    if (recent.length) sections.push(`<section class="app-browser-category preferred"><h3>이전에 이용한 가게</h3>${recent.map((store, index) => browserCard(store, key, meta, index)).join('')}</section>`);
    const categories = [...groups.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, 'ko');
    });
    for (const category of categories) {
      const list = groups.get(category);
      sections.push(`<section class="app-browser-category"><h3>${escapeHtml(category)}</h3>${list.map((store, index) => browserCard(store, key, meta, index + recent.length)).join('')}</section>`);
    }
    return sections.join('');
  }

  function openAppBrowser(key) {
    const meta = APP_BROWSER_META[key];
    if (!meta || typeof openModal !== 'function') return;
    const available = (Array.isArray(stores) ? stores : []).filter(store => Boolean(routeFor(store, key)));
    const ordered = orderedForApp(available, key);
    const installButton = meta.installUrl ? `<a class="app-browser-install" href="${escapeHtml(meta.installUrl)}" target="_blank" rel="noopener">앱 설치</a>` : '';
    const content = ordered.length ? categorySections(ordered, key, meta) : `<div class="app-browser-empty">현재 ${escapeHtml(meta.label)} 주문 링크가 등록된 가게가 없습니다.</div>`;
    openModal(`<section class="app-browser" data-app="${escapeHtml(key)}"><header class="app-browser-head"><span class="app-browser-head-icon">${browserIcon(meta)}</span><div><h2>${escapeHtml(meta.label)} 주문 가능 가게</h2><p>가까운 가게와 이전 이용 가게를 먼저 보여드립니다.</p></div>${installButton}</header><div class="app-browser-list">${content}</div></section>`);
  }

  window.DaedongAppBrowser = {open: openAppBrowser, routeFor};

  document.addEventListener('click', event => {
    const launcher = event.target.closest('.order-grid .order-item, #moreAppsPopover .external-apps a');
    if (!launcher) return;
    const key = keyFromLauncher(launcher);
    if (!key || !APP_BROWSER_META[key]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const popover = document.querySelector('#moreAppsPopover');
    if (popover) popover.hidden = true;
    openAppBrowser(key);
  }, true);
})();
