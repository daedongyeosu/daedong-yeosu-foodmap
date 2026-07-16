(() => {
  const POPUP_KEY = 'daedongLocalOrderPopupSeenAt';
  const HISTORY_KEY = 'daedongPreferredOrderHistoryV1';
  const NUDGE_PREFIX = 'daedongExternalOrderNudge:';
  const POPUP_INTERVAL = 7 * 24 * 60 * 60 * 1000;
  const NUDGE_INTERVAL = 24 * 60 * 60 * 1000;
  const LOW_COST_KEYS = ['direct', 'mukkebi', 'ddangyo', 'brand', 'phone', 'ondongne'];
  const EXTERNAL_KEYS = ['baemin', 'coupang', 'yogiyo'];
  const META = {
    direct: {label: '가게바로주문', icon: '🏪'},
    mukkebi: {label: '먹깨비', icon: 'assets/mukkebi-v7.png'},
    ddangyo: {label: '땡겨요', icon: 'assets/ddangyo-v7.png'},
    brand: {label: '브랜드앱', icon: 'B'},
    phone: {label: '전화주문', icon: '☎'},
    ondongne: {label: '온동네', icon: 'assets/ondongne.png'},
    baemin: {label: '배달의민족'},
    coupang: {label: '쿠팡이츠'},
    yogiyo: {label: '요기요'}
  };

  const clean = value => String(value ?? '').trim();
  const escHtml = value => clean(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }

  function routeKeyFromText(text = '') {
    const value = clean(text).toLowerCase().replace(/\s+/g, '');
    if (value.includes('가게바로') || value.includes('직접주문') || value.includes('자동접수')) return 'direct';
    if (value.includes('브랜드앱') || value.includes('자사앱')) return 'brand';
    if (value.includes('먹깨비')) return 'mukkebi';
    if (value.includes('땡겨요')) return 'ddangyo';
    if (value.includes('온동네')) return 'ondongne';
    if (value.includes('요기요')) return 'yogiyo';
    if (value.includes('쿠팡')) return 'coupang';
    if (value.includes('배달의민족') || value.includes('배민')) return 'baemin';
    if (value.includes('전화') || value.includes('통화') || value.includes('tel:')) return 'phone';
    return '';
  }

  function keyFromLink(link) {
    if (!link) return '';
    if (link.dataset.routeKey) return link.dataset.routeKey;
    const alt = [...link.querySelectorAll('img')].map(image => image.alt || '').join(' ');
    return routeKeyFromText(`${link.textContent || ''} ${alt} ${link.getAttribute('href') || ''}`);
  }

  function storeById(id) {
    if (!id || !Array.isArray(window.stores || stores)) return null;
    const list = window.stores || stores;
    return list.find(store => String(store.id) === String(id)) || null;
  }

  function storeFromElement(element) {
    const explicit = element.closest('[data-store-id]')?.dataset.storeId;
    if (explicit) return storeById(explicit);
    const cardId = element.closest('.store-card')?.dataset.id;
    if (cardId) return storeById(cardId);
    const name = clean(element.closest('.app-browser-card')?.querySelector('strong')?.textContent || document.querySelector('#modal .store-detail-head h2')?.textContent);
    if (!name) return null;
    const list = window.stores || stores || [];
    return list.find(store => clean(store.name) === name) || null;
  }

  function routeUrl(store, key) {
    if (!store || !key) return '';
    if (store.links?.[key]) return store.links[key];
    const route = (store.routes || []).find(item => item && item.enabled !== false && item.url && routeKeyFromText(`${item.name} ${item.url}`) === key);
    return route?.url || '';
  }

  function lowCostRoutes(store) {
    return LOW_COST_KEYS.map(key => ({key, url: routeUrl(store, key), meta: META[key]})).filter(item => item.url);
  }

  function iconHtml(meta) {
    if (!meta) return '';
    if (String(meta.icon || '').startsWith('assets/')) return `<img src="${escHtml(meta.icon)}" alt="${escHtml(meta.label)}">`;
    return `<span class="community-choice-emoji">${escHtml(meta.icon || '♥')}</span>`;
  }

  function ensureToast() {
    let toast = document.querySelector('#communityOrderToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'communityOrderToast';
      toast.className = 'community-toast';
      document.body.appendChild(toast);
    }
    return toast;
  }

  function toast(message) {
    const element = ensureToast();
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2800);
  }

  function savePreferredChoice(store, key) {
    if (!store) return;
    const history = readJson(HISTORY_KEY, []);
    const next = [{storeId: store.id, storeName: store.name, routeKey: key, selectedAt: new Date().toISOString()}, ...history.filter(item => !(String(item.storeId) === String(store.id) && item.routeKey === key))].slice(0, 60);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  function closeCampaignOverlay() {
    document.querySelector('#communityOrderOverlay')?.remove();
    document.body.style.overflow = '';
  }

  function showCampaignPopup() {
    if (document.querySelector('#communityOrderOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'communityOrderOverlay';
    overlay.className = 'community-order-overlay';
    overlay.innerHTML = `<div class="community-order-card" role="dialog" aria-modal="true" aria-label="여수에 남는 주문 안내">
      <button class="community-order-close" aria-label="닫기">×</button>
      <span class="community-order-kicker">💚 여수에 힘이 되는 주문</span>
      <h2>오늘의 한 끼,<br>여수에 남는 주문으로</h2>
      <p class="community-order-lead">같은 음식을 주문해도 어떤 방법으로 주문하느냐에 따라 가게가 부담하는 비용은 달라질 수 있습니다.</p>
      <p class="community-order-emphasis">가능하다면 가게바로주문 · 먹깨비 · 땡겨요 · 온동네 · 브랜드앱 · 전화주문을 먼저 살펴봐 주세요.</p>
      <p class="community-order-lead">고객님의 한 번의 선택이 여수의 가게와 일자리, 우리 동네 경제에 힘이 됩니다.</p>
      <div class="community-order-actions"><button class="community-order-primary" data-community-scroll>여수에 남는 주문 보기</button><button class="community-order-secondary" data-community-close>모든 주문방법 보기</button></div>
      <p class="community-order-note">주문방법은 자유롭게 선택하실 수 있습니다. 대동여수음식지도는 가게 부담이 적은 주문방법을 먼저 안내합니다.</p>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    localStorage.setItem(POPUP_KEY, String(Date.now()));
  }

  function showExternalChoice(store, selectedKey, selectedUrl) {
    const routes = lowCostRoutes(store);
    if (!routes.length) return false;
    closeCampaignOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'communityOrderOverlay';
    overlay.className = 'community-order-overlay';
    overlay.innerHTML = `<div class="community-order-card" role="dialog" aria-modal="true">
      <button class="community-order-close" aria-label="닫기">×</button>
      <span class="community-order-kicker">💚 잠깐만요</span>
      <h2>이 가게는 부담이 더 적은 주문방법도 있습니다</h2>
      <p class="community-order-lead"><b>${escHtml(store.name)}</b>을 주문하면서 우리 동네 가게에 조금 더 힘이 되는 방법을 선택하실 수 있습니다.</p>
      <div class="community-choice-list">${routes.map(item => `<a class="community-choice-link" data-community-low="${escHtml(item.key)}" data-store-id="${escHtml(store.id)}" href="${escHtml(item.url)}" ${/^https?:/i.test(item.url) ? 'target="_blank" rel="noopener"' : ''}>${iconHtml(item.meta)}<span>${escHtml(item.meta.label)}</span><b>›</b></a>`).join('')}</div>
      <button class="community-choice-continue" data-community-continue data-url="${escHtml(selectedUrl)}" data-route="${escHtml(selectedKey)}">${escHtml(META[selectedKey]?.label || '선택한 주문앱')}으로 계속</button>
      <p class="community-order-note">어떤 주문방법을 선택하셔도 이용 가능합니다.</p>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    return true;
  }

  function addPersistentStrip() {
    if (document.querySelector('#localOrderStrip')) return;
    const searchRow = document.querySelector('.main-search-row');
    if (!searchRow) return;
    const strip = document.createElement('section');
    strip.id = 'localOrderStrip';
    strip.className = 'local-order-strip';
    strip.innerHTML = `<strong>같은 한 끼, 더 많은 힘이 여수에 남도록</strong><p>가게의 부담이 적은 주문방법을 먼저 선택해 주세요.</p><button type="button" data-community-scroll>여수에 힘이 되는 주문</button>`;
    searchRow.insertAdjacentElement('afterend', strip);
  }

  function maybeShowPopup() {
    const seenAt = Number(localStorage.getItem(POPUP_KEY) || 0);
    if (Date.now() - seenAt < POPUP_INTERVAL) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const modalOpen = !document.querySelector('#modal')?.hidden;
      const startupOpen = !document.querySelector('#startupAd')?.hidden;
      if (!modalOpen && !startupOpen) {
        clearInterval(timer);
        showCampaignPopup();
      } else if (attempts > 30) clearInterval(timer);
    }, 900);
  }

  function openUrl(url) {
    if (!url) return;
    if (/^https?:/i.test(url)) window.open(url, '_blank', 'noopener');
    else location.href = url;
  }

  document.addEventListener('click', event => {
    if (event.target.closest('.community-order-close,[data-community-close]')) {
      event.preventDefault();
      closeCampaignOverlay();
      return;
    }
    if (event.target.closest('[data-community-scroll]')) {
      event.preventDefault();
      closeCampaignOverlay();
      document.querySelector('.order-section')?.scrollIntoView({behavior: 'smooth', block: 'start'});
      return;
    }
    const lowChoice = event.target.closest('[data-community-low]');
    if (lowChoice) {
      const store = storeById(lowChoice.dataset.storeId);
      savePreferredChoice(store, lowChoice.dataset.communityLow);
      toast('고맙습니다. 고객님의 선택이 여수의 가게에 힘이 됩니다.');
      closeCampaignOverlay();
      return;
    }
    const continueButton = event.target.closest('[data-community-continue]');
    if (continueButton) {
      event.preventDefault();
      const url = continueButton.dataset.url;
      closeCampaignOverlay();
      openUrl(url);
      return;
    }
    if (event.target.id === 'communityOrderOverlay') closeCampaignOverlay();
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || link.closest('#communityOrderOverlay') || link.closest('.order-grid') || link.closest('#moreAppsPopover')) return;
    const key = keyFromLink(link);
    if (!key) return;
    const store = storeFromElement(link);
    if (!store) return;
    if (LOW_COST_KEYS.includes(key)) {
      savePreferredChoice(store, key);
      toast('고맙습니다. 여수에 힘이 되는 주문을 선택하셨습니다.');
      return;
    }
    if (!EXTERNAL_KEYS.includes(key)) return;
    const cheaper = lowCostRoutes(store);
    if (!cheaper.length) return;
    const nudgeKey = `${NUDGE_PREFIX}${store.id}:${key}`;
    const lastNudge = Number(localStorage.getItem(nudgeKey) || 0);
    if (Date.now() - lastNudge < NUDGE_INTERVAL) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    localStorage.setItem(nudgeKey, String(Date.now()));
    showExternalChoice(store, key, link.href);
  }, true);

  function start() {
    addPersistentStrip();
    maybeShowPopup();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
