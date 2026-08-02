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
await fs.mkdir(outputDir, { recursive: true });

const userAgents = {
  mobile: 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Safari/537.36'
};

function requestRaw(token, userAgent) {
  return new Promise((resolve, reject) => {
    const requestPath = `/gateway1.html?${token}`;
    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      method: 'GET',
      path: requestPath,
      headers: {
        'user-agent': userAgent,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
      },
      timeout: 30000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          requestPath,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          body
        });
      });
    });
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    req.end();
  });
}

function extractCandidates(text) {
  const patterns = [
    /https?:\\?\/\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+/g,
    /(?:intent|ddangyo|shinhancard|market):[^\s"'<>]+/gi,
    /location(?:\.href|\.replace)?\s*(?:=|\()\s*["']([^"']+)/gi,
    /(?:store|shop|merchant|branch|biz|mall)[A-Za-z_-]*(?:Id|No|Code)?["']?\s*[:=]\s*["']?([A-Za-z0-9_-]+)/gi
  ];
  const found = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) found.push(match[1] || match[0]);
  }
  return [...new Set(found)].slice(0, 500);
}

const summary = [];
for (const target of targets) {
  for (const [agentName, userAgent] of Object.entries(userAgents)) {
    const stem = `${target.token}-${agentName}`;
    try {
      const result = await requestRaw(target.token, userAgent);
      const html = result.body.toString('utf8');
      await fs.writeFile(path.join(outputDir, `${stem}.html`), result.body);
      const metadata = {
        token: target.token,
        suppliedName: target.name,
        agent: agentName,
        requestPath: result.requestPath,
        statusCode: result.statusCode,
        statusMessage: result.statusMessage,
        headers: result.headers,
        byteLength: result.body.length,
        candidates: extractCandidates(html),
        htmlPreview: html.slice(0, 12000)
      };
      await fs.writeFile(path.join(outputDir, `${stem}.json`), JSON.stringify(metadata, null, 2));
      summary.push({
        token: target.token,
        suppliedName: target.name,
        agent: agentName,
        statusCode: result.statusCode,
        byteLength: result.body.length,
        location: result.headers.location || '',
        candidateCount: metadata.candidates.length
      });
    } catch (error) {
      const failure = {
        token: target.token,
        suppliedName: target.name,
        agent: agentName,
        error: String(error?.stack || error)
      };
      await fs.writeFile(path.join(outputDir, `${stem}.json`), JSON.stringify(failure, null, 2));
      summary.push(failure);
    }
  }
}

await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
