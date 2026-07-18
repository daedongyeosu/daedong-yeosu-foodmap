import fs from 'node:fs';
import crypto from 'node:crypto';

const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const checks=[];
const pass=(name,ok,detail='')=>{
  checks.push({name,ok,detail});
  console.log(`${ok?'PASS':'FAIL'} ${name}${detail?` - ${detail}`:''}`);
};
const hasPhoto=store=>Boolean(store.image||store.img||(Array.isArray(store.images)&&store.images.length));

const stores=read('data/stores.json');
const manifest=read('data/photo-manifest.json');
const assets=read('data/photo-batch2-vetted-assets.json');
const assignmentDoc=read('data/photo-batch2-vetted-assignments.json');
const review=read('data/photo-batch2-vetted-review-decisions.json');
const report=read('data/photo-batch2-vetted-report.json');
const payload=read('payload-manifest.json');
const storeByName=new Map(stores.map(store=>[store.name,store]));
const manifestById=new Map((manifest.entries||[]).filter(entry=>entry.storeId).map(entry=>[String(entry.storeId),entry]));

pass('승인 WebP 사진 수',assets.assets.length===9,`${assets.assets.length}/9`);
for(const asset of assets.assets){
  const exists=fs.existsSync(asset.src);
  pass(`사진 존재 ${asset.imageId}`,exists,asset.src);
  if(exists){
    const actualBytes=fs.statSync(asset.src).size;
    pass(`사진 크기 ${asset.imageId}`,actualBytes===asset.bytes,`${actualBytes}/${asset.bytes}`);
    pass(`사진 SHA-256 ${asset.imageId}`,sha(asset.src)===asset.sha256,sha(asset.src));
    const header=fs.readFileSync(asset.src).subarray(0,12);
    pass(`WebP 형식 ${asset.imageId}`,header.subarray(0,4).toString()==='RIFF'&&header.subarray(8,12).toString()==='WEBP');
  }
}

const referencedPaths=new Set(assignmentDoc.assignments.flatMap(item=>item.paths));
const referencedIds=new Set(assignmentDoc.assignments.flatMap(item=>item.imageIds));
pass('적용 가게 배정 수',assignmentDoc.assignments.length===14,`${assignmentDoc.assignments.length}/14`);
pass('실제 참조 사진 경로 수',referencedPaths.size===9,`${referencedPaths.size}/9`);
pass('실제 참조 사진 ID 수',referencedIds.size===9,`${referencedIds.size}/9`);

for(const assignment of assignmentDoc.assignments){
  const store=storeByName.get(assignment.storeName);
  pass(`가게 존재 ${assignment.storeName}`,Boolean(store));
  if(!store)continue;
  pass(`대표사진 적용 ${assignment.storeName}`,store.image===assignment.paths[0],`${store.image||''}`);
  pass(`다중사진 적용 ${assignment.storeName}`,JSON.stringify(store.images||[])===JSON.stringify(assignment.paths),`${(store.images||[]).length}/${assignment.paths.length}`);
  const entry=manifestById.get(String(store.id));
  pass(`매니페스트 대표사진 ${assignment.storeName}`,entry?.src===assignment.paths[0],entry?.src||'');
  pass(`매니페스트 추가사진 ${assignment.storeName}`,JSON.stringify(entry?.additionalSrcs||[])===JSON.stringify(assignment.paths.slice(1)),`${(entry?.additionalSrcs||[]).length}/${assignment.paths.slice(1).length}`);
}

const withPhoto=stores.filter(hasPhoto).length;
const awaiting=stores.length-withPhoto;
pass('전체 가게 수',stores.length===471,`${stores.length}/471`);
pass('사진 보유 가게 수',withPhoto===386,`${withPhoto}/386`);
pass('사진 준비 중 가게 수',awaiting===85,`${awaiting}/85`);
pass('전수검수 원본 타일',review.sourceTileCount===374,`${review.sourceTileCount}/374`);
pass('이전 승인 후보',review.previouslyApprovedCount===20,`${review.previouslyApprovedCount}/20`);
pass('최종 승인 사진',review.approvedImageIds.length===9,`${review.approvedImageIds.length}/9`);
pass('전체 제외 사진',review.excluded.length===27,`${review.excluded.length}/27`);
for(const id of ['090','091','106','169','170','202','203','205','277','280','327'])pass(`재검수 제외 ${id}`,review.excluded.some(item=>item.imageId===id));
for(const id of ['169','170'])pass(`메뉴·홍보 사진 차단 ${id}`,review.excluded.find(item=>item.imageId===id)?.reason==='menu_promotional_text');
const overlap=review.approvedImageIds.filter(id=>review.excluded.some(item=>item.imageId===id));
pass('승인·제외 목록 중복 없음',overlap.length===0,overlap.join(','));

pass('적용 보고 사진 수',report.appliedPhotoCount===9,`${report.appliedPhotoCount}/9`);
pass('적용 보고 가게 수',report.appliedStoreCount===14,`${report.appliedStoreCount}/14`);
pass('기존 정상사진 수 보존',report.storesWithPhotoBefore===372,`${report.storesWithPhotoBefore}/372`);
pass('보고서 사진 준비 중 수',report.storesAwaitingPhoto===85,`${report.storesAwaitingPhoto}/85`);
pass('2차 패키지 활성화',(manifest.packages||[]).some(item=>item.id==='photo-batch-2'&&item.runtimeEnabled===true&&item.appliedStores===14&&item.revalidatedApprovedImages===9));
const first=(manifest.packages||[]).find(item=>item.id==='photo-batch-1-final');
pass('1차 누락파일 임의생성 금지',first?.runtimeEnabled===false&&[18,19,20,21,22].every(number=>first.missingPartNumbers?.includes(number)));

pass('payload-manifest 파일 수',payload.fileCount===23&&payload.files.length===23,`${payload.files.length}/${payload.fileCount}`);
for(const item of payload.files){
  const exists=fs.existsSync(item.path);
  pass(`매니페스트 존재 ${item.path}`,exists);
  if(exists){
    pass(`매니페스트 크기 ${item.path}`,fs.statSync(item.path).size===item.bytes,`${fs.statSync(item.path).size}/${item.bytes}`);
    pass(`매니페스트 SHA ${item.path}`,sha(item.path)===item.sha256);
  }
}
const sumLines=fs.readFileSync('SHA256SUMS.txt','utf8').trim().split(/\r?\n/).filter(Boolean);
let sumOk=0;
for(const line of sumLines){
  const match=line.match(/^([a-f0-9]{64})  (.+)$/);
  if(match&&fs.existsSync(match[2])&&sha(match[2])===match[1])sumOk++;
}
pass('SHA256SUMS 항목 수',sumLines.length===24,`${sumLines.length}/24`);
pass('SHA256SUMS 전체 일치',sumOk===sumLines.length,`${sumOk}/${sumLines.length}`);

const failed=checks.filter(check=>!check.ok);
const summary={success:failed.length===0,pass:checks.length-failed.length,fail:failed.length,checks};
fs.writeFileSync('photo-batch2-integrity-result.json',`${JSON.stringify(summary,null,2)}\n`);
console.log(`SUMMARY PASS ${summary.pass} / FAIL ${summary.fail}`);
if(failed.length)process.exit(1);
