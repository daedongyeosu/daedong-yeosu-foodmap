(() => {
  const clean = value => String(value ?? '').trim();

  function stableHash(value) {
    let hash = 2166136261;
    const text = clean(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizePhoto(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      const src = clean(item);
      return src ? {card: src, detail: src} : null;
    }
    if (typeof item === 'object') {
      const card = clean(item.card || item.thumb || item.thumbnail || item.src || item.url || item.detail || item.full);
      const detail = clean(item.detail || item.full || item.src || item.url || card);
      if (!card && !detail) return null;
      return {card: card || detail, detail: detail || card};
    }
    return null;
  }

  function photoCandidates(store) {
    const values = [];
    for (const field of ['images', 'photoPool', 'imagePool', 'gallery']) {
      if (Array.isArray(store?.[field])) values.push(...store[field]);
    }
    const normalized = values.map(normalizePhoto).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const photo of normalized) {
      const key = `${photo.card}|${photo.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(photo);
    }
    if (unique.length) return unique;
    const fallback = normalizePhoto(store?.img || store?.image || 'assets/store1.jpg');
    return fallback ? [fallback] : [{card: 'assets/store1.jpg', detail: 'assets/store1.jpg'}];
  }

  function photoGroup(store) {
    return clean(store?.photoGroup || store?.brandPhotoGroup || store?.imageGroup || '');
  }

  function selectedPhoto(store) {
    const candidates = photoCandidates(store);
    if (candidates.length === 1) return candidates[0];

    const group = photoGroup(store);
    if (group && Array.isArray(stores)) {
      const peers = stores
        .filter(item => photoGroup(item) === group)
        .sort((a, b) => clean(a.id || a.name).localeCompare(clean(b.id || b.name), 'ko'));
      const rank = Math.max(0, peers.findIndex(item => String(item.id) === String(store.id)));
      return candidates[rank % candidates.length];
    }

    const seed = `${store?.id || ''}|${store?.name || ''}|${group}`;
    return candidates[stableHash(seed) % candidates.length];
  }

  function photoImgAttributes(store, usage, index = 0) {
    const photo = selectedPhoto(store);
    const src = usage === 'detail' ? photo.detail : photo.card;
    const loading = usage === 'card' && index >= 4 ? 'lazy' : 'eager';
    const priority = usage === 'card' && index < 4 ? 'auto' : 'low';
    return {
      src,
      loading,
      priority
    };
  }

  storeCard = function storeCardWithOptimizedPhoto(store, index = 0) {
    const keys = APP_ICON_ORDER.filter(key => store.links[key]);
    const photo = photoImgAttributes(store, 'card', index);
    return `<article class="store-card" data-id="${esc(store.id)}">
      <img src="${esc(photo.src)}" alt="${esc(store.name)}" loading="${photo.loading}" decoding="async" fetchpriority="${photo.priority}" width="640" height="512" onerror="this.src='assets/store1.jpg'">
      <div class="store-info">
        <h3>${esc(store.name)}</h3>
        <p>${esc(store.area)} · ${esc(store.cat)}</p>
        <div class="miniapps">${keys.map(key => appIcon(key, 'miniapp-icon')).join('')}</div>
      </div>
      <button class="order-open">주문방법 보기</button>
    </article>`;
  };

  detail = function detailWithOptimizedPhoto(store) {
    const visible = APP_ICON_ORDER.filter(key => store.links[key]);
    const primaryKeys = visible.filter(key => ['direct','brand','mukkebi','ddangyo'].includes(key));
    const otherKeys = visible.filter(key => !primaryKeys.includes(key));
    const primary = primaryKeys.map(key => `<a class="detail-route" href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${appIcon(key,'detail-route-icon')}<span>${APP_META[key].label}</span><b>›</b></a>`).join('');
    const others = otherKeys.length ? `<div class="store-other-wrap"><button class="detail-route store-other-toggle"><span class="other-label">다른 주문방법 보기</span><span class="other-inline-icons">${otherKeys.map(key => appIcon(key,'other-inline-icon')).join('')}</span><b>›</b></button><div class="store-other-popover" hidden><button class="store-other-close" aria-label="닫기">×</button>${otherKeys.map(key => `<a href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${appIcon(key,'store-other-icon')}<span>${APP_META[key].label}</span></a>`).join('')}</div></div>` : '';
    const photo = photoImgAttributes(store, 'detail');
    openModal(`<div class="store-detail-head"><h2>${esc(store.name)}</h2></div><img src="${esc(photo.src)}" class="detail-photo" alt="${esc(store.name)}" loading="eager" decoding="async" width="960" height="720" onerror="this.src='assets/store1.jpg'"><p class="detail-meta">${esc(store.area)} · ${esc(store.cat)}</p><div class="detail-routes">${primary}${others}</div>`);
  };
})();
