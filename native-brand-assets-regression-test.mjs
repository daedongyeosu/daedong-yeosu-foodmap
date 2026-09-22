import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path);
const text = path => fs.readFileSync(path, 'utf8');
const iosIconGenerator = text('ios/scripts/generate_app_icons.sh');
const iosWorkflow = text('.github/workflows/build-ios.yml');
const pngSize = path => {
  const image = read(path);
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG', `${path} must be a PNG`);
  return [image.readUInt32BE(16), image.readUInt32BE(20), image[25]];
};

assert.deepEqual(pngSize('ios/AppIcon.png').slice(0, 2), [1024, 1024], 'iOS icon source must use the approved compact logo');
assert.match(iosIconGenerator, /"\$IOS_DIR\/AppIcon\.png"/, 'iOS icons must be generated from the approved compact PNG');
assert.match(iosIconGenerator, /-alpha remove -alpha off -type TrueColor "PNG24:\$opaque_icon"/, 'generated iOS icons must not contain an alpha channel');
assert.match(iosWorkflow, /brew install xcodegen librsvg imagemagick/, 'iOS builds must install the opaque PNG converter');

const iosIcons = {
  'AppIcon-20@2x.png': 40,
  'AppIcon-20@3x.png': 60,
  'AppIcon-29@2x.png': 58,
  'AppIcon-29@3x.png': 87,
  'AppIcon-40@2x.png': 80,
  'AppIcon-40@3x.png': 120,
  'AppIcon-60@2x.png': 120,
  'AppIcon-60@3x.png': 180,
  'AppIcon-1024.png': 1024
};
for (const [file, size] of Object.entries(iosIcons)) {
  const path = `ios/DaedongYeosuFoodMap/Assets.xcassets/AppIcon.appiconset/${file}`;
  assert.deepEqual(pngSize(path), [size, size, 2], `${file} must be opaque RGB at the declared size`);
}

const android = JSON.parse(text('android/twa-manifest.json'));
assert.equal(android.name, '대동맵');
assert.equal(android.launcherName, '대동맵');
assert.equal(android.appVersionName, '1.0.13');
assert.equal(android.appVersionCode, 16);

assert.match(text('ios/DaedongYeosuFoodMap/Info.plist'), /<key>CFBundleDisplayName<\/key>\s*<string>대동맵<\/string>/);
assert.match(text('ios/project.yml'), /MARKETING_VERSION: "1\.1"/);

const index = text('index.html');
assert.doesNotMatch(index, /daedong-share-lightning-20260909/);
assert.match(index, /assets\/brand\/daedongmap-share-1200x630\.png/);

console.log('Native and shared Daedongmap brand assets regression: PASS');
