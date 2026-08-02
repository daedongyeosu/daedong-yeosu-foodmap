import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import {URLSearchParams} from 'node:url';

const tokens = `8rrtFnv oZrHJMN LZJOYiQ h3rPiwO 7qEHjBv agaDVy9 n8fubo6 W3C2xOs KXMaAWm s64ZuPD 5v5g0Sx 40ACKvK AkdMHga J1z92gs LGe0H32 Why0WW1 s3saAXs XTVAJ3q gOaJqWQ 1grBeHv 5z5oUHy C5v1Sz5 CRqRegz Dg0bqrG n8F0Vm2 d4AymKz TQXhH05 bMUAAyS 2uVT3uw m6K22Qq VQ4zuwg eRKUQXj C7u3wNg 1iMTpT9 MFgCs9y DLnSWu2 chdPUvz ktXdR4d LShgUuJ KVGcLcX kUUZmfn Z9BzWOD OH8fFct neqPkqv Sb9qXy6 h3e2OiA RjTqfSx 3ymeMR3 oOKK91R czycr95 BC2YUSz 6Dy6MpV zyC7mcw nf2nuG5 bD5tpYT CJ7Lfgw JmfKHwo 00RUe3y i0fxfXs szNA6iZ fNFjCFg fG2C2oa x9nuAxX O103ro4 vYrFYv3 wOxD8Lf DoRPe5P 6G9uvGV CbMsswm CvS9WdS uQ3cazC P8J3tN8 bGje9zQ QktNckc 9RD9885 BQEZsix be2Z2Z8 7Mram6G cheVei2 n5AXW9n 24Ffc62`.trim().split(/\s+/);

const out = path.resolve('ddangyo-shorturl-output');
await fs.rm(out, {recursive: true, force: true});
await fs.mkdir(out, {recursive: true});
const agent = new https.Agent({keepAlive: true, maxSockets: 4});
const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';

function request({method, requestPath, headers = {}, body = ''}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'fdofd.ddangyo.com', port: 443, method, path: requestPath, agent,
      headers: {'user-agent': userAgent, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5', ...headers},
      timeout: 30000
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function cookies(setCookie = []) {
  return setCookie.map(value => String(value).split(';', 1)[0]).join('; ');
}

function parseResult(text) {
  const value = JSON.parse(text);
  const info = value?.result?.dma_short_url_info || value?.dma_short_url_info || value?.result || {};
  const originUrl = String(info?.origin_url || '');
  const params = new URLSearchParams(originUrl);
  return {
    resultCode: value?.result_code || '', messageCode: value?.message_code || '', message: value?.message || '',
    originUrl,
    menuUrl: params.get('menuUrl') || '',
    patstoNo: params.get('patsto_no') || '',
    patstoName: params.get('patsto_nm') || '',
    serviceType: params.get('service_type') || ''
  };
}

async function resolveToken(token) {
  const referer = `https://fdofd.ddangyo.com/gateway1.html?${token}`;
  const landing = await request({method: 'GET', requestPath: `/gateway1.html?${token}`, headers: {accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
  const cookie = cookies(landing.headers['set-cookie'] || []);
  const payload = {dma_request: {short_url: token}};
  const body = JSON.stringify(payload);
  const response = await request({
    method: 'POST', requestPath: '/shorturl/view', body,
    headers: {
      accept: 'application/json, text/plain, */*', 'content-type': 'application/json;charset=UTF-8', 'content-length': Buffer.byteLength(body),
      origin: 'https://fdofd.ddangyo.com', referer, cookie, authorization: '',
      'uuid-token': 'GTY0000000', 'app-token': 'GTY0000000', 'app-name': 'O2O', 'app-os': 'WEB', 'x-requested-with': 'XMLHttpRequest'
    }
  });
  let parsed = {};
  try { parsed = parseResult(response.body); } catch (error) { parsed = {parseError: String(error)}; }
  return {
    token, sourceUrl: referer,
    landingStatus: landing.status, apiStatus: response.status,
    ...parsed,
    rawResponse: response.body
  };
}

const results = [];
for (let index = 0; index < tokens.length; index += 1) {
  const token = tokens[index];
  try {
    const row = await resolveToken(token);
    results.push(row);
    console.log(`${index + 1}/${tokens.length} ${token} -> ${row.patstoNo || 'NO_STORE'} ${row.patstoName || row.message || ''}`);
  } catch (error) {
    results.push({token, sourceUrl: `https://fdofd.ddangyo.com/gateway1.html?${token}`, error: String(error?.stack || error)});
    console.error(`${index + 1}/${tokens.length} ${token} failed`, error);
  }
  await new Promise(resolve => setTimeout(resolve, 120));
}

const byStore = {};
for (const row of results) {
  const key = row.patstoNo || `unresolved:${row.token}`;
  (byStore[key] ||= {patstoNo: row.patstoNo || '', patstoName: row.patstoName || '', menuUrl: row.menuUrl || '', tokens: [], sourceUrls: []});
  byStore[key].tokens.push(row.token);
  byStore[key].sourceUrls.push(row.sourceUrl);
}
const compact = {
  generatedAt: new Date().toISOString(),
  tokenCount: tokens.length,
  resolvedCount: results.filter(row => row.patstoNo).length,
  uniqueStoreCount: Object.values(byStore).filter(row => row.patstoNo).length,
  stores: Object.values(byStore),
  results
};
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(compact, null, 2));
await fs.writeFile(path.join(out, 'stores-only.json'), JSON.stringify(compact.stores, null, 2));
console.log(JSON.stringify({tokenCount: compact.tokenCount, resolvedCount: compact.resolvedCount, uniqueStoreCount: compact.uniqueStoreCount}, null, 2));
