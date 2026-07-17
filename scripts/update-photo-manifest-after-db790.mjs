import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=path.join(root,'data/photo-manifest.json');
const storesPath=path.join(root,'data/stores.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const stores=JSON.parse(fs.readFileSync(storesPath,'utf8'));
const countByPrefix=prefix=>stores.filter(store=>String(store.image||'').startsWith(prefix)).length;
const fileCount=directory=>{
  const absolute=path.join(root,directory);
  if(!fs.existsSync(absolute))return 0;
  let count=0;
  const walk=current=>{for(const entry of fs.readdirSync(current,{withFileTypes:true})){const full=path.join(current,entry.name);if(entry.isDirectory())walk(full);else count++;}};
  walk(absolute);return count;
};
const emptyCount=stores.filter(store=>!String(store.image||'').trim()).length;
const upsert=entry=>{
  const index=(manifest.packages||[]).findIndex(item=>item.id===entry.id);
  if(index>=0)manifest.packages[index]={...manifest.packages[index],...entry};
  else manifest.packages.push(entry);
};
manifest.version=Math.max(Number(manifest.version)||1,3);
manifest.generatedAt=new Date().toISOString();
upsert({
  id:'db790-safe-store-photos',label:'DB790 검수 가게사진',type:'direct-webp-files',basePath:'assets/store-photos',
  referencedStores:countByPrefix('assets/store-photos/'),detectedFiles:fileCount('assets/store-photos'),status:'active-filtered',runtimeEnabled:true,
  safetyReports:['data/integration-sources/db790/photo-filter-report.json','data/integration-sources/db790/photo-match-safety-report.json'],
  reason:'food-only-v2와 document-safety-first 필터를 통과하고, 불확실한 가게명 매칭을 제거한 사진만 연결한다.'
});
upsert({
  id:'db790-notion-safe-photos',label:'DB790 노션 보충사진',type:'direct-webp-files',basePath:'assets/notion-store-photos',
  referencedStores:countByPrefix('assets/notion-store-photos/'),detectedFiles:fileCount('assets/notion-store-photos'),status:'active-exact-title-fill-missing',runtimeEnabled:true,
  safetyReports:['data/integration-sources/db790/notion-photo-manifest.json','data/integration-sources/db790/notion-photo-apply-report.json'],
  reason:'노션 표시 제목이 정확히 일치하고 기존 사진이 없는 가게만 보충한 사진이다.'
});
const notion=(manifest.packages||[]).find(item=>item.id==='notion');
if(notion){notion.detectedFiles=fileCount(notion.basePath);notion.referencedStores=countByPrefix(`${notion.basePath}/`);}
manifest.coverage={storeCount:stores.length,storesWithPhoto:stores.length-emptyCount,storesAwaitingPhoto:emptyCount,updatedAt:new Date().toISOString()};
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`[사진 매니페스트 갱신] 가게 ${stores.length}, 사진 연결 ${stores.length-emptyCount}, 검수 대기 ${emptyCount}`);
console.log(`DB790 가게사진 ${countByPrefix('assets/store-photos/')} / 노션 보충사진 ${countByPrefix('assets/notion-store-photos/')} / 기존 노션 ${notion?.referencedStores||0}`);
