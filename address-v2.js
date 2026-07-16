const ADDRESS_KEY='daedongDeliveryAddressV2';
const ADDRESS_BOOK_KEY='daedongAddressBookV2';
let pendingAddress=null;

function getSavedAddress(){try{return JSON.parse(localStorage.getItem(ADDRESS_KEY)||'null');}catch{return null;}}
function getAddressBook(){try{return JSON.parse(localStorage.getItem(ADDRESS_BOOK_KEY)||'[]');}catch{return[];}}
function saveAddressBook(list){localStorage.setItem(ADDRESS_BOOK_KEY,JSON.stringify(list.slice(0,12)));}
function shortAddress(text=''){const clean=String(text).trim();if(!clean)return'여수시 전체';return clean.length>18?`${clean.slice(0,18)}…`:clean;}

function showAddressToast(address){
  let toast=document.querySelector('#addressConfirmToast');
  if(!toast){toast=document.createElement('div');toast.id='addressConfirmToast';toast.className='address-confirm-toast';document.body.appendChild(toast);}
  toast.innerHTML=`<div><strong>이 배달 주소가 맞나요?</strong><span>${esc(address.label||address.address||'현재 위치')}</span></div><button data-address-confirm>확인</button><button data-address-change>변경</button>`;
  toast.hidden=false;
  clearTimeout(showAddressToast.timer);
  showAddressToast.timer=setTimeout(()=>toast.hidden=true,7000);
}

function applyAddress(address,{confirm=true}={}){
  if(!address)return;
  localStorage.setItem(ADDRESS_KEY,JSON.stringify(address));
  const list=getAddressBook().filter(item=>item.address!==address.address||item.type!==address.type);
  list.unshift(address);
  saveAddressBook(list);
  setGpsButton(shortAddress(address.label||address.address),Boolean(address.latitude&&address.longitude));
  if(address.latitude&&address.longitude){
    gpsState.active=true;gpsState.latitude=Number(address.latitude);gpsState.longitude=Number(address.longitude);gpsState.accuracy=Number(address.accuracy)||null;
    refreshStoreDistances();
  }else{
    gpsState.active=false;gpsState.latitude=null;gpsState.longitude=null;stores.forEach(store=>store.distanceKm=null);
  }
  renderStores();
  if(confirm)showAddressToast(address);
}

function addressRow(item,index){
  const icon=item.type==='home'?'🏠':item.type==='work'?'🏢':'📍';
  const title=item.label||item.address||'저장 주소';
  const sub=item.address&&item.address!==title?item.address:'';
  return `<button class="address-saved-row" data-address-index="${index}"><span class="address-row-icon">${icon}</span><span><b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span><i>›</i></button>`;
}

function openAddressSetup(){
  const saved=getSavedAddress();
  const book=getAddressBook();
  openModal(`<div class="address-sheet">
    <div class="address-sheet-head"><h2>배달 주소 설정</h2><p>배달받을 주소를 검색하거나 현재 위치를 선택해 주세요.</p></div>
    <div class="address-search-box"><span>⌕</span><input id="addressSearchInput" placeholder="도로명, 건물명, 지번을 검색하세요" autocomplete="street-address"><button id="addressSearchSave">주소 검색</button></div>
    <button id="useCurrentLocation" class="current-location-btn">⌖ <span>현재 위치로 주소 설정하기</span></button>
    ${saved?`<div class="current-address-card"><small>현재 설정된 주소</small><b>${esc(saved.label||saved.address)}</b><span>${esc(saved.address||'')}</span></div>`:''}
    <div class="address-recent"><div class="address-section-title"><h3>최근 주소</h3><span>최대 12개 저장</span></div>${book.length?book.map(addressRow).join(''):'<p class="address-empty">아직 저장된 주소가 없습니다.</p>'}</div>
  </div>`);
  setTimeout(()=>document.querySelector('#addressSearchInput')?.focus(),120);
}

function openPostcodeSearch(){
  if(!window.kakao?.Postcode){
    openModal('<h2>주소 검색</h2><p>주소 검색 서비스를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p>');
    return;
  }
  openModal(`<div class="postcode-sheet"><div class="postcode-head"><button type="button" data-postcode-back>←</button><h2>주소 검색</h2></div><div id="postcodeEmbed" class="postcode-embed"></div></div>`);
  const target=document.querySelector('#postcodeEmbed');
  new kakao.Postcode({
    width:'100%',height:'100%',maxSuggestItems:7,
    oncomplete(data){
      const base=data.userSelectedType==='R'?(data.roadAddress||data.address):(data.jibunAddress||data.address);
      const building=data.buildingName||'';
      pendingAddress={type:'recent',address:base,roadAddress:data.roadAddress||'',jibunAddress:data.jibunAddress||'',zonecode:data.zonecode||'',buildingName:building,createdAt:new Date().toISOString()};
      openAddressDetail();
    }
  }).embed(target,{autoClose:false});
}

function openAddressDetail(){
  if(!pendingAddress)return;
  const title=pendingAddress.buildingName||pendingAddress.address;
  openModal(`<div class="address-detail-sheet">
    <button type="button" class="address-detail-back" data-address-search-again>← 다시 검색</button>
    <h2>상세 주소 입력</h2>
    <div class="selected-address"><b>${esc(title)}</b><span>${esc(pendingAddress.address)}</span>${pendingAddress.zonecode?`<small>우편번호 ${esc(pendingAddress.zonecode)}</small>`:''}</div>
    <input id="addressDetailInput" class="address-detail-input" placeholder="동·호수 또는 상세 위치를 입력하세요" autocomplete="address-line2">
    <div class="address-save-actions"><button data-save-selected="recent">이 주소로 설정</button><button data-save-selected="home">🏠 집으로 저장</button><button data-save-selected="work">🏢 회사로 저장</button></div>
  </div>`);
  setTimeout(()=>document.querySelector('#addressDetailInput')?.focus(),120);
}

function saveSelectedAddress(type='recent'){
  if(!pendingAddress)return;
  const detail=String(document.querySelector('#addressDetailInput')?.value||'').trim();
  const full=[pendingAddress.address,detail].filter(Boolean).join(' ');
  const label=type==='home'?'집':type==='work'?'회사':(pendingAddress.buildingName||full);
  applyAddress({...pendingAddress,type,address:full,label,detail});
  pendingAddress=null;
  closeModal();
}

function useCurrentLocation(){
  if(!window.isSecureContext && location.hostname!=='localhost' && location.hostname!=='127.0.0.1'){
    openModal('<h2>현재 위치</h2><p>휴대전화에서 현재 위치를 사용하려면 HTTPS 주소가 필요합니다.</p><p>지금처럼 <b>192.168.x.x</b> 형태의 개발용 주소에서는 브라우저가 위치 기능을 차단할 수 있습니다. 공개된 HTTPS 홈페이지에서는 정상적으로 위치 권한을 요청합니다.</p>');
    return;
  }
  if(!navigator.geolocation){openModal('<h2>현재 위치</h2><p>이 기기에서는 위치 기능을 사용할 수 없습니다.</p>');return;}
  const button=document.querySelector('#useCurrentLocation');
  if(button){button.disabled=true;button.innerHTML='⌖ <span>현재 위치 확인 중…</span>';}
  navigator.geolocation.getCurrentPosition(position=>{
    const current={type:'current',address:'현재 위치',label:'현재 위치',latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,createdAt:new Date().toISOString()};
    applyAddress(current,{confirm:false});
    closeModal();
    setTimeout(()=>showAddressToast(current),120);
  },error=>{
    const reason=error.code===1?'위치 권한이 꺼져 있습니다. 브라우저 주소창의 사이트 설정에서 위치를 허용해 주세요.':error.code===2?'현재 위치를 확인하지 못했습니다. 주소 검색을 이용해 주세요.':'위치 확인 시간이 초과되었습니다. 다시 시도해 주세요.';
    openModal(`<h2>현재 위치</h2><p>${reason}</p>`);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:120000});
}

document.addEventListener('click',event=>{
  if(event.target.closest('#locationBtn')){event.preventDefault();event.stopPropagation();openAddressSetup();return;}
  if(event.target.closest('#addressSearchSave')){openPostcodeSearch();return;}
  if(event.target.closest('[data-postcode-back]')){openAddressSetup();return;}
  if(event.target.closest('[data-address-search-again]')){openPostcodeSearch();return;}
  const saveButton=event.target.closest('[data-save-selected]');
  if(saveButton){saveSelectedAddress(saveButton.dataset.saveSelected);return;}
  if(event.target.closest('#useCurrentLocation')){useCurrentLocation();return;}
  const row=event.target.closest('[data-address-index]');
  if(row){const item=getAddressBook()[Number(row.dataset.addressIndex)];if(item){applyAddress(item);closeModal();}return;}
  if(event.target.closest('[data-address-confirm]')){document.querySelector('#addressConfirmToast').hidden=true;return;}
  if(event.target.closest('[data-address-change]')){document.querySelector('#addressConfirmToast').hidden=true;openAddressSetup();}
});

document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target?.id==='addressSearchInput')openPostcodeSearch();if(event.key==='Enter'&&event.target?.id==='addressDetailInput')saveSelectedAddress('recent');});

document.addEventListener('DOMContentLoaded',()=>{
  const saved=getSavedAddress();
  if(saved)applyAddress(saved,{confirm:false});
  else setTimeout(()=>openAddressSetup(),700);
});