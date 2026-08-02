import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const out = path.resolve('ddangyo-shop-discovery-output');
await fs.rm(out, {recursive: true, force: true});
await fs.mkdir(out, {recursive: true});
const agent = new https.Agent({keepAlive: true});
const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';

function request(requestPath, {method='GET', cookie='', referer='', body='', headers={}}={}) {
  return new Promise((resolve,reject)=>{
    const req=https.request({hostname:'fdofd.ddangyo.com',port:443,path:requestPath,method,agent,headers:{
      'user-agent':ua,'accept-language':'ko-KR,ko;q=0.9,en;q=0.5',...(cookie?{cookie}:{}),...(referer?{referer}:{}),...headers
    },timeout:30000},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));});
    req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',reject);if(body)req.write(body);req.end();
  });
}
function cookieHeader(setCookie=[]){return setCookie.map(v=>String(v).split(';',1)[0]).join('; ')}
function candidates(text){
  const found=[];
  for(const re of [/action=["']([^"']+)["']/g,/src=["']([^"']+)["']/g,/href=["']([^"']+)["']/g,/["'](\/[A-Za-z0-9_./-]+\.(?:xml|js|json|do|wq)(?:\?[^"']*)?)["']/g]){
    for(const m of text.matchAll(re)) found.push(m[1]);
  }
  return [...new Set(found)].filter(Boolean);
}

const token='oZrHJMN';
const landing=await request(`/gateway1.html?${token}`);
const cookie=cookieHeader(landing.headers['set-cookie']||[]);
const referer=`https://fdofd.ddangyo.com/gateway1.html?${token}`;
const resources=['/otc/sh/SH010M01.xml','/otc/sh/SH010M01.js','/otc/sh/SH010M01.xml?menuUrl=/otc/sh/SH010M01.xml&patsto_no=1193774'];
const summary=[];
for(const resourcePath of resources){
  try{
    const result=await request(resourcePath,{cookie,referer,headers:{accept:'application/xml,text/xml,text/html,application/javascript,*/*'}});
    const stem=resourcePath.replace(/[^A-Za-z0-9._-]+/g,'_').slice(0,160);
    await fs.writeFile(path.join(out,`${stem}.txt`),result.body);
    summary.push({resourcePath,status:result.status,bytes:Buffer.byteLength(result.body),contentType:result.headers['content-type']||'',candidates:candidates(result.body),preview:result.body.slice(0,5000)});
  }catch(error){summary.push({resourcePath,error:String(error?.stack||error)});}
}
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary.map(r=>({resourcePath:r.resourcePath,status:r.status,bytes:r.bytes,contentType:r.contentType,candidates:r.candidates?.slice(0,50),error:r.error||''})),null,2));
