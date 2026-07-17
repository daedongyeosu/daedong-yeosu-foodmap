(()=>{
  'use strict';

  const BLOCKED_CARD_KEYS=new Set(['naver','chak','phone']);
  const STATIC_CAMPAIGNS=[
    {
      id:'healing-yacht',kind:'campaign',kicker:'대동여수음식지도 특별혜택',
      title:'여수 힐링요트',desc:'바다 위에서 즐기는 여수의 특별한 시간',
      image:'assets/hero-campaign/healing-yacht.webp',
      detailImage:'assets/hero-campaign/healing-yacht-detail.webp',
      body:'대동여수음식지도 고객을 위한 특별 할인 안내입니다. 현장에서 대동여수음식지도 화면을 보여주고 적용 가능한 혜택을 확인해 주세요.',
      note:'세부 할인 조건과 이용 가능 시간은 현장 안내가 우선합니다.'
    },
    {
      id:'small-business',kind:'campaign',kicker:'여수 소상공인 소식',
      title:'소상공인연합회 공지',desc:'여수가게 플랫폼 홍보지원과 회원 소식',
      image:'assets/hero-campaign/small-business.webp',
      detailImage:'assets/hero-campaign/small-business-detail.webp',
      body:'여수시 소상공인연합회 회원을 위한 업종별 업체 홍보와 할인 마케팅 소식을 안내합니다.',
      note:'새 공지와 참여 가게는 대동여수음식지도에서 계속 업데이트합니다.'
    },
    {
      id:'omakase-umi',kind:'campaign',kicker:'신규 가게 특별 할인',
      title:'오마카세 우미 오픈기념',desc:'대동여수음식지도 화면 제시 시 전 메뉴 10% 할인',
      image:'assets/hero-campaign/omakase-umi.webp',
      detailImage:'assets/hero-campaign/omakase-umi-detail.webp',
      body:'신선한 활어회와 제철 해산물을 중심으로 정성껏 준비하는 일본식 오마카세 전문점입니다.',
      note:'주문 전 직원에게 대동여수음식지도 화면을 보여주세요.',
      search:'오마카세 우미'
    },
    {
      id:'rider-recruit',kind:'campaign',kicker:'배달기사 모집',
      title:'배송원을 모집합니다',desc:'월 수입 300~600만원 · 여수 전 지역',
      image:'assets/hero-campaign/rider-recruit.webp',
      detailImage:'assets/hero-campaign/rider-recruit.webp',
      body:'오토바이·자동차 배송이 가능하며 경력과 나이에 관계없이 상담할 수 있습니다.',
      note:'배달대행기사 문의 010-4797-7803',
      phone:'01047977803'
    },
    {
      id:'store-recruit',kind:'campaign',kicker:'가맹점 모집',
      title:'꼬르륵 배달대행 가맹점 모집',desc:'24시간 연중무휴 배달 파트너',
      image:'assets/hero-campaign/store-recruit.webp',
      detailImage:'assets/hero-campaign/store-recruit.webp',
      body:'전문 배달 라이더 운영과 체계적인 교육으로 가게의 든든한 배달 파트너가 되어드립니다.',
      note:'가맹점 문의 010-4797-7803',
      phone:'01047977803'
    }
  ];

  let heroSlides=[];
  let rebuiltForLocation='';

  const escHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const compact=value=>String(value??'').replace(/\s+/g,'').toLowerCase();
  const validPhoto=store=>{
    const src=window.DaedongPhotoDisplay?.attributes?.(store,'card')?.src||store?.img||store?.image||'';
    return src && !/store1\.jpg(?:$|\?)/.test(src);
  };
  const photoOf=store=>window.DaedongPhotoDisplay?.attributes?.(store,'card')?.src||store?.img||store?.image||'assets/store1.jpg';

  function locationValue(){
    return String(document.querySelector('#locationText')?.textContent||localStorage.getItem('location')||'여수시 전체').trim();
  }

  function areaMatchScore(store,locationText){
    const loc=compact(locationText);
    const area=compact(store?.area||store?.district||'').replace(/동$/,'');
    if(!area||!loc||loc.includes('여수시전체'))return 0;
    if(loc.includes(area)||loc.includes(`${area}동`))return 100;
    const address=compact(store?.address||'');
    if(address&&loc.length>=3&&(address.includes(loc)||loc.includes(address)))return 90;
    return 0;
  }

  function chooseLocalStores(){
    const list=(typeof stores!=='undefined'&&Array.isArray(stores))?stores:[];
    const usable=list.filter(validPhoto);
    const managed=usable.filter(store=>store.managed===true||store.sharedManaged===true);
    const pool=managed.length>=10?managed:usable;
    const loc=locationValue();
    return [...pool]
      .map((store,index)=>({store,index,near:areaMatchScore(store,loc),managed:store.managed?2:(store.sharedManaged?1:0)}))
      .sort((a,b)=>b.near-a.near||b.managed-a.managed||a.index-b.index)
      .slice(0,10)
      .map(item=>item.store);
  }

  function makeSlides(){
    const local=chooseLocalStores().map(store=>({
      id:`store-${store.id}`,kind:'store',storeId:String(store.id),
      kicker:areaMatchScore(store,locationValue())?'내 위치 주변 우리가게':'여수 우리가게 추천',
      title:store.name,desc:`${store.area||''} · ${store.cat||store.category||'음식점'}`,
      image:photoOf(store)
    }));
    heroSlides=[...STATIC_CAMPAIGNS,...local].slice(0,15);
  }

  function campaignCard(slide,index){
    const cls=slide.kind==='store'?' hero-store-ad':'';
    return `<article class="hero-card hero-campaign-card${cls}" data-hero-index="${index}" style="background-image:url('${escHtml(slide.image)}')" role="button" tabindex="0" aria-label="${escHtml(slide.title)} 자세히 보기"><div class="hero-copy"><span class="hero-kicker">${escHtml(slide.kicker)}</span><h2>${escHtml(slide.title)}</h2><p>${escHtml(slide.desc)}</p></div></article>`;
  }

  function renderCampaignAds(){
    makeSlides();
    const track=document.querySelector('#heroTrack');
    const dots=document.querySelector('#heroDots');
    if(!track||!dots||!heroSlides.length)return;
    track.innerHTML=heroSlides.map(campaignCard).join('');
    dots.innerHTML=heroSlides.map((_,i)=>`<i class="${i?'':'active'}"></i>`).join('');
    state.slide=Math.min(Number(state.slide)||0,heroSlides.length-1);
    showCampaignSlide(state.slide);
    bindHeroClick();
    rebuiltForLocation=locationValue();
  }

  function showCampaignSlide(index){
    if(!heroSlides.length)return;
    state.slide=(Number(index)+heroSlides.length)%heroSlides.length;
    const track=document.querySelector('#heroTrack');
    if(track)track.style.transform=`translateX(-${state.slide*100}%)`;
    document.querySelectorAll('#heroDots i').forEach((dot,i)=>dot.classList.toggle('active',i===state.slide));
  }

  function openCampaign(slide){
    const modal=document.querySelector('#modal');
    modal?.classList.remove('store-detail-compact','store-detail-refined');
    modal?.classList.add('campaign-detail-modal');
    const action=slide.phone
      ? `<a class="campaign-action" href="tel:${escHtml(slide.phone)}">전화로 문의하기</a>`
      : slide.search
        ? `<button class="campaign-action secondary" type="button" data-campaign-search="${escHtml(slide.search)}">홈페이지에서 가게 찾기</button>`
        : '';
    openModal(`<section class="campaign-detail"><h2>${escHtml(slide.title)}</h2><img src="${escHtml(slide.detailImage||slide.image)}" alt="${escHtml(slide.title)}"><p>${escHtml(slide.body||slide.desc)}</p>${slide.note?`<div class="campaign-note">${escHtml(slide.note)}</div>`:''}${action}</section>`);
  }

  function openHeroIndex(index){
    const slide=heroSlides[index];
    if(!slide)return;
    if(slide.kind==='store'){
      const store=(typeof stores!=='undefined'&&Array.isArray(stores))?stores.find(item=>String(item.id)===String(slide.storeId)):null;
      if(store)detail(store);
      return;
    }
    openCampaign(slide);
  }

  function bindHeroClick(){
    const track=document.querySelector('#heroTrack');
    if(!track||track.dataset.campaignBound==='1')return;
    track.dataset.campaignBound='1';
    track.addEventListener('click',event=>{
      const card=event.target.closest('[data-hero-index]');
      if(card)openHeroIndex(Number(card.dataset.heroIndex));
    });
    track.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const card=event.target.closest('[data-hero-index]');
      if(card){event.preventDefault();openHeroIndex(Number(card.dataset.heroIndex));}
    });
  }

  function filterMainCardIcons(){
    if(typeof stores==='undefined'||!Array.isArray(stores)||typeof appIcon!=='function')return;
    document.querySelectorAll('#storeGrid .store-card').forEach(card=>{
      const store=stores.find(item=>String(item.id)===String(card.dataset.id));
      const row=card.querySelector('.miniapps');
      if(!store||!row)return;
      const keys=APP_ICON_ORDER.filter(key=>store.links?.[key]&&!BLOCKED_CARD_KEYS.has(key));
      const signature=keys.join('|');
      if(row.dataset.filteredKeys===signature)return;
      row.innerHTML=keys.map(key=>appIcon(key,'miniapp-icon')).join('');
      row.dataset.filteredKeys=signature;
    });
  }

  function refineDetailModal(){
    const modal=document.querySelector('#modal');
    const content=document.querySelector('#modalContent');
    const card=modal?.querySelector('.modal-card');
    if(!modal||!content||!card||modal.hidden)return;
    const detail=content.querySelector('.store-detail-head')&&content.querySelector('.detail-routes');
    if(!detail){
      modal.classList.remove('store-detail-refined');
      return;
    }
    modal.classList.remove('campaign-detail-modal');
    modal.classList.add('store-detail-compact','store-detail-refined');
    card.style.zoom='';
    card.style.transform='';
    const head=content.querySelector('.store-detail-head');
    if(head&&!head.querySelector('h2')?.textContent.trim())head.remove();
  }

  function refresh(){
    filterMainCardIcons();
    refineDetailModal();
    const loc=locationValue();
    if(heroSlides.length&&loc!==rebuiltForLocation)renderCampaignAds();
    const build=document.querySelector('.build-mark');
    if(build)build.textContent='build DB790-detail-banner-v3';
  }

  try{
    renderAds=renderCampaignAds;
    showSlide=showCampaignSlide;
  }catch(error){console.warn('광고 함수 교체 대기',error);}

  document.addEventListener('click',event=>{
    const search=event.target.closest('[data-campaign-search]');
    if(!search)return;
    const input=document.querySelector('#mainSearch');
    if(input)input.value=search.dataset.campaignSearch;
    closeModal();
    setTimeout(()=>document.querySelector('#searchBtn')?.click(),80);
  });

  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;refresh();});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  window.addEventListener('resize',schedule,{passive:true});

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(typeof stores!=='undefined'&&Array.isArray(stores)&&stores.length&&document.querySelector('#heroTrack')){
      renderCampaignAds();refresh();clearInterval(timer);
    }else if(attempts>80)clearInterval(timer);
  },125);
})();
