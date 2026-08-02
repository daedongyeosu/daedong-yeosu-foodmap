import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const stores=[
  {token:'oZrHJMN',patstoNo:'1193774',name:'쌀통닭 무선점'},
  {token:'LZJOYiQ',patstoNo:'1297094',name:'기영이숯불두마리치킨 여수여천점'},
  {token:'h3rPiwO',patstoNo:'1173653',name:'아주커치킨 둔덕점'}
];
const out=path.resolve('ddangyo-shop-data-output');
await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
const agent=new https.Agent({keepAlive:true});
const ua='Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';
function request(requestPath,{method='GET',cookie='',referer='',body='',headers={}}={}){return new Promise((resolve,reject)=>{const req=https.request({hostname:'fdofd.ddangyo.com',port:443,path:requestPath,method,agent,headers:{'user-agent':ua,'accept-language':'ko-KR,ko;q=0.9,en;q=0.5',...(cookie?{cookie}:{}),...(referer?{referer}:{}),...headers},timeout:30000},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));});req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',reject);if(body)req.write(body);req.end();});}
const cookies=(values=[])=>values.map(v=>String(v).split(';',1)[0]).join('; ');
async function postApi(api,payload,{cookie,referer}){const body=JSON.stringify(payload);return request(api,{method:'POST',cookie,referer,body,headers:{accept:'application/json, text/plain, */*','content-type':'application/json;charset=UTF-8','content-length':Buffer.byteLength(body),origin:'https://fdofd.ddangyo.com',authorization:'','uuid-token':'GTY0000000','app-token':'GTY0000000','app-name':'O2O','app-os':'WEB','x-requested-with':'XMLHttpRequest'}})}
function json(text){try{return JSON.parse(text)}catch(error){return {parseError:String(error),raw:text}}}
function resultOf(value){return value?.result||value||{}}
const summary=[];
for(const store of stores){
  const referer=`https://fdofd.ddangyo.com/gateway1.html?${store.token}`;
  try{
    const landing=await request(`/gateway1.html?${store.token}`);const cookie=cookies(landing.headers['set-cookie']||[]);
    const search={login_mbr_id:'',patsto_no:store.patstoNo,admtn_dong_cd:'',map_latt:'',map_lngt:'',patsto_tab_div_cd:'01',exps_chan:'01',rest_patsto_yn:'N'};
    const homeRes=await postApi('/shop/home',{dma_shop_search:search},{cookie,referer});const home=json(homeRes.body);const homeResult=resultOf(home);const homeInfo=homeResult.dma_shop_home_info||{};
    search.rest_patsto_yn=homeInfo.rest_patsto_yn||'N';
    const menuRes=await postApi('/shop/homemenu',{dma_shop_search:search},{cookie,referer});const menu=json(menuRes.body);const menuResult=resultOf(menu);
    const row={
      ...store,landingStatus:landing.status,homeStatus:homeRes.status,menuStatus:menuRes.status,
      homeResultCode:home.result_code||'',menuResultCode:menu.result_code||'',
      homeInfo,shopImages:homeResult.shop_img_list||[],shopVideo:homeResult.dma_shop_home_vd_od_info||{},
      menuGroups:menuResult.menu_grp_list||[],menus:menuResult.menu_list||[],menuPrices:menuResult.menu_prc_list||[],
      homeRaw:home,menuRaw:menu
    };
    await fs.writeFile(path.join(out,`${store.patstoNo}.json`),JSON.stringify(row,null,2));
    summary.push({patstoNo:store.patstoNo,name:store.name,homeStatus:homeRes.status,homeCode:home.result_code||'',returnedName:homeInfo.patsto_nm||'',address:homeInfo.bas_addr||'',menuStatus:menuRes.status,menuCode:menu.result_code||'',groups:row.menuGroups.length,menus:row.menus.length,images:row.menus.filter(m=>m.menu_img_file).length,phoneFields:Object.fromEntries(Object.entries(homeInfo).filter(([k])=>/tel|phone|cntc|call/i.test(k)))});
  }catch(error){summary.push({...store,error:String(error?.stack||error)});}
}
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
