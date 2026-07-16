(() => {
  const franchisePatterns = [
    [/^60계(?:치킨)?/i, '60계치킨'], [/^(?:BBQ|비비큐)/i, 'BBQ'], [/^BHC/i, 'BHC'],
    [/^교촌(?:치킨)?/i, '교촌치킨'], [/^굽네(?:치킨)?/i, '굽네치킨'], [/^맘스터치/i, '맘스터치'],
    [/^롯데리아/i, '롯데리아'], [/^(?:배스킨|베스킨)라빈스/i, '배스킨라빈스'],
    [/^처갓집/i, '처갓집양념치킨'], [/^페리카나/i, '페리카나'], [/^네네(?:치킨)?/i, '네네치킨'],
    [/^멕시카나/i, '멕시카나'], [/^호식이/i, '호식이두마리치킨'], [/^티바/i, '티바두마리치킨'],
    [/^푸라닭/i, '푸라닭'], [/^자담(?:치킨)?/i, '자담치킨'], [/^가마치/i, '가마치통닭'],
    [/^피자스쿨/i, '피자스쿨'], [/^피자나라치킨공주/i, '피자나라치킨공주'], [/^도미노/i, '도미노피자'],
    [/^피자헛/i, '피자헛'], [/^미스터피자/i, '미스터피자'], [/^반올림피자/i, '반올림피자샵'],
    [/^메가(?:MGC)?커피/i, '메가MGC커피'], [/^컴포즈커피/i, '컴포즈커피'], [/^빽다방/i, '빽다방'],
    [/^이디야/i, '이디야커피'], [/^투썸/i, '투썸플레이스'], [/^파리바게/i, '파리바게뜨']
  ];
  const branchWords = '(?:여수)?(?:돌산|여서|문수|미평|봉계둔덕|봉계|둔덕|웅천|죽림|학동|국동|충무|교동|봉산|신기|무선|소호|중앙|공화|엑스포광장|엑스포|덕충|서교|고소|종화|신월|오림|광무|안산|선원|화장|율촌|여천)';
  const branchSuffix = new RegExp(`\\s*${branchWords}(?:동)?(?:본점|점)?\\s*$`, 'i');

  function brandKey(store) {
    const name = String(store?.realBusinessName || store?.name || '').trim();
    for (const [pattern, key] of franchisePatterns) if (pattern.test(name)) return key;
    return name
      .replace(/\s*[（(][^)）]*(?:동|점)[^)）]*[)）]\s*$/u, '')
      .replace(branchSuffix, '')
      .replace(/\s+(?:본점|직영점|지점)\s*$/u, '')
      .replace(/\s+/g, '') || String(store?.id || name);
  }

  function diversify(sorted, limit = 40) {
    const first = [];
    const rest = [];
    const seen = new Set();
    for (const store of sorted) {
      const key = brandKey(store);
      if (!seen.has(key)) {
        seen.add(key);
        first.push(store);
      } else {
        rest.push(store);
      }
    }
    return [...first, ...rest].slice(0, limit);
  }

  const originalRecommend = recommend;
  recommend = function diversifiedRecommend() {
    const filtered = stores.filter(store => state.category === '전체' || store.cat === state.category);
    const sorted = stableSort(filtered);
    return diversify(sorted, 40);
  };

  window.DaedongRecommendation = {brandKey, diversify, originalRecommend};
})();
