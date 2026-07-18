import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8')+'\n;globalThis.__test={normalize,routeKey,normalizedStore,PhotoResolver,haversine,uniquePaths,loadSavedLocation};';
const memory=new Map();
const context={
  console,URL,Math,Number,String,Boolean,Array,Object,Map,Set,Date,RegExp,JSON,
  localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))},
  location:{href:'https://example.test/'},
  document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},createRange:()=>({createContextualFragment:value=>value})},
  navigator:{},history:{},window:{addEventListener:()=>{}},scrollTo:()=>{},setTimeout:()=>{},clearInterval:()=>{},setInterval:()=>1,
  HTMLImageElement:class {}
};
vm.createContext(context);vm.runInContext(source,context,{filename:'app.js'});
const {normalize,routeKey,normalizedStore,PhotoResolver,haversine,uniquePaths,loadSavedLocation}=context.__test;
const assert=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message);};

assert(normalize(' 여서동 · 치킨 ')==='여서동치킨','검색어 정규화');
assert(routeKey('CHAK 지역상품권')==='chak','지역상품권 경로 분류');
assert(routeKey('배달의민족')==='baemin','배달 3사 경로 분류');
const store=normalizedStore({id:'1',name:'긴 가게',district:'여서동',category:'치킨',image:'images/사업자등록증.png',images:[{card:'images/food-1.webp',detail:'images/food-1.webp'},'images/food-2.webp'],routes:[{name:'먹깨비',url:'https://example.com',enabled:true}]},0);
assert(store.routes.length===1,'유효 주문주소 유지');
assert(store.legacyImages.length===3,'가게별 사진 목록 정규화');
assert(uniquePaths(['a.webp',{card:'a.webp'},{detail:'b.webp'}]).join(',')==='a.webp,b.webp','사진 경로 중복 제거');
const emptyCoords=normalizedStore({id:'2',name:'좌표없음',latitude:'',longitude:''},1);
assert(emptyCoords.lat===null&&emptyCoords.lng===null,'빈 좌표는 미등록 처리');
const policy={allowedClassifications:['food'],blockedClassifications:['sensitive_document','price_list','receipt','personal_information','non_food'],blockedPathKeywords:['사업자등록','가격표','영수증'],requireExplicitAllowForPackageEntries:true};
let resolver=new PhotoResolver({entries:[]},policy);
assert(resolver.resolve(store)?.src==='images/food-1.webp','민감 대표사진 차단 후 안전한 가게별 사진 사용');
resolver=new PhotoResolver({entries:[{storeId:'1',src:'images/food.png',gallery:['images/food.png','images/food-2.webp'],source:'photo-batch-2',classification:'food'}]},policy);
assert(resolver.resolveGallery(store).length===2,'검수된 상세사진 갤러리');
resolver=new PhotoResolver({entries:[{storeId:'1',src:'images/doc.png',source:'photo-batch-2',classification:'sensitive_document'}]},policy);
assert(resolver.resolve(store)?.src==='images/food-1.webp','민감 분류 패키지 사진 차단 후 안전 대체사진');
const distance=haversine({lat:34.75,lng:127.70},{lat:34.76,lng:127.71});
assert(distance>1&&distance<2,'거리 계산');
memory.set('savedLocation',JSON.stringify({label:'현재 위치 기준',coords:{lat:34.7,lng:127.7},sortByDistance:true}));
const saved=loadSavedLocation();
assert(saved.label==='현재 위치 기준'&&saved.sortByDistance&&saved.coords.lat===34.7,'위치·주소 저장값 복원');
console.log('PASS unit tests complete');
