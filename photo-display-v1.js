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

  function attributes(store, usage = 'card', index = 0) {
    const photo = selectedPhoto(store);
    return {
      src: usage === 'detail' ? photo.detail : photo.card,
      loading: usage === 'card' && index >= 4 ? 'lazy' : 'eager',
      priority: usage === 'card' && index < 4 ? 'auto' : 'low'
    };
  }

  window.DaedongPhotoDisplay = {selectedPhoto, attributes, candidates: photoCandidates};

  storeCard = function storeCardWithOptimizedPhoto(store, index = 0) {
    const keys = APP_ICON_ORDER.filter(key => store.links[key]);
    const photo = attributes(store, 'card', index);
    const photoCount = photoCandidates(store).length;
    const countBadge = photoCount > 1 ? `<span class="store-photo-count" aria-label="사진 ${photoCount}장">▣ ${photoCount}</span>` : '';
    return `<article class="store-card" data-id="${esc(store.id)}">
      <div class="store-card-photo-wrap"><img src="${esc(photo.src)}" alt="${esc(store.name)}" loading="${photo.loading}" decoding="async" fetchpriority="${photo.priority}" width="640" height="512" onerror="this.src='assets/store1.jpg'">${countBadge}</div>
      <div class="store-info">
        <h3>${esc(store.name)}</h3>
        <p>${esc(store.area)} · ${esc(store.cat)}</p>
        <div class="miniapps">${keys.map(key => appIcon(key, 'miniapp-icon')).join('')}</div>
      </div>
      <button class="order-open">주문방법 보기</button>
    </article>`;
  };
})();
