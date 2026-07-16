(() => {
  const GENERIC_IMAGES = new Set(['assets/store1.jpg','assets/store2.jpg','assets/store3.jpg','assets/store4.jpg']);
  const CATEGORY_EMOJI = {'한식':'🍲','치킨':'🍗','피자':'🍕','중식':'🍜','분식':'🍢','족발·보쌈':'🥩','회·해산물':'🐟','햄버거':'🍔','고기·구이':'🥓','찜·탕':'🥘','도시락':'🍱','야식·주점':'🌙','마라탕·양꼬치':'🌶️','반찬':'🥗','카페·디저트':'☕','샐러드':'🥬','양식':'🍝','아시안':'🍛','음식점':'🍽️'};
  const clean = value => String(value ?? '').trim();

  function stableHash(value) {
    let hash = 2166136261;
    for (const char of clean(value)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizePhoto(item) {
    if (!item) return null;
    if (typeof item === 'string') {
      const src = clean(item);
      if (!src || GENERIC_IMAGES.has(src)) return null;
      return {card: src, detail: src};
    }
    if (typeof item === 'object') {
      const card = clean(item.card || item.thumb || item.thumbnail || item.src || item.url || item.detail || item.full);
      const detail = clean(item.detail || item.full || item.src || item.url || card);
      const source = card || detail;
      if (!source || GENERIC_IMAGES.has(source)) return null;
      return {card: card || detail, detail: detail || card};
    }
    return null;
  }

  function rawCandidates(store) {
    const values = [];
    for (const field of ['images','photoPool','imagePool','gallery']) {
      if (Array.isArray(store?.[field])) values.push(...store[field]);
    }
    const direct = normalizePhoto(store?.image || store?.img);
    if (direct) values.push(direct);
    const seen = new Set();
    return values.map(normalizePhoto).filter(Boolean).filter(photo => {
      const key = `${photo.card}|${photo.detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function photoGroup(store) {
    return clean(store?.photoGroup || store?.brandPhotoGroup || store?.imageGroup || '');
  }

  function ownershipMap() {
    const map = new Map();
    for (const store of Array.isArray(stores) ? stores : []) {
      for (const photo of rawCandidates(store)) {
        const src = photo.card || photo.detail;
        if (!map.has(src)) map.set(src, []);
        map.get(src).push({id: String(store.id), group: photoGroup(store)});
      }
    }
    return map;
  }

  function candidateIsSafe(store, photo, owners) {
    const src = photo.card || photo.detail;
    const list = owners.get(src) || [];
    if (list.length <= 1) return true;
    const groups = new Set(list.map(item => item.group).filter(Boolean));
    return groups.size === 1 && [...groups][0].startsWith('brand:') && photoGroup(store) === [...groups][0];
  }

  function photoCandidates(store) {
    const owners = ownershipMap();
    return rawCandidates(store).filter(photo => candidateIsSafe(store, photo, owners));
  }

  function selectedPhoto(store) {
    const candidates = photoCandidates(store);
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];
    const group = photoGroup(store);
    if (group && group.startsWith('brand:') && Array.isArray(stores)) {
      const peers = stores.filter(item => photoGroup(item) === group).sort((a,b) => clean(a.id || a.name).localeCompare(clean(b.id || b.name), 'ko'));
      const rank = Math.max(0, peers.findIndex(item => String(item.id) === String(store.id)));
      return candidates[rank % candidates.length];
    }
    return candidates[stableHash(`${store?.id || ''}|${store?.name || ''}|${group}`) % candidates.length];
  }

  function attributes(store, usage = 'card', index = 0) {
    const photo = selectedPhoto(store);
    if (!photo) return {src: '', missing: true, loading: 'lazy', priority: 'low'};
    return {
      src: usage === 'detail' ? photo.detail : photo.card,
      missing: false,
      loading: usage === 'card' && index >= 4 ? 'lazy' : 'eager',
      priority: usage === 'card' && index < 4 ? 'auto' : 'low'
    };
  }

  window.DaedongPhotoDisplay = {selectedPhoto, attributes, candidates: photoCandidates};

  storeCard = function storeCardWithSafePhoto(store, index = 0) {
    const keys = APP_ICON_ORDER.filter(key => store.links[key]);
    const photo = attributes(store, 'card', index);
    const photoCount = photoCandidates(store).length;
    const category = clean(store.cat || store.category || '음식점') || '음식점';
    const countBadge = photoCount > 1 ? `<span class="store-photo-count" aria-label="사진 ${photoCount}장">▣ ${photoCount}</span>` : '';
    const visual = photo.missing
      ? `<div class="store-photo-placeholder"><span>${CATEGORY_EMOJI[category] || '🍽️'}</span><b>사진 준비 중</b></div>`
      : `<img src="${esc(photo.src)}" alt="${esc(store.name)}" loading="${photo.loading}" decoding="async" fetchpriority="${photo.priority}" width="640" height="512" onerror="this.outerHTML='<div class=&quot;store-photo-placeholder&quot;><span>${CATEGORY_EMOJI[category] || '🍽️'}</span><b>사진 준비 중</b></div>'">`;
    return `<article class="store-card" data-id="${esc(store.id)}">
      <div class="store-card-photo-wrap">${visual}${countBadge}</div>
      <div class="store-info">
        <h3>${esc(store.name)}</h3>
        <p>${esc(store.area)} · ${esc(store.cat)}</p>
        <div class="miniapps">${keys.map(key => appIcon(key, 'miniapp-icon')).join('')}</div>
      </div>
      <button class="order-open">주문방법 보기</button>
    </article>`;
  };
})();
