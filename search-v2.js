(()=>{
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const recentKey='recentSearches';

  function getRecent(){try{return JSON.parse(localStorage.getItem(recentKey)||'[]');}catch{return[];}}
  function saveRecent(q){q=q.trim();if(!q)return;localStorage.setItem(recentKey,JSON.stringify([q,...getRecent().filter(x=>x!==q)].slice(0,10)));}
  function statusRank(s){
    const status=s.managementStatus||(s.managed?'mine':s.sharedManaged?'partner':'normal');
    const rain=Number(localStorage.getItem('rainMode')||0);
    if(rain===0)return status==='mine'?0:status==='partner'?1:2;
    return status==='normal'?0:status==='partner'?1:2;
  }
  function searchScore(s,q){return window.daedongSearch?.score(s,q)??relevance(s,q);}
  function matches(q){
    return stores.map((s,index)=>({s,index,score:searchScore(s,q),rank:statusRank(s)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score||a.rank-b.rank||a.index-b.index)
      .slice(0,80).map(x=>x.s);
  }
  function icons(s){
    return ['brand','mukkebi','ddangyo','baemin','coupang','yogiyo'].filter(k=>s.links?.[k]).map(k=>appIcon(k,'search-mini-icon')).join('');
  }
  function row(s){return `<button class="search-result-item" data-search-store="${esc(s.id)}"><img src="${esc(s.img)}" alt="" onerror="this.src='assets/store1.jpg'"><span><b>${esc(s.name)}</b><small>${esc(s.area)} · ${esc(s.cat)}</small><i>${icons(s)}</i></span><strong>›</strong></button>`;}
  function ensure(){
    if($('#searchLayer'))return;
    document.body.insertAdjacentHTML('beforeend',`<section id="searchLayer" class="search-layer" hidden><header><button id="searchBack" aria-label="뒤로가기">←</button><div><input id="searchLayerInput" placeholder="가게명, 메뉴, 동네를 검색하세요" autocomplete="off"><button id="searchLayerClear" aria-label="지우기" hidden>×</button></div></header><main id="searchLayerBody"></main></section>`);
  }
  function renderRecent(){
    const recent=getRecent();
    $('#searchLayerBody').innerHTML=`<div class="recent-head"><h2>최근 검색어</h2>${recent.length?'<button id="clearRecentSearches">전체 삭제</button>':''}</div><div class="recent-chips">${recent.map(q=>`<button data-recent="${esc(q)}">${esc(q)} <span data-remove-recent="${esc(q)}">×</span></button>`).join('')||'<p class="search-empty">최근 검색어가 없습니다.</p>'}</div>`;
  }
  function renderResults(q){
    const list=matches(q);
    let empty='<p class="search-empty">검색 결과가 없습니다.</p>';
    if(!list.length&&window.daedongSearch){
      const suggestions=window.daedongSearch.suggestions(stores,q,5);
      if(suggestions.length)empty=`<div class="search-suggestion"><p><b>비슷한 가게명</b>을 확인해 보세요.</p>${suggestions.map(row).join('')}</div>`;
    }
    $('#searchLayerBody').innerHTML=`<div class="live-result-head"><h2>검색 결과</h2><span>${list.length}곳</span></div><div class="search-result-list">${list.length?list.map(row).join(''):empty}</div>`;
  }
  function open(initial=''){
    ensure();const layer=$('#searchLayer'),input=$('#searchLayerInput'),clear=$('#searchLayerClear');
    layer.hidden=false;document.body.classList.add('search-open');input.value=initial;clear.hidden=!initial;
    initial?renderResults(initial):renderRecent();setTimeout(()=>input.focus(),30);
  }
  function close(){const layer=$('#searchLayer');if(layer)layer.hidden=true;document.body.classList.remove('search-open');}
  function submit(q){q=q.trim();if(!q)return;saveRecent(q);state.query=q;state.category='전체';$('#mainSearch').value=q;close();renderStores({scroll:true});}
  function bind(){
    ensure();const main=$('#mainSearch'),clearMain=$('#clearMainSearch'),input=$('#searchLayerInput'),clear=$('#searchLayerClear');
    main.readOnly=true;main.addEventListener('click',()=>open(main.value));main.addEventListener('focus',()=>open(main.value));$('#searchBtn').onclick=()=>open(main.value);
    $('#searchBack').onclick=close;
    input.oninput=()=>{clear.hidden=!input.value;input.value?renderResults(input.value):renderRecent();};
    input.onkeydown=e=>{if(e.key==='Enter')submit(input.value);};
    clear.onclick=()=>{input.value='';clear.hidden=true;renderRecent();input.focus();};
    $('#searchLayer').onclick=e=>{
      const storeBtn=e.target.closest('[data-search-store]');
      if(storeBtn){const s=stores.find(x=>String(x.id)===storeBtn.dataset.searchStore);if(s){saveRecent(input.value||s.name);close();detail(s);}return;}
      const remove=e.target.closest('[data-remove-recent]');
      if(remove){localStorage.setItem(recentKey,JSON.stringify(getRecent().filter(x=>x!==remove.dataset.removeRecent)));renderRecent();return;}
      const recent=e.target.closest('[data-recent]');
      if(recent){input.value=recent.dataset.recent;clear.hidden=false;renderResults(input.value);input.focus();return;}
      if(e.target.id==='clearRecentSearches'){localStorage.removeItem(recentKey);renderRecent();}
    };
    clearMain.onclick=e=>{e.stopPropagation();main.value='';state.query='';clearMain.hidden=true;renderStores();};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,0));else setTimeout(bind,0);
})();
