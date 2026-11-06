import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const source=read('service-launch-status.js'),home=read('index.html');
for(const name of ['errand','online-store','neighbor-market']){
 const entry=home.match(new RegExp('<(?:div|section)[^>]*data-service-planned="'+name+'"[\\s\\S]*?</(?:div|section)>'))?.[0];
 assert.ok(entry,name+' visible announcement');assert.match(entry,/오픈 예정/);assert.doesNotMatch(entry,/<a\b|<form\b/);
}
for(const folder of ['errand','online-store','store-partner','store-manager','shop-owners','store-alley','store-studio','neighbor-market']){
 const html=read(folder+'/index.html');assert.ok(html.indexOf('service-launch-status.js')<html.indexOf('</head>'));
 let target='';vm.runInNewContext(source,{location:{pathname:'/'+folder+'/',replace:value=>target=value}});
 assert.equal(target,'/coming-soon/?service='+folder);
}
for(const pathname of ['/','/delivery/','/guide/','/info/'])vm.runInNewContext(source,{location:{pathname,replace(){throw Error('existing page redirected')}}});
assert.match(read('coming-soon/index.html'),/오픈 예정/);
console.log('PASS service announcements remain visible; all direct service URLs lead to opening notice; existing pages stay open');
