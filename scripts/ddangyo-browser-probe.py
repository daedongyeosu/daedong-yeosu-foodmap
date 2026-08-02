import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

TARGETS = [
    {"token": "8rrtFnv", "name": "쌀통닭 무선점"},
    {"token": "oZrHJMN", "name": "기영이숯불두마리치킨 여수여천점"},
    {"token": "LZJOYiQ", "name": "아주커치킨 둔덕점"},
    {"token": "h3rPiwO", "name": "치킨아이 학동점"},
    {"token": "7qEHjBv", "name": "큰손닭강정 여수본점"},
]

OUT = Path("ddangyo-browser-output")
OUT.mkdir(parents=True, exist_ok=True)


def safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in value)[:180]


def make_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=412,915")
    options.add_argument("--lang=ko-KR")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-features=Translate,OptimizationHints")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (Linux; Android 14; SM-S928N) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36"
    )
    options.set_capability("goog:loggingPrefs", {"performance": "ALL", "browser": "ALL"})
    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd("Network.enable", {})
    return driver


def read_storage(driver, storage_name: str):
    return driver.execute_script(
        """
        const source = window[arguments[0]];
        const result = {};
        for (let i = 0; i < source.length; i += 1) {
          const key = source.key(i);
          result[key] = source.getItem(key);
        }
        return result;
        """,
        storage_name,
    )


def capture_target(target):
    driver = make_driver()
    token = target["token"]
    url = f"https://fdofd.ddangyo.com/gateway1.html?{token}"
    responses = []
    request_urls = []
    browser_errors = []
    body_errors = []

    try:
        driver.get(url)
        for _ in range(20):
            time.sleep(1)
            try:
                if driver.execute_script("return document.readyState") == "complete":
                    pass
            except Exception:
                pass

        html = driver.page_source
        (OUT / f"{token}-page.html").write_text(html, encoding="utf-8")
        driver.save_screenshot(str(OUT / f"{token}-page.png"))

        performance = driver.get_log("performance")
        browser_errors = driver.get_log("browser")
        response_events = []
        for entry in performance:
            try:
                message = json.loads(entry["message"])["message"]
            except Exception:
                continue
            method = message.get("method", "")
            params = message.get("params", {})
            if method == "Network.requestWillBeSent":
                request = params.get("request", {})
                request_urls.append(
                    {
                        "url": request.get("url", ""),
                        "method": request.get("method", ""),
                        "postData": request.get("postData", ""),
                        "type": params.get("type", ""),
                    }
                )
            elif method == "Network.responseReceived":
                response_events.append(params)

        for params in response_events:
            response = params.get("response", {})
            response_url = response.get("url", "")
            mime = response.get("mimeType", "")
            resource_type = params.get("type", "")
            row = {
                "url": response_url,
                "status": response.get("status"),
                "mimeType": mime,
                "type": resource_type,
                "headers": response.get("headers", {}),
            }
            should_capture = (
                resource_type in {"XHR", "Fetch", "Document"}
                or "json" in mime.lower()
                or any(key in response_url.lower() for key in ("gateway", "store", "shop", "menu", "short", ".do", "/api/"))
            )
            if should_capture:
                try:
                    payload = driver.execute_cdp_cmd(
                        "Network.getResponseBody", {"requestId": params.get("requestId")}
                    )
                    body = payload.get("body", "")
                    row["bodyBase64Encoded"] = payload.get("base64Encoded", False)
                    row["bodyLength"] = len(body)
                    if len(body) <= 2_000_000:
                        row["body"] = body
                        body_file = OUT / f"{token}-response-{safe_name(response_url)}.txt"
                        body_file.write_text(body, encoding="utf-8", errors="replace")
                except Exception as exc:
                    body_errors.append({"url": response_url, "error": repr(exc)})
            responses.append(row)

        storage = {}
        try:
            storage["localStorage"] = read_storage(driver, "localStorage")
            storage["sessionStorage"] = read_storage(driver, "sessionStorage")
        except Exception as exc:
            storage["error"] = repr(exc)

        result = {
            "token": token,
            "suppliedName": target["name"],
            "requestedUrl": url,
            "currentUrl": driver.current_url,
            "title": driver.title,
            "cookies": driver.get_cookies(),
            "storage": storage,
            "requests": request_urls,
            "responses": responses,
            "browserLogs": browser_errors,
            "responseBodyErrors": body_errors,
            "pageSourceLength": len(html),
        }
        (OUT / f"{token}-capture.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return {
            "token": token,
            "name": target["name"],
            "currentUrl": driver.current_url,
            "title": driver.title,
            "pageSourceLength": len(html),
            "requestCount": len(request_urls),
            "responseCount": len(responses),
            "capturedBodyCount": sum(1 for item in responses if "body" in item),
            "browserErrorCount": len(browser_errors),
        }
    except Exception as exc:
        failure = {"token": token, "name": target["name"], "error": repr(exc)}
        (OUT / f"{token}-failure.json").write_text(
            json.dumps(failure, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        return failure
    finally:
        driver.quit()


summary = []
for target in TARGETS:
    summary.append(capture_target(target))

(OUT / "summary.json").write_text(
    json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(summary, ensure_ascii=False, indent=2))
