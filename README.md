# WortWeg

Goethe-Zertifikat A1 공식 어휘 670개를 학습하는 모바일 우선 PWA입니다. 로그인하지 않으면 현재 기기에 저장하고, Firebase 설정 후 Google로 로그인하면 Firestore의 사용자별 문서와 동기화합니다.

## 로컬 실행

```bash
python3 -m http.server 4173
```

브라우저에서 <http://localhost:4173>을 엽니다.

## 테스트

```bash
node --test tests/core.test.mjs
python3 tests/test_mobile_ui.py
python3 tests/test_data.py
python3 tests/test_extract.py
python3 tests/test_translate.py
node --check app.mjs
node --check src/core.mjs
node --check src/cloud-sync.mjs
node --check sw.js
```

## Firebase 연결

1. Firebase 프로젝트와 Web App을 만듭니다.
2. Authentication에서 Google 제공자를 활성화합니다.
3. Firestore 데이터베이스를 만듭니다.
4. Web App의 공개 설정을 `firebase-config.mjs`에 입력합니다.
5. `firebase deploy --only firestore:rules`로 `firestore.rules`를 배포합니다.
6. Firebase Authentication의 승인된 도메인에 실제 GitHub Pages 도메인(`사용자명.github.io`)을 추가합니다.

진도 문서 경로는 `users/{uid}/progress/current`입니다. `firestore.rules`는 로그인한 사용자가 자신의 UID 경로만 읽고 쓰도록 제한합니다.

> `firebase-config.mjs`의 웹 설정은 브라우저에 공개되는 식별 정보입니다. 관리자 서비스 계정 키, OAuth client secret, 토큰 또는 비밀번호는 이 저장소에 커밋하면 안 됩니다.

## 기존 진도와 여러 기기 동기화

- 최초 Google 로그인 시 기존 브라우저의 `localStorage` 진도를 해당 계정으로 마이그레이션합니다.
- 로컬·클라우드 양쪽에 기록이 있으면 cohort, 단어 ID와 attempt ID 기준으로 합칩니다.
- 완료 상태와 암기 완료는 되돌리지 않으며, 이월 단어는 중복 제거합니다.
- 계정별 로컬 저장 공간을 분리해 같은 브라우저에서 다른 Google 계정의 진도가 섞이지 않게 합니다.
- 오프라인 저장이 발생하면 현재 기기에 남기고 온라인 복귀 시 다시 동기화합니다.

## GitHub Pages

`.github/workflows/pages.yml`은 `main` 브랜치 push마다 테스트 후 정적 파일만 `_site`에 모아 GitHub Pages로 배포합니다.

GitHub 저장소의 **Settings → Pages → Build and deployment**에서 Source를 **GitHub Actions**로 선택해야 합니다.

어휘 출처: [Goethe-Zertifikat A1 Start Deutsch 1 Wortliste](https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf)
