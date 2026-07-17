const APP_META = {
  direct:   {label:'가게바로주문', icon:'🏪'},
  mukkebi:  {label:'먹깨비', icon:'assets/mukkebi-v7.png'},
  ddangyo:  {label:'땡겨요', icon:'assets/ddangyo-v7.png'},
  ondongne: {label:'온동네', icon:'assets/ondongne.png'},
  brand:    {label:'브랜드앱', icon:'images/momstouch.jpg'},
  phone:    {label:'전화주문', icon:'☎'},
  chak:     {label:'CHAK 지역상품권', icon:'💳'},
  yogiyo:   {label:'요기요', icon:'assets/yogiyo.jpg'},
  coupang:  {label:'쿠팡이츠', icon:'assets/coupang-eats.jpg'},
  baemin:   {label:'배달의민족', icon:'assets/baemin.jpg'}
};

const BRAND_GROUPS = [
  {name:'치킨·버거', brands:[
    {id:'momstouch',label:'맘스터치',aliases:['맘스터치'],icon:'images/momstouch.jpg'},
    {id:'bbq',label:'BBQ',aliases:['bbq','비비큐'],icon:'https://www.google.com/s2/favicons?domain=bbq.co.kr&sz=128'},
    {id:'bhc',label:'BHC',aliases:['bhc'],icon:'https://www.google.com/s2/favicons?domain=bhc.co.kr&sz=128'},
    {id:'kyochon',label:'교촌치킨',aliases:['교촌'],icon:'https://www.google.com/s2/favicons?domain=kyochon.com&sz=128'},
    {id:'nene',label:'네네치킨',aliases:['네네치킨'],icon:'https://www.google.com/s2/favicons?domain=nenechicken.com&sz=128'},
    {id:'60chicken',label:'60계치킨',aliases:['60계'],icon:'https://www.google.com/s2/favicons?domain=60chicken.com&sz=128'},
    {id:'ajukeo',label:'아주커치킨',aliases:['아주커'],icon:'images/ajukeo.jpg'},
    {id:'gyedong',label:'계동치킨',aliases:['계동치킨'],icon:'images/gyedong.jpg'},
    {id:'goobne',label:'굽네치킨',aliases:['굽네'],icon:'https://www.google.com/s2/favicons?domain=goobne.co.kr&sz=128'},
    {id:'puradak',label:'푸라닭',aliases:['푸라닭'],icon:'https://www.google.com/s2/favicons?domain=puradakchicken.com&sz=128'},
    {id:'cheogajip',label:'처갓집양념치킨',aliases:['처갓집'],icon:'https://www.google.com/s2/favicons?domain=cheogajip.co.kr&sz=128'},
    {id:'burgerking',label:'버거킹',aliases:['버거킹'],icon:'images/burgerking.png'},
    {id:'lotteria',label:'롯데리아',aliases:['롯데리아'],icon:'images/lotteria.jpg'},
    {id:'mcdonalds',label:'맥도날드',aliases:['맥도날드'],icon:'images/mcdonalds.jpg'},
    {id:'nobrandburger',label:'노브랜드버거',aliases:['노브랜드버거','노브랜드 버거'],icon:'images/nobrandburger.png'},
    {id:'frankburger',label:'프랭크버거',aliases:['프랭크버거'],icon:'images/frankburger.png'}
  ]},
  {name:'피자', brands:[
    {id:'dominos',label:'도미노피자',aliases:['도미노피자','도미노 피자'],icon:'https://www.google.com/s2/favicons?domain=dominos.co.kr&sz=128'},
    {id:'pizzahut',label:'피자헛',aliases:['피자헛'],icon:'https://www.google.com/s2/favicons?domain=pizzahut.co.kr&sz=128'},
    {id:'papajohns',label:'파파존스',aliases:['파파존스'],icon:'https://www.google.com/s2/favicons?domain=pji.co.kr&sz=128'},
    {id:'mrpizza',label:'미스터피자',aliases:['미스터피자'],icon:'https://www.google.com/s2/favicons?domain=mrpizza.co.kr&sz=128'}
  ]},
  {name:'카페·디저트', brands:[
    {id:'mega',label:'메가MGC커피',aliases:['메가커피','메가mgc','메가MGC'],icon:'https://www.google.com/s2/favicons?domain=mega-mgccoffee.com&sz=128'},
    {id:'compose',label:'컴포즈커피',aliases:['컴포즈'],icon:'https://www.google.com/s2/favicons?domain=composecoffee.com&sz=128'},
    {id:'ediya',label:'이디야커피',aliases:['이디야'],icon:'https://www.google.com/s2/favicons?domain=ediya.com&sz=128'},
    {id:'paik',label:'빽다방',aliases:['빽다방'],icon:'https://www.google.com/s2/favicons?domain=paikdabang.com&sz=128'},
    {id:'twosome',label:'투썸플레이스',aliases:['투썸'],icon:'https://www.google.com/s2/favicons?domain=twosome.co.kr&sz=128'},
    {id:'starbucks',label:'스타벅스',aliases:['스타벅스'],icon:'https://www.google.com/s2/favicons?domain=starbucks.co.kr&sz=128'},
    {id:'baskin',label:'배스킨라빈스',aliases:['배스킨라빈스','베스킨라빈스'],icon:'https://www.google.com/s2/favicons?domain=baskinrobbins.co.kr&sz=128'},
    {id:'dunkin',label:'던킨',aliases:['던킨'],icon:'https://www.google.com/s2/favicons?domain=dunkindonuts.co.kr&sz=128'}
  ]},
  {name:'한식·분식·기타', brands:[
    {id:'doozzim',label:'두찜',aliases:['두찜'],icon:'images/doozzim.jpg'},
    {id:'bonjuk',label:'본죽',aliases:['본죽'],icon:'https://www.google.com/s2/favicons?domain=bonif.co.kr&sz=128'},
    {id:'sinjeon',label:'신전떡볶이',aliases:['신전떡볶이'],icon:'https://www.google.com/s2/favicons?domain=sinjeon.co.kr&sz=128'},
    {id:'yupdduk',label:'동대문엽기떡볶이',aliases:['엽기떡볶이','엽떡'],icon:'https://www.google.com/s2/favicons?domain=yupdduk.com&sz=128'},
    {id:'jaws',label:'죠스떡볶이',aliases:['죠스떡볶이'],icon:'https://www.google.com/s2/favicons?domain=jawsfood.com&sz=128'},
    {id:'subway',label:'써브웨이',aliases:['써브웨이','서브웨이'],icon:'https://www.google.com/s2/favicons?domain=subway.co.kr&sz=128'}
  ]}
];

const BRAND_BY_ID = Object.fromEntries(BRAND_GROUPS.flatMap(group => group.brands).map(brand => [brand.id, brand]));
const CATEGORY_PREFERRED = ['한식','치킨','피자','중식','분식/도시락','분식','족발/보쌈','회/해산물','국밥/찜/탕/찌개/조림','면요리','고기/구이','돈까스/일식','카페/디저트','햄버거','야식/주점','마라탕/양꼬치','샐러드/건강식','도시락/죽','반찬','베이커리/떡','아시안','패스트푸드','퓨전','기타'];
const CATEGORY_ICON_RULES = [
  [/치킨|닭/, '🍗'], [/피자/, '🍕'], [/중식|짜장|짬뽕/, '🍜'], [/분식|떡볶이|도시락/, '🍢'], [/족발|보쌈/, '🥩'], [/회|해산물|횟집|수산/, '🐟'], [/국밥|찜|탕|찌개|조림/, '🍲'], [/면|냉면|국수/, '🍜'], [/고기|구이|삼겹|갈비/, '🥩'], [/돈까스|일식|초밥|스시/, '🍱'], [/카페|커피|디저트|빙수/, '☕'], [/햄버거|버거/, '🍔'], [/야식|주점|술집/, '🌙'], [/마라|양꼬치/, '🌶️'], [/샐러드|건강/, '🥗'], [/죽/, '🥣'], [/반찬/, '🍚'], [/베이커리|빵|떡/, '🥐'], [/아시안|베트남|태국/, '🍛'], [/한식/, '🍚']
];

const HERO_BANNERS = Array.from({length:17}, (_,index) => {
  const number = String(index + 1).padStart(2,'0');
  return {desktop:`images/${number}.webp`,mobile:`images/${number}-m.webp`,fallback:`images/${number}.png`,alt:`대동여수음식지도 배너 ${index + 1}`};
});

const PROMOS = [
  {kind:'rider',title:'배송기사 모집',desc:'여수 지역 베테랑 기사님을 기다립니다.'},
  {kind:'store',title:'배달대행 가맹점 모집',desc:'가게 사장님을 위한 주문·홍보·배달 연결'},
  {kind:'join',title:'먹깨비·땡겨요·온동네 가입 안내',desc:'저수수료 주문경로를 한 번에 연결하세요.'},
  {kind:'new',title:'신규 오픈 가게 광고',desc:'새로 문을 연 여수 가게를 빠르게 알립니다.'},
  {kind:'notice',title:'소상공인협회 알림',desc:'여수 소상공인에게 필요한 소식을 전합니다.'}
];

const state = {query:'',category:'전체',brandId:'',location:localStorage.getItem('location') || '여수시 전체',visibleCount:40};
let stores = [];
let categories = [];
let heroCarousel = null;
let promoCarousel = null;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function normalize(value){return String(value ?? '').trim().toLowerCase().replace(/\s+/g,'');}
function escapeHtml(value){return String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function categoryIcon(name){const rule=CATEGORY_ICON_RULES.find(([pattern])=>pattern.test(name));return rule?rule[1]:'🍽️';}
function storeText(store){return normalize([store.name,store.realBusinessName,...store.shopInShopNames,store.area,store.cat,...store.tags].join(' '));}
function routeKey(name){
  const text=normalize(name);
  if(text.includes('가게바로')) return 'direct';
  if(text.includes('먹깨비')) return 'mukkebi';
  if(text.includes('땡겨요')) return 'ddangyo';
  if(text.includes('온동네')) return 'ondongne';
  if(text.includes('브랜드앱')) return 'brand';
  if(text.includes('전화')) return 'phone';
  if(text.includes('chak')||text.includes('지역상품권')) return 'chak';
  if(text.includes('요기요')) return 'yogiyo';
  if(text.includes('쿠팡')) return 'coupang';
  if(text.includes('배달의민족')||text==='배민') return 'baemin';
  return 'brand';
}
function normalizedStore(raw,index){
  const routes=(raw.routes||[]).filter(route=>route&&route.enabled!==false&&route.url).map(route=>({...route,key:routeKey(route.name)}));
  return {
    id:raw.id||String(index),name:raw.name||'이름 없는 가게',realBusinessName:raw.realBusinessName||'',shopInShopNames:raw.shopInShopNames||[],
    area:raw.district||raw.area||'',cat:raw.category||raw.cat||'기타',address:raw.address||'',phone:raw.phone||'',naverMap:raw.naverMap||'',
    img:raw.image||'assets/store1.jpg',tags:[raw.category,raw.district,raw.address,...(raw.shopInShopNames||[])].filter(Boolean),routes,
    managed:Boolean(raw.managed),sharedManaged:Boolean(raw.sharedManaged),pinPosition:raw.pinPosition,forceBottom:Boolean(raw.forceBottom)
  };
}
function routeFor(store,key){return store.routes.find(route=>route.key===key);}
function brandMatchesStore(store,brand){const text=storeText(store);return brand.aliases.some(alias=>text.includes(normalize(alias)));}
function brandCount(brand){return stores.filter(store=>brandMatchesStore(store,brand)).length;}

class InfiniteCarousel{
  constructor(root,{interval=3500}={}){
    this.root=root;this.shell=root.querySelector('.carousel-shell');this.track=root.querySelector('.carousel-track');this.dots=root.querySelector('.carousel-dots');
    this.prev=root.querySelector('[data-carousel-prev]');this.next=root.querySelector('[data-carousel-next]');this.interval=interval;this.timer=null;this.dragStart=null;this.current=0;
    this.original=[...this.track.children];this.count=this.original.length;
    if(!this.count) return;
    this.build();this.bind();this.start();
  }
  build(){
    if(this.count>1){this.track.prepend(this.original[this.count-1].cloneNode(true));this.track.append(this.original[0].cloneNode(true));this.current=1;}
    this.jump(false);this.renderDots();
  }
  bind(){
    this.prev?.addEventListener('click',()=>this.move(-1));this.next?.addEventListener('click',()=>this.move(1));
    this.track.addEventListener('transitionend',()=>this.normalizePosition());
    this.shell.addEventListener('pointerdown',event=>{this.dragStart=event.clientX;this.stop();this.shell.setPointerCapture?.(event.pointerId);});
    this.shell.addEventListener('pointerup',event=>{if(this.dragStart===null)return;const delta=event.clientX-this.dragStart;this.dragStart=null;if(Math.abs(delta)>38)this.move(delta<0?1:-1);this.start();});
    this.shell.addEventListener('pointercancel',()=>{this.dragStart=null;this.start();});
    this.shell.addEventListener('mouseenter',()=>this.stop());this.shell.addEventListener('mouseleave',()=>this.start());
    this.root.addEventListener('focusin',()=>this.stop());this.root.addEventListener('focusout',()=>this.start());
    this.dots?.addEventListener('click',event=>{const button=event.target.closest('[data-slide]');if(button)this.goTo(Number(button.dataset.slide));});
    window.addEventListener('resize',()=>this.jump(false));
  }
  logicalIndex(){if(this.count<=1)return 0;return (this.current-1+this.count)%this.count;}
  renderDots(){if(!this.dots)return;this.dots.innerHTML=this.original.map((_,index)=>`<button type="button" data-slide="${index}" aria-label="${index+1}번째 슬라이드"></button>`).join('');this.updateDots();}
  updateDots(){$$('.carousel-dots button').forEach(()=>{});if(!this.dots)return;[...this.dots.children].forEach((dot,index)=>dot.classList.toggle('active',index===this.logicalIndex()));}
  jump(animated=true){if(!this.count)return;this.track.classList.toggle('is-animated',animated);this.track.style.transform=`translate3d(-${this.current*100}%,0,0)`;this.updateDots();}
  move(direction){if(this.count<=1)return;this.current+=direction;this.jump(true);}
  goTo(index){if(this.count<=1)return;this.current=Math.max(0,Math.min(this.count-1,index))+1;this.jump(true);this.restart();}
  normalizePosition(){if(this.count<=1)return;if(this.current===0){this.current=this.count;this.jump(false);}else if(this.current===this.count+1){this.current=1;this.jump(false);}}
  start(){if(this.count<=1||this.timer)return;this.timer=setInterval(()=>this.move(1),this.interval);}
  stop(){if(this.timer){clearInterval(this.timer);this.timer=null;}}
  restart(){this.stop();this.start();}
}

function renderHero(){
  $('#heroTrack').innerHTML=HERO_BANNERS.map(banner=>`<article class="carousel-slide hero-slide"><picture><source media="(max-width:520px)" srcset="${banner.mobile}"><img src="${banner.desktop}" alt="${banner.alt}" loading="${banner===HERO_BANNERS[0]?'eager':'lazy'}" onerror="this.onerror=null;this.src='${banner.fallback}'"></picture></article>`).join('');
  heroCarousel=new InfiniteCarousel($('#heroCarousel'),{interval:3500});
}
function renderPromos(){
  $('#promoTrack').innerHTML=PROMOS.map(promo=>`<article class="carousel-slide promo-card ${promo.kind}"><b>${promo.title}</b><span>${promo.desc}</span></article>`).join('');
  promoCarousel=new InfiniteCarousel($('#promoCarousel'),{interval:3500});
}

function appIcon(key,cls=''){
  const meta=APP_META[key];if(!meta)return '';
  if(String(meta.icon).includes('/')||String(meta.icon).startsWith('http'))return `<img class="${cls}" src="${meta.icon}" alt="${meta.label}">`;
  return `<span class="${cls} miniemoji">${meta.icon}</span>`;
}
function mainCategories(){
  const preferred=CATEGORY_PREFERRED.filter(name=>categories.includes(name));
  const remaining=categories.filter(name=>!preferred.includes(name));
  return [...preferred,...remaining].slice(0,12);
}
function renderCategories(){
  $('#categoryGrid').innerHTML=mainCategories().map(name=>`<button class="category ${state.category===name?'active':''}" data-cat="${escapeHtml(name)}"><span class="bubble">${categoryIcon(name)}</span><span>${escapeHtml(name)}</span></button>`).join('');
}
function relevance(store,query){
  const q=normalize(query);if(!q)return 1;const name=normalize(store.name);const text=storeText(store);
  if(name===q)return 100;if(name.startsWith(q))return 90;if(name.includes(q))return 80;if(normalize(store.cat).includes(q))return 70;if(normalize(store.area).includes(q))return 60;return text.includes(q)?50:0;
}
function filteredStores(){
  const brand=state.brandId?BRAND_BY_ID[state.brandId]:null;
  return stores.map(store=>({store,score:relevance(store,state.query)})).filter(item=>item.score>0)
    .filter(({store})=>state.location==='여수시 전체'||normalize(store.area).includes(normalize(state.location)))
    .filter(({store})=>state.category==='전체'||store.cat===state.category)
    .filter(({store})=>!brand||brandMatchesStore(store,brand))
    .sort((a,b)=>{
      const aPin=Number.isFinite(Number(a.store.pinPosition))?Number(a.store.pinPosition):9999;const bPin=Number.isFinite(Number(b.store.pinPosition))?Number(b.store.pinPosition):9999;
      if(aPin!==bPin)return aPin-bPin;if(a.store.forceBottom!==b.store.forceBottom)return a.store.forceBottom?1:-1;if(a.store.managed!==b.store.managed)return a.store.managed?-1:1;if(a.store.sharedManaged!==b.store.sharedManaged)return a.store.sharedManaged?-1:1;return b.score-a.score||a.store.name.localeCompare(b.store.name,'ko');
    }).map(item=>item.store);
}
function miniRoutes(store){
  const keys=['direct','mukkebi','ddangyo','ondongne','brand','chak','yogiyo','coupang','baemin'];
  return keys.filter(key=>routeFor(store,key)).slice(0,6).map(key=>appIcon(key,'miniapp-icon')).join('');
}
function storeCard(store){return `<article class="store-card" data-id="${escapeHtml(store.id)}"><img src="${escapeHtml(store.img)}" alt="${escapeHtml(store.name)}" loading="lazy"><div class="store-info"><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</p><div class="miniapps">${miniRoutes(store)}</div></div><button class="order-open">주문방법 보기</button></article>`;}
function renderStores({scroll=false,resetCount=false}={}){
  if(resetCount)state.visibleCount=40;const list=filteredStores();const visible=list.slice(0,state.visibleCount);let title='오늘의 추천';
  if(state.brandId)title=`${BRAND_BY_ID[state.brandId].label} 가게`;
  else if(state.category!=='전체')title=`${state.category} 가게`;
  else if(state.query)title=`'${state.query}' 검색 결과`;
  else if(state.location!=='여수시 전체')title=`${state.location} 추천`;
  $('#recommendSection h2').textContent=title;
  $('#resetCategoryBtn').hidden=state.category==='전체'&&!state.brandId&&!state.query&&state.location==='여수시 전체';
  $('#storeGrid').innerHTML=visible.length?visible.map(storeCard).join(''):'<div class="empty">조건에 맞는 가게가 아직 없습니다.</div>';
  $('#loadMoreBtn').hidden=visible.length>=list.length||!list.length;$('#loadMoreBtn').textContent=`가게 더 보기 (${visible.length}/${list.length})`;
  const filters=[];if(state.query)filters.push(`검색어 ${state.query}`);if(state.category!=='전체')filters.push(state.category);if(state.brandId)filters.push(BRAND_BY_ID[state.brandId].label);if(state.location!=='여수시 전체')filters.push(state.location);
  $('#searchSummary').hidden=!filters.length;$('#searchSummary').innerHTML=filters.length?`<strong>${list.length}곳</strong><span>${filters.map(escapeHtml).join(' · ')}</span><button id="clearSearch" class="text-btn">전체 조건 초기화</button>`:'';
  renderCategories();if(scroll)$('#recommendSection').scrollIntoView({behavior:'smooth',block:'start'});
}

function openModal(html){$('#modalContent').innerHTML=html;$('#overlay').hidden=false;$('#modal').hidden=false;document.body.style.overflow='hidden';history.pushState({modal:true},'');}
function closeModal({fromPop=false}={}){if($('#modal').hidden)return;$('#modal').hidden=true;$('#overlay').hidden=true;document.body.style.overflow='';if(!fromPop&&history.state?.modal)history.back();}
function guide(){openModal(`<h2>여수와 함께하는 주문방법</h2><p>가게를 선택하면 그 가게에서 실제로 이용 가능한 주문경로만 한곳에 보여드립니다.</p><div class="guide-list"><button>🏪 가게바로주문</button><button>📱 먹깨비·땡겨요·온동네</button><button>🏷️ 브랜드앱</button><button>☎ 전화주문</button><button>💳 CHAK 지역상품권</button><button>📦 요기요·쿠팡이츠·배달의민족</button></div>`);}
function brandLogo(brand){return `<img class="brand-logo" src="${brand.icon}" alt="${escapeHtml(brand.label)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="brand-empty" hidden>${escapeHtml(brand.label)}</span>`;}
function brandsModal(){
  const groups=BRAND_GROUPS.map(group=>`<section class="brand-category"><h3>${escapeHtml(group.name)}</h3><div class="brand-grid">${group.brands.map(brand=>{const count=brandCount(brand);return `<button class="brand-tile" data-brand-id="${brand.id}">${brandLogo(brand)}<b>${escapeHtml(brand.label)}</b><small>${count?`${count}곳`:'등록 준비'}</small></button>`;}).join('')}</div></section>`).join('');
  openModal(`<h2>브랜드앱 주문 가능 가게</h2><p>음식 종류별 브랜드 로고를 누르면 여수에 등록된 해당 브랜드 가게를 모아 보여드립니다.</p>${groups}`);
}
function phoneModal(){openModal(`<h2>전화주문</h2><p>가게명·메뉴·동네를 검색하세요.</p><div class="search-row modal-search-row"><div class="searchbox"><input id="phoneInput" placeholder="가게명·메뉴·동네 검색"><button id="clearPhoneSearch" class="input-clear" hidden>×</button></div><button id="phoneSearch" class="primary-btn">검색</button></div><div id="phoneResults" class="phone-results"></div>`);const input=$('#phoneInput');const clear=$('#clearPhoneSearch');const run=()=>renderPhoneResults(input.value);input.addEventListener('input',()=>clear.hidden=!input.value);input.addEventListener('keydown',event=>{if(event.key==='Enter')run();});$('#phoneSearch').addEventListener('click',run);clear.addEventListener('click',()=>{input.value='';clear.hidden=true;run();});run();}
function renderPhoneResults(query=''){const q=normalize(query);const list=stores.filter(store=>!q||storeText(store).includes(q)).filter(store=>store.phone||routeFor(store,'phone')).slice(0,100);$('#phoneResults').innerHTML=list.length?list.map(store=>{const phoneRoute=routeFor(store,'phone');const href=store.phone?`tel:${store.phone}`:(phoneRoute?.url||'#');return `<div class="phone-result"><img src="${escapeHtml(store.img)}"><div><b>${escapeHtml(store.name)}</b><small>${escapeHtml(store.area)} · ${escapeHtml(store.cat)}${store.phone?`<br>☎ ${escapeHtml(store.phone)}`:''}</small></div><a class="call-btn" href="${escapeHtml(href)}">주문하기</a></div>`;}).join(''):'<div class="empty">전화주문 가게가 없습니다.</div>';}
function allCategoriesModal(){openModal(`<h2>전체 음식 카테고리</h2><div class="all-category-list">${categories.map(name=>`<button data-modal-cat="${escapeHtml(name)}"><span>${categoryIcon(name)}</span><b>${escapeHtml(name)}</b></button>`).join('')}</div>`);}
function areaModal(){const areas=['여수시 전체',...new Set(stores.map(store=>store.area).filter(Boolean))].sort((a,b)=>a==='여수시 전체'?-1:a.localeCompare(b,'ko'));openModal(`<h2>지역 선택</h2><div class="searchbox area-search"><input id="areaSearchInput" placeholder="예: 여서동, 웅천동"><button id="clearAreaSearch" class="input-clear" hidden>×</button></div><div id="areaResults" class="location-list searchable"></div>`);const input=$('#areaSearchInput');const clear=$('#clearAreaSearch');const render=(query='')=>{$('#areaResults').innerHTML=areas.filter(area=>!query||normalize(area).includes(normalize(query))).map(area=>`<button data-location="${escapeHtml(area)}">${escapeHtml(area)}</button>`).join('')||'<div class="empty">검색된 지역이 없습니다.</div>';};input.addEventListener('input',()=>{clear.hidden=!input.value;render(input.value);});clear.addEventListener('click',()=>{input.value='';clear.hidden=true;render();});render();}
function myPage(){const recent=JSON.parse(localStorage.getItem('recent')||'[]');openModal(`<h2>마이페이지</h2><p>로그인 없이 이 기기에 저장된 정보입니다.</p><div class="my-list"><button>♡ 찜한 가게</button><button>◷ 최근 방문 가게 <b>${recent.length}곳</b></button><button>📍 지역 설정 — ${escapeHtml(state.location)}</button><button>❓ 주문방법 안내</button><button>✉ 정보 수정·광고 문의</button></div>`);}
function openStore(store){
  let recent=JSON.parse(localStorage.getItem('recent')||'[]').filter(item=>item.id!==store.id);recent.unshift({id:store.id,name:store.name,area:store.area,cat:store.cat,img:store.img});localStorage.setItem('recent',JSON.stringify(recent.slice(0,20)));
  const ordered=['direct','mukkebi','ddangyo','ondongne','brand','phone','chak'];const primary=[];const others=[];
  store.routes.forEach(route=>(['yogiyo','coupang','baemin'].includes(route.key)?others:primary).push(route));primary.sort((a,b)=>ordered.indexOf(a.key)-ordered.indexOf(b.key));
  const routeButtons=primary.map(route=>`<a class="detail-route" href="${escapeHtml(route.url)}" target="_blank" rel="noopener">${appIcon(route.key,'detail-route-icon')}<span>${escapeHtml(route.name)}</span><b>›</b></a>`).join('');
  const otherMenu=others.length?`<div class="store-other-wrap"><button class="detail-route store-other-toggle" type="button"><span class="detail-route-icon miniemoji">📦</span><span>다른 주문앱 보기</span><span class="other-inline-icons">${others.map(route=>appIcon(route.key,'other-inline-icon')).join('')}</span></button><div class="store-other-popover" hidden>${others.map(route=>`<a href="${escapeHtml(route.url)}" target="_blank" rel="noopener">${appIcon(route.key,'store-other-icon')}<span>${escapeHtml(route.name)}</span></a>`).join('')}</div></div>`:'';
  openModal(`<h2>${escapeHtml(store.name)}</h2><img src="${escapeHtml(store.img)}" class="detail-photo" alt="${escapeHtml(store.name)}"><p>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}${store.address?`<br>${escapeHtml(store.address)}`:''}</p><div class="detail-routes">${routeButtons}${store.phone&&!primary.some(route=>route.key==='phone')?`<a class="detail-route" href="tel:${escapeHtml(store.phone)}"><span class="detail-route-icon miniemoji">☎</span><span>전화주문 ${escapeHtml(store.phone)}</span><b>›</b></a>`:''}${otherMenu}</div>`);
}

async function loadStores(){
  try{const response=await fetch(`data/stores.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();stores=data.map(normalizedStore);}
  catch(error){console.error('가게 데이터 로딩 실패',error);stores=[];}
  categories=[...new Set(stores.map(store=>store.cat).filter(Boolean))].sort((a,b)=>{const ai=CATEGORY_PREFERRED.indexOf(a),bi=CATEGORY_PREFERRED.indexOf(b);if(ai>=0||bi>=0)return (ai<0?999:ai)-(bi<0?999:bi);return a.localeCompare(b,'ko');});
  $('#locationText').textContent=state.location;renderCategories();renderStores();
}

renderHero();renderPromos();loadStores();

$('#mainSearch').addEventListener('input',()=>$('#clearMainSearch').hidden=!$('#mainSearch').value);
$('#mainSearch').addEventListener('keydown',event=>{if(event.key==='Enter')$('#searchBtn').click();});
$('#clearMainSearch').addEventListener('click',()=>{$('#mainSearch').value='';state.query='';$('#clearMainSearch').hidden=true;renderStores({resetCount:true});$('#mainSearch').focus();});
$('#searchBtn').addEventListener('click',()=>{state.query=$('#mainSearch').value.trim();state.category='전체';state.brandId='';renderStores({scroll:true,resetCount:true});});
$('#categoryGrid').addEventListener('click',event=>{const button=event.target.closest('[data-cat]');if(!button)return;state.category=button.dataset.cat;state.brandId='';state.query='';$('#mainSearch').value='';$('#clearMainSearch').hidden=true;renderStores({scroll:true,resetCount:true});});
$('#allCategoryBtn').addEventListener('click',allCategoriesModal);
$('#loadMoreBtn').addEventListener('click',()=>{state.visibleCount+=40;renderStores();});
$('#resetCategoryBtn').addEventListener('click',()=>{state.query='';state.category='전체';state.brandId='';state.location='여수시 전체';localStorage.setItem('location',state.location);$('#locationText').textContent=state.location;$('#mainSearch').value='';renderStores({scroll:true,resetCount:true});});
$('#locationBtn').addEventListener('click',areaModal);

const pop=$('#moreAppsPopover');
$('#moreAppsBtn').addEventListener('click',event=>{event.stopPropagation();pop.hidden=!pop.hidden;});
$('.popover-close').addEventListener('click',()=>pop.hidden=true);
document.addEventListener('click',event=>{if(!pop.hidden&&!event.target.closest('#moreAppsPopover')&&!event.target.closest('#moreAppsBtn'))pop.hidden=true;});

$$('[data-open]').forEach(button=>button.addEventListener('click',()=>({phone:phoneModal,mypage:myPage,guide,brands:brandsModal}[button.dataset.open]||guide)()));
$('.modal-close').addEventListener('click',()=>closeModal());$('#overlay').addEventListener('click',()=>closeModal());

document.addEventListener('click',event=>{
  if(event.target.id==='clearSearch'){state.query='';state.category='전체';state.brandId='';state.location='여수시 전체';localStorage.setItem('location',state.location);$('#locationText').textContent=state.location;$('#mainSearch').value='';renderStores({resetCount:true});return;}
  const brandButton=event.target.closest('[data-brand-id]');if(brandButton){state.brandId=brandButton.dataset.brandId;state.category='전체';state.query='';$('#mainSearch').value='';closeModal();setTimeout(()=>renderStores({scroll:true,resetCount:true}),60);return;}
  const categoryButton=event.target.closest('[data-modal-cat]');if(categoryButton){state.category=categoryButton.dataset.modalCat;state.brandId='';state.query='';$('#mainSearch').value='';closeModal();setTimeout(()=>renderStores({scroll:true,resetCount:true}),60);return;}
  const locationButton=event.target.closest('[data-location]');if(locationButton){state.location=locationButton.dataset.location;localStorage.setItem('location',state.location);$('#locationText').textContent=state.location;closeModal();setTimeout(()=>renderStores({scroll:true,resetCount:true}),60);return;}
  const toggle=event.target.closest('.store-other-toggle');if(toggle){event.preventDefault();event.stopPropagation();const menu=toggle.closest('.store-other-wrap').querySelector('.store-other-popover');$$('.store-other-popover').forEach(item=>{if(item!==menu)item.hidden=true;});menu.hidden=!menu.hidden;return;}
  if(!event.target.closest('.store-other-wrap'))$$('.store-other-popover').forEach(item=>item.hidden=true);
});

$('#storeGrid').addEventListener('click',event=>{const card=event.target.closest('.store-card');if(!card)return;const store=stores.find(item=>item.id===card.dataset.id);if(store)openStore(store);});
$('#noticeBtn').addEventListener('click',()=>openModal(`<h2>알림</h2><div class="my-list">${PROMOS.map(promo=>`<button>${promo.title}</button>`).join('')}</div>`));

$('.bottom-nav').addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;$$('.bottom-nav button').forEach(item=>item.classList.remove('active'));button.classList.add('active');const tab=button.dataset.tab;if(tab==='home')scrollTo({top:0,behavior:'smooth'});if(tab==='search'){$('#mainSearch').focus();scrollTo({top:$('.main-search-row').offsetTop-10,behavior:'smooth'});}if(tab==='mypage')myPage();if(tab==='recent'){const recent=JSON.parse(localStorage.getItem('recent')||'[]');openModal(`<h2>최근 방문 가게</h2>${recent.length?recent.map(item=>`<div class="phone-result"><img src="${escapeHtml(item.img)}"><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.area)} · ${escapeHtml(item.cat)}</small></div></div>`).join(''):'<div class="empty">최근 방문한 가게가 없습니다.</div>'}`);}if(tab==='favorite')openModal('<h2>찜한 가게</h2><div class="empty">찜 기능은 정식 회원 기능과 함께 연결됩니다.</div>');});

const today=new Date().toISOString().slice(0,10);const startupAd=$('#startupAd');let startupHistoryOpen=false;
function openStartupAd(){startupAd.hidden=false;document.body.style.overflow='hidden';if(!startupHistoryOpen){history.pushState({startupAd:true},'');startupHistoryOpen=true;}}
function closeStartupAd({fromPop=false}={}){if(startupAd.hidden)return;startupAd.hidden=true;document.body.style.overflow='';const goBack=!fromPop&&startupHistoryOpen&&history.state?.startupAd;startupHistoryOpen=false;if(goBack)history.back();}
if(localStorage.getItem('hideStartup')!==today)setTimeout(openStartupAd,600);
$('.startup-close').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeStartupAd();});startupAd.addEventListener('click',event=>{if(event.target===startupAd)closeStartupAd();});$('.startup-card').addEventListener('click',event=>event.stopPropagation());
$('#hideToday').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();localStorage.setItem('hideStartup',today);closeStartupAd();});
$('#startupDetails').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeStartupAd();setTimeout(()=>openModal(`<h2>대동여수음식지도 모집·광고 안내</h2><div class="guide-list">${PROMOS.map(promo=>`<button>${promo.title}<br><small>${promo.desc}</small></button>`).join('')}</div>`),60);});
window.addEventListener('popstate',()=>{if(!startupAd.hidden){closeStartupAd({fromPop:true});return;}if(!$('#modal').hidden)closeModal({fromPop:true});});
