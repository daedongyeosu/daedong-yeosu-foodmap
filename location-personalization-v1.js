(() => {
  const clean = value => String(value ?? '').trim();

  function savedAreaText() {
    try {
      const saved = JSON.parse(localStorage.getItem('daedongDeliveryAddressV2') || 'null');
      return clean(saved?.label || saved?.address);
    } catch {
      return '';
    }
  }

  function personalizedStores() {
    const list = (Array.isArray(stores) ? stores : []).filter(store => store.managed || store.sharedManaged);
    const areaText = savedAreaText();
    return list.map((store, index) => ({
      store,
      index,
      sameArea: areaText && areaText.includes(clean(store.area || store.district)) ? 0 : 1,
      distance: Number.isFinite(store.distanceKm) ? store.distanceKm : Infinity
    })).sort((a, b) => a.sameArea - b.sameArea || a.distance - b.distance || a.index - b.index).map(item => item.store);
  }

  function refreshLocationAds() {
    if (!Array.isArray(stores) || !stores.length || !Array.isArray(ads)) return;
    const nearby = personalizedStores().slice(0, 3);
    if (!nearby.length) return;
    const dynamic = nearby.map(store => {
      const photo = window.DaedongPhotoDisplay?.selectedPhoto?.(store) || {card: store.img || store.image || 'assets/store1.jpg'};
      const distance = Number.isFinite(store.distanceKm) ? (store.distanceKm < 1 ? `${Math.round(store.distanceKm * 1000)}m` : `${store.distanceKm.toFixed(1)}km`) : clean(store.area || store.district || '여수');
      return {title: `내 주변 ${store.name}`, desc: `${distance} · 가까운 가게의 주문방법을 확인하세요`, bg: photo.card || photo.detail || store.img || 'assets/store1.jpg'};
    });
    const common = ads.filter(item => !String(item.title).startsWith('내 주변 '));
    ads.splice(0, ads.length, ...dynamic, ...common.slice(0, 3));
    renderAds();
    showSlide(0);
  }

  function refreshBrandCollage() {
    const icon = document.querySelector('.order-item[data-open="brands"] .order-icon');
    if (!icon || !Array.isArray(stores) || !stores.length) return;
    const brandStores = stores.filter(store => store.links?.brand).slice(0, 4);
    if (!brandStores.length) return;
    icon.classList.add('brand-photo-collage');
    icon.innerHTML = brandStores.map(store => {
      const photo = window.DaedongPhotoDisplay?.selectedPhoto?.(store) || {card: store.img || store.image || 'assets/store1.jpg'};
      return `<img src="${photo.card || photo.detail}" alt="" loading="lazy">`;
    }).join('');
  }

  if (typeof applyAddress === 'function') {
    const baseApplyAddress = applyAddress;
    applyAddress = function applyAddressWithPersonalization(address, options) {
      const result = baseApplyAddress(address, options);
      setTimeout(() => { refreshLocationAds(); refreshBrandCollage(); }, 120);
      return result;
    };
  }

  function start() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (Array.isArray(stores) && stores.length) {
        clearInterval(timer);
        refreshLocationAds();
        refreshBrandCollage();
      } else if (attempts > 30) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.DaedongLocationPersonalization = {refresh: refreshLocationAds};
})();
