import json
import os
from pathlib import Path

from PIL import Image

MANIFEST_PATH = Path(os.environ.get('PHOTO_MANIFEST_PATH', 'data/photo-manifest.json'))
STORES_PATH = Path(os.environ.get('STORES_PATH', 'data/stores.json'))
REPORT_PATH = Path(os.environ.get('PHOTO_FILTER_REPORT_PATH', 'data/photo-filter-report.json'))

NOISY_FOLDER_WORDS = (
    'chatgpt대화', 'qr게이트 화면', '화면캡처', '스크린샷', '메뉴판', '가격표',
    '전단지', '명함', '노션배너', '상세페이지', '주문화면', '앱화면',
    '사업자등록증', '영업신고증', '통장사본', '주민등록증', '운전면허증',
    '면허증', '신분증', '보건증', '위생교육', '계약서', '서류', '증명서',
    '등록증', '신고증', '통장', '주민증', '카드사본', '인감', '도장'
)

# 현재 민감서류가 실제 노출된 것이 확인된 브랜드는 음식사진을 수동 검수하기 전까지 전부 격리한다.
FORCED_QUARANTINE_FOLDER_WORDS = ('가마치통닭',)


def image_metrics(path: Path):
    with Image.open(path) as image:
        image = image.convert('RGB')
        width, height = image.size
        sample = image.copy()
        sample.thumbnail((144, 144))
        pixels = list(sample.getdata())
        count = max(1, len(pixels))

        white = gray_dark = colorful = warm = green = blue = dark_color = skin_like = 0
        luma = []
        for r, g, b in pixels:
            mx, mn = max(r, g, b), min(r, g, b)
            sat = (mx - mn) / max(1, mx)
            y = 0.299 * r + 0.587 * g + 0.114 * b
            luma.append(y)
            if r > 238 and g > 238 and b > 238:
                white += 1
            if 25 < y < 190 and sat < 0.18:
                gray_dark += 1
            if sat > 0.30 and 38 < y < 235:
                colorful += 1
            if sat > 0.20 and r > g * 1.04 and r > b * 1.10 and 35 < y < 235:
                warm += 1
            if sat > 0.18 and g > r * 1.03 and g > b * 1.03 and 30 < y < 230:
                green += 1
            if sat > 0.18 and b > r * 1.08 and b > g * 1.04 and 35 < y < 235:
                blue += 1
            if sat > 0.20 and y < 80:
                dark_color += 1
            if r > 95 and g > 40 and b > 20 and r > g and r > b and (mx - mn) > 22:
                skin_like += 1

        sw, sh = sample.size
        edges = comparisons = horizontal_edges = vertical_edges = 0
        for y in range(sh):
            for x in range(sw):
                idx = y * sw + x
                if x + 1 < sw:
                    comparisons += 1
                    diff = abs(luma[idx] - luma[idx + 1])
                    if diff > 34:
                        edges += 1
                        vertical_edges += 1
                if y + 1 < sh:
                    comparisons += 1
                    diff = abs(luma[idx] - luma[idx + sw])
                    if diff > 34:
                        edges += 1
                        horizontal_edges += 1

        border_pixels = []
        for x in range(sw):
            border_pixels.append(pixels[x])
            border_pixels.append(pixels[(sh - 1) * sw + x])
        for y in range(sh):
            border_pixels.append(pixels[y * sw])
            border_pixels.append(pixels[y * sw + sw - 1])
        border_white = sum(1 for r, g, b in border_pixels if r > 235 and g > 235 and b > 235)

        return {
            'width': width,
            'height': height,
            'ratio': width / max(1, height),
            'whiteRatio': white / count,
            'borderWhiteRatio': border_white / max(1, len(border_pixels)),
            'grayTextRatio': gray_dark / count,
            'colorRatio': colorful / count,
            'warmRatio': warm / count,
            'greenRatio': green / count,
            'blueRatio': blue / count,
            'darkColorRatio': dark_color / count,
            'skinLikeRatio': skin_like / count,
            'edgeRatio': edges / max(1, comparisons),
            'horizontalEdgeRatio': horizontal_edges / max(1, comparisons),
            'verticalEdgeRatio': vertical_edges / max(1, comparisons),
        }


def classify(metrics):
    reasons = []
    ratio = metrics['ratio']
    white = metrics['whiteRatio']
    border_white = metrics['borderWhiteRatio']
    gray = metrics['grayTextRatio']
    color = metrics['colorRatio']
    warm = metrics['warmRatio']
    green = metrics['greenRatio']
    blue = metrics['blueRatio']
    dark = metrics['darkColorRatio']
    skin = metrics['skinLikeRatio']
    edge = metrics['edgeRatio']

    # 문서·증명서·메뉴·앱 화면·통장/신분증류를 강하게 차단한다.
    if white >= 0.38:
        reasons.append('mostly-white-document-likely')
    if border_white >= 0.55 and white >= 0.24:
        reasons.append('white-page-border-likely')
    if white >= 0.23 and gray >= 0.045 and edge >= 0.055:
        reasons.append('text-on-paper-likely')
    if gray >= 0.085 and edge >= 0.075:
        reasons.append('dense-text-or-form-likely')
    if edge >= 0.155:
        reasons.append('screen-form-or-signage-likely')
    if blue >= 0.20 and white >= 0.16 and gray >= 0.035:
        reasons.append('id-bankbook-certificate-likely')
    if ratio < 0.62 or ratio > 2.25:
        reasons.append('poster-or-document-shape')
    if skin >= 0.42 and color < 0.18 and warm < 0.18:
        reasons.append('person-or-id-photo-likely')

    food_score = 0
    if color >= 0.18:
        food_score += 2
    elif color >= 0.12:
        food_score += 1
    if warm >= 0.09:
        food_score += 2
    elif warm >= 0.055:
        food_score += 1
    if green >= 0.018:
        food_score += 1
    if dark >= 0.035:
        food_score += 1
    if white < 0.28:
        food_score += 1
    if 0.018 <= edge <= 0.14:
        food_score += 1
    if 0.72 <= ratio <= 1.85:
        food_score += 1

    # 음식일 가능성이 충분히 높지 않으면 공개하지 않는다. 오탐보다 민감정보 노출 방지를 우선한다.
    if food_score < 4:
        reasons.append('not-confidently-food')

    return reasons, food_score


def remove_file(path: Path):
    try:
        if path.exists() and path.is_file():
            path.unlink()
            return True
    except OSError:
        pass
    return False


def main():
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    folders = manifest if isinstance(manifest, list) else manifest.get('folders', [])
    blocked = []
    retained = []
    filtered_folders = []
    deleted_files = 0
    quarantined_folders = []

    for folder in folders:
        name = str(folder.get('folderName', '')).strip()
        lower_name = name.lower().replace(' ', '')
        noisy_folder = any(word.replace(' ', '') in lower_name for word in NOISY_FOLDER_WORDS)
        forced_quarantine = any(word.replace(' ', '') in lower_name for word in FORCED_QUARANTINE_FOLDER_WORDS)
        evaluated = []
        folder_sensitive = noisy_folder or forced_quarantine

        for image in folder.get('images', []):
            src = image.get('src') if isinstance(image, dict) else str(image)
            path = Path(src)
            metrics = None
            reasons = []
            food_score = 0
            try:
                metrics = image_metrics(path)
                reasons, food_score = classify(metrics)
            except Exception as error:
                reasons = [f'image-read-error:{error.__class__.__name__}']
            if noisy_folder:
                reasons.append('non-food-or-document-folder-name')
            if forced_quarantine:
                reasons.append('forced-sensitive-brand-quarantine')
            if any(reason in reasons for reason in (
                'mostly-white-document-likely', 'white-page-border-likely',
                'text-on-paper-likely', 'dense-text-or-form-likely',
                'id-bankbook-certificate-likely', 'forced-sensitive-brand-quarantine'
            )):
                folder_sensitive = True
            evaluated.append((image, src, path, metrics, reasons, food_score))

        # 한 폴더에서 민감서류 가능성이 하나라도 발견되면 폴더 전체를 격리한다.
        if folder_sensitive and evaluated:
            quarantined_folders.append(name)
            for image, src, path, metrics, reasons, food_score in evaluated:
                if not reasons:
                    reasons = ['same-folder-sensitive-quarantine']
                elif 'same-folder-sensitive-quarantine' not in reasons:
                    reasons.append('same-folder-sensitive-quarantine')
                item = {'folderName': name, 'src': src, 'reason': ','.join(reasons), 'foodScore': food_score}
                if metrics:
                    item.update(metrics)
                blocked.append(item)
                deleted_files += int(remove_file(path))
            continue

        kept_images = []
        for image, src, path, metrics, reasons, food_score in evaluated:
            if reasons:
                item = {'folderName': name, 'src': src, 'reason': ','.join(reasons), 'foodScore': food_score}
                if metrics:
                    item.update(metrics)
                blocked.append(item)
                deleted_files += int(remove_file(path))
            else:
                kept_images.append(image)
                retained.append(src)

        if kept_images:
            filtered_folders.append({**folder, 'images': kept_images})
        elif folder.get('images'):
            blocked.append({'folderName': name, 'reason': 'folder-dropped-all-images', 'count': len(folder.get('images', []))})

    blocked_srcs = {item.get('src') for item in blocked if item.get('src')}
    cleaned_stores = 0
    if STORES_PATH.exists():
        stores = json.loads(STORES_PATH.read_text(encoding='utf-8'))
        for store in stores:
            changed = False
            for field in ('images', 'photoPool', 'imagePool', 'gallery'):
                values = store.get(field)
                if not isinstance(values, list):
                    continue
                next_values = []
                for value in values:
                    src = value.get('card') or value.get('src') or value.get('url') if isinstance(value, dict) else str(value)
                    if src in blocked_srcs or not Path(src).exists():
                        changed = True
                    else:
                        next_values.append(value)
                if next_values:
                    store[field] = next_values
                elif changed:
                    store.pop(field, None)
            current = store.get('image') or store.get('img')
            if current in blocked_srcs or (current and str(current).startswith('assets/store-photos/') and not Path(current).exists()):
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

    filtered_manifest = filtered_folders if isinstance(manifest, list) else {**manifest, 'folders': filtered_folders}
    MANIFEST_PATH.write_text(json.dumps(filtered_manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    report = {
        'policy': 'food-only-strict; sensitive-document-prevention-first',
        'folderCountBefore': len(folders),
        'folderCountAfter': len(filtered_folders),
        'imageCountAfter': len(retained),
        'blockedImageCount': len(blocked_srcs),
        'deletedFileCount': deleted_files,
        'quarantinedFolderCount': len(quarantined_folders),
        'quarantinedFolders': quarantined_folders,
        'cleanedStoreCount': cleaned_stores,
        'blocked': blocked,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('folderCountBefore', 'folderCountAfter', 'imageCountAfter', 'blockedImageCount', 'deletedFileCount', 'quarantinedFolderCount', 'cleanedStoreCount')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
