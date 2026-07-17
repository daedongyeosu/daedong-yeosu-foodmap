import fs from 'node:fs';

const changes=[];
function replaceExact(file,from,to,label){
  const original=fs.readFileSync(file,'utf8');
  if(original.includes(to)){
    console.log(`ALREADY ${label}`);
    return;
  }
  if(!original.includes(from))throw new Error(`Expected text not found for ${label}`);
  const updated=original.replace(from,to);
  fs.writeFileSync(file,updated);
  changes.push(file);
  console.log(`UPDATED ${label}: ${file}`);
}

replaceExact(
  'app.js',
  'mobile:`images/${number}-m.webp`',
  'mobile:`images/${number}.webp`',
  'mobile banner fallback uses existing WebP'
);
replaceExact(
  'scripts/browser-smoke.mjs',
  "await page.waitForSelector('#startupAd[hidden]');",
  "await page.waitForFunction(()=>document.querySelector('#startupAd')?.hasAttribute('hidden'));",
  'wait for startup popup hidden attribute'
);
replaceExact(
  'scripts/browser-smoke.mjs',
  "await page.waitForSelector('#modal[hidden]');",
  "await page.waitForFunction(()=>document.querySelector('#modal')?.hasAttribute('hidden'));",
  'wait for modal hidden attribute'
);

console.log(`Runtime fixes changed ${changes.length} file(s): ${changes.join(', ')||'none'}`);
