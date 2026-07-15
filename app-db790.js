const APP_META = {
  direct: {label: '가게바로주문', icon: '🏪'},
  brand: {label: '브랜드앱', icon: 'B'},
  mukkebi: {label: '먹깨비', icon: 'assets/mukkebi-v7.png'},
  ddangyo: {label: '땡겨요', icon: 'assets/ddangyo-v7.png'},
  baemin: {label: '배달의민족', icon: 'assets/baemin.jpg'},
  coupang: {label: '쿠팡이츠', icon: 'assets/coupang-eats.jpg'},
  yogiyo: {label: '요기요', icon: 'assets/yogiyo.jpg'},
  naver: {label: '네이버지도', icon: '🗺️'},
  chak: {label: 'CHAK', icon: '💳'},
  phone: {label: '전화하기', icon: '☎'}
};

const APP_ICON_ORDER = ['direct','brand','mukkebi','ddangyo','baemin','coupang','yogiyo','naver','chak','phone'];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rainFromUrl = Number(new URLSearchParams(location.search).get('rain'));
const savedRain = Number(localStorage.getItem('daedongRainMode'));
const state = {
  query: '',
  category: '전체',
  slide: 0,
  rainMode: [0,1,2,3].includes(rainFromUrl) ? rainFromUrl : ([0,1,2,3].includes(savedRain) ? savedRain : 0)
};
let stores = [];
let modalHistoryActive = false;

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '');

function routeKey(name = '') {
  const n = norm(name);
  if (n.includes('가게바로') || n.includes('직접주문')) return 'direct';
  if (n.includes('브랜드앱') || n.includes('자사앱')) return 'brand';
  if (n.includes('먹깨비')) return 'mukkebi';
  if (n.includes('땡겨요')) return 'ddangyo';
  if (n.includes('요기요')) return 'yogiyo';
  if (n.includes('쿠팡')) return 'coupang';
  if (n.includes('배달의민족') || n.includes('배민')) return 'baemin';
  if (n.includes('네이버') || n.includes('지도')) return 'naver';
  if (n.includes('chak') || n.includes('지역상품권') || n.includes('섬섬페이')) return 'chak';
  if (n.includes('전화') || n.includes('통화') || n.includes('tel')) return 'phone';
  return '';
}

function adapt(raw, i) {
  const links = {};
  (raw.routes || []).forEach(route => {
    if (!route || route.enabled === false || !route.url) return;
    const key = routeKey(route.name);
    if (key && !links[key]) links[key] = route.url;
  });
  if (raw.naverMap && !links.naver) links.naver = raw.naverMap;
  if (raw.phone && raw.phoneVisible !== false && raw.showPhone !== false) links.phone = `tel:${raw.phone}`;
  if (raw.phoneVisible === false || raw.showPhone === false) delete links.phone;
  const tags = [
    ...(raw.searchTerms || []), ...(raw.categories || []), ...(raw.areas || []),
    ...(raw.shopInShopNames || []), raw.realBusinessName, raw.category, raw.district, raw.address
  ].filter(Boolean);
  return {
    ...raw,
    id: raw.id || `store-${i}`,
    name: raw.name || raw.realBusinessName || `가게 ${i + 1}`,
    area: raw.district || raw.area || '여수',
    cat: raw.category || raw.cat || '음식점',
    phone: raw.phone || '',
    img: raw.image || raw.img || 'assets/store1.jpg',
    tags,
    links,
    managed: raw.managed === true,
    sharedManaged: raw.sharedManaged === true
  };
}

async function loadStores() {
  const response = await fetch(`data/stores.json?v=${Date.now()}`, {cache: 'no-store'});
  if (!response.ok) throw new Error(`stores.json ${response.status}`);
  const raw = await response.json();
  if (!Array.isArray(raw)) throw new Error('stores.json 형식 오류');
  stores = raw.map(adapt);
  console.info(`가게 DB ${stores.length}개 로드 완료 / 우천 ${state.rainMode}단계`);
}

const categories = [['🍲','한식'],['🍗','치킨'],['🍕','피자'],['🍜','중식'],['🍢','분식'],['🥩','족발·보쌈'],['🐟','회·해산물']];
const allCategories = [...categories,['🍔','햄버거'],['🥘','고기·구이'],['🌙','야식·주점'],['🌶️','마라탕·양꼬치'],['🥗','반찬'],['☕','카페·디저트']];
const ads = [
  {title:'신규 오픈 가게를 만나보세요',desc:'여수의 새로운 맛집과 특별한 혜택',bg:'assets/store4.jpg'},
  {title:'배송기사님 모집',desc:'베테랑 배달연합과 함께할 기사님을 찾습니다',bg:'assets/store2.jpg'},
  {title:'배달대행 가맹점 모집',desc:'가게 사장님을 위한 주문·홍보·배달 연결',bg:'assets/store1.jpg'},
  {title:'먹깨비·땡겨요·온동네 가입 안내',desc:'저수수료 주문경로를 손쉽게 연결하세요',bg:'assets/store3.jpg'},
  {title:'소상공인협회 알림',desc:'여수 소상공인을 위한 중요한 소식',bg:'assets/store2.jpg'}
];

function appIcon(key, cls = '') {
  const meta = APP_META[key];
  if (!meta) return '';
  return meta.icon.startsWith('assets/')
    ? `<img class="${cls}" src="${meta.icon}" alt="${meta.label}">`
    : `<span class="${cls} emoji-app ${key === 'brand' ? 'brand-app-icon' : ''}">${meta.icon}</span>`;
}

function relevance(store, query) {
  query = norm(query);
  if (!query) return 0;
  const name = norm(store.name);
  const tags = store.tags.map(norm);
  if (name === query) return 100;
  if (name.startsWith(query)) return 90;
  if (name.includes(query)) return 80;
  if (tags.includes(query)) return 70;
  if (tags.some(tag => tag.includes(query) || query.includes(tag))) return 60;
  if (norm(store.cat).includes(query) || norm(store.area).includes(query)) return 50;
  return norm([store.name, store.area, store.cat, ...store.tags].join(' ')).includes(query) ? 40 : 0;
}

function operationScore(store) {
  const mode = state.rainMode;
  if (mode === 0) {
    if (store.managed) return 100;
    if (store.sharedManaged) return 70;
    return 40;
  }

  // 우천 시 화면의 아이콘 순서는 그대로 유지하고 가게 순위만 조정한다.
  // 관리하지 않는 일반가게 중 쿠팡·배민·요기요 가입 가게를 가장 먼저 노출한다.
  let score = 40;
  const isGeneral = !store.managed && !store.sharedManaged;
  const hasCoupang = Boolean(store.links.coupang);
  const hasBaemin = Boolean(store.links.baemin);
  const hasYogiyo = Boolean(store.links.yogiyo);
  const externalCount = [hasCoupang, hasBaemin, hasYogiyo].filter(Boolean).length;

  if (isGeneral) score += 55;
  if (hasCoupang) score += 45;
  if (hasBaemin) score += 25;
  if (hasYogiyo) score += 15;
  if (externalCount === 3) score += 55;
  else if (externalCount === 2) score += 25;

  // 우천 1단계부터 우리가게 노출 가중치를 평상시보다 약 30% 낮춘다.
  if (store.managed) score -= 30;
  if (store.sharedManaged) score -= 12;

  if (mode === 2) {
    if (isGeneral && externalCount >= 2) score += 20;
    if (store.managed) score -= 10;
  }
  if (mode === 3) {
    if (isGeneral && externalCount === 3) score += 35;
    if (store.managed) score -= 15;
    if (store.sharedManaged) score -= 8;
  }
  return score;
}

function stableSort(list, query = '') {
  return list.map((store, index) => ({
    store,
    index,
    searchScore: query ? relevance(store, query) : 0,
    operationScore: operationScore(store)
  })).sort((a, b) =>
    b.searchScore - a.searchScore ||
    b.operationScore - a.operationScore ||
    a.index - b.index
  ).map(item => item.store);
}

function searchList(query) {
  const matched = stores.filter(store => relevance(store, query) > 0);
  if (!matched.length) return [];
  const direct = stableSort(matched, query);
  const cats = new Set(direct.slice(0, 10).map(store => store.cat));
  const related = stableSort(stores.filter(store => !matched.includes(store) && cats.has(store.cat)));
  return [...direct, ...related];
}

function recommend() {
  const filtered = stores.filter(store => state.category === '전체' || store.cat === state.category);
  return stableSort(filtered).slice(0, 40);
}

function storeCard(store) {
  const keys = APP_ICON_ORDER.filter(key => store.links[key]);
  return `<article class="store-card" data-id="${esc(store.id)}">
    <img src="${esc(store.img)}" alt="${esc(store.name)}" onerror="this.src='assets/store1.jpg'">
    <div class="store-info">
      <h3>${esc(store.name)}</h3>
      <p>${esc(store.area)} · ${esc(store.cat)}</p>
      <div class="miniapps">${keys.map(key => appIcon(key, 'miniapp-icon')).join('')}</div>
    </div>
    <button class="order-open">주문방법 보기</button>
  </article>`;
}

function renderStores({scroll = false} = {}) {
  const query = state.query.trim();
  let list;
  let title;
  if (query) {
    const found = searchList(query);
    $('#searchSummary').hidden = false;
    if (found.length) {
      list = found;
      title = `'${esc(query)}' 검색 결과`;
      $('#searchSummary').innerHTML = `<strong>검색 결과 ${found.length}곳</strong><button id="clearSearch" class="text-btn">검색 초기화</button>`;
    } else {
      list = recommend();
      title = '검색 결과가 없어 추천 가게를 보여드립니다';
      $('#searchSummary').innerHTML = `<strong>'${esc(query)}' 검색 결과가 없습니다.</strong><button id="clearSearch" class="text-btn">검색 초기화</button>`;
    }
  } else {
    list = recommend();
    title = state.category === '전체' ? '오늘의 추천' : `${state.category} 추천`;
    $('#searchSummary').hidden = true;
  }
  $('#recommendSection h2').textContent = title;
  $('#resetCategoryBtn').hidden = state.category === '전체';
  $('#storeGrid').innerHTML = list.length ? list.map(storeCard).join('') : '<div class="empty">등록된 가게가 없습니다.</div>';
  if (scroll) $('#recommendSection').scrollIntoView({behavior: 'smooth', block: 'start'});
}

function renderAds() {
  $('#heroTrack').innerHTML = ads.map(ad => `<article class="hero-card" style="background-image:url('${ad.bg}')"><h2>${ad.title}</h2><p>${ad.desc}</p></article>`).join('');
  $('#heroDots').innerHTML = ads.map((_, i) => `<i class="${i ? '' : 'active'}"></i>`).join('');
}

function showSlide(index) {
  state.slide = (index + ads.length) % ads.length;
  $('#heroTrack').style.transform = `translateX(-${state.slide * 100}%)`;
  $$('#heroDots i').forEach((dot, i) => dot.classList.toggle('active', i === state.slide));
}

function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#overlay').hidden = false;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  if (!modalHistoryActive) {
    history.pushState({daedongModal: true}, '');
    modalHistoryActive = true;
  }
}

function hideModal() {
  if ($('#modal').hidden) return;
  $('#modal').hidden = true;
  $('#overlay').hidden = true;
  document.body.style.overflow = '';
  $$('.store-other-popover').forEach(menu => menu.hidden = true);
}

function closeModal(fromPop = false) {
  if ($('#modal').hidden) return;
  hideModal();
  if (fromPop) {
    modalHistoryActive = false;
    return;
  }
  if (modalHistoryActive) {
    modalHistoryActive = false;
    history.back();
  }
}

function detail(store) {
  const visible = APP_ICON_ORDER.filter(key => store.links[key]);
  const primaryKeys = visible.filter(key => ['direct','brand','mukkebi','ddangyo'].includes(key));
  const otherKeys = visible.filter(key => !primaryKeys.includes(key));
  const primary = primaryKeys.map(key => `<a class="detail-route" href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${appIcon(key,'detail-route-icon')}<span>${APP_META[key].label}</span><b>›</b></a>`).join('');
  const others = otherKeys.length ? `<div class="store-other-wrap"><button class="detail-route store-other-toggle"><span class="other-label">다른 주문방법 보기</span><span class="other-inline-icons">${otherKeys.map(key => appIcon(key,'other-inline-icon')).join('')}</span><b>›</b></button><div class="store-other-popover" hidden><button class="store-other-close" aria-label="닫기">×</button>${otherKeys.map(key => `<a href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${appIcon(key,'store-other-icon')}<span>${APP_META[key].label}</span></a>`).join('')}</div></div>` : '';
  openModal(`<div class="store-detail-head"><h2>${esc(store.name)}</h2></div><img src="${esc(store.img)}" class="detail-photo" alt="${esc(store.name)}" onerror="this.src='assets/store1.jpg'"><p class="detail-meta">${esc(store.area)} · ${esc(store.cat)}</p><div class="detail-routes">${primary}${others}</div>`);
}

function bind() {
  renderAds();
  setInterval(() => showSlide(state.slide + 1), 3500);
  $('#categoryGrid').innerHTML = categories.map(([emoji, name]) => `<button class="category" data-cat="${name}"><span class="bubble">${emoji}</span><span>${name}</span></button>`).join('');
  const input = $('#mainSearch');
  const clear = $('#clearMainSearch');
  input.oninput = () => clear.hidden = !input.value;
  input.onkeydown = event => { if (event.key === 'Enter') $('#searchBtn').click(); };
  clear.onclick = () => { input.value = ''; state.query = ''; clear.hidden = true; renderStores(); input.focus(); };
  $('#searchBtn').onclick = () => { state.query = input.value.trim(); state.category = '전체'; renderStores({scroll: true}); };
  $('#categoryGrid').onclick = event => {
    const button = event.target.closest('[data-cat]');
    if (!button) return;
    state.category = button.dataset.cat;
    state.query = '';
    input.value = '';
    clear.hidden = true;
    renderStores({scroll: true});
  };
  $('#resetCategoryBtn').onclick = () => { state.category = '전체'; renderStores({scroll: true}); };
  document.addEventListener('click', event => {
    if (event.target.id === 'clearSearch') { state.query = ''; input.value = ''; renderStores(); }
    const card = event.target.closest('.store-card');
    if (card) {
      const store = stores.find(item => String(item.id) === card.dataset.id);
      if (store) detail(store);
      return;
    }
    const toggle = event.target.closest('.store-other-toggle');
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      const menu = toggle.parentElement.querySelector('.store-other-popover');
      menu.hidden = !menu.hidden;
      return;
    }
    if (event.target.closest('.store-other-close')) {
      event.preventDefault();
      event.target.closest('.store-other-popover').hidden = true;
      return;
    }
    if (!event.target.closest('.store-other-wrap')) $$('.store-other-popover').forEach(menu => menu.hidden = true);
  });
  $('.modal-close').onclick = () => closeModal();
  $('#overlay').onclick = () => closeModal();
  window.addEventListener('popstate', () => { if (!$('#modal').hidden) closeModal(true); });
  const popover = $('#moreAppsPopover');
  $('#moreAppsBtn').onclick = event => { event.stopPropagation(); popover.hidden = !popover.hidden; };
  $('.popover-close').onclick = () => popover.hidden = true;
  document.addEventListener('click', event => {
    if (!popover.hidden && !event.target.closest('#moreAppsPopover') && !event.target.closest('#moreAppsBtn')) popover.hidden = true;
  });
  $('#locationText').textContent = localStorage.getItem('location') || '여수시 전체';
  $('#allCategoryBtn').onclick = () => openModal(`<h2>전체 음식 카테고리</h2><div class="all-category-list">${allCategories.map(([emoji,name]) => `<button data-modal-cat="${name}"><span>${emoji}</span><b>${name}</b></button>`).join('')}</div>`);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-modal-cat]');
    if (!button) return;
    state.category = button.dataset.modalCat;
    state.query = '';
    input.value = '';
    closeModal();
    setTimeout(() => renderStores({scroll: true}), 80);
  });
  $('#noticeBtn').onclick = () => openModal('<h2>알림</h2><div class="my-list"><button>신규 오픈 가게 안내</button><button>배송기사님 모집 안내</button><button>가맹점 모집 안내</button></div>');
}

async function bootstrap() {
  try {
    await loadStores();
    bind();
    renderStores();
  } catch (error) {
    console.error(error);
    $('#searchSummary').hidden = false;
    $('#searchSummary').innerHTML = `<strong>가게 데이터를 불러오지 못했습니다.</strong><span>${esc(error.message)}</span>`;
    $('#storeGrid').innerHTML = '<div class="empty">data/stores.json과 Live Server를 확인해 주세요.</div>';
  }
}

bootstrap();
