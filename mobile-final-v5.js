(()=>{
  'use strict';

  const KINDS=['v5-app-modal','v5-category-modal','v5-store-modal','v5-general-modal','v5-tight','v5-ultra'];
  const META={
    direct:{label:'가게바로주문',icon:'🏪'},brand:{label:'브랜드앱',icon:'B'},
    mukkebi:{label:'먹깨비',icon:'assets/mukkebi-v7.png'},ddangyo:{label:'땡겨요',icon:'assets/ddangyo-v7.png'},
    ondongne:{label:'온동네',icon:'assets/ondongne.png'},yogiyo:{label:'요기요',icon:'assets/yogiyo.jpg'},
    coupang:{label:'쿠팡이츠',icon:'assets/coupang-eats.jpg'},baemin:{label:'배달의민족',icon:'assets/baemin.jpg'},
    phone:{label:'전화주문',icon:'☎'}
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function unwrap(node){
    if(!node?.parentNode)return;
    while(node.firstChild)node.parentNode.insertBefore(node.firstChild,node);
    node.remove();
  }

  function resetKinds(modal){
    KINDS.forEach(cls=>modal.classList.remove(cls));
  }

  function selectedApp(){
    const data=window.DaedongSelectedOrderApp;
    if(!data||Date.now()-Number(data.selectedAt||0)>30*60*1000)return null;
    return data;
  }

  function selectedCta(content){
    const selected=selectedApp();
    if(!selected)return;
    const storeId=String(selected.storeId||'');
    const store=(typeof stores!=='undefined'&&Array.isArray(stores))?stores.find(item=>String(item.id)===storeId):null;
    if(!store)return;
    const key=selected.key;
    const meta=META[key];
    const url=window.DaedongAppBrowser?.routeFor?.(store,key)||store.links?.[key]||'';
    if(!meta||!url)return;

    content.querySelector('.selected-order-cta')?.remove();
    const visual=String(meta.icon).startsWith('assets/')
      ? `<img src="${esc(meta.icon)}" alt="${esc(meta.label)}">`
      : `<span class="selected-order-emoji">${esc(meta.icon)}</span>`;
    const external=/^https?:/i.test(url);
    const cta=`<a class="selected-order-cta" href="${esc(url)}" ${external?'target="_blank" rel="noopener"':''}>${visual}<span>처음 선택한 <strong>${esc(meta.label)}</strong>로 주문하기</span><b>›</b></a>`;
    const actions=content.querySelector('.detail-personal-actions');
    if(actions)actions.insertAdjacentHTML('beforebegin',cta);
    else content.insertAdjacentHTML('beforeend',cta);
  }

  function cleanStoreDetail(content){
    content.querySelectorAll('.ux-detail-route-grid,.ux-detail-actions').forEach(unwrap);
    content.dataset.uxCompacted='1';

    const routes=content.querySelector('.detail-routes');
    if(routes){
      [...routes.querySelectorAll(':scope > .ux-detail-route-grid')].forEach(unwrap);
    }

    selectedCta(content);
  }

  function fitStore(){
    const modal=document.querySelector('#modal');
    const card=modal?.querySelector('.modal-card');
    const content=document.querySelector('#modalContent');
    if(!modal?.classList.contains('v5-store-modal')||!card||!content)return;

    modal.classList.remove('v5-tight','v5-ultra');
    requestAnimationFrame(()=>{
      const available=card.clientHeight-2;
      if(content.scrollHeight>available)modal.classList.add('v5-tight');
      requestAnimationFrame(()=>{
        if(content.scrollHeight>available)modal.classList.add('v5-ultra');
      });
    });
  }

  function classify(){
    const modal=document.querySelector('#modal');
    const content=document.querySelector('#modalContent');
    const card=modal?.querySelector('.modal-card');
    if(!modal||!content||!card||modal.hidden)return;

    resetKinds(modal);
    card.style.removeProperty('zoom');
    card.style.removeProperty('transform');

    if(content.querySelector('.app-browser')){
      modal.classList.add('v5-app-modal');
    }else if(content.querySelector('.all-category-sheet-v2')){
      modal.classList.add('v5-category-modal');
    }else if(content.querySelector('.store-detail-head')&&content.querySelector('.detail-routes')){
      modal.classList.add('v5-store-modal');
      cleanStoreDetail(content);
      fitStore();
    }else{
      modal.classList.add('v5-general-modal');
    }
  }

  function bindClose(){
    const close=document.querySelector('#modal .modal-close');
    if(!close||close.dataset.v5Bound==='1')return;
    close.dataset.v5Bound='1';
    const run=event=>{
      event.preventDefault();
      event.stopPropagation();
      if(typeof closeModal==='function')closeModal();
    };
    close.addEventListener('pointerup',run);
    close.addEventListener('click',run);
  }

  const oldOpen=window.openModal;
  if(typeof oldOpen==='function'){
    window.openModal=function(html){
      const modal=document.querySelector('#modal');
      if(modal)resetKinds(modal);
      const result=oldOpen(html);
      requestAnimationFrame(()=>{bindClose();classify();});
      setTimeout(()=>{bindClose();classify();},20);
      return result;
    };
  }

  /* 앱 목록의 가게를 누른 뒤 detail()이 열릴 때 선택 앱 버튼을 즉시 보강 */
  const oldDetail=window.detail;
  if(typeof oldDetail==='function'){
    window.detail=function(store){
      const result=oldDetail(store);
      requestAnimationFrame(classify);
      setTimeout(classify,20);
      setTimeout(classify,80);
      return result;
    };
  }

  /* 삼성 인터넷의 브라우저 뒤로가기에서도 팝업이 확실히 닫힘 */
  window.addEventListener('popstate',()=>{
    const modal=document.querySelector('#modal');
    if(modal&&!modal.hidden&&typeof hideModal==='function'){
      setTimeout(()=>{
        if(!modal.hidden)hideModal();
        if(typeof modalHistoryActive!=='undefined')modalHistoryActive=false;
      },0);
    }
  });

  /* 상세 팝업에서는 세로 드래그를 막고, 앱·카테고리에서는 modal-card만 스크롤 */
  document.addEventListener('touchmove',event=>{
    const modal=document.querySelector('#modal');
    if(!modal||modal.hidden)return;
    if(modal.classList.contains('v5-store-modal')){
      const gallery=event.target.closest?.('.detail-gallery-track');
      if(!gallery)event.preventDefault();
    }
  },{passive:false,capture:true});

  let scheduled=false;
  function apply(){
    scheduled=false;
    bindClose();
    classify();
    const build=document.querySelector('.build-mark');
    if(build)build.textContent='build DB790-final-popup-v5';
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