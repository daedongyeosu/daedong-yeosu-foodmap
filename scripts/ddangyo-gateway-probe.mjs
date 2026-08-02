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

const outputDir = path.resolve('ddangyo-probe-output');
await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const mobileUserAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';

function requestPath(requestPath, { cookie = '', referer = '' } = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'user-agent': mobileUserAgent,
      'accept': '*/*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
      'cache-control': 'no-cache',
      'pragma': 'no-cache'
    };
    if (cookie) headers.cookie = cookie;
    if (referer) headers.referer = referer;

    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      method: 'GET',
      path: requestPath,
      headers,
      timeout: 30000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        requestPath,
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: response.headers,
        body: Buffer.concat(chunks)
      }));
    });
    req.on('timeout', () => req.destroy(new Error(`request timeout: ${requestPath}`)));
    req.on('error', reject);
    req.end();
  });
}

function cookieHeader(setCookie = []) {
  return setCookie.map(value => String(value).split(';', 1)[0]).join('; ');
}

function safeStem(value) {
  return String(value)
    .replace(/^\/+/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .slice(0, 180) || 'root';
}

function extractCandidates(text) {
  const patterns = [
    /https?:\\?\/\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/g,
    /(?:intent|ddangyo|shinhancard|market):[^\s"'<>]+/gi,
    /location(?:\.href|\.replace)?\s*(?:=|\()\s*["']([^"']+)/gi,
    /(?:store|shop|merchant|branch|biz|mall|short|gateway)[A-Za-z_-]*(?:Id|No|Code|Url)?["']?\s*[:=]\s*["']?([A-Za-z0-9_./?=&%-]+)/gi,
    /["'](\/[A-Za-z0-9_./-]+\.(?:xml|js|json|wq)(?:\?[^"']*)?)["']/gi,
    /["'](\/[A-Za-z0-9_./-]+\.(?:do|action|ajax|api)(?:\?[^"']*)?)["']/gi
  ];
  const found = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.push(match[1] || match[0]);
  }
  return [...new Set(found)].slice(0, 2000);
}

async function saveResponse(stem, result) {
  const bodyFile = path.join(outputDir, `${stem}.body`);
  const text = result.body.toString('utf8');
  await fs.writeFile(bodyFile, result.body);
  const metadata = {
    requestPath: result.requestPath,
    statusCode: result.statusCode,
    statusMessage: result.statusMessage,
    headers: result.headers,
    byteLength: result.body.length,
    candidates: extractCandidates(text),
    textPreview: text.slice(0, 50000)
  };
  await fs.writeFile(path.join(outputDir, `${stem}.json`), JSON.stringify(metadata, null, 2));
  return metadata;
}

const summary = [];
let sessionCookie = '';
for (const [index, target] of targets.entries()) {
  const requestPathValue = `/gateway1.html?${target.token}`;
  try {
    const result = await requestPath(requestPathValue);
    if (index === 0) sessionCookie = cookieHeader(result.headers['set-cookie'] || []);
    const metadata = await saveResponse(`${target.token}-gateway`, result);
    summary.push({
      token: target.token,
      suppliedName: target.name,
      statusCode: result.statusCode,
      byteLength: result.body.length,
      location: result.headers.location || '',
      candidateCount: metadata.candidates.length
    });
  } catch (error) {
    const failure = { token: target.token, suppliedName: target.name, error: String(error?.stack || error) };
    await fs.writeFile(path.join(outputDir, `${target.token}-gateway.json`), JSON.stringify(failure, null, 2));
    summary.push(failure);
  }
}

const firstReferer = `https://fdofd.ddangyo.com/gateway1.html?${targets[0].token}`;
const staticPaths = [
  '/cm/xml/gateway.xml',
  '/websquare/javascript.wq?q=/bootloader',
  '/cm/js/otcComm.js',
  '/cm/js/otcCommon.js'
];

for (const resourcePath of staticPaths) {
  try {
    const result = await requestPath(resourcePath, { cookie: sessionCookie, referer: firstReferer });
    const stem = `resource-${safeStem(resourcePath)}`;
    const metadata = await saveResponse(stem, result);
    summary.push({
      resourcePath,
      statusCode: result.statusCode,
      byteLength: result.body.length,
      candidateCount: metadata.candidates.length
    });
  } catch (error) {
    summary.push({ resourcePath, error: String(error?.stack || error) });
  }
}

await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
