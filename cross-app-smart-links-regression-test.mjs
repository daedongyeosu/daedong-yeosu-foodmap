import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const infoPlist = fs.readFileSync('ios/DaedongYeosuFoodMap/Info.plist', 'utf8');
const contentView = fs.readFileSync('ios/DaedongYeosuFoodMap/ContentView.swift', 'utf8');
const webView = fs.readFileSync('ios/DaedongYeosuFoodMap/DaedongWebView.swift', 'utf8');

const requiredAppFragments = [
  "const YEOSU_GAGE_ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.yeosugage.app'",
  "const YEOSU_GAGE_IOS_URL = 'https://apps.apple.com/kr/app/id6814774577'",
  "const YEOSU_GAGE_SCHEME_URL = 'yeosugage://open?source=daedongmap'",
  'function openYeosuGageApp()',
  'package=com.yeosugage.app',
  'data-open-yeosu-gage',
  '아이폰은 App Store, 안드로이드는 Google Play',
];
for (const fragment of requiredAppFragments) {
  if (!app.includes(fragment)) throw new Error(`Missing smart Yeosu Gage link fragment: ${fragment}`);
}
if (app.includes('Google Play에서 여수가게 보기')) {
  throw new Error('The Yeosu Gage gateway is still hard-wired to Google Play.');
}
if (!infoPlist.includes('<string>daedongmap</string>')) {
  throw new Error('The iOS food-map custom URL scheme is missing.');
}
if (!contentView.includes('.onOpenURL') || !contentView.includes('store.openDeepLink(url)')) {
  throw new Error('The iOS app does not receive incoming food-map links.');
}
for (const fragment of ['func openDeepLink(_ url: URL)', 'https://daedongmap.com/', "name: \"store\""]) {
  if (!webView.includes(fragment)) throw new Error(`Missing iOS food-map deep-link fragment: ${fragment}`);
}

console.log('PASS cross-app smart links use installed apps first with platform stores as fallback');
