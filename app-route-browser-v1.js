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

  function browserIcon(meta) {
    if (String(meta.icon).startsWith('assets/')) {
      return `<img src="${escapeHtml(meta.icon)}" alt="${escapeHtml(meta.label)}">`;
    }
    return `<span class="app-browser-emoji">${escapeHtml(meta.icon)}</span>`;
  }

  function browserCard(store, key, meta) {
    const url = routeFor(store, key);
    const external = /^https?:/i.test(url);
    const target = external ? ' target="_blank" rel="noopener"' : '';
    const image = store.img || store.image || 'assets/store1.jpg';
    const area = store.area || store.district || '여수';
    const category = store.cat || store.category || '음식점';
    return `<a class="app-browser-card" href="${escapeHtml(url)}"${target}>
      <img class="app-browser-photo" src="${escapeHtml(image)}" alt="${escapeHtml(store.name)}" onerror="this.src='assets/store1.jpg'">
      <div class="app-browser-info">
        <strong>${escapeHtml(store.name)}</strong>
        <small>${escapeHtml(area)} · ${escapeHtml(category)}</small>
        <span class="app-browser-only-icon" aria-label="${escapeHtml(meta.label)}">${browserIcon(meta)}</span>
      </div>
      <b class="app-browser-arrow">›</b>
    </a>`;
  }

  function openAppBrowser(key) {
    const meta = APP_BROWSER_META[key];
    if (!meta || typeof openModal !== 'function') return;
    const available = (Array.isArray(stores) ? stores : []).filter(store => Boolean(routeFor(store, key)));
    const ordered = typeof stableSort === 'function' ? stableSort(available) : available;
    const installButton = meta.installUrl
      ? `<a class="app-browser-install" href="${escapeHtml(meta.installUrl)}" target="_blank" rel="noopener">앱 설치</a>`
      : '';
    const cards = ordered.length
      ? ordered.map(store => browserCard(store, key, meta)).join('')
      : `<div class="app-browser-empty">현재 ${escapeHtml(meta.label)} 주문 링크가 등록된 가게가 없습니다.</div>`;

    openModal(`<section class="app-browser" data-app="${escapeHtml(key)}">
      <header class="app-browser-head">
        <span class="app-browser-head-icon">${browserIcon(meta)}</span>
        <div><h2>${escapeHtml(meta.label)} 주문 가능 가게</h2><p>${ordered.length}곳</p></div>
        ${installButton}
      </header>
      <p class="app-browser-guide">가게를 누르면 해당 가게의 ${escapeHtml(meta.label)} 주문 화면으로 이동합니다.</p>
      <div class="app-browser-list">${cards}</div>
    </section>`);
  }

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
