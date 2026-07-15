const APP_META = {
  direct:   {label:'가게바로주문', icon:'🏪'},
  mukkebi:  {label:'먹깨비', icon:'assets/mukkebi-v7.png'},
  ddangyo:  {label:'땡겨요', icon:'assets/ddangyo-v7.png'},
  yogiyo:   {label:'요기요', icon:'assets/yogiyo.jpg'},
  coupang:  {label:'쿠팡이츠', icon:'assets/coupang-eats.jpg'},
  baemin:   {label:'배달의민족', icon:'assets/baemin.jpg'}
};

// 각 주문경로는 실제 링크가 있을 때만 고객 화면에 표시됩니다.
// 현재 샘플 데이터의 외부앱 주소는 기능 확인용 메인 앱 주소이며,
// 노션의 가게별 링크를 가져오면 해당 가게 상세 주소로 교체됩니다.
const stores = [
  {id:1,name:'땅스부대찌개 여서점',area:'여서동',cat:'한식',phone:'061-123-4567',img:'assets/store1.jpg',tags:['부대찌개','한식','찌개','햄'],links:{direct:'#direct-1',mukkebi:'https://play.google.com/store/apps/details?id=mukkebi.user.app.android',ddangyo:'https://play.google.com/store/apps/details?id=com.shinhan.o2o',yogiyo:'https://play.google.com/store/apps/details?id=com.fineapp.yogiyo'}},
  {id:2,name:'명품육회 오림동점',area:'오림동',cat:'회·해산물',phone:'061-234-5678',img:'assets/store2.jpg',tags:['육회','회','고기','한식'],links:{mukkebi:'https://play.google.com/store/apps/details?id=mukkebi.user.app.android',ddangyo:'https://play.google.com/store/apps/details?id=com.shinhan.o2o',coupang:'https://play.google.com/store/apps/details?id=com.coupang.mobile.eats'}},
  {id:3,name:'네네치킨 여서문수점',area:'여서동',cat:'치킨',phone:'061-345-6789',img:'assets/store3.jpg',tags:['치킨','후라이드','양념'],links:{direct:'#direct-3',mukkebi:'https://play.google.com/store/apps/details?id=mukkebi.user.app.android',ddangyo:'https://play.google.com/store/apps/details?id=com.shinhan.o2o',baemin:'https://play.google.com/store/apps/details?id=com.sampleapp'}},
  {id:4,name:'핵떡 여수봉산점',area:'봉산동',cat:'분식',phone:'061-456-7890',img:'assets/store4.jpg',tags:['떡볶이','김밥','분식','튀김'],links:{direct:'#direct-4',mukkebi:'https://play.google.com/store/apps/details?id=mukkebi.user.app.android'}},
];

const categoryItems = [
  ['🍲','한식'],['🍗','치킨'],['🍕','피자'],['🍜','중식'],
  ['🍢','분식'],['🥩','족발·보쌈'],['🐟','회·해산물']
];

const allCategories = [
  ...categoryItems,
  ['🍔','햄버거'],['🥘','고기·구이'],['🌙','야식·주점'],['🌶️','마라탕·양꼬치'],['🥗','반찬'],['☕','카페·디저트']
];

const yeosuAreas = [
  '여수시 전체','공화동','관문동','고소동','교동','광무동','국동','남산동','덕충동','동문동',
  '둔덕동','만흥동','미평동','문수동','봉강동','봉산동','서교동','소라면','소호동','시전동',
  '신기동','안산동','여서동','연등동','오림동','웅천동','월호동','율촌면','종화동','중앙동',
  '충무동','학동','화장동','화정면','돌산읍','삼일동','묘도동','주삼동'
];

const ads = [
  {title:'신규 오픈 가게를 만나보세요',desc:'여수의 새로운 맛집과 특별한 혜택',bg:'assets/store4.jpg'},
  {title:'배송기사 모집',desc:'베테랑 배달연합과 함께할 기사님을 찾습니다',bg:'assets/store2.jpg'},
  {title:'배달대행 가맹점 모집',desc:'가게 사장님을 위한 주문·홍보·배달 연결',bg:'assets/store1.jpg'},
  {title:'먹깨비·땡겨요·온동네 가입 안내',desc:'저수수료 주문경로를 손쉽게 연결하세요',bg:'assets/store3.jpg'},
  {title:'소상공인협회 알림',desc:'여수 소상공인을 위한 중요한 소식',bg:'assets/store2.jpg'}
];

const state = { query:'', category:'전체', slide:0 };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function normalize(v){ return String(v ?? '').trim().toLowerCase().replace(/\s+/g,''); }
function haystack(store){ return normalize([store.name,store.area,store.cat,...store.tags].join(' ')); }
function relevance(store, query){
  const q = normalize(query);
  const name = normalize(store.name);
  const tags = store.tags.map(normalize);
  if(name === q) return 100;
  if(name.startsWith(q)) return 90;
  if(name.includes(q)) return 80;
  if(tags.includes(q)) return 70;
  if(tags.some(t => t.includes(q) || q.includes(t))) return 60;
  if(normalize(store.cat).includes(q) || normalize(store.area).includes(q)) return 50;
  return haystack(store).includes(q) ? 40 : 0;
}

function renderAds(){
  $('#heroTrack').innerHTML = ads.map(a => `<article class="hero-card" style="background-image:url('${a.bg}')"><h2>${a.title}</h2><p>${a.desc}</p></article>`).join('');
  $('#heroDots').innerHTML = ads.map((_,i) => `<i class="${i===0?'active':''}"></i>`).join('');
}
function showSlide(i){
  state.slide = (i + ads.length) % ads.length;
  $('#heroTrack').style.transform = `translateX(-${state.slide*100}%)`;
  $$('#heroDots i').forEach((d,j) => d.classList.toggle('active',j===state.slide));
}
renderAds();
setInterval(() => showSlide(state.slide + 1), 3500);

function renderCategories(){
  $('#categoryGrid').innerHTML = categoryItems.map(([emoji,name]) => `<button class="category" data-cat="${name}"><span class="bubble">${emoji}</span><span>${name}</span></button>`).join('');
}
renderCategories();

function recommendationList(){
  return stores.filter(s => state.category === '전체' || s.cat === state.category);
}

function searchList(query){
  const direct = stores
    .map(s => ({s, score:relevance(s,query)}))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(x => x.s);
  if(!direct.length) return [];
  const similar = stores.filter(s => !direct.some(d => d.id === s.id) && direct.some(d => d.cat === s.cat));
  return [...direct, ...similar];
}

function appIcon(key, cls=''){
  const meta = APP_META[key];
  if(!meta) return '';
  if(meta.icon.startsWith('assets/')) return `<img class="${cls}" src="${meta.icon}" alt="${meta.label}">`;
  return `<span class="${cls} emoji-app">${meta.icon}</span>`;
}
function availableOtherApps(s){
  return ['yogiyo','coupang','baemin'].filter(key => s.links?.[key]);
}
function storeCard(s){
  const smallApps = ['mukkebi','ddangyo',...availableOtherApps(s)].filter(key => s.links?.[key]);
  const mini = smallApps.map(key => appIcon(key,'miniapp-icon')).join('');
  return `<article class="store-card" data-id="${s.id}">
    <img src="${s.img}" alt="${s.name}">
    <div class="store-info"><h3>${s.name}</h3><p>${s.area} · ${s.cat}</p><div class="miniapps">${mini}</div></div>
    <button class="order-open">주문방법 보기</button>
  </article>`;
}

function renderStores({scroll=false}={}){
  const q = state.query.trim();
  let list;
  let title;
  let summary = '';

  if(q){
    const found = searchList(q);
    if(found.length){
      list = found;
      title = `'${q}' 검색 결과`;
      summary = `<strong>검색 결과 ${found.length}곳</strong><span>정확한 결과부터 비슷한 가게 순서로 보여드립니다.</span><button id="clearSearch" class="text-btn">검색 초기화</button>`;
    }else{
      list = recommendationList();
      title = '검색 결과가 없어 추천 가게를 보여드립니다';
      summary = `<strong>'${q}' 검색 결과가 없습니다.</strong><span>추천 가게는 그대로 보여드립니다.</span><button id="clearSearch" class="text-btn">검색 초기화</button>`;
    }
    $('#searchSummary').hidden = false;
    $('#searchSummary').innerHTML = summary;
  }else{
    list = recommendationList();
    title = state.category === '전체' ? '오늘의 추천' : `${state.category} 추천`;
    $('#searchSummary').hidden = true;
  }

  $('#recommendSection h2').textContent = title;
  $('#resetCategoryBtn').hidden = state.category === '전체';
  $('#storeGrid').innerHTML = list.length ? list.map(storeCard).join('') : '<div class="empty">이 카테고리에 등록된 가게가 아직 없습니다.</div>';
  if(scroll) $('#recommendSection').scrollIntoView({behavior:'smooth',block:'start'});
}
renderStores();

function updateClearButton(){ $('#clearMainSearch').hidden = !$('#mainSearch').value; }
$('#mainSearch').addEventListener('input', updateClearButton);
$('#mainSearch').addEventListener('keydown', e => { if(e.key === 'Enter') $('#searchBtn').click(); });
$('#clearMainSearch').addEventListener('click', () => {
  $('#mainSearch').value = '';
  state.query = '';
  updateClearButton();
  renderStores();
  $('#mainSearch').focus();
});
$('#searchBtn').addEventListener('click', () => {
  state.query = $('#mainSearch').value.trim();
  state.category = '전체';
  renderStores({scroll:true});
});
$('#categoryGrid').addEventListener('click', e => {
  const button = e.target.closest('[data-cat]');
  if(!button) return;
  state.category = button.dataset.cat;
  state.query = '';
  $('#mainSearch').value = '';
  updateClearButton();
  renderStores({scroll:true});
});
$('#resetCategoryBtn').addEventListener('click', () => {
  state.category = '전체';
  renderStores({scroll:true});
});
document.addEventListener('click', e => {
  if(e.target.id === 'clearSearch'){
    state.query = '';
    $('#mainSearch').value = '';
    updateClearButton();
    renderStores();
  }
});

const pop = $('#moreAppsPopover');
$('#moreAppsBtn').addEventListener('click', e => { e.stopPropagation(); pop.hidden = !pop.hidden; });
$('.popover-close').addEventListener('click', () => pop.hidden = true);
document.addEventListener('click', e => { if(!pop.hidden && !e.target.closest('#moreAppsPopover') && !e.target.closest('#moreAppsBtn')) pop.hidden = true; });

function openModal(html){
  $('#modalContent').innerHTML = html;
  $('#overlay').hidden = false;
  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';
  history.pushState({modal:true},'');
}
function closeModal({fromPop=false}={}){
  if($('#modal').hidden) return;
  $('#modal').hidden = true;
  $('#overlay').hidden = true;
  document.body.style.overflow = '';
  if(!fromPop && history.state?.modal) history.back();
}
$('.modal-close').addEventListener('click', () => closeModal());
$('#overlay').addEventListener('click', () => closeModal());

function renderPhoneResults(query){
  const q = query.trim();
  const list = q ? searchList(q) : stores;
  $('#phoneResults').innerHTML = list.length ? list.map(s => `<div class="phone-result"><img src="${s.img}"><div><b>${s.name}</b><small>${s.area} · ${s.cat}<br>☎ ${s.phone}</small></div><a class="call-btn" href="tel:${s.phone}">통화하기</a></div>`).join('') : '<div class="empty">검색 결과가 없습니다.</div>';
}
function phoneModal(){
  openModal(`<h2>전화주문</h2><p>원하는 가게를 검색하면 전화번호를 확인하고 바로 통화할 수 있습니다.</p><div class="search-row modal-search-row"><div class="searchbox"><input id="phoneInput" placeholder="가게명·메뉴·동네 검색"><button id="clearPhoneSearch" class="input-clear" hidden>×</button></div><button id="phoneSearch" class="primary-btn">검색</button></div><div id="phoneResults" class="phone-results"></div>`);
  const input = $('#phoneInput');
  const clear = $('#clearPhoneSearch');
  const sync = () => clear.hidden = !input.value;
  const run = () => renderPhoneResults(input.value);
  input.addEventListener('input', sync);
  input.addEventListener('keydown', e => { if(e.key === 'Enter') run(); });
  $('#phoneSearch').addEventListener('click', run);
  clear.addEventListener('click', () => { input.value=''; sync(); renderPhoneResults(''); input.focus(); });
  renderPhoneResults('');
}

function myPage(){
  const fav = JSON.parse(localStorage.getItem('favorites') || '[]');
  const recent = JSON.parse(localStorage.getItem('recent') || '[]');
  openModal(`<h2>마이페이지</h2><p>로그인 없이 이 기기에 저장된 정보입니다.</p><div class="my-list"><button>♡ 찜한 가게 <b>${fav.length}곳</b></button><button>◷ 최근 방문 가게 <b>${recent.length}곳</b></button><button>⌕ 최근 검색어</button><button>🔔 알림 내역</button><button>📍 지역 설정 — ${$('#locationText').textContent}</button><button>☷ 관심 카테고리 설정</button><button>⚙ 주문 앱 선호 설정</button><button>❓ 주문방법 안내</button><button>✉ 문의하기</button><button>ⓘ 서비스 소개</button><button>▤ 이용약관·개인정보처리방침</button></div>`);
}
function guide(){ openModal(`<h2>대동여수음식지도 이용 안내</h2><div class="guide-list"><button>모든 주문방법을 한곳에서 비교</button><button>정확한 가게·전화번호·영업정보</button><button>지역상품권 사용 가능 정보</button><button>현재 위치 기반 가까운 가게 추천</button><button>신규 오픈·할인·지역 소식</button></div>`); }
function brands(){ openModal(`<h2>브랜드앱 주문 가능 가게</h2><div class="brand-list"><a href="#">치킨 브랜드</a><a href="#">피자 브랜드</a><a href="#">햄버거 브랜드</a><a href="#">족발·보쌈 브랜드</a></div>`); }

$$('[data-open]').forEach(b => b.addEventListener('click', () => ({phone:phoneModal,mypage:myPage,guide,brands}[b.dataset.open] || guide)()));

function renderAreaList(query=''){
  const q = normalize(query);
  const list = yeosuAreas.filter(area => !q || normalize(area).includes(q));
  $('#areaResults').innerHTML = list.length ? list.map(area => `<button data-location="${area}">${area}</button>`).join('') : '<div class="empty">검색된 지역이 없습니다.</div>';
}
$('#locationBtn').addEventListener('click', () => {
  openModal(`<h2>지역 선택</h2><p>동네 이름을 검색하세요.</p><div class="searchbox area-search"><input id="areaSearchInput" placeholder="예: 여서동, 웅천동"><button id="clearAreaSearch" class="input-clear" hidden>×</button></div><div id="areaResults" class="location-list searchable"></div>`);
  const input = $('#areaSearchInput');
  const clear = $('#clearAreaSearch');
  input.addEventListener('input', () => { clear.hidden = !input.value; renderAreaList(input.value); });
  clear.addEventListener('click', () => { input.value=''; clear.hidden=true; renderAreaList(); input.focus(); });
  renderAreaList();
});
document.addEventListener('click', e => {
  if(e.target.dataset.location){
    $('#locationText').textContent = e.target.dataset.location;
    localStorage.setItem('location', e.target.dataset.location);
    closeModal();
  }
});
$('#locationText').textContent = localStorage.getItem('location') || '여수시 전체';

$('#allCategoryBtn').addEventListener('click', () => {
  openModal(`<h2>전체 음식 카테고리</h2><div class="all-category-list">${allCategories.map(([emoji,name]) => `<button data-modal-cat="${name}"><span>${emoji}</span><b>${name}</b></button>`).join('')}</div>`);
});
document.addEventListener('click', e => {
  const button = e.target.closest('[data-modal-cat]');
  if(!button) return;
  state.category = button.dataset.modalCat;
  state.query = '';
  $('#mainSearch').value = '';
  updateClearButton();
  closeModal();
  setTimeout(() => renderStores({scroll:true}), 80);
});

$('#noticeBtn').addEventListener('click', () => openModal(`<h2>알림</h2><div class="my-list"><button>신규 오픈 가게 안내</button><button>배송기사 모집 안내</button><button>가맹점 모집 안내</button><button>먹깨비·땡겨요·온동네 가입 행사</button><button>소상공인협회 공지</button></div>`));

$('#storeGrid').addEventListener('click', e => {
  const card = e.target.closest('.store-card');
  if(!card) return;
  const s = stores.find(x => x.id == card.dataset.id);
  let recent = JSON.parse(localStorage.getItem('recent') || '[]').filter(x => x.id !== s.id);
  recent.unshift(s);
  localStorage.setItem('recent', JSON.stringify(recent.slice(0,20)));

  const routeKeys = ['direct','mukkebi','ddangyo'].filter(key => s.links?.[key]);
  const routeButtons = routeKeys.map(key => {
    const meta = APP_META[key];
    const icon = appIcon(key,'detail-route-icon');
    return `<a class="detail-route" href="${s.links[key]}" ${s.links[key].startsWith('http')?'target="_blank" rel="noopener"':''}>${icon}<span>${meta.label}</span><b>›</b></a>`;
  }).join('');
  const otherKeys = availableOtherApps(s);
  const otherInlineIcons = otherKeys.map(key => appIcon(key,'other-inline-icon')).join('');
  const otherMenu = otherKeys.length ? `<div class="store-other-wrap">
      <button class="detail-route store-other-toggle" type="button"><span>다른 주문앱 보기</span><span class="other-inline-icons">${otherInlineIcons}</span><b>›</b></button>
      <div class="store-other-popover" hidden>
        ${otherKeys.map(key => `<a href="${s.links[key]}" target="_blank" rel="noopener">${appIcon(key,'store-other-icon')}<span>${APP_META[key].label}</span></a>`).join('')}
      </div>
    </div>` : '';

  openModal(`<h2>${s.name}</h2><img src="${s.img}" class="detail-photo" alt="${s.name}"><p>${s.area} · ${s.cat}</p><div class="detail-routes">${routeButtons}<a class="detail-route" href="tel:${s.phone}"><span class="detail-route-icon emoji-app">☎</span><span>전화주문 ${s.phone}</span><b>›</b></a>${otherMenu}</div>`);
});

// 가게 상세 안의 '다른 주문앱 보기'는 버튼 바로 아래에 작게 열립니다.
document.addEventListener('click', e => {
  const routeLink = e.target.closest('.detail-route[href]');
  if(routeLink && !e.target.closest('.store-other-toggle')){
    e.stopPropagation();
    return;
  }
  const toggle = e.target.closest('.store-other-toggle');
  if(toggle){
    e.preventDefault();
    e.stopPropagation();
    const wrap = toggle.closest('.store-other-wrap');
    const menu = wrap.querySelector('.store-other-popover');
    document.querySelectorAll('.store-other-popover').forEach(el => { if(el !== menu) el.hidden = true; });
    menu.hidden = !menu.hidden;
    return;
  }
  if(!e.target.closest('.store-other-wrap')) document.querySelectorAll('.store-other-popover').forEach(el => el.hidden = true);
});

$('.bottom-nav').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  $$('.bottom-nav button').forEach(x => x.classList.remove('active')); b.classList.add('active');
  const tab = b.dataset.tab;
  if(tab === 'home') scrollTo({top:0,behavior:'smooth'});
  if(tab === 'search'){ $('#mainSearch').focus(); scrollTo({top:document.querySelector('.main-search-row').offsetTop-10,behavior:'smooth'}); }
  if(tab === 'mypage') myPage();
  if(tab === 'recent'){
    const recent = JSON.parse(localStorage.getItem('recent') || '[]');
    openModal(`<h2>최근 방문 가게</h2>${recent.length ? recent.map(s => `<div class="phone-result"><img src="${s.img}"><div><b>${s.name}</b><small>${s.area} · ${s.cat}</small></div></div>`).join('') : '<div class="empty">최근 방문한 가게가 없습니다.</div>'}`);
  }
  if(tab === 'favorite') openModal('<h2>찜한 가게</h2><div class="empty">가게 상세에서 찜할 수 있습니다.</div>');
});

const today = new Date().toISOString().slice(0,10);
const startupAd = $('#startupAd');
let startupHistoryOpen = false;
function openStartupAd(){ startupAd.hidden=false; document.body.style.overflow='hidden'; if(!startupHistoryOpen){ history.pushState({startupAd:true},''); startupHistoryOpen=true; } }
function closeStartupAd({fromPop=false}={}){ if(startupAd.hidden) return; startupAd.hidden=true; document.body.style.overflow=''; const goBack=!fromPop && startupHistoryOpen && history.state?.startupAd; startupHistoryOpen=false; if(goBack) history.back(); }
if(localStorage.getItem('hideStartup') !== today) setTimeout(openStartupAd, 600);
$('.startup-close').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); closeStartupAd(); });
startupAd.addEventListener('click', e => { if(e.target === startupAd) closeStartupAd(); });
$('.startup-card').addEventListener('click', e => e.stopPropagation());
$('#hideToday').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); localStorage.setItem('hideStartup',today); closeStartupAd(); });
$('#startupDetails').addEventListener('click', e => {
  e.preventDefault(); e.stopPropagation(); closeStartupAd();
  setTimeout(() => openModal(`<h2>대동여수음식지도 모집·광고 안내</h2><div class="guide-list"><button>🛵 배송기사 모집 안내</button><button>🏪 배달대행 가맹점 모집 안내</button><button>📱 먹깨비·땡겨요·온동네 가입 안내</button><button>🎉 신규 오픈 가게 광고</button><button>📢 소상공인협회 공지</button></div><p class="muted">현재는 시험판 안내 화면이며, 정식 운영 시 각 광고의 상세 신청·문의 페이지로 연결됩니다.</p>`),80);
});

window.addEventListener('popstate', () => {
  if(!startupAd.hidden){ closeStartupAd({fromPop:true}); return; }
  if(!$('#modal').hidden) closeModal({fromPop:true});
});
