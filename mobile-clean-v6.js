(()=>{
  'use strict';

  const BLOCKED_CARD_KEYS=new Set(['naver','chak','phone']);
  const STATIC_CAMPAIGNS=[
    {id:'healing-yacht',kind:'campaign',kicker:'대동여수음식지도 특별혜택',title:'여수 힐링요트',desc:'바다 위에서 즐기는 여수의 특별한 시간',image:'assets/hero-campaign/healing-yacht.webp',detailImage:'assets/hero-campaign/healing-yacht-detail.webp',body:'대동여수음식지도 고객을 위한 특별 할인 안내입니다.',note:'세부 할인 조건과 이용 가능 시간은 현장 안내가 우선합니다.'},
    {id:'small-business',kind:'campaign',kicker:'여수 소상공인 소식',title:'소상공인연합회 공지',desc:'여수가게 플랫폼 홍보지원과 회원 소식',image:'assets/hero-campaign/small-business.webp',detailImage:'assets/hero-campaign/small-business-detail.webp',body:'여수시 소상공인연합회 회원을 위한 업종별 업체 홍보와 할인 마케팅 소식입니다.'},
    {id:'omakase-umi',kind:'campaign',kicker:'신규 가게 특별 할인',title:'오마카세 우미 오픈기념',desc:'대동여수음식지도 화면 제시 시 전 메뉴 10% 할인',image:'assets/hero-campaign/omakase-umi.webp',detailImage:'assets/hero-campaign/omakase-umi-detail.webp',body:'신선한 활어회와 제철 해산물을 준비하는 일본식 오마카세 전문점입니다.',search:'오마카세 우미'},
    {id:'rider-recruit',kind:'campaign',kicker:'배달기사 모집',title:'배송원을 모집합니다',desc:'월 수입 300~600만원 · 여수 전 지역',image:'assets/hero-campaign/rider-recruit.webp',body:'오토바이·자동차 배송이 가능하며 경력과 나이에 관계없이 상담할 수 있습니다.',phone:'01047977803'},
    {id:'store-recruit',kind:'campaign',kicker:'가맹점 모집',title:'배달대행 가맹점 모집',desc:'24시간 연중무휴 배달 파트너',image:'assets/hero-campaign/store-recruit.webp',body:'전문 배달 라이더 운영과 체계적인 교육으로 가게의 배달 파트너가 되어드립니다.',phone:'01047977803'}
  ];

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const compact=value=>String(value??'').replace(/\s+/g,'').toLowerCase();
  let heroSlides=[],rebuiltForLocation='',scheduled=false;

  function moveLogo(){
    const topbar=document.querySelector('.topbar');
    const brand=document.querySelector('#app > .brand');
    const actions=topbar?.querySelector('.top-actions');
    if(topbar&&brand&&actions)topbar.insertBefore(brand,actions);
  }

  function buildOrderHub(){
    const order=document.querySelector('.order-section');
    if(!order)return;
    order.classList.add('local-order-hub');
    if(!order.querySelector('.local-order-intro')){
      order.insertAdjacentHTML('afterbegin',`<div class="local-order-intro"><span class="local-order-eyebrow">🌿 여수와 함께하는 주문</span><h2>한 번의 주문이 여수의 가게와 일자리를 이어갑니다</h2><p>가게바로주문·먹깨비·땡겨요·온동네·브랜드앱·전화주문은 모두 지역 가게에 힘이 되는 주문방법입니다.</p></div>`);
    }
    const heading=order.querySelector(':scope > .section-head h2');
    if(heading)heading.textContent='여수와 함께하는 주문방법';
  }

  function removeCardExtras(){
    document.querySelectorAll('#storeGrid button,#storeGrid a').forEach(node=>{
      if(compact(node.textContent).includes('정보수정요청'))node.remove();
    });
    if(typeof stores==='undefined'||!Array.isArray(stores)||typeof appIcon!=='function')return;
    document.querySelectorAll('#storeGrid .store-card').forEach(card=>{
      const store=stores.find(item=>String(item.id)===String(card.dataset.id));
      const row=card.querySelector('.miniapps');
      if(!store||!row)return;
      const keys=APP_ICON_ORDER.filter(key=>store.links?.[key]&&!BLOCKED_CARD_KEYS.has(key));
      row.innerHTML=keys.map(key=>appIcon(key,'miniapp-icon')).join('');
    });
  }

  function locationText(){
    return String(document.querySelector('#locationText')?.textContent||localStorage.getItem('location')||'여수시 전체').trim();
  }
  function validPhoto(store){
    const src=window.DaedongPhotoDisplay?.attributes?.(store,'card')?.src||store?.img||store?.image||'';
    return src&&!/store1\.jpg(?:$|\?)/.test(src);
  }
  function photoOf(store){return window.DaedongPhotoDisplay?.attributes?.(store,'card')?.src||store?.img||store?.image||'assets/store1.jpg';}
  function areaScore(store,loc){
    const l=compact(loc),a=compact(store?.area||store?.district||'').replace(/동$/,'');
    if(!a||!l||l.includes('여수시전체'))return 0;
    return l.includes(a)||l.includes(`${a}동`)?100:0;
  }
  function localStores(){
    const list=typeof stores!=='undefined'&&Array.isArray(stores)?stores:[];
    const usable=list.filter(validPhoto);
    const managed=usable.filter(store=>store.managed||store.sharedManaged);
    const pool=managed.length>=10?managed:usable;
    const loc=locationText();
    return [...pool].map((store,index)=>({store,index,near:areaScore(store,loc),managed:store.managed?2:(store.sharedManaged?1:0)}))
      .sort((a,b)=>b.near-a.near||b.managed-a.managed||a.index-b.index).slice(0,10).map(item=>item.store);
  }
  function makeSlides(){
    const local=localStores().map(store=>({id:`store-${store.id}`,kind:'store',storeId:String(store.id),kicker:areaScore(store,locationText())?'내 위치 주변 우리가게':'여수 우리가게 추천',title:store.name,desc:`${store.area||''} · ${store.cat||store.category||'음식점'}`,image:photoOf(store)}));
    heroSlides=[...STATIC_CAMPAIGNS,...local].slice(0,15);
  }
  function heroCard(slide,index){
    return `<article class="hero-card hero-campaign-card ${slide.kind==='store'?'hero-store-ad':''}" data-hero-index="${index}" style="background-image:url('${esc(slide.image)}')" role="button"><div class="hero-copy"><span class="hero-kicker">${esc(slide.kicker)}</span><h2>${esc(slide.title)}</h2><p>${esc(slide.desc)}</p></div></article>`;
  }
  function renderCampaignAds(){
    makeSlides();
    const track=document.querySelector('#heroTrack'),dots=document.querySelector('#heroDots');
    if(!track||!dots||!heroSlides.length)return;
    track.innerHTML=heroSlides.map(heroCard).join('');
    dots.innerHTML=heroSlides.map((_,i)=>`<i class="${i?'':'active'}"></i>`).join('');
    state.slide=Math.min(Number(state.slide)||0,heroSlides.length-1);
    showCampaignSlide(state.slide);
    bindHero();
    rebuiltForLocation=locationText();
  }
  function showCampaignSlide(index,animate=true){
    if(!heroSlides.length)return;
    state.slide=(Number(index)+heroSlides.length)%heroSlides.length;
    const track=document.querySelector('#heroTrack');
    if(track){track.style.transition=animate?'transform .48s cubic-bezier(.22,.7,.2,1)':'none';track.style.transform=`translateX(-${state.slide*100}%)`;}
    document.querySelectorAll('#heroDots i').forEach((dot,i)=>dot.classList.toggle('active',i===state.slide));
  }
  try{renderAds=renderCampaignAds;showSlide=showCampaignSlide;}catch{}

  const drag={active:false,id:null,x:0,y:0,dx:0,moved:false,suppress:0};
  function bindHero(){
    const track=document.querySelector('#heroTrack');
    if(!track||track.dataset.v6Bound==='1')return;
    track.dataset.v6Bound='1';
    track.addEventListener('pointerdown',e=>{drag.active=true;drag.id=e.pointerId;drag.x=e.clientX;drag.y=e.clientY;drag.dx=0;drag.moved=false;track.setPointerCapture?.(e.pointerId);track.style.transition='none';});
    track.addEventListener('pointermove',e=>{
      if(!drag.active||e.pointerId!==drag.id)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.moved&&Math.abs(dx)<8&&Math.abs(dy)<8)return;
      if(!drag.moved&&Math.abs(dy)>Math.abs(dx)){drag.active=false;return;}
      drag.moved=true;drag.dx=dx;track.style.transform=`translateX(calc(-${state.slide*100}% + ${dx}px))`;e.preventDefault();
    },{passive:false});
    const end=e=>{if(!drag.active||e.pointerId!==drag.id)return;drag.active=false;const width=track.getBoundingClientRect().width||1;let next=state.slide;if(drag.moved&&Math.abs(drag.dx)>Math.min(70,width*.14))next+=drag.dx<0?1:-1;if(drag.moved)drag.suppress=Date.now()+400;showCampaignSlide(next,true);};
    track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);
    track.addEventListener('click',e=>{
      if(Date.now()<drag.suppress){e.preventDefault();e.stopImmediatePropagation();return;}
      const card=e.target.closest('[data-hero-index]');if(!card)return;openHero(Number(card.dataset.heroIndex));
    });
    document.querySelector('#heroDots')?.addEventListener('click',e=>{const dot=e.target.closest('i');if(!dot)return;showCampaignSlide([...dot.parentNode.children].indexOf(dot),true);});
  }

  function openHero(index){
    const slide=heroSlides[index];if(!slide)return;
    if(slide.kind==='store'){const store=stores.find(item=>String(item.id)===String(slide.storeId));if(store)detail(store);return;}
    const action=slide.phone?`<a class="campaign-action" href="tel:${esc(slide.phone)}">전화로 문의하기</a>`:slide.search?`<button class="campaign-action" data-campaign-search="${esc(slide.search)}">가게 찾기</button>`:'';
    openModal(`<section class="campaign-detail"><h2>${esc(slide.title)}</h2><img src="${esc(slide.detailImage||slide.image)}" alt=""><p>${esc(slide.body||slide.desc)}</p>${slide.note?`<div class="campaign-note">${esc(slide.note)}</div>`:''}${action}</section>`);
  }

  function ensureClose(){
    const modal=document.querySelector('#modal'),card=modal?.querySelector('.modal-card');
    if(!modal||!card)return;
    let button=document.querySelector('#v6ModalClose');
    if(!button){button=document.createElement('button');button.id='v6ModalClose';button.type='button';button.setAttribute('aria-label','닫기');button.textContent='×';document.body.append(button);}
    button.hidden=modal.hidden;
    if(modal.hidden)return;
    const rect=card.getBoundingClientRect();
    button.style.left=`${Math.max(8,rect.right-60)}px`;button.style.top=`${Math.max(8,rect.top+10)}px`;
  }
  function forceClose(){
    const modal=document.querySelector('#modal'),overlay=document.querySelector('#overlay');
    try{if(typeof closeModal==='function')closeModal();}catch{}
    setTimeout(()=>{
      if(modal&&!modal.hidden){try{if(typeof hideModal==='function')hideModal();}catch{}modal.hidden=true;if(overlay)overlay.hidden=true;document.body.style.overflow='';}
      const button=document.querySelector('#v6ModalClose');if(button)button.hidden=true;
    },10);
  }

  function unwrap(node){if(!node?.parentNode)return;while(node.firstChild)node.parentNode.insertBefore(node.firstChild,node);node.remove();}
  function selectedCta(content){
    const selected=window.DaedongSelectedOrderApp;if(!selected||Date.now()-selected.selectedAt>1800000)return;
    const store=stores.find(item=>String(item.id)===String(selected.storeId));const meta=window.DaedongAppBrowser?.meta?.[selected.key];const url=window.DaedongAppBrowser?.routeFor?.(store,selected.key);
    if(!store||!meta||!url)return;
    content.querySelector('.selected-order-cta')?.remove();
    const visual=String(meta.icon).startsWith('assets/')?`<img src="${esc(meta.icon)}" alt="">`:`<span>${esc(meta.icon)}</span>`;
    const cta=`<a class="selected-order-cta" href="${esc(url)}" ${/^https?:/i.test(url)?'target="_blank" rel="noopener"':''}>${visual}<span>처음 선택한 ${esc(meta.label)}로 주문하기</span><b>›</b></a>`;
    const actions=content.querySelector('.detail-personal-actions');if(actions)actions.insertAdjacentHTML('beforebegin',cta);else content.insertAdjacentHTML('beforeend',cta);
  }
  function classifyModal(){
    const modal=document.querySelector('#modal'),content=document.querySelector('#modalContent'),card=modal?.querySelector('.modal-card');
    if(!modal||!content||!card||modal.hidden){ensureClose();return;}
    modal.className='modal';
    card.style.removeProperty('zoom');card.style.removeProperty('transform');
    if(content.querySelector('.app-browser'))modal.classList.add('v6-sheet','v6-app');
    else if(content.querySelector('.all-category-sheet-v2'))modal.classList.add('v6-sheet','v6-category');
    else if(content.querySelector('.store-detail-head')&&content.querySelector('.detail-routes')){
      modal.classList.add('v6-store');
      content.querySelectorAll('.ux-detail-route-grid,.ux-detail-actions').forEach(unwrap);
      selectedCta(content);
      requestAnimationFrame(()=>{modal.classList.remove('v6-tight');if(content.scrollHeight>card.clientHeight-2)modal.classList.add('v6-tight');});
    }else{
      modal.classList.add('v6-sheet','v6-general');
      if(content.querySelector('.location-onboarding'))modal.classList.add('v6-location');
    }
    ensureClose();
  }

  function createViewer(){
    let viewer=document.querySelector('#v6PhotoViewer');
    if(viewer)return viewer;
    viewer=document.createElement('div');viewer.id='v6PhotoViewer';viewer.hidden=true;
    viewer.innerHTML='<button class="v6-photo-close">×</button><button class="v6-photo-prev">‹</button><img alt="가게 사진 전체화면"><button class="v6-photo-next">›</button><span class="v6-photo-count"></span>';
    document.body.append(viewer);
    viewer.querySelector('.v6-photo-close').onclick=()=>viewer.hidden=true;
    viewer.querySelector('.v6-photo-prev').onclick=()=>moveViewer(-1);
    viewer.querySelector('.v6-photo-next').onclick=()=>moveViewer(1);
    return viewer;
  }
  const viewerState={photos:[],index:0};
  function renderViewer(){const viewer=createViewer();viewer.querySelector('img').src=viewerState.photos[viewerState.index]||'';viewer.querySelector('.v6-photo-count').textContent=`${viewerState.index+1} / ${viewerState.photos.length}`;viewer.querySelector('.v6-photo-prev').hidden=viewerState.photos.length<2;viewer.querySelector('.v6-photo-next').hidden=viewerState.photos.length<2;}
  function moveViewer(step){if(!viewerState.photos.length)return;viewerState.index=(viewerState.index+step+viewerState.photos.length)%viewerState.photos.length;renderViewer();}
  function openViewer(img){const gallery=img.closest('.detail-gallery');const photos=[...gallery.querySelectorAll('.detail-gallery-slide img')].map(node=>node.currentSrc||node.src).filter(Boolean);viewerState.photos=photos;viewerState.index=Math.max(0,[...gallery.querySelectorAll('.detail-gallery-slide img')].indexOf(img));const viewer=createViewer();viewer.hidden=false;renderViewer();}

  document.addEventListener('pointerup',e=>{if(e.target.closest('#v6ModalClose')){e.preventDefault();e.stopImmediatePropagation();forceClose();}},true);
  document.addEventListener('click',e=>{
    if(e.target.closest('#v6ModalClose')){e.preventDefault();e.stopImmediatePropagation();forceClose();return;}
    const manual=e.target.closest('[data-location-manual]');if(manual){e.preventDefault();e.stopImmediatePropagation();if(window.DaedongOpenManualAddress)window.DaedongOpenManualAddress();return;}
    const current=e.target.closest('[data-location-current]');if(current&&!current.disabled){e.preventDefault();e.stopImmediatePropagation();forceClose();setTimeout(()=>typeof useCurrentLocation==='function'&&useCurrentLocation(),80);return;}
    const photo=e.target.closest('.v6-store .detail-gallery-slide img');if(photo){e.preventDefault();e.stopPropagation();openViewer(photo);return;}
    const search=e.target.closest('[data-campaign-search]');if(search){const input=document.querySelector('#mainSearch');if(input)input.value=search.dataset.campaignSearch;forceClose();setTimeout(()=>document.querySelector('#searchBtn')?.click(),80);}
  },true);

  const oldOpen=window.openModal;
  if(typeof oldOpen==='function')window.openModal=function(html){const result=oldOpen(html);requestAnimationFrame(classifyModal);setTimeout(classifyModal,30);return result;};
  const oldDetail=window.detail;
  if(typeof oldDetail==='function')window.detail=function(store){const result=oldDetail(store);requestAnimationFrame(classifyModal);setTimeout(classifyModal,30);setTimeout(classifyModal,100);return result;};

  function apply(){
    scheduled=false;moveLogo();buildOrderHub();removeCardExtras();bindHero();classifyModal();
    const recent=document.querySelector('#topRecentBtn');if(recent){let span=recent.querySelector('span');if(!span){span=document.createElement('span');recent.append(span);}span.textContent='최근';}
    const loc=locationText();if(heroSlides.length&&loc!==rebuiltForLocation)renderCampaignAds();
    const build=document.querySelector('.build-mark');if(build)build.textContent='build DB790-clean-mobile-v6';
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',schedule,{passive:true});
  let tries=0;const timer=setInterval(()=>{tries++;if(typeof stores!=='undefined'&&Array.isArray(stores)&&stores.length){renderCampaignAds();schedule();clearInterval(timer);}else if(tries>80)clearInterval(timer);},125);
})();