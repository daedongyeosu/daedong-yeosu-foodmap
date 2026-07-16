import json
import math
import os
from pathlib import Path

from PIL import Image, ImageStat

MANIFEST_PATH = Path(os.environ.get('PHOTO_MANIFEST_PATH', 'data/photo-manifest.json'))
STORES_PATH = Path(os.environ.get('STORES_PATH', 'data/stores.json'))
REPORT_PATH = Path(os.environ.get('PHOTO_FILTER_REPORT_PATH', 'data/photo-filter-report.json'))

NOISY_FOLDER_WORDS = (
    'chatgpt대화', 'qr게이트 화면', '화면캡처', '스크린샷', '메뉴판', '가격표',
    '전단지', '명함', '노션배너', '상세페이지', '주문화면', '앱화면'
)


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


def image_metrics(path: Path):
    with Image.open(path) as image:
        image = image.convert('RGB')
        width, height = image.size
        sample = image.copy()
        sample.thumbnail((128, 128))
        pixels = list(sample.getdata())
        count = max(1, len(pixels))

        white = 0
        gray_dark = 0
        colorful = 0
        luma = []
        for r, g, b in pixels:
            mx, mn = max(r, g, b), min(r, g, b)
            sat = (mx - mn) / max(1, mx)
            y = 0.299 * r + 0.587 * g + 0.114 * b
            luma.append(y)
            if r > 238 and g > 238 and b > 238:
                white += 1
            if 30 < y < 185 and sat < 0.16:
                gray_dark += 1
            if sat > 0.35 and 45 < y < 230:
                colorful += 1

        sw, sh = sample.size
        edges = 0
        comparisons = 0
        for y in range(sh):
            for x in range(sw):
                idx = y * sw + x
                if x + 1 < sw:
                    comparisons += 1
                    if abs(luma[idx] - luma[idx + 1]) > 34:
                        edges += 1
                if y + 1 < sh:
                    comparisons += 1
                    if abs(luma[idx] - luma[idx + sw]) > 34:
                        edges += 1

        return {
            'width': width,
            'height': height,
            'ratio': width / max(1, height),
            'whiteRatio': white / count,
            'grayTextRatio': gray_dark / count,
            'colorRatio': colorful / count,
            'edgeRatio': edges / max(1, comparisons),
        }


def menu_score(metrics):
    score = 0
    if metrics['whiteRatio'] >= 0.58:
        score += 3
    elif metrics['whiteRatio'] >= 0.42:
        score += 2
    elif metrics['whiteRatio'] >= 0.30:
        score += 1

    if metrics['grayTextRatio'] >= 0.14:
        score += 3
    elif metrics['grayTextRatio'] >= 0.08:
        score += 2
    elif metrics['grayTextRatio'] >= 0.045:
        score += 1

    if metrics['edgeRatio'] >= 0.16:
        score += 3
    elif metrics['edgeRatio'] >= 0.105:
        score += 2
    elif metrics['edgeRatio'] >= 0.075:
        score += 1

    if metrics['ratio'] < 0.78:
        score += 1
    if metrics['whiteRatio'] > 0.40 and metrics['colorRatio'] < 0.19:
        score += 1
    return score


def main():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    folders = manifest if isinstance(manifest, list) else manifest.get('folders', [])
    blocked = []
    retained = []
    filtered_folders = []

    for folder in folders:
        name = str(folder.get('folderName', '')).strip()
        lower_name = name.lower().replace(' ', '')
        noisy_folder = any(word.replace(' ', '') in lower_name for word in NOISY_FOLDER_WORDS)
        kept_images = []
        local_blocked = []

        for image in folder.get('images', []):
            src = image.get('src') if isinstance(image, dict) else str(image)
            path = Path(src)
            reason = None
            metrics = None
            try:
                metrics = image_metrics(path)
                score = menu_score(metrics)
                if noisy_folder:
                    reason = 'non-store-screen-folder'
                elif score >= 7:
                    reason = 'menu-or-price-screen-likely'
            except Exception as error:
                reason = f'image-read-error:{error.__class__.__name__}'

            if reason:
                item = {'folderName': name, 'src': src, 'reason': reason}
                if metrics:
                    item.update(metrics)
                    item['score'] = menu_score(metrics)
                blocked.append(item)
                local_blocked.append(src)
            else:
                kept_images.append(image)

        if kept_images:
            filtered_folders.append({**folder, 'images': kept_images})
            retained.extend((img.get('src') if isinstance(img, dict) else str(img)) for img in kept_images)
        elif folder.get('images'):
            blocked.append({'folderName': name, 'reason': 'folder-dropped-all-images', 'count': len(folder.get('images', []))})

    blocked_srcs = {item.get('src') for item in blocked if item.get('src')}
    if STORES_PATH.exists() and blocked_srcs:
        stores = json.loads(STORES_PATH.read_text(encoding='utf-8'))
        cleaned_stores = 0
        for store in stores:
            changed = False
            for field in ('images', 'photoPool', 'imagePool', 'gallery'):
                values = store.get(field)
                if not isinstance(values, list):
                    continue
                next_values = []
                for value in values:
                    src = value.get('card') or value.get('src') or value.get('url') if isinstance(value, dict) else str(value)
                    if src in blocked_srcs:
                        changed = True
                    else:
                        next_values.append(value)
                if next_values:
                    store[field] = next_values
                elif changed:
                    store.pop(field, None)
            current = store.get('image') or store.get('img')
            if current in blocked_srcs:
                candidates = store.get('images') or []
                first = candidates[0] if candidates else None
                if isinstance(first, dict):
                    first = first.get('card') or first.get('src') or first.get('url')
                store['image'] = first or 'assets/store1.jpg'
                store['img'] = store['image']
                changed = True
            if changed:
                cleaned_stores += 1
        STORES_PATH.write_text(json.dumps(stores, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    else:
        cleaned_stores = 0

    if isinstance(manifest, list):
        filtered_manifest = filtered_folders
    else:
        filtered_manifest = {**manifest, 'folders': filtered_folders}
    MANIFEST_PATH.write_text(json.dumps(filtered_manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    report = {
        'folderCountBefore': len(folders),
        'folderCountAfter': len(filtered_folders),
        'imageCountAfter': len(retained),
        'blockedImageCount': len(blocked_srcs),
        'cleanedStoreCount': cleaned_stores,
        'blocked': blocked,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('folderCountBefore', 'folderCountAfter', 'imageCountAfter', 'blockedImageCount', 'cleanedStoreCount')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
