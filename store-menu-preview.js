'use strict';

(() => {
  const MENU_STORES = Object.freeze({
    a089d1d54720b48e: 'data/store-menus/a089d1d54720b48e.json'
  });
  const menuCache = new Map();
  let activeStore = null;
  let activeMenu = null;
  let lastFocused = null;

  const escapeMenuHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  function storeById(id) {
    if (typeof fxStoreById === 'function') {
      const store = fxStoreById(id);
      if (store) return store;
    }
    if (typeof stores !== 'undefined' && Array.isArray(stores)) {
      const store = stores.find(item => String(item.id) === String(id));
      if (store) return store;
    }
    if (typeof allStores !== 'undefined' && Array.isArray(allStores)) {
      return allStores.find(item => String(item.id) === String(id)) || null;
    }
    return null;
  }

  function ensureMenuEntryButton() {
    for (const storeId of Object.keys(MENU_STORES)) {
      const detail = document.querySelector(`#modalContent .store-detail[data-store-id="${storeId}"]`);
      if (!detail || detail.querySelector('[data-store-menu-preview]')) continue;
      const target = detail.querySelector('.detail-routes') || detail.querySelector('.detail-personal-actions');
      if (!target) continue;
      target.insertAdjacentHTML('beforebegin', `
        <button class="store-menu-preview-entry" type="button" data-store-menu-preview="${storeId}">
          <img src="assets/store-menus/${storeId}/main.jpg" alt="">
          <span>
            <b>음식보기</b>
            <small>사진과 설명으로 전체 메뉴 미리보기 · 가격 미표시</small>
          </span>
          <strong>53개 ›</strong>
        </button>
      `);
    }
  }

  async function loadMenu(storeId) {
    if (menuCache.has(storeId)) return menuCache.get(storeId);
    const response = await fetch(MENU_STORES[storeId], {cache: 'no-store'});
    if (!response.ok) throw new Error(`메뉴 정보를 불러오지 못했습니다. (${response.status})`);
    const menu = await response.json();
    menuCache.set(storeId, menu);
    return menu;
  }

  function channelUrl(channel) {
    return channel?.url || channel?.appLink || '';
  }

  function phoneHref(channel) {
    const directPhone = String(channel?.phone || '').replace(/\D/g, '');
    if (directPhone) return `tel:${directPhone}`;
    const url = channelUrl(channel);
    if (String(url).startsWith('tel:')) return url;
    const routePhone = String(url).match(/tel(\d{9,12})/i)?.[1] || '';
    return routePhone ? `tel:${routePhone}` : url;
  }

  function channelIcon(key, channel) {
    if (key === 'direct') {
      return '<svg aria-hidden="true"><use href="assets/ui/ui-icons.svg#store"></use></svg>';
    }
    if (key === 'brand') {
      return channel?.icon
        ? `<img src="${escapeMenuHtml(channel.icon)}" alt="">`
        : '<svg aria-hidden="true"><use href="assets/ui/ui-icons.svg#store"></use></svg>';
    }
    if (key === 'mukkebi') return '<img src="assets/mukkebi-v7.png" alt="">';
    if (key === 'ddangyo') return '<img src="assets/ddangyo-v7.png" alt="">';
    if (key === 'ondongne') return '<img src="assets/ondongne.png" alt="">';
    if (key === 'phone') return '<img src="assets/ui/phone.svg" alt="">';
    return '';
  }

  function orderChannels(store) {
    if (!store || typeof resolveStoreChannels !== 'function') {
      return {primaryOrder: {}, externalOrder: {}};
    }
    return resolveStoreChannels(store) || {primaryOrder: {}, externalOrder: {}};
  }

  function primaryOrderMarkup(store) {
    const channels = orderChannels(store);
    const definitions = [
      ['direct', channels.primaryOrder?.directOrder, '가게바로주문 결제하기', '가게가 등록한 주문 페이지로 이동'],
      ['brand', channels.primaryOrder?.brandApp, '브랜드앱', '브랜드 공식 앱으로 이동'],
      ['mukkebi', channels.primaryOrder?.mukkebi, '먹깨비', '먹깨비로 주문'],
      ['ddangyo', channels.primaryOrder?.ddangyo, '땡겨요', '땡겨요로 주문'],
      ['ondongne', channels.primaryOrder?.ondongne, '온동네', '온동네로 주문'],
      ['phone', channels.primaryOrder?.phoneOrder, '전화주문하기', '통화 중에도 이 메뉴를 계속 볼 수 있어요']
    ];
    const available = definitions.filter(([, channel]) => Boolean(channel && (channelUrl(channel) || channel.phone)));
    if (!available.length) return '<p class="menu-order-empty">현재 연결된 주문방법을 확인 중입니다.</p>';
    return available.map(([key, channel, label, note]) => {
      const rawHref = key === 'phone' ? phoneHref(channel) : channelUrl(channel);
      const href = escapeMenuHtml(rawHref);
      const external = rawHref && !rawHref.startsWith('tel:') ? ' target="_blank" rel="noopener"' : '';
      const emphasis = key === 'direct' ? ' menu-order-card-direct' : key === 'phone' ? ' menu-order-card-phone' : '';
      return `
        <a class="menu-order-card${emphasis}" href="${href}"${external} data-menu-order="${key}">
          <span class="menu-order-icon">${channelIcon(key, channel)}</span>
          <span><b>${label}</b><small>${note}</small></span>
          <strong>›</strong>
        </a>
      `;
    }).join('');
  }

  function otherOrderMarkup(store) {
    const external = orderChannels(store).externalOrder || {};
    const definitions = [
      ['요기요', external.yogiyo],
      ['쿠팡이츠', external.coupangEats],
      ['배달의민족', external.baemin]
    ].filter(([, channel]) => Boolean(channelUrl(channel)));
    if (!definitions.length) return '';
    return `
      <div class="menu-other-orders">
        <button type="button" data-menu-other-toggle aria-expanded="false">
          다른 주문앱 보기 <span>${definitions.length}개</span>
        </button>
        <div class="menu-other-order-list" data-menu-other-list hidden>
          ${definitions.map(([label, channel]) => `
            <a href="${escapeMenuHtml(channelUrl(channel))}" target="_blank" rel="noopener">
              <span>${label}</span><b>›</b>
            </a>
          `).join('')}
          <small>앱 이름은 주문 경로 안내를 위해 표시되며, 공식 제휴·후원을 의미하지 않습니다.</small>
        </div>
      </div>
    `;
  }

  function menuCardMarkup(item) {
    const searchText = `${item.name} ${item.description} ${item.category}`.toLowerCase();
    return `
      <article class="store-menu-card" data-menu-card data-category="${escapeMenuHtml(item.category)}" data-search="${escapeMenuHtml(searchText)}">
        <div class="store-menu-photo">
          <img src="${escapeMenuHtml(item.image)}" alt="${escapeMenuHtml(item.name)}" loading="lazy" decoding="async">
          ${item.adultOnly ? '<span>19세 이상</span>' : ''}
        </div>
        <div class="store-menu-copy">
          <p>${escapeMenuHtml(item.category)}</p>
          <h3>${escapeMenuHtml(item.name)}</h3>
          ${item.description ? `<div>${escapeMenuHtml(item.description)}</div>` : ''}
        </div>
      </article>
    `;
  }

  function previewMarkup(menu, store) {
    const counts = menu.items.reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + 1;
      return result;
    }, {});
    const direct = orderChannels(store).primaryOrder?.directOrder;
    const phone = orderChannels(store).primaryOrder?.phoneOrder;
    const directHref = escapeMenuHtml(channelUrl(direct));
    const phoneLink = escapeMenuHtml(phoneHref(phone));
    return `
      <section class="store-menu-preview" role="dialog" aria-modal="true" aria-labelledby="storeMenuTitle">
        <header class="store-menu-topbar">
          <button type="button" data-menu-preview-close aria-label="메뉴 미리보기 닫기">‹</button>
          <strong>음식 미리보기</strong>
          <button type="button" data-menu-preview-close aria-label="메뉴 미리보기 닫기">×</button>
        </header>

        <main class="store-menu-scroll">
          <section class="store-menu-hero">
            <img src="${escapeMenuHtml(menu.mainImage)}" alt="${escapeMenuHtml(menu.displayName)}" fetchpriority="high">
            <div>
              <span>대동여수음식지도 · 음식 미리보기</span>
              <p>피자 · 세트 · 사이드</p>
              <h1 id="storeMenuTitle">${escapeMenuHtml(menu.displayName)}</h1>
              <p>주문방법을 고르기 전에 사진과 설명으로 메뉴를 먼저 살펴보세요.</p>
              <dl>
                <div><dt>${menu.items.length}</dt><dd>전체 메뉴</dd></div>
                <div><dt>${counts['피자'] || 0}</dt><dd>피자</dd></div>
                <div><dt>${counts['세트'] || 0}</dt><dd>세트</dd></div>
                <div><dt>${counts['사이드'] || 0}</dt><dd>사이드</dd></div>
              </dl>
            </div>
          </section>

          <section class="store-menu-tools">
            <label>
              <span aria-hidden="true">⌕</span>
              <input type="search" data-menu-search placeholder="메뉴 이름 또는 설명 검색" autocomplete="off">
            </label>
            <nav aria-label="메뉴 분류">
              ${menu.categories.map((category, index) => `
                <button type="button" data-menu-category="${escapeMenuHtml(category)}" class="${index === 0 ? 'active' : ''}">
                  ${escapeMenuHtml(category)}
                </button>
              `).join('')}
            </nav>
            <p><strong data-menu-result-count>${menu.items.length}</strong>개 메뉴 · 가격은 표시하지 않습니다.</p>
          </section>

          <section class="store-menu-grid" aria-live="polite">
            ${menu.items.map(menuCardMarkup).join('')}
          </section>
          <p class="store-menu-no-results" data-menu-no-results hidden>검색 조건에 맞는 메뉴가 없습니다.</p>

          <section class="store-menu-order">
            <span>메뉴를 고르셨나요?</span>
            <h2>어디서 주문할까요?</h2>
            <p>이 가게에 실제로 등록된 주문 링크만 보여드립니다.</p>
            <div class="menu-order-grid">${primaryOrderMarkup(store)}</div>
            ${otherOrderMarkup(store)}
          </section>

          <footer class="store-menu-notice">
            <p>주류는 만 19세 이상만 주문할 수 있습니다.</p>
            <p>메뉴 구성과 제공 여부는 가게 또는 주문앱 상황에 따라 달라질 수 있습니다.</p>
          </footer>
        </main>

        ${(directHref || phoneLink) ? `
          <div class="store-menu-sticky-actions">
            ${directHref ? `<a class="primary" href="${directHref}" target="_blank" rel="noopener">가게바로주문 결제하기</a>` : ''}
            ${phoneLink ? `<a class="phone" href="${phoneLink}"><img src="assets/ui/phone.svg" alt="">전화주문하기<small>통화 중 메뉴 보기</small></a>` : ''}
          </div>
        ` : ''}
      </section>
    `;
  }

  async function openMenuPreview(storeId, trigger) {
    const store = storeById(storeId);
    if (!store) return;
    lastFocused = trigger || document.activeElement;
    let overlay = document.querySelector('[data-store-menu-overlay]');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'store-menu-overlay';
      overlay.dataset.storeMenuOverlay = '';
      document.body.append(overlay);
    }
    overlay.hidden = false;
    overlay.innerHTML = '<div class="store-menu-loading" role="status">외계인피자 메뉴를 불러오는 중입니다…</div>';
    document.body.classList.add('store-menu-open');
    try {
      const menu = await loadMenu(storeId);
      activeStore = store;
      activeMenu = menu;
      overlay.innerHTML = previewMarkup(menu, store);
      overlay.querySelector('[data-menu-preview-close]')?.focus();
    } catch (error) {
      overlay.innerHTML = `
        <div class="store-menu-load-error" role="alert">
          <p>${escapeMenuHtml(error.message)}</p>
          <button type="button" data-menu-preview-close>닫기</button>
        </div>
      `;
    }
  }

  function closeMenuPreview() {
    const overlay = document.querySelector('[data-store-menu-overlay]');
    if (overlay) {
      overlay.hidden = true;
      overlay.innerHTML = '';
    }
    document.body.classList.remove('store-menu-open');
    activeStore = null;
    activeMenu = null;
    lastFocused?.focus?.();
    lastFocused = null;
  }

  function filterMenus(root) {
    if (!root || !activeMenu) return;
    const query = String(root.querySelector('[data-menu-search]')?.value || '').trim().toLowerCase();
    const category = root.querySelector('[data-menu-category].active')?.dataset.menuCategory || '전체';
    let visible = 0;
    root.querySelectorAll('[data-menu-card]').forEach(card => {
      const matchesCategory = category === '전체' || card.dataset.category === category;
      const matchesSearch = !query || card.dataset.search.includes(query);
      card.hidden = !(matchesCategory && matchesSearch);
      if (!card.hidden) visible += 1;
    });
    const count = root.querySelector('[data-menu-result-count]');
    if (count) count.textContent = String(visible);
    const empty = root.querySelector('[data-menu-no-results]');
    if (empty) empty.hidden = visible !== 0;
  }

  document.addEventListener('click', event => {
    const entry = event.target.closest('[data-store-menu-preview]');
    if (entry) {
      openMenuPreview(entry.dataset.storeMenuPreview, entry);
      return;
    }
    if (event.target.closest('[data-menu-preview-close]')) {
      closeMenuPreview();
      return;
    }
    const category = event.target.closest('[data-menu-category]');
    if (category) {
      const preview = category.closest('.store-menu-preview');
      preview.querySelectorAll('[data-menu-category]').forEach(button => button.classList.toggle('active', button === category));
      filterMenus(preview);
      return;
    }
    const other = event.target.closest('[data-menu-other-toggle]');
    if (other) {
      const list = other.parentElement.querySelector('[data-menu-other-list]');
      const expanded = other.getAttribute('aria-expanded') !== 'true';
      other.setAttribute('aria-expanded', String(expanded));
      list.hidden = !expanded;
    }
  });

  document.addEventListener('input', event => {
    if (event.target.matches('[data-menu-search]')) filterMenus(event.target.closest('.store-menu-preview'));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('store-menu-open')) closeMenuPreview();
  });

  new MutationObserver(ensureMenuEntryButton).observe(document.documentElement, {childList: true, subtree: true});
  ensureMenuEntryButton();
})();
