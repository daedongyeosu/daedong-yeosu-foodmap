import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8')+'\n;globalThis.__test={normalize,routeKey,normalizedStore,PhotoResolver,haversine};';
const listeners=[];
const context={
  console,URL,Math,Number,String,Boolean,Array,Object,Map,Set,Date,RegExp,JSON,
  localStorage:{getItem:()=>null,setItem:()=>{}},location:{href:'https://example.test/'},
  document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners.push([name,fn]),createRange:()=>({createContextualFragment:value=>value})},
  navigator:{},history:{},window:{addEventListener:()=>{}},scrollTo:()=>{},setTimeout:()=>{},clearInterval:()=>{},setInterval:()=>1,
  HTMLImageElement:class {}
};
vm.createContext(context);vm.runInContext(source,context,{filename:'app.js'});
const {normalize,routeKey,normalizedStore,PhotoResolver,haversine}=context.__test;
const assert=(condition,message)=>{if(!condition)throw new Error(message);console.log('PASS',message);};

assert(normalize(' 여서동 · 치킨 ')==='여서동치킨','검색어 정규화');
assert(routeKey('CHAK 지역상품권')==='chak','주문경로 분류');
const store=normalizedStore({id:'1',name:'긴 가게',district:'여서동',category:'치킨',image:'images/사업자등록증.png',routes:[{name:'먹깨비',url:'https://example.com',enabled:true}]},0);
assert(store.routes.length===1,'유효 주문주소 유지');
const policy={allowedClassifications:['food'],blockedClassifications:['sensitive_document','price_list','non_food'],blockedPathKeywords:['사업자등록','가격표'],requireExplicitAllowForPackageEntries:true};
let resolver=new PhotoResolver({entries:[]},policy);
assert(resolver.resolve(store)===null,'민감서류 파일명 차단');
resolver=new PhotoResolver({entries:[{storeId:'1',src:'images/food.png',source:'photo-batch-1-final',classification:'food'}]},policy);
assert(resolver.resolve(store)?.src==='images/food.png','검수된 음식사진 우선 매칭');
resolver=new PhotoResolver({entries:[{storeId:'1',src:'images/doc.png',source:'photo-batch-2',classification:'sensitive_document'}]},policy);
assert(resolver.resolve(store)===null,'민감 분류 사진 차단');
const distance=haversine({lat:34.75,lng:127.70},{lat:34.76,lng:127.71});
assert(distance>1&&distance<2,'거리 계산');
console.log('PASS unit tests complete');
