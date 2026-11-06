import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=process.cwd(),base=process.env.BASE_URL||'http://127.0.0.1:4186';
let server;
if(!process.env.BASE_URL){
 const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{let file=path.join(root,decodeURIComponent(new URL(req.url,base).pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(4186,'127.0.0.1',r));
}
const browser=await chromium.launch({headless:true,...(process.env.CODEX_BROWSER_EXECUTABLE_PATH?{executablePath:process.env.CODEX_BROWSER_EXECUTABLE_PATH}:process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',timezoneId:'Asia/Seoul'});
await context.addInitScript(()=>{sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');});
if(['127.0.0.1','localhost'].includes(new URL(base).hostname))await context.route('https://daedong-yeosu-data-api.sisakim.workers.dev/api/**',async route=>{
 const response=await fetch(route.request().url(),{headers:{Origin:'https://daedongmap.com','X-Daedong-Client':'daedong-production-web-v1-20260807'}});
 await route.fulfill({status:response.status,body:await response.text(),headers:{'content-type':'application/json','access-control-allow-origin':'*'}});
});
await context.route('**/api/events',r=>r.fulfill({status:204,body:''}));
await context.route(/posthog\.com|google-analytics\.com/,r=>r.abort());
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('.qa-output',{recursive:true});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#storeGrid .store-card',{timeout:45000});
 await page.waitForSelector('#heroTrack .carousel-slide',{timeout:45000});
 for(const id of ['errand','online-store','neighbor-market']){const entry=page.locator('[data-service-planned="'+id+'"]');assert.equal(await entry.count(),1);assert.match(await entry.innerText(),/오픈 예정/);assert.equal(await entry.locator('a,button,form').count(),0);}
 await page.locator('[data-service-planned="online-store"]').scrollIntoViewIfNeeded();
 await page.screenshot({path:'.qa-output/production-promotion-390x844.png'});
 await page.locator('#mainSearch').fill('수라상궁');await page.locator('#searchBtn').click();
 await page.waitForSelector('.store-service-overview-overlay:not([hidden])');
 await page.locator('.store-service-overview-overlay [data-store-service-store-id="7bc7239e6b509c44"]').first().click();
 await page.waitForSelector('#modal .store-detail:not(.store-detail-loading)',{timeout:30000});
 assert.match(await page.locator('#modal').innerText(),/수라상궁/);
 await page.screenshot({path:'.qa-output/production-promotion-store.png'});
 for(const folder of ['errand','online-store','store-partner','store-manager','store-studio','store-alley','shop-owners','neighbor-market']){
  await page.goto(base+'/'+folder+'/',{waitUntil:'domcontentloaded'});await page.waitForURL('**/coming-soon/**');assert.match(await page.locator('main').innerText(),/오픈 예정/);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS 390×844: catalog, banner, three visible opening notices, store search/detail, eight deep-link gates');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
