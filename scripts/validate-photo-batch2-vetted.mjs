import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const checks=[];const pass=(name,ok,detail='')=>{checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${detail?` - ${detail}`:''}`);};
const stores=read('data/stores.json');
const manifest=read('data/photo-manifest.json');
const assets=read('data/photo-batch2-vetted-assets.json');
const assigned=read('data/photo-batch2-vetted-assignments.json');
const review=read('data/photo-batch2-vetted-review-decisions.json');
const report=read('data/photo-batch2-vetted-report.json');
const payload=read('payload-manifest.json');
const storeById=new Map(stores.map(s=>[String(s.id),s]));
const manifestById=new Map((manifest.entries||[]).filter(e=>e.storeId).map(e=>[String(e.storeId),e]));
const assetById=new Map(assets.assets.map(a=>[a.imageId,a]));
pass('승인 사진 수',assets.assets.length===9,`${assets.assets.length}/9`);
for(const a of assets.assets){
  const exists=fs.existsSync(a.src);pass(`사진 존재 ${a.imageId}`,exists,a.src);
  if(exists){pass(`사진 크기 ${a.imageId}`,fs.statSync(a.src).size===a.bytes,`${fs.statSync(a.src).size}/${a.bytes}`);pass(`사진 SHA-256 ${a.imageId}`,sha(a.src)===a.sha256);const h=fs.readFileSync(a.src).subarray(0,12);pass(`WebP 형식 ${a.imageId}`,h.subarray(0,4).toString()==='RIFF'&&h.subarray(8,12).toString()==='WEBP');}
}
const uniqueStores=new Set(assigned.assignments.map(a=>a.storeId));
pass('적용 배정 수',assigned.assignments.length===16,`${assigned.assignments.length}/16`);
pass('적용 가게 수',uniqueStores.size===14,`${uniqueStores.size}/14`);
for(const a of assigned.assignments){const s=storeById.get(a.storeId);pass(`가게 존재 ${a.storeName}`,Boolean(s));if(s){pass(`가게 사진 적용 ${a.storeName}`,s.image===a.src,`${s.image}`);pass(`매니페스트 적용 ${a.storeName}`,manifestById.get(a.storeId)?.src===a.src);}}
pass('사진 보유 가게 수',stores.filter(s=>String(s.image||'').trim()).length===386,`${stores.filter(s=>String(s.image||'').trim()).length}/386`);
pass('사진 준비 중 가게 수',stores.filter(s=>!String(s.image||'').trim()).length===85,`${stores.filter(s=>!String(s.image||'').trim()).length}/85`);
pass('전수검수 원본 타일',review.sourceTileCount===374,`${review.sourceTileCount}/374`);
pass('이전 승인 후보',review.previouslyApprovedCount===20,`${review.previouslyApprovedCount}/20`);
pass('최종 승인 사진',review.approvedImageIds.length===9,`${review.approvedImageIds.length}/9`);
pass('전체 제외 사진',review.excluded.length===27,`${review.excluded.length}/27`);
for(const id of ['090','091','106','169','170','202','203','205','277','280','327'])pass(`재검수 제외 ${id}`,review.excluded.some(e=>e.imageId===id));
for(const id of ['169','170'])pass(`메뉴·홍보 사진 차단 ${id}`,review.excluded.find(e=>e.imageId===id)?.reason==='menu_promotional_text');
pass('적용 보고 사진 수',report.appliedPhotoCount===9,`${report.appliedPhotoCount}/9`);
pass('적용 보고 가게 수',report.appliedStoreCount===14,`${report.appliedStoreCount}/14`);
pass('기존 정상사진 수 보존',report.storesWithPhotoBefore===372,`${report.storesWithPhotoBefore}/372`);
pass('2차 패키지 활성화',(manifest.packages||[]).some(p=>p.id==='photo-batch-2'&&p.runtimeEnabled===true));
const first=(manifest.packages||[]).find(p=>p.id==='photo-batch-1-final');pass('1차 누락파일 임의생성 금지',first?.runtimeEnabled===false&&[18,19,20,21,22].every(n=>first.missingPartNumbers?.includes(n)));
pass('매니페스트 파일 수',payload.fileCount===payload.files.length,`${payload.files.length}/${payload.fileCount}`);
for(const item of payload.files){const exists=fs.existsSync(item.path);pass(`매니페스트 존재 ${item.path}`,exists);if(exists){pass(`매니페스트 크기 ${item.path}`,fs.statSync(item.path).size===item.bytes);pass(`매니페스트 SHA ${item.path}`,sha(item.path)===item.sha256);}}
const sumLines=fs.readFileSync('SHA256SUMS.txt','utf8').trim().split(/\r?\n/).filter(Boolean);let sumOk=0;for(const line of sumLines){const m=line.match(/^([a-f0-9]{64})  (.+)$/);if(m&&fs.existsSync(m[2])&&sha(m[2])===m[1])sumOk++;}
pass('SHA256SUMS 전체 일치',sumOk===sumLines.length,`${sumOk}/${sumLines.length}`);
const failed=checks.filter(c=>!c.ok);console.log(`SUMMARY PASS ${checks.length-failed.length} / FAIL ${failed.length}`);if(failed.length)process.exit(1);
