const gpsState={active:false,latitude:null,longitude:null,accuracy:null};

function gpsNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}

function coordsFromMapUrl(url=''){
  const text=String(url||'');
  const patterns=[
    /[?&](?:lat|latitude)=(-?\d+(?:\.\d+)?)[&].*?(?:lng|lon|longitude)=(-?\d+(?:\.\d+)?)/i,
    /[?&](?:lng|lon|longitude)=(-?\d+(?:\.\d+)?)[&].*?(?:lat|latitude)=(-?\d+(?:\.\d+)?)/i,
    /[?&]c=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i
  ];
  let m=text.match(patterns[0]);if(m)return{lat:Number(m[1]),lng:Number(m[2])};
  m=text.match(patterns[1]);if(m)return{lat:Number(m[2]),lng:Number(m[1])};
  m=text.match(patterns[2]);if(m)return{lat:Number(m[2]),lng:Number(m[1])};
  return null;
}

function storeCoords(store){
  const lat=gpsNumber(store.latitude??store.lat??store.y);
  const lng=gpsNumber(store.longitude??store.lng??store.lon??store.x);
  if(lat!==null&&lng!==null&&Math.abs(lat)<=90&&Math.abs(lng)<=180)return{lat,lng};
  return coordsFromMapUrl(store.naverMap||store.links?.naver||'');
}

function distanceKm(lat1,lng1,lat2,lng2){
  const rad=v=>v*Math.PI/180;
  const R=6371;
  const dLat=rad(lat2-lat1),dLng=rad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function refreshStoreDistances(){
  stores.forEach(store=>{
    const point=storeCoords(store);
    store.coords=point;
    store.distanceKm=(gpsState.active&&point)?distanceKm(gpsState.latitude,gpsState.longitude,point.lat,point.lng):null;
  });
}

function distanceLabel(km){
  if(!Number.isFinite(km))return'';
  if(km<1)return`📍 ${Math.max(10,Math.round(km*1000/10)*10)}m`;
  return`📍 ${km.toFixed(km<10?1:0)}km`;
}

const originalStableSort=stableSort;
stableSort=function(list,query=''){
  const base=originalStableSort(list,query);
  if(!gpsState.active)return base;
  return base.map((store,index)=>({store,index,d:Number.isFinite(store.distanceKm)?store.distanceKm:Infinity}))
    .sort((a,b)=>a.d-b.d||a.index-b.index).map(x=>x.store);
};

const originalStoreCard=storeCard;
storeCard=function(store){
  const html=originalStoreCard(store);
  const label=distanceLabel(store.distanceKm);
  return label?html.replace(`<p>${esc(store.area)} · ${esc(store.cat)}</p>`,`<p>${esc(store.area)} · ${esc(store.cat)} <span class="distance-badge">${label}</span></p>`):html;
};

function setGpsButton(message,active=false){
  const text=document.querySelector('#locationText');
  const button=document.querySelector('#locationBtn');
  if(text)text.textContent=message;
  if(button)button.classList.toggle('gps-active',active);
}

function activateGps(){
  if(!navigator.geolocation){openModal('<h2>현재 위치</h2><p>이 기기에서는 위치 기능을 사용할 수 없습니다.</p>');return;}
  setGpsButton('위치 확인 중…',false);
  navigator.geolocation.getCurrentPosition(position=>{
    gpsState.active=true;
    gpsState.latitude=position.coords.latitude;
    gpsState.longitude=position.coords.longitude;
    gpsState.accuracy=position.coords.accuracy;
    refreshStoreDistances();
    setGpsButton('내 주변 가게',true);
    localStorage.setItem('daedongGpsEnabled','1');
    renderStores({scroll:true});
  },error=>{
    const reason=error.code===1?'위치 권한이 거부되었습니다. 브라우저의 위치 권한을 허용해 주세요.':error.code===2?'현재 위치를 확인하지 못했습니다.':'위치 확인 시간이 초과되었습니다.';
    setGpsButton('여수시 전체',false);
    openModal(`<h2>현재 위치</h2><p>${reason}</p>`);
  },{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
}

document.addEventListener('DOMContentLoaded',()=>{
  const button=document.querySelector('#locationBtn');
  if(!button)return;
  button.title='현재 위치에서 가까운 가게 보기';
  button.onclick=()=>{
    if(gpsState.active){
      gpsState.active=false;gpsState.latitude=null;gpsState.longitude=null;
      stores.forEach(store=>store.distanceKm=null);
      localStorage.removeItem('daedongGpsEnabled');
      setGpsButton('여수시 전체',false);
      renderStores({scroll:true});
    }else activateGps();
  };
});
