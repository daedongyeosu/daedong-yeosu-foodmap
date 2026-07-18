import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directories=['data/photo-batch-1','data/photo-batch-1-compact','data/photo-batch-1-small','data/photo-batch-1-final'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const natural=(a,b)=>a.localeCompare(b,'en',{numeric:true});
const magic=buffer=>buffer.subarray(0,16).toString('hex').match(/.{1,2}/g)?.join(' ')||'';
const typeOf=buffer=>{
  if(buffer.length>=12&&buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')return'webp';
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png';
  if(buffer.subarray(0,3).equals(Buffer.from([255,216,255])))return'jpeg';
  if(buffer.subarray(0,4).toString()==='PK\x03\x04')return'zip';
  if(buffer.subarray(0,2).equals(Buffer.from([31,139])))return'gzip';
  if(buffer.subarray(0,4).toString()==='%PDF')return'pdf';
  const text=buffer.subarray(0,80).toString('utf8').trimStart();
  if(text.startsWith('{')||text.startsWith('['))return'json/text';
  return'unknown';
};
const attempt=(name,fn,buffer)=>{try{const output=fn(buffer);return `${name}: 성공, ${output.length} bytes, type=${typeOf(output)}, magic=${magic(output)}, sha256=${hash(output)}`;}catch(error){return `${name}: 실패 (${error.code||error.message})`;}};

for(const directory of directories){
  const absolute=path.join(root,directory);
  console.log(`\n## ${directory}`);
  if(!fs.existsSync(absolute)){console.log('폴더 없음');continue;}
  const files=fs.readdirSync(absolute).filter(file=>fs.statSync(path.join(absolute,file)).isFile()).sort(natural);
  console.log(`파일 수: ${files.length}`);
  for(const file of files){const content=fs.readFileSync(path.join(absolute,file),'utf8').trim();console.log(`${file}\tchars=${content.length}\tsha256=${hash(content)}\tstart=${content.slice(0,16)}\tend=${content.slice(-16)}`);}
  const joined=files.map(file=>fs.readFileSync(path.join(absolute,file),'utf8').trim()).join('').replace(/\s+/g,'');
  console.log(`결합 문자 수: ${joined.length}, mod4=${joined.length%4}, base64문자=${/^[A-Za-z0-9+/]*={0,2}$/.test(joined)}`);
  let decoded;
  try{decoded=Buffer.from(joined,'base64');console.log(`base64 decode: ${decoded.length} bytes, type=${typeOf(decoded)}, magic=${magic(decoded)}, sha256=${hash(decoded)}`);}catch(error){console.log(`base64 decode 실패: ${error.message}`);continue;}
  console.log(attempt('gunzip',zlib.gunzipSync,decoded));
  console.log(attempt('inflate',zlib.inflateSync,decoded));
  console.log(attempt('inflateRaw',zlib.inflateRawSync,decoded));
  console.log(attempt('brotli',zlib.brotliDecompressSync,decoded));
}
