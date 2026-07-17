import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const skip=new Set(['.git','node_modules','images','assets','build']);
const candidates=[];
const walk=directory=>{
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(skip.has(entry.name))continue;
    const full=path.join(directory,entry.name);
    if(entry.isDirectory())walk(full);
    else if(/\.(json|csv|tsv|xlsx?|html?|js|mjs)$/i.test(entry.name))candidates.push(full);
  }
};
walk(root);

console.log('[데이터 소스 후보]');
for(const full of candidates.sort()){
  const relative=path.relative(root,full).replaceAll('\\','/');
  const stat=fs.statSync(full);
  let detail='';
  if(/\.json$/i.test(full)){
    try{const parsed=JSON.parse(fs.readFileSync(full,'utf8'));detail=Array.isArray(parsed)?` array=${parsed.length}`:` objectKeys=${Object.keys(parsed).length}`;}catch{detail=' invalid-json';}
  }else if(/\.(csv|tsv)$/i.test(full)){
    const text=fs.readFileSync(full,'utf8');detail=` lines=${text.split(/\r?\n/).filter(Boolean).length}`;
  }
  console.log(`${relative}\tbytes=${stat.size}${detail}`);
}
