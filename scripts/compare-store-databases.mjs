import fs from 'node:fs';
import path from 'node:path';

const [currentFile,candidateFile,outputFile='db790-comparison.json']=process.argv.slice(2);
if(!currentFile||!candidateFile)throw new Error('사용법: node compare-store-databases.mjs current.json candidate.json [output.json]');
const current=JSON.parse(fs.readFileSync(currentFile,'utf8'));
const candidate=JSON.parse(fs.readFileSync(candidateFile,'utf8'));
const normalize=value=>String(value??'').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
const coverage=stores=>{
  const routeCounts={};let withImage=0,withPhone=0,withMap=0,withAddress=0,withCoords=0;
  for(const store of stores){
    if(String(store.image||'').trim())withImage++;
    if(String(store.phone||'').trim())withPhone++;
    if(String(store.naverMap||'').trim())withMap++;
    if(String(store.address||'').trim())withAddress++;
    const lat=store.latitude??store.lat,lng=store.longitude??store.lng;
    if(String(lat??'').trim()&&String(lng??'').trim())withCoords++;
    for(const route of store.routes||[]){if(route?.enabled!==false&&route?.url)routeCounts[route.name]=(routeCounts[route.name]||0)+1;}
  }
  return {count:stores.length,withImage,withPhone,withMap,withAddress,withCoords,routeCounts};
};
const duplicateValues=(stores,keyFn)=>{const counts=new Map();for(const store of stores){const key=keyFn(store);if(!key)continue;counts.set(key,(counts.get(key)||0)+1);}return [...counts].filter(([,count])=>count>1).map(([value,count])=>({value,count}));};
const currentIds=new Map(current.map(store=>[String(store.id||''),store]).filter(([id])=>id));
const candidateIds=new Map(candidate.map(store=>[String(store.id||''),store]).filter(([id])=>id));
const currentNames=new Map(current.map(store=>[normalize(store.name),store]).filter(([name])=>name));
const candidateNames=new Map(candidate.map(store=>[normalize(store.name),store]).filter(([name])=>name));
const intersection=(left,right)=>[...left.keys()].filter(key=>right.has(key));
const difference=(left,right)=>[...left.keys()].filter(key=>!right.has(key));
const report={
  generatedAt:new Date().toISOString(),
  files:{current:path.resolve(currentFile),candidate:path.resolve(candidateFile)},
  current:coverage(current),candidate:coverage(candidate),
  duplicates:{
    currentIds:duplicateValues(current,store=>String(store.id||'')),
    candidateIds:duplicateValues(candidate,store=>String(store.id||'')),
    currentNames:duplicateValues(current,store=>normalize(store.name)),
    candidateNames:duplicateValues(candidate,store=>normalize(store.name))
  },
  overlap:{
    byId:intersection(currentIds,candidateIds).length,
    byNormalizedName:intersection(currentNames,candidateNames).length
  },
  onlyCurrent:{
    ids:difference(currentIds,candidateIds),
    names:difference(currentNames,candidateNames).map(key=>currentNames.get(key)?.name)
  },
  onlyCandidate:{
    ids:difference(candidateIds,currentIds),
    names:difference(candidateNames,currentNames).map(key=>candidateNames.get(key)?.name)
  }
};
fs.writeFileSync(outputFile,JSON.stringify(report,null,2));
console.log(`[DB 비교] 현재 ${report.current.count} / 후보 ${report.candidate.count}`);
console.log(`ID 중복: 현재 ${report.duplicates.currentIds.length}, 후보 ${report.duplicates.candidateIds.length}`);
console.log(`이름 중복: 현재 ${report.duplicates.currentNames.length}, 후보 ${report.duplicates.candidateNames.length}`);
console.log(`겹침: ID ${report.overlap.byId}, 이름 ${report.overlap.byNormalizedName}`);
console.log(`현재에만 있는 이름: ${report.onlyCurrent.names.length}`);
console.log(`후보에만 있는 이름: ${report.onlyCandidate.names.length}`);
console.log(`[현재 품질] 사진 ${report.current.withImage}, 전화 ${report.current.withPhone}, 지도 ${report.current.withMap}, 주소 ${report.current.withAddress}, 좌표 ${report.current.withCoords}`);
console.log(`[후보 품질] 사진 ${report.candidate.withImage}, 전화 ${report.candidate.withPhone}, 지도 ${report.candidate.withMap}, 주소 ${report.candidate.withAddress}, 좌표 ${report.candidate.withCoords}`);
console.log(`상세 보고서: ${outputFile}`);
