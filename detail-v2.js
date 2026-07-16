(()=>{
  const originalDetail=detail;
  detail=function(store){
    const visible=APP_ICON_ORDER.filter(key=>store.links[key]);
    const quickKeys=['naver','chak'].filter(key=>store.links[key]);
    const orderKeys=visible.filter(key=>!quickKeys.includes(key));
    const primaryKeys=orderKeys.filter(key=>['direct','brand','mukkebi','ddangyo'].includes(key));
    const otherKeys=orderKeys.filter(key=>!primaryKeys.includes(key));
    const primary=primaryKeys.map(key=>`<a class="detail-route" href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http')?'target="_blank" rel="noopener"':''}>${appIcon(key,'detail-route-icon')}<span>${APP_META[key].label}</span><b>›</b></a>`).join('');
    const quick=quickKeys.length?`<div class="detail-quick-links">${quickKeys.map(key=>`<a class="detail-quick-link" href="${esc(store.links[key])}" target="_blank" rel="noopener"><span class="quick-icon">${key==='naver'?'🗺️':'💳'}</span><span>${key==='naver'?'네이버지도':'지역상품권앱'}</span></a>`).join('')}</div>`:'';
    const others=otherKeys.length?`<div class="store-other-wrap"><button class="detail-route store-other-toggle"><span class="other-label">다른 주문방법 보기</span><span class="other-inline-icons">${otherKeys.map(key=>appIcon(key,'other-inline-icon')).join('')}</span><b>›</b></button><div class="store-other-popover" hidden><button class="store-other-close" aria-label="닫기">×</button>${otherKeys.map(key=>`<a href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http')?'target="_blank" rel="noopener"':''}>${appIcon(key,'store-other-icon')}<span>${APP_META[key].label}</span></a>`).join('')}</div></div>`:'';
    const photo=window.DaedongPhotoDisplay?.attributes(store,'detail')||{src:store.img};
    openModal(`<div class="store-detail-head"><h2>${esc(store.name)}</h2></div><img src="${esc(photo.src)}" class="detail-photo" alt="${esc(store.name)}" loading="eager" decoding="async" width="960" height="720" onerror="this.src='assets/store1.jpg'"><p class="detail-meta">${esc(store.area)} · ${esc(store.cat)}</p>${quick}<div class="detail-routes">${primary}${others}</div>`);
  };
})();
