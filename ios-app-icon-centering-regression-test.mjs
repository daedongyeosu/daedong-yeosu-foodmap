import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

const masterPath = 'ios/AppIcon.png';
const marketingPath = 'ios/DaedongYeosuFoodMap/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png';

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodeRgbaPng(filePath) {
  const png = fs.readFileSync(filePath);
  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');

  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const bitDepth = png[24];
  const colorType = png[25];
  const interlace = png[28];
  assert.equal(bitDepth, 8, `${filePath}은 8비트 PNG여야 합니다.`);
  assert.equal(colorType, 2, `${filePath}은 불투명 RGB PNG여야 합니다.`);
  assert.equal(interlace, 0, `${filePath}은 비인터레이스 PNG여야 합니다.`);

  const idat = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === 'IEND') break;
  }

  const packed = zlib.inflateSync(Buffer.concat(idat));
  const bytesPerPixel = 3;
  const rowBytes = width * bytesPerPixel;
  const pixels = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y += 1) {
    const packedRow = y * (rowBytes + 1);
    const filter = packed[packedRow];
    const row = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = packed[packedRow + 1 + x];
      const left = x >= bytesPerPixel ? pixels[row + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[row - rowBytes + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[row - rowBytes + x - bytesPerPixel] : 0;
      const reconstructed =
        filter === 0 ? raw :
        filter === 1 ? raw + left :
        filter === 2 ? raw + up :
        filter === 3 ? raw + Math.floor((left + up) / 2) :
        filter === 4 ? raw + paeth(left, up, upLeft) :
        assert.fail(`${filePath}에 지원하지 않는 PNG 필터 ${filter}가 있습니다.`);
      pixels[row + x] = reconstructed & 0xff;
    }
  }

  return { width, height, pixels };
}

const master = decodeRgbaPng(masterPath);
assert.deepEqual([master.width, master.height], [1024, 1024]);
assert.deepEqual(fs.readFileSync(masterPath), fs.readFileSync(marketingPath),
  'iOS 마케팅 아이콘은 기준 원본과 완전히 같아야 합니다.');

let minX = master.width;
let minY = master.height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < master.height; y += 1) {
  for (let x = 0; x < master.width; x += 1) {
    const index = (y * master.width + x) * 3;
    const [r, g, b] = master.pixels.subarray(index, index + 3);
    if (r < 248 || g < 248 || b < 248) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

assert.notEqual(maxX, -1, 'iOS 아이콘에 로고가 있어야 합니다.');
const margins = {
  left: minX,
  top: minY,
  right: master.width - 1 - maxX,
  bottom: master.height - 1 - maxY,
};
assert.ok(Math.abs(margins.left - margins.right) <= 2,
  `로고가 가로 중앙이어야 합니다: ${JSON.stringify(margins)}`);
assert.ok(Math.abs(margins.top - margins.bottom) <= 2,
  `로고가 세로 중앙이어야 합니다: ${JSON.stringify(margins)}`);
assert.ok(margins.left >= 40 && margins.left <= 90,
  `가로 여백은 로고가 충분히 크면서 잘리지 않는 범위여야 합니다: ${JSON.stringify(margins)}`);
assert.ok(margins.top >= 40 && margins.top <= 90,
  `세로 여백은 로고가 충분히 크면서 잘리지 않는 범위여야 합니다: ${JSON.stringify(margins)}`);

console.log(`PASS: iOS 앱 아이콘 중앙 정렬 (${JSON.stringify(margins)})`);
