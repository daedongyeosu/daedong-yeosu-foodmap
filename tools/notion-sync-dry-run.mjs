import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';

const SOURCE = process.env.STORES_PATH || 'data/stores.json';
const TEMP = 'data/stores.notion-preview.json';
const REPORT = process.env.NOTION_REPORT_PATH || 'data/notion-sync-report.json';

await fs.copyFile(SOURCE, TEMP);

const child = spawn(process.execPath, ['tools/notion-sync.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    STORES_PATH: TEMP,
    NOTION_REPORT_PATH: REPORT
  }
});

const exitCode = await new Promise(resolve => child.on('exit', code => resolve(code ?? 1)));

try {
  await fs.unlink(TEMP);
} catch {
  // 이미 삭제되었거나 생성되지 않은 경우 무시
}

if (exitCode !== 0) process.exit(exitCode);
console.log('안전 시험 완료: 원본 data/stores.json은 변경하지 않았습니다.');
