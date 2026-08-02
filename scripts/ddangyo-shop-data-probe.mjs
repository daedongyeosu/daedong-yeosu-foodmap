import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import {URLSearchParams} from 'node:url';

const tokens=`8rrtFnv oZrHJMN LZJOYiQ h3rPiwO 7qEHjBv agaDVy9 n8fubo6 W3C2xOs KXMaAWm s64ZuPD 5v5g0Sx 40ACKvK AkdMHga J1z92gs LGe0H32 Why0WW1 s3saAXs XTVAJ3q gOaJqWQ 1grBeHv 5z5oUHy C5v1Sz5 CRqRegz Dg0bqrG n8F0Vm2 d4AymKz TQXhH05 bMUAAyS 2uVT3uw m6K22Qq VQ4zuwg eRKUQXj C7u3wNg 1iMTpT9 MFgCs9y DLnSWu2 chdPUvz ktXdR4d LShgUuJ KVGcLcX kUUZmfn Z9BzWOD OH8fFct neqPkqv Sb9qXy6 h3e2OiA RjTqfSx 3ymeMR3 oOKK91R czycr95 BC2YUSz 6Dy6MpV zyC7mcw nf2nuG5 bD5tpYT CJ7Lfgw JmfKHwo 00RUe3y i0fxfXs szNA6iZ fNFjCFg fG2C2oa x9nuAxX O103ro4 vYrFYv3 wOxD8Lf DoRPe5P 6G9uvGV CbMsswm CvS9WdS uQ3cazC P8J3tN8 bGje9zQ QktNckc 9RD9885 BQEZsix be2Z2Z8 7Mram6G cheVei2 n5AXW9n 24Ffc62`.trim().split(/\s+/);
const out=path.resolve('ddangyo-shop-data-output');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const agent=new https.Agent({keepAlive:true,maxSockets:4});
const ua='Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';
const headersBase={accept:'application/json, text/plain, */*','content-type':'application/json;charset=UTF-8',origin:'https://fdofd.ddangyo.com',authorization:'','uuid-token':'GTY0000000','app-token':'GTY0000000','app-name':'O2O','app-os':'WEB','x-requested-with':'XMLHttpRequest'};

function request(requestPath,{method='GET',cookie='',referer='',body='',headers={}}={}){return new Promise((resolve,reject)=>{const req=https.request({hostname:'fdofd.ddangyo.com',port:443,path:requestPath,method,agent,headers:{'user-agent':ua,'accept-language':'ko-KR,ko;q=0.9,en;q=0.5',...(cookie?{cookie}:{}),...(referer?{referer}:{}),...headers},timeout:30000},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));});req.on('timeout',()=>req.destroy(new Error(`timeout ${requestPath}`)));req.on('error',reject);if(body)req.write(body);req.end();});}
const cookieHeader=(values=[])=>values.map(v=>String(v).split(';',1)[0]).join('; ');
async function postApi(api,payload,{cookie='',referer='' }={}){const body=JSON.stringify(payload);return request(api,{method:'POST',cookie,referer,body,headers:{...headersBase,'content-length':Buffer.byteLength(body)}})}
function parse(text){try{return JSON.parse(text)}catch(error){return {result:null,result_code:'PARSE',message:String(error),raw:text}}}
function cleanName(value){return String(value||'').trim().replace(/\s+/g,' ')}
function cleanAddress(value){return String(value||'').replace(/전남광주통합특별시/g,'전남').replace(/전라남도/g,'전남').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim()}
function nameKey(value){return cleanName(value).toLocaleLowerCase('ko-KR').replace(/[\s·&()\-_/.,]/g,'')}
function addressKey(value){return cleanAddress(value).toLocaleLowerCase('ko-KR').replace(/^(전남|전라남도)/,'').replace(/[\s·,]/g,'')}
function sourceId(row){return String(row?.id||row?.store_id||row?.storeId||'')}
function sourceName(row){return cleanName(row?.name||row?.store_name||row?.storeName||row?.realBusinessName||'')}
function sourceAddress(row){return cleanAddress(row?.address||row?.roadAddress||row?.road_address||'')}

async function resolveToken(token){
  const referer=`https://fdofd.ddangyo.com/gateway1.html?${token}`;
  let cookie='';
  let response=await postApi('/shorturl/view',{dma_request:{short_url:token}},{referer});
  let value=parse(response.body);let info=value?.result?.dma_short_url_info;
  if(!info?.origin_url){const landing=await request(`/gateway1.html?${token}`);cookie=cookieHeader(landing.headers['set-cookie']||[]);response=await postApi('/shorturl/view',{dma_request:{short_url:token}},{cookie,referer});value=parse(response.body);info=value?.result?.dma_short_url_info;}
  if(!info?.origin_url)throw new Error(`${token}: ${value?.message||'short URL unresolved'}`);
  const params=new URLSearchParams(info.origin_url);
  return {token,sourceUrl:referer,patstoNo:params.get('patsto_no')||'',patstoName:cleanName(params.get('patsto_nm')||''),menuUrl:params.get('menuUrl')||'',cookie};
}

const resolved=[];
for(let i=0;i<tokens.length;i+=1){try{resolved.push(await resolveToken(tokens[i]));console.log(`resolve ${i+1}/${tokens.length} ${tokens[i]} ${resolved.at(-1).patstoName}`)}catch(error){resolved.push({token:tokens[i],sourceUrl:`https://fdofd.ddangyo.com/gateway1.html?${tokens[i]}`,error:String(error)})}await new Promise(r=>setTimeout(r,80));}
const uniqueMap=new Map();
for(const row of resolved.filter(r=>r.patstoNo)){if(!uniqueMap.has(row.patstoNo))uniqueMap.set(row.patstoNo,{patstoNo:row.patstoNo,patstoName:row.patstoName,menuUrl:row.menuUrl,tokens:[],sourceUrls:[]});const item=uniqueMap.get(row.patstoNo);item.tokens.push(row.token);item.sourceUrls.push(row.sourceUrl);}
const uniqueStores=[...uniqueMap.values()];

let currentStores=[];
try{const value=JSON.parse(await fs.readFile('data/stores.json','utf8'));currentStores=Array.isArray(value)?value:(value.stores||value.data||[]);}catch(error){console.error('stores.json read failed',error);}
try{const value=JSON.parse(await fs.readFile('data/store-coordinates.json','utf8'));const rows=Array.isArray(value)?value:(value.stores||value.data||Object.values(value));const byId=new Map(rows.map(row=>[sourceId(row),row]));currentStores=currentStores.map(row=>{const extra=byId.get(sourceId(row));return !sourceAddress(row)&&extra?{...row,address:sourceAddress(extra)}:row});}catch{}

function matchCurrentStore(shop){
  const targetAddress=addressKey(shop.address);const targetName=nameKey(shop.name);
  const byAddress=targetAddress?currentStores.filter(row=>addressKey(sourceAddress(row))===targetAddress):[];
  if(byAddress.length===1)return {status:'existing',method:'exact-address',storeId:sourceId(byAddress[0]),storeName:sourceName(byAddress[0])};
  if(byAddress.length>1){const compatible=byAddress.filter(row=>{const key=nameKey(sourceName(row));return key===targetName||key.includes(targetName)||targetName.includes(key)});if(compatible.length===1)return {status:'existing',method:'exact-address-and-compatible-name',storeId:sourceId(compatible[0]),storeName:sourceName(compatible[0])};return {status:'review',method:'shared-address',candidates:byAddress.map(row=>({storeId:sourceId(row),storeName:sourceName(row),address:sourceAddress(row)}))};}
  const byName=currentStores.filter(row=>nameKey(sourceName(row))===targetName);
  if(byName.length===1)return {status:'review',method:'unique-name-address-missing-or-different',storeId:sourceId(byName[0]),storeName:sourceName(byName[0]),currentAddress:sourceAddress(byName[0])};
  return {status:'new',method:'no-address-match'};
}

const extracted=[];
for(let i=0;i<uniqueStores.length;i+=1){const source=uniqueStores[i];const referer=source.sourceUrls[0];try{
  const landing=await request(`/gateway1.html?${source.tokens[0]}`);const cookie=cookieHeader(landing.headers['set-cookie']||[]);
  const search={login_mbr_id:'',patsto_no:source.patstoNo,admtn_dong_cd:'4613078000',map_latt:'34.7600000',map_lngt:'127.6600000',patsto_tab_div_cd:'01',exps_chan:'01',rest_patsto_yn:'N'};
  const homeResponse=await postApi('/shop/home',{dma_shop_search:search},{cookie,referer});const home=parse(homeResponse.body);const homeResult=home?.result||{};const homeInfo=homeResult.dma_shop_home_info||{};
  if(home.result_code!=='0000')throw new Error(`home ${home.result_code} ${home.message||''}`);
  search.rest_patsto_yn=homeInfo.rest_patsto_yn||'N';
  const menuResponse=await postApi('/shop/homemenu',{dma_shop_search:search},{cookie,referer});const menu=parse(menuResponse.body);const menuResult=menu?.result||{};
  if(menu.result_code!=='0000')throw new Error(`menu ${menu.result_code} ${menu.message||''}`);
  const groups=(menuResult.menu_grp_list||[]).map(group=>({id:String(group.menu_grp_id||''),name:cleanName(group.menu_grp_nm||'기타'),description:cleanName(group.menu_grp_expl||''),sortOrder:Number(group.sort_ord||0),alcohol:group.alc_menu_grp_yn==='1'}));
  const groupMap=new Map(groups.map(group=>[group.id,group.name]));
  const items=(menuResult.menu_list||[]).filter(item=>item.hide_yn!=='1').map((item,index)=>({id:`ddangyo-${source.patstoNo}-${item.menu_id||index+1}`,sourceMenuId:String(item.menu_id||''),name:cleanName(item.menu_nm),description:cleanName(item.menu_cmps_cont||''),category:groupMap.get(String(item.menu_grp_id||''))||'기타',image:String(item.menu_img_file||''),popular:item.pplrt_menu_yn==='1',recommended:item.rcmd_yn==='1',soldOut:item.sldot_yn==='1',alcohol:item.alc_menu_yn==='1'}));
  const shopImages=(homeResult.shop_img_list||[]).map(row=>String(row.rpsnt_img_file_nm||'')).filter(Boolean);
  const normalized={patstoNo:source.patstoNo,name:cleanName(homeInfo.patsto_nm||source.patstoName),address:cleanAddress(homeInfo.bas_addr),latitude:String(homeInfo.map_latt||''),longitude:String(homeInfo.map_lngt||''),businessStatus:cleanName(homeInfo.biz_stat_nm||''),businessHours:cleanName(homeInfo.biz_time_string||''),category:cleanName(homeInfo.rpsnt_cat_nm||'치킨'),sourceTokens:source.tokens,sourceUrls:source.sourceUrls,mainImage:shopImages[0]||items.find(item=>item.image)?.image||'',shopImages,categories:['전체',...groups.filter(group=>group.id!=='00000000').sort((a,b)=>a.sortOrder-b.sortOrder).map(group=>group.name)],items,sourceStats:{menuGroups:groups.length,menus:items.length,menuImages:items.filter(item=>item.image).length,shopImages:shopImages.length}};
  normalized.match=matchCurrentStore(normalized);extracted.push(normalized);
  await fs.writeFile(path.join(out,`${source.patstoNo}.json`),JSON.stringify(normalized,null,2));
  console.log(`shop ${i+1}/${uniqueStores.length} ${normalized.name} menus=${items.length} match=${normalized.match.status}/${normalized.match.method}`);
}catch(error){extracted.push({...source,error:String(error?.stack||error)});console.error(`shop ${i+1}/${uniqueStores.length} ${source.patstoName} failed`,error)}await new Promise(r=>setTimeout(r,100));}

const report={generatedAt:new Date().toISOString(),batchId:'ddangyo-chicken-batch-01',tokenCount:tokens.length,resolvedTokenCount:resolved.filter(r=>r.patstoNo).length,uniqueStoreCount:uniqueStores.length,extractedStoreCount:extracted.filter(r=>!r.error).length,totalMenus:extracted.reduce((sum,row)=>sum+(row.items?.length||0),0),totalMenuImages:extracted.reduce((sum,row)=>sum+(row.sourceStats?.menuImages||0),0),matchSummary:{existing:extracted.filter(r=>r.match?.status==='existing').length,review:extracted.filter(r=>r.match?.status==='review').length,new:extracted.filter(r=>r.match?.status==='new').length,failed:extracted.filter(r=>r.error).length},stores:extracted.map(row=>row.error?{patstoNo:row.patstoNo,name:row.patstoName,error:row.error}:{patstoNo:row.patstoNo,name:row.name,address:row.address,menus:row.sourceStats.menus,menuImages:row.sourceStats.menuImages,shopImages:row.sourceStats.shopImages,match:row.match,sourceUrls:row.sourceUrls})};
await fs.writeFile(path.join(out,'normalized-all.json'),JSON.stringify(extracted,null,2));await fs.writeFile(path.join(out,'match-report.json'),JSON.stringify(report,null,2));await fs.writeFile(path.join(out,'resolved-links.json'),JSON.stringify(resolved,null,2));console.log(JSON.stringify({...report,stores:undefined},null,2));
