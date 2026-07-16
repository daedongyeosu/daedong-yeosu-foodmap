import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';

const sourcePath = process.env.STORES_PATH || 'data/stores.json';
const outputPath = process.env.STORE_NAMES_PATH || 'data/store-names.json';
const compressedPath = process.env.STORE_NAMES_GZIP_PATH || 'data/store-names.base64.txt';
const chunkDir = process.env.STORE_NAMES_CHUNK_DIR || 'data/store-name-chunks';
const chunkSize = Number(process.env.STORE_NAMES_CHUNK_SIZE || 3000);
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
const base64 = gzipSync(Buffer.from(json)).toString('base64');
await fs.writeFile(outputPath, `${JSON.stringify(compact, null, 2)}\n`, 'utf8');
await fs.writeFile(compressedPath, base64, 'utf8');
await fs.rm(chunkDir, {recursive: true, force: true});
await fs.mkdir(chunkDir, {recursive: true});
const chunks = [];
for (let offset = 0; offset < base64.length; offset += chunkSize) {
  chunks.push(base64.slice(offset, offset + chunkSize));
}
await Promise.all(chunks.map((chunk, index) => fs.writeFile(path.join(chunkDir, `chunk-${String(index + 1).padStart(3, '0')}.txt`), chunk, 'utf8')));
await fs.writeFile(path.join(chunkDir, 'index.json'), `${JSON.stringify({chunkCount: chunks.length, chunkSize, totalLength: base64.length})}\n`, 'utf8');
console.log(`가게명 목록 ${compact.length}개 저장, 압축 ${base64.length}자, 청크 ${chunks.length}개`);
