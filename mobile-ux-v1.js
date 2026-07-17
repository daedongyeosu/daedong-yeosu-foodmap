(()=>{
  'use strict';
  const text=value=>String(value??'').replace(/\s+/g,'').trim();
  const app=()=>document.querySelector('#app');
  let scheduled=false;

  function moveLogo(){
    const topbar=document.querySelector('.topbar');
    const brand=document.querySelector('#app > .brand');
    const actions=topbar?.querySelector('.top-actions');
    if(topbar&&brand&&actions)topbar.insertBefore(brand,actions);
  }

  function buildLocalOrderHub(){
    const order=document.querySelector('.order-section');
    if(!order)return;
    order.classList.add('local-order-hub');
    if(!order.querySelector('.local-order-intro')){
      order.insertAdjacentHTML('afterbegin',`<div class="local-order-intro"><span class="local-order-eyebrow">🌿 여수와 함께하는 주문</span><h2>한 번의 주문이 여수의 가게와 일자리를 이어갑니다</h2><p>가게바로주문·먹깨비·땡겨요·온동네·브랜드앱·전화주문은 모두 지역 가게에 힘이 되는 주문방법입니다.</p></div>`);
    }
    const heading=order.querySelector(':scope > .section-head h2');
    if(heading)heading.textContent='여수와 함께하는 주문방법';
    const root=app();
    if(root){
      [...root.children].forEach(el=>{
        if(el===order||el.classList.contains('topbar')||el.classList.contains('hero'))return;
        const value=text(el.textContent);
        if(value.includes('한번의주문이여수의가게와일자리')||value.includes('여수와함께하는주문'))el.classList.add('ux-legacy-campaign');
      });
    }
  }

  function enlargeRecent(){
    const button=document.querySelector('#topRecentBtn');
    if(!button)return;
    button.setAttribute('aria-label','최근 방문 가게 보기');
    let label=button.querySelector('span');
    if(!label){label=document.createElement('span');button.append(label);}
    label.textContent='최근';
  }

  function removeCardInfoRequests(){
    document.querySelectorAll('#storeGrid button,#storeGrid a').forEach(node=>{
      if(text(node.textContent).includes('정보수정요청')){
        node.setAttribute('data-ux-card-info-request','');
        node.remove();
      }
    });
  }

  function updateBuild(){
    const build=document.querySelector('.build-mark');
    if(build)build.textContent='build DB790-final-popup-v5';
  }

  function apply(){
    scheduled=false;
    moveLogo();
    buildLocalOrderHub();
    enlargeRecent();
    removeCardInfoRequests();
    updateBuild();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
})();