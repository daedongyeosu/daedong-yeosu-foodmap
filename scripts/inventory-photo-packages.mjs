import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const walk=(dir,depth=3)=>{
  const absolute=path.join(root,dir);
  if(!fs.existsSync(absolute))return [];
  const output=[];
  const visit=(current,remaining)=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true})){
      const full=path.join(current,entry.name);
      if(entry.isDirectory()&&remaining>0)visit(full,remaining-1);
      else if(entry.isFile())output.push(path.relative(root,full).replaceAll('\\','/'));
    }
  };
  visit(absolute,depth);
  return output.sort();
};

const first=walk('data/photo-batch-1-final',1);
const photoData=walk('data',3).filter(file=>/photo|sprite|manifest|image/i.test(file));
const notion=walk('images/notion-stores',1);
const expected=Array.from({length:22},(_,index)=>`data/photo-batch-1-final/sprite-part-${String(index+1).padStart(2,'0')}.txt`);
const expectedSet=new Set(expected);
const existingExpected=expected.filter(file=>fs.existsSync(path.join(root,file)));
const missingExpected=expected.filter(file=>!fs.existsSync(path.join(root,file)));
const extraFirst=first.filter(file=>!expectedSet.has(file));

console.log('[1차 사진 패키지 실제 파일]');
console.log(`전체 파일 수: ${first.length}`);
for(const file of first)console.log(file);
console.log('\n[표준 조각 현황]');
console.log(`존재: ${existingExpected.length}/22`);
console.log(`존재 번호: ${existingExpected.map(file=>path.basename(file)).join(', ')||'없음'}`);
console.log(`누락 번호: ${missingExpected.map(file=>path.basename(file)).join(', ')||'없음'}`);
console.log(`기타 파일: ${extraFirst.join(', ')||'없음'}`);
console.log('\n[사진 관련 data 파일]');
for(const file of photoData)console.log(file);
console.log('\n[노션 사진]');
console.log(`images/notion-stores 파일 수: ${notion.length}`);
