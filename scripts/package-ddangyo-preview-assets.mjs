import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('ddangyo-integration-output');

const originalMenuScript = await fs.readFile('store-menu-preview.js', 'utf8');
const startMarker = '  const MENU_STORES = Object.freeze({';
const endMarker = '  });\n  const menuCache = new Map();';
if (!originalMenuScript.includes(startMarker) || !originalMenuScript.includes(endMarker)) {
  throw new Error('store-menu-preview.js menu map markers changed');
}

const patchedMenuScript = originalMenuScript
  .replace(startMarker, '  const LEGACY_MENU_STORES = {')
  .replace(
    endMarker,
    `  };\n  const MENU_STORES = Object.freeze({\n    ...LEGACY_MENU_STORES,\n    ...(window.DAEDONG_DDANGYO_MENU_STORES || {})\n  });\n  const menuCache = new Map();`
  );

if (!patchedMenuScript.includes('window.DAEDONG_DDANGYO_MENU_STORES')) {
  throw new Error('dynamic Ddangyo menu map was not inserted');
}

await fs.writeFile(path.join(outputDir, 'store-menu-preview.js'), patchedMenuScript);
await fs.copyFile('store-menu-preview.css', path.join(outputDir, 'store-menu-preview.css'));
await fs.copyFile('ddangyo-preview-runtime.js', path.join(outputDir, 'ddangyo-preview-runtime.js'));

const installer = `import fs from 'node:fs/promises';

const indexPath = 'index.html';
let html = await fs.readFile(indexPath, 'utf8');
const cssTag = '  <link rel="stylesheet" href="store-menu-preview.css?v=ddangyo-73-1">';
const scriptBlock = [
  '  <script src="store-menu-content/ddangyo-menu-map.js?v=20260802-1" defer></script>',
  '  <script src="ddangyo-preview-runtime.js?v=20260802-1" defer></script>',
  '  <script src="store-menu-preview.js?v=ddangyo-73-1" defer></script>'
].join('\\n');

if (!html.includes('store-menu-preview.css')) {
  html = html.replace('</head>', cssTag + '\\n</head>');
}
if (!html.includes('ddangyo-menu-map.js')) {
  html = html.replace('</body>', scriptBlock + '\\n</body>');
}
await fs.writeFile(indexPath, html);

const enrichment = JSON.parse(await fs.readFile('data/ddangyo-store-enrichment.json', 'utf8'));
const menuMapText = await fs.readFile('store-menu-content/ddangyo-menu-map.js', 'utf8');
const menuMapMatch = menuMapText.match(/Object\\.freeze\\((\\{[\\s\\S]*\\})\\);/);
if (!menuMapMatch) throw new Error('menu map parse failed');
const menuMap = JSON.parse(menuMapMatch[1]);
if (enrichment.stores.length !== 73) throw new Error('expected 73 enrichment stores');
if (enrichment.stores.filter(row => row.isNew).length !== 27) throw new Error('expected 27 new stores');
if (enrichment.stores.filter(row => !row.isNew).length !== 46) throw new Error('expected 46 existing stores');
if (Object.keys(menuMap).length !== 73) throw new Error('expected 73 menu map entries');
if (!html.includes('ddangyo-preview-runtime.js') || !html.includes('store-menu-preview.js')) throw new Error('preview index scripts missing');
console.log(JSON.stringify({installed:true,stores:73,newStores:27,existingStores:46,menuFiles:73}, null, 2));
`;
await fs.writeFile(path.join(outputDir, 'install-ddangyo-preview.mjs'), installer);

const summary = JSON.parse(await fs.readFile(path.join(outputDir, 'integration-summary.json'), 'utf8'));
summary.previewAssets = {
  menuScript: 'store-menu-preview.js',
  menuStyle: 'store-menu-preview.css',
  runtime: 'ddangyo-preview-runtime.js',
  installer: 'install-ddangyo-preview.mjs'
};
await fs.writeFile(path.join(outputDir, 'integration-summary.json'), JSON.stringify(summary, null, 2));

console.log(JSON.stringify({packaged: true, ...summary.previewAssets}, null, 2));
