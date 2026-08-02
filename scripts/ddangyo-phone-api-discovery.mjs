import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const outputDir = path.resolve('ddangyo-phone-discovery-output');
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});

const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';
const agent = new https.Agent({keepAlive: true});

function request(requestPath, {cookie = '', referer = ''} = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      path: requestPath,
      method: 'GET',
      agent,
      headers: {
        'user-agent': userAgent,
        'accept': 'application/xml,text/xml,text/html,application/xhtml+xml,*/*',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        ...(cookie ? {cookie} : {}),
        ...(referer ? {referer} : {})
      },
      timeout: 30000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${requestPath}`)));
    req.on('error', reject);
    req.end();
  });
}

function cookieHeader(setCookie = []) {
  return setCookie.map(value => String(value).split(';', 1)[0]).join('; ');
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)=(['"])(.*?)\2/gs)) {
    result[match[1]] = decodeEntities(match[3]);
  }
  return result;
}

function submissions(xml) {
  return [...xml.matchAll(/<xf:submission\b[^>]*>/g)].map(match => {
    const attr = attributes(match[0]);
    return {
      id: attr.id || '',
      action: attr.action || '',
      method: attr.method || '',
      ref: attr.ref || '',
      target: attr.target || '',
      submitdone: attr['ev:submitdone'] || ''
    };
  });
}

function phoneFields(xml) {
  const fields = [];
  for (const match of xml.matchAll(/<(?:w2:key|w2:column)\b[^>]*(?:id|name)=[^>]*>/g)) {
    const attr = attributes(match[0]);
    const joined = `${attr.id || ''} ${attr.name || ''}`;
    if (/(tel|phone|call|cntc|전화|연락)/i.test(joined)) fields.push(attr);
  }
  return fields;
}

const token = 'oZrHJMN';
const referer = `https://fdofd.ddangyo.com/gateway1.html?${token}`;
const landing = await request(`/gateway1.html?${token}`);
const cookie = cookieHeader(landing.headers['set-cookie'] || []);

const candidatePaths = [
  '/otc/sh/SH010S02.xml',
  '/otc/sh/SH010S02.xml?menuUrl=/otc/sh/SH010S02.xml&patsto_no=1193774',
  '/otc/sh/SH010S02.js'
];

const results = [];
for (const candidatePath of candidatePaths) {
  try {
    const response = await request(candidatePath, {cookie, referer});
    const record = {
      path: candidatePath,
      status: response.status,
      contentType: response.headers['content-type'] || '',
      byteLength: Buffer.byteLength(response.body),
      submissions: submissions(response.body),
      phoneFields: phoneFields(response.body),
      preview: response.body.slice(0, 10000)
    };
    results.push(record);
    const stem = candidatePath.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 180);
    await fs.writeFile(path.join(outputDir, `${stem}.txt`), response.body);
  } catch (error) {
    results.push({path: candidatePath, error: String(error?.stack || error)});
  }
}

await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({
  landingStatus: landing.status,
  cookieNames: cookie.split('; ').filter(Boolean).map(value => value.split('=')[0]),
  results
}, null, 2));

console.log(JSON.stringify(results.map(result => ({
  path: result.path,
  status: result.status,
  byteLength: result.byteLength,
  submissions: result.submissions,
  phoneFields: result.phoneFields,
  error: result.error || ''
})), null, 2));
