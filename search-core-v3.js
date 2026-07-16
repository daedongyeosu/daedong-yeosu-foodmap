(()=>{
  'use strict';

  const clean = value => String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/&/g, '앤')
    .replace(/[·ㆍ•]/g, '')
    .replace(/[()\[\]{}<>.,!?"'`~@#$%^*_=+|\\/:;-]/g, '')
    .replace(/\s+/g, '');

  const words = value => String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[()\[\]{}<>.,!?"'`~@#$%^*_=+|\\/:;·ㆍ•-]/g, ' ')
    .split(/\s+/)
    .map(clean)
    .filter(Boolean);

  const asArray = value => Array.isArray(value) ? value : value ? [value] : [];

  const categoryAliases = {
    '돈가스':['돈까스','돈가츠'], '돈까스':['돈가스','돈가츠'],
    '양꼬치':['양고기꼬치'], '마라탕양꼬치':['마라탕','양꼬치'],
    '족발보쌈':['족발','보쌈'], '회해산물':['회','해산물','수산물'],
    '고기구이':['고기','구이','육류'], '카페디저트':['카페','디저트','커피'],
    '햄버거':['버거'], '버거':['햄버거'], '국밥':['탕','해장국']
  };

  function editDistance(a,b,max=3){
    a=clean(a);b=clean(b);
    if(a===b)return 0;
    if(Math.abs(a.length-b.length)>max)return max+1;
    const prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      const cur=[i]; let rowMin=cur[0];
      for(let j=1;j<=b.length;j++){
        const cost=a[i-1]===b[j-1]?0:1;
        cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+cost);
        rowMin=Math.min(rowMin,cur[j]);
      }
      if(rowMin>max)return max+1;
      for(let j=0;j<cur.length;j++)prev[j]=cur[j];
    }
    return prev[b.length];
  }

  function collect(store){
    const primary=[
      store.name, store.realBusinessName,
      ...asArray(store.shopInShopNames), ...asArray(store.aliases), ...asArray(store.brandNames)
    ].filter(Boolean);
    const menu=[
      ...asArray(store.searchTerms), ...asArray(store.tags), ...asArray(store.menuNames),
      ...asArray(store.menus), ...asArray(store.representativeMenus), ...asArray(store.keywords)
    ].filter(Boolean);
    const context=[
      store.category, store.cat, ...asArray(store.categories),
      store.district, store.area, ...asArray(store.areas), store.address
    ].filter(Boolean);
    const all=[...primary,...menu,...context];
    const tokens=[...new Set(all.flatMap(words))];
    const normalized=[...new Set(all.map(clean).filter(Boolean))];
    return {primary:primary.map(clean), menu:menu.map(clean), context:context.map(clean), all:normalized, tokens};
  }

  function score(store,query){
    const q=clean(query);
    if(!q)return 0;
    const f=collect(store);
    let best=0;

    for(const value of f.primary){
      if(value===q)best=Math.max(best,1000);
      else if(value.startsWith(q))best=Math.max(best,940);
      else if(value.includes(q))best=Math.max(best,900);
      else if(q.length>=3 && q.includes(value) && value.length>=3)best=Math.max(best,850);
    }
    for(const value of f.menu){
      if(value===q)best=Math.max(best,820);
      else if(value.startsWith(q))best=Math.max(best,790);
      else if(value.includes(q)||q.includes(value))best=Math.max(best,750);
    }
    for(const value of f.context){
      if(value===q)best=Math.max(best,650);
      else if(value.includes(q)||q.includes(value))best=Math.max(best,610);
    }

    const qTokens=words(query);
    if(qTokens.length>1){
      const hits=qTokens.filter(token=>f.all.some(value=>value.includes(token))).length;
      if(hits===qTokens.length)best=Math.max(best,870+hits);
      else if(hits>0)best=Math.max(best,520+hits*20);
    }

    const aliases=categoryAliases[q]||[];
    if(aliases.some(alias=>f.all.some(value=>value.includes(clean(alias)))))best=Math.max(best,700);

    // 3글자 이상 검색어는 한 글자 오타까지 적극 허용한다.
    if(q.length>=3){
      const maxDistance=q.length<=5?1:2;
      for(const candidate of [...f.primary,...f.tokens]){
        if(Math.abs(candidate.length-q.length)>maxDistance)continue;
        const distance=editDistance(candidate,q,maxDistance);
        if(distance<=maxDistance){
          const fuzzyScore=f.primary.includes(candidate)?(distance===1?840:760):(distance===1?690:620);
          best=Math.max(best,fuzzyScore);
        }
      }
    }
    return best;
  }

  function rank(list,query){
    return list.map((store,index)=>({store,index,score:score(store,query)}))
      .filter(item=>item.score>0)
      .sort((a,b)=>b.score-a.score||a.index-b.index)
      .map(item=>item.store);
  }

  function suggestions(list,query,limit=5){
    const q=clean(query); if(!q||q.length<2)return[];
    return list.map(store=>{
      const candidates=collect(store).primary;
      const distance=Math.min(...candidates.map(v=>editDistance(v,q,3)),99);
      return {store,distance};
    }).filter(x=>x.distance<=2).sort((a,b)=>a.distance-b.distance).slice(0,limit).map(x=>x.store);
  }

  window.daedongSearch={clean,collect,score,rank,suggestions,editDistance};
  // 기존 메인 검색도 같은 정밀 검색 엔진을 사용한다.
  window.relevance=(store,query)=>score(store,query);
})();
