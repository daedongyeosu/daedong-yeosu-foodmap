'use strict';

(() => {
  const DATA_URL = 'data/order-app-fingerprint-runtime.json?v=20260802-1';
  const ALLOWED_PHONE_SOURCES = new Set(['ddangyo', 'mukkebi', 'naver']);
  const APPLY_TIMEOUT_MS = 20000;
  const POLL_INTERVAL_MS = 80;

  function compact(value) {
    return String(value ?? '')
      .trim()
      .toLocaleLowerCase('ko-KR')
      .replace(/[\s·&()\-_/.,]/g, '');
  }

  function compactAddress(value) {
    return compact(value)
      .replace(/^전라남도/, '전남')
      .replace(/^전남광주통합특별시/, '전남')
      .replace(/(?:대한민국)/g, '')
      .replace(/(?:지하|지상)?\d+층.*$/g, match => match);
  }

  function validHttpUrl(value) {
    const raw = String(value || '').trim();
    if (!/^https?:\/\//i.test(raw)) return '';
    try {
      const parsed = new URL(raw, location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function validPhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return /^0\d{8,10}$/.test(digits) ? digits : '';
  }

  function unique(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))];
  }

  function currentStores() {
    if (typeof allStores === 'undefined' || !Array.isArray(allStores)) return [];
    return allStores;
  }

  function exactNameMatches(record, list) {
    const names = new Set(unique(record?.match?.names).map(compact));
    if (!names.size) return [];
    return list.filter(store => names.has(compact(store?.name)) || names.has(compact(store?.realBusinessName)));
  }

  function exactAddressMatches(record, list) {
    const target = compactAddress(record?.match?.address);
    if (!target) return [];
    return list.filter(store => compactAddress(store?.address) === target);
  }

  function findExistingStore(record, list) {
    const requestedId = String(record?.match?.storeId || '').trim();
    if (requestedId) {
      const byId = list.find(store => String(store?.id || store?.store_id) === requestedId);
      if (byId) return {store: byId, method: 'store-id'};
    }

    const byAddress = exactAddressMatches(record, list);
    if (byAddress.length === 1) return {store: byAddress[0], method: 'exact-address'};
    if (byAddress.length > 1) return {store: null, method: 'ambiguous-address'};

    const byName = exactNameMatches(record, list);
    if (record?.match?.addressVerified === true && byName.length === 1) {
      return {store: byName[0], method: 'unique-name-with-verified-address-evidence'};
    }
    if (byName.length > 1) return {store: null, method: 'ambiguous-name'};
    return {store: null, method: 'not-found'};
  }

  function refreshSearchFields(store, additions) {
    store.searchAliases = unique([...(store.searchAliases || []), ...(additions.searchAliases || [])]);
    store.tags = unique([...(store.tags || []), additions.address, additions.district, additions.category]);
    const parts = [
      store.name,
      store.realBusinessName,
      store.brandName,
      store.branchName,
      store.area,
      store.cat,
      ...(store.categories || []),
      ...store.searchAliases,
      ...(store.shopInShopNames || []),
      ...store.tags
    ];
    store.searchIndex = typeof normalize === 'function' ? normalize(parts.filter(Boolean).join(' ')) : compact(parts.filter(Boolean).join(' '));
  }

  function addMissingDdangyoRoute(store, links, report) {
    const urls = unique(links).map(validHttpUrl).filter(Boolean);
    if (!urls.length) return;
    const routes = Array.isArray(store.routes) ? store.routes : (store.routes = []);
    const existing = routes.find(route => route?.key === 'ddangyo' || compact(route?.name).includes('땡겨요'));
    if (existing) {
      report.preservedExistingDdangyo += 1;
      return;
    }
    routes.push({name: '땡겨요', key: 'ddangyo', url: urls[0], enabled: true, source: 'order-app-fingerprint'});
    report.addedDdangyo += 1;
  }

  function addMissingPhone(store, additions, report) {
    const source = String(additions.phoneSource || '').trim().toLowerCase();
    const phone = validPhone(additions.phone);
    if (!phone || !ALLOWED_PHONE_SOURCES.has(source)) return;
    if (!store.phone) {
      store.phone = phone;
      store.phoneSource = source;
      report.addedPhones += 1;
    } else {
      report.preservedExistingPhones += 1;
    }
    const routes = Array.isArray(store.routes) ? store.routes : (store.routes = []);
    const existingPhoneRoute = routes.find(route => route?.key === 'phone' || compact(route?.name).includes('전화'));
    if (!existingPhoneRoute) {
      routes.push({name: '전화주문', key: 'phone', url: `tel:${phone}`, enabled: true, source});
      report.addedPhoneRoutes += 1;
    }
  }

  function applyToExistingStore(store, record, report) {
    const additions = record.additions || {};
    if (!store.address && additions.address && record?.match?.addressVerified === true) {
      store.address = additions.address;
      if (typeof neighborhoodsFor === 'function') {
        const found = neighborhoodsFor(additions.address);
        if (found.length) {
          store.neighborhoods = found;
          store.locationSource = 'verified-address';
          store.neighborhoodConfidence = 'verified';
        }
      }
      report.addedAddresses += 1;
    } else if (store.address) {
      report.preservedExistingAddresses += 1;
    }

    if ((!store.area || store.area === '여수시 전체') && additions.district) store.area = additions.district;
    if ((!store.cat || store.cat === '기타') && additions.category) store.cat = additions.category;
    if ((!Array.isArray(store.categories) || !store.categories.length) && additions.category) store.categories = [additions.category];

    const naverMap = validHttpUrl(additions.naverMap);
    if ((!store.naverMap || store.naverMap === '#') && additions.naverStatus === 'verified' && naverMap) {
      store.naverMap = naverMap;
      store.fingerprintNaverStatus = 'verified';
      report.addedNaverMaps += 1;
    } else if (store.naverMap && store.naverMap !== '#') {
      report.preservedExistingNaverMaps += 1;
    }

    addMissingPhone(store, additions, report);
    addMissingDdangyoRoute(store, additions.ddangyoLinks, report);
    refreshSearchFields(store, additions);
    store.fingerprintRecordIds = unique([...(store.fingerprintRecordIds || []), record.recordId]);
  }

  function createNewStore(record, report) {
    if (record?.match?.createIfMissing !== true || typeof normalizedStore !== 'function') return null;
    const additions = record.additions || {};
    const phoneSource = String(additions.phoneSource || '').trim().toLowerCase();
    const phone = ALLOWED_PHONE_SOURCES.has(phoneSource) ? validPhone(additions.phone) : '';
    const ddangyo = unique(additions.ddangyoLinks).map(validHttpUrl).filter(Boolean)[0] || '';
    const naverMap = additions.naverStatus === 'verified' ? validHttpUrl(additions.naverMap) : '';
    const id = String(record?.match?.newStoreId || `fingerprint-${compact(record.recordId)}`).slice(0, 80);
    const name = unique(record?.match?.names)[0] || '이름 확인 중인 가게';
    const raw = {
      store_id: id,
      id,
      name,
      realBusinessName: name,
      district: additions.district || '',
      category: additions.category || '기타',
      categories: additions.category ? [additions.category] : ['기타'],
      address: record?.match?.addressVerified === true ? additions.address || record?.match?.address || '' : '',
      phone,
      naverMap,
      searchAliases: unique(additions.searchAliases),
      routes: [
        ...(ddangyo ? [{name: '땡겨요', url: ddangyo, enabled: true}] : []),
        ...(phone ? [{name: '전화주문', url: `tel:${phone}`, enabled: true}] : [])
      ],
      source: {type: 'order-app-fingerprint', batchId: 'ddangyo-fingerprint-batch-01'},
      customerVisible: true
    };
    const store = normalizedStore(raw, currentStores().length);
    store.fingerprintRecordIds = [record.recordId];
    allStores.push(store);
    if (typeof canonicalStores !== 'undefined' && Array.isArray(canonicalStores)) canonicalStores.push(store);
    if (typeof searchableStores !== 'undefined' && Array.isArray(searchableStores)) searchableStores.push(store);
    if (typeof stores !== 'undefined' && Array.isArray(stores)) stores.push(store);
    report.createdStores += 1;
    return store;
  }

  function refreshUi() {
    if (typeof categories !== 'undefined' && Array.isArray(categories) && typeof storeCategories === 'function' && typeof stores !== 'undefined') {
      const next = [...new Set(stores.flatMap(storeCategories))];
      categories.splice(0, categories.length, ...next.sort((a, b) => a.localeCompare(b, 'ko')));
    }
    if (typeof fxBuildIndexes === 'function') fxBuildIndexes();
    if (typeof renderCategories === 'function') renderCategories();
    if (typeof renderStores === 'function') renderStores();
  }

  async function fetchData() {
    const response = await fetch(DATA_URL, {cache: 'no-store'});
    if (!response.ok) throw new Error(`fingerprint data ${response.status}`);
    return response.json();
  }

  function waitForInitialStores() {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (currentStores().length) {
          resolve(currentStores());
          return;
        }
        if (Date.now() - started >= APPLY_TIMEOUT_MS) {
          reject(new Error('store initialization timeout'));
          return;
        }
        setTimeout(check, POLL_INTERVAL_MS);
      };
      check();
    });
  }

  async function applyFingerprintData() {
    const [data, list] = await Promise.all([fetchData(), waitForInitialStores()]);
    const report = {
      batchId: data.batchId || '',
      records: Array.isArray(data.stores) ? data.stores.length : 0,
      matched: 0,
      unmatched: [],
      createdStores: 0,
      addedAddresses: 0,
      preservedExistingAddresses: 0,
      addedNaverMaps: 0,
      preservedExistingNaverMaps: 0,
      addedPhones: 0,
      preservedExistingPhones: 0,
      addedPhoneRoutes: 0,
      addedDdangyo: 0,
      preservedExistingDdangyo: 0
    };

    for (const record of data.stores || []) {
      const match = findExistingStore(record, list);
      if (match.store) {
        applyToExistingStore(match.store, record, report);
        report.matched += 1;
        continue;
      }
      const created = createNewStore(record, report);
      if (!created) report.unmatched.push({recordId: record.recordId, reason: match.method});
    }

    refreshUi();
    window.daedongFingerprintReport = Object.freeze(report);
    window.dispatchEvent(new CustomEvent('daedong:fingerprint-applied', {detail: report}));
  }

  applyFingerprintData().catch(error => {
    console.error('order-app-fingerprint-runtime failed', error);
    window.daedongFingerprintReport = Object.freeze({error: String(error?.message || error)});
  });
})();
