import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const targetId='98779281080288d1';
const targetName='제복이네 짜글이&제육쌈밥&두루치기 교동점';
const sourceFolder='제복이';
const basePath='assets/photo-batch-3-vetted';
const paths=[1,2,3].map(i=>`${basePath}/${targetId}-${String(i).padStart(2,'0')}.webp`);
const expected=[
  {sequence:1,sourceFile:'KakaoTalk_20260625_061800999.jpg',bytes:17274,sha256:'093cde1bd4429163d2df2c95fb92247050b89717b690372a27f1ce4de5b14722',dimensions:[400,263],parts:4},
  {sequence:2,sourceFile:'KakaoTalk_20260625_061800999_01.jpg',bytes:19048,sha256:'5c39d60596a38d162dde6a857d48bcbf79e4a7e99e858ba037b580a5b14e8780',dimensions:[400,267],parts:5},
  {sequence:3,sourceFile:'KakaoTalk_20260625_061800999_02.jpg',bytes:15826,sha256:'3a4bcdf82c8ec6f578f87f95d8adc36a8563211bea630debfd88cb6887a0753e',dimensions:[400,267],parts:4}
];
const now=new Date().toISOString();
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,`${JSON.stringify(v,null,2)}\n`)};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const photoPaths=s=>[s.image,s.img,...(Array.isArray(s.images)?s.images.flatMap(v=>typeof v==='string'?[v]:[v?.card,v?.detail]):[])].filter(Boolean);

fs.mkdirSync(basePath,{recursive:true});
for(const item of expected){
  const chunks=[];
  for(let n=1;n<=item.parts;n++) chunks.push(fs.readFileSync(`data/photo-batch3-upload/image-${String(item.sequence).padStart(2,'0')}-part-${String(n).padStart(2,'0')}.b64`,'utf8').trim());
  const bytes=Buffer.from(chunks.join(''),'base64');
  if(bytes.length!==item.bytes||hash(bytes)!==item.sha256) throw new Error(`사진 복원 무결성 실패 ${item.sequence}`);
  if(bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WEBP') throw new Error(`WebP 형식 실패 ${item.sequence}`);
  fs.writeFileSync(paths[item.sequence-1],bytes);
}

const stores=readJson('data/stores.json');
const before=JSON.parse(JSON.stringify(stores));
if(stores.length!==471) throw new Error(`가게 수 ${stores.length}/471`);
const beforeWithPhoto=stores.filter(s=>photoPaths(s).length).length;
if(beforeWithPhoto!==386) throw new Error(`기존 정상사진 기준 ${beforeWithPhoto}/386`);
const matches=stores.filter(s=>String(s.id)===targetId);
if(matches.length!==1) throw new Error(`대상 가게 ID 일치 ${matches.length}`);
const store=matches[0];
if(store.name!==targetName) throw new Error(`대상 가게명 불일치 ${store.name}`);
if(photoPaths(store).length) throw new Error('기존 사진 덮어쓰기 차단');
store.image=paths[0];
store.img=paths[0];
store.images=paths.map(p=>({card:p,detail:p}));
store.photoGroup='photo-batch3-vetted:제복이';
store.photoSource='photo-batch-3-vetted:manual-review-fill-missing-only';
const changed=stores.map((s,i)=>JSON.stringify(s)!==JSON.stringify(before[i])?[before[i],s]:null).filter(Boolean);
if(changed.length!==1||String(changed[0][0].id)!==targetId) throw new Error('대상 외 가게 변경 차단');
const allowed=new Set(['image','img','images','photoGroup','photoSource']);
for(const key of new Set([...Object.keys(changed[0][0]),...Object.keys(changed[0][1])])) if(!allowed.has(key)&&JSON.stringify(changed[0][0][key])!==JSON.stringify(changed[0][1][key])) throw new Error(`비사진 필드 변경 차단 ${key}`);
writeJson('data/stores.json',stores);

const manifest=readJson('data/photo-manifest.json');
const pkg={
  id:'photo-batch-3',label:'3차 가게사진 검수본',type:'direct-vetted-webp-files',basePath,detected:true,status:'active-vetted',runtimeEnabled:true,
  sourceSplitParts:5,sourceArchiveBytes:1406539085,sourceFolders:62,sourceImageFiles:547,existingPhotoFoldersPreserved:50,
  unmatchedFoldersHeld:10,ambiguousFoldersHeld:1,approvedImages:3,appliedStores:1,
  assignments:'data/photo-batch3-vetted-assignments.json',reviewDecisions:'data/photo-batch3-vetted-review-decisions.json',report:'data/photo-batch3-vetted-report.json',
  reason:'기존 정상사진 386곳을 덮어쓰지 않고 사진 준비 중 가게 가운데 가게명이 명확한 1곳만 수동 검수한 음식 사진 3장으로 보충. 민감서류·가격표·개인정보·비음식·불명확한 지점 사진은 제외 또는 보류.'
};
manifest.packages=(manifest.packages||[]).filter(p=>p.id!=='photo-batch-3');
manifest.packages.push(pkg);
manifest.entries=(manifest.entries||[]).filter(e=>String(e.storeId)!==targetId);
manifest.entries.push({
  storeId:targetId,storeName:targetName,normalizedName:'제복이네짜글이제육쌈밥두루치기교동점',aliases:['제복이',targetName],
  src:paths[0],additionalSrcs:paths.slice(1),gallery:paths,source:'photo-batch-3',classification:'food',blocked:false,reviewedAt:now,
  reviewReason:'압축 폴더명 제복이와 사진 준비 중 가게 제복이네 짜글이&제육쌈밥&두루치기 교동점의 고유 상호 핵심어가 명확히 일치하며 음식 사진만 수동 승인',
  visualReview:{textRisk:'none',priceRisk:'none',contactRisk:'none',branchRisk:'low-manual-confirmed',menuBoardRisk:'none',nonFoodRisk:'none'}
});
manifest.generatedAt=now;
manifest.coverage={storeCount:471,storesWithPhoto:387,storesAwaitingPhoto:84,updatedAt:now};
writeJson('data/photo-manifest.json',manifest);

const existingPhotoPreserved=[
'1988응답하라추억의옛날도시락 고소동점','60일숙성명품김치찜','고기듬뿍 국물두루치기 문수점','골목낙곱새 1977 봉강점','교동야식','국수나무','김치찌개참잘하는집 여서점','김치찜팝니다 서교점','꽃게장&갈치조림 전문점 봉산점','나능이 능이버섯백숙','내가끓엿찌 여서점','담분식 서교점','더 진한 소한마리탕&국밥 엑스포점','덮밥전문점 고기그릇 공화점','도담식당 충무동','도도닭발 봉산점','돈도니밥도둑짜글이 국동점','돌산텃밭김치 교동점','또래김밥 문수점','만석군 봉산점','매운맛 땡길때 밥장인 엑스포점','명품육회 오림동점','미친 짜글이 서교점','밥앤동 볶음밥&우동 충무점','배불이 순대국','붕붕먹거리','속초냉면','수시아 김밥전문 공화동점','시민감자탕 문수점','엄마미안 김치찜 공화점','울엄마 김치찜 갈비찜 중앙점','이가네 나주곰탕','이동천 시원냉면 여서점','이모네분식 봉산점','장터순대국밥','정담오리바베큐 여수엑스포점','진남컵밥 중앙점','진통뼈사랑 봉산점','쭈꾸미닭 공화점','쭈신쭈왕 문수점','찜스틸러갈비찜 봉산점','청년뚝배기 덕충점','청담곱떡 고소동점','청담낙곱새 고소동점','청정게장촌 봉산점','코리안 찌개 타운 서교점','통큰한방삼계탕 공화점','한국전통춘천닭갈비 공화점','한식전문 혼밥대장 공화점','허참봉 곰탕&갈비탕 봉산점'];
const noCurrentStoreMatch=['맛있돼지 문수점','백년족발','빵빵김밥 여서점','아도쿄','요거트월드','족팔계','중앙동 롯데리아','착한쭝식','컴포즈커피문수광장점','탕화쿵푸마라탕 여서점'];
const ambiguousBranchMatch=['중앙하이츠 아주커'];
const assetDetails=expected.map((e,i)=>({...e,sourceFolder,src:paths[i],classification:'food',blocked:false,visualReview:{sensitiveDocumentRisk:'none',priceRisk:'none',personalInfoRisk:'none',nonFoodRisk:'none',peopleRisk:'none'}}));
const folderDecisions=[
  ...existingPhotoPreserved.map(sourceFolder=>({sourceFolder,decision:'hold',reason:'existing_photo_preserved',detail:'현재 데이터에서 이미 정상사진을 보유한 가게와 일치·근접 일치하여 덮어쓰지 않음'})),
  ...noCurrentStoreMatch.map(sourceFolder=>({sourceFolder,decision:'hold',reason:'no_current_store_match',detail:'현재 471개 데이터에서 동일 가게를 확정할 수 없어 임의 추가·매칭하지 않음'})),
  ...ambiguousBranchMatch.map(sourceFolder=>({sourceFolder,decision:'hold',reason:'ambiguous_branch_match',detail:'여러 아주커치킨 지점 후보가 있어 지점 추정을 하지 않음'})),
  {sourceFolder,decision:'apply',reason:'unique_core_name_match_manual_review',storeId:targetId,storeName:targetName,approvedFiles:expected.map(e=>e.sourceFile),excludedDuplicateFiles:['노션1.png','노션2.png','노션3.png']}
];
writeJson('data/photo-batch3-vetted-review-decisions.json',{
  version:1,reviewedAt:now,source:{archiveName:'김민태사진2(1).zip',splitParts:['.z01','.z02','.z03','.z04','.zip'],integrity:'pass',combinedBytes:1406539085,folderCount:62,imageFileCount:547},
  policy:{preserveExistingPhotoStores:true,priority:'stores-awaiting-photo',blocked:['sensitive_document','price_list','personal_information','non_food','ambiguous_match'],noGuessing:true},
  folderDecisionCounts:{existing_photo_preserved:50,no_current_store_match:10,ambiguous_branch_match:1,applied:1},folderDecisions,approvedAssets:assetDetails
});
writeJson('data/photo-batch3-vetted-assignments.json',{version:1,generatedAt:now,assignments:[{storeId:targetId,storeName:targetName,district:'교동',sourceFolder,imagePaths:paths,primary:paths[0],reason:'사진 준비 중 가게에 고유 핵심 상호명 수동 일치 및 3장 음식사진 안전 검수 통과'}]});
writeJson('data/photo-batch3-vetted-report.json',{
  version:1,generatedAt:now,baselineCommit:'618d4c2f5768a1ffdee3c4a6508e9201c883ff43',branch:'feature/photo-batch-3',
  archive:{archiveName:'김민태사진2(1).zip',splitParts:['.z01','.z02','.z03','.z04','.zip'],integrity:'pass',combinedBytes:1406539085,folderCount:62,imageFileCount:547},
  review:{sourceFolders:62,sourceImages:547,existingPhotoFoldersPreserved:50,noCurrentStoreMatchHeld:10,ambiguousBranchHeld:1,appliedFolders:1,approvedImages:3,duplicateCompositesNotUsed:3},
  coverage:{storeCount:471,storesWithPhotoBefore:386,storesWithPhotoAfter:387,storesAwaitingBefore:85,storesAwaitingAfter:84},
  preservation:{existingNormalPhotoStoresChanged:0,nonPhotoFieldsChanged:0,functionFilesChangedForRuntime:0,onlyTargetStorePhotoFieldsChanged:true},
  safety:{sensitiveDocumentsCommitted:0,priceListsCommitted:0,personalInformationCommitted:0,nonFoodPhotosCommitted:0,ambiguousMatchesCommitted:0},
  applied:[{storeId:targetId,storeName:targetName,district:'교동',sourceFolder,paths,assets:assetDetails}],heldFolders:{existingPhotoPreserved,noCurrentStoreMatch,ambiguousBranchMatch},
  mergeDeployment:{mainMerged:false,deployed:false,requiresUserApproval:true}
});

let validateData=fs.readFileSync('scripts/validate-data.mjs','utf8');
validateData=validateData.replaceAll('withPhoto===386','withPhoto===387').replaceAll('사진 보유 386곳','사진 보유 387곳').replaceAll('stores.length-withPhoto===85','stores.length-withPhoto===84').replaceAll('사진 준비 중 85곳','사진 준비 중 84곳').replaceAll('manifest.coverage?.storesWithPhoto===386&&manifest.coverage?.storesAwaitingPhoto===85','manifest.coverage?.storesWithPhoto===387&&manifest.coverage?.storesAwaitingPhoto===84').replaceAll('사진 매니페스트 386/85 일치','사진 매니페스트 387/84 일치').replaceAll('사진 없는 85곳은 검수된 음식 사진 준비 중으로 유지','사진 없는 84곳은 검수된 음식 사진 준비 중으로 유지');
const needle="check(package2?.revalidatedApprovedImages===9&&package2?.appliedStores===14,'2차 사진 9장·가게 14곳 유지');";
if(!validateData.includes("id==='photo-batch-3'")) validateData=validateData.replace(needle,`${needle}\nconst package3=(manifest.packages||[]).find(item=>item.id==='photo-batch-3');\ncheck(package3?.runtimeEnabled===true&&package3?.status==='active-vetted','3차 패키지 검수 활성');\ncheck(package3?.approvedImages===3&&package3?.appliedStores===1,'3차 사진 3장·가게 1곳 적용');`);
fs.writeFileSync('scripts/validate-data.mjs',validateData);
let smoke=fs.readFileSync('scripts/browser-smoke.mjs','utf8');
smoke=smoke.replace("dataAudit.withPhoto===386&&dataAudit.awaiting===85&&dataAudit.coverage.storesWithPhoto===386&&dataAudit.coverage.storesAwaitingPhoto===85,'사진 보유 386·준비 중 85 유지'","dataAudit.withPhoto===387&&dataAudit.awaiting===84&&dataAudit.coverage.storesWithPhoto===387&&dataAudit.coverage.storesAwaitingPhoto===84,'사진 보유 387·준비 중 84 유지'").replaceAll('{awaiting:85}','{awaiting:84}');
fs.writeFileSync('scripts/browser-smoke.mjs',smoke);
const validator=`import fs from 'node:fs';\nimport crypto from 'node:crypto';\nconst stores=JSON.parse(fs.readFileSync('data/stores.json','utf8'));\nconst manifest=JSON.parse(fs.readFileSync('data/photo-manifest.json','utf8'));\nconst report=JSON.parse(fs.readFileSync('data/photo-batch3-vetted-report.json','utf8'));\nconst assignment=JSON.parse(fs.readFileSync('data/photo-batch3-vetted-assignments.json','utf8')).assignments[0];\nconst policy=JSON.parse(fs.readFileSync('data/photo-policy.json','utf8'));\nconst targetId='${targetId}', prefix='assets/photo-batch-3-vetted/';\nconst photoPaths=s=>[s.image,s.img,...(Array.isArray(s.images)?s.images.flatMap(v=>typeof v==='string'?[v]:[v?.card,v?.detail]):[])].filter(Boolean);\nconst errors=[];const pass=(c,m)=>{if(!c)errors.push(m);else console.log('PASS',m)};\nconst withPhoto=stores.filter(s=>photoPaths(s).length).length;\npass(stores.length===471,'가게 수 471 유지');pass(withPhoto===387,'사진 보유 387곳');pass(stores.length-withPhoto===84,'사진 준비 중 84곳');\nconst target=stores.find(s=>String(s.id)===targetId);pass(Boolean(target),'대상 가게 존재');pass(target?.name==='${targetName}','대상 가게명 정확 일치');pass(target?.image===assignment.primary&&target?.img===assignment.primary,'대표사진 필드 일치');pass(assignment.imagePaths.length===3,'승인 사진 3장');pass(photoPaths(target).every(p=>p.startsWith(prefix)),'승인 폴더만 참조');pass((manifest.packages||[]).some(p=>p.id==='photo-batch-3'&&p.runtimeEnabled&&p.appliedStores===1),'3차 패키지 활성');pass(manifest.coverage?.storesWithPhoto===387&&manifest.coverage?.storesAwaitingPhoto===84,'매니페스트 387/84');pass(report.preservation.existingNormalPhotoStoresChanged===0,'기존 정상사진 덮어쓰기 없음');pass(Object.values(report.safety).every(v=>v===0),'금지 사진 커밋 0건');\nconst blocked=(policy.blockedPathKeywords||[]).map(v=>String(v).toLowerCase());for(const rel of assignment.imagePaths){const b=fs.readFileSync(rel);pass(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP','WebP '+rel);pass(!blocked.some(k=>rel.toLowerCase().includes(k)),'금지 키워드 없음 '+rel);const e=report.applied[0].assets.find(a=>a.src===rel);pass(e?.bytes===b.length&&e?.sha256===crypto.createHash('sha256').update(b).digest('hex'),'무결성 '+rel)}\nif(errors.length){errors.forEach(e=>console.error('FAIL',e));process.exit(1)}console.log('PHOTO_BATCH_3_VALIDATION_PASS');\n`;
fs.writeFileSync('scripts/validate-photo-batch3-vetted.mjs',validator);

const afterWithPhoto=stores.filter(s=>photoPaths(s).length).length;
if(afterWithPhoto!==387||stores.length-afterWithPhoto!==84) throw new Error('최종 사진 수 검증 실패');
console.log('PHOTO_BATCH_3_APPLY_PASS',JSON.stringify({beforeWithPhoto,afterWithPhoto,awaiting:84,appliedStore:targetName,approvedImages:3}));
