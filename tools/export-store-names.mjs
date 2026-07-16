import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';

const sourcePath = process.env.STORES_PATH || 'data/stores.json';
const outputPath = process.env.STORE_NAMES_PATH || 'data/store-names.json';
const compressedPath = process.env.STORE_NAMES_GZIP_PATH || 'data/store-names.base64.txt';
const stores = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
const compact = stores.map(store => ({
  id: store.id || '',
  name: store.name || store.realBusinessName || '',
  realBusinessName: store.realBusinessName || '',
  shopInShopNames: store.shopInShopNames || [],
  district: store.district || '',
  category: store.category || ''
}));
const json = JSON.stringify(compact);
await fs.writeFile(outputPath, `${JSON.stringify(compact, null, 2)}\n`, 'utf8');
await fs.writeFile(compressedPath, gzipSync(Buffer.from(json)).toString('base64'), 'utf8');
console.log(`가게명 목록 ${compact.length}개 저장: ${outputPath}, ${compressedPath}`);
