import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const writeJson=(rel,data)=>fs.writeFileSync(path.join(root,rel),`${JSON.stringify(data,null,2)}\n`);
const sha256File=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
const blockedPathKeywords=['사업자등록증','영업신고증','영업허가증','통장','신분증','면허증','계약서','영수증','가격표','메뉴판','전화번호','주소','bank','license','permit','contract','receipt','price','menu'];

const storesPath='data/stores.json';
const manifestPath='data/photo-manifest.json';
const stores=readJson(storesPath);
const manifest=readJson(manifestPath);
const assets=readJson('data/photo-batch2-vetted-assets.json');
const assignmentData=readJson('data/photo-batch2-vetted-assignments.json');
const reviewData=readJson('data/photo-batch2-vetted-review-decisions.json');
const assignments=assignmentData.assignments;
const storeById=new Map(stores.map(store=>[String(store.id),store]));
const manifestById=new Map((manifest.entries||[]).filter(entry=>entry.storeId).map(entry=>[String(entry.storeId),entry]));
const assetById=new Map(assets.assets.map(asset=>[String(asset.imageId),asset]));

const before={storeCount:stores.length,storesWithPhoto:stores.filter(store=>String(store.image||'').trim()).length,manifestEntries:(manifest.entries||[]).length};
const applied=[];

for(const assignment of assignments){
  const store=storeById.get(String(assignment.storeId));
  if(!store)throw new Error(`가게 ID를 찾지 못했습니다: ${assignment.storeId}`);
  if(normalize(store.name)!==normalize(assignment.storeName))throw new Error(`가게명이 바뀌었습니다: ${assignment.storeId} ${store.name} != ${assignment.storeName}`);
  if(String(store.image||'').trim())throw new Error(`기존 정상사진 덮어쓰기 차단: ${store.name} -> ${store.image}`);
  if(manifestById.has(String(store.id)))throw new Error(`기존 매니페스트 사진 덮어쓰기 차단: ${store.name}`);
  const asset=assetById.get(String(assignment.imageId));
  if(!asset)throw new Error(`승인 자산을 찾지 못했습니다: ${assignment.imageId}`);
  if(asset.src!==assignment.src)throw new Error(`배정 경로 불일치: ${assignment.imageId}`);
  if(!fs.existsSync(path.join(root,asset.src)))throw new Error(`승인 사진 파일이 없습니다: ${asset.src}`);
  const stat=fs.statSync(path.join(root,asset.src));
  const actualHash=sha256File(asset.src);
  if(stat.size!==asset.bytes||actualHash!==asset.sha256)throw new Error(`승인 사진 무결성 불일치: ${asset.src}`);
  const lower=normalize(`${asset.src} ${assignment.storeName}`);
  if(blockedPathKeywords.some(keyword=>lower.includes(normalize(keyword))))throw new Error(`민감 키워드 경로 차단: ${asset.src}`);
  store.image=asset.src;
  const entry={
    storeId:String(store.id),storeName:store.name,normalizedName:normalize(store.name),aliases:[store.realBusinessName,...(store.shopInShopNames||[])].filter(Boolean),
    src:asset.src,source:'photo-batch-2',classification:'food',blocked:false,reviewedAt:reviewData.reviewedAt,
    reviewReason:assignment.reason,visualReview:{textRisk:'none-prominent',priceRisk:'none',contactRisk:'none',branchRisk:'none-or-generic-food',menuBoardRisk:'none'}
  };
  manifest.entries.push(entry);manifestById.set(String(store.id),entry);
  applied.push({storeId:String(store.id),storeName:store.name,imageId:assignment.imageId,src:asset.src,reason:assignment.reason});
}

const packageIndex=(manifest.packages||[]).findIndex(item=>item.id==='photo-batch-2');
const packageInfo={
  id:'photo-batch-2',label:'2차 가게사진 패키지 재검수본',type:'direct-vetted-webp-files',basePath:'assets/photo-batch-2-vetted',
  detected:true,status:'active-revalidated',runtimeEnabled:true,reviewedSourceTiles:reviewData.sourceTileCount,sourceApprovedCandidates:reviewData.previouslyApprovedCount,
  revalidatedApprovedImages:assets.assets.length,excludedSourceImages:reviewData.excluded.length,appliedStores:applied.length,
  integrityManifest:'payload-manifest.json',integritySums:'SHA256SUMS.txt',reviewDecisions:'data/photo-batch2-vetted-review-decisions.json',
  reason:'실제 패키지 파일 기준 SHA-256 및 크기 재생성, 글자·가격·전화번호·주소·지점정보·메뉴판 재검수, 기존 정상사진 보존 후 사진 없는 가게만 보충'
};
if(packageIndex>=0)manifest.packages[packageIndex]=packageInfo;else manifest.packages.push(packageInfo);
manifest.generatedAt=new Date().toISOString();
manifest.coverage={storeCount:stores.length,storesWithPhoto:stores.filter(store=>String(store.image||'').trim()).length,storesAwaitingPhoto:stores.filter(store=>!String(store.image||'').trim()).length,updatedAt:new Date().toISOString()};
writeJson(storesPath,stores);writeJson(manifestPath,manifest);

const finalReport=readJson('data/photo-batch2-vetted-report.json');
finalReport.appliedPhotoCount=new Set(applied.map(item=>item.imageId)).size;
finalReport.appliedStoreCount=applied.length;
finalReport.storesWithPhotoBefore=before.storesWithPhoto;
finalReport.storesWithPhotoAfter=manifest.coverage.storesWithPhoto;
finalReport.storesAwaitingPhoto=manifest.coverage.storesAwaitingPhoto;
finalReport.applied=applied;
finalReport.generatedAt=new Date().toISOString();
writeJson('data/photo-batch2-vetted-report.json',finalReport);
console.log(`[2차 사진 적용] 사진 ${finalReport.appliedPhotoCount}장, 가게 ${applied.length}곳`);
console.log(`[기존 정상사진 보존] ${before.storesWithPhoto}곳 유지`);
console.log(`[사진 준비 중] ${manifest.coverage.storesAwaitingPhoto}곳`);
