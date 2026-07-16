import json
import math
import os
from pathlib import Path

from PIL import Image, ImageStat

MANIFEST_PATH = Path(os.environ.get('PHOTO_MANIFEST_PATH', 'data/photo-manifest.json'))
STORES_PATH = Path(os.environ.get('STORES_PATH', 'data/stores.json'))
REPORT_PATH = Path(os.environ.get('PHOTO_FILTER_REPORT_PATH', 'data/photo-filter-report.json'))

EXPLICIT_NON_FOOD_FOLDER_WORDS = (
    'chatgpt대화', 'qr게이트', '화면캡처', '스크린샷', '메뉴판', '가격표',
    '전단지', '명함', '노션배너', '상세페이지', '주문화면', '앱화면',
    '사업자등록증', '영업신고증', '통장사본', '주민등록증', '운전면허증',
    '면허증', '신분증', '보건증', '위생교육', '계약서', '증명서',
    '등록증', '신고증', '주민증', '카드사본', '인감', '도장',
    '제록스', '프린터', '로봇청소기', '집지도'
)


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def image_metrics(path: Path):
    with Image.open(path) as image:
        image = image.convert('RGB')
        width, height = image.size
        sample = image.copy()
        sample.thumbnail((160, 160))
        pixels = list(sample.getdata())
        count = max(1, len(pixels))

        white = gray = colorful = warm = green = blue = dark = skin = 0
        saturation_values = []
        luma_values = []
        for r, g, b in pixels:
            maximum, minimum = max(r, g, b), min(r, g, b)
            saturation = (maximum - minimum) / max(1, maximum)
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            saturation_values.append(saturation)
            luma_values.append(luma)
            if r > 238 and g > 238 and b > 238:
                white += 1
            if 28 < luma < 195 and saturation < 0.17:
                gray += 1
            if saturation > 0.28 and 35 < luma < 238:
                colorful += 1
            if saturation > 0.18 and r > g * 1.035 and r > b * 1.08 and 30 < luma < 238:
                warm += 1
            if saturation > 0.15 and g > r * 1.025 and g > b * 1.025 and 25 < luma < 235:
                green += 1
            if saturation > 0.16 and b > r * 1.07 and b > g * 1.035 and 30 < luma < 238:
                blue += 1
            if saturation > 0.18 and luma < 92:
                dark += 1
            if r > 100 and g > 45 and b > 25 and r > g and r > b and maximum - minimum > 24:
                skin += 1

        sw, sh = sample.size
        edge_count = comparisons = 0
        for y in range(sh):
            for x in range(sw):
                index = y * sw + x
                if x + 1 < sw:
                    comparisons += 1
                    if abs(luma_values[index] - luma_values[index + 1]) > 36:
                        edge_count += 1
                if y + 1 < sh:
                    comparisons += 1
                    if abs(luma_values[index] - luma_values[index + sw]) > 36:
                        edge_count += 1

        border = []
        for x in range(sw):
            border.append(pixels[x])
            border.append(pixels[(sh - 1) * sw + x])
        for y in range(sh):
            border.append(pixels[y * sw])
            border.append(pixels[y * sw + sw - 1])
        border_white = sum(1 for r, g, b in border if r > 235 and g > 235 and b > 235)

        luma_mean = sum(luma_values) / count
        luma_variance = sum((value - luma_mean) ** 2 for value in luma_values) / count
        saturation_mean = sum(saturation_values) / count

        return {
            'width': width,
            'height': height,
            'ratio': width / max(1, height),
            'whiteRatio': white / count,
            'borderWhiteRatio': border_white / max(1, len(border)),
            'grayRatio': gray / count,
            'colorRatio': colorful / count,
            'warmRatio': warm / count,
            'greenRatio': green / count,
            'blueRatio': blue / count,
            'darkRatio': dark / count,
            'skinRatio': skin / count,
            'edgeRatio': edge_count / max(1, comparisons),
            'saturationMean': saturation_mean,
            'lumaStd': math.sqrt(luma_variance),
        }


def scores(metrics):
    white = metrics['whiteRatio']
    border_white = metrics['borderWhiteRatio']
    gray = metrics['grayRatio']
    color = metrics['colorRatio']
    warm = metrics['warmRatio']
    green = metrics['greenRatio']
    blue = metrics['blueRatio']
    dark = metrics['darkRatio']
    skin = metrics['skinRatio']
    edge = metrics['edgeRatio']
    saturation = metrics['saturationMean']
    luma_std = metrics['lumaStd']
    ratio = metrics['ratio']

    document_score = 0
    if white >= 0.68:
        document_score += 3
    elif white >= 0.50:
        document_score += 2
    elif white >= 0.34:
        document_score += 1
    if border_white >= 0.76 and white >= 0.28:
        document_score += 2
    if gray >= 0.12:
        document_score += 3
    elif gray >= 0.075:
        document_score += 2
    elif gray >= 0.045 and white >= 0.24:
        document_score += 1
    if blue >= 0.18 and white >= 0.18 and gray >= 0.03:
        document_score += 2
    if edge >= 0.19 and white >= 0.25:
        document_score += 1
    if ratio < 0.55 or ratio > 2.55:
        document_score += 1
    if skin >= 0.45 and color < 0.15 and warm < 0.15:
        document_score += 2

    food_score = 0
    if color >= 0.25:
        food_score += 3
    elif color >= 0.16:
        food_score += 2
    elif color >= 0.085:
        food_score += 1
    if warm >= 0.12:
        food_score += 3
    elif warm >= 0.065:
        food_score += 2
    elif warm >= 0.032:
        food_score += 1
    if green >= 0.018:
        food_score += 1
    if dark >= 0.025:
        food_score += 1
    if saturation >= 0.25:
        food_score += 2
    elif saturation >= 0.16:
        food_score += 1
    if luma_std >= 52:
        food_score += 2
    elif luma_std >= 34:
        food_score += 1
    if 0.025 <= edge <= 0.22:
        food_score += 1
    if white < 0.46:
        food_score += 1
    if 0.62 <= ratio <= 2.15:
        food_score += 1

    return document_score, food_score


def classify(metrics):
    document_score, food_score = scores(metrics)
    if document_score >= 5 and food_score < 8:
        return False, 'sensitive-document-likely', document_score, food_score
    if document_score >= 4 and food_score < 6:
        return False, 'document-or-form-likely', document_score, food_score
    if food_score < 5:
        return False, 'not-confidently-food', document_score, food_score
    return True, 'food-likely', document_score, food_score


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
    filtered_folders = []
    blocked = []
    kept = []
    deleted_files = 0

    for folder in folders:
        name = str(folder.get('folderName', '')).strip()
        compact_name = name.lower().replace(' ', '')
        explicit_non_food = any(word.replace(' ', '') in compact_name for word in EXPLICIT_NON_FOOD_FOLDER_WORDS)
        kept_images = []

        for image in folder.get('images', []):
            src = image.get('src') if isinstance(image, dict) else str(image)
            file_path = Path(src)
            metrics = None
            if explicit_non_food:
                allowed, reason, document_score, food_score = False, 'explicit-non-food-folder', 99, 0
            else:
                try:
                    metrics = image_metrics(file_path)
                    allowed, reason, document_score, food_score = classify(metrics)
                except Exception as error:
                    allowed, reason, document_score, food_score = False, f'image-read-error:{error.__class__.__name__}', 99, 0

            if allowed:
                kept_images.append(image)
                kept.append(src)
            else:
                item = {
                    'folderName': name,
                    'src': src,
                    'reason': reason,
                    'documentScore': document_score,
                    'foodScore': food_score,
                }
                if metrics:
                    item.update(metrics)
                blocked.append(item)
                deleted_files += int(remove_file(file_path))

        if kept_images:
            filtered_folders.append({**folder, 'images': kept_images})

    blocked_sources = {item['src'] for item in blocked if item.get('src')}
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
                    source = value.get('card') or value.get('src') or value.get('url') if isinstance(value, dict) else str(value)
                    if source in blocked_sources or not Path(source).exists():
                        changed = True
                    else:
                        next_values.append(value)
                if next_values:
                    store[field] = next_values
                elif changed:
                    store.pop(field, None)
            current = store.get('image') or store.get('img')
            if current in blocked_sources or (current and str(current).startswith('assets/store-photos/') and not Path(current).exists()):
                candidates = store.get('images') or []
                first = candidates[0] if candidates else None
                if isinstance(first, dict):
                    first = first.get('card') or first.get('src') or first.get('url')
                store['image'] = first or ''
                store['img'] = store['image']
                changed = True
            if changed:
                cleaned_stores += 1
        STORES_PATH.write_text(json.dumps(stores, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    filtered_manifest = filtered_folders if isinstance(manifest, list) else {**manifest, 'folders': filtered_folders}
    MANIFEST_PATH.write_text(json.dumps(filtered_manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    report = {
        'policy': 'food-only-v2; individual-image-screening; document-safety-first',
        'folderCountBefore': len(folders),
        'folderCountAfter': len(filtered_folders),
        'imageCountAfter': len(kept),
        'blockedImageCount': len(blocked_sources),
        'deletedFileCount': deleted_files,
        'cleanedStoreCount': cleaned_stores,
        'blocked': blocked,
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: report[key] for key in ('folderCountBefore', 'folderCountAfter', 'imageCountAfter', 'blockedImageCount', 'deletedFileCount', 'cleanedStoreCount')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
