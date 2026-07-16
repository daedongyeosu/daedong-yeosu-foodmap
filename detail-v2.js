(()=>{
  const CATEGORY_EMOJI={'한식':'🍲','치킨':'🍗','피자':'🍕','중식':'🍜','분식':'🍢','족발·보쌈':'🥩','회·해산물':'🐟','햄버거':'🍔','고기·구이':'🥓','찜·탕':'🥘','도시락':'🍱','야식·주점':'🌙','마라탕·양꼬치':'🌶️','반찬':'🥗','카페·디저트':'☕','샐러드':'🥬','양식':'🍝','아시안':'🍛','음식점':'🍽️'};
  const escAttr=value=>esc(value);

  function galleryPhotos(store){
    return window.DaedongPhotoDisplay?.candidates?.(store)||[];
  }

  function galleryMarkup(store){
    const photos=galleryPhotos(store);
    const category=String(store.cat||store.category||'음식점').trim()||'음식점';
    if(!photos.length)return `<div class="detail-photo-placeholder"><span>${CATEGORY_EMOJI[category]||'🍽️'}</span><b>검증된 음식사진을 준비 중입니다</b></div>`;
    const slides=photos.map((photo,index)=>`<figure class="detail-gallery-slide" data-gallery-index="${index}"><img src="${escAttr(photo.detail||photo.card)}" alt="${esc(store.name)} 사진 ${index+1}" loading="${index===0?'eager':'lazy'}" decoding="async" width="960" height="720" onerror="this.closest('.detail-gallery-slide').innerHTML='<div class=&quot;detail-photo-placeholder&quot;><span>${CATEGORY_EMOJI[category]||'🍽️'}</span><b>사진 준비 중</b></div>'"></figure>`).join('');
    const dots=photos.length>1?`<div class="detail-gallery-dots">${photos.map((_,index)=>`<button type="button" data-gallery-dot="${index}" class="${index===0?'active':''}" aria-label="사진 ${index+1}"></button>`).join('')}</div>`:'';
    const arrows=photos.length>1?`<button type="button" class="detail-gallery-arrow prev" data-gallery-move="-1" aria-label="이전 사진">‹</button><button type="button" class="detail-gallery-arrow next" data-gallery-move="1" aria-label="다음 사진">›</button>`:'';
    const count=photos.length>1?`<span class="detail-gallery-count"><b data-gallery-current>1</b> / ${photos.length}</span>`:'';
    return `<div class="detail-gallery" data-detail-gallery data-photo-count="${photos.length}"><div class="detail-gallery-track">${slides}</div>${arrows}${dots}${count}</div>`;
  }

  detail=function(store){
    const visible=APP_ICON_ORDER.filter(key=>store.links[key]);
    const quickKeys=['naver','chak'].filter(key=>store.links[key]);
    const orderKeys=visible.filter(key=>!quickKeys.includes(key));
    const primaryKeys=orderKeys.filter(key=>['direct','brand','mukkebi','ddangyo','ondongne'].includes(key));
    const otherKeys=orderKeys.filter(key=>!primaryKeys.includes(key));
    const primary=primaryKeys.map(key=>`<a class="detail-route" href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http')?'target="_blank" rel="noopener"':''}>${appIcon(key,'detail-route-icon')}<span>${APP_META[key].label}</span><b>›</b></a>`).join('');
    const quick=quickKeys.length?`<div class="detail-quick-links">${quickKeys.map(key=>`<a class="detail-quick-link" href="${esc(store.links[key])}" target="_blank" rel="noopener"><span class="quick-icon">${key==='naver'?'🗺️':'💳'}</span><span>${key==='naver'?'네이버지도':'지역상품권앱'}</span></a>`).join('')}</div>`:'';
    const others=otherKeys.length?`<div class="store-other-wrap"><button class="detail-route store-other-toggle"><span class="other-label">다른 주문방법 보기</span><span class="other-inline-icons">${otherKeys.map(key=>appIcon(key,'other-inline-icon')).join('')}</span><b>›</b></button><div class="store-other-popover" hidden><button class="store-other-close" aria-label="닫기">×</button>${otherKeys.map(key=>`<a href="${esc(store.links[key])}" ${String(store.links[key]).startsWith('http')?'target="_blank" rel="noopener"':''}>${appIcon(key,'store-other-icon')}<span>${APP_META[key].label}</span></a>`).join('')}</div></div>`:'';
    openModal(`<div class="store-detail-head"><h2>${esc(store.name)}</h2></div>${galleryMarkup(store)}<p class="detail-meta">${esc(store.area)} · ${esc(store.cat)}</p>${quick}<div class="detail-routes">${primary}${others}</div>`);
  };

  function setGalleryIndex(gallery,index){
    const track=gallery.querySelector('.detail-gallery-track');
    const slides=[...gallery.querySelectorAll('.detail-gallery-slide')];
    if(!track||!slides.length)return;
    const next=Math.max(0,Math.min(slides.length-1,index));
    track.scrollTo({left:slides[next].offsetLeft,behavior:'smooth'});
    gallery.querySelectorAll('[data-gallery-dot]').forEach((dot,dotIndex)=>dot.classList.toggle('active',dotIndex===next));
    const current=gallery.querySelector('[data-gallery-current]');
    if(current)current.textContent=String(next+1);
    gallery.dataset.index=String(next);
  }

  document.addEventListener('click',event=>{
    const move=event.target.closest('[data-gallery-move]');
    if(move){event.preventDefault();event.stopPropagation();const gallery=move.closest('[data-detail-gallery]');const current=Number(gallery?.dataset.index||0);setGalleryIndex(gallery,current+Number(move.dataset.galleryMove));return;}
    const dot=event.target.closest('[data-gallery-dot]');
    if(dot){event.preventDefault();event.stopPropagation();setGalleryIndex(dot.closest('[data-detail-gallery]'),Number(dot.dataset.galleryDot));}
  });

  document.addEventListener('scroll',event=>{
    const track=event.target.closest?.('.detail-gallery-track');
    if(!track)return;
    const gallery=track.closest('[data-detail-gallery]');
    const slides=[...track.querySelectorAll('.detail-gallery-slide')];
    if(!slides.length)return;
    let best=0,bestDistance=Infinity;
    slides.forEach((slide,index)=>{const distance=Math.abs(track.scrollLeft-slide.offsetLeft);if(distance<bestDistance){bestDistance=distance;best=index;}});
    gallery.dataset.index=String(best);
    gallery.querySelectorAll('[data-gallery-dot]').forEach((dot,index)=>dot.classList.toggle('active',index===best));
    const current=gallery.querySelector('[data-gallery-current]');
    if(current)current.textContent=String(best+1);
  },true);
})();
