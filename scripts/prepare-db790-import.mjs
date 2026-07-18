import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [candidateRootArg,outputDirArg='build/db790-import']=process.argv.slice(2);
if(!candidateRootArg)throw new Error('사용법: node prepare-db790-import.mjs <candidate-root> [output-dir]');
const candidateRoot=path.resolve(candidateRootArg);
const outputDir=path.resolve(outputDirArg);
fs.mkdirSync(outputDir,{recursive:true});

const current=JSON.parse(fs.readFileSync(path.join(scriptRoot,'data/stores.json'),'utf8'));
const candidate=JSON.parse(fs.readFileSync(path.join(candidateRoot,'data/stores.json'),'utf8'));
const policy=JSON.parse(fs.readFileSync(path.join(scriptRoot,'data/photo-policy.json'),'utf8'));
const filterReportPath=path.join(candidateRoot,'data/photo-filter-report.json');
const filterReport=fs.existsSync(filterReportPath)?JSON.parse(fs.readFileSync(filterReportPath,'utf8')):{blocked:[]};
const blockedPaths=new Set((filterReport.blocked||[]).map(item=>String(item.src||'').replaceAll('\\','/')));
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
const metaPagePattern=/^대동여수음식지도(?:\s|\(|$)/;
const currentById=new Map(current.map(store=>[String(store.id),store]));
const canonicalRouteName=name=>{
  const key=normalize(name);
  if(key.includes('가게바로'))return'가게바로주문';
  if(key.includes('먹깨비'))return'먹깨비';
  if(key.includes('땡겨요'))return'땡겨요';
  if(key.includes('온동네'))return'온동네';
  if(key==='chak'||key.includes('지역상품권'))return'CHAK 지역상품권';
  if(key==='전화'||key.includes('전화주문'))return'전화주문';
  if(key.includes('요기요'))return'요기요';
  if(key.includes('쿠팡'))return'쿠팡이츠';
  if(key.includes('배달의민족')||key==='배민')return'배달의민족';
  if(key.includes('브랜드앱'))return'브랜드앱';
  if(key.includes('네이버지도'))return'네이버지도';
  return String(name||'').trim();
};
const routeKey=name=>normalize(canonicalRouteName(name));
const canonicalUrl=value=>{
  const url=String(value??'').trim();
  if(!url)return'';
  if(url.startsWith('/p/'))return`https://app.notion.com${url}`;
  if(/^https?:\/\//i.test(url)||/^tel:/i.test(url))return url;
  return'';
};
const canonicalRoutes=(candidateStore,currentStore)=>{
  const map=new Map();
  for(const source of [candidateStore?.routes||[],currentStore?.routes||[]]){
    for(const route of source){
      if(!route||route.enabled===false)continue;
      const name=canonicalRouteName(route.name);
      if(name==='네이버지도')continue;
      const url=canonicalUrl(route.url);
      if(!name||!url)continue;
      const key=routeKey(name);
      if(!map.has(key))map.set(key,{name,url,enabled:true,source:route.source||'integrated'});
    }
  }
  const order=['가게바로주문','먹깨비','땡겨요','온동네','브랜드앱','CHAK 지역상품권','전화주문','요기요','쿠팡이츠','배달의민족'];
  return [...map.values()].sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));
};
const suspiciousPath=(image,store)=>{
  const hay=normalize([image,store.name,store.realBusinessName].join(' '));
  return (policy.blockedPathKeywords||[]).some(keyword=>hay.includes(normalize(keyword)));
};
const candidateFileValid=(image,store)=>{
  const normalized=String(image||'').replaceAll('\\','/').trim();
  if(!normalized||normalized==='assets/store1.jpg')return false;
  if(blockedPaths.has(normalized)||suspiciousPath(normalized,store))return false;
  if(!/\.(png|jpe?g|webp|gif|avif)$/i.test(normalized))return false;
  const absolute=path.resolve(candidateRoot,normalized);
  if(!absolute.startsWith(candidateRoot+path.sep))return false;
  return fs.existsSync(absolute)&&fs.statSync(absolute).isFile();
};
const currentFileValid=(image,store)=>{
  const normalized=String(image||'').replaceAll('\\','/').trim();
  if(!normalized||normalized==='assets/store1.jpg'||suspiciousPath(normalized,store))return false;
  const absolute=path.resolve(scriptRoot,normalized);
  return absolute.startsWith(scriptRoot+path.sep)&&fs.existsSync(absolute)&&fs.statSync(absolute).isFile();
};
const copyFiles=new Set();
const imported=[];const excluded=[];const photoStats={candidate:0,current:0,empty:0,blockedOrMissing:0};
for(const raw of candidate){
  if(metaPagePattern.test(String(raw.name||'').trim())){excluded.push({id:String(raw.id),name:raw.name,reason:'management-page'});continue;}
  const existing=currentById.get(String(raw.id));
  const merged={...raw};
  merged.id=String(raw.id);
  merged.name=String(raw.name||existing?.name||'').trim();
  merged.realBusinessName=raw.realBusinessName||existing?.realBusinessName||merged.name;
  merged.shopInShopNames=Array.isArray(raw.shopInShopNames)?raw.shopInShopNames:(existing?.shopInShopNames||[]);
  merged.district=raw.district||existing?.district||existing?.area||'';
  merged.category=raw.category||existing?.category||existing?.cat||'기타';
  merged.address=raw.address||existing?.address||'';
  merged.phone=raw.phone||existing?.phone||'';
  const naverRoute=(raw.routes||[]).find(route=>canonicalRouteName(route?.name)==='네이버지도'&&canonicalUrl(route?.url));
  merged.naverMap=raw.naverMap||canonicalUrl(naverRoute?.url)||existing?.naverMap||'';
  merged.routes=canonicalRoutes(raw,existing);
  merged.managed=Boolean(existing?.managed??raw.managed);
  merged.sharedManaged=Boolean(existing?.sharedManaged??raw.sharedManaged);
  merged.managementStatus=existing?.managementStatus||raw.managementStatus||'unconfirmed';
  merged.pinPosition=existing?.pinPosition??raw.pinPosition??null;
  merged.forceBottom=Boolean(existing?.forceBottom??raw.forceBottom);

  const candidateImage=String(raw.image||raw.img||'').replaceAll('\\','/');
  const currentImage=String(existing?.image||'').replaceAll('\\','/');
  if(candidateFileValid(candidateImage,raw)){
    merged.image=candidateImage;merged.img=candidateImage;copyFiles.add(candidateImage);photoStats.candidate++;
  }else if(currentFileValid(currentImage,existing||raw)){
    merged.image=currentImage;merged.img=currentImage;photoStats.current++;
  }else{
    merged.image='';merged.img='';photoStats.empty++;if(candidateImage)photoStats.blockedOrMissing++;
  }
  const safeImages=[];
  for(const imageItem of raw.images||[]){
    const card=String(imageItem?.card||'').replaceAll('\\','/');
    const detail=String(imageItem?.detail||card).replaceAll('\\','/');
    if(candidateFileValid(card,raw)&&candidateFileValid(detail,raw)){
      safeImages.push({card,detail});copyFiles.add(card);copyFiles.add(detail);
    }
  }
  merged.images=safeImages.length?safeImages:(merged.image?[{card:merged.image,detail:merged.image}]:[]);
  if(!merged.images.length){delete merged.photoGroup;delete merged.photoSource;}
  imported.push(merged);
}

const ids=new Set();const names=new Set();const duplicateIds=[];const duplicateNames=[];
for(const store of imported){const id=String(store.id),name=normalize(store.name);if(ids.has(id))duplicateIds.push(id);ids.add(id);if(names.has(name))duplicateNames.push(store.name);names.add(name);}
if(duplicateIds.length||duplicateNames.length)throw new Error(`병합 후보 중복: ID ${duplicateIds.length}, 이름 ${duplicateNames.length}`);

const report={
  generatedAt:new Date().toISOString(),
  currentCount:current.length,
  candidateRawCount:candidate.length,
  excluded,
  mergedCount:imported.length,
  addedCount:imported.filter(store=>!currentById.has(store.id)).length,
  retainedCount:imported.filter(store=>currentById.has(store.id)).length,
  photoStats,
  copyFileCount:copyFiles.size,
  routeCounts:Object.fromEntries([...new Set(imported.flatMap(store=>store.routes.map(route=>route.name)))].sort().map(name=>[name,imported.filter(store=>store.routes.some(route=>route.name===name)).length]))
};
fs.writeFileSync(path.join(outputDir,'stores.json'),JSON.stringify(imported,null,2)+'\n');
fs.writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(outputDir,'copy-files.txt'),[...copyFiles].sort().join('\n')+'\n');
console.log(`[DB790 선별 병합 후보] ${current.length} → ${imported.length}`);
console.log(`추가 ${report.addedCount}, 유지 ${report.retainedCount}, 관리페이지 제외 ${excluded.length}`);
console.log(`사진: 후보 ${photoStats.candidate}, 현재 유지 ${photoStats.current}, 검수대기 ${photoStats.empty}, 후보차단/누락 ${photoStats.blockedOrMissing}`);
console.log(`복사할 안전 사진 파일: ${copyFiles.size}`);
console.log(`출력: ${outputDir}`);
