'use strict';

const DATA_URL = 'data/stores.json';
const PHOTO_MANIFEST_URL = 'data/photo-manifest.json';
const PHOTO_POLICY_URL = 'data/photo-policy.json';
const EXTERNAL_APP_KEYS = ['yogiyo', 'coupang', 'baemin'];
const LOW_FEE_KEYS = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand'];
const DETAIL_ONLY_KEYS = ['phone', 'chak'];

const APP_META = {
  direct: {label: '가게바로주문', icon: '🏪'},
  mukkebi: {label: '먹깨비', icon: 'assets/mukkebi-v7.png'},
  ddangyo: {label: '땡겨요', icon: 'assets/ddangyo-v7.png'},
  ondongne: {label: '온동네', icon: 'assets/ondongne.png'},
  brand: {label: '브랜드앱', icon: 'images/momstouch.jpg'},
  phone: {label: '전화주문', icon: '☎'},
  chak: {label: 'CHAK 지역상품권', icon: '💳'},
  naver: {label: '네이버지도', icon: '🗺️'},
  yogiyo: {label: '요기요', icon: 'assets/yogiyo.jpg'},
  coupang: {label: '쿠팡이츠', icon: 'assets/coupang-eats.jpg'},
  baemin: {label: '배달의민족', icon: 'assets/baemin.jpg'}
};

const GLOBAL_EXTERNAL_APPS = {
  yogiyo: {label: '요기요', url: 'https://play.google.com/store/apps/details?id=com.fineapp.yogiyo'},
  coupang: {label: '쿠팡이츠', url: 'https://play.google.com/store/apps/details?id=com.coupang.mobile.eats'},
  baemin: {label: '배달의민족', url: 'https://play.google.com/store/apps/details?id=com.sampleapp'}
};

const BRAND_GROUPS = [
  {name: '치킨·버거', brands: [
    ['momstouch', '맘스터치', ['맘스터치'], 'images/momstouch.jpg'],
    ['bbq', 'BBQ', ['bbq', '비비큐'], null], ['bhc', 'BHC', ['bhc'], null],
    ['kyochon', '교촌치킨', ['교촌'], null], ['nene', '네네치킨', ['네네치킨'], null],
    ['60chicken', '60계치킨', ['60계'], null], ['ajukeo', '아주커치킨', ['아주커'], 'images/ajukeo.jpg'],
    ['gyedong', '계동치킨', ['계동치킨'], 'images/gyedong.jpg'], ['goobne', '굽네치킨', ['굽네'], null],
    ['puradak', '푸라닭', ['푸라닭'], null], ['cheogajip', '처갓집양념치킨', ['처갓집'], null],
    ['burgerking', '버거킹', ['버거킹'], 'images/burgerking.png'], ['lotteria', '롯데리아', ['롯데리아'], 'images/lotteria.jpg'],
    ['mcdonalds', '맥도날드', ['맥도날드'], 'images/mcdonalds.jpg'],
    ['nobrandburger', '노브랜드버거', ['노브랜드버거', '노브랜드 버거'], 'images/nobrandburger.png'],
    ['frankburger', '프랭크버거', ['프랭크버거'], 'images/frankburger.png']
  ]},
  {name: '피자', brands: [
    ['dominos', '도미노피자', ['도미노피자', '도미노 피자'], null], ['pizzahut', '피자헛', ['피자헛'], null],
    ['papajohns', '파파존스', ['파파존스'], null], ['mrpizza', '미스터피자', ['미스터피자'], null]
  ]},
  {name: '카페·디저트', brands: [
    ['mega', '메가MGC커피', ['메가커피', '메가mgc', '메가MGC'], null], ['compose', '컴포즈커피', ['컴포즈'], null],
    ['ediya', '이디야커피', ['이디야'], null], ['paik', '빽다방', ['빽다방'], null],
    ['twosome', '투썸플레이스', ['투썸'], null], ['starbucks', '스타벅스', ['스타벅스'], null],
    ['baskin', '배스킨라빈스', ['배스킨라빈스', '베스킨라빈스'], null], ['dunkin', '던킨', ['던킨'], null]
  ]},
  {name: '한식·분식·기타', brands: [
    ['doozzim', '두찜', ['두찜'], 'images/doozzim.jpg'], ['bonjuk', '본죽', ['본죽'], null],
    ['sinjeon', '신전떡볶이', ['신전떡볶이'], null], ['yupdduk', '동대문엽기떡볶이', ['엽기떡볶이', '엽떡'], null],
    ['jaws', '죠스떡볶이', ['죠스떡볶이'], null], ['subway', '써브웨이', ['써브웨이', '서브웨이'], null]
  ]}
].map(group => ({name: group.name, brands: group.brands.map(([id, label, aliases, icon]) => ({id, label, aliases, icon}))}));
const BRAND_BY_ID = Object.fromEntries(BRAND_GROUPS.flatMap(group => group.brands).map(brand => [brand.id, brand]));

const CATEGORY_PREFERRED = ['한식', '치킨', '피자', '중식', '분식/도시락', '분식', '족발/보쌈', '회/해산물', '국밥/찜/탕/찌개/조림', '면요리', '고기/구이', '돈까스/일식', '카페/디저트', '햄버거', '야식/주점', '마라탕/양꼬치', '샐러드/건강식', '도시락/죽', '반찬', '베이커리/떡', '아시안', '패스트푸드', '퓨전', '기타'];
const CATEGORY_ICON_RULES = [[/치킨|닭/, '🍗'], [/피자/, '🍕'], [/중식|짜장|짬뽕/, '🍜'], [/분식|떡볶이|도시락/, '🍢'], [/족발|보쌈/, '🥩'], [/회|해산물|횟집|수산/, '🐟'], [/국밥|찜|탕|찌개|조림/, '🍲'], [/면|냉면|국수/, '🍜'], [/고기|구이|삼겹|갈비/, '🥩'], [/돈까스|일식|초밥|스시/, '🍱'], [/카페|커피|디저트|빙수/, '☕'], [/햄버거|버거/, '🍔'], [/야식|주점|술집/, '🌙'], [/마라|양꼬치/, '🌶️'], [/샐러드|건강/, '🥗'], [/죽/, '🥣'], [/반찬/, '🍚'], [/베이커리|빵|떡/, '🥐'], [/아시안|베트남|태국/, '🍛'], [/한식/, '🍚']];
const HERO_BANNERS = Array.from({length: 17}, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {desktop: `images/${number}.png`, mobile: `images/${number}.png`, fallback: `images/${number}.png`, alt: `대동여수음식지도 배너 ${index + 1}`};
});
const PROMOS = [
  {kind: 'rider', title: '배송기사 모집', desc: '여수 지역 베테랑 기사님을 기다립니다.'},
  {kind: 'store', title: '배달대행 가맹점 모집', desc: '가게 사장님을 위한 주문·홍보·배달 연결'},
  {kind: 'join', title: '먹깨비·땡겨요·온동네 가입 안내', desc: '저수수료 주문경로를 한 번에 연결하세요.'},
  {kind: 'new', title: '신규 오픈 가게 광고', desc: '새로 문을 연 여수 가게를 빠르게 알립니다.'},
  {kind: 'notice', title: '소상공인협회 알림', desc: '여수 소상공인에게 필요한 소식을 전합니다.'}
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function loadSavedLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem('savedLocation') || 'null');
    if (!saved || typeof saved !== 'object') return null;
    const lat = Number(saved.coords?.lat);
    const lng = Number(saved.coords?.lng);
    return {
      label: String(saved.label || '').trim() || '여수시 전체',
      coords: Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null,
      sortByDistance: Boolean(saved.sortByDistance && Number.isFinite(lat) && Number.isFinite(lng))
    };
  } catch {
    return null;
  }
}
const savedLocation = loadSavedLocation();
const state = {
  query: '', category: '전체', brandId: '', visibleCount: 40,
  location: savedLocation?.label || localStorage.getItem('location') || '여수시 전체',
  coords: savedLocation?.coords || null,
  sortByDistance: savedLocation?.sortByDistance || false
};
let stores = [];
let categories = [];
let heroCarousel = null;
let promoCarousel = null;
let detailCarousel = null;
let photoResolver = null;

function normalize(value) { return String(value ?? '').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, ''); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char])); }
function categoryIcon(name) { const rule = CATEGORY_ICON_RULES.find(([pattern]) => pattern.test(name)); return rule ? rule[1] : '🍽️'; }
function safeHref(value) { try { const url = new URL(String(value), location.href); return ['http:', 'https:', 'tel:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; } }
function routeKey(name) {
  const text = normalize(name);
  if (text.includes('가게바로')) return 'direct';
  if (text.includes('먹깨비')) return 'mukkebi';
  if (text.includes('땡겨요')) return 'ddangyo';
  if (text.includes('온동네')) return 'ondongne';
  if (text.includes('브랜드앱')) return 'brand';
  if (text.includes('전화')) return 'phone';
  if (text.includes('chak') || text.includes('지역상품권')) return 'chak';
  if (text.includes('요기요')) return 'yogiyo';
  if (text.includes('쿠팡')) return 'coupang';
  if (text.includes('배달의민족') || text === '배민') return 'baemin';
  return 'brand';
}
function parseCoordinate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
const DISTRICT_CENTERS = new Map(Object.entries({
  '여서동':[34.7602,127.7007], '문수동':[34.7578,127.7027], '국동':[34.7355,127.7199],
  '봉산동':[34.7407,127.7282], '웅천동':[34.7485,127.6715], '학동':[34.7616,127.6621],
  '교동':[34.7412,127.7336], '신기동':[34.7587,127.6785], '덕충동':[34.7535,127.7460],
  '돌산':[34.7120,127.7440], '죽림':[34.7930,127.6370], '공화동':[34.7488,127.7455],
  '미평동':[34.7750,127.7050], '선원동':[34.7715,127.6505], '화장동':[34.7790,127.6550],
  '중앙동':[34.7398,127.7365], '충무동':[34.7488,127.7270], '봉강동':[34.7540,127.7150],
  '소호동':[34.7315,127.6520], '관문동':[34.7410,127.7420], '서교동':[34.7450,127.7280],
  '고소동':[34.7380,127.7420], '봉계동':[34.7825,127.6890], '신월동':[34.7280,127.7060],
  '안산동':[34.7555,127.6470], '종화동':[34.7330,127.7440], '무선':[34.7800,127.6600],
  '오림동':[34.7660,127.7240], '여천동':[34.7760,127.6640], '둔덕동':[34.7820,127.7120],
  '연등동':[34.7580,127.7240], '광무동':[34.7500,127.7190], '수정동':[34.7460,127.7500],
  '여수시':[34.7604,127.6622], '여서문수':[34.7590,127.7017], '미평둔덕':[34.7785,127.7085],
  '미평둔덕동':[34.7785,127.7085], '교동중앙동':[34.7405,127.7350], '여수국동':[34.7355,127.7199]
}).map(([name,[lat,lng]]) => [normalize(name), {lat,lng}]));
function districtCoordinate(value) {
  const area = normalize(value);
  if (!area || area.includes('홈화면') || area.includes('저장해두시면')) return null;
  if (DISTRICT_CENTERS.has(area)) return DISTRICT_CENTERS.get(area);
  const matches = [...DISTRICT_CENTERS.entries()].filter(([key]) => area.includes(key) || key.includes(area));
  if (!matches.length) return null;
  return {
    lat: matches.reduce((sum,[,point]) => sum + point.lat, 0) / matches.length,
    lng: matches.reduce((sum,[,point]) => sum + point.lng, 0) / matches.length
  };
}
function imagePathFromValue(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.detail || value.card || value.src || value.url || '').trim();
}
function uniquePaths(values) { return [...new Set(values.map(imagePathFromValue).filter(Boolean))]; }
function normalizedStore(raw, index) {
  const routes = (raw.routes || [])
    .filter(route => route && route.enabled !== false && route.url && safeHref(route.url) !== '#')
    .map(route => ({...route, key: routeKey(route.name), url: safeHref(route.url)}));
  const area = raw.district || raw.area || '';
  const rawLat = parseCoordinate(raw.latitude ?? raw.lat);
  const rawLng = parseCoordinate(raw.longitude ?? raw.lng);
  const center = rawLat !== null && rawLng !== null ? null : districtCoordinate(area);
  const lat = rawLat ?? center?.lat ?? null;
  const lng = rawLng ?? center?.lng ?? null;
  const coordinateSource = rawLat !== null && rawLng !== null ? 'store' : center ? 'district-centroid' : '';
  const legacyImages = uniquePaths([raw.image, raw.img, ...(Array.isArray(raw.images) ? raw.images : [])]);
  return {
    id: String(raw.id || index), name: raw.name || '이름 없는 가게', realBusinessName: raw.realBusinessName || '',
    shopInShopNames: raw.shopInShopNames || [], area, cat: raw.category || raw.cat || '기타',
    address: raw.address || '', phone: raw.phone || '', naverMap: safeHref(raw.naverMap || ''),
    legacyImage: legacyImages[0] || '', legacyImages,
    tags: [raw.category, raw.district, raw.address, ...(raw.shopInShopNames || [])].filter(Boolean), routes,
    managed: Boolean(raw.managed), sharedManaged: Boolean(raw.sharedManaged), pinPosition: raw.pinPosition,
    forceBottom: Boolean(raw.forceBottom), lat, lng, coordinateSource
  };
}
function storeText(store) { return normalize([store.name, store.realBusinessName, ...store.shopInShopNames, store.area, store.cat, ...store.tags].join(' ')); }
function routeFor(store, key) { return store.routes.find(route => route.key === key); }
function brandMatchesStore(store, brand) { const text = storeText(store); return brand.aliases.some(alias => text.includes(normalize(alias))); }
function brandCount(brand) { return stores.filter(store => brandMatchesStore(store, brand)).length; }
function haversine(a, b) {
  const R = 6371;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

class PhotoResolver {
  constructor(manifest, policy) {
    this.manifest = manifest || {entries: []};
    this.policy = policy || {};
    this.byId = new Map();
    this.byName = new Map();
    for (const entry of this.manifest.entries || []) {
      if (entry.storeId) this.byId.set(String(entry.storeId), entry);
      for (const key of [entry.storeName, ...(entry.aliases || [])].filter(Boolean)) this.byName.set(normalize(key), entry);
    }
  }
  entryFor(store) { return this.byId.get(store.id) || this.byName.get(normalize(store.name)) || this.byName.get(normalize(store.realBusinessName)); }
  classificationAllowed(entry) {
    if (!entry || entry.blocked === true) return false;
    const classification = String(entry.classification || '').toLowerCase();
    if ((this.policy.blockedClassifications || []).includes(classification)) return false;
    return !(this.policy.requireExplicitAllowForPackageEntries !== false && entry.source !== 'notion' && !(this.policy.allowedClassifications || []).includes(classification));
  }
  suspiciousPath(path, store) {
    const hay = normalize([path, store?.name, store?.realBusinessName].join(' '));
    return (this.policy.blockedPathKeywords || []).some(keyword => hay.includes(normalize(keyword)));
  }
  validPath(path, store) {
    const value = String(path || '').trim();
    return Boolean(value && !this.suspiciousPath(value, store) && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value) && !/\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(value));
  }
  resolveGallery(store) {
    const entry = this.entryFor(store);
    if (entry && this.classificationAllowed(entry)) {
      const paths = uniquePaths([entry.src, ...(entry.additionalSrcs || []), ...(entry.gallery || [])]).filter(path => this.validPath(path, store));
      if (paths.length) return paths.map(src => ({src, source: entry.source || 'manifest', classification: entry.classification}));
    }
    return uniquePaths(store.legacyImages || [store.legacyImage])
      .filter(path => this.validPath(path, store))
      .map(src => ({src, source: 'verified-legacy-direct-file', classification: 'legacy_unclassified'}));
  }
  resolve(store) { return this.resolveGallery(store)[0] || null; }
  markup(store, kind = 'card') {
    const photo = this.resolve(store);
    if (!photo) return placeholderMarkup(kind);
    const cls = kind === 'detail' ? 'detail-photo' : 'store-photo';
    return `<img class="${cls}" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)}" loading="lazy" data-photo-kind="${kind}" data-photo-source="${escapeHtml(photo.source)}">`;
  }
  galleryMarkup(store) {
    const photos = this.resolveGallery(store);
    if (!photos.length) return placeholderMarkup('detail');
    if (photos.length === 1) return `<div class="detail-single-photo">${this.markup(store, 'detail')}</div>`;
    return `<div id="detailPhotoCarousel" class="carousel-controller detail-photo-carousel" data-original-count="${photos.length}">
      <div class="carousel-shell detail-photo-frame">
        <button class="carousel-arrow prev" type="button" data-carousel-prev aria-label="이전 가게사진">‹</button>
        <div class="carousel-track">${photos.map((photo, index) => `<article class="carousel-slide detail-photo-slide"><img class="detail-photo" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)} 사진 ${index + 1}" loading="lazy" data-photo-kind="detail" data-photo-source="${escapeHtml(photo.source)}"></article>`).join('')}</div>
        <button class="carousel-arrow next" type="button" data-carousel-next aria-label="다음 가게사진">›</button>
      </div><div class="carousel-dots" aria-label="가게사진 위치"></div></div>`;
  }
}
function placeholderMarkup(kind = 'card') {
  const cls = kind === 'detail' ? 'detail-photo-placeholder' : 'photo-placeholder-card';
  return `<div class="${cls}" role="img" aria-label="사진 준비 중"><span>🍽️</span><b>검수된 음식 사진 준비 중</b></div>`;
}
function handleImageError(image) {
  if (!image.matches('[data-photo-kind]')) return;
  image.replaceWith(document.createRange().createContextualFragment(placeholderMarkup(image.dataset.photoKind || 'card')));
}

class InfiniteCarousel {
  constructor(root, {interval = 3500} = {}) {
    this.root = root;
    if (!root) return;
    this.shell = root.querySelector('.carousel-shell');
    this.track = root.querySelector('.carousel-track');
    this.dots = root.querySelector('.carousel-dots');
    this.prev = root.querySelector('[data-carousel-prev]');
    this.next = root.querySelector('[data-carousel-next]');
    this.interval = interval;
    this.timer = null;
    this.dragStart = null;
    this.current = 0;
    this.original = [...this.track.children];
    this.count = this.original.length;
    if (!this.count) return;
    this.build(); this.bind(); this.start();
  }
  build() {
    if (this.count > 1) {
      this.track.prepend(this.original[this.count - 1].cloneNode(true));
      this.track.append(this.original[0].cloneNode(true));
      this.current = 1;
    }
    this.jump(false); this.renderDots();
  }
  beginDrag(clientX) {
    if (!Number.isFinite(clientX) || this.dragStart !== null) return;
    this.dragStart = clientX;
    this.stop();
  }
  finishDrag(clientX) {
    if (this.dragStart === null || !Number.isFinite(clientX)) return;
    const delta = clientX - this.dragStart;
    this.dragStart = null;
    if (Math.abs(delta) > 38) this.move(delta < 0 ? 1 : -1);
    this.start();
  }
  cancelDrag() { this.dragStart = null; this.start(); }
  bind() {
    this.prev?.addEventListener('click', () => this.move(-1));
    this.next?.addEventListener('click', () => this.move(1));
    this.track.addEventListener('transitionend', () => this.normalizePosition());
    this.shell.addEventListener('dragstart', event => event.preventDefault());
    this.shell.addEventListener('pointerdown', event => { this.beginDrag(event.clientX); try { this.shell.setPointerCapture?.(event.pointerId); } catch {} });
    this.shell.addEventListener('pointerup', event => this.finishDrag(event.clientX));
    this.shell.addEventListener('pointercancel', () => this.cancelDrag());
    this.shell.addEventListener('mousedown', event => this.beginDrag(event.clientX));
    window.addEventListener('mouseup', event => this.finishDrag(event.clientX));
    this.shell.addEventListener('touchstart', event => this.beginDrag(event.touches[0]?.clientX), {passive: true});
    this.shell.addEventListener('touchend', event => this.finishDrag(event.changedTouches[0]?.clientX), {passive: true});
    this.shell.addEventListener('touchcancel', () => this.cancelDrag(), {passive: true});
    this.root.addEventListener('focusin', () => this.stop());
    this.root.addEventListener('focusout', () => this.start());
    this.dots?.addEventListener('click', event => { const button = event.target.closest('[data-slide]'); if (button) this.goTo(Number(button.dataset.slide)); });
  }
  logicalIndex() { return this.count <= 1 ? 0 : (this.current - 1 + this.count) % this.count; }
  renderDots() { if (!this.dots) return; this.dots.innerHTML = this.original.map((_, index) => `<button type="button" data-slide="${index}" aria-label="${index + 1}번째 슬라이드"></button>`).join(''); this.updateDots(); }
  updateDots() { if (!this.dots) return; [...this.dots.children].forEach((dot, index) => dot.classList.toggle('active', index === this.logicalIndex())); }
  jump(animated = true) { if (!this.count) return; this.track.classList.toggle('is-animated', animated); this.track.style.transform = `translate3d(-${this.current * 100}%,0,0)`; this.updateDots(); }
  move(direction) { if (this.count <= 1) return; this.current += direction; this.jump(true); }
  goTo(index) { if (this.count <= 1) return; this.current = Math.max(0, Math.min(this.count - 1, index)) + 1; this.jump(true); this.restart(); }
  normalizePosition() { if (this.count <= 1) return; if (this.current === 0) { this.current = this.count; this.jump(false); } else if (this.current === this.count + 1) { this.current = 1; this.jump(false); } }
  start() { if (this.count <= 1 || this.timer) return; this.timer = setInterval(() => this.move(1), this.interval); }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  restart() { this.stop(); this.start(); }
  destroy() { this.stop(); }
}

function renderHero() {
  $('#heroTrack').innerHTML = HERO_BANNERS.map((banner, index) => `<article class="carousel-slide hero-slide"><picture><source media="(max-width:520px)" srcset="${banner.mobile}"><img src="${banner.desktop}" alt="${banner.alt}" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="this.onerror=null;this.src='${banner.fallback}'"></picture></article>`).join('');
  heroCarousel = new InfiniteCarousel($('#heroCarousel'), {interval: 3500});
}
function renderPromos() {
  $('#promoTrack').innerHTML = PROMOS.map(promo => `<article class="carousel-slide promo-card ${promo.kind}"><b>${promo.title}</b><span>${promo.desc}</span></article>`).join('');
  promoCarousel = new InfiniteCarousel($('#promoCarousel'), {interval: 3500});
}
function appIcon(key, cls = '') {
  const meta = APP_META[key]; if (!meta) return '';
  if (String(meta.icon).includes('/') || String(meta.icon).startsWith('http')) return `<img class="${cls}" src="${meta.icon}" alt="${meta.label}">`;
  return `<span class="${cls} miniemoji">${meta.icon}</span>`;
}
function mainCategories() {
  const preferred = CATEGORY_PREFERRED.filter(name => categories.includes(name));
  const remaining = categories.filter(name => !preferred.includes(name));
  return [...preferred, ...remaining].slice(0, 12);
}
function renderCategories() {
  $('#categoryGrid').innerHTML = mainCategories().map(name => `<button type="button" class="category ${state.category === name ? 'active' : ''}" data-cat="${escapeHtml(name)}"><span class="bubble">${categoryIcon(name)}</span><span>${escapeHtml(name)}</span></button>`).join('');
}
function relevance(store, query) {
  const q = normalize(query); if (!q) return 1;
  const name = normalize(store.name), text = storeText(store);
  if (name === q) return 100; if (name.startsWith(q)) return 90; if (name.includes(q)) return 80;
  if (normalize(store.cat).includes(q)) return 70; if (normalize(store.area).includes(q)) return 60;
  return text.includes(q) ? 50 : 0;
}
function filteredStores() {
  const brand = state.brandId ? BRAND_BY_ID[state.brandId] : null;
  return stores.map(store => ({store, score: relevance(store, state.query), distance: state.coords && store.lat !== null && store.lng !== null ? haversine(state.coords, {lat: store.lat, lng: store.lng}) : null}))
    .filter(item => item.score > 0)
    .filter(({store}) => state.sortByDistance || state.location === '여수시 전체' || normalize(store.area).includes(normalize(state.location)))
    .filter(({store}) => state.category === '전체' || store.cat === state.category)
    .filter(({store}) => !brand || brandMatchesStore(store, brand))
    .sort((a, b) => {
      if (state.sortByDistance) {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
      }
      const aPin = Number.isFinite(Number(a.store.pinPosition)) ? Number(a.store.pinPosition) : 9999;
      const bPin = Number.isFinite(Number(b.store.pinPosition)) ? Number(b.store.pinPosition) : 9999;
      if (aPin !== bPin) return aPin - bPin;
      if (a.store.forceBottom !== b.store.forceBottom) return a.store.forceBottom ? 1 : -1;
      if (a.store.managed !== b.store.managed) return a.store.managed ? -1 : 1;
      if (a.store.sharedManaged !== b.store.sharedManaged) return a.store.sharedManaged ? -1 : 1;
      return b.score - a.score || a.store.name.localeCompare(b.store.name, 'ko');
    }).map(item => ({...item.store, distance: item.distance}));
}
function miniRoutes(store) {
  const keys = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand', 'yogiyo', 'coupang', 'baemin'];
  return keys.filter(key => routeFor(store, key)).slice(0, 6).map(key => appIcon(key, 'miniapp-icon')).join('');
}
function storeCard(store) {
  const distanceLabel = store.coordinateSource === 'district-centroid' ? '동네 중심 기준 약' : '현재 위치에서 약';
  const distance = Number.isFinite(store.distance)
    ? `<span class="distance-note">${distanceLabel} ${store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}</span>`
    : state.sortByDistance ? '<span class="distance-note distance-pending">거리 정보 준비 중</span>' : '';
  return `<article class="store-card" data-id="${escapeHtml(store.id)}">${photoResolver.markup(store, 'card')}<div class="store-info"><h3 title="${escapeHtml(store.name)}">${escapeHtml(store.name)}</h3><p>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p>${distance}<div class="miniapps">${miniRoutes(store)}</div></div><button class="order-open" type="button">주문방법 보기</button></article>`;
}
function renderStores({scroll = false, resetCount = false} = {}) {
  if (resetCount) state.visibleCount = 40;
  const list = filteredStores(), visible = list.slice(0, state.visibleCount);
  let title = '오늘의 추천';
  if (state.brandId) title = `${BRAND_BY_ID[state.brandId].label} 가게`;
  else if (state.category !== '전체' && state.sortByDistance) title = `${state.category} 가까운 가게`;
  else if (state.category !== '전체') title = `${state.category} 가게`;
  else if (state.query) title = `'${state.query}' 검색 결과`;
  else if (state.sortByDistance) title = '내 위치에서 가까운 가게';
  else if (state.location !== '여수시 전체') title = `${state.location} 추천`;
  $('#recommendSection h2').textContent = title;
  $('#resetCategoryBtn').hidden = state.category === '전체' && !state.brandId && !state.query;
  $('#storeGrid').innerHTML = visible.length ? visible.map(storeCard).join('') : '<div class="empty">조건에 맞는 가게가 아직 없습니다.</div>';
  $('#loadMoreBtn').hidden = visible.length >= list.length || !list.length;
  $('#loadMoreBtn').textContent = `가게 더 보기 (${visible.length}/${list.length})`;
  const filters = [];
  if (state.query) filters.push(`검색어 ${state.query}`);
  if (state.category !== '전체') filters.push(state.category);
  if (state.brandId) filters.push(BRAND_BY_ID[state.brandId].label);
  if (state.sortByDistance) filters.push('현재 위치순'); else if (state.location !== '여수시 전체') filters.push(state.location);
  $('#searchSummary').hidden = !filters.length;
  $('#searchSummary').innerHTML = filters.length ? `<strong>${list.length}곳</strong><span>${filters.map(escapeHtml).join(' · ')}</span><button id="clearSearch" class="text-btn" type="button">검색·카테고리 초기화</button>` : '';
  renderCategories();
  if (scroll) $('#recommendSection').scrollIntoView({behavior: 'smooth', block: 'start'});
}

function openModal(html) {
  detailCarousel?.destroy(); detailCarousel = null;
  $('#modalContent').innerHTML = html;
  const wasHidden = $('#modal').hidden;
  $('#overlay').hidden = false; $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  if (wasHidden) history.pushState({modal: true}, '');
  setTimeout(() => $('.modal-close')?.focus(), 0);
}
function closeModal({fromPop = false} = {}) {
  if ($('#modal').hidden) return;
  detailCarousel?.destroy(); detailCarousel = null;
  $('#modal').hidden = true; $('#overlay').hidden = true; document.body.style.overflow = '';
  if (!fromPop && history.state?.modal) history.back();
}
function guide() {
  openModal(`<h2 id="modalTitle">여수와 함께하는 주문방법</h2><p>가게를 먼저 고르면 실제 이용 가능한 주문경로만 보여줍니다. 낮은 수수료 주문경로를 앞에 안내하며, 요기요·쿠팡이츠·배달의민족을 선택해도 선택한 앱과 저수수료 경로를 같은 상세창에서 함께 확인할 수 있습니다.</p><div class="guide-list"><button type="button">🏪 가게바로주문</button><button type="button">📱 먹깨비·땡겨요·온동네</button><button type="button">🏷️ 브랜드앱</button><button type="button">📦 요기요·쿠팡이츠·배달의민족</button></div>`);
}
function globalExternalGuide(key) {
  const app = GLOBAL_EXTERNAL_APPS[key]; if (!app) return;
  openModal(`<section class="fee-guide-panel global-fee-guide" data-selected-app="${key}"><h2 id="modalTitle">${escapeHtml(app.label)} 선택</h2><p>선택한 앱을 그대로 이용할 수 있습니다. 가게를 먼저 선택하면 해당 가게에서 가능한 가게바로주문·먹깨비·땡겨요·온동네·브랜드앱도 같은 상세창에서 함께 안내합니다.</p><div class="fee-guide-actions"><a class="selected-app-continue" href="${escapeHtml(app.url)}" target="_blank" rel="noopener">${escapeHtml(app.label)}으로 계속하기</a><button class="primary-btn" type="button" data-go-stores>가게 먼저 선택하기</button></div></section>`);
}
function brandLogo(brand) { return brand.icon ? `<img src="${brand.icon}" alt="${escapeHtml(brand.label)}" loading="lazy"><span hidden>${escapeHtml(brand.label)}</span>` : '<span class="order-icon">🏷️</span>'; }
function brandsModal() {
  const groups = BRAND_GROUPS.map(group => `<section class="brand-category"><h3>${group.name}</h3><div class="brand-grid">${group.brands.map(brand => { const count = brandCount(brand); return `<button type="button" class="brand-tile" data-brand-id="${brand.id}">${brandLogo(brand)}<b>${escapeHtml(brand.label)}</b><small>${count ? `${count}곳` : '등록 준비'}</small></button>`; }).join('')}</div></section>`).join('');
  openModal(`<h2 id="modalTitle">브랜드앱 주문 가능 가게</h2><p>브랜드를 누르면 여수에 등록된 해당 브랜드 가게만 모아 보여드립니다.</p>${groups}`);
}
function allCategoriesModal() {
  openModal(`<h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list">${categories.map(name => `<button type="button" data-modal-cat="${escapeHtml(name)}"><span>${categoryIcon(name)}</span><b>${escapeHtml(name)}</b></button>`).join('')}</div>`);
}
function saveLocationState(label, coords = null, sortByDistance = false) {
  const saved = {label, coords, sortByDistance, savedAt: new Date().toISOString()};
  localStorage.setItem('savedLocation', JSON.stringify(saved));
  localStorage.setItem('location', label);
}
function areaModal() {
  const areas = ['여수시 전체', ...new Set(stores.map(store => store.area).filter(Boolean))].sort((a, b) => a === '여수시 전체' ? -1 : a.localeCompare(b, 'ko'));
  openModal(`<h2 id="modalTitle">지역·주소 설정</h2><p class="muted">저장된 지역은 다음 방문에도 유지됩니다.</p><div class="location-actions"><button type="button" class="gps-btn" id="gpsLocationBtn">📍 위치 권한으로 가까운 순</button><button type="button" id="allYeosuBtn">여수시 전체</button></div><div class="searchbox area-search"><input id="areaSearchInput" aria-label="지역 주소 검색" placeholder="예: 여서동, 웅천동"><button id="clearAreaSearch" class="input-clear" type="button" hidden>×</button></div><div id="areaResults" class="location-list"></div>`);
  const input = $('#areaSearchInput'), clear = $('#clearAreaSearch');
  const render = (query = '') => {
    $('#areaResults').innerHTML = areas.filter(area => area !== '여수시 전체').filter(area => !query || normalize(area).includes(normalize(query))).map(area => `<button type="button" data-location="${escapeHtml(area)}">${escapeHtml(area)}</button>`).join('') || '<div class="empty">검색된 지역이 없습니다.</div>';
  };
  input.addEventListener('input', () => { clear.hidden = !input.value; render(input.value); });
  clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; render(); });
  $('#allYeosuBtn').addEventListener('click', () => selectLocation('여수시 전체'));
  $('#gpsLocationBtn').addEventListener('click', useCurrentLocation);
  render();
}
function selectLocation(area) {
  state.location = area; state.sortByDistance = false; state.coords = null;
  saveLocationState(area, null, false);
  $('#locationText').textContent = area; closeModal();
  setTimeout(() => renderStores({scroll: true, resetCount: true}), 60);
}
function useCurrentLocation() {
  const button = $('#gpsLocationBtn');
  if (!navigator.geolocation) { button.textContent = '이 기기는 위치 기능을 지원하지 않습니다'; return; }
  button.disabled = true; button.textContent = '현재 위치 확인 중…';
  navigator.geolocation.getCurrentPosition(position => {
    state.coords = {lat: position.coords.latitude, lng: position.coords.longitude};
    state.sortByDistance = true; state.location = '현재 위치 기준';
    saveLocationState(state.location, state.coords, true);
    $('#locationText').textContent = state.location; closeModal();
    setTimeout(() => renderStores({scroll: true, resetCount: true}), 60);
  }, error => {
    button.disabled = false;
    button.textContent = error.code === 1 ? '위치 권한을 허용해 주세요' : '현재 위치를 확인하지 못했습니다';
  }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000});
}
function myPage() {
  const recent = JSON.parse(localStorage.getItem('recent') || '[]');
  openModal(`<h2 id="modalTitle">마이페이지</h2><p>로그인 없이 이 기기에 저장된 정보입니다.</p><div class="my-list"><button type="button">♡ 찜한 가게</button><button type="button">◷ 최근 방문 가게 <b>${recent.length}곳</b></button><button type="button">📍 저장 지역 — ${escapeHtml(state.location)}</button><button type="button">❓ 주문방법 안내</button><button type="button">✉ 정보 수정·광고 문의</button></div>`);
}
function routeLink(route, extraClass = '') {
  return `<a class="detail-route ${extraClass}" href="${escapeHtml(route.url)}" target="_blank" rel="noopener">${appIcon(route.key, 'detail-route-icon')}<span>${escapeHtml(route.name)}</span><b>›</b></a>`;
}
function feeGuideMarkup(store, selectedRoute) {
  const lowFee = LOW_FEE_KEYS.map(key => routeFor(store, key)).filter(Boolean);
  return `<section id="feeGuidePanel" class="fee-guide-panel" data-selected-app="${selectedRoute.key}"><div class="fee-guide-heading">${appIcon(selectedRoute.key, 'fee-guide-icon')}<div><h3>${escapeHtml(selectedRoute.name)}을 선택했습니다</h3><p>원래 선택한 앱으로 계속하거나, 이 가게에서 가능한 저수수료 주문경로를 함께 비교하세요.</p></div></div><div class="low-fee-options">${lowFee.length ? lowFee.map(route => routeLink(route, 'low-fee-route')).join('') : '<p class="muted">이 가게에 등록된 별도 저수수료 경로가 아직 없습니다.</p>'}</div><a class="selected-app-continue" href="${escapeHtml(selectedRoute.url)}" target="_blank" rel="noopener">${escapeHtml(selectedRoute.name)}으로 계속 주문하기</a></section>`;
}
function openStore(store) {
  let recent = JSON.parse(localStorage.getItem('recent') || '[]').filter(item => item.id !== store.id);
  recent.unshift({id: store.id, name: store.name, area: store.area, cat: store.cat, img: photoResolver.resolve(store)?.src || ''});
  localStorage.setItem('recent', JSON.stringify(recent.slice(0, 20)));

  const ordered = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand', 'phone', 'chak'];
  const primary = [], external = [];
  store.routes.forEach(route => (EXTERNAL_APP_KEYS.includes(route.key) ? external : primary).push(route));
  primary.sort((a, b) => ordered.indexOf(a.key) - ordered.indexOf(b.key));
  const routeButtons = primary.map(route => routeLink(route)).join('');
  const phone = store.phone && !primary.some(route => route.key === 'phone') ? `<a class="detail-route" href="tel:${escapeHtml(store.phone)}"><span class="detail-route-icon miniemoji">☎</span><span>전화주문 ${escapeHtml(store.phone)}</span><b>›</b></a>` : '';
  const map = store.naverMap && store.naverMap !== '#' ? `<a class="detail-route" data-detail-only="naver" href="${escapeHtml(store.naverMap)}" target="_blank" rel="noopener">${appIcon('naver', 'detail-route-icon')}<span>네이버지도에서 보기</span><b>›</b></a>` : '';
  const externalMenu = external.length ? `<div class="store-other-wrap"><button class="detail-route store-other-toggle" type="button"><span class="detail-route-icon miniemoji">📦</span><span>요기요·쿠팡이츠·배달의민족</span><span class="other-inline-icons">${external.map(route => appIcon(route.key, 'other-inline-icon')).join('')}</span></button><div class="store-other-popover" hidden>${external.map((route, index) => `<button type="button" data-external-route="${index}">${appIcon(route.key, 'store-other-icon')}<span>${escapeHtml(route.name)}</span></button>`).join('')}</div></div>` : '';

  openModal(`<article class="store-detail" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)}</h2>${photoResolver.galleryMarkup(store)}<p class="detail-meta">${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}${store.address ? `<br>${escapeHtml(store.address)}` : ''}</p><div class="detail-routes">${routeButtons}${phone}${map}${externalMenu}</div><div id="feeGuideMount"></div></article>`);
  const carouselRoot = $('#detailPhotoCarousel');
  if (carouselRoot) detailCarousel = new InfiniteCarousel(carouselRoot, {interval: 3500});
  $('#modal').dataset.activeStoreId = store.id;
  $('#modal').dataset.externalRoutes = JSON.stringify(external);
}

async function fetchJson(url, fallback) {
  try {
    const response = await fetch(`${url}?v=${Date.now()}`, {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`${url} 로딩 실패`, error); return fallback;
  }
}
async function initialize() {
  renderHero(); renderPromos();
  const [rawStores, manifest, policy] = await Promise.all([fetchJson(DATA_URL, []), fetchJson(PHOTO_MANIFEST_URL, {entries: []}), fetchJson(PHOTO_POLICY_URL, {})]);
  photoResolver = new PhotoResolver(manifest, policy);
  stores = rawStores.map(normalizedStore);
  categories = [...new Set(stores.map(store => store.cat).filter(Boolean))].sort((a, b) => {
    const ai = CATEGORY_PREFERRED.indexOf(a), bi = CATEGORY_PREFERRED.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.localeCompare(b, 'ko');
  });
  $('#locationText').textContent = state.location;
  renderCategories(); renderStores();
}
function resetFilters() {
  state.query = ''; state.category = '전체'; state.brandId = '';
  $('#mainSearch').value = ''; $('#clearMainSearch').hidden = true;
  renderStores({resetCount: true});
}

document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) handleImageError(event.target); }, true);
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  $('#mainSearch').addEventListener('input', () => $('#clearMainSearch').hidden = !$('#mainSearch').value);
  $('#mainSearch').addEventListener('keydown', event => { if (event.key === 'Enter') $('#searchBtn').click(); });
  $('#clearMainSearch').addEventListener('click', () => { $('#mainSearch').value = ''; state.query = ''; $('#clearMainSearch').hidden = true; renderStores({resetCount: true}); $('#mainSearch').focus(); });
  $('#searchBtn').addEventListener('click', () => { state.query = $('#mainSearch').value.trim(); state.category = '전체'; state.brandId = ''; renderStores({scroll: true, resetCount: true}); });
  $('#categoryGrid').addEventListener('click', event => { const button = event.target.closest('[data-cat]'); if (!button) return; state.category = button.dataset.cat; state.brandId = ''; state.query = ''; $('#mainSearch').value = ''; $('#clearMainSearch').hidden = true; renderStores({scroll: true, resetCount: true}); });
  $('#allCategoryBtn').addEventListener('click', allCategoriesModal);
  $('#loadMoreBtn').addEventListener('click', () => { state.visibleCount += 40; renderStores(); });
  $('#resetCategoryBtn').addEventListener('click', resetFilters);
  $('#locationBtn').addEventListener('click', areaModal);

  const pop = $('#moreAppsPopover');
  $('#moreAppsBtn').addEventListener('click', event => { event.stopPropagation(); pop.hidden = !pop.hidden; });
  $('.popover-close').addEventListener('click', () => pop.hidden = true);
  document.addEventListener('click', event => { if (!pop.hidden && !event.target.closest('#moreAppsPopover') && !event.target.closest('#moreAppsBtn')) pop.hidden = true; });

  $$('[data-open]').forEach(button => button.addEventListener('click', () => ({mypage: myPage, guide, brands: brandsModal}[button.dataset.open] || guide)()));
  $('.modal-close').addEventListener('click', () => closeModal());
  $('#overlay').addEventListener('click', () => closeModal());
  $('#modal').addEventListener('click', event => { if (event.target === $('#modal')) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  document.addEventListener('click', event => {
    if (event.target.id === 'clearSearch') { resetFilters(); return; }
    const globalExternal = event.target.closest('[data-global-external]');
    if (globalExternal) { pop.hidden = true; globalExternalGuide(globalExternal.dataset.globalExternal); return; }
    if (event.target.closest('[data-go-stores]')) { closeModal(); setTimeout(() => $('#recommendSection').scrollIntoView({behavior: 'smooth'}), 50); return; }
    const brandButton = event.target.closest('[data-brand-id]');
    if (brandButton) { state.brandId = brandButton.dataset.brandId; state.category = '전체'; state.query = ''; $('#mainSearch').value = ''; closeModal(); setTimeout(() => renderStores({scroll: true, resetCount: true}), 60); return; }
    const categoryButton = event.target.closest('[data-modal-cat]');
    if (categoryButton) { state.category = categoryButton.dataset.modalCat; state.brandId = ''; state.query = ''; $('#mainSearch').value = ''; closeModal(); setTimeout(() => renderStores({scroll: true, resetCount: true}), 60); return; }
    const locationButton = event.target.closest('[data-location]');
    if (locationButton) { selectLocation(locationButton.dataset.location); return; }
    const toggle = event.target.closest('.store-other-toggle');
    if (toggle) { event.preventDefault(); event.stopPropagation(); const menu = toggle.closest('.store-other-wrap').querySelector('.store-other-popover'); $$('.store-other-popover').forEach(item => { if (item !== menu) item.hidden = true; }); menu.hidden = !menu.hidden; return; }
    const externalButton = event.target.closest('[data-external-route]');
    if (externalButton) {
      event.preventDefault(); event.stopPropagation();
      const store = stores.find(item => item.id === $('#modal').dataset.activeStoreId);
      const externalRoutes = JSON.parse($('#modal').dataset.externalRoutes || '[]');
      const selected = externalRoutes[Number(externalButton.dataset.externalRoute)];
      if (store && selected) {
        $('#feeGuideMount').innerHTML = feeGuideMarkup(store, selected);
        $$('.store-other-popover').forEach(item => item.hidden = true);
        $('#feeGuidePanel').scrollIntoView({behavior: 'smooth', block: 'nearest'});
      }
      return;
    }
    if (!event.target.closest('.store-other-wrap')) $$('.store-other-popover').forEach(item => item.hidden = true);
  });

  $('#storeGrid').addEventListener('click', event => { const card = event.target.closest('.store-card'); if (!card) return; const store = stores.find(item => item.id === card.dataset.id); if (store) openStore(store); });
  $('#noticeBtn').addEventListener('click', () => openModal(`<h2 id="modalTitle">알림</h2><div class="my-list">${PROMOS.map(promo => `<button type="button">${promo.title}</button>`).join('')}</div>`));
  $('.bottom-nav').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    $$('.bottom-nav button').forEach(item => item.classList.remove('active')); button.classList.add('active');
    const tab = button.dataset.tab;
    if (tab === 'home') scrollTo({top: 0, behavior: 'smooth'});
    if (tab === 'search') { $('#mainSearch').focus(); scrollTo({top: $('.main-search-row').offsetTop - 10, behavior: 'smooth'}); }
    if (tab === 'mypage') myPage();
    if (tab === 'recent') { const recent = JSON.parse(localStorage.getItem('recent') || '[]'); openModal(`<h2 id="modalTitle">최근 방문 가게</h2>${recent.length ? recent.map(item => `<div class="phone-result">${item.img ? `<img src="${escapeHtml(item.img)}" alt="">` : placeholderMarkup('card')}<div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.area)} · ${escapeHtml(item.cat)}</small></div></div>`).join('') : '<div class="empty">최근 방문한 가게가 없습니다.</div>'}`); }
    if (tab === 'favorite') openModal('<h2 id="modalTitle">찜한 가게</h2><div class="empty">찜 기능은 정식 회원 기능과 함께 연결됩니다.</div>');
  });

  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Asia/Seoul'}), startupAd = $('#startupAd');
  let startupHistoryOpen = false;
  const openStartupAd = () => { startupAd.hidden = false; document.body.style.overflow = 'hidden'; if (!startupHistoryOpen) { history.pushState({startupAd: true}, ''); startupHistoryOpen = true; } };
  const closeStartupAd = ({fromPop = false} = {}) => { if (startupAd.hidden) return; startupAd.hidden = true; document.body.style.overflow = ''; const goBack = !fromPop && startupHistoryOpen && history.state?.startupAd; startupHistoryOpen = false; if (goBack) history.back(); };
  if (localStorage.getItem('hideStartup') !== today) setTimeout(openStartupAd, 600);
  $('.startup-close').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); closeStartupAd(); });
  startupAd.addEventListener('click', event => { if (event.target === startupAd) closeStartupAd(); });
  $('.startup-card').addEventListener('click', event => event.stopPropagation());
  $('#hideToday').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); localStorage.setItem('hideStartup', today); closeStartupAd(); });
  $('#startupDetails').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); closeStartupAd(); setTimeout(() => openModal(`<h2 id="modalTitle">대동여수음식지도 모집·광고 안내</h2><div class="guide-list">${PROMOS.map(promo => `<button type="button">${promo.title}<br><small>${promo.desc}</small></button>`).join('')}</div>`), 60); });
  window.addEventListener('popstate', () => { if (!startupAd.hidden) { closeStartupAd({fromPop: true}); return; } if (!$('#modal').hidden) closeModal({fromPop: true}); });
});
