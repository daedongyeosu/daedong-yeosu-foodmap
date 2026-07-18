import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const writeJson=(rel,data)=>fs.writeFileSync(path.join(root,rel),`${JSON.stringify(data,null,2)}\n`);
const sha256File=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
const vettedPrefix='assets/photo-batch-2-vetted/';
const photoPaths=store=>[store.image,store.img,...(Array.isArray(store.images)?store.images:[])].filter(Boolean).map(String);
const hasPhoto=store=>photoPaths(store).length>0;
const hasVettedPhoto=store=>photoPaths(store).some(item=>item.startsWith(vettedPrefix));
const blockedPathKeywords=['사업자등록증','영업신고증','영업허가증','통장','신분증','면허증','계약서','영수증','가격표','메뉴판','전화번호','주소','bank','license','permit','contract','receipt','price','menu'];

const storesPath='data/stores.json';
const manifestPath='data/photo-manifest.json';
const stores=readJson(storesPath);
const manifest=readJson(manifestPath);
const assets=readJson('data/photo-batch2-vetted-assets.json');
const assignmentData=readJson('data/photo-batch2-vetted-assignments.json');
const reviewData=readJson('data/photo-batch2-vetted-review-decisions.json');
const report=readJson('data/photo-batch2-vetted-report.json');
const assetById=new Map(assets.assets.map(asset=>[String(asset.imageId),asset]));

if(stores.length!==471)throw new Error(`가게 수 불일치: ${stores.length}/471`);
const normalPhotoStores=stores.filter(store=>hasPhoto(store)&&!hasVettedPhoto(store));
if(normalPhotoStores.length!==372)throw new Error(`기존 정상사진 기준 불일치: ${normalPhotoStores.length}/372`);
manifest.entries=Array.isArray(manifest.entries)?manifest.entries:[];

const applied=[];
const referencedPhotos=new Set();
for(const assignment of assignmentData.assignments){
  const matches=stores.filter(store=>normalize(store.name)===normalize(assignment.storeName));
  if(matches.length!==1)throw new Error(`가게명 정확 일치 실패: ${assignment.storeName} (${matches.length}개)`);
  const store=matches[0];
  if(hasPhoto(store)&&!hasVettedPhoto(store))throw new Error(`기존 정상사진 덮어쓰기 차단: ${store.name}`);
  if(!Array.isArray(assignment.paths)||assignment.paths.length===0)throw new Error(`배정 사진 없음: ${store.name}`);
  if(assignment.paths.length!==assignment.imageIds.length)throw new Error(`사진 ID·경로 수 불일치: ${store.name}`);

  for(let index=0;index<assignment.paths.length;index++){
    const imageId=String(assignment.imageIds[index]);
    const rel=String(assignment.paths[index]);
    const asset=assetById.get(imageId);
    if(!asset)throw new Error(`승인 자산 없음: ${imageId}`);
    if(asset.src!==rel)throw new Error(`승인 경로 불일치: ${imageId}`);
    const abs=path.join(root,rel);
    if(!fs.existsSync(abs))throw new Error(`사진 파일 없음: ${rel}`);
    const stat=fs.statSync(abs);
    const actualHash=sha256File(rel);
    if(stat.size!==asset.bytes||actualHash!==asset.sha256)throw new Error(`사진 무결성 불일치: ${rel}`);
    const header=fs.readFileSync(abs).subarray(0,12);
    if(header.subarray(0,4).toString()!=='RIFF'||header.subarray(8,12).toString()!=='WEBP')throw new Error(`WebP 형식 불일치: ${rel}`);
    const lower=normalize(`${rel} ${store.name}`);
    if(blockedPathKeywords.some(keyword=>lower.includes(normalize(keyword))))throw new Error(`민감 키워드 경로 차단: ${rel}`);
    referencedPhotos.add(rel);
  }

  store.image=assignment.paths[0];
  store.img=assignment.paths[0];
  store.images=[...assignment.paths];
  store.photoGroup=`photo-batch2-vetted:${normalize(store.name).split('점')[0]}`;
  store.photoSource='photo-batch2-vetted:manual-revalidation-fill-missing-only';

  const conflicting=manifest.entries.find(entry=>String(entry.storeId)===String(store.id)&&entry.source!=='photo-batch-2');
  if(conflicting)throw new Error(`기존 매니페스트 사진 덮어쓰기 차단: ${store.name}`);
  manifest.entries=manifest.entries.filter(entry=>!(String(entry.storeId)===String(store.id)&&entry.source==='photo-batch-2'));
  manifest.entries.push({
    storeId:String(store.id),
    storeName:store.name,
    normalizedName:normalize(store.name),
    aliases:[store.realBusinessName,...(store.shopInShopNames||[])].filter(Boolean),
    src:assignment.paths[0],
    additionalSrcs:assignment.paths.slice(1),
    gallery:[...assignment.paths],
    source:'photo-batch-2',
    classification:'food',
    blocked:false,
    reviewedAt:reviewData.reviewedAt,
    reviewReason:assignment.reason,
    visualReview:{textRisk:'none-prominent',priceRisk:'none',contactRisk:'none',branchRisk:'none-or-generic-food',menuBoardRisk:'none'}
  });
  applied.push({
    storeId:String(store.id),
    storeName:store.name,
    area:store.district||store.area||'',
    imageIds:[...assignment.imageIds],
    paths:[...assignment.paths],
    primary:assignment.paths[0],
    reason:assignment.reason
  });
}

const resultingWithPhoto=stores.filter(hasPhoto).length;
if(resultingWithPhoto!==386)throw new Error(`적용 후 사진 보유 가게 불일치: ${resultingWithPhoto}/386`);
if(referencedPhotos.size!==9)throw new Error(`실제 참조 사진 수 불일치: ${referencedPhotos.size}/9`);
if(applied.length!==14)throw new Error(`적용 가게 수 불일치: ${applied.length}/14`);

const packageInfo={
  id:'photo-batch-2',
  label:'2차 가게사진 패키지 재검수본',
  type:'direct-vetted-webp-files',
  basePath:vettedPrefix.replace(/\/$/,''),
  detected:true,
  status:'active-revalidated',
  runtimeEnabled:true,
  reviewedSourceTiles:reviewData.sourceTileCount,
  sourceApprovedCandidates:reviewData.previouslyApprovedCount,
  revalidatedApprovedImages:referencedPhotos.size,
  excludedSourceImages:reviewData.excluded.length,
  appliedStores:applied.length,
  integrityManifest:'payload-manifest.json',
  integritySums:'SHA256SUMS.txt',
  assignments:'data/photo-batch2-vetted-assignments.json',
  reviewDecisions:'data/photo-batch2-vetted-review-decisions.json',
  reason:'실제 파일 기준 SHA-256·크기 재생성, 글자·가격·전화번호·주소·지점정보·메뉴판 재검수, 기존 정상사진 372곳 보존 후 사진 없는 가게만 보충'
};
const packageIndex=(manifest.packages||[]).findIndex(item=>item.id==='photo-batch-2');
if(packageIndex>=0)manifest.packages[packageIndex]=packageInfo;else manifest.packages.push(packageInfo);
const first=(manifest.packages||[]).find(item=>item.id==='photo-batch-1-final');
if(first){first.runtimeEnabled=false;first.status='incomplete';first.reason='18~22와 가게별 좌표 색인이 없어 임의 생성·노출하지 않는다.';}
manifest.generatedAt=new Date().toISOString();
manifest.coverage={storeCount:stores.length,storesWithPhoto:resultingWithPhoto,storesAwaitingPhoto:stores.length-resultingWithPhoto,updatedAt:new Date().toISOString()};

report.appliedPhotoCount=referencedPhotos.size;
report.appliedStoreCount=applied.length;
report.storesWithPhotoBefore=normalPhotoStores.length;
report.storesWithPhotoAfter=resultingWithPhoto;
report.storesAwaitingPhoto=stores.length-resultingWithPhoto;
report.applied=applied;
report.generatedAt=new Date().toISOString();

writeJson(storesPath,stores);
writeJson(manifestPath,manifest);
writeJson('data/photo-batch2-vetted-report.json',report);
console.log(`[2차 사진 적용] 실제 참조 사진 ${referencedPhotos.size}장, 가게 ${applied.length}곳`);
console.log(`[기존 정상사진 보존] ${normalPhotoStores.length}곳`);
console.log(`[사진 준비 중] ${stores.length-resultingWithPhoto}곳`);
