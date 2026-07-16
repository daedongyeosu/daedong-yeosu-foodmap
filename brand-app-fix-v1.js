(()=>{
  const knownAppWords=/(먹깨비|땡겨요|요기요|쿠팡|배달의민족|배민|네이버|지도|chak|지역상품권|전화|가게바로|자동주문|직접주문)/i;
  const brandWords=/(브랜드\s*앱|자사\s*앱|공식\s*앱|전용\s*앱|앱\s*주문|브랜드\s*주문|홈페이지\s*주문|공식\s*주문)/i;
  const brandDomains=/(lotteria|kfc|burgerking|momstouch|mcdonalds|bbq|bhc|goobne|kyochon|60chicken|dominos|pizzahut|papajohns|subway|starbucks|paikdabang|ediya|composecoffee|mega-mgccoffee|hollys|twosome|nenechicken|pelicana|puradak|noodles|bonif|jawsfood|sinjeon|yupdduk|schoolfood)/i;

  function detectBrandRoute(route){
    if(!route||route.enabled===false||!route.url)return false;
    const name=String(route.name||'');
    const url=String(route.url||'');
    if(knownAppWords.test(name))return false;
    return brandWords.test(name)||brandDomains.test(url)||(/앱/i.test(name)&&!knownAppWords.test(name));
  }

  function apply(){
    if(!Array.isArray(window.stores)&&typeof stores==='undefined')return false;
    const list=typeof stores!=='undefined'?stores:window.stores;
    let changed=false;
    for(const store of list){
      if(!store||store.links?.brand)continue;
      const route=(store.routes||[]).find(detectBrandRoute);
      if(route){
        store.links=store.links||{};
        store.links.brand=route.url;
        changed=true;
      }
      const fallback=store.brandAppUrl||store.brandUrl||store.officialAppUrl||store.homepageOrderUrl;
      if(!store.links?.brand&&fallback){store.links.brand=fallback;changed=true;}
    }
    if(changed&&typeof renderStores==='function')renderStores();
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries+=1;if(apply()||tries>40)clearInterval(timer);},250);
})();
