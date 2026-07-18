import fs from 'node:fs';
import crypto from 'node:crypto';
const stores=JSON.parse(fs.readFileSync('data/stores.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('data/photo-manifest.json','utf8'));
const report=JSON.parse(fs.readFileSync('data/photo-batch3-vetted-report.json','utf8'));
const assignment=JSON.parse(fs.readFileSync('data/photo-batch3-vetted-assignments.json','utf8')).assignments[0];
const policy=JSON.parse(fs.readFileSync('data/photo-policy.json','utf8'));
const targetId='98779281080288d1', prefix='assets/photo-batch-3-vetted/';
const photoPaths=s=>[s.image,s.img,...(Array.isArray(s.images)?s.images.flatMap(v=>typeof v==='string'?[v]:[v?.card,v?.detail]):[])].filter(Boolean);
const errors=[];const pass=(c,m)=>{if(!c)errors.push(m);else console.log('PASS',m)};
const withPhoto=stores.filter(s=>photoPaths(s).length).length;
pass(stores.length===471,'가게 수 471 유지');pass(withPhoto===387,'사진 보유 387곳');pass(stores.length-withPhoto===84,'사진 준비 중 84곳');
const target=stores.find(s=>String(s.id)===targetId);pass(Boolean(target),'대상 가게 존재');pass(target?.name==='제복이네 짜글이&제육쌈밥&두루치기 교동점','대상 가게명 정확 일치');pass(target?.image===assignment.primary&&target?.img===assignment.primary,'대표사진 필드 일치');pass(assignment.imagePaths.length===3,'승인 사진 3장');pass(photoPaths(target).every(p=>p.startsWith(prefix)),'승인 폴더만 참조');pass((manifest.packages||[]).some(p=>p.id==='photo-batch-3'&&p.runtimeEnabled&&p.appliedStores===1),'3차 패키지 활성');pass(manifest.coverage?.storesWithPhoto===387&&manifest.coverage?.storesAwaitingPhoto===84,'매니페스트 387/84');pass(report.preservation.existingNormalPhotoStoresChanged===0,'기존 정상사진 덮어쓰기 없음');pass(Object.values(report.safety).every(v=>v===0),'금지 사진 커밋 0건');
const blocked=(policy.blockedPathKeywords||[]).map(v=>String(v).toLowerCase());for(const rel of assignment.imagePaths){const b=fs.readFileSync(rel);pass(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP','WebP '+rel);pass(!blocked.some(k=>rel.toLowerCase().includes(k)),'금지 키워드 없음 '+rel);const e=report.applied[0].assets.find(a=>a.src===rel);pass(e?.bytes===b.length&&e?.sha256===crypto.createHash('sha256').update(b).digest('hex'),'무결성 '+rel)}
if(errors.length){errors.forEach(e=>console.error('FAIL',e));process.exit(1)}console.log('PHOTO_BATCH_3_VALIDATION_PASS');
