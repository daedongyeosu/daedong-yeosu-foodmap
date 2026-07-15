const STORE_KEY='daedong-store-overrides-v20',WEIGHT_KEY='daedong-weights-v20',POLICY_KEY='daedong-policy-v21';let base=[],stores=[];
function loadO(){try{return JSON.parse(localStorage.getItem(STORE_KEY)||'{}')}catch{return {}}}
function saveO(o){localStorage.setItem(STORE_KEY,JSON.stringify(o))}
function loadP(){try{return JSON.parse(localStorage.getItem(POLICY_KEY)||'{"flyerStoreId":"","rainMode":0}')}catch{return {flyerStoreId:'',rainMode:0}}}
function saveP(p){localStorage.setItem(POLICY_KEY,JSON.stringify(p))}
function apply(){const o=loadO();stores=base.map(s=>({...s,...(o[s.id]||{})}))}
function valid(u){return /^https?:\/\//.test((u||'').trim())||/^tel:/.test((u||'').trim())}
function hasLocal(s){return (s.routes||[]).some(r=>valid(r.url)&&['가게바로','직접','자동주문','브랜드','먹깨비','땡겨요','온동네','꼬르륵','전화'].some(n=>r.name.includes(n)))}
function majorOnly(s){const r=(s.routes||[]).filter(x=>valid(x.url));return r.length&&!hasLocal(s)&&r.some(x=>['요기요','쿠팡','배민','배달의민족'].some(n=>x.name.includes(n)))}
function login(){document.querySelector('#loginView').classList.add('hidden');document.querySelector('#adminView').classList.remove('hidden');render()}
document.querySelector('#loginForm').onsubmit=e=>{e.preventDefault();if(loginId.value==='admin'&&loginPw.value==='1234'){if(rememberId.checked)localStorage.setItem('rememberAdminId','admin');login()}else alert('아이디 또는 비밀번호를 확인하세요.')}
document.querySelector('#logoutBtn').onclick=()=>location.reload();
const savedId=localStorage.getItem('rememberAdminId');if(savedId){loginId.value=savedId;rememberId.checked=true}

function refreshFlyerOptions(){
  const q=(flyerStoreSearch.value||'').trim().toLowerCase();
  const p=loadP();
  const list=stores.filter(s=>!q||s.name.toLowerCase().includes(q)).slice(0,200);
  flyerStoreSelect.innerHTML='<option value="">전단 최우선 가게 없음</option>'+list.map(s=>`<option value="${s.id}" ${s.id===p.flyerStoreId?'selected':''}>${s.name} (${s.district||''})</option>`).join('');
}

function render(){apply();totalStores.textContent=stores.length;managedCount.textContent=stores.filter(s=>s.managed).length;sharedCount.textContent=stores.filter(s=>s.sharedManaged).length;localRouteCount.textContent=stores.filter(hasLocal).length;const q=adminSearch.value.trim().toLowerCase(),f=adminFilter.value;let list=stores.filter(s=>(!q||JSON.stringify(s).toLowerCase().includes(q))&&(!f||(f==='managed'&&s.managed)||(f==='shared'&&s.sharedManaged)||(f==='general'&&!s.managed&&!s.sharedManaged)||(f==='majorOnly'&&majorOnly(s))));adminList.innerHTML=list.slice(0,300).map(s=>`<article class="admin-item" data-id="${s.id}"><div><h3>${s.name}</h3><p>${s.district||''} · ${s.category||''}</p></div><label><input class="managed" type="checkbox" ${s.managed?'checked':''}> 우리 관리</label><label><input class="shared" type="checkbox" ${s.sharedManaged?'checked':''}> 공유대표</label><label>샵인샵 그룹 <input class="shopgroup" value="${s.shopInShopGroup||''}" placeholder="예: BBQ문수점"></label><label>고정순위 <input class="pin" type="number" min="1" value="${Number.isInteger(s.pinPosition)?s.pinPosition:''}"></label><label><input class="bottom" type="checkbox" ${s.forceBottom?'checked':''}> 최하단</label><button class="edit">저장</button></article>`).join('');document.querySelectorAll('.admin-item .edit').forEach(btn=>btn.onclick=()=>{const el=btn.closest('.admin-item'),id=el.dataset.id,o=loadO();o[id]={...(o[id]||{}),managed:el.querySelector('.managed').checked,sharedManaged:el.querySelector('.shared').checked,shopInShopGroup:el.querySelector('.shopgroup').value.trim(),pinPosition:el.querySelector('.pin').value?Number(el.querySelector('.pin').value):null,forceBottom:el.querySelector('.bottom').checked};if(o[id].managed)o[id].sharedManaged=false;saveO(o);render()});refreshFlyerOptions()}

fetch('data/stores.json').then(r=>r.json()).then(d=>{base=d;const w=JSON.parse(localStorage.getItem(WEIGHT_KEY)||'{"managed":70,"shared":20,"general":10}');wManaged.value=w.managed;wShared.value=w.shared;wGeneral.value=w.general;const p=loadP();document.querySelector(`input[name="rainMode"][value="${p.rainMode||0}"]`).checked=true;render()})
adminSearch.oninput=render;adminFilter.onchange=render;flyerStoreSearch.oninput=refreshFlyerOptions;
saveWeights.onclick=()=>{const w={managed:+wManaged.value,shared:+wShared.value,general:+wGeneral.value};if(w.managed+w.shared+w.general!==100)return alert('합계가 100%가 되어야 합니다.');localStorage.setItem(WEIGHT_KEY,JSON.stringify(w));alert('저장했습니다. 고객 화면을 새로고침하면 반영됩니다.')}
saveFlyerStore.onclick=()=>{const p=loadP();p.flyerStoreId=flyerStoreSelect.value;saveP(p);alert('전단 최우선 가게가 적용되었습니다.');}
clearFlyerStore.onclick=()=>{const p=loadP();p.flyerStoreId='';saveP(p);flyerStoreSelect.value='';alert('전단 최우선 노출을 해제했습니다.');}
saveRainMode.onclick=()=>{const p=loadP();p.rainMode=Number(document.querySelector('input[name="rainMode"]:checked')?.value||0);saveP(p);alert(`우천 모드 ${p.rainMode}단계를 적용했습니다.`);}
exportCsv.onclick=()=>{const rows=[['가게명','동네','카테고리','우리관리','공유대표','샵인샵그룹','지역주문경로','대형앱전용'],...stores.map(s=>[s.name,s.district,s.category,s.managed?'Y':'',s.sharedManaged?'Y':'',s.shopInShopGroup||'',hasLocal(s)?'Y':'',majorOnly(s)?'Y':''])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='대동음식지도_가게현황.csv';a.click()}