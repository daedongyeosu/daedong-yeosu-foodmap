import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /key: '빙수'[\s\S]*?queries: \['빙수', '설빙'\][\s\S]*?terms: \['빙수', '설빙'\]/);
assert.match(source, /key: '김밥'[\s\S]*?queries: \['김밥', '김빱', '주먹밥'\][\s\S]*?terms: \[[^\]]*'꼬마김밥'[^\]]*'충무김밥'[^\]]*'삼각김밥'[^\]]*'주먹밥'/);
assert.match(source, /function menuSearchQueries\(query\)[\s\S]*?new Set\(\(spec\.queries/);
assert.match(source, /function mergeMenuSearchResults\(results\)[\s\S]*?seen\.has\(itemId\)[\s\S]*?target\.i\.push\(item\)/);
assert.match(source, /Promise\.all\(searchQueries\.map\(searchQuery => \([\s\S]*?menuSearch\(searchQuery/);
assert.match(html, /grounded-menu-search-2-menu-family-synonyms-1/);

console.log('menu family synonyms regression: PASS');
