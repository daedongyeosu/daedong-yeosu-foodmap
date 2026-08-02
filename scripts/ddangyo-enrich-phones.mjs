import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const outputDir = path.resolve('ddangyo-shop-data-output');
const normalizedPath = path.join(outputDir, 'normalized-all.json');
const rows = JSON.parse(await fs.readFile(normalizedPath, 'utf8'));
const agent = new https.Agent({keepAlive: true, maxSockets: 4});
const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';

function request(requestPath, {method = 'GET', headers = {}, body = ''} = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      path: requestPath,
      method,
      agent,
      headers: {
        'user-agent': userAgent,
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        ...headers
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
    if (body) req.write(body);
    req.end();
  });
}

function cookieHeader(values = []) {
  return values.map(value => String(value).split(';', 1)[0]).join('; ');
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return {result_code: 'PARSE', message: String(error), raw: text};
  }
}

function normalizedPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{8,10}$/.test(digits) ? digits : '';
}

function sourceToken(row) {
  const url = String(row?.sourceUrls?.[0] || '');
  return url.includes('?') ? url.split('?').pop() : '';
}

async function fetchPhone(row) {
  const token = sourceToken(row);
  const referer = String(row?.sourceUrls?.[0] || `https://fdofd.ddangyo.com/gateway1.html?${token}`);
  const landing = token
    ? await request(`/gateway1.html?${token}`, {headers: {accept: 'text/html,application/xhtml+xml,*/*'}})
    : {headers: {}};
  const cookie = cookieHeader(landing.headers['set-cookie'] || []);
  const payload = {
    dma_shop_info: {
      patsto_no: String(row.patstoNo || ''),
      admtn_dong_cd: '4613078000',
      map_latt: '34.7600000',
      map_lngt: '127.6600000',
      shop_detail_tp_cd: '01'
    }
  };
  const body = JSON.stringify(payload);
  const response = await request('/shop/info', {
    method: 'POST',
    body,
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json;charset=UTF-8',
      'content-length': Buffer.byteLength(body),
      origin: 'https://fdofd.ddangyo.com',
      referer,
      cookie,
      authorization: '',
      'uuid-token': 'GTY0000000',
      'app-token': 'GTY0000000',
      'app-name': 'O2O',
      'app-os': 'WEB',
      'x-requested-with': 'XMLHttpRequest'
    }
  });
  const data = parseJson(response.body);
  if (data.result_code !== '0000') {
    throw new Error(`shop/info ${data.result_code || response.status} ${data.message || ''}`);
  }
  const info = data?.result?.shop_coo_info || {};
  const phone = normalizedPhone(info.conadr);
  return {
    phone,
    returnedName: String(info.patsto_nm || '').trim(),
    returnedAddress: String(info.addr || '').trim(),
    rawPhone: String(info.conadr || '').trim()
  };
}

const report = [];
for (let index = 0; index < rows.length; index += 1) {
  const row = rows[index];
  try {
    const result = await fetchPhone(row);
    row.phone = result.phone;
    row.phoneSource = result.phone ? 'ddangyo' : '';
    report.push({
      patstoNo: row.patstoNo,
      name: row.name,
      phone: result.phone,
      rawPhone: result.rawPhone,
      returnedName: result.returnedName,
      returnedAddress: result.returnedAddress,
      status: result.phone ? 'verified' : 'not-provided'
    });
    console.log(`phone ${index + 1}/${rows.length} ${row.name} ${result.phone || 'NONE'}`);
  } catch (error) {
    row.phone = '';
    row.phoneSource = '';
    report.push({patstoNo: row.patstoNo, name: row.name, phone: '', status: 'failed', error: String(error?.message || error)});
    console.error(`phone ${index + 1}/${rows.length} ${row.name} failed`, error);
  }
  await new Promise(resolve => setTimeout(resolve, 80));
}

await fs.writeFile(normalizedPath, JSON.stringify(rows, null, 2));
await fs.writeFile(path.join(outputDir, 'phone-report.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  stores: rows.length,
  verifiedPhones: report.filter(row => row.status === 'verified').length,
  notProvided: report.filter(row => row.status === 'not-provided').length,
  failed: report.filter(row => row.status === 'failed').length,
  source: 'ddangyo-shop-info-conadr',
  prohibitedSourcesUsed: [],
  rows: report
}, null, 2));

console.log(JSON.stringify({
  stores: rows.length,
  verifiedPhones: report.filter(row => row.status === 'verified').length,
  notProvided: report.filter(row => row.status === 'not-provided').length,
  failed: report.filter(row => row.status === 'failed').length
}, null, 2));
