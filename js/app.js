
const STORE_KEY='daedong-store-overrides-v20';
const WEIGHT_KEY='daedong-weights-v20';
const POLICY_KEY='daedong-policy-v21';
let stores=[], activeQuery='', activeRoute='', activeDistrict='', activeCategory='', slideIndex=0, slideTimer=null;

const localNames=['가게바로주문','가게 직접 주문하기','자동주문','브랜드앱','먹깨비','땡겨요','온동네','꼬르륵','전화주문'];
const majorNames=['요기요','쿠팡','쿠팡이츠','coupang_eats','배민','배달의민족'];
const categoryOrder=['한식','국밥/찜/탕/찌개/조림','분식/도시락','중식','치킨','피자','족발/보쌈','햄버거/샌드위치/토스트/핫도그','회/초밥/선어/해산물','카페/디저트/베이커리/아이스크림/빙수','면요리','돈까스/일식','야식/주점','마라탕/양꼬치','고기/구이','반찬'];
const categoryEmoji={
  '한식':'🍚','국밥/찜/탕/찌개/조림':'🥘','분식/도시락':'🍙','중식':'🥟','치킨':'🍗','피자':'🍕',
  '족발/보쌈':'🍖','햄버거/샌드위치/토스트/핫도그':'🍔','회/초밥/선어/해산물':'🍣',
  '카페/디저트/베이커리/아이스크림/빙수':'🍰','면요리':'🍜','돈까스/일식':'🍱',
  '야식/주점':'🌙','마라탕/양꼬치':'🌶️','고기/구이':'🥩','반찬':'🥗'
};

function loadOverrides(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}catch{return {}}}
function loadPolicy(){try{return JSON.parse(localStorage.getItem(POLICY_KEY)||'{"flyerStoreId":"","rainMode":0}')}catch{return {flyerStoreId:'',rainMode:0}}}
function validUrl(u){return /^https?:\/\//.test((u||'').trim())||/^tel:/.test((u||'').trim())}
function applyOverrides(list){const o=loadOverrides();return list.map(s=>({...s,...(o[s.id]||{})}));}
function isMajorRoute(name=''){const n=name.toLowerCase();return majorNames.some(x=>n.includes(x.toLowerCase()))}
function routeType(name=''){const n=name.toLowerCase();if(n.includes('먹깨비'))return'mukkebi';if(n.includes('땡겨요'))return'ddangyo';if(n.includes('온동네'))return'ondongne';if(n.includes('요기요'))return'yogiyo';if(n.includes('쿠팡')||n.includes('coupang'))return'coupang';if(n.includes('배민')||n.includes('배달의민족'))return'baemin';if(n.includes('전화'))return'phone';if(n.includes('브랜드'))return'brand';return'direct'}
function hasLocalRoute(s){return (s.routes||[]).some(r=>validUrl(r.url)&&localNames.some(n=>r.name.includes(n)))}
function majorOnly(s){const r=(s.routes||[]).filter(x=>validUrl(x.url));return r.length>0&&!hasLocalRoute(s)&&r.some(x=>isMajorRoute(x.name))}
function hashSort(id,seed){let h=2166136261;for(const c of id+seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rotationSeed(){return Math.floor(Date.now()/(15*60*1000)).toString()}
function groupRank(s){if(s.forceBottom)return 99;if(Number.isInteger(s.pinPosition))return -10;if(s.managed)return 1;if(s.sharedManaged)return 2;if(majorOnly(s))return 4;return 3}
function sortStores(arr){const seed=rotationSeed();return [...arr].sort((a,b)=>{if(Number.isInteger(a.pinPosition)||Number.isInteger(b.pinPosition)){const ap=Number.isInteger(a.pinPosition)?a.pinPosition:9999,bp=Number.isInteger(b.pinPosition)?b.pinPosition:9999;if(ap!==bp)return ap-bp}const g=groupRank(a)-groupRank(b);if(g)return g;return hashSort(a.id,seed)-hashSort(b.id,seed)})}
function take(pool,n,suffix){return [...pool].sort((a,b)=>hashSort(a.id,rotationSeed()+suffix)-hashSort(b.id,rotationSeed()+suffix)).slice(0,n)}

function weightedFeatured(list,count=8){
  const baseW=JSON.parse(localStorage.getItem(WEIGHT_KEY)||'{"managed":70,"shared":20,"general":10}');
  const policy=loadPolicy(); let w={...baseW};
  if(policy.rainMode===1)w.general=Math.round(w.general*1.3);
  if(policy.rainMode===2)w.general=Math.max(w.general*6,60);
  if(policy.rainMode===3)w={managed:0,shared:0,general:100};
  const total=w.managed+w.shared+w.general||1;
  const flyer=list.find(s=>s.id===policy.flyerStoreId&&!s.forceBottom);
  const shop=flyer?.shopInShopGroup?list.filter(s=>s.id!==flyer.id&&s.shopInShopGroup===flyer.shopInShopGroup&&!s.forceBottom):[];
  const out=[]; if(flyer)out.push(flyer); out.push(...take(shop,Math.min(3,count-out.length),'shop'));
  const remain=Math.max(0,count-out.length);
  const pools={
    managed:list.filter(s=>s.managed&&!s.forceBottom&&!out.some(x=>x.id===s.id)),
    shared:list.filter(s=>s.sharedManaged&&!s.forceBottom&&!out.some(x=>x.id===s.id)),
    general:list.filter(s=>!s.managed&&!s.sharedManaged&&!s.forceBottom&&!majorOnly(s)&&!out.some(x=>x.id===s.id))
  };
  let tm=Math.round(remain*w.managed/total),ts=Math.round(remain*w.shared/total);let tg=remain-tm-ts;
  out.push(...take(pools.managed,tm,'m'),...take(pools.shared,ts,'s'),...take(pools.general,Math.max(0,tg),'g'));
  if(out.length<count){const used=new Set(out.map(x=>x.id));out.push(...sortStores(list.filter(s=>!used.has(s.id)&&!s.forceBottom)).slice(0,count-out.length))}
  return out.slice(0,count);
}
function routeIcon(r){const t=routeType(r.name);if(t==='mukkebi')return'<img src="images/mukkebi.png">';if(t==='ddangyo')return'<img src="images/ddangyo.png">';if(t==='ondongne')return'<img src="images/ondongne.png">';return`<span>${{yogiyo:'Y',coupang:'C',baemin:'B',phone:'☎',brand:'앱',direct:'주문'}[t]}</span>`}
function card(s,featured=false){const routes=(s.routes||[]).filter(r=>validUrl(r.url)&&!isMajorRoute(r.name));const badges=[s.id===loadPolicy().flyerStoreId?'전단 최우선':'',s.managed?'우리 관리':'',s.sharedManaged?'공유대표':''].filter(Boolean);return`<article class="store-card ${featured?'featured':''}" data-id="${s.id}">
<div class="photo">${s.image?`<img src="${s.image}" alt="${s.name}">`:`<div class="photo-placeholder">🍽️</div>`}${badges.map(b=>`<em>${b}</em>`).join('')}</div>
<div class="card-body"><h3>${s.name}</h3><p>${s.district||'여수'} · ${s.category||'음식점'}</p><div class="mini-routes">${routes.slice(0,5).map(routeIcon).join('')}</div><button class="detail-btn">주문방법 보기</button></div></article>`}
function filteredStores(){
  return stores.filter(s=>
    (!activeQuery||JSON.stringify(s).toLowerCase().includes(activeQuery)) &&
    (!activeDistrict||s.district===activeDistrict) &&
    (!activeCategory||s.category===activeCategory) &&
    (!activeRoute||(s.routes||[]).some(r=>validUrl(r.url)&&routeType(r.name)===activeRoute))
  );
}
function recommendationPool(){
  return stores.filter(s=>!activeDistrict||s.district===activeDistrict);
}
function render(){
  const list=filteredStores();
  const recommendations=recommendationPool();
  resultCount.textContent=`${Math.min(list.length,24)}개 표시 · 전체 ${list.length}개`;
  storeGrid.innerHTML=sortStores(list).slice(0,24).map(s=>card(s)).join('');
  featuredGrid.innerHTML=weightedFeatured(recommendations,8).map(s=>card(s,true)).join('');
  modeNotice.textContent=loadPolicy().rainMode?`우천 모드 ${loadPolicy().rainMode}단계 적용 중`:'';
  document.querySelectorAll('.store-card').forEach(el=>el.onclick=()=>openDetail(el.dataset.id));
}
function showInfoModal(title, body){modalBody.innerHTML=`<h2>${title}</h2>${body}`;modal.classList.remove('hidden')}
function openDetail(id){
  const s=stores.find(x=>x.id===id); if(!s)return;
  const routes=(s.routes||[]).filter(r=>validUrl(r.url));
  const primary=routes.filter(r=>!isMajorRoute(r.name));
  const major=routes.filter(r=>isMajorRoute(r.name));
  modalBody.innerHTML=`<h2>${s.name}</h2><p>${s.address||s.district||'여수'}</p>
  <div class="route-buttons">${primary.map(r=>`<a href="${r.url}" target="_blank">${routeIcon(r)}<b>${r.name}</b></a>`).join('')}</div>
  ${major.length?`<details class="other-apps"><summary>다른 주문앱 보기</summary><div class="route-buttons">${major.map(r=>`<a href="${r.url}" target="_blank">${routeIcon(r)}<b>${r.name.replace('coupang_eats','쿠팡이츠')}</b></a>`).join('')}</div></details>`:''}
  ${validUrl(s.naverMap)?`<a class="map-link" href="${s.naverMap}" target="_blank">📍 네이버에서 가게정보 보기</a>`:''}
  <button class="report-btn" data-store="${s.id}">📌 정보 수정 제안</button>`;
  modal.classList.remove('hidden');
  modalBody.querySelector('.report-btn').onclick=()=>openReportForm(s);
}
function openReportForm(s){
  modalBody.innerHTML=`<h2>${s.name} 정보 수정 제안</h2>
  <p>무엇이 다른지 선택해주세요.</p>
  <form id="reportForm" class="report-form">
    <label><input type="radio" name="issue" value="전화번호" required> 전화번호</label>
    <label><input type="radio" name="issue" value="주소·위치"> 주소·위치</label>
    <label><input type="radio" name="issue" value="사진"> 사진</label>
    <label><input type="radio" name="issue" value="영업시간"> 영업시간</label>
    <label><input type="radio" name="issue" value="주문링크"> 주문링크</label>
    <label><input type="radio" name="issue" value="기타"> 기타</label>
    <textarea placeholder="알려주실 내용을 적어주세요."></textarea>
    <button type="submit">보내기</button>
  </form>`;
  reportForm.onsubmit=e=>{e.preventDefault();alert('수정 제안이 접수되었습니다.');modal.classList.add('hidden')};
}

const slides=[
  {img:'images/momstouch.jpg',title:'맘스터치',text:'브랜드앱과 다양한 주문방법을 한곳에서 확인하세요.'},
  {img:'images/burgerking.png',title:'버거킹',text:'가까운 매장의 주문경로를 빠르게 찾으세요.'},
  {img:'images/doozzim.jpg',title:'두찜',text:'이벤트와 주문 가능 경로를 한 번에 확인하세요.'}
];
function renderSlides(){
  slideTrack.innerHTML=slides.map((s,i)=>`<div class="slide ${i===slideIndex?'active':''}"><img src="${s.img}" alt="${s.title}"><div class="slide-copy"><h2>${s.title}</h2><p>${s.text}</p></div></div>`).join('');
  slideDots.innerHTML=slides.map((_,i)=>`<button class="${i===slideIndex?'active':''}" data-i="${i}"></button>`).join('');
  slideDots.querySelectorAll('button').forEach(b=>b.onclick=()=>{slideIndex=+b.dataset.i;renderSlides();restartSlider()});
}
function nextSlide(step=1){slideIndex=(slideIndex+step+slides.length)%slides.length;renderSlides()}
function restartSlider(){clearInterval(slideTimer);slideTimer=setInterval(()=>nextSlide(1),3500)}
function openPicker(title, items, current, onSelect){
  pickerTitle.textContent=title; pickerSearch.value='';
  const paint=(q='')=>{
    pickerOptions.innerHTML=items.filter(x=>!q||x.toLowerCase().includes(q.toLowerCase())).map(x=>`<button class="${x===current?'active':''}">${x||'전체'}</button>`).join('');
    [...pickerOptions.children].forEach((b,i)=>b.onclick=()=>{const label=b.textContent;const value=label==='전체'?'':label;onSelect(value);picker.classList.add('hidden')});
  };
  paint(); pickerSearch.oninput=()=>paint(pickerSearch.value); picker.classList.remove('hidden');
}
function buildCategories(){
  const available=[...new Set(stores.map(s=>s.category).filter(Boolean))];
  const chosen=categoryOrder.filter(c=>available.includes(c));
  const others=available.filter(c=>!chosen.includes(c)).slice(0,4);
  categoryIcons.innerHTML=[...chosen,...others].map(c=>`<button data-category="${c}"><span>${categoryEmoji[c]||'🍽️'}</span><b>${c}</b></button>`).join('')+`<button data-category=""><span>↺</span><b>전체</b></button>`;
  categoryIcons.querySelectorAll('button').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;categoryIcons.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));render()});
}

fetch('data/stores.json').then(r=>r.json()).then(data=>{
  stores=applyOverrides(data); buildCategories(); renderSlides(); restartSlider(); render();
});
searchBtn.onclick=()=>{activeQuery=searchInput.value.trim().toLowerCase();render();featuredGrid.scrollIntoView({behavior:'smooth',block:'start'})};
searchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchBtn.click()}});
districtBtn.onclick=()=>openPicker('동네 선택',['',...[...new Set(stores.map(s=>s.district).filter(Boolean))].sort()],activeDistrict,v=>{activeDistrict=v;districtBtn.textContent=(v||'전체 동네')+' ▾';render()});
document.querySelectorAll('#routeStrip button').forEach(el=>el.onclick=()=>{
  const key=el.dataset.route;
  activeRoute=activeRoute===key?'':key;
  document.querySelectorAll('#routeStrip button').forEach(x=>x.classList.toggle('selected',x===el&&activeRoute));
  render();
  document.querySelector('.category-section').scrollIntoView({behavior:'smooth',block:'start'});
});
closeModal.onclick=()=>modal.classList.add('hidden');modal.onclick=e=>{if(e.target===modal)modal.classList.add('hidden')};
closePicker.onclick=()=>picker.classList.add('hidden');picker.onclick=e=>{if(e.target===picker)picker.classList.add('hidden')};
slidePrev.onclick=()=>{nextSlide(-1);restartSlider()};slideNext.onclick=()=>{nextSlide(1);restartSlider()};
mainSlider.addEventListener('mouseenter',()=>clearInterval(slideTimer));mainSlider.addEventListener('mouseleave',restartSlider);
mainSlider.addEventListener('touchstart',()=>clearInterval(slideTimer),{passive:true});mainSlider.addEventListener('touchend',restartSlider,{passive:true});
locateBtn.onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(()=>alert('위치가 확인되었습니다. 정식 서버에서는 거리순으로 정렬됩니다.'),()=>alert('위치 권한이 거부되어 동네를 직접 선택해주세요.')):alert('이 브라우저는 위치 기능을 지원하지 않습니다.');
document.querySelectorAll('[data-footer]').forEach(b=>b.onclick=()=>{
  const type=b.dataset.footer;
  if(type==='privacy')showInfoModal('개인정보처리방침','<p>정식 공개 전 실제 위치정보·접속통계·수정제안 처리 방식에 맞춰 최종 문구를 확정합니다.</p>');
  else if(type==='terms')showInfoModal('이용약관','<p>정식 공개 전 서비스 운영정책에 맞춰 최종 약관을 확정합니다.</p>');
  else if(type==='report')showInfoModal('정보 수정 제안','<p>가게 상세페이지에서 해당 가게의 정보 수정 제안을 보낼 수 있습니다.</p>');
  else showInfoModal('광고 문의','<p>가게 홍보·신규오픈·기사모집·가맹점 모집 광고를 신청할 수 있습니다.</p>');
});
