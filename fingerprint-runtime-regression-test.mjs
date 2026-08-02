import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('./data/order-app-fingerprint-runtime.json', import.meta.url), 'utf8'));
const runtime = fs.readFileSync(new URL('./order-app-fingerprint-runtime.js', import.meta.url), 'utf8');

if (data.schemaVersion !== 1) throw new Error('unexpected schema version');
if (!Array.isArray(data.stores) || data.stores.length !== 5) throw new Error('batch 01 must contain exactly five records');
if (data.policies.identityPrimaryKey !== 'exact-address') throw new Error('address identity policy missing');
if (data.policies.preserveExistingValues !== true) throw new Error('add-only policy missing');

const allowedPhoneSources = new Set(['', 'ddangyo', 'mukkebi', 'naver']);
const prohibitedHosts = ['yogiyo', 'coupang', 'baemin'];
const recordIds = new Set();

for (const record of data.stores) {
  if (!record.recordId || recordIds.has(record.recordId)) throw new Error(`duplicate or missing recordId: ${record.recordId}`);
  recordIds.add(record.recordId);
  if (record.match?.addressVerified !== true || !record.match?.address) throw new Error(`verified address missing: ${record.recordId}`);
  if (!Array.isArray(record.match?.names) || !record.match.names.length) throw new Error(`match names missing: ${record.recordId}`);
  const source = String(record.additions?.phoneSource || '').toLowerCase();
  if (!allowedPhoneSources.has(source)) throw new Error(`invalid phone source: ${record.recordId}`);
  if (record.additions?.phone && !source) throw new Error(`phone without approved source: ${record.recordId}`);
  if (record.additions?.naverMap && record.additions?.naverStatus !== 'verified') throw new Error(`unverified Naver map: ${record.recordId}`);
  for (const link of record.additions?.ddangyoLinks || []) {
    if (!/^https:\/\/fdofd\.ddangyo\.com\/gateway1\.html\?[A-Za-z0-9]+$/.test(link)) throw new Error(`invalid Ddangyo link: ${link}`);
  }
  const serialized = JSON.stringify(record).toLowerCase();
  if (record.additions?.phone && prohibitedHosts.some(host => serialized.includes(host))) throw new Error(`prohibited phone source present: ${record.recordId}`);
}

for (const required of [
  "new Set(['ddangyo', 'mukkebi', 'naver'])",
  "if (!store.address",
  "if ((!store.naverMap",
  "if (existing)",
  "createIfMissing !== true"
]) {
  if (!runtime.includes(required)) throw new Error(`runtime safety guard missing: ${required}`);
}

console.log(JSON.stringify({
  ok: true,
  batchId: data.batchId,
  records: data.stores.length,
  phoneSources: data.policies.phoneSourcePriority,
  mode: 'add-only'
}, null, 2));
