import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const targets = [
  { token: '8rrtFnv', name: '쌀통닭 무선점' },
  { token: 'oZrHJMN', name: '기영이숯불두마리치킨 여수여천점' },
  { token: 'LZJOYiQ', name: '아주커치킨 둔덕점' },
  { token: 'h3rPiwO', name: '치킨아이 학동점' },
  { token: '7qEHjBv', name: '큰손닭강정 여수본점' }
];

const out = path.resolve('ddangyo-shorturl-output');
await fs.rm(out, {recursive: true, force: true});
await fs.mkdir(out, {recursive: true});
const agent = new https.Agent({keepAlive: true});
const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';

function request({method, requestPath, headers = {}, body = ''}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      method,
      path: requestPath,
      agent,
      headers: {
        'user-agent': userAgent,
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        ...headers
      },
      timeout: 30000
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
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

function parseOrigin(text) {
  try {
    const value = JSON.parse(text);
    return value?.dma_short_url_info?.origin_url || value?.origin_url || '';
  } catch {
    return '';
  }
}

const summary = [];
for (const target of targets) {
  const row = {token: target.token, suppliedName: target.name, attempts: []};
  try {
    const referer = `https://fdofd.ddangyo.com/gateway1.html?${target.token}`;
    const landing = await request({
      method: 'GET',
      requestPath: `/gateway1.html?${target.token}`,
      headers: {'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}
    });
    const cookie = cookies(landing.headers['set-cookie'] || []);
    row.landing = {status: landing.status, bytes: Buffer.byteLength(landing.body), cookieNames: cookie.split('; ').filter(Boolean).map(v => v.split('=')[0])};

    const payloads = [
      {label: 'wrapped-map', value: {dma_request: {short_url: target.token}}},
      {label: 'plain-map', value: {short_url: target.token}}
    ];
    for (const payload of payloads) {
      const body = JSON.stringify(payload.value);
      const response = await request({
        method: 'POST',
        requestPath: '/shorturl/view',
        body,
        headers: {
          'accept': 'application/json, text/plain, */*',
          'content-type': 'application/json;charset=UTF-8',
          'content-length': Buffer.byteLength(body),
          'origin': 'https://fdofd.ddangyo.com',
          'referer': referer,
          'cookie': cookie,
          'authorization': '',
          'uuid-token': 'GTY0000000',
          'app-token': 'GTY0000000',
          'app-name': 'O2O',
          'app-os': 'WEB',
          'x-requested-with': 'XMLHttpRequest'
        }
      });
      const attempt = {
        label: payload.label,
        requestBody: payload.value,
        status: response.status,
        headers: response.headers,
        responseBody: response.body,
        originUrl: parseOrigin(response.body)
      };
      row.attempts.push(attempt);
      if (attempt.originUrl) {
        row.originUrl = attempt.originUrl;
        break;
      }
    }
  } catch (error) {
    row.error = String(error?.stack || error);
  }
  summary.push(row);
  await fs.writeFile(path.join(out, `${target.token}.json`), JSON.stringify(row, null, 2));
}

await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary.map(row => ({token: row.token, landing: row.landing, originUrl: row.originUrl || '', attempts: row.attempts.map(a => ({label: a.label, status: a.status, originUrl: a.originUrl, preview: a.responseBody.slice(0, 300)})), error: row.error || ''})), null, 2));
