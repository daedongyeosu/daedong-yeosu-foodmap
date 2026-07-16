(() => {
  const ORDER = ['한식','치킨','피자','중식','분식','족발·보쌈','회·해산물','햄버거','고기·구이','찜·탕','도시락','야식·주점','마라탕·양꼬치','반찬','카페·디저트','샐러드','양식','아시안','음식점'];
  const EMOJI = {'한식':'🍲','치킨':'🍗','피자':'🍕','중식':'🍜','분식':'🍢','족발·보쌈':'🥩','회·해산물':'🐟','햄버거':'🍔','고기·구이':'🥓','찜·탕':'🥘','도시락':'🍱','야식·주점':'🌙','마라탕·양꼬치':'🌶️','반찬':'🥗','카페·디저트':'☕','샐러드':'🥬','양식':'🍝','아시안':'🍛','음식점':'🍽️'};
  const escText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function availableCategories() {
    const counts = new Map();
    for (const store of Array.isArray(stores) ? stores : []) {
      const category = String(store.cat || store.category || '음식점').trim() || '음식점';
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    const categories = [...counts.keys()].sort((a, b) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b);
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi) || a.localeCompare(b, 'ko');
    });
    return {categories, counts};
  }

  function openAllCategories() {
    const {categories, counts} = availableCategories();
    const buttons = [`<button type="button" data-full-category="전체" class="all-category-card all"><span>🍽️</span><b>전체</b><small>${Array.isArray(stores) ? stores.length : 0}곳</small></button>`, ...categories.map(category => `<button type="button" data-full-category="${escText(category)}" class="all-category-card"><span>${EMOJI[category] || '🍽️'}</span><b>${escText(category)}</b><small>${counts.get(category)}곳</small></button>`)].join('');
    openModal(`<section class="all-category-sheet-v2"><header><h2>전체 음식 카테고리</h2><p>원하는 종류를 선택하면 가까운 가게부터 보여드립니다.</p></header><div class="all-category-scroll"><div class="all-category-grid-v2">${buttons}</div></div></section>`);
  }

  document.addEventListener('click', event => {
    const all = event.target.closest('#allCategoryBtn');
    if (all) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openAllCategories();
      return;
    }
    const category = event.target.closest('[data-full-category]');
    if (!category) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.category = category.dataset.fullCategory;
    state.query = '';
    const input = document.querySelector('#mainSearch');
    const clear = document.querySelector('#clearMainSearch');
    if (input) input.value = '';
    if (clear) clear.hidden = true;
    closeModal();
    setTimeout(() => renderStores({scroll: true}), 80);
  }, true);
})();
