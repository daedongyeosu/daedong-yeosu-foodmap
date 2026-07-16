import fs from 'node:fs/promises';

const sourcePath = process.env.STORES_PATH || 'data/stores.json';
const outputPath = process.env.STORE_NAMES_PATH || 'data/store-names.json';
const stores = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const compact = stores.map(store => ({
  id: store.id || '',
  name: store.name || store.realBusinessName || '',
  realBusinessName: store.realBusinessName || '',
  shopInShopNames: store.shopInShopNames || [],
  district: store.district || '',
  category: store.category || ''
}));
await fs.writeFile(outputPath, `${JSON.stringify(compact, null, 2)}\n`, 'utf8');
console.log(`가게명 목록 ${compact.length}개 저장: ${outputPath}`);
