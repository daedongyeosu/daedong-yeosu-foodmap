(()=>{
  'use strict';

  const MODAL_KIND_CLASSES=[
    'modal-kind-app','modal-kind-category','modal-kind-store',
    'modal-kind-campaign','modal-kind-general',
    'store-detail-refined','store-detail-compact','campaign-detail-modal'
  ];

  const APP_LABELS={
    direct:{label:'가게바로주문',icon:'🏪'},
    brand:{label:'브랜드앱',icon:'B'},
    mukkebi:{label:'먹깨비',icon:'assets/mukkebi-v7.png'},
    ddangyo:{label:'땡겨요',icon:'assets/ddangyo-v7.png'},
    ondongne:{label:'온동네',icon:'assets/ondongne.png'},
    yogiyo:{label:'요기요',icon:'assets/yogiyo.jpg'},
    coupang:{label:'쿠팡이츠',icon:'assets/coupang-eats.jpg'},
    baemin:{label:'배달의민족',icon:'assets/baemin.jpg'},
    phone:{label:'전화주문',icon:'☎'}
  };

  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ── 1. 메인 슬라이드 손가락 좌우 이동 ── */
  const hero={
    pointerId:null,startX:0,startY:0,dx:0,dragging:false,moved:false,
    suppressClickUntil:0
  };

  function heroCount(){
    return document.querySelectorAll('#heroTrack .hero-card').length;
  }

  function showHero(index,animate=true){
    const count=heroCount();
    if(!count)return;
    const next=(Number(index)+count)%count;
    if(typeof state!=='undefined')state.slide=next;
    const track=document.querySelector('#heroTrack');
    if(!track)return;
    track.style.transition=animate?'transform .48s cubic-bezier(.22,.7,.2,1)':'none';
    track.style.transform=`translateX(-${next*100}%)`;
    document.querySelectorAll('#heroDots i').forEach((dot,i)=>dot.classList.toggle('active',i===next));
  }

  try{showSlide=showHero;}catch{}

  function bindHeroSwipe(){
    const track=document.querySelector('#heroTrack');
    if(!track||track.dataset.swipeV4==='1')return;
    track.dataset.swipeV4='1';

    track.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      hero.pointerId=event.pointerId;
      hero.startX=event.clientX;
      hero.startY=event.clientY;
      hero.dx=0;
      hero.dragging=true;
      hero.moved=false;
      track.setPointerCapture?.(event.pointerId);
      track.style.transition='none';
    });

    track.addEventListener('pointermove',event=>{
      if(!hero.dragging||event.pointerId!==hero.pointerId)return;
      const dx=event.clientX-hero.startX;
      const dy=event.clientY-hero.startY;
      if(!hero.moved&&Math.abs(dx)<8&&Math.abs(dy)<8)return;
      if(!hero.moved&&Math.abs(dy)>Math.abs(dx)){
        hero.dragging=false;
        return;
      }
      hero.moved=true;
      hero.dx=dx;
      const slide=Number(typeof state!=='undefined'?state.slide:0)||0;
      track.style.transform=`translateX(calc(-${slide*100}% + ${dx}px))`;
      event.preventDefault();
    },{passive:false});

    const finish=event=>{
      if(!hero.dragging||event.pointerId!==hero.pointerId)return;
      hero.dragging=false;
      track.releasePointerCapture?.(event.pointerId);
      const width=track.getBoundingClientRect().width||1;
      const threshold=Math.min(70,width*.14);
      let next=Number(typeof state!=='undefined'?state.slide:0)||0;
      if(hero.moved&&Math.abs(hero.dx)>=threshold)next+=hero.dx<0?1:-1;
      if(hero.moved)hero.suppressClickUntil=Date.now()+450;
      showHero(next,true);
      hero.pointerId=null;
      hero.dx=0;
    };

    track.addEventListener('pointerup',finish);
    track.addEventListener('pointercancel',finish);
    track.addEventListener('click',event=>{
      if(Date.now()<hero.suppressClickUntil){
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },true);
  }

  function bindHeroDots(){
    const dots=document.querySelector('#heroDots');
    if(!dots||dots.dataset.dotV4==='1')return;
    dots.dataset.dotV4='1';
    dots.addEventListener('click',event=>{
      const dot=event.target.closest('i');
      if(!dot)return;
      const index=[...dots.querySelectorAll('i')].indexOf(dot);
      if(index>=0)showHero(index,true);
    });
  }

  /* ── 2. 팝업 종류를 분리하고 각각 올바른 스크롤 적용 ── */
  function unwrap(node){
    if(!node?.parentNode)return;
    while(node.firstChild)node.parentNode.insertBefore(node.firstChild,node);
    node.remove();
  }

  function cleanDetailStructure(content){
    content.querySelectorAll('.ux-detail-route-grid,.ux-detail-actions').forEach(unwrap);
    content.dataset.uxCompacted='1';

    const routes=content.querySelector('.detail-routes');
    if(routes){
      [...routes.children].forEach(child=>{
        if(child.classList?.contains('ux-detail-route-grid'))unwrap(child);
      });
    }

    const title=content.querySelector('.store-detail-head h2');
    if(title){
      title.style.removeProperty('font-size');
      title.removeAttribute('title');
    }
  }

  function selectedAppFooter(sheet){
    const key=sheet?.dataset.app;
    const meta=APP_LABELS[key];
    if(!key||!meta)return;
    sheet.querySelector('.app-browser-selected-footer')?.remove();
    const visual=String(meta.icon).startsWith('assets/')
      ? `<img src="${esc(meta.icon)}" alt="${esc(meta.label)}">`
      : `<span class="selected-emoji">${esc(meta.icon)}</span>`;
    sheet.insertAdjacentHTML('beforeend',
      `<div class="app-browser-selected-footer">${visual}<span>선택한 주문앱: ${esc(meta.label)}</span></div>`);
  }

  let lastModalSignature='';

  function classifyModal(){
    const modal=document.querySelector('#modal');
    const content=document.querySelector('#modalContent');
    const card=modal?.querySelector('.modal-card');
    if(!modal||!content||!card||modal.hidden)return;

    const signature=[
      Boolean(content.querySelector('.app-browser')),
      Boolean(content.querySelector('.all-category-sheet-v2')),
      Boolean(content.querySelector('.store-detail-head')&&content.querySelector('.detail-routes')),
      Boolean(content.querySelector('.campaign-detail')),
      content.textContent.slice(0,80)
    ].join('|');

    MODAL_KIND_CLASSES.forEach(cls=>modal.classList.remove(cls));

    if(content.querySelector('.app-browser')){
      modal.classList.add('modal-kind-app');
      selectedAppFooter(content.querySelector('.app-browser'));
    }else if(content.querySelector('.all-category-sheet-v2')){
      modal.classList.add('modal-kind-category');
    }else if(content.querySelector('.store-detail-head')&&content.querySelector('.detail-routes')){
      modal.classList.add('modal-kind-store','store-detail-refined');
      cleanDetailStructure(content);
    }else if(content.querySelector('.campaign-detail')){
      modal.classList.add('modal-kind-campaign');
    }else{
      modal.classList.add('modal-kind-general');
    }

    card.style.removeProperty('zoom');
    card.style.removeProperty('transform');

    if(signature!==lastModalSignature){
      card.scrollTop=0;
      lastModalSignature=signature;
    }
  }

  /* openModal이 실행될 때 이전 팝업의 클래스가 다음 팝업에 남지 않게 함 */
  const baseOpenModal=window.openModal;
  if(typeof baseOpenModal==='function'){
    window.openModal=function(html){
      const modal=document.querySelector('#modal');
      MODAL_KIND_CLASSES.forEach(cls=>modal?.classList.remove(cls));
      const result=baseOpenModal(html);
      requestAnimationFrame(classifyModal);
      setTimeout(classifyModal,0);
      return result;
    };
  }

  /* ── 3. 긴 상호는 두 줄로 표시 ── */
  function markLongNames(){
    document.querySelectorAll('.app-browser-info strong').forEach(node=>{
      const length=[...String(node.textContent||'')].length;
      node.classList.toggle('long-store-name',length>=12);
    });
  }

  function updateBuild(){
    const build=document.querySelector('.build-mark');
    if(build)build.textContent='build DB790-swipe-scroll-popup-v4';
  }

  let scheduled=false;
  function apply(){
    scheduled=false;
    bindHeroSwipe();
    bindHeroDots();
    classifyModal();
    markLongNames();
    updateBuild();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();

  new MutationObserver(schedule).observe(document.documentElement,{
    subtree:true,childList:true,attributes:true,attributeFilter:['hidden']
  });
  window.addEventListener('resize',schedule,{passive:true});
})();