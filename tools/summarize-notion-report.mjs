import fs from 'node:fs/promises';
import path from 'node:path';

const source = process.env.NOTION_REPORT_PATH || 'data/notion-sync-report.json';
const output = process.env.NOTION_SUMMARY_PATH || 'data/notion-sync-summary.json';

const report = JSON.parse(await fs.readFile(source, 'utf8'));
const routeCounts = {};
const missingRouteCounts = {};
const scoreCounts = { exact100: 0, high95to99: 0, accepted80to94: 0 };

for (const item of report.matched || []) {
  for (const key of item.routes || []) routeCounts[key] = (routeCounts[key] || 0) + 1;
  for (const key of item.missingRoutes || []) missingRouteCounts[key] = (missingRouteCounts[key] || 0) + 1;
  const score = Number(item.score || 0);
  if (score === 100) scoreCounts.exact100 += 1;
  else if (score >= 95) scoreCounts.high95to99 += 1;
  else scoreCounts.accepted80to94 += 1;
}

const summary = {
  generatedAt: new Date().toISOString(),
  pagesScanned: report.pagesScanned || 0,
  matchedCount: report.matchedCount ?? report.matched?.length ?? 0,
  ambiguousCount: report.ambiguousCount ?? report.ambiguous?.length ?? 0,
  unmatchedCount: report.unmatchedCount ?? report.unmatched?.length ?? 0,
  errorCount: report.errorCount ?? report.errors?.length ?? 0,
  scoreCounts,
  routeCounts,
  missingRouteCounts,
  ambiguousSamples: (report.ambiguous || []).slice(0, 30),
  unmatchedSamples: (report.unmatched || []).slice(0, 30),
  errorSamples: (report.errors || []).slice(0, 30)
};

await fs.mkdir(path.dirname(output), {recursive: true});
await fs.writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
