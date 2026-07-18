import fs from 'node:fs';

const write=(file,value)=>{
  const dir=file.split('/').slice(0,-1).join('/');
  if(dir)fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);
};

const reviewedAt='2026-07-18T08:02:50.545Z';
const assets={
  version:4,
  sourcePackage:'photo_batch2_ready.zip',
  reviewedAt,
  assetCount:9,
  assets:[
    {imageId:'082',src:'assets/photo-batch-2-vetted/082.webp',bytes:10846,sha256:'1b142e70d2db26f0f08df8a435757c737fb925f39122a3c9e6942902f40e37f0'},
    {imageId:'083',src:'assets/photo-batch-2-vetted/083.webp',bytes:7220,sha256:'8bfc5eb679a4292500e3ea123f61ffc6803a2ff064b55174ca0c12903ccf7abc'},
    {imageId:'084',src:'assets/photo-batch-2-vetted/084.webp',bytes:3398,sha256:'753623b9eb1107152e36b0ee23fb0606a5371ea2760c3046f1d3ab0ef1f98fe9'},
    {imageId:'089',src:'assets/photo-batch-2-vetted/089.webp',bytes:21518,sha256:'9cffc1b2b331193af7c377337c92158b769a16622de6e11b36577bf007839a30'},
    {imageId:'107',src:'assets/photo-batch-2-vetted/107.webp',bytes:5042,sha256:'d5fe80d36dcd72a539919342254f6a980f4ad63a6bc9d80264999cd18572d1d6'},
    {imageId:'108',src:'assets/photo-batch-2-vetted/108.webp',bytes:7380,sha256:'c2580012ecf44057d753fbdba3b461a3843b99b84cf0fb71143084a889b5e584'},
    {imageId:'109',src:'assets/photo-batch-2-vetted/109.webp',bytes:4542,sha256:'38b14f2d341609b9efcf99c7ae59b6e85b01f005de31ef73a2fc1701283895b1'},
    {imageId:'282',src:'assets/photo-batch-2-vetted/282.webp',bytes:4818,sha256:'8478a9d77e50ea9f198a19225929c535ad065db0999352e5f1ec22442afc856a'},
    {imageId:'284',src:'assets/photo-batch-2-vetted/284.webp',bytes:4748,sha256:'111320bf336490138277ee11329f1ea0924bacbc7cfc8e3fe54d1426641a95da'}
  ]
};

const assignments=[
  ['교촌치킨 국동점',['282'],'국동점 ↔ 국동'],
  ['교촌치킨 덕충점',['284'],'덕충점 ↔ 덕충동'],
  ['교촌치킨 돌산점',['282'],'돌산점 ↔ 돌산 권역'],
  ['교촌치킨 문수점',['284'],'문수점 ↔ 문수동'],
  ['교촌치킨 신기점',['282'],'신기점 ↔ 신기동'],
  ['교촌치킨 안산점',['284'],'안산점 ↔ 안산동'],
  ['교촌치킨 웅천점',['282'],'웅천점 ↔ 웅천동'],
  ['교촌치킨 죽림무선점',['284'],'죽림무선점 ↔ 죽림·무선 권역'],
  ['맘스터치 무선점',['082'],'무선점 ↔ 무선 권역'],
  ['맘스터치 여천 학동점',['083'],'학동점 ↔ 학동'],
  ['맘스터치 엑스포점',['084'],'엑스포점 ↔ 엑스포 권역'],
  ['맘스터치 중앙점',['082'],'중앙점 ↔ 중앙 권역'],
  ['맥도날드 여수학동DT점',['089'],'여수학동DT점 ↔ 학동'],
  ['배가네왕족보 여문본점',['107','108','109'],'정확한 가게명과 여문 권역(여서·문수) 일치']
].map(([storeName,imageIds,reason])=>({
  storeName,
  imageIds,
  paths:imageIds.map(id=>`assets/photo-batch-2-vetted/${id}.webp`),
  mode:'fill-missing-only',
  reason
}));

const excluded=[
  ['023','personal_contact','전화번호가 선명하게 보이는 배달앱 주문 화면'],
  ['024','personal_contact','전화번호가 선명하게 보이는 배달앱 주문 화면'],
  ['036','personal_contact','주소와 전화번호가 선명하게 보이는 지도 화면'],
  ['039','personal_contact','주소와 전화번호가 선명하게 보이는 배달앱 화면'],
  ['040','price_menu','메뉴판과 가격이 크게 표시된 이미지'],
  ['042','price_menu','메뉴판과 가격이 크게 표시된 이미지'],
  ['043','non_food_storefront','음식이 아닌 매장·간판 중심 이미지'],
  ['044','non_food_storefront','음식이 아닌 매장·간판 중심 이미지'],
  ['045','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['046','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['047','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['048','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['049','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['050','non_food_logo','로고 또는 문자만 표시된 이미지'],
  ['051','people_promotional','사람 중심 홍보 이미지'],
  ['052','people_promotional','사람 중심 홍보 이미지'],
  ['090','excessive_promotional_text','배달앱 주문 유도와 큰 홍보문구'],
  ['091','excessive_promotional_text','배달앱 주문 유도와 큰 홍보문구'],
  ['106','excessive_promotional_text','브랜드·배달앱·캐릭터 홍보문구'],
  ['169','menu_promotional_text','메뉴명과 설명 문구가 크게 표시'],
  ['170','menu_promotional_text','메뉴명과 설명 문구가 크게 표시'],
  ['202','excessive_promotional_text','상품 소개 문구가 음식보다 두드러짐'],
  ['203','excessive_promotional_text','홍보문구가 음식보다 두드러짐'],
  ['205','menu_promotional_text','메뉴명·설명 중심 메뉴판형 이미지'],
  ['277','excessive_promotional_text','브랜드 역사·홍보문구가 크게 표시'],
  ['280','excessive_promotional_text','배달앱 주문 유도와 캐릭터 홍보'],
  ['327','excessive_promotional_text','간판형 브랜드 문구와 앱 홍보']
].map(([imageId,reason,detail])=>({imageId,reason,detail}));

const reasonCounts=Object.fromEntries([...new Set(excluded.map(x=>x.reason))].sort().map(reason=>[reason,excluded.filter(x=>x.reason===reason).length]));
const rules=[
  '음식 사진만 허용',
  '사업자등록증·영업신고증·통장·신분증·면허증·계약서·영수증 차단',
  '전화번호·주소 등 개인정보 노출 차단',
  '가격표·메뉴판은 대표사진에서 제외',
  '과도한 홍보문구 제외',
  '기존 정상사진 덮어쓰기 금지',
  '문수점=문수동',
  '여서점=여서동',
  '덕충점=덕충동',
  '웅천점=웅천동',
  '여문점=여서·문수 권역',
  '지점 표시가 없는 일반 음식사진만 같은 브랜드 지점 간 공유 가능'
];

write('data/photo-batch2-structure-report.json',{
  version:4,
  source:'photo_batch2_ready.zip',
  items:13,
  sprites:4,
  sourceTileCount:374,
  manifestStores:123,
  manifestPhotos:374,
  installer:'apply_photo_batch2.py',
  note:'원본 구조와 파일명을 바꾸지 않고 별도 검수 구조로 안전 적용'
});
write('data/photo-batch2-vetted-assets.json',assets);
write('data/photo-batch2-vetted-assignments.json',{
  version:4,
  rule:'기존 정상사진 보존, 사진 없는 가게만 보충',
  districtRules:{문수점:'문수동',여서점:'여서동',덕충점:'덕충동',웅천점:'웅천동',여문점:'여서·문수 권역'},
  assignmentCount:assignments.length,
  referencedPhotoCount:new Set(assignments.flatMap(item=>item.imageIds)).size,
  assignments
});
write('data/photo-batch2-vetted-review-decisions.json',{
  version:4,
  reviewedAt,
  sourceTileCount:374,
  previouslyApprovedCount:20,
  visualReviewRules:rules,
  approvedImageIds:assets.assets.map(x=>x.imageId),
  excluded
});
write('data/photo-batch2-vetted-report.json',{
  version:4,
  reviewedSourceTileCount:374,
  previouslyApprovedCount:20,
  approvedAfterRevalidation:9,
  excludedTotal:excluded.length,
  exclusionReasonCounts:reasonCounts,
  appliedPhotoCount:9,
  appliedStoreCount:14,
  storesWithPhotoBefore:372,
  storesWithPhotoAfter:386,
  storesAwaitingPhoto:85,
  manifestMatchedFiles:23,
  sha256SumsMatchedFiles:24,
  excluded
});
console.log('2차 사진 재검수 시드 생성 완료: 승인 9장, 적용 대상 14곳, 제외 27장');
