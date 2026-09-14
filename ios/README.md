# 대동여수음식지도 iOS

이 디렉터리는 `com.daedongmap.foodmap` iPhone 앱과 GitHub Actions 클라우드 빌드를 위한 소스입니다.

## 앱 기능

- `daedongmap.com`의 음식점 지도와 상세 화면을 앱 안에서 제공
- 웹의 하단 메뉴 한 벌만 표시하며 iPhone 상태표시줄 안전영역 유지
- 당겨서 새로고침, 스와이프 뒤로가기, 오프라인 오류 복구
- 전화·문자·메일·외부 주문/지도 링크를 해당 iOS 앱으로 연결
- 위치 권한은 사용자가 위치 기능을 요청할 때만 표시
- 먹깨비·요기요는 설치된 앱 우선 연결, 실패 시 닫을 수 있는 내부 연결 화면 제공
- 외부 주문 연결 화면을 닫으면 원래 가게 화면 유지. 외부 서비스 자체 링크 장애는 재확인 필요

## 로컬 생성

```bash
brew install librsvg xcodegen
bash ios/scripts/generate_app_icons.sh
xcodegen generate --spec ios/project.yml
```

Mac이 없는 환경에서는 `.github/workflows/build-ios.yml`의 `simulator` 모드로 컴파일을 검증하고, 서명 자료가 등록된 뒤 `archive` 또는 `upload` 모드를 사용합니다.

서명 빌드는 GitHub Actions의 실행 번호를 iOS 빌드 번호로 사용합니다. 같은 버전의 IPA를 다시 업로드해도 App Store Connect의 중복 빌드 번호 오류가 나지 않습니다.


