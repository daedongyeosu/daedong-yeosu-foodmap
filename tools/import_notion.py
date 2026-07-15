#!/usr/bin/env python3
"""
노션 HTML Export -> 대동여수음식지도 stores.json 변환기
사용:
python tools/import_notion.py "압축을 푼 노션 Export 폴더"
"""
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import unquote
import json, re, shutil, hashlib, unicodedata, sys

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]).resolve()

def norm(s):
    s=unicodedata.normalize("NFKC",s or "").strip().lower()
    s=re.sub(r"\s*\(\d+\)\s*$","",s)
    return re.sub(r"[^\w가-힣]+","",s)

def title_clean(s):
    s=re.sub(r"\s+"," ",s or "").strip()
    return re.sub(r"\s*\(\d+\)\s*$","",s).strip()

def route_kind(text,href):
    t=(text or "").lower(); h=(href or "").lower()
    if "먹깨비" in t or "mukkebi" in h:return "먹깨비"
    if "땡겨요" in t or "ddangyo" in h:return "땡겨요"
    if "온동네" in t:return "온동네"
    if "요기요" in t or "yogiyo" in h:return "요기요"
    if "쿠팡" in t or "coupangeats" in h:return "쿠팡이츠"
    if "배달의민족" in t or "배민" in t or "baemin" in h:return "배달의민족"
    if "naver" in h or "가게위치" in t or "지도" in t:return "네이버지도"
    if "전화" in t or h.startswith("tel:"):return "전화주문"
    if "브랜드" in t:return "브랜드앱"
    if "자동접수" in t or "직접 주문" in t or "자동주문" in t:return "가게바로주문"
    if "chak" in h or "지역상품권" in t:return "CHAK"
    return None

out_img=PROJECT/"images"/"notion-stores"
out_img.mkdir(parents=True,exist_ok=True)
records={}
for hp in SOURCE.rglob("*.html"):
    soup=BeautifulSoup(hp.read_text(encoding="utf-8",errors="ignore"),"html.parser")
    title=title_clean(soup.title.get_text(" ",strip=True) if soup.title else hp.stem)
    if not title:continue
    routes=[]; naver=""; phone=""
    for a in soup.find_all("a"):
        text=a.get_text(" ",strip=True); href=(a.get("href") or "").strip()
        k=route_kind(text,href)
        if k=="네이버지도":naver=href
        elif k=="CHAK":routes.append({"name":"CHAK 지역상품권","url":href,"enabled":True})
        elif k:routes.append({"name":k,"url":href,"enabled":True})
        if href.startswith("tel:"):phone=href[4:]
    image=""
    for img in soup.find_all("img"):
        src=img.get("src")
        if not src or src.startswith("http"):continue
        p=(hp.parent/unquote(src)).resolve()
        if p.exists():
            name=hashlib.sha1((title+str(p)).encode()).hexdigest()[:12]+p.suffix.lower()
            shutil.copy2(p,out_img/name); image=f"images/notion-stores/{name}"; break
    key=norm(title)
    rec={"id":hashlib.sha1(title.encode()).hexdigest()[:16],"name":title,"district":"","category":"",
         "address":"","phone":phone,"naverMap":naver,"image":image,"routes":routes,"events":[],
         "managed":False,"sharedManaged":False,"managementStatus":"unconfirmed",
         "pinPosition":None,"forceBottom":False}
    score=len(routes)*3+bool(image)*4+bool(phone)*2+bool(naver)*2
    if key not in records or score>records[key][0]:records[key]=(score,rec)

stores=sorted((v[1] for v in records.values()),key=lambda x:x["name"])
(PROJECT/"data"/"stores.json").write_text(json.dumps(stores,ensure_ascii=False,indent=2),encoding="utf-8")
print(f"완료: {len(stores)}개 가게")
