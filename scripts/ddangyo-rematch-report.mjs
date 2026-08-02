import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('ddangyo-shop-data-output');
const normalizedPath = path.join(outputDir, 'normalized-all.json');
const reportPath = path.join(outputDir, 'match-report.json');

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function cleanAddress(value) {
  return String(value || '')
    .replace(/전남광주통합특별시/g, '전남')
    .replace(/전라남도/g, '전남')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameKey(value) {
  return cleanName(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/[\s·&()\-_/.,]/g, '');
}

function looseNameKey(value) {
  return nameKey(
    cleanName(value)
      .replace(/\([^)]*\)/g, ' ')
      .replace(/피나치공/gi, '피자나라치킨공주')
      .replace(/샵인샵|샵인점/gi, '')
      .replace(/여수/g, '')
  );
}

function addressBase(value) {
  return cleanAddress(value)
    .replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '')
    .replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '')
    .trim();
}

function addressKey(value) {
  return addressBase(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/^(전남|전라남도)/, '')
    .replace(/[\s·,]/g, '');
}

function storeId(row) {
  return String(row?.id || row?.store_id || row?.storeId || '');
}

function storeName(row) {
  return cleanName(row?.name || row?.store_name || row?.storeName || row?.realBusinessName || '');
}

function storeAddress(row) {
  return cleanAddress(row?.address || row?.roadAddress || row?.road_address || row?.matchedAddress || '');
}

function compatibleName(left, right) {
  const a = nameKey(left);
  const b = nameKey(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function compatibleLooseName(left, right) {
  const a = looseNameKey(left);
  const b = looseNameKey(right);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const storesValue = JSON.parse(await fs.readFile('data/stores.json', 'utf8'));
const currentStores = Array.isArray(storesValue)
  ? storesValue
  : (storesValue.stores || storesValue.data || []);

const coordinatesValue = JSON.parse(await fs.readFile('data/store-coordinates.json', 'utf8'));
const coordinatesById = new Map();
if (Array.isArray(coordinatesValue)) {
  for (const row of coordinatesValue) coordinatesById.set(storeId(row), row);
} else if (Array.isArray(coordinatesValue.stores || coordinatesValue.data)) {
  for (const row of (coordinatesValue.stores || coordinatesValue.data)) coordinatesById.set(storeId(row), row);
} else {
  for (const [id, row] of Object.entries(coordinatesValue)) coordinatesById.set(String(id), row);
}

const indexedStores = currentStores.map(row => {
  const id = storeId(row);
  const coordinate = coordinatesById.get(id) || {};
  const verifiedCoordinateAddress = coordinate.status === 'verified'
    ? cleanAddress(coordinate.matchedAddress || '')
    : '';
  return {
    raw: row,
    id,
    name: storeName(row),
    address: storeAddress(row) || verifiedCoordinateAddress,
    coordinateStatus: coordinate.status || '',
    coordinateInput: cleanAddress(coordinate.inputAddress || ''),
    coordinateMatched: verifiedCoordinateAddress
  };
});

function summarizeCandidate(row) {
  return {
    storeId: row.id,
    storeName: row.name,
    address: row.address,
    coordinateStatus: row.coordinateStatus
  };
}

function matchStore(shop) {
  const targetAddress = addressKey(shop.address);
  const targetName = nameKey(shop.name);
  const targetLooseName = looseNameKey(shop.name);
  const byAddress = targetAddress
    ? indexedStores.filter(row => addressKey(row.address) === targetAddress)
    : [];

  if (byAddress.length === 1) {
    return {
      status: 'existing',
      method: 'exact-base-address',
      ...summarizeCandidate(byAddress[0])
    };
  }

  if (byAddress.length > 1) {
    const compatible = byAddress.filter(row => compatibleName(row.name, shop.name));
    if (compatible.length === 1) {
      return {
        status: 'existing',
        method: 'shared-address-and-compatible-name',
        ...summarizeCandidate(compatible[0])
      };
    }
    const looseCompatible = byAddress.filter(row => compatibleLooseName(row.name, shop.name));
    if (looseCompatible.length === 1) {
      return {
        status: 'existing',
        method: 'shared-address-and-normalized-name',
        ...summarizeCandidate(looseCompatible[0])
      };
    }
    return {
      status: 'review',
      method: 'shared-address-shop-in-shop-review',
      candidates: byAddress.map(summarizeCandidate)
    };
  }

  const exactName = indexedStores.filter(row => nameKey(row.name) === targetName);
  if (exactName.length === 1) {
    const candidate = exactName[0];
    if (!candidate.address) {
      return {
        status: 'existing',
        method: 'unique-exact-name-current-address-missing',
        ...summarizeCandidate(candidate)
      };
    }
    return {
      status: 'review',
      method: 'unique-exact-name-address-different',
      ...summarizeCandidate(candidate),
      ddangyoAddress: cleanAddress(shop.address)
    };
  }

  const normalizedName = indexedStores.filter(row => looseNameKey(row.name) === targetLooseName);
  if (normalizedName.length === 1) {
    const candidate = normalizedName[0];
    if (!candidate.address) {
      return {
        status: 'existing',
        method: 'unique-normalized-name-current-address-missing',
        ...summarizeCandidate(candidate)
      };
    }
    return {
      status: 'review',
      method: 'unique-normalized-name-address-unconfirmed',
      ...summarizeCandidate(candidate),
      ddangyoAddress: cleanAddress(shop.address)
    };
  }

  const compatible = indexedStores.filter(row => compatibleName(row.name, shop.name));
  if (compatible.length === 1) {
    return {
      status: 'review',
      method: 'unique-compatible-name-address-unconfirmed',
      ...summarizeCandidate(compatible[0]),
      ddangyoAddress: cleanAddress(shop.address)
    };
  }

  const looseCompatible = indexedStores.filter(row => compatibleLooseName(row.name, shop.name));
  if (looseCompatible.length === 1) {
    return {
      status: 'review',
      method: 'unique-loose-compatible-name-address-unconfirmed',
      ...summarizeCandidate(looseCompatible[0]),
      ddangyoAddress: cleanAddress(shop.address)
    };
  }

  return {
    status: 'new',
    method: 'no-address-or-unique-name-match'
  };
}

const extracted = JSON.parse(await fs.readFile(normalizedPath, 'utf8'));
for (const row of extracted) {
  if (!row.error) row.match = matchStore(row);
}

const matchSummary = {
  existing: extracted.filter(row => row.match?.status === 'existing').length,
  review: extracted.filter(row => row.match?.status === 'review').length,
  new: extracted.filter(row => row.match?.status === 'new').length,
  failed: extracted.filter(row => row.error).length
};

const report = {
  generatedAt: new Date().toISOString(),
  batchId: 'ddangyo-chicken-batch-01',
  tokenCount: 81,
  resolvedTokenCount: 81,
  uniqueStoreCount: extracted.length,
  extractedStoreCount: extracted.filter(row => !row.error).length,
  totalMenus: extracted.reduce((sum, row) => sum + (row.items?.length || 0), 0),
  totalMenuImages: extracted.reduce((sum, row) => sum + (row.sourceStats?.menuImages || 0), 0),
  currentStoreCount: indexedStores.length,
  coordinateAddressCount: indexedStores.filter(row => row.address).length,
  matchSummary,
  stores: extracted.map(row => row.error
    ? {patstoNo: row.patstoNo, name: row.patstoName, error: row.error}
    : {
        patstoNo: row.patstoNo,
        name: row.name,
        address: row.address,
        menus: row.sourceStats.menus,
        menuImages: row.sourceStats.menuImages,
        shopImages: row.sourceStats.shopImages,
        match: row.match,
        sourceUrls: row.sourceUrls
      })
};

await fs.writeFile(normalizedPath, JSON.stringify(extracted, null, 2));
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
await fs.writeFile(
  path.join(outputDir, 'review-only.json'),
  JSON.stringify(report.stores.filter(row => row.match?.status === 'review'), null, 2)
);
await fs.writeFile(
  path.join(outputDir, 'new-only.json'),
  JSON.stringify(report.stores.filter(row => row.match?.status === 'new'), null, 2)
);

console.log(JSON.stringify({
  currentStoreCount: report.currentStoreCount,
  coordinateAddressCount: report.coordinateAddressCount,
  uniqueStoreCount: report.uniqueStoreCount,
  extractedStoreCount: report.extractedStoreCount,
  totalMenus: report.totalMenus,
  totalMenuImages: report.totalMenuImages,
  matchSummary: report.matchSummary
}, null, 2));
