import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const SOURCE = process.env.STORES_PATH || 'data/stores.json';
const TEMP = 'data/stores.notion-preview.json';
const REPORT = process.env.NOTION_REPORT_PATH || 'data/notion-sync-report.json';

await fs.copyFile(SOURCE, TEMP);

async function run(script) {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: {
      ...process.env,
      STORES_PATH: TEMP,
      NOTION_REPORT_PATH: REPORT
    }
  });
  return new Promise(resolve => child.on('exit', code => resolve(code ?? 1)));
}

let exitCode = await run('tools/notion-complete-import.mjs');
if (exitCode === 0) exitCode = await run('tools/notion-sync.mjs');
if (exitCode === 0) exitCode = await run('tools/notion-phone-enrich.mjs');

try {
  await fs.unlink(TEMP);
} catch {
  // 이미 삭제되었거나 생성되지 않은 경우 무시
}

if (exitCode !== 0) process.exit(exitCode);
console.log('안전 시험 완료: 원본 data/stores.json은 변경하지 않았습니다.');
